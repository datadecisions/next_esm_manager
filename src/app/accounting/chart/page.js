"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getAccountsWithTotals } from "@/lib/api/accounting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { DateRangeInput } from "@/components/DateRangeInput";
import { CreateAccountDialog } from "@/components/accounting/CreateAccountDialog";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getDefaultDates() {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { startDate: firstDay, endDate: lastDay };
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
  if (val == null || Number.isNaN(Number(val))) return null;
  return `${Number(val).toFixed(2)}%`;
}

function processAccounts(data, endDate) {
  if (!data?.accounts?.length) return [];
  const month = endDate.getMonth() + 1;
  const year = endDate.getFullYear();
  const currentFY = data.currentFY || [];
  const priorFY = data.priorFY || [];

  return data.accounts.map((item) => {
    const current = currentFY.find(
      (x) => x.AccountNo === item.AccountNo && x.Month === month && x.Year === year
    ) || { MTD: 0, YTD: 0 };
    const prior = priorFY.find(
      (x) => x.AccountNo === item.AccountNo && x.Month === month && x.Year === year - 1
    ) || { MTD: 0, YTD: 0 };

    const curMTD = Number(current.MTD) ?? 0;
    const curYTD = Number(current.YTD) ?? 0;
    const prMTD = Number(prior.MTD) ?? 0;
    const prYTD = Number(prior.YTD) ?? 0;

    let diffMTD = null;
    let diffYTD = null;
    if (curMTD !== 0) diffMTD = (prMTD / curMTD) * 100;
    if (curYTD !== 0) diffYTD = (prYTD / curYTD) * 100;

    return {
      ...item,
      combinedName: `${item.AccountNo} ${item.Description || ""}`,
      calculations: {
        current: { MTD: curMTD, YTD: curYTD },
        prior: { MTD: prMTD, YTD: prYTD },
        diffMTD,
        diffYTD,
      },
    };
  });
}

const SORT_KEYS = {
  Description: (a) => (a.Description || "").toLowerCase(),
  AccountNo: (a) => String(a.AccountNo || ""),
  "current.MTD": (a) => a.calculations?.current?.MTD ?? 0,
  "current.YTD": (a) => a.calculations?.current?.YTD ?? 0,
  "prior.MTD": (a) => a.calculations?.prior?.MTD ?? 0,
  "prior.YTD": (a) => a.calculations?.prior?.YTD ?? 0,
};

export default function ChartOfAccountsPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [dates, setDates] = useState(getDefaultDates);
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("Description");
  const [sortReverse, setSortReverse] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (!debouncedDates.isValid) return;

    setLoading(true);
    try {
      const startDt = new Date(debouncedDates.start + "T12:00:00");
      const endDt = new Date(debouncedDates.end + "T12:00:00");
      const data = await getAccountsWithTotals(startDt, endDt, token);
      setRawData(data);
    } catch (err) {
      toast.error(err?.message || "Failed to load chart of accounts");
      setRawData(null);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedDates.start, debouncedDates.end, debouncedDates.isValid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const accounts = useMemo(() => {
    if (!rawData || !debouncedDates.isValid) return [];
    const endDt = new Date(debouncedDates.end + "T12:00:00");
    return processAccounts(rawData, endDt);
  }, [rawData, debouncedDates.end, debouncedDates.isValid]);

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const terms = search.toUpperCase().trim();
    return accounts.filter(
      (a) =>
        String(a.AccountNo || "").includes(terms) ||
        (a.Description || "").toUpperCase().includes(terms)
    );
  }, [accounts, search]);

  const sortedAccounts = useMemo(() => {
    const keyFn = SORT_KEYS[sortKey] || SORT_KEYS.Description;
    return [...filteredAccounts].sort((a, b) => {
      const va = keyFn(a);
      const vb = keyFn(b);
      if (typeof va === "number" && typeof vb === "number") {
        return sortReverse ? vb - va : va - vb;
      }
      const cmp = String(va).localeCompare(String(vb));
      return sortReverse ? -cmp : cmp;
    });
  }, [filteredAccounts, sortKey, sortReverse]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortReverse((r) => !r);
    } else {
      setSortKey(key);
      setSortReverse(false);
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortReverse ? (
      <ArrowDown className="h-3.5 w-3.5" />
    ) : (
      <ArrowUp className="h-3.5 w-3.5" />
    );
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
      className="min-h-full text-foreground"
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
              <h1 className="text-3xl font-semibold text-foreground">
                Chart of Accounts
              </h1>
              <p className="mt-1 text-muted-foreground">
                Structured list of accounts to organize financial information.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:items-end">
            <DateRangeInput
              startDate={dates.startDate}
              endDate={dates.endDate}
              onStartDateChange={(val) =>
                setDates((d) => ({ ...d, startDate: val ? new Date(val + "T12:00:00") : d.startDate }))
              }
              onEndDateChange={(val) =>
                setDates((d) => ({ ...d, endDate: val ? new Date(val + "T12:00:00") : d.endDate }))
              }
              onDebouncedChange={handleDebouncedChange}
              startLabel=""
              endLabel=""
              inputClassName="rounded-lg border border-input bg-background px-3 py-2 text-sm w-auto"
            />
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
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </motion.div>

        <CreateAccountDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={fetchData}
          token={token}
        />

        <Card className="rounded-2xl border border-border/80 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Accounts
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by account # or description"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <CardDescription>
              MTD/YTD for selected period. Prior FY compares same month last year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : !accounts.length ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                There are no accounts for this selection.
              </p>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handleSort("Description")}
                          className="flex items-center gap-1.5 font-medium"
                        >
                          DESCRIPTION <SortIcon col="Description" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handleSort("AccountNo")}
                          className="flex items-center gap-1.5 font-medium"
                        >
                          ACCOUNT NO. <SortIcon col="AccountNo" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("current.MTD")}
                          className="flex items-center justify-end gap-1.5 font-medium ml-auto"
                        >
                          CURRENT MTD <SortIcon col="current.MTD" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("current.YTD")}
                          className="flex items-center justify-end gap-1.5 font-medium ml-auto"
                        >
                          CURRENT YTD <SortIcon col="current.YTD" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("prior.MTD")}
                          className="flex items-center justify-end gap-1.5 font-medium ml-auto"
                        >
                          PRIOR FY MTD <SortIcon col="prior.MTD" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("prior.YTD")}
                          className="flex items-center justify-end gap-1.5 font-medium ml-auto"
                        >
                          PRIOR FY YTD <SortIcon col="prior.YTD" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAccounts.map((account) => (
                      <TableRow key={account.AccountNo}>
                        <TableCell className="font-medium max-w-[200px]">
                          {account.Description ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-muted/20 px-2 py-0.5 font-mono text-xs">
                            {account.AccountNo ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(account.calculations?.current?.MTD)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(account.calculations?.current?.YTD)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono tabular-nums">
                            {formatCurrency(account.calculations?.prior?.MTD)}
                          </span>
                          {account.calculations?.diffMTD != null && (
                            <span
                              className={`ml-1 text-xs ${
                                account.calculations.diffMTD < 0
                                  ? "text-destructive"
                                  : "text-primary"
                              }`}
                            >
                              {formatPercent(account.calculations.diffMTD)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono tabular-nums">
                            {formatCurrency(account.calculations?.prior?.YTD)}
                          </span>
                          {account.calculations?.diffYTD != null && (
                            <span
                              className={`ml-1 text-xs ${
                                account.calculations.diffYTD < 0
                                  ? "text-destructive"
                                  : "text-primary"
                              }`}
                            >
                              {formatPercent(account.calculations.diffYTD)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
