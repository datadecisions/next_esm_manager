"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getPartsToOrder } from "@/lib/api/parts";
import { getBranches } from "@/lib/api/dispatch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(n) {
  if (n == null || n === "") return "";
  const num = parseFloat(n);
  return isNaN(num) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function RestockPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    if (!token) return;
    getBranches(token).then(setBranches).catch(() => setBranches([]));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedBranch) {
      setParts([]);
      return;
    }
    setLoading(true);
    const branchNum = selectedBranch?.Number ?? selectedBranch;
    getPartsToOrder(branchNum, null, token)
      .then(setParts)
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [token, selectedBranch]);

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
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Restock
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Parts to order by branch for inventory replenishment.
            </p>
          </div>
          <Button onClick={() => router.push("/purchase-orders/new")} className="gap-2 w-fit">
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        </motion.div>

        <motion.div
          className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Label className="text-sm">Branch</Label>
          <Select
            value={selectedBranch ? String(selectedBranch.Number ?? selectedBranch) : ""}
            onValueChange={(v) => setSelectedBranch(branches.find((b) => String(b.Number ?? b) === v))}
          >
            <SelectTrigger className="mt-1 max-w-xs">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.Number ?? b} value={String(b.Number ?? b)}>
                  {b.Number}: {b.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden dark:border-slate-700/50 dark:bg-slate-800/50"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.1 }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading parts to order...
            </div>
          ) : !selectedBranch ? (
            <div className="py-16 text-center text-muted-foreground">
              Select a branch to view parts to order.
            </div>
          ) : parts.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-slate-500 dark:text-slate-400">No parts to order for this branch.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new purchase order and add parts manually.
              </p>
              <Button onClick={() => router.push("/purchase-orders/new")} className="mt-4 gap-2">
                New Purchase Order
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                      <TableHead className="font-semibold">Part #</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Warehouse</TableHead>
                      <TableHead className="font-semibold text-right">Qty</TableHead>
                      <TableHead className="font-semibold text-right">Cost</TableHead>
                      <TableHead className="font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((p, i) => (
                      <TableRow key={`${p.PartNo}-${p.Warehouse}-${i}`}>
                        <TableCell className="font-medium">{p.PartNo}</TableCell>
                        <TableCell>{p.Description ?? "—"}</TableCell>
                        <TableCell>{p.Warehouse ?? "—"}</TableCell>
                        <TableCell className="text-right">{p.Qty ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.Cost ?? p.BackorderCost)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/purchase-orders/new")}
                          >
                            Add to PO
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <p className="text-sm text-muted-foreground">
                  {parts.length} part{parts.length !== 1 ? "s" : ""} to order
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
