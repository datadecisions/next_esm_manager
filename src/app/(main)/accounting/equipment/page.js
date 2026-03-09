"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  List,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getEquipmentLedger } from "@/lib/api/accounting";
import { EquipmentCombobox } from "@/components/EquipmentCombobox";
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

/** Mock equipment for demo */
const MOCK_EQUIPMENT = {
  SerialNo: "DEMO-12345",
  UnitNo: "UNIT-101",
  Make: "Toyota",
  Model: "8FGU25",
  ControlNo: "DEMO-12345",
};

/** Mock ledger data for demo - matches API response shape */
const MOCK_LEDGER = [
  {
    EffectiveDate: "2025-02-15T00:00:00.000Z",
    Journal: "INVOICE 3046847",
    AccountNo: "41000",
    Description: "Acme Corp",
    CombinedDescription: "Acme Corp DEMO-12345",
    InvoiceNo: "3046847",
    Amount: 1250.50,
  },
  {
    EffectiveDate: "2025-02-15T00:00:00.000Z",
    Journal: "INVOICE 3046847",
    AccountNo: "1100001",
    Description: "Acme Corp",
    CombinedDescription: "Acme Corp DEMO-12345",
    InvoiceNo: "3046847",
    Amount: -1250.50,
  },
  {
    EffectiveDate: "2025-01-20T00:00:00.000Z",
    Journal: "INVOICE 3045123",
    AccountNo: "41000",
    Description: "Acme Corp",
    CombinedDescription: "Acme Corp DEMO-12345",
    InvoiceNo: "3045123",
    Amount: 875.00,
  },
  {
    EffectiveDate: "2025-01-20T00:00:00.000Z",
    Journal: "INVOICE 3045123",
    AccountNo: "1100001",
    Description: "Acme Corp",
    CombinedDescription: "Acme Corp DEMO-12345",
    InvoiceNo: "3045123",
    Amount: -875.00,
  },
  {
    EffectiveDate: "2024-12-10T00:00:00.000Z",
    Journal: "INVOICE 3042100",
    AccountNo: "41000",
    Description: "Beta Industries",
    CombinedDescription: "Beta Industries DEMO-12345",
    InvoiceNo: "3042100",
    Amount: 2100.00,
  },
  {
    EffectiveDate: "2024-12-10T00:00:00.000Z",
    Journal: "INVOICE 3042100",
    AccountNo: "1100001",
    Description: "Beta Industries",
    CombinedDescription: "Beta Industries DEMO-12345",
    InvoiceNo: "3042100",
    Amount: -2100.00,
  },
  {
    EffectiveDate: "2024-11-05T00:00:00.000Z",
    Journal: "INVOICE 3038901",
    AccountNo: "41000",
    Description: "Gamma LLC",
    CombinedDescription: "Gamma LLC DEMO-12345",
    InvoiceNo: "3038901",
    Amount: 450.00,
  },
  {
    EffectiveDate: "2024-11-05T00:00:00.000Z",
    Journal: "INVOICE 3038901",
    AccountNo: "1100001",
    Description: "Gamma LLC",
    CombinedDescription: "Gamma LLC DEMO-12345",
    InvoiceNo: "3038901",
    Amount: -450.00,
  },
  {
    EffectiveDate: "2025-03-01T00:00:00.000Z",
    Journal: "CC20250301",
    AccountNo: "1100005",
    Description: "Payment received",
    CombinedDescription: "Payment received DEMO-12345",
    InvoiceNo: "3046847",
    Amount: 500.00,
  },
  {
    EffectiveDate: "2025-03-01T00:00:00.000Z",
    Journal: "CC20250301",
    AccountNo: "1100001",
    Description: "Payment applied",
    CombinedDescription: "Payment applied DEMO-12345",
    InvoiceNo: "3046847",
    Amount: -500.00,
  },
];

function eqDisplay(eq) {
  if (!eq) return "";
  const s = eq.SerialNo ?? eq.serialNo ?? "";
  const u = eq.UnitNo ?? eq.unitNo ?? "";
  const m = eq.Make ?? eq.make ?? "";
  const mod = eq.Model ?? eq.model ?? "";
  return [s, u, m, mod].filter(Boolean).join(" · ") || "Equipment";
}

