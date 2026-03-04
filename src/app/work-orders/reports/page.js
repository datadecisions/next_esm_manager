"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  FileText,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { useAuth } from "@/lib/auth";
import {
  getPendingInvoicesSearch,
  getOpenClosedSummary,
} from "@/lib/api/accounting";
import { getLaborClosedReport, getLaborTotalReport } from "@/lib/api/labor";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { toast } from "sonner";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return { start, end };
}

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function getMonthLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("default", { month: "short" }) + " " + year;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function ReportsPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [dates, setDates] = useState(getDefaultDateRange);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [openClosed, setOpenClosed] = useState([]);
  const [closedReport, setClosedReport] = useState([]);
  const [laborReport, setLaborReport] = useState([]);

  const fetchData = useCallback(() => {
    if (!token) return;
    const startStr = toYMD(dates.start);
    const endStr = toYMD(dates.end);
    if (!startStr || !endStr) return;
    setLoading(true);
    Promise.all([
      getPendingInvoicesSearch(dates.start, dates.end),
      getOpenClosedSummary(startStr, endStr),
      getLaborClosedReport(startStr, endStr),
      getLaborTotalReport(startStr, endStr),
    ])
      .then(([inv, oc, cr, lr]) => {
        setInvoices(inv);
        setOpenClosed(oc);
        setClosedReport(cr);
        setLaborReport(lr);
      })
      .catch((err) => {
        toast.error(err?.message || "Failed to load reports");
        setInvoices([]);
        setOpenClosed([]);
        setClosedReport([]);
        setLaborReport([]);
      })
      .finally(() => setLoading(false));
  }, [token, dates.start, dates.end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const revenueByMonth = useMemo(() => {
    const buckets = {};
    invoices.forEach((inv) => {
      const d = inv.InvoiceDate ? new Date(inv.InvoiceDate) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = (buckets[key] || 0) + (Number(inv.GrandTotal) || 0);
    });
    return Object.entries(buckets)
      .map(([k, v]) => {
        const [y, m] = k.split("-").map(Number);
        return { month: getMonthLabel(y, m), revenue: v, fill: "var(--chart-1)" };
      })
      .sort((a, b) => {
        const [ay, am] = a.month.split(" ");
        const [by, bm] = b.month.split(" ");
        const amap = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
        if (ay !== by) return Number(ay) - Number(by);
        return (amap[am] || 0) - (amap[bm] || 0);
      });
  }, [invoices]);

  const closedByMonth = useMemo(() => {
    return closedReport
      .map((r) => ({
        month: getMonthLabel(r.Year, r.Month),
        closed: r.TotalClosed ?? 0,
        fill: "var(--chart-2)",
      }))
      .reverse();
  }, [closedReport]);

  const laborByMonth = useMemo(() => {
    const byMonth = {};
    laborReport.forEach((r) => {
      const key = getMonthLabel(r.Year, r.Month);
      byMonth[key] = (byMonth[key] || 0) + (Number(r.Billed) || 0);
    });
    return Object.entries(byMonth)
      .map(([month, hours]) => ({ month, hours, fill: "var(--chart-3)" }))
      .sort((a, b) => {
        const amap = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
        const [ay, am] = a.month.split(" ");
        const [by, bm] = b.month.split(" ");
        if (ay !== by) return Number(ay) - Number(by);
        return (amap[am] || 0) - (amap[bm] || 0);
      });
  }, [laborReport]);

  const deptData = useMemo(() => {
    return openClosed.map((r, i) => ({
      name: r.SaleDept || "Other",
      open: r.open_count ?? 0,
      closed: r.closed_count ?? 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [openClosed]);

  const revenueByDept = useMemo(() => {
    const buckets = {};
    invoices.forEach((inv) => {
      const dept = inv.SaleDept || inv.SaleBranch || "Other";
      buckets[dept] = (buckets[dept] || 0) + (Number(inv.GrandTotal) || 0);
    });
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name], i) => ({
        name: String(name),
        value: buckets[name],
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [invoices]);

  const kpis = useMemo(() => {
    const totalRevenue = invoices.reduce((s, i) => s + (Number(i.GrandTotal) || 0), 0);
    const totalOpen = openClosed.reduce((s, r) => s + (r.open_count ?? 0), 0);
    const totalClosed = openClosed.reduce((s, r) => s + (r.closed_count ?? 0), 0);
    const totalLaborHours = laborReport.reduce((s, r) => s + (Number(r.Billed) || 0), 0);
    return {
      invoices: invoices.length,
      revenue: totalRevenue,
      open: totalOpen,
      closed: totalClosed,
      laborHours: totalLaborHours,
    };
  }, [invoices, openClosed, laborReport]);

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/work-orders">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Reports Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Interactive charts and KPIs for work orders, revenue, and labor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                  setDates((d) => ({ ...d, start: e.target.value ? new Date(e.target.value) : d.start }))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={toYMD(dates.end)}
                onChange={(e) =>
                  setDates((d) => ({ ...d, end: e.target.value ? new Date(e.target.value) : d.end }))
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
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <KpiCard
                title="Invoices"
                value={kpis.invoices}
                icon={FileText}
                description="In date range"
              />
              <KpiCard
                title="Revenue"
                value={formatCurrency(kpis.revenue)}
                icon={TrendingUp}
                description="Total invoiced"
              />
              <KpiCard
                title="Open WOs"
                value={kpis.open}
                icon={BarChart3}
                description="Work orders opened"
              />
              <KpiCard
                title="Closed WOs"
                value={kpis.closed}
                icon={FileText}
                description="Work orders closed"
              />
              <KpiCard
                title="Labor Hours"
                value={kpis.laborHours.toFixed(1)}
                icon={Wrench}
                description="Billed hours"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-500" />
                    Revenue by Month
                  </CardTitle>
                  <CardDescription>
                    Total invoiced amount by invoice date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ revenue: { label: "Revenue", color: "var(--chart-1)" } }}
                    className="h-[280px] w-full"
                  >
                    <BarChart data={revenueByMonth} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCurrency(v)}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatCurrency(v)}
                            nameKey="month"
                          />
                        }
                      />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                  {revenueByMonth.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No invoice data in date range
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-500" />
                    Work Orders Closed by Month
                  </CardTitle>
                  <CardDescription>
                    Count of closed work orders per month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ closed: { label: "Closed", color: "var(--chart-2)" } }}
                    className="h-[280px] w-full"
                  >
                    <BarChart data={closedByMonth} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickLine={false} axisLine={false} width={50} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => String(v)}
                            nameKey="month"
                          />
                        }
                      />
                      <Bar dataKey="closed" fill="var(--color-closed)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                  {closedByMonth.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No closed orders in date range
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-cyan-500" />
                    Labor Hours Billed by Month
                  </CardTitle>
                  <CardDescription>
                    Total billed labor hours per month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ hours: { label: "Hours", color: "var(--chart-3)" } }}
                    className="h-[280px] w-full"
                  >
                    <BarChart data={laborByMonth} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickLine={false} axisLine={false} width={50} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => `${Number(v).toFixed(1)} hrs`}
                            nameKey="month"
                          />
                        }
                      />
                      <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                  {laborByMonth.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No labor data in date range
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-500" />
                    Revenue by Department
                  </CardTitle>
                  <CardDescription>
                    Invoice total by department
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={
                      revenueByDept.length > 0
                        ? Object.fromEntries(
                            revenueByDept.map((d, i) => [
                              d.name,
                              {
                                label: `${d.name}: ${formatCurrency(d.value)}`,
                                color: CHART_COLORS[i % CHART_COLORS.length],
                              },
                            ])
                          )
                        : { value: { label: "Revenue", color: "var(--chart-1)" } }
                    }
                    className="h-[280px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatCurrency(v)}
                            nameKey="name"
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.name ?? "Department"
                            }
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      <Pie
                        data={revenueByDept}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        label={({ name, percent, value }) =>
                          percent > 0.05
                            ? `${name} (${formatCurrency(value)})`
                            : ""
                        }
                      >
                        {revenueByDept.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  {revenueByDept.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No revenue data in date range
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-500" />
                    Open vs Closed by Department
                  </CardTitle>
                  <CardDescription>
                    Work orders by department in date range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      open: { label: "Open", color: "var(--chart-4)" },
                      closed: { label: "Closed", color: "var(--chart-5)" },
                    }}
                    className="h-[280px] w-full"
                  >
                    <BarChart
                      data={deptData}
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                      layout="vertical"
                    >
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} width={50} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => String(v)}
                            labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="open" fill="var(--color-open)" radius={4} />
                      <Bar dataKey="closed" fill="var(--color-closed)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                  {deptData.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No department data in date range
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, description }) {
  return (
    <Card className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/30 p-2">
            <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
