"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  FileText,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getOpenPurchaseOrders } from "@/lib/api/purchase-order";
import { getBranches, getBranchDepts } from "@/lib/api/dispatch";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { PurchaseOrderSearchCombobox } from "@/components/PurchaseOrderSearchCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "";
  const num = parseFloat(n);
  return isNaN(num) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const BATCH_SIZE = 50;

export default function OpenPurchaseOrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [goToPo, setGoToPo] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();

  const branch = branchDeptFilter?.branches?.[0];
  const dept = branchDeptFilter?.depts?.[0];
  const useAllDepts = branchDeptFilter?.selectAllDepts || !dept;

  useEffect(() => {
    if (!token || !branch) return;
    setLoading(true);
    const branchNum = branch?.Number ?? branch;
    const deptNum = useAllDepts ? null : (dept?.Dept ?? dept);

    if (deptNum) {
      getOpenPurchaseOrders(deptNum, branchNum, token)
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    } else {
      getBranchDepts(branchNum, token)
        .then((depts) => {
          return Promise.all(
            depts.map((d) => getOpenPurchaseOrders(d.Dept, branchNum, token))
          );
        })
        .then((arrays) => {
          const seen = new Set();
          const merged = [];
          for (const arr of arrays) {
            for (const po of arr) {
              if (!seen.has(po.PONo)) {
                seen.add(po.PONo);
                merged.push(po);
              }
            }
          }
          setOrders(merged);
        })
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    }
  }, [token, branch, dept, useAllDepts]);

  const filtered = orders.filter((po) => {
    if (!filterText.trim()) return true;
    const t = filterText.toLowerCase();
    return (
      String(po.PONo ?? "").toLowerCase().includes(t) ||
      (po.VendorName ?? "").toLowerCase().includes(t) ||
      (po.Comments ?? "").toLowerCase().includes(t)
    );
  });

  const displayed = filtered.slice(0, displayedCount);
  const hasMore = displayedCount < filtered.length;

  useEffect(() => {
    setDisplayedCount(BATCH_SIZE);
  }, [filterText, orders]);

  const loadMore = useCallback(() => {
    setDisplayedCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const scrollRoot = scrollContainerRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: scrollRoot, rootMargin: "100px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleSelectPo = (po) => {
    if (po?.PONo) router.push(`/purchase-orders/${po.PONo}`);
  };

  const handleGoToPo = () => {
    const trimmed = goToPo?.trim();
    if (trimmed) router.push(`/purchase-orders/${trimmed}`);
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
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Open Purchase Orders
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              View and manage open purchase orders by branch and department.
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilter(!showFilter)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Branch / Dept
            </Button>
            {showFilter && token && (
              <BranchDeptFilter
                value={branchDeptFilter}
                onChange={setBranchDeptFilter}
                token={token}
              />
            )}
          </div>
          {showFilter && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-muted-foreground">Select a branch and optionally a department to filter open POs.</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-sm">Search</Label>
            <PurchaseOrderSearchCombobox
              token={token}
              onSelect={handleSelectPo}
              placeholder="Search by PO #, vendor..."
              includeClosed={false}
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Filter table</Label>
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter by PO #, vendor, comments..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Go to PO #</Label>
              <div className="flex gap-2">
                <Input
                  value={goToPo}
                  onChange={(e) => setGoToPo(e.target.value)}
                  placeholder="PO #"
                  onKeyDown={(e) => e.key === "Enter" && handleGoToPo()}
                  className="w-28"
                />
                <Button onClick={handleGoToPo} disabled={!goToPo?.trim()}>
                  Go
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden dark:border-slate-700/50 dark:bg-slate-800/50">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading open purchase orders...
            </div>
          ) : !branch ? (
            <div className="py-16 text-center text-muted-foreground">
              Select a branch to view open purchase orders.
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-slate-500 dark:text-slate-400">No open purchase orders found.</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new PO.</p>
            </div>
          ) : (
            <div ref={scrollContainerRef} className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                    <TableHead className="font-semibold bg-slate-50 dark:bg-slate-800/80">PO #</TableHead>
                    <TableHead className="font-semibold bg-slate-50 dark:bg-slate-800/80">Vendor</TableHead>
                    <TableHead className="font-semibold text-right bg-slate-50 dark:bg-slate-800/80">Amount</TableHead>
                    <TableHead className="font-semibold text-right bg-slate-50 dark:bg-slate-800/80">Line Items</TableHead>
                    <TableHead className="font-semibold bg-slate-50 dark:bg-slate-800/80">Vendor Date</TableHead>
                    <TableHead className="font-semibold bg-slate-50 dark:bg-slate-800/80">Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((po) => (
                    <TableRow
                      key={po.PONo}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => router.push(`/purchase-orders/${po.PONo}`)}
                    >
                      <TableCell className="font-semibold text-cyan-600 dark:text-cyan-400">
                        #{po.PONo}
                      </TableCell>
                      <TableCell>{po.VendorName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(po.amount)}
                      </TableCell>
                      <TableCell className="text-right">{po.items ?? "—"}</TableCell>
                      <TableCell>
                        <div>{formatDate(po.VendorPromiseDate)}</div>
                        {po.DateAdded && (
                          <div className="text-xs text-muted-foreground">Added: {formatDate(po.DateAdded)}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={po.Comments}>
                        {po.Comments ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-6"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-sm text-muted-foreground">
                Showing {displayed.length} of {filtered.length} purchase orders
              </p>
              {hasMore && (
                <p className="text-xs text-muted-foreground">Scroll down to load more</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
