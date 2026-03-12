"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getFillRate,
  getInventoryTurns,
  getPartsOrders,
  getStockToCritical,
  getMonthsOnHand,
  getPartsOverview,
  getObsoleteInventory,
  getBackorders,
  getRequestedPartsByBranch,
} from "@/lib/api/parts";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

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

function formatPercent(val) {
  if (val == null || Number.isNaN(Number(val))) return "0%";
  return `${Number(val).toFixed(1)}%`;
}

function KpiStatCard({ title, value, description, icon: Icon }) {
  return (
    <Card className="rounded-xl border-slate-200/80 dark:border-slate-700/50 bg-gradient-to-br from-slate-50 to-cyan-50/30 dark:from-slate-900 dark:to-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-cyan-500/10 p-2">
              <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartsKPIPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [dates, setDates] = useState(getDefaultDateRange);
  const [loading, setLoading] = useState(false);
  const [fillRate, setFillRate] = useState([]);
  const [inventoryTurns, setInventoryTurns] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [stockToCritical, setStockToCritical] = useState([]);
  const [monthsOnHand, setMonthsOnHand] = useState([]);
  const [overview, setOverview] = useState({});
  const [obsolete, setObsolete] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [requestsCount, setRequestsCount] = useState(0);
  const [showOutliers, setShowOutliers] = useState(true);

  const branches = useMemo(() => branchDeptFilter?.branches ?? [], [branchDeptFilter?.branches]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    const startStr = toYMD(dates.start);
    const endStr = toYMD(dates.end);
    if (!startStr || !endStr) return;

    const today = new Date();
    today.setDate(today.getDate() - 1);
    today.setHours(0, 0, 0, 0);
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 2);
    nextDay.setHours(0, 0, 0, 0);

    setLoading(true);
    try {
      const [
        fillRateRes,
        turnsRes,
        ordersRes,
        stockRes,
        onHandRes,
        overviewRes,
        obsoleteRes,
        backordersRes,
      ] = await Promise.all([
        getFillRate(dates.start, dates.end, null, token),
        getInventoryTurns(dates.start, dates.end, null, token),
        getPartsOrders(today, nextDay, null, token),
        getStockToCritical(dates.start, dates.end, token),
        getMonthsOnHand(null, token),
        getPartsOverview(null, token),
        getObsoleteInventory(null, token),
        getBackorders(null, null, token),
      ]);

      setFillRate(fillRateRes);
      setInventoryTurns(turnsRes);
      setTodayOrders(ordersRes);
      setStockToCritical(stockRes);
      setMonthsOnHand(onHandRes);
      setOverview(overviewRes ?? {});
      setObsolete(obsoleteRes);
      setBackorders(backordersRes);
    } catch (err) {
      toast.error(err?.message || "Failed to load KPI data");
      setFillRate([]);
      setInventoryTurns([]);
      setTodayOrders([]);
      setStockToCritical([]);
      setMonthsOnHand([]);
      setOverview({});
      setObsolete([]);
      setBackorders([]);
    } finally {
      setLoading(false);
    }
  }, [token, dates.start, dates.end]);

  const fetchRequestsCount = useCallback(async () => {
    if (!token || branches.length === 0) {
      setRequestsCount(0);
      return;
    }
    try {
      const arrays = await Promise.all(
        branches.map((b) => getRequestedPartsByBranch(b.Number ?? b, token))
      );
      let count = 0;
      for (const arr of arrays) {
        for (const wo of arr) {
          count += (wo.Parts ?? []).length;
        }
      }
      setRequestsCount(count);
    } catch {
      setRequestsCount(0);
    }
  }, [token, branches]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchRequestsCount();
  }, [fetchRequestsCount]);

  const fillRateChartData = useMemo(() => {
    return fillRate
      .filter((r) => r.PartsGroup !== "-- Total")
      .map((r) => ({
        ...r,
        FillRatePct: r.FillRate != null ? Number(r.FillRate) * 100 : 0,
      }));
  }, [fillRate]);

  const dailyFillRate = useMemo(() => {
    let initialSum = 0;
    let totalSum = 0;
    fillRate.forEach((r) => {
      if (r.PartsGroup !== "-- Total") {
        initialSum += Number(r.Initial ?? 0);
        totalSum += Number(r.Total ?? 0);
      }
    });
    return totalSum > 0 ? initialSum / totalSum : 0;
  }, [fillRate]);

  const totalPartsOrdered = useMemo(() => {
    return todayOrders.reduce((s, o) => s + (Number(o.Qty) ?? 0), 0);
  }, [todayOrders]);

  const stockToCriticalChartData = useMemo(() => {
    return stockToCritical.map((r) => ({
      ...r,
      StockToCriticalPct: r.StockToCritical != null ? Number(r.StockToCritical) * 100 : 0,
    }));
  }, [stockToCritical]);

  const turnsForChart = useMemo(() => {
    const valid = inventoryTurns.filter((r) => r.InventoryTurns != null);
    if (valid.length === 0) return [];
    const avg = valid.reduce((s, r) => s + Number(r.InventoryTurns), 0) / valid.length;
    return showOutliers
      ? valid.filter((r) => Number(r.InventoryTurns) > avg)
      : valid;
  }, [inventoryTurns, showOutliers]);

  const avgInventoryTurns = useMemo(() => {
    const valid = inventoryTurns.filter((r) => r.InventoryTurns != null);
    if (valid.length === 0) return 0;
    return valid.reduce((s, r) => s + Number(r.InventoryTurns), 0) / valid.length;
  }, [inventoryTurns]);

  const avgMonthsOnHand = useMemo(() => {
    const valid = monthsOnHand.filter(
      (r) => r.MonthsOnHand != null && r.MonthsOnHand !== 0
    );
    if (valid.length === 0) return 0;
    return valid.reduce((s, r) => s + Number(r.MonthsOnHand), 0) / valid.length;
  }, [monthsOnHand]);

  const obsoleteInventoryValue = useMemo(() => {
    return obsolete.reduce((s, r) => {
      if (r.ObsoleteValue != null && r.OnHand !== 0 && r.ObsoleteValue > 0) {
        return s + Number(r.ObsoleteValue) * Number(r.OnHand);
      }
      return s;
    }, 0);
  }, [obsolete]);

  const obsoleteFiltered = useMemo(() => {
    return obsolete.filter((r) => r.OnHand !== 0 && r.ObsoleteValue > 0);
  }, [obsolete]);

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
              <Link href="/parts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                Parts KPI Dashboard
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Fill rate, inventory turns, stock-to-critical, and reports.
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
                title="Parts ordered (24h)"
                value={totalPartsOrdered}
                description="Last 24 hours"
                icon={Package}
              />
              <KpiStatCard
                title="Current requests"
                value={requestsCount}
                description={branches.length > 0 ? "Selected branches" : "Select branches"}
                icon={AlertTriangle}
              />
              <KpiStatCard
                title="Daily fill rate"
                value={formatPercent(dailyFillRate * 100)}
                description="Overall"
                icon={TrendingUp}
              />
              <KpiStatCard
                title="Inventory turns"
                value={avgInventoryTurns.toFixed(2)}
                description={`Months on hand: ${avgMonthsOnHand.toFixed(2)}`}
                icon={BarChart3}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-500" />
                    Fill Rate
                  </CardTitle>
                  <CardDescription>
                    Fill rate by parts group for date range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ FillRatePct: { label: "Fill Rate %", color: "var(--chart-1)" } }}
                    className="h-[280px] w-full"
                  >
                    <LineChart
                      data={fillRateChartData}
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="PartsGroup"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        domain={[0, 105]}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => `${Number(v).toFixed(1)}%`}
                            nameKey="PartsGroup"
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="FillRatePct"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                  {fillRateChartData.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No fill rate data in date range
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-500" />
                    Stock-to-Critical
                  </CardTitle>
                  <CardDescription>
                    Stock-to-sales rate by branch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      StockToCriticalPct: {
                        label: "Stock-to-Critical %",
                        color: "var(--chart-2)",
                      },
                    }}
                    className="h-[280px] w-full"
                  >
                    <BarChart
                      data={stockToCriticalChartData}
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="POBranch"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => `${Number(v).toFixed(1)}%`}
                            nameKey="POBranch"
                          />
                        }
                      />
                      <Bar
                        dataKey="StockToCriticalPct"
                        fill="var(--chart-2)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                  {stockToCriticalChartData.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No stock-to-critical data in date range
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-cyan-500" />
                        Inventory Turns
                      </CardTitle>
                      <CardDescription>
                        Parts with above-average turns
                        <label className="ml-3 inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showOutliers}
                            onChange={(e) => setShowOutliers(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Show only outliers</span>
                        </label>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      InventoryTurns: {
                        label: "Inventory Turns",
                        color: "var(--chart-3)",
                      },
                    }}
                    className="h-[280px] w-full"
                  >
                    <LineChart
                      data={turnsForChart}
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="PartNo"
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
                            formatter={(v) => Number(v).toFixed(2)}
                            nameKey="PartNo"
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="InventoryTurns"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                  {turnsForChart.length === 0 && (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No inventory turns data in date range
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>
                  Inventory value, backorders, and obsolete inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="inventory" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="inventory">
                      Inventory Value & Obsolescence
                    </TabsTrigger>
                    <TabsTrigger value="backorders">Daily Backorder Report</TabsTrigger>
                    <TabsTrigger value="obsolete">Obsolete Inventory</TabsTrigger>
                  </TabsList>
                  <TabsContent value="inventory" className="mt-0">
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Part No</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Months On Hand</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthsOnHand.slice(0, 100).map((r, i) => (
                            <TableRow key={`${r.PartNo}-${i}`}>
                              <TableCell className="font-mono">{r.PartNo}</TableCell>
                              <TableCell>{formatCurrency(r.Cost)}</TableCell>
                              <TableCell>
                                {r.MonthsOnHand != null
                                  ? Number(r.MonthsOnHand).toFixed(2)
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Total Inventory Value: {formatCurrency(overview.TotalInventoryCost)} |
                      Obsolete Inventory: {formatCurrency(obsoleteInventoryValue)}
                    </p>
                  </TabsContent>
                  <TabsContent value="backorders" className="mt-0">
                    <div className="rounded-lg border overflow-hidden max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entry Date</TableHead>
                            <TableHead>Part Count</TableHead>
                            <TableHead>Sale Branch</TableHead>
                            <TableHead>Sale Dept</TableHead>
                            <TableHead>Ship Name</TableHead>
                            <TableHead>WO No</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backorders.map((r, i) => (
                            <TableRow key={`bo-${i}`}>
                              <TableCell>
                                {r.EntryDate
                                  ? new Date(r.EntryDate).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell>{r.PartCount ?? "-"}</TableCell>
                              <TableCell>{r.SaleBranch ?? "-"}</TableCell>
                              <TableCell>{r.SaleDept ?? "-"}</TableCell>
                              <TableCell>{r.ShipName ?? "-"}</TableCell>
                              <TableCell className="font-mono">{r.WONo ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {backorders.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No backorders
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="obsolete" className="mt-0">
                    <div className="rounded-lg border overflow-hidden max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Part No</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>On Hand</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Obsolescence Rate</TableHead>
                            <TableHead>Obsolete Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {obsoleteFiltered.map((r, i) => (
                            <TableRow key={`ob-${r.PartNo}-${r.Warehouse}-${i}`}>
                              <TableCell className="font-mono">{r.PartNo}</TableCell>
                              <TableCell>{r.Warehouse ?? "-"}</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {r.Description ?? "-"}
                              </TableCell>
                              <TableCell>{r.OnHand ?? 0}</TableCell>
                              <TableCell>{formatCurrency(r.Cost)}</TableCell>
                              <TableCell>
                                {r.ObsolescenceRate != null
                                  ? Number(r.ObsolescenceRate).toFixed(2)
                                  : "-"}
                              </TableCell>
                              <TableCell>{formatCurrency(r.ObsoleteValue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Obsolete Inventory: {formatCurrency(obsoleteInventoryValue)}
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </motion.div>
  );
}
