"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getBalanceSheet,
  getBalanceSheetTypes,
} from "@/lib/api/accounting";
import { Button } from "@/components/ui/button";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

function getMonthEnd(year, month) {
  return new Date(year, month, 0); // last day of month
}

function processBalanceData(rows, branch) {
  let filtered = Array.isArray(rows) ? rows : [];
  if (branch != null && branch !== "") {
    filtered = filtered.filter((r) => r.Branch == branch);
  }
  return filtered.map((r) => ({
    ...r,
    total: (Number(r.debit) || 0) + (Number(r.credit) || 0),
  }));
}

function groupByType(data) {
  const byType = {};
  data.forEach((row) => {
    const type = row.Type || row.type || "Other";
    if (!byType[type]) byType[type] = [];
    byType[type].push(row);
  });
  return byType;
}

function groupBySection(rows) {
  const bySection = {};
  rows.forEach((row) => {
    const section = row.sectionTitle || row.SectionTitle || "Other";
    if (!bySection[section]) bySection[section] = [];
    bySection[section].push(row);
  });
  return bySection;
}

function sumBySection(rows) {
  const sums = {};
  let total = 0;
  rows.forEach((row) => {
    const section = row.sectionTitle || row.SectionTitle || row.Description || "Other";
    const val = (Number(row.debit) || 0) + (Number(row.credit) || 0);
    sums[section] = (sums[section] || 0) + val;
    total += val;
  });
  return { sums, total };
}

