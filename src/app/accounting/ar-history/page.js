"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  FileText,
  History,
  Download,
  Settings,
  FileEdit,
  Printer,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getARDetailInquiry,
  getBillingARAging,
} from "@/lib/api/accounting";
import {
  getCustomerFullInfo,
  updateCustomer,
} from "@/lib/api/customer";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { DateRangeInput } from "@/components/DateRangeInput";
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
  const start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  return { start, end };
}

export default function ARHistoryPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const router = useRouter();
  const [dates, setDates] = useState(getDefaultDateRange);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [poNo, setPoNo] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [customerInfoLoading, setCustomerInfoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [arComments, setArComments] = useState("");
  const [commentsSaving, setCommentsSaving] = useState(false);
  const [agingRawData, setAgingRawData] = useState([]);
  const [agingLoading, setAgingLoading] = useState(false);
  const [facturaWithApplyTo, setFacturaWithApplyTo] = useState(true);
  const [sortBy, setSortBy] = useState("applyTo");

  const customerNo = selectedCustomer?.Number ?? selectedCustomer?.number ?? "";

  // Group results by ApplyToInvoiceNo
  const arGroups = useMemo(() => {
    const key = (r) => r.ApplyToInvoiceNo ?? r.InvoiceNo ?? "";
    const map = new Map();
    for (const row of results) {
      const k = key(row);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(row);
    }
    const groups = Array.from(map.entries()).map(([key, rows]) => {
      const total = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
      return { key, rows, total };
    });
    // Sort: Apply To # (default), Amount, Date, Account #
    if (sortBy === "amount") {
      groups.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    } else if (sortBy === "date") {
      groups.sort((a, b) => {
        const da = a.rows[0]?.EntryDate || a.rows[0]?.EffectiveDate || "";
        const db = b.rows[0]?.EntryDate || b.rows[0]?.EffectiveDate || "";
        return new Date(da) - new Date(db);
      });
    } else if (sortBy === "account") {
      groups.sort((a, b) => {
        const aa = a.rows[0]?.AccountNo ?? "";
        const bb = b.rows[0]?.AccountNo ?? "";
        return String(aa).localeCompare(String(bb));
      });
    } else {
      groups.sort((a, b) => String(a.key).localeCompare(String(b.key)));
    }
    return groups;
  }, [results, sortBy]);

  const totalBalance = useMemo(
    () => results.reduce((s, r) => s + (Number(r.Amount) || 0), 0),
    [results]
  );
  const hasFilters =
    customerNo ||
    (invoiceNo && invoiceNo.trim()) ||
    (poNo && poNo.trim()) ||
    (dates.start && dates.end);

  // Fetch customer full info when customer selected
  useEffect(() => {
    if (!token || !customerNo) {
      setCustomerInfo(null);
      setArComments("");
      return;
    }
    setCustomerInfoLoading(true);
    getCustomerFullInfo(customerNo, token)
      .then((data) => {
        setCustomerInfo(data ?? null);
        setArComments(data?.ARComments ?? "");
      })
      .catch(() => {
        setCustomerInfo(null);
        setArComments("");
      })
      .finally(() => setCustomerInfoLoading(false));
  }, [token, customerNo]);

  // Fetch aging when customer selected (for info card and Aging tab)
  useEffect(() => {
    if (!token || !customerNo) {
      setAgingRawData([]);
      return;
    }
    setAgingLoading(true);
    const now = new Date();
    getBillingARAging(
      {
        month: now.getMonth() + 1,
        day: now.getDate(),
        year: now.getFullYear(),
      },
      token
    )
      .then((data) => setAgingRawData(Array.isArray(data) ? data : []))
      .catch(() => setAgingRawData([]))
      .finally(() => setAgingLoading(false));
  }, [token, customerNo]);

  // Match aging to customer (aging is keyed by BillTo)
  const agingData = useMemo(() => {
    const billTo = customerInfo?.BillTo ?? customerNo;
    return agingRawData.find(
      (r) => String(r.CustomerNo) === String(billTo)
    ) ?? null;
  }, [agingRawData, customerInfo?.BillTo, customerNo]);

  const runSearch = useCallback(async () => {
    if (!token || !hasFilters) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const params = {};
      if (customerNo) params.customerNo = customerNo;
      if (invoiceNo?.trim()) params.invoiceNo = invoiceNo.trim();
      if (poNo?.trim()) params.poNo = poNo.trim();
      if (showHistory && debouncedDates.isValid) {
        params.startDate = debouncedDates.start;
        params.endDate = debouncedDates.end;
      } else if (dates.start && dates.end) {
        params.startDate = toYMD(dates.start);
        params.endDate = toYMD(dates.end);
      }
      if (showHistory) params.showHistory = true;
      const data = await getARDetailInquiry(params, token);
      setResults(data);
    } catch (err) {
      toast.error(err?.message || "Failed to search AR records");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    customerNo,
    invoiceNo,
    poNo,
    debouncedDates.start,
    debouncedDates.end,
    debouncedDates.isValid,
    showHistory,
    dates.start,
    dates.end,
    hasFilters,
  ]);

  const saveComments = useCallback(async () => {
    if (!token || !customerNo) return;
    setCommentsSaving(true);
    try {
      await updateCustomer({ Number: customerNo, ARComments: arComments }, token);
      toast.success("Comments saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save comments");
    } finally {
      setCommentsSaving(false);
    }
  }, [token, customerNo, arComments]);

  const exportResults = useCallback(() => {
    if (results.length === 0) {
      toast.info("No data to export");
      return;
    }
    const cols = [
      "CustomerNo",
      "InvoiceNo",
      "ApplyToInvoiceNo",
      "EntryType",
      "EntryDate",
      "EffectiveDate",
      "Amount",
      "CheckNo",
      "AccountNo",
    ];
    const header = cols.join(",");
    const rows = results.map((r) =>
      cols.map((c) => {
        const v = r[c];
        if (v == null) return "";
        if (typeof v === "string" && v.includes(",")) return `"${v}"`;
        return String(v);
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ar-history-${toYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }, [results]);

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
                Accounts Receivable Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage customer payments and invoices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportResults}
              disabled={results.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </motion.div>

        {/* Main: two-column layout */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md dark:border-slate-700/50 dark:bg-slate-800/50 lg:flex-row">
          {/* Left: Search & Customer Info - fixed width, scrollable */}
          <div className="w-full flex-shrink-0 border-b border-slate-200 p-6 dark:border-slate-700 lg:w-80 lg:border-b-0 lg:border-r lg:overflow-y-auto">
            <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">
              Search Filters
            </h2>
            <div className="space-y-4">
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Customer #
                </label>
                <div className="min-w-0">
                  <CustomerCombobox
                    value={selectedCustomer}
                    onValueChange={setSelectedCustomer}
                    placeholder="Customer Search"
                    token={token}
                    minChars={2}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  PO #
                </label>
                <input
                  type="text"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                  placeholder="PO Search"
                  className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Invoice #
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Invoice Search"
                  className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Cash Sales
                </span>
              </label>
            </div>

            {/* Customer Info Card */}
            {customerNo && (
              <div className="mt-6">
                <div className="rounded-lg border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 shadow-sm dark:border-cyan-800 dark:from-cyan-900/30 dark:to-blue-900/30">
                  {customerInfoLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                    </div>
                  ) : customerInfo ? (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-cyan-900 dark:text-cyan-100">
                            {customerInfo.Name}
                          </h3>
                          <p className="text-sm text-cyan-700 dark:text-cyan-300">
                            {[customerInfo.Address, customerInfo.City, customerInfo.State, customerInfo.ZipCode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <p className="text-sm text-cyan-600 dark:text-cyan-400">
                            {customerInfo.Phone}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileEdit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            Net 10 Limit:
                          </span>
                          <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                            {formatCurrency(customerInfo.CreditLimit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            Hold Days:
                          </span>
                          <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                            {customerInfo.CreditHoldDays ?? "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            Rating:
                          </span>
                          <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                            {customerInfo.CreditRating1 ?? "—"}
                          </span>
                        </div>
                        {agingData && (
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Avg Days To Pay:
                            </span>
                            <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                              {agingData.AvgDaysToPay ?? "—"}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Loading…</p>
                  )}
                </div>
              </div>
            )}

            {/* Comments & Aging Tabs - always visible */}
            <div className="mt-6">
              <div className="mb-4 flex border-b border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab("comments")}
                    className={`px-4 py-2 text-sm font-medium ${
                      activeTab === "comments"
                        ? "border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Customer Comments
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("aging")}
                    className={`px-4 py-2 text-sm font-medium ${
                      activeTab === "aging"
                        ? "border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    Aging
                  </button>
                </div>
                {!customerNo && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Select a customer to view comments and aging
                    </p>
                  </div>
                )}
                {customerNo && activeTab === "comments" && (
                  <div>
                    <textarea
                      rows={12}
                      value={arComments}
                      onChange={(e) => setArComments(e.target.value)}
                      placeholder="Enter customer AR comments..."
                      className="w-full min-w-0 resize-none rounded-lg border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={saveComments}
                        disabled={commentsSaving}
                        className="gap-2"
                      >
                        {commentsSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Save Comments
                      </Button>
                    </div>
                  </div>
                )}
                {customerNo && activeTab === "aging" && (
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                    {agingLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      </div>
                    ) : agingData ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                          <span>Period</span>
                          <span>Amount</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            Current
                          </span>
                          <span className="font-medium">
                            {formatCurrency(agingData.Current)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            +30 Days
                          </span>
                          <span className="font-medium">
                            {formatCurrency(agingData.age_30_days)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            +60 Days
                          </span>
                          <span className="font-medium">
                            {formatCurrency(agingData.age_60_days)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            +90 Days
                          </span>
                          <span className="font-medium">
                            {formatCurrency(agingData.age_90_days)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            +120 Days
                          </span>
                          <span className="font-medium">
                            {formatCurrency(agingData.age_120_days)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
                          <span className="text-slate-700 dark:text-slate-300">
                            Total Outstanding
                          </span>
                          <span className="text-cyan-600 dark:text-cyan-400">
                            {formatCurrency(agingData.Balance)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-slate-500">
                        No aging data
                      </p>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Right: Results */}
          <div className="flex-1 min-w-0 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={facturaWithApplyTo}
                    onChange={(e) => setFacturaWithApplyTo(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Factura # w/Apply To
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showHistory}
                    onChange={(e) => setShowHistory(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    History
                  </span>
                </label>
              {showHistory && (
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
                  startLabel="Start"
                  endLabel="End"
                  inputClassName="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  >
                    <option value="applyTo">Apply To Inv #</option>
                    <option value="amount">Amount</option>
                    <option value="date">Date</option>
                    <option value="account">Account #</option>
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={runSearch}
                disabled={!hasFilters || loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 dark:border-slate-700">
                <History className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  Search AR records
                </h3>
                <p className="mt-1 max-w-md text-center text-sm text-slate-500">
                  Use at least one filter: customer, invoice #, PO #, or date
                  range. Click Search to run the query.
                </p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  No AR records found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try adjusting filters or enabling History.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Apply To #
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Check #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Entry Type
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                        title="GL account number from Chart of Accounts"
                      >
                        Account #
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800/50">
                    {arGroups.map((group) =>
                      group.rows.map((row, idx) => {
                        const woNo = row.ApplyToInvoiceNo ?? row.InvoiceNo;
                        const isFirst = idx === 0;
                        const showApplyTo =
                          facturaWithApplyTo ? isFirst : true;
                        return (
                          <tr
                            key={row.ID ?? `${group.key}-${idx}`}
                            onClick={() =>
                              woNo && router.push(`/work-orders/${woNo}`)
                            }
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 even:bg-cyan-50/30 dark:even:bg-cyan-900/10 ${
                              woNo ? "cursor-pointer" : ""
                            }`}
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                              {showApplyTo ? `#${group.key}` : ""}
                            </td>
                            <td
                              className={`whitespace-nowrap px-4 py-3 text-right text-sm ${
                                Number(row.Amount) === 0
                                  ? "text-slate-500 dark:text-slate-400"
                                  : Number(row.Amount) >= 0
                                    ? "font-medium text-slate-900 dark:text-white"
                                    : "font-medium text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {formatCurrency(row.Amount)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                              {row.InvoiceNo ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                              {row.CheckNo ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                              {row.EntryDate || row.EffectiveDate
                                ? toYMD(
                                    new Date(row.EntryDate || row.EffectiveDate)
                                  )
                                : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                              {row.EntryType ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                              {row.AccountNo ?? "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {arGroups.length > 0 && (
                      <tr className="bg-slate-50 font-semibold dark:bg-slate-800/80">
                        <td
                          colSpan={6}
                          className="whitespace-nowrap px-4 py-3 text-right text-slate-700 dark:text-slate-300"
                        >
                          Balance
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(totalBalance)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {hasSearched && results.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">{results.length}</span> of{" "}
                  <span className="font-medium">{results.length}</span> entries
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-2">
                    Apply Payment
                  </Button>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
