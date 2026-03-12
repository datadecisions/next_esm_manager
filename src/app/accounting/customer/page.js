"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  FileText,
  Users,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getCustomerInvoices,
  getOpenInvoicesByCustomer,
} from "@/lib/api/accounting";
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

function customerDisplay(c) {
  if (!c) return "";
  const name = c.Name ?? c.name ?? "";
  const num = c.Number ?? c.number ?? "";
  return [name, num ? `#${num}` : ""].filter(Boolean).join(" ") || "Customer";
}

/** Mock customer for demo */
const MOCK_CUSTOMER = {
  Name: "Acme Corporation",
  Number: "1001",
};

/** Mock AR detail for demo - matches API response shape */
const MOCK_INVOICES = [
  {
    ID: 1,
    CustomerNo: "1001",
    InvoiceNo: "3046847",
    ApplyToInvoiceNo: "3046847",
    EntryType: "Invoice",
    EntryDate: "2025-02-15T00:00:00.000Z",
    EffectiveDate: "2025-02-15T00:00:00.000Z",
    Amount: -1250.5,
    SalesTaxAmount: 0,
    Due: "2025-03-17T00:00:00.000Z",
  },
  {
    ID: 2,
    CustomerNo: "1001",
    InvoiceNo: "3046847",
    ApplyToInvoiceNo: "3046847",
    EntryType: "Payment",
    EntryDate: "2025-03-01T00:00:00.000Z",
    EffectiveDate: "2025-03-01T00:00:00.000Z",
    Amount: 500,
    SalesTaxAmount: 0,
    Due: "2025-03-17T00:00:00.000Z",
  },
  {
    ID: 3,
    CustomerNo: "1001",
    InvoiceNo: "3045123",
    ApplyToInvoiceNo: "3045123",
    EntryType: "Invoice",
    EntryDate: "2025-01-20T00:00:00.000Z",
    EffectiveDate: "2025-01-20T00:00:00.000Z",
    Amount: -875,
    SalesTaxAmount: 0,
    Due: "2025-02-19T00:00:00.000Z",
  },
  {
    ID: 4,
    CustomerNo: "1001",
    InvoiceNo: "3045123",
    ApplyToInvoiceNo: "3045123",
    EntryType: "Payment",
    EntryDate: "2025-02-10T00:00:00.000Z",
    EffectiveDate: "2025-02-10T00:00:00.000Z",
    Amount: 875,
    SalesTaxAmount: 0,
    Due: "2025-02-19T00:00:00.000Z",
  },
  {
    ID: 5,
    CustomerNo: "1001",
    InvoiceNo: "3042100",
    ApplyToInvoiceNo: "3042100",
    EntryType: "Invoice",
    EntryDate: "2024-12-10T00:00:00.000Z",
    EffectiveDate: "2024-12-10T00:00:00.000Z",
    Amount: -2100,
    SalesTaxAmount: 0,
    Due: "2025-01-09T00:00:00.000Z",
  },
];

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [dates, setDates] = useState(getDefaultDateRange);
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const customerNo = selectedCustomer?.Number ?? selectedCustomer?.number ?? "";

  const fetchInvoices = useCallback(async () => {
    if (!token || !customerNo) return;
    if (!debouncedDates.isValid) return;
    setLoading(true);
    try {
      const [detailData, openData] = await Promise.all([
        getCustomerInvoices(
          customerNo,
          debouncedDates.start,
          debouncedDates.end,
          token
        ),
        getOpenInvoicesByCustomer(customerNo, token),
      ]);
      setInvoices(detailData);
      setOpenInvoices(openData);
    } catch (err) {
      toast.error(err?.message || "Failed to load invoices");
      setInvoices([]);
      setOpenInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [token, customerNo, debouncedDates.start, debouncedDates.end, debouncedDates.isValid]);

  useEffect(() => {
    if (demoMode) return;
    if (customerNo && token) {
      fetchInvoices();
    } else {
      setInvoices([]);
      setOpenInvoices([]);
    }
  }, [customerNo, token, debouncedDates.start, debouncedDates.end, debouncedDates.isValid, fetchInvoices, demoMode]);

  const loadDemo = () => {
    setSelectedCustomer(MOCK_CUSTOMER);
    setInvoices(MOCK_INVOICES);
    setOpenInvoices([]);
    setDemoMode(true);
  };

  const clearDemo = () => {
    setSelectedCustomer(null);
    setInvoices([]);
    setOpenInvoices([]);
    setDemoMode(false);
  };

  const totalBalance = useMemo(
    () => invoices.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0),
    [invoices]
  );

  const openBalance = useMemo(
    () =>
      openInvoices.reduce((sum, row) => sum + (Number(row.Balance) || 0), 0),
    [openInvoices]
  );

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
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex items-center gap-3 mb-2">
            <Link href="/accounting">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Customer AR
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                View open invoices and AR activity (invoices, payments) for a customer.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-4 sm:p-6 mb-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Customer
              </label>
              <CustomerCombobox
                value={selectedCustomer}
                onValueChange={(v) => {
                  setSelectedCustomer(v ?? null);
                  if (!v) setDemoMode(false);
                }}
                placeholder="Search by name or number..."
                token={token}
                minChars={2}
              />
            </div>
            <div className="lg:col-span-4">
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
                startLabel="From"
                endLabel="To"
                inputClassName="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="lg:col-span-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInvoices}
                disabled={!customerNo || loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {!selectedCustomer ? (
          <motion.div
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-12 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
              Select customer to view AR
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Search for a customer by name or number. View open invoices and
              AR activity (invoices, payments) for the selected date range.
            </p>
            <Button variant="outline" onClick={loadDemo} className="mt-6 gap-2">
              View demo with sample data
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
          >
            {/* Customer summary card */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {customerDisplay(selectedCustomer)}
                    {demoMode && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    {customerNo} · {toYMD(dates.start)} – {toYMD(dates.end)}
                    {demoMode && (
                      <button
                        type="button"
                        onClick={clearDemo}
                        className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 underline"
                      >
                        Clear demo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="ml-auto flex gap-6">
                {!demoMode && openInvoices.length > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Open balance
                    </div>
                    <div
                      className={`font-semibold ${
                        openBalance >= 0
                          ? "text-slate-900 dark:text-white"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatCurrency(openBalance)}
                    </div>
                  </div>
                )}
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Period net
                  </div>
                  <div
                    className={`font-semibold ${
                      totalBalance >= 0
                        ? "text-slate-900 dark:text-white"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(totalBalance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Open Invoices - always shown when we have them (not date-filtered) */}
            {!demoMode && openInvoices.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    Open Invoices ({openInvoices.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Invoices with balance due (not filtered by date range)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Ship To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Closed
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Due
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {openInvoices.map((row, i) => {
                        const woNo = row.WONo ?? row.ApplyToInvoiceNo;
                        return (
                        <tr
                          key={row.WONo ?? i}
                          onClick={() => woNo && router.push(`/work-orders/${woNo}`)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${woNo ? "cursor-pointer" : ""}`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            <span className={woNo ? "text-cyan-600 hover:underline dark:text-cyan-400" : ""}>
                              {row.WONo ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {row.ShipName ?? row.PONo ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {row.ClosedDate
                              ? toYMD(new Date(row.ClosedDate))
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {row.DueDate
                              ? toYMD(new Date(row.DueDate))
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {formatCurrency(row.Balance)}
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AR Activity table - filtered by date range */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-white">
                  AR Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Invoices and payments in selected date range
                </p>
              </div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <h3 className="mt-4 font-medium text-slate-700 dark:text-slate-300">
                    No AR activity in date range
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                    No invoices or payments in {toYMD(dates.start)} – {toYMD(dates.end)}.
                    {openInvoices.length > 0
                      ? " Widen the date range to see older activity. Open invoices are shown above."
                      : " Widen the date range to see more history."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Due
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {invoices.map((row, i) => {
                        const woNo = row.ApplyToInvoiceNo ?? row.InvoiceNo;
                        return (
                        <tr
                          key={row.ID ?? i}
                          onClick={() => woNo && router.push(`/work-orders/${woNo}`)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${woNo ? "cursor-pointer" : ""}`}
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {row.EntryDate || row.EffectiveDate
                              ? toYMD(
                                  new Date(row.EntryDate || row.EffectiveDate)
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {row.EntryType ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            <span className={woNo ? "text-cyan-600 hover:underline dark:text-cyan-400" : ""}>
                              {row.InvoiceNo ?? row.ApplyToInvoiceNo ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {row.Due
                              ? toYMD(new Date(row.Due))
                              : "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
                              Number(row.Amount) >= 0
                                ? "text-slate-900 dark:text-white"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatCurrency(row.Amount)}
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
