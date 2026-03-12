"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Download,
  Banknote,
  Link2,
  Unlink,
  Plus,
  Magnet,
  X,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DateRangeInput } from "@/components/DateRangeInput";
import {
  getReconciliationAccounting,
  getReconciliationBank,
  getReconciliationAccounts,
  getReconciliationSummary,
  postReconciliationMatches,
  deleteReconciliationMatch,
} from "@/lib/api/accounting";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrency(val) {
  if (val == null || val === "" || Number.isNaN(Number(val))) return "$0.00";
  const n = Number(val);
  const formatted = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${formatted})` : `$${formatted}`;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start, end };
}

function toLocalNoon(dateish) {
  if (!dateish) return new Date();
  if (dateish instanceof Date) {
    return new Date(dateish.getFullYear(), dateish.getMonth(), dateish.getDate(), 12, 0, 0, 0);
  }
  const s = String(dateish);
  const ymd = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(ymd + "T12:00:00");
  }
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function normalizeDescription(desc) {
  if (!desc) return "";
  return String(desc).replace(/\s+/g, " ").trim();
}

function mapAccountingRow(row) {
  return {
    id: row.id ?? row.UniqueField,
    date: toLocalNoon(row.date ?? row.EffectiveDate),
    description: row.description ?? row.Description ?? "",
    amount: Number(row.amount ?? row.Amount ?? 0),
    status: row.status ?? "Unmatched",
    matchId: row.matchId,
    account: row.account ?? row.AccountNo ?? "Checking Account",
  };
}

function mapBankRow(row) {
  const name = row.TransactionAccountName ?? row.TransactionAccount ?? row.account ?? "Bank";
  const last4 = row.TransactionAccountLast4 ?? /(\d{4})\D*$/.exec(String(row.TransactionAccount ?? ""))?.[1] ?? "";
  const account = last4 ? `${String(name).replace(/\s*[-–]\s*\d{3,}\s*$/, "").trim()} ••••${last4}` : name;
  return {
    id: row.id ?? row.ID,
    date: toLocalNoon(row.date ?? row.TransactionDate),
    description: row.description ?? row.TransactionName ?? row.TransactionMerchant ?? "",
    amount: Number(row.amount ?? row.TransactionAmount ?? 0),
    status: row.status ?? (row.TransactionPending ? "Pending" : "Unmatched"),
    matchId: row.matchId,
    account: row.account ?? account,
  };
}

export default function ReconciliationPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [filters, setFilters] = useState({
    startDate: getDefaultDateRange().start,
    endDate: getDefaultDateRange().end,
    glAccount: "All GL Accounts",
    bankAccount: "All Bank Accounts",
    status: "All Transactions",
    glQuery: "",
    bankQuery: "",
  });
  const [glAccountsList, setGlAccountsList] = useState(["All GL Accounts"]);
  const [bankAccountsList, setBankAccountsList] = useState(["All Bank Accounts"]);
  const [records, setRecords] = useState({ accounting: [], bank: [] });
  const [summary, setSummary] = useState({ accountingBalance: 0, bankBalance: 0, difference: 0 });
  const [selection, setSelection] = useState({ accounting: new Set(), bank: new Set() });
  const [ui, setUi] = useState({ acct: { page: 1, pageSize: 50 }, bank: { page: 1, pageSize: 50 } });
  const [loading, setLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [bankPreview, setBankPreview] = useState(null);
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);

  const dayKey = (d) => {
    const date = d instanceof Date ? d : toLocalNoon(d);
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  };

  const commonPredicate = useCallback(
    (row) => {
      const rd = toLocalNoon(row.date);
      const rk = dayKey(rd);
      const start = filters.startDate ? dayKey(filters.startDate) : null;
      const end = filters.endDate ? dayKey(filters.endDate) : null;
      if (start && rk < start) return false;
      if (end && rk > end) return false;
      if (filters.status && filters.status !== "All Transactions") {
        if (filters.status === "Matched" && row.status !== "Matched") return false;
        if (filters.status === "Unmatched" && row.status !== "Unmatched" && row.status !== "Pending") return false;
        if (filters.status === "Pending" && row.status !== "Pending") return false;
      }
      return true;
    },
    [filters.startDate, filters.endDate, filters.status]
  );

  const filtered = useMemo(() => {
    const acctFilter = (row) => {
      if (!commonPredicate(row)) return false;
      if (filters.glAccount && filters.glAccount !== "All GL Accounts") {
        if (String(row.account) !== String(filters.glAccount)) return false;
      }
      const q = (filters.glQuery || "").trim().toLowerCase();
      if (q) {
        const desc = String(row.description || "").toLowerCase();
        const terms = q.split(/\s+/).filter(Boolean);
        const descOK = terms.every((t) => desc.includes(t));
        const amtMatch = /-?\d+\.?\d*/.exec(q);
        const amtOK = amtMatch ? Math.abs(Number(row.amount) || 0).toFixed(2) === Math.abs(parseFloat(amtMatch[0])).toFixed(2) : false;
        if (!descOK && !amtOK) return false;
      }
      return true;
    };
    const bankFilter = (row) => {
      if (!commonPredicate(row)) return false;
      if (filters.bankAccount && filters.bankAccount !== "All Bank Accounts") {
        if (String(row.account) !== String(filters.bankAccount)) return false;
      }
      const q = (filters.bankQuery || "").trim().toLowerCase();
      if (q) {
        const desc = String(row.description || "").toLowerCase();
        const terms = q.split(/\s+/).filter(Boolean);
        const descOK = terms.every((t) => desc.includes(t));
        const amtMatch = /-?\d+\.?\d*/.exec(q);
        const amtOK = amtMatch ? Math.abs(Number(row.amount) || 0).toFixed(2) === Math.abs(parseFloat(amtMatch[0])).toFixed(2) : false;
        if (!descOK && !amtOK) return false;
      }
      return true;
    };
    return {
      accounting: (records.accounting || []).filter(acctFilter),
      bank: (records.bank || []).filter(bankFilter),
    };
  }, [records, filters, commonPredicate]);

  const summaryComputed = useMemo(() => {
    const acctBal = filtered.accounting.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const bankBal = filtered.bank.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return {
      accountingBalance: acctBal,
      bankBalance: bankBal,
      difference: acctBal - bankBal,
    };
  }, [filtered]);

  const pageItems = (list, ui) => {
    const start = (ui.page - 1) * ui.pageSize;
    return list.slice(start, start + ui.pageSize);
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    if (!debouncedDates.isValid) return;
    setLoading(true);
    try {
      const s = debouncedDates.start;
      const e = debouncedDates.end;
      const [acctRes, bankRes, accountsRes] = await Promise.all([
        getReconciliationAccounting(s, e, { pageSize: 1000 }, token),
        getReconciliationBank(s, e, { pageSize: 1000 }, token),
        getReconciliationAccounts(token).catch(() => ({ glAccounts: [], bankAccounts: [] })),
      ]);
      const accounting = (acctRes.items || []).map(mapAccountingRow).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
      const bank = (bankRes.items || []).map(mapBankRow).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
      const glFromData = new Set(accounting.map((r) => r.account || "Checking Account"));
      const bankFromData = new Set(bank.map((r) => r.account || "Checking Account"));
      const apiItems = accountsRes.glAccounts || accountsRes.bankAccounts || [];
      const apiNames = apiItems.map((a) => (typeof a === "object" ? a.name || a.id : a));
      const glSet = new Set([...glFromData, ...apiNames]);
      const bankSet = new Set([...bankFromData, ...apiNames]);
      setRecords({ accounting, bank });
      setGlAccountsList(["All GL Accounts", ...Array.from(glSet).filter(Boolean).sort()]);
      setBankAccountsList(["All Bank Accounts", ...Array.from(bankSet).filter(Boolean).sort()]);
    } catch (err) {
      toast.error(err?.message || "Failed to load data");
      setRecords({ accounting: [], bank: [] });
    } finally {
      setLoading(false);
    }
  }, [token, debouncedDates.start, debouncedDates.end, debouncedDates.isValid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelect = (side, id) => {
    setSelection((prev) => {
      const next = new Set(prev[side]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [side]: next };
    });
  };

  const isSelected = (side, id) => selection[side].has(id);
  const selectedCount = (side) => selection[side].size;
  const clearSelected = () => setSelection({ accounting: new Set(), bank: new Set() });

  const matchSelected = useCallback(async () => {
    const acctIds = Array.from(selection.accounting);
    const bankIds = Array.from(selection.bank);
    if (!acctIds.length || !bankIds.length) {
      toast.error("Select at least one from each table");
      return;
    }
    setIsMatching(true);
    try {
      const payload = {
        accountingIds: acctIds,
        bankIds,
        period: { startDate: debouncedDates.start, endDate: debouncedDates.end },
      };
      const resp = await postReconciliationMatches(payload, token);
      const matchId = resp[0]?.matchId;
      const acctSet = new Set(acctIds);
      const bankSet = new Set(bankIds);
      setRecords((prev) => ({
        accounting: prev.accounting.map((r) => (acctSet.has(r.id) ? { ...r, status: "Matched", matchId } : r)),
        bank: prev.bank.map((r) => (bankSet.has(r.id) ? { ...r, status: "Matched", matchId } : r)),
      }));
      clearSelected();
      toast.success("Matched successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to match");
    } finally {
      setIsMatching(false);
    }
  }, [selection, filters, token]);

  const unmatchSelected = useCallback(async () => {
    const acctIds = Array.from(selection.accounting);
    const bankIds = Array.from(selection.bank);
    const acctMatchById = new Map(records.accounting.map((r) => [r.id, r.matchId]));
    const bankMatchById = new Map(records.bank.map((r) => [r.id, r.matchId]));
    const matchIdSet = new Set();
    [...acctIds, ...bankIds].forEach((id) => {
      const mid = acctMatchById.get(id) ?? bankMatchById.get(id);
      if (Number.isFinite(mid) && mid > 0) matchIdSet.add(mid);
    });
    const matchIds = Array.from(matchIdSet);
    if (!matchIds.length) {
      toast.error("No matched pairs in selection");
      return;
    }
    setIsMatching(true);
    try {
      await Promise.all(matchIds.map((mid) => deleteReconciliationMatch(mid, token)));
      const deletedSet = new Set(matchIds);
      setRecords((prev) => ({
        accounting: prev.accounting.map((r) =>
          deletedSet.has(Number(r.matchId)) ? { ...r, status: "Unmatched", matchId: null } : r
        ),
        bank: prev.bank.map((r) =>
          deletedSet.has(Number(r.matchId)) ? { ...r, status: "Unmatched", matchId: null } : r
        ),
      }));
      clearSelected();
      toast.success("Unmatched successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to unmatch");
    } finally {
      setIsMatching(false);
    }
  }, [selection, records, token]);

  const autoMatchVisible = useCallback(async () => {
    if (isMatching) return;
    const acctList = filtered.accounting.filter((r) => r.status !== "Matched");
    const bankList = filtered.bank.filter((r) => r.status !== "Matched");
    const normAbs2 = (a) => Math.abs(Number(a) || 0).toFixed(2);
    const buckets = {};
    acctList.forEach((r) => {
      const key = normAbs2(r.amount);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(r);
    });
    const pairs = [];
    const taken = {};
    bankList.forEach((b) => {
      const key = normAbs2(b.amount);
      const list = (buckets[key] || []).filter((a) => !taken[String(a.id)]);
      if (!list.length) return;
      const best = list[0];
      pairs.push({ acctId: best.id, bankId: b.id });
      taken[String(best.id)] = true;
    });
    if (!pairs.length) {
      toast.info("No auto-matches found");
      return;
    }
    setIsMatching(true);
    try {
      for (const p of pairs) {
        await postReconciliationMatches(
          { accountingIds: [p.acctId], bankIds: [p.bankId], period: { startDate: debouncedDates.start, endDate: debouncedDates.end } },
          token
        );
      }
      await loadData();
      toast.success(`Auto-matched ${pairs.length} pair(s)`);
    } catch (err) {
      toast.error(err?.message || "Auto-match failed");
    } finally {
      setIsMatching(false);
    }
  }, [filtered, filters, token, loadData]);

  const exportCsv = useCallback(() => {
    const rows = [["Side", "Date", "Description", "Amount", "Status", "Account"]];
    filtered.accounting.forEach((r) =>
      rows.push(["Accounting", toYMD(r.date), r.description, r.amount, r.status, r.account])
    );
    filtered.bank.forEach((r) =>
      rows.push(["Bank", toYMD(r.date), r.description, r.amount, r.status, r.account])
    );
    const csv = rows
      .map((r) => r.map((x) => ((x == null ? "" : String(x)).match(/[",\n]/) ? `"${String(x).replace(/"/g, '""')}"` : x)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bank-reconciliation.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }, [filtered]);

  const openJournalFromBank = useCallback(() => {
    const ids = Array.from(selection.bank);
    if (!ids.length) {
      toast.error("Select at least one bank transaction");
      return;
    }
    toast.info("Create Journal: Navigate to Manual Journal to add adjustment (feature in progress)");
  }, [selection.bank]);

  const prev = (side) => setUi((u) => ({ ...u, [side]: { ...u[side], page: Math.max(1, u[side].page - 1) } }));
  const next = (side, list) =>
    setUi((u) => ({
      ...u,
      [side]: { ...u[side], page: u[side].page * u[side].pageSize < list.length ? u[side].page + 1 : u[side].page },
    }));

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-6 flex flex-wrap items-center justify-between gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex items-center gap-3">
            <Link href="/accounting">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bank Reconciliation
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Match transactions and reconcile bank statements with the general ledger
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </motion.div>

        <main>
        <motion.section
          className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <DateRangeInput
                startDate={filters.startDate}
                endDate={filters.endDate}
                onStartDateChange={(val) =>
                  setFilters((f) => ({ ...f, startDate: val ? new Date(val + "T12:00:00") : f.startDate }))
                }
                onEndDateChange={(val) =>
                  setFilters((f) => ({ ...f, endDate: val ? new Date(val + "T12:00:00") : f.endDate }))
                }
                onDebouncedChange={handleDebouncedChange}
                startLabel="Start Date"
                endLabel="End Date"
                inputClassName="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">GL Account</label>
              <select
                value={filters.glAccount}
                onChange={(e) => setFilters((f) => ({ ...f, glAccount: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-800"
              >
                {glAccountsList.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Bank Account</label>
              <select
                value={filters.bankAccount}
                onChange={(e) => setFilters((f) => ({ ...f, bankAccount: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-800"
              >
                {bankAccountsList.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-800"
              >
                <option>All Transactions</option>
                <option>Matched</option>
                <option>Unmatched</option>
                <option>Pending</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={loadData}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Apply Filters
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Accounting Balance</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">{formatCurrency(summaryComputed.accountingBalance)}</p>
              </div>
              <div className="rounded-full bg-green-50 p-3 ring-1 ring-green-200 dark:bg-green-900/30">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Bank Balance</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">{formatCurrency(summaryComputed.bankBalance)}</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 ring-1 ring-blue-200 dark:bg-blue-900/30">
                <Banknote className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Difference</p>
                <p
                  className={`mt-1 text-4xl font-semibold tabular-nums ${
                    summaryComputed.difference !== 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(summaryComputed.difference)}
                </p>
              </div>
              <div className="rounded-full bg-rose-50 p-3 ring-1 ring-rose-200 dark:bg-rose-900/30">
                <span className="text-rose-600">!</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Accounting Records */}
          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Accounting Records</h2>
                <div className="flex w-full items-center gap-2 md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search description or amount"
                      value={filters.glQuery}
                      onChange={(e) => setFilters((f) => ({ ...f, glQuery: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-9 dark:border-slate-600 dark:bg-slate-800"
                    />
                    {filters.glQuery && (
                      <button
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, glQuery: "" }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {filtered.accounting.length} records
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[2.5rem_7.5rem_1fr_10.5rem_7.5rem] gap-2 overflow-x-auto px-4 py-2">
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                <input type="checkbox" aria-label="Select" className="h-4 w-4 rounded border-slate-300" />
              </div>
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Date</div>
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Description</div>
              <div className="flex items-center justify-end bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Amount</div>
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Status</div>
              {loading ? (
                <div className="col-span-5 flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                </div>
              ) : (
                pageItems(filtered.accounting, ui.acct).map((row) => (
                  <div
                    key={`acct-${row.id}`}
                    className="col-span-5 grid grid-cols-[2.5rem_7.5rem_1fr_10.5rem_7.5rem] gap-2 border-b border-slate-100 px-3 py-2 odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/30 dark:border-slate-700 dark:even:bg-slate-800/30"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected("accounting", row.id)}
                        onChange={() => toggleSelect("accounting", row.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </div>
                    <div className="flex items-center whitespace-nowrap text-slate-500">{toYMD(row.date)}</div>
                    <div className="line-clamp-2 pl-6 leading-tight text-slate-900 dark:text-white" title={row.description}>
                      {normalizeDescription(row.description)}
                    </div>
                    <div
                      className={`text-right font-medium tabular-nums ${
                        row.amount < 0 ? "text-rose-600" : row.amount > 0 ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(row.amount)}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.status === "Matched"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : row.status === "Unmatched"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {row.status || "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex h-11 items-center justify-between border-t border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-400">
                Showing {(ui.acct.page - 1) * ui.acct.pageSize + 1} to{" "}
                {Math.min(ui.acct.page * ui.acct.pageSize, filtered.accounting.length)} of {filtered.accounting.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={ui.acct.page === 1} onClick={() => prev("acct")}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ui.acct.page * ui.acct.pageSize >= filtered.accounting.length}
                  onClick={() => next("acct", filtered.accounting)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Bank Transactions */}
          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Bank Transactions</h2>
                <div className="flex w-full items-center gap-2 md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search description or amount"
                      value={filters.bankQuery}
                      onChange={(e) => setFilters((f) => ({ ...f, bankQuery: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-9 dark:border-slate-600 dark:bg-slate-800"
                    />
                    {filters.bankQuery && (
                      <button
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, bankQuery: "" }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {filtered.bank.length} records
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[2.5rem_7.5rem_1fr_10.5rem_7.5rem] gap-2 overflow-x-auto px-4 py-2">
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                <input type="checkbox" aria-label="Select" className="h-4 w-4 rounded border-slate-300" />
              </div>
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Date</div>
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Description</div>
              <div className="flex items-center justify-end bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Amount</div>
              <div className="flex items-center bg-slate-50 px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800">Status</div>
              {loading ? (
                <div className="col-span-5 flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                </div>
              ) : (
                pageItems(filtered.bank, ui.bank).map((row) => (
                  <div
                    key={`bank-${row.id}`}
                    className="col-span-5 grid grid-cols-[2.5rem_7.5rem_1fr_10.5rem_7.5rem] gap-2 border-b border-slate-100 px-3 py-2 odd:bg-white even:bg-slate-50/50 hover:bg-indigo-50/30 dark:border-slate-700 dark:even:bg-slate-800/30"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected("bank", row.id)}
                        onChange={() => toggleSelect("bank", row.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </div>
                    <div className="flex items-center whitespace-nowrap text-slate-500">{toYMD(row.date)}</div>
                    <div className="max-w-[42ch] truncate pl-6 leading-tight text-slate-900 dark:text-white" title={row.description}>
                      {normalizeDescription(row.description)}
                    </div>
                    <div
                      className={`text-right font-medium tabular-nums ${
                        row.amount < 0 ? "text-rose-600" : row.amount > 0 ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(row.amount)}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.status === "Matched"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : row.status === "Unmatched"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {row.status || "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex h-11 items-center justify-between border-t border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-400">
                Showing {(ui.bank.page - 1) * ui.bank.pageSize + 1} to{" "}
                {Math.min(ui.bank.page * ui.bank.pageSize, filtered.bank.length)} of {filtered.bank.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={ui.bank.page === 1} onClick={() => prev("bank")}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ui.bank.page * ui.bank.pageSize >= filtered.bank.length}
                  onClick={() => next("bank", filtered.bank)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Bulk action footer */}
        {(selectedCount("accounting") > 0 || selectedCount("bank") > 0) && (
          <div className="pointer-events-none sticky inset-x-0 bottom-4 z-40">
            <div className="pointer-events-auto container mx-auto px-4">
              <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      Accounting: <span className="font-medium">{selectedCount("accounting")}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Bank: <span className="font-medium">{selectedCount("bank")}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={matchSelected}
                      disabled={selectedCount("accounting") === 0 || selectedCount("bank") === 0 || isMatching}
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Link2 className="h-4 w-4" />
                      Match Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={unmatchSelected}
                      disabled={selectedCount("accounting") + selectedCount("bank") === 0 || isMatching}
                      className="gap-2"
                    >
                      <Unlink className="h-4 w-4" />
                      Unmatch Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openJournalFromBank}
                      disabled={selectedCount("bank") === 0}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Journal from Selected
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelected}>
                      Clear all
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reconciliation Actions */}
        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700">
          <h2 className="mb-4 font-semibold">Reconciliation Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={autoMatchVisible}
              disabled={isMatching}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Magnet className="h-4 w-4" />}
              Auto-match (visible)
            </Button>
            <Button
              onClick={matchSelected}
              disabled={selectedCount("accounting") === 0 || selectedCount("bank") === 0 || isMatching}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              Match Selected
            </Button>
            {isMatching && <span className="flex items-center text-sm text-slate-500">Matching…</span>}
          </div>
        </section>
        </main>
      </div>
    </motion.div>
  );
}
