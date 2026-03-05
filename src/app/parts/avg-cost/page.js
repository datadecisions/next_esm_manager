"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, Loader2, Pencil, Check, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getWarehouses, getAvgCostParts, updateAvgCost } from "@/lib/api/parts";
import { NewInventoryCountDialog } from "@/components/parts/NewInventoryCountDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function formatCurrency(n) {
  if (n == null || n === "") return "—";
  const num = parseFloat(n);
  return isNaN(num)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export default function PartsAvgCostPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPart, setEditingPart] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [countDialogOpen, setCountDialogOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    getWarehouses(token)
      .then((data) => {
        setWarehouses(data);
        if (data.length > 0) {
          setSelectedWarehouse((prev) => prev || (data[0].WebWarehouse ?? data[0].Warehouse ?? ""));
        }
      })
      .catch(() => setWarehouses([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAvgCostParts(token)
      .then(setParts)
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [token]);

  const warehouseValue = selectedWarehouse ?? warehouses[0]?.WebWarehouse ?? warehouses[0]?.Warehouse ?? "";

  const filteredParts = useMemo(() => {
    let list = parts.filter((p) => (p.Warehouse ?? "") === warehouseValue);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.PartNo ?? "").toLowerCase().includes(t) ||
          (p.Description ?? "").toLowerCase().includes(t)
      );
    }
    return list;
  }, [parts, warehouseValue, search]);

  const handleStartEdit = (part) => {
    setEditingPart(`${part.PartNo}|${part.Warehouse}`);
    setEditValue(String(part.AvgCost ?? part.AvgUnitCost ?? ""));
  };

  const handleCancelEdit = () => {
    setEditingPart(null);
    setEditValue("");
  };

  const handleSave = async (part) => {
    if (!token) return;
    setSaving(true);
    try {
      await updateAvgCost(
        {
          Warehouse: part.Warehouse,
          PartNo: part.PartNo,
          AvgCost: parseFloat(editValue) || 0,
        },
        token
      );
      setParts((prev) =>
        prev.map((p) =>
          p.PartNo === part.PartNo && p.Warehouse === part.Warehouse
            ? { ...p, AvgCost: parseFloat(editValue) || 0 }
            : p
        )
      );
      toast.success("Avg cost updated");
      handleCancelEdit();
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Parts Avg Cost
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Adjust average cost for parts by warehouse.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div>
                  <Label>Warehouse</Label>
                <Select
                  value={warehouseValue}
                  onValueChange={(v) => setSelectedWarehouse(v)}
                >
                  <SelectTrigger className="w-full sm:w-[220px] mt-1">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => {
                      const val = w.WebWarehouse ?? w.Warehouse ?? w;
                      return (
                        <SelectItem key={val} value={val}>
                          {typeof val === "string" ? val : w.WebWarehouse ?? w.Warehouse ?? ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
                <div className="flex-1">
                  <Label>Search</Label>
                  <Input
                    placeholder="Search parts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setCountDialogOpen(true)}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Inventory Count
              </Button>
            </div>
          </div>

          <NewInventoryCountDialog
            open={countDialogOpen}
            onOpenChange={setCountDialogOpen}
            warehouses={warehouses}
            token={token}
          />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                      <TableHead className="w-24 font-semibold">Action</TableHead>
                      <TableHead className="font-semibold">Part #</TableHead>
                      <TableHead className="font-semibold">Avg Cost</TableHead>
                      <TableHead className="font-semibold">Warehouse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No parts in this warehouse.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredParts.map((part) => {
                        const key = `${part.PartNo}|${part.Warehouse}`;
                        const isEditing = editingPart === key;
                        return (
                          <TableRow key={key}>
                            <TableCell>
                              {!isEditing ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 h-8"
                                  onClick={() => handleStartEdit(part)}
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handleSave(part)}
                                    disabled={saving}
                                  >
                                    {saving ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <Link
                                href={`/parts/inventory/${encodeURIComponent(part.PartNo)}/${encodeURIComponent(part.Warehouse ?? "Main")}`}
                                className="text-cyan-600 dark:text-cyan-400 hover:underline"
                              >
                                {part.PartNo}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 h-8"
                                  autoFocus
                                />
                              ) : (
                                formatCurrency(part.AvgCost ?? part.AvgUnitCost)
                              )}
                            </TableCell>
                            <TableCell>{part.Warehouse ?? "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