export default function ReportsPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [rawBalance, setRawBalance] = useState([]);
  const [rawBalanceTypes, setRawBalanceTypes] = useState([]);
  const [expanded, setExpanded] = useState({});

  const branches = branchDeptFilter?.branches ?? [];
  const primaryBranch = branches[0];
  const branchNum = primaryBranch?.Number ?? primaryBranch;
  const allBranches = branches.length === 0;
  const filterBranch = allBranches ? null : branchNum;

  const asOfDate = useMemo(() => getMonthEnd(year, month), [year, month]);
  const dateStr = toYMD(asOfDate);

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const [balanceRes, typesRes] = await Promise.all([
        getBalanceSheet(asOfDate, token),
        getBalanceSheetTypes(asOfDate, token),
      ]);
      setRawBalance(balanceRes ?? []);
      setRawBalanceTypes(typesRes ?? []);
    } catch (err) {
      toast.error(err?.message || "Failed to load reports");
      setRawBalance([]);
      setRawBalanceTypes([]);
    } finally {
      setLoading(false);
    }
  }, [token, asOfDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const balanceData = useMemo(
    () => processBalanceData(rawBalance, filterBranch),
    [rawBalance, filterBranch]
  );
  const balanceTypesData = useMemo(
    () => processBalanceData(rawBalanceTypes, filterBranch),
    [rawBalanceTypes, filterBranch]
  );

  const balanceByType = useMemo(
    () => groupByType(balanceData),
    [balanceData]
  );
  const balanceTypesByType = useMemo(
    () => groupByType(balanceTypesData),
    [balanceTypesData]
  );

  const balanceSheetGroups = useMemo(() => {
    const assets = balanceTypesByType["Assets"] || [];
    const liabilities = balanceTypesByType["Liabilities"] || [];
    return [
      { name: "Assets", rows: assets },
      { name: "Liabilities", rows: liabilities },
    ].filter((g) => g.rows.length > 0);
  }, [balanceTypesByType]);

  const cashFlowCalcs = useMemo(() => {
    const typeOf = (r) => r.Type || r.type || "";
    const salesRows = balanceTypesData.filter((r) => typeOf(r) === "Sales");
    const costsRows = balanceTypesData.filter((r) => typeOf(r) === "Costs");
    const expensesRows = balanceTypesData.filter((r) => typeOf(r) === "Expenses");
    const sales = sumBySection(salesRows);
    const costs = sumBySection(costsRows);
    const expenses = sumBySection(expensesRows);
    return {
      sales: sales.sums,
      salesTotal: sales.total,
      costs: costs.sums,
      costsTotal: costs.total,
      expenses: expenses.sums,
      expensesTotal: expenses.total,
      grossMargin: sales.total + costs.total,
      incomeBeforeTax: sales.total + costs.total + expenses.total,
    };
  }, [balanceTypesData]);

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-semibold text-foreground">
                Reports
              </h1>
              <p className="mt-1 text-muted-foreground">
                Balance Sheet and Cash Flow statements.
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
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
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

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Tabs defaultValue="balance" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="balance" className="gap-2">
                <FileText className="h-4 w-4" />
                Balance Sheet
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="gap-2">
                <FileText className="h-4 w-4" />
                Cash Flow
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="balance" className="mt-0">
                  <ReportCard className="overflow-hidden">
                    <ReportHeader
                      title="Balance Sheet"
                      asOf={`${MONTH_NAMES[month - 1]} ${year}`}
                    />
                    <div className="p-6 pt-0">
                      {balanceSheetGroups.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">
                          No balance sheet data for this period.
                        </p>
                      ) : (
                        balanceSheetGroups.map((group) => {
                          const key = group.name.toUpperCase();
                          const isExpanded = expanded[key] ?? true;
                          const bySection = groupBySection(group.rows);
                          const groupTotal = group.rows.reduce(
                            (s, r) => s + r.total,
                            0
                          );
                          return (
                            <div key={group.name} className="mb-8">
                              <button
                                type="button"
                                onClick={() => toggleExpand(key)}
                                className="flex w-full items-center justify-between py-3 font-semibold text-foreground hover:bg-accent/10 rounded-lg -mx-2 px-2"
                              >
                                <span className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  {group.name}
                                </span>
                                <span className="font-mono tabular-nums">
                                  {formatCurrency(groupTotal)}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="ml-4 space-y-4">
                                  {Object.entries(bySection).map(
                                    ([sectionName, sectionRows]) => {
                                      const sectionKey = `${key}-${sectionName}`;
                                      const sectionExpanded =
                                        expanded[sectionKey] ?? false;
                                      const sectionTotal = sectionRows.reduce(
                                        (s, r) => s + r.total,
                                        0
                                      );
                                      return (
                                        <div key={sectionName}>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleExpand(sectionKey)
                                            }
                                            className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:bg-accent/10 rounded-lg -mx-2 px-2"
                                          >
                                            <span className="flex items-center gap-2">
                                              {sectionExpanded ? (
                                                <ChevronDown className="h-3 w-3" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3" />
                                              )}
                                              {sectionName}
                                            </span>
                                            <span className="font-mono tabular-nums text-sm">
                                              {formatCurrency(sectionTotal)}
                                            </span>
                                          </button>
                                          {sectionExpanded && (
                                            <div className="ml-6 space-y-1">
                                              {sectionRows.map((row, i) => (
                                                <div
                                                  key={`${row.Description}-${i}`}
                                                      className="flex justify-between py-1.5 text-sm text-muted-foreground"
                                                >
                                                  <span className="pl-4">
                                                    {row.Description || "—"}
                                                  </span>
                                                  <span className="font-mono tabular-nums">
                                                    {formatCurrency(row.total)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ReportCard>
                </TabsContent>

                <TabsContent value="cashflow" className="mt-0">
                  <ReportCard className="overflow-hidden">
                    <ReportHeader
                      title="Cash Flow"
                      asOf={`${MONTH_NAMES[month - 1]} ${year}`}
                    />
                    <div className="p-6 pt-0 space-y-6">
                      {/* Operating Activities */}
                      <Section
                        title="Operating Activities"
                        expanded={expanded["OPERATING"] ?? true}
                        onToggle={() => toggleExpand("OPERATING")}
                        total={cashFlowCalcs.grossMargin}
                      >
                        <SubSection
                          title="Sales"
                          items={cashFlowCalcs.sales}
                          total={cashFlowCalcs.salesTotal}
                          expanded={expanded["SALES"] ?? false}
                          onToggle={() => toggleExpand("SALES")}
                        />
                        <SubSection
                          title="Costs"
                          items={cashFlowCalcs.costs}
                          total={cashFlowCalcs.costsTotal}
                          expanded={expanded["COSTS"] ?? false}
                          onToggle={() => toggleExpand("COSTS")}
                        />
                        <div className="py-2 border-t border-border/60 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Gross Margin</span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(cashFlowCalcs.grossMargin)}
                            </span>
                          </div>
                        </div>
                      </Section>

                      {/* Financial Activities */}
                      <Section
                        title="Financial Activities"
                        expanded={expanded["FINANCIAL"] ?? true}
                        onToggle={() => toggleExpand("FINANCIAL")}
                        total={cashFlowCalcs.expensesTotal}
                      >
                        <SubSection
                          title="Operating Expenses"
                          items={cashFlowCalcs.expenses}
                          total={cashFlowCalcs.expensesTotal}
                          expanded={expanded["EXPENSES"] ?? false}
                          onToggle={() => toggleExpand("EXPENSES")}
                        />
                      </Section>

                      {/* Totals */}
                      <div className="pt-4 border-t-2 border-border/60 space-y-2">
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Income Before Tax</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(cashFlowCalcs.incomeBeforeTax)}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Net Cash for Period</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(cashFlowCalcs.incomeBeforeTax)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </ReportCard>
                </TabsContent>
              </>
            )}
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ReportHeader({ title, asOf }) {
  return (
    <div className="p-6 pb-4 text-center border-b border-border/60">
      <h2 className="text-xl font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        As of {asOf}
      </p>
    </div>
  );
}

function ReportCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card ${className}`}
    >
      {children}
    </div>
  );
}

function Section({ title, expanded, onToggle, total, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 font-semibold text-foreground hover:bg-accent/10 rounded-lg -mx-2 px-2"
      >
        <span className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {title}
        </span>
        <span className="font-mono tabular-nums">
          {formatCurrency(total)}
        </span>
      </button>
      {expanded && <div className="ml-4 mt-2">{children}</div>}
    </div>
  );
}

function SubSection({ title, items, total, expanded, onToggle }) {
  const entries = Object.entries(items || {}).filter(
    ([k]) => k !== "total" && k !== "undefined"
  );
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:bg-accent/10 rounded-lg -mx-2 px-2"
      >
        <span className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {title}
        </span>
        <span className="font-mono tabular-nums text-sm">
          {formatCurrency(total)}
        </span>
      </button>
      {expanded && entries.length > 0 && (
        <div className="ml-6 space-y-1">
          {entries.map(([name, val]) => (
            <div
              key={name}
              className="flex justify-between py-1.5 text-sm text-muted-foreground"
            >
              <span className="pl-4">{name}</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
