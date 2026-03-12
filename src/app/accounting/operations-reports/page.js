"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Download,
  FileText,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getAgingSummary,
  getDailySalesReport,
} from "@/lib/api/accounting";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateInput } from "@/components/DateRangeInput";
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

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthYearLabel(month, year) {
  return `${MONTH_ABBR[(month || 1) - 1]}-${year}`;
}

export default function OperationsReportsPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [activeTab, setActiveTab] = useState("wip");
  const [wipData, setWipData] = useState([]);
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dailyDate, setDailyDate] = useState(() => {
    const d = new Date();
    return toYMD(d);
  });
  const [debouncedDaily, setDebouncedDaily] = useState({
    date: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((date, isValid) => {
    setDebouncedDaily({ date, isValid });
  }, []);

  const loadWip = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAgingSummary(token);
      setWipData(data || []);
    } catch (err) {
      toast.error(err?.message || "Failed to load WIP summary");
      setWipData([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadDaily = useCallback(async () => {
    if (!token || !debouncedDaily.isValid || !debouncedDaily.date) return;
    const [y, m, d] = debouncedDaily.date.split("-").map(Number);
    setLoading(true);
    try {
      const report = await getDailySalesReport(m, d, y, token);
      setDailyReport(report);
    } catch (err) {
      toast.error(err?.message || "Failed to load daily sales");
      setDailyReport(null);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedDaily.date, debouncedDaily.isValid]);

  useEffect(() => {
    if (activeTab === "wip") loadWip();
  }, [activeTab, loadWip]);

  useEffect(() => {
    if (activeTab === "daily" && debouncedDaily.isValid) loadDaily();
  }, [activeTab, debouncedDaily.isValid, loadDaily]);

  const customers = wipData.filter((r) => r.CustomerSale === -1);
  const internal = wipData.filter((r) => r.CustomerSale === 0);

  const groupData = (data) => {
    return data.reduce((acc, item) => {
      const key = item.Name || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  const calcSum = (group, prop) =>
    group.reduce((s, r) => s + (Number(r[prop]) || 0), 0);

  const totalCustomers = {
    Overdue_0_14: calcSum(customers, "Overdue_0_14"),
    Overdue_15_30: calcSum(customers, "Overdue_15_30"),
    Overdue_31_Plus: calcSum(customers, "Overdue_31_Plus"),
    GrandTotal: calcSum(customers, "GrandTotal"),
  };
  const totalInternal = {
    Overdue_0_14: calcSum(internal, "Overdue_0_14"),
    Overdue_15_30: calcSum(internal, "Overdue_15_30"),
    Overdue_31_Plus: calcSum(internal, "Overdue_31_Plus"),
    GrandTotal: calcSum(internal, "GrandTotal"),
  };

  const groupedCustomers = groupData(customers);
  const groupedInternal = groupData(internal);

  const exportWipCsv = () => {
    const rows = [
      ["Name", "Title", "0-14", "15-30", "31+", "Grand Total"],
      ["Customer", "", totalCustomers.Overdue_0_14, totalCustomers.Overdue_15_30, totalCustomers.Overdue_31_Plus, totalCustomers.GrandTotal],
      ...Object.entries(groupedCustomers).flatMap(([key, group]) => {
        const sum = {
          Overdue_0_14: calcSum(group, "Overdue_0_14"),
          Overdue_15_30: calcSum(group, "Overdue_15_30"),
          Overdue_31_Plus: calcSum(group, "Overdue_31_Plus"),
          GrandTotal: calcSum(group, "GrandTotal"),
        };
        return [
          [key, "", sum.Overdue_0_14, sum.Overdue_15_30, sum.Overdue_31_Plus, sum.GrandTotal],
          ...group.map((r) => [r.Title || "", "", r.Overdue_0_14 || 0, r.Overdue_15_30 || 0, r.Overdue_31_Plus || 0, r.GrandTotal || 0]),
        ];
      }),
      ["Internal", "", totalInternal.Overdue_0_14, totalInternal.Overdue_15_30, totalInternal.Overdue_31_Plus, totalInternal.GrandTotal],
      ...Object.entries(groupedInternal).flatMap(([key, group]) => {
        const sum = {
          Overdue_0_14: calcSum(group, "Overdue_0_14"),
          Overdue_15_30: calcSum(group, "Overdue_15_30"),
          Overdue_31_Plus: calcSum(group, "Overdue_31_Plus"),
          GrandTotal: calcSum(group, "GrandTotal"),
        };
        return [
          [key, "", sum.Overdue_0_14, sum.Overdue_15_30, sum.Overdue_31_Plus, sum.GrandTotal],
          ...group.map((r) => [r.Title || "", "", r.Overdue_0_14 || 0, r.Overdue_15_30 || 0, r.Overdue_31_Plus || 0, r.GrandTotal || 0]),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((x) => (String(x).includes(",") ? `"${x}"` : x)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wip-summary-${toYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const exportDailyCsv = () => {
    if (!dailyReport?.salesData?.length) return;
    const cols = ["dailyGoal", "monthlyGoal", "department", "dailySales", "mtdSales", "mtdGoal", "mtdDifference"];
    const header = ["Daily Goal", "Monthly Goal", "Department", "Daily Sales", "MTD Sales", "MTD Goal", "MTD Difference"].join(",");
    const rows = dailyReport.salesData.map((r) =>
      cols.map((c) => {
        const v = c === "department" ? `${r.department || ""} (${r.Branch ?? ""})` : r[c];
        return v == null ? "" : String(v).includes(",") ? `"${v}"` : v;
      }).join(",")
    );
    const tot = dailyReport.totals;
    const totalRow = [tot.dailyGoal, tot.monthlyGoal, "Total All", tot.dailySales, tot.mtdSales, tot.mtdGoal, tot.mtdDifference].join(",");
    const csv = [header, ...rows, totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-sales-${dailyDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

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
                WIP & Daily Reports
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                WIP summary and daily sales reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={activeTab === "wip" ? exportWipCsv : exportDailyCsv}
              disabled={loading || (activeTab === "wip" ? !wipData.length : !dailyReport?.salesData?.length)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-slate-200/80 bg-white shadow-md dark:border-slate-700/50 dark:bg-slate-800/50"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0 dark:border-slate-700">
              <TabsTrigger
                value="wip"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent"
              >
                <FileText className="mr-2 h-4 w-4" />
                WIP Summary
              </TabsTrigger>
              <TabsTrigger
                value="daily"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Daily Sales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wip" className="m-0 p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">WIP Summary</h3>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                        <th className="px-4 py-2 text-left font-semibold">Name</th>
                        <th className="px-4 py-2 text-right font-semibold">0-14</th>
                        <th className="px-4 py-2 text-right font-semibold">15-30</th>
                        <th className="px-4 py-2 text-right font-semibold">31+</th>
                        <th className="px-4 py-2 text-right font-semibold">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 bg-emerald-50/50 font-semibold dark:border-slate-700 dark:bg-emerald-900/20">
                        <td className="px-4 py-2">Customer</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalCustomers.Overdue_0_14)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalCustomers.Overdue_15_30)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalCustomers.Overdue_31_Plus)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalCustomers.GrandTotal)}</td>
                      </tr>
                      {Object.entries(groupedCustomers).flatMap(([key, group]) => [
                        <tr key={`cust-h-${key}`} className="border-b border-slate-100 bg-cyan-50/30 font-medium dark:border-slate-700 dark:bg-cyan-900/10">
                          <td className="px-4 py-2">{key}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "Overdue_0_14"))}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "Overdue_15_30"))}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "Overdue_31_Plus"))}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "GrandTotal"))}</td>
                        </tr>,
                        ...group.map((r, i) => (
                          <tr key={`cust-${key}-${i}`} className="border-b border-slate-50 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                            <td className="px-4 py-1.5 pl-8 italic">{r.Title || "N/A"}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.Overdue_0_14)}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.Overdue_15_30)}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.Overdue_31_Plus)}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.GrandTotal)}</td>
                          </tr>
                        )),
                      ])}
                      <tr className="border-b border-slate-100 bg-emerald-50/50 font-semibold dark:border-slate-700 dark:bg-emerald-900/20">
                        <td className="px-4 py-2">Internal</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalInternal.Overdue_0_14)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalInternal.Overdue_15_30)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalInternal.Overdue_31_Plus)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(totalInternal.GrandTotal)}</td>
                      </tr>
                      {Object.entries(groupedInternal).flatMap(([key, group]) => [
                        <tr key={`int-h-${key}`} className="border-b border-slate-100 bg-cyan-50/30 font-medium dark:border-slate-700 dark:bg-cyan-900/10">
                          <td className="px-4 py-2">{key}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "Overdue_0_14"))}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "Overdue_15_30"))}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "Overdue_31_Plus"))}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(calcSum(group, "GrandTotal"))}</td>
                        </tr>,
                        ...group.map((r, i) => (
                          <tr key={`int-${key}-${i}`} className="border-b border-slate-50 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                            <td className="px-4 py-1.5 pl-8 italic">{r.Title || "N/A"}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.Overdue_0_14)}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.Overdue_15_30)}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.Overdue_31_Plus)}</td>
                            <td className="px-4 py-1.5 text-right">{formatCurrency(r.GrandTotal)}</td>
                          </tr>
                        )),
                      ])}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="daily" className="m-0 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <DateInput
                  date={dailyDate}
                  onDateChange={(val) => setDailyDate(val || "")}
                  onDebouncedChange={handleDebouncedChange}
                  label="Date"
                  inputClassName="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Daily Sales Report</h3>
                  {dailyReport && (
                    <>
                      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-4">
                        <div>
                          <span className="text-slate-500">Month/Year</span>
                          <p className="font-medium">{monthYearLabel(dailyReport.month, dailyReport.year)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Billing Day</span>
                          <p className="font-medium">{dailyReport.billingData?.currentBillingDay ?? "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Billing Days Month</span>
                          <p className="font-medium">{dailyReport.billingData?.totalBillingDays ?? "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Reporting As Of</span>
                          <p className="font-medium">
                            {dailyReport.month}/{dailyReport.day}/{String(dailyReport.year).slice(-2)}
                          </p>
                        </div>
                      </div>
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                            <th className="px-4 py-2 text-right font-semibold">Daily Goal</th>
                            <th className="px-4 py-2 text-right font-semibold">Monthly Goal</th>
                            <th className="px-4 py-2 text-left font-semibold">Department</th>
                            <th className="px-4 py-2 text-right font-semibold">Daily Sales</th>
                            <th className="px-4 py-2 text-right font-semibold">MTD Sales</th>
                            <th className="px-4 py-2 text-right font-semibold">MTD Goal</th>
                            <th className="px-4 py-2 text-right font-semibold">MTD Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dailyReport.salesData || []).map((r, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-4 py-2 text-right">{formatCurrency(r.dailyGoal)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(r.monthlyGoal)}</td>
                              <td className="px-4 py-2">
                                {r.department || ""} ({r.Branch ?? ""})
                              </td>
                              <td className="px-4 py-2 text-right">{formatCurrency(r.dailySales)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(r.mtdSales)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(r.mtdGoal)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(r.mtdDifference)}</td>
                            </tr>
                          ))}
                          {dailyReport.totals && (
                            <tr className="border-t-2 border-slate-300 bg-emerald-50/50 font-semibold dark:border-slate-600 dark:bg-emerald-900/20">
                              <td className="px-4 py-2 text-right">{formatCurrency(dailyReport.totals.dailyGoal)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(dailyReport.totals.monthlyGoal)}</td>
                              <td className="px-4 py-2">Total All</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(dailyReport.totals.dailySales)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(dailyReport.totals.mtdSales)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(dailyReport.totals.mtdGoal)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(dailyReport.totals.mtdDifference)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </>
                  )}
                  {(!dailyReport || !dailyReport.salesData?.length) && !loading && (
                    <p className="py-8 text-center text-slate-500">No data for this date</p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}
