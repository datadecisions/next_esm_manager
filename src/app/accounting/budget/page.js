"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getNet,
  getBudget,
  setBudget,
} from "@/lib/api/accounting";
import { getBranchDepts } from "@/lib/api/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { toast } from "sonner";
import { fadeIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(val) {
  if (val == null || val === "" || Number.isNaN(Number(val))) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val));
}

/** Count weekdays (Mon–Fri) in a given month. */
function getBillingDays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day); // month 0-based for Date
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Count weekdays so far in the month (up to and including today, or all if month is in the past). */
function getDoneDays(year, month) {
  const now = new Date();
  const targetYear = year;
  const targetMonth = month - 1; // 0-based

  if (targetYear < now.getFullYear()) return getBillingDays(year, month);
  if (targetYear > now.getFullYear()) return 0;
  if (targetMonth < now.getMonth()) return getBillingDays(year, month);
  if (targetMonth > now.getMonth()) return 0;

  // Same month: count weekdays from 1 to today
  const today = now.getDate();
  let count = 0;
  for (let day = 1; day <= today; day++) {
    const d = new Date(targetYear, targetMonth, day);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export default function BudgetPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [netData, setNetData] = useState([]);
  const [budgets, setBudgets] = useState({}); // key: `${branch}-${dept}`
  const [saving, setSaving] = useState(null); // key of card being saved

  const branches = branchDeptFilter?.branches ?? [];
  const selectedDepts = branchDeptFilter?.depts ?? [];
  const selectAllDepts = branchDeptFilter?.selectAllDepts ?? false;
  const primaryBranch = branches[0];
  const branchNum = primaryBranch?.Number ?? primaryBranch;

  const [allDeptsForBranch, setAllDeptsForBranch] = useState([]);
  useEffect(() => {
    if (!token || !branchNum) {
      setAllDeptsForBranch([]);
      return;
    }
    getBranchDepts(branchNum, token)
      .then(setAllDeptsForBranch)
      .catch(() => setAllDeptsForBranch([]));
  }, [token, branchNum]);

  const depts = selectAllDepts ? allDeptsForBranch : selectedDepts;

  const totalDays = useMemo(() => getBillingDays(year, month), [year, month]);
  const doneDays = useMemo(() => getDoneDays(year, month), [year, month]);

  const deptPairs = useMemo(() => {
    if (!branchNum) return [];
    return depts.map((d) => ({
      branch: branchNum,
      dept: d?.Dept ?? d,
      title: d?.Title ?? String(d?.Dept ?? d),
    }));
  }, [branchNum, depts]);

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [netRes, ...budgetRes] = await Promise.all([
        getNet(token),
        ...deptPairs.map(({ branch, dept }) =>
          getBudget(branch, dept, year, month, token)
        ),
      ]);
      setNetData(netRes ?? []);
      const next = {};
      deptPairs.forEach(({ branch, dept }, i) => {
        const key = `${branch}-${dept}`;
        const b = budgetRes[i];
        next[key] = b?.amount != null ? Number(b.amount) : null;
      });
      setBudgets(next);
    } catch (err) {
      toast.error(err?.message || "Failed to load budget data");
      setNetData([]);
      setBudgets({});
    } finally {
      setLoading(false);
    }
  }, [token, deptPairs, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const netByDept = useMemo(() => {
    const map = {};
    netData.forEach((row) => {
      if (row.SalesYear !== year || row.SalesMonth !== month) return;
      const branch = row.SaleBranch;
      const dept = String(row.SaleDept ?? "");
      const key = `${branch}-${dept}`;
      if (!map[key]) map[key] = 0;
      map[key] += Number(row.Net) ?? 0;
    });
    return map;
  }, [netData, year, month]);

  const handleSaveGoal = useCallback(
    async (branch, dept, amount) => {
      const key = `${branch}-${dept}`;
      setSaving(key);
      try {
        await setBudget(
          { amount: amount || 0, branch, dept, month, year },
          token
        );
        setBudgets((prev) => ({ ...prev, [key]: Number(amount) || 0 }));
        toast.success("Budget saved");
      } catch (err) {
        toast.error(err?.message || "Failed to save budget");
      } finally {
        setSaving(null);
      }
    },
    [token, month, year]
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
                Budget
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Track department financial performance and set budget goals.
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
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {Array.from({ length: 7 }, (_, i) => year - 3 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
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

        {/* Billing days summary */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Billing days for {MONTH_NAMES[month - 1]} {year}
              </h2>
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-50 dark:bg-cyan-900/30 p-3">
                    <Calendar className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total weekdays</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {totalDays}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                    <Target className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {totalDays - doneDays}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!branchNum || deptPairs.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Select a branch and department(s) to view budget.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {deptPairs.map(({ branch, dept, title }) => {
              const key = `${branch}-${dept}`;
              const mtd = netByDept[key] ?? 0;
              const goal = budgets[key] ?? null;
              const perDay = totalDays > 0 ? mtd / totalDays : 0;
              const variance = goal != null ? mtd - goal : null;
              const isSaving = saving === key;

              return (
                <motion.div key={key} variants={staggerItem}>
                  <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-cyan-500" />
                        Branch {branch} · {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Current MTD
                          </p>
                          <p className="text-xl font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(mtd)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Per day
                          </p>
                          <p className="text-xl font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(perDay)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`goal-${key}`}>Goal</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`goal-${key}`}
                            type="number"
                            placeholder="Set budget goal"
                            value={goal != null ? goal : ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBudgets((prev) => ({
                                ...prev,
                                [key]: v === "" ? null : Number(v),
                              }));
                            }}
                            onBlur={(e) => {
                              const v = e.target.value;
                              const num = v === "" ? 0 : Number(v);
                              if (goal !== num) {
                                handleSaveGoal(branch, dept, num);
                              }
                            }}
                            className="font-mono"
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSaveGoal(
                                branch,
                                dept,
                                budgets[key] ?? 0
                              )
                            }
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      </div>

                      {variance != null && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Variance
                          </p>
                          <p
                            className={`text-xl font-semibold ${
                              variance >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {variance >= 0 ? "+" : ""}
                            {formatCurrency(variance)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
