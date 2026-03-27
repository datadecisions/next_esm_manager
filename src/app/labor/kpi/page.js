"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Clock,
  DollarSign,
  Users,
  FileCheck,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getLaborByTechByBranch,
  getLaborOverview,
  getOpenLaborSummary,
  getLaborTimecardsReport,
} from "@/lib/api/labor";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { DateRangeInput } from "@/components/DateRangeInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function formatHours(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "-";
  return `${Number(val).toFixed(1)} hrs`;
}

function formatPercent(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "-";
  return `${(Number(val) * 100).toFixed(1)}%`;
}

export default function LaborKPIPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);

  const branches = useMemo(() => branchDeptFilter?.branches ?? [], [branchDeptFilter?.branches]);
  const branchNum = branches[0]?.Number ?? branches[0];
  const branchesParam = useMemo(
    () => branches.map((b) => b.Number ?? b).join(","),
    [branches]
  );

  const [pendingCount, setPendingCount] = useState(0);
  const [openSummary, setOpenSummary] = useState(null);
  const [overview, setOverview] = useState([]);
  const [timecardsReport, setTimecardsReport] = useState(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    if (!debouncedDates.isValid) return;
    if (!branchNum && branches.length === 0) {
      setPendingCount(0);
      setOpenSummary(null);
      setOverview([]);
      setTimecardsReport(null);
      return;
    }
    const { start: s, end: e } = debouncedDates;
    setLoading(true);
    try {
      const [laborByTech, openSum, overviewData, timecards] = await Promise.all([
        branchNum
          ? getLaborByTechByBranch(branchNum, token, { startDate: s, endDate: e })
          : Promise.resolve({ techs: [] }),
        branchesParam
          ? getOpenLaborSummary({ branches: branchesParam })
          : Promise.resolve(null),
        getLaborOverview({ startDate: s, endDate: e }),
        branchesParam
          ? getLaborTimecardsReport({
              branches: branchesParam,
              startDate: s,
              endDate: e,
            })
          : Promise.resolve(null),
      ]);

      const pending = (laborByTech?.techs ?? []).reduce(
        (sum, t) => sum + (t.unimported?.length ?? 0),
        0
      );
      setPendingCount(pending);

      setOpenSummary(openSum);

      const branchSet = branches.length
        ? new Set(branches.map((b) => String(b.Number ?? b)))
        : null;
      const filteredOverview =
        branchSet && overviewData?.length
          ? overviewData.filter((r) => r.SaleBranch != null && branchSet.has(String(r.SaleBranch)))
          : overviewData ?? [];
      setOverview(filteredOverview);

      setTimecardsReport(timecards);
    } catch (err) {
      toast.error(err?.message || "Failed to load KPI data");
      setPendingCount(0);
      setOpenSummary(null);
      setOverview([]);
      setTimecardsReport(null);
    } finally {
      setLoading(false);
    }
  }, [token, branchNum, branchesParam, branches, debouncedDates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = openSummary?.totals ?? {};
  const openLaborValue = totals.openLaborSell ?? 0;
  const openFiveDays = totals.openFiveDays ?? 0;
  const openPastFiveDays = totals.openPastFiveDays ?? 0;
  const openPastThirtyDays = totals.openPastThirtyDays ?? 0;
  const techCount = openSummary?.data?.length ?? 0;

  const hoursBilled = useMemo(() => {
    return overview.reduce((sum, r) => sum + (r.Hours ?? 0), 0);
  }, [overview]);

  const laborRevenue = useMemo(() => {
    return overview.reduce((sum, r) => sum + (r.Sell ?? 0), 0);
  }, [overview]);

  const { billablePercent, overtimePercent } = useMemo(() => {
    const rows = timecardsReport?.rows ?? [];
    let totalHrs = 0;
    let billableHrs = 0;
    let overtimeHrs = 0;
    rows.forEach((r) => {
      const total = parseFloat(r["Total Hours"] || 0);
      const regular = parseFloat(r["Regular Hours"] || 0);
      const overtime = parseFloat(r["Overtime Hours"] || 0);
      totalHrs += total;
      billableHrs += regular + overtime;
      overtimeHrs += overtime;
    });
    return {
      billablePercent: totalHrs > 0 ? billableHrs / totalHrs : 0,
      overtimePercent: totalHrs > 0 ? overtimeHrs / totalHrs : 0,
    };
  }, [timecardsReport]);

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full text-foreground"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex flex-wrap items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Link href="/labor">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted/40">
              <ArrowLeft className="h-4 w-4" />
            </span>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
              <BarChart3 className="h-5 w-5" />
              Labor KPI Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Key metrics for labor managers.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="mb-6 border-border bg-card text-card-foreground">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
                <div>
                  <label className="text-sm font-medium mb-2 block">Branch</label>
                  <BranchDeptFilter
                    value={branchDeptFilter}
                    onChange={setBranchDeptFilter}
                    token={token}
                    className="min-w-[200px]"
                  />
                </div>
                <DateRangeInput
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={(val) => setStartDate(val || "")}
                  onEndDateChange={(val) => setEndDate(val || "")}
                  onDebouncedChange={handleDebouncedChange}
                  startLabel="Start"
                  endLabel="End"
                  inputClassName="w-[140px]"
                />
                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {!branchNum && branches.length === 0 && (
            <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
              Select a branch to view KPIs.
            </div>
          )}

          {(branchNum || branches.length > 0) && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card className="border-border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Approval
                    </CardTitle>
                    <FileCheck className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? "-" : pendingCount}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Unimported labor entries
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Open Labor Value
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? "-" : formatCurrency(openLaborValue)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      WIP on open orders
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Hours Billed
                    </CardTitle>
                    <Clock className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? "-" : formatHours(hoursBilled)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      In date range
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Technicians Active
                    </CardTitle>
                    <Users className="h-4 w-4 text-violet-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? "-" : techCount}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      With open labor
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Utilization */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                <Card className="border-border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Billable %
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? "-" : formatPercent(billablePercent)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      From timecards in range
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Overtime %
                    </CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? "-" : formatPercent(overtimePercent)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hours over 8/day
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Open orders aging */}
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Open Orders by Age
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Orders with unimported labor, grouped by last labor date
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                      <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        0–5 days
                      </div>
                      <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                        {loading ? "-" : openFiveDays}
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Recent activity
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                      <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        5–30 days
                      </div>
                      <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                        {loading ? "-" : openPastFiveDays}
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Needs attention
                      </p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-900/20">
                      <div className="text-sm font-medium text-red-800 dark:text-red-300">
                        30+ days
                      </div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                        {loading ? "-" : openPastThirtyDays}
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Stale / overdue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Labor revenue (from overview) */}
              {laborRevenue > 0 && (
                <Card className="mt-6 border-border bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle>Labor Revenue (Period)</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      From imported labor in date range
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {formatCurrency(laborRevenue)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
