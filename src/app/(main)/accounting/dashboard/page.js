"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSales, getExpenses, getOverdue } from "@/lib/api/accounting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from "recharts";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  start.setMonth(start.getMonth());
  start.setDate(1);
  return { start, end };
}

function formatCurrency(val) {
  if (val == null || val === "" || Number.isNaN(Number(val))) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function KpiStatCard({ title, value, description, icon: Icon, variant }) {
  const isPositive = variant === "positive";
  const isNegative = variant === "negative";
  return (
    <Card className="rounded-xl border-slate-200/80 dark:border-slate-700/50 bg-gradient-to-br from-slate-50 to-cyan-50/30 dark:from-slate-900 dark:to-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isNegative
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-white"
              }`}
            >
              {value}
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div
              className={`rounded-lg p-2 ${
                isPositive
                  ? "bg-emerald-500/10"
                  : isNegative
                    ? "bg-rose-500/10"
                    : "bg-cyan-500/10"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isNegative
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-cyan-600 dark:text-cyan-400"
                }`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountingDashboardPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [dates, setDates] = useState(getDefaultDateRange);
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [overdue, setOverdue] = useState([]);

  const branches = branchDeptFilter?.branches ?? [];
  const selectedBranchNumbers = useMemo(
    () => branches.map((b) => b.Number ?? b).filter(Boolean),
    [branches]
  );
  const selectedDepts = useMemo(
    () =>
      (branchDeptFilter?.depts ?? []).flatMap((d) =>
        Array.isArray(d) ? d : [d]
      ),
    [branchDeptFilter]
  );

  const filterByBranchDept = useCallback(
    (rows) => {
      if (!rows?.length) return [];
      const allBranches = selectedBranchNumbers.length === 0;
      const hasDeptFilter = selectedDepts.length > 0;
      return rows.filter((r) => {
        if (allBranches) return true;
        const branchMatch = selectedBranchNumbers.includes(r.SaleBranch);
        if (!branchMatch) return false;
        if (!hasDeptFilter) return true;
        return selectedDepts.some(
          (d) => (typeof d === "object" ? d?.Dept : d) === r.SaleDept
        );
      });
    },
    [selectedBranchNumbers, selectedDepts]
  );

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [salesRes, expensesRes, overdueRes] = await Promise.all([
        getSales(token),
        getExpenses(token),
        getOverdue(token),
      ]);
      setSales(salesRes ?? []);
      setExpenses(expensesRes ?? []);
      setOverdue(overdueRes ?? []);
    } catch (err) {
      toast.error(err?.message || "Failed to load accounting data");
      setSales([]);
      setExpenses([]);
      setOverdue([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSales = useMemo(
    () => filterByBranchDept(sales),
    [sales, filterByBranchDept]
  );
  const filteredExpenses = useMemo(
    () => filterByBranchDept(expenses),
    [expenses, filterByBranchDept]
  );

  const chartData = useMemo(() => {
    const startYear = dates.start.getFullYear();
    const startMonth = dates.start.getMonth();
    const endYear = dates.end.getFullYear();
    const endMonth = dates.end.getMonth();

    const byKey = {};
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        if (y === startYear && m < startMonth) continue;
        if (y === endYear && m > endMonth) continue;
        const key = `${y}-${String(m + 1).padStart(2, "0")}`;
        byKey[key] = {
          key,
          label: `${MONTH_NAMES[m]} ${y}`,
          month: m + 1,
          year: y,
          sales: 0,
          expenses: 0,
        };
      }
    }

    filteredSales.forEach((r) => {
      const k = `${r.SalesYear}-${String(r.SalesMonth).padStart(2, "0")}`;
      if (byKey[k]) {
        byKey[k].sales += Number(r.Net) ?? 0;
      }
    });
    filteredExpenses.forEach((r) => {
      const k = `${r.SalesYear}-${String(r.SalesMonth).padStart(2, "0")}`;
      if (byKey[k]) {
        byKey[k].expenses += Math.abs(Number(r.Net) ?? 0);
      }
    });

    return Object.values(byKey).sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
  }, [filteredSales, filteredExpenses, dates.start, dates.end]);

  const salesTotal = useMemo(
    () => chartData.reduce((s, d) => s + d.sales, 0),
    [chartData]
  );
  const expensesTotal = useMemo(
    () => chartData.reduce((s, d) => s + d.expenses, 0),
    [chartData]
  );
  const overdueTotal = useMemo(
    () => overdue.reduce((s, r) => s + Math.abs(Number(r.Balance) ?? 0), 0),
    [overdue]
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
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/accounting">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                Summary Charts
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Sales, expenses, and overdue AR overview.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:items-end">
            {token && (
              <BranchDeptFilter
                value={branchDeptFilter}
                onChange={setBranchDeptFilter}
                token={token}
              />
            )}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={toYMD(dates.start)}
                onChange={(e) =>
                  setDates((d) => ({
                    ...d,
                    start: e.target.value ? new Date(e.target.value) : d.start,
                  }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={toYMD(dates.end)}
                onChange={(e) =>
                  setDates((d) => ({
                    ...d,
                    end: e.target.value ? new Date(e.target.value) : d.end,
                  }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiStatCard
                title="Sales (Gross)"
                value={formatCurrency(salesTotal)}
                description="Date range total"
                icon={TrendingUp}
                variant="positive"
              />
              <KpiStatCard
                title="Expenses"
                value={formatCurrency(expensesTotal)}
                description="Date range total"
                icon={TrendingDown}
              />
              <KpiStatCard
                title="Net"
                value={formatCurrency(salesTotal - expensesTotal)}
                description="Sales minus expenses"
                icon={BarChart3}
                variant={
                  salesTotal - expensesTotal >= 0 ? "positive" : "negative"
                }
              />
              <KpiStatCard
                title="Overdue AR"
                value={formatCurrency(overdueTotal)}
                description={`${overdue.length} invoice(s) 30+ days past due`}
                icon={AlertCircle}
                variant="negative"
              />
            </div>

            {/* Sales vs Expenses Chart */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-500" />
                  Sales & Expenses Overview
                </CardTitle>
                <CardDescription>
                  Monthly sales (gross) and expenses for selected date range
                  {branches.length > 0 && " and branches"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    sales: { label: "Sales", color: "var(--chart-1)" },
                    expenses: { label: "Expenses", color: "var(--chart-2)" },
                  }}
                  className="h-[320px] w-full"
                >
                  <ComposedChart
                    data={chartData}
                    margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        v >= 1000 ? `${v / 1000}k` : String(v)
                      }
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(v) => formatCurrency(v)}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.label ?? ""
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="sales"
                      fill="var(--chart-1)"
                      radius={4}
                      name="Sales"
                    />
                    <Bar
                      dataKey="expenses"
                      fill="var(--chart-2)"
                      radius={4}
                      name="Expenses"
                    />
                  </ComposedChart>
                </ChartContainer>
                {chartData.length === 0 && (
                  <p className="text-center py-8 text-sm text-muted-foreground">
                    No sales or expenses data in date range
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Sales & Expenses Line Charts (side by side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Sales (Gross)
                  </CardTitle>
                  <CardDescription>
                    Monthly sales by period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      sales: { label: "Sales", color: "var(--chart-1)" },
                    }}
                    className="h-[240px] w-full"
                  >
                    <LineChart
                      data={chartData}
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          v >= 1000 ? `${v / 1000}k` : String(v)
                        }
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatCurrency(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-rose-500" />
                    Expenses
                  </CardTitle>
                  <CardDescription>
                    Monthly expenses by period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      expenses: { label: "Expenses", color: "var(--chart-2)" },
                    }}
                    className="h-[240px] w-full"
                  >
                    <LineChart
                      data={chartData}
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          v >= 1000 ? `${v / 1000}k` : String(v)
                        }
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatCurrency(v)}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Customer Overdue Balance Table */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                  Customer Overdue Balance
                </CardTitle>
                <CardDescription>
                  Invoices 30+ days past due. Total: {formatCurrency(overdueTotal)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdue.map((r, i) => (
                        <TableRow key={`ov-${r.InvoiceNo}-${i}`}>
                          <TableCell className="font-medium">
                            {r.CustomerName ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400">
                            {formatCurrency(r.Balance)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {r.InvoiceNo ?? "—"}
                          </TableCell>
                          <TableCell>
                            {r.InvoiceDate
                              ? new Date(r.InvoiceDate).toLocaleDateString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {overdue.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No overdue invoices
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </motion.div>
  );
}