export default function EquipmentLedgerPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [dates, setDates] = useState(getDefaultDateRange);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const loadDemo = () => {
    setSelectedEquipment(MOCK_EQUIPMENT);
    setLedger(MOCK_LEDGER);
    setDemoMode(true);
  };

  const clearDemo = () => {
    setSelectedEquipment(null);
    setLedger([]);
    setDemoMode(false);
  };

  const controlNo = selectedEquipment?.ControlNo ?? selectedEquipment?.controlNo ?? selectedEquipment?.SerialNo ?? selectedEquipment?.serialNo ?? "";

  const fetchLedger = useCallback(async () => {
    if (!token || !controlNo) return;
    setLoading(true);
    try {
      const data = await getEquipmentLedger(
        controlNo,
        toYMD(dates.start),
        toYMD(dates.end),
        token
      );
      setLedger(data);
    } catch (err) {
      toast.error(err?.message || "Failed to load ledger");
      setLedger([]);
    } finally {
      setLoading(false);
    }
  }, [token, controlNo, dates.start, dates.end]);

  useEffect(() => {
    if (demoMode) return; // Use mock data, don't fetch
    if (controlNo && token) {
      fetchLedger();
    } else {
      setLedger([]);
    }
  }, [controlNo, token, dates.start, dates.end, fetchLedger, demoMode]);

  const totalAmount = useMemo(
    () => ledger.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0),
    [ledger]
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
                Equipment Ledger
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                View GL entries for equipment by serial, unit, make, or model.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filter bar - inline search + date range */}
        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-4 sm:p-6 mb-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Equipment
              </label>
              <EquipmentCombobox
                value={selectedEquipment ? [selectedEquipment] : []}
                onValueChange={(v) => {
                  const eq = Array.isArray(v) && v.length ? v[0] : null;
                  setSelectedEquipment(eq);
                  if (!eq) setDemoMode(false);
                }}
                placeholder="Search by serial, unit, make, or model..."
                token={token}
                forceEnabled
                minChars={2}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                From
              </label>
              <input
                type="date"
                value={toYMD(dates.start)}
                onChange={(e) =>
                  setDates((d) => ({
                    ...d,
                    start: e.target.value ? new Date(e.target.value) : d.start,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                To
              </label>
              <input
                type="date"
                value={toYMD(dates.end)}
                onChange={(e) =>
                  setDates((d) => ({
                    ...d,
                    end: e.target.value ? new Date(e.target.value) : d.end,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="lg:col-span-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLedger}
                disabled={!controlNo || loading}
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
        {!selectedEquipment ? (
          <motion.div
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-12 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
              Select equipment to view ledger
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Search for equipment by serial number, unit number, make, or model.
              The ledger will show all GL entries linked to that equipment for the
              selected date range.
            </p>
            <Button
              variant="outline"
              onClick={loadDemo}
              className="mt-6 gap-2"
            >
              View demo with sample data
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
          >
            {/* Equipment summary card */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {eqDisplay(selectedEquipment)}
                    {demoMode && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    {selectedEquipment?.ControlNo ?? selectedEquipment?.SerialNo}{" "}
                    · {toYMD(dates.start)} – {toYMD(dates.end)}
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
              <div className="ml-auto text-right">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Net total
                </div>
                <div
                  className={`font-semibold ${
                    totalAmount >= 0
                      ? "text-slate-900 dark:text-white"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>

            {/* Ledger table */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                </div>
              ) : ledger.length === 0 ? (
                <div className="p-12 text-center">
                  <List className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <h3 className="mt-4 font-medium text-slate-700 dark:text-slate-300">
                    No ledger entries found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    No GL entries for this equipment in the selected date range.
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
                          Journal
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {ledger.map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {row.EffectiveDate
                              ? toYMD(new Date(row.EffectiveDate))
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {row.Journal ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {row.AccountNo ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                            {row.Description ?? row.CombinedDescription ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {row.InvoiceNo ?? "—"}
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
                      ))}
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
