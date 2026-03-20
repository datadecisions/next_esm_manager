"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Loader2,
  RefreshCw,
  Plus,
  Eye,
  Copy,
  Undo2,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getJournalHistory,
  getAccounts,
  getJournalItems,
  createJournal,
  postJournal,
} from "@/lib/api/accounting";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangeInput } from "@/components/DateRangeInput";
import { AccountCombobox } from "@/components/accounting/AccountCombobox";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrency(val) {
  if (val == null || val === "" || Number.isNaN(Number(val))) return "$0.00";
  const n = Number(val);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDefaultDates() {
  const d = new Date();
  const firstDay = new Date(d.getFullYear() - 1, d.getMonth(), -1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: firstDay, end: lastDay };
}

function getLineAmount(line) {
  const v = line.Amount ?? line.amount;
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function groupJournalHistory(rows, accounts) {
  const byJournal = {};
  for (const item of rows || []) {
    const key = item.Journal;
    const amt = getLineAmount(item);
    if (!byJournal[key]) {
      byJournal[key] = {
        Journal: key,
        Comments: item.Comments,
        Posted: item.Posted,
        Source: item.Source,
        EffectiveDate: item.EffectiveDate,
        Amount: 0,
        JournalType: item.AccountField,
        orderLines: [],
      };
    }
    byJournal[key].Amount += amt > 0 ? amt : 0;
    byJournal[key].orderLines.push({
      ...item,
      Amount: amt,
      Account: accounts.find((a) => a.AccountNo === (item.AccountNo ?? item.accountNo)),
    });
  }
  return Object.values(byJournal);
}

export default function JournalPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [dates, setDates] = useState(getDefaultDates);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [journalRows, setJournalRows] = useState([]);
  const [journalHeaders, setJournalHeaders] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelJournal, setPanelJournal] = useState(null);
  const [panelMode, setPanelMode] = useState("create"); // 'create' | 'view'
  const [submitting, setSubmitting] = useState(false);

  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);
  const dateStr = `${debouncedDates.start}_${debouncedDates.end}`;

  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAccounts("", token);
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    }
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (!debouncedDates.isValid) return;

    setLoading(true);
    try {
      const data = await getJournalHistory(debouncedDates.start, debouncedDates.end, token);
      setJournalRows(data || []);
      const headers = groupJournalHistory(data, accounts);
      setJournalHeaders(headers);
    } catch (err) {
      toast.error(err?.message || "Failed to load journals");
      setJournalRows([]);
      setJournalHeaders([]);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedDates.start, debouncedDates.end, debouncedDates.isValid, accounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const headers = groupJournalHistory(journalRows, accounts);
    setJournalHeaders(headers);
  }, [journalRows, accounts]);

  const openNew = () => {
    setPanelJournal(null);
    setPanelMode("create");
    setPanelOpen(true);
  };

  const openView = (journal) => {
    setPanelJournal(journal);
    setPanelMode("view");
    setPanelOpen(true);
  };

  const openDuplicate = (journal) => {
    setPanelJournal(journal);
    setPanelMode("duplicate");
    setPanelOpen(true);
  };

  const openReverse = (journal) => {
    setPanelJournal(journal);
    setPanelMode("reverse");
    setPanelOpen(true);
  };

  const [postingId, setPostingId] = useState(null);
  const handlePost = async (j) => {
    if (j.Posted) return;
    setPostingId(j.Journal);
    try {
      await postJournal(j.Journal, token);
      fetchData();
      toast.success("Journal posted");
    } catch (err) {
      toast.error(err?.message || "Failed to post journal");
    } finally {
      setPostingId(null);
    }
  };

  const closePanel = () => setPanelOpen(false);

  useEffect(() => {
    if (!panelOpen) {
      const t = setTimeout(() => {
        setPanelJournal(null);
        setPanelMode("create");
      }, 250);
      return () => clearTimeout(t);
    }
  }, [panelOpen]);

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-linear-to-b from-background via-accent/10 to-background text-foreground"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex items-center gap-4">
            <Link href="/accounting">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                Manual Journal
              </h1>
              <p className="mt-1 text-muted-foreground">
                Create and view journal entries.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            <div className="p-4 flex flex-wrap items-end gap-4 border-b border-border/60">
              <DateRangeInput
                startDate={dates.start}
                endDate={dates.end}
                onStartDateChange={(val) =>
                  setDates((d) => ({ ...d, start: val ? new Date(val + "T12:00:00") : d.start }))
                }
                onEndDateChange={(val) =>
                  setDates((d) => ({ ...d, end: val ? new Date(val + "T12:00:00") : d.end }))
                }
                onDebouncedChange={handleDebouncedChange}
                startLabel="Start Date"
                endLabel="End Date"
                inputClassName="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
              <Button onClick={openNew} className="ml-auto gap-2">
                <Plus className="h-4 w-4" />
                New Journal
              </Button>
            </div>

            <div className="px-6 py-4 bg-accent/10 border-b border-border/60">
              <h2 className="text-xl font-semibold text-foreground">
                Journals
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : journalHeaders.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium text-muted-foreground">
                  No journals found
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No journals for the selected date range.
                </p>
                <Button onClick={openNew} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Journal
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/60">
                  <thead className="bg-muted/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Journal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border/60">
                    {journalHeaders.map((j) => (
                      <tr
                        key={j.Journal}
                        className="hover:bg-accent/10 cursor-pointer transition"
                        onClick={() => openView(j)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">
                            {j.Journal}
                          </div>
                          {j.Comments && (
                            <div className="text-sm text-muted-foreground">
                              {j.Comments}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {j.EffectiveDate
                            ? new Date(j.EffectiveDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {formatCurrency(j.Amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              j.Posted
                                ? "bg-primary/10 text-primary"
                                : "bg-accent/10 text-muted-foreground"
                            }`}
                          >
                            {j.Posted ? "Posted" : "Open"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openView(j)}
                              className="text-primary hover:text-primary/90"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!!j.Posted || postingId === j.Journal}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePost(j);
                              }}
                              title={j.Posted ? "Already posted" : "Post to GL"}
                            >
                              {postingId === j.Journal ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-1" />
                              )}
                              Post
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDuplicate(j);
                              }}
                              title="Create a copy"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Duplicate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReverse(j);
                              }}
                              title="Create reversing entry"
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Reverse
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <JournalPanel
        open={panelOpen}
        onOpenChange={(v) => !v && closePanel()}
        journal={panelJournal}
        mode={panelMode}
        accounts={accounts}
        token={token}
        onSuccess={() => {
          closePanel();
          fetchData();
          toast.success("Journal created");
        }}
      />
    </motion.div>
  );
}

function JournalPanel({
  open,
  onOpenChange,
  journal,
  mode,
  accounts,
  token,
  onSuccess,
}) {
  const isView = mode === "view";
  const isDuplicate = mode === "duplicate";
  const isReverse = mode === "reverse";
  const isCreateForm = !isView;
  const today = useMemo(() => toYMD(new Date()), []);
  const [fetchedItems, setFetchedItems] = useState(null);

  // When viewing or duplicating/reversing, fetch journal items for accurate data
  useEffect(() => {
    if ((!isView && !isDuplicate && !isReverse) || !journal?.Journal || !token) {
      setFetchedItems(null);
      return;
    }
    let cancelled = false;
    getJournalItems(journal.Journal, token)
      .then((items) => {
        if (!cancelled) setFetchedItems(items);
      })
      .catch(() => {
        if (!cancelled) setFetchedItems(null);
      });
    return () => { cancelled = true; };
  }, [isView, isDuplicate, isReverse, journal?.Journal, token]);

  // Derive view data - prefer fetched items when available for correct Amount/Debit/Credit
  const viewData = useMemo(() => {
    if (!journal || !isView) return null;
    const rawLines = fetchedItems ?? journal.orderLines ?? [];
    const lines = rawLines.map((l) => {
      const amt = getLineAmount(l);
      return {
        ...l,
        Amount: amt,
        Account: l.Account || accounts.find((a) => a.AccountNo === (l.AccountNo ?? l.accountNo)),
        Debit: amt < 0 ? Math.abs(amt) : 0,
        Credit: amt > 0 ? amt : 0,
      };
    });
    return {
      Journal: journal.Journal,
      EffectiveDate: journal.EffectiveDate
        ? toYMD(new Date(journal.EffectiveDate))
        : today,
      JournalType: journal.JournalType || "Actual",
      Comments: journal.Comments || "",
      orderLines: lines,
      subtotal: lines.reduce((s, l) => s + (l.Amount < 0 ? Math.abs(l.Amount) : 0), 0),
    };
  }, [journal, isView, accounts, today, fetchedItems]);

  const [form, setForm] = useState({
    Journal: "",
    EffectiveDate: today,
    ControlNo: "",
    JournalType: "Actual",
    Comments: "",
    Source: "Voucher",
    orderLines: [{}],
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionName, setActionName] = useState("Create"); // "Create" | "Reverse"

  const balance = useMemo(() => {
    let total = 0;
    for (const line of form.orderLines || []) {
      const debit = Number(line.Debit) || 0;
      const credit = Number(line.Credit) || 0;
      total += credit - debit;
    }
    return total;
  }, [form.orderLines]);

  const subtotal = useMemo(() => {
    let total = 0;
    for (const line of form.orderLines || []) {
      total += Number(line.Debit) || 0;
    }
    return total;
  }, [form.orderLines]);

  useEffect(() => {
    if (journal && (isView || isDuplicate || isReverse)) {
      const rawLines = fetchedItems ?? journal.orderLines ?? [];
      const lines = rawLines.map((l) => {
        const amt = getLineAmount(l);
        const acc = l.Account || accounts.find((a) => a.AccountNo === (l.AccountNo ?? l.accountNo));
        if (!acc) return null;
        const debit = amt < 0 ? Math.abs(amt) : 0;
        const credit = amt > 0 ? amt : 0;
        return {
          Account: acc,
          AccountNo: acc.AccountNo,
          Debit: isReverse ? credit : debit,
          Credit: isReverse ? debit : credit,
        };
      }).filter(Boolean);
      if (lines.length === 0) lines.push({});
      setForm({
        Journal: journal.Journal + (isDuplicate ? " (Copy)" : isReverse ? " (Reverse)" : ""),
        EffectiveDate: journal.EffectiveDate
          ? toYMD(new Date(journal.EffectiveDate))
          : today,
        ControlNo: journal.ControlNo || "",
        JournalType: journal.JournalType || "Actual",
        Comments: journal.Comments || "",
        Source: journal.Source || "Voucher",
        orderLines: lines,
      });
      setActionName("Create");
    } else if (!journal && isCreateForm && !isDuplicate && !isReverse) {
      setForm({
        Journal: "",
        EffectiveDate: today,
        ControlNo: "",
        JournalType: "Actual",
        Comments: "",
        Source: "Voucher",
        orderLines: [{}],
      });
      setActionName("Create");
    }
  }, [journal, isView, isDuplicate, isReverse, isCreateForm, accounts, today, fetchedItems]);

  const updateLine = (index, field, value) => {
    setForm((prev) => {
      const lines = [...(prev.orderLines || [])];
      if (!lines[index]) lines[index] = {};
      lines[index] = { ...lines[index], [field]: value };
      if (field === "Account" && value) {
        lines[index].AccountNo = value.AccountNo;
      }
      const hasBlank = lines.some(
        (l) => !l.Account && !l.Debit && !l.Credit
      );
      if (!hasBlank) lines.push({});
      return { ...prev, orderLines: lines };
    });
  };

  const removeLine = (index) => {
    setForm((prev) => {
      const lines = prev.orderLines.filter((_, i) => i !== index);
      if (lines.length === 0) lines.push({});
      return { ...prev, orderLines: lines };
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isView) return;

    if (!form.Journal?.trim()) {
      toast.error("Journal name is required");
      return;
    }

    const validLines = (form.orderLines || []).filter((l) => l.Account);
    if (validLines.length === 0) {
      toast.error("Add at least one line with an account");
      return;
    }

    if (Math.abs(balance) > 0.01) {
      toast.error("Journal must balance (debits = credits)");
      return;
    }

    const isReverse = actionName === "Reverse";
    const payload = {
      Journal: form.Journal.trim() + (isReverse ? " (Reverse)" : ""),
      EffectiveDate: form.EffectiveDate,
      AccountField: form.JournalType,
      JournalType: form.JournalType,
      ControlNo: form.ControlNo || "",
      Comments: form.Comments || "DDI ADD",
      Source: form.Source || "Voucher",
      orderLines: validLines.map((line) => {
        const amount = (Number(line.Credit) || 0) - (Number(line.Debit) || 0);
        return {
          Account: line.Account,
          Amount: isReverse ? -amount : amount,
          Description: line.Description || "",
          ControlNo: line.ControlNo || "",
          InvoiceNo: line.InvoiceNo || "",
          APInvoiceNo: line.APInvoiceNo || "",
          CustomerNo: line.CustomerNo || "",
          VendorNo: line.VendorNo || "",
        };
      }),
    };

    setSubmitting(true);
    try {
      await createJournal(payload, token);
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      toast.error(err?.message || "Failed to create journal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>
            {isView
              ? `View: ${journal?.Journal}`
              : isDuplicate
                ? `Duplicate: ${journal?.Journal}`
                : isReverse
                  ? `Reverse: ${journal?.Journal}`
                  : "New Journal"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {isView && viewData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <div>{viewData.EffectiveDate}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <div>{viewData.JournalType}</div>
                </div>
                {viewData.Comments && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Comments</span>
                    <div>{viewData.Comments}</div>
                  </div>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr>
                      <th className="px-4 py-2 text-left">Account</th>
                      <th className="px-4 py-2 text-right">Debit</th>
                      <th className="px-4 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewData.orderLines || []).map(
                      (line, i) =>
                        line.Account && (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2">
                              {line.Account.AccountNo}: {line.Account.Description}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {line.Debit ? formatCurrency(line.Debit) : ""}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {line.Credit ? formatCurrency(line.Credit) : ""}
                            </td>
                          </tr>
                        )
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-right font-semibold">
                Total: {formatCurrency(viewData.subtotal)}
              </div>
            </div>
          ) : !isView ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Journal Name *
                  </label>
                  <input
                    type="text"
                    value={form.Journal}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, Journal: e.target.value }))
                    }
                    placeholder="e.g. Month-end adjustment"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Posting Date *
                  </label>
                  <input
                    type="date"
                    value={form.EffectiveDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, EffectiveDate: e.target.value }))
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ref / Control #
                  </label>
                  <input
                    type="text"
                    value={form.ControlNo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ControlNo: e.target.value }))
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Journal Type
                  </label>
                  <select
                    value={form.JournalType}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, JournalType: e.target.value }))
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  >
                    <option value="Actual">Actual</option>
                    <option value="Budget">Budget</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Comments
                  </label>
                  <textarea
                    value={form.Comments}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, Comments: e.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Lines</label>
                  <span
                    className={`text-sm font-medium ${
                      Math.abs(balance) < 0.01
                        ? "text-primary"
                        : "text-destructive"
                    }`}
                  >
                    Balance: {formatCurrency(balance)}
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="px-4 py-2 text-left">Account</th>
                        <th className="px-4 py-2 text-right w-24">Debit</th>
                        <th className="px-4 py-2 text-right w-24">Credit</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.orderLines || []).map((line, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2">
                            <AccountCombobox
                              value={line.Account}
                              onValueChange={(acc) => updateLine(i, "Account", acc)}
                              token={token}
                              placeholder="Select account"
                              minChars={0}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.Debit ?? ""}
                              onChange={(e) =>
                                updateLine(i, "Debit", e.target.value)
                              }
                              placeholder="0"
                              className="w-full text-right rounded border px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.Credit ?? ""}
                              onChange={(e) =>
                                updateLine(i, "Credit", e.target.value)
                              }
                              placeholder="0"
                              className="w-full text-right rounded border px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(i)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                  Cancel
                </Button>
                <div className="flex rounded-md [&>button]:rounded-none [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md">
                  <Button
                    type="submit"
                    disabled={submitting || Math.abs(balance) > 0.01}
                    className="rounded-r-none"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      actionName
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        disabled={submitting || Math.abs(balance) > 0.01}
                        className="rounded-l-none border-l border-border/60 px-2"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setActionName("Create")}>
                        Create
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActionName("Reverse")}>
                        Reverse
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
