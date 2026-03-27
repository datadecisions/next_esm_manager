"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  Check,
  X,
  Plus,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getWarehouses,
  getActiveCounts,
  getCountSearch,
  updateCount,
  updateCountHeader,
  createInventoryCount,
} from "@/lib/api/parts";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function getWarehouseValue(w) {
  return String(w?.WebWarehouse ?? w?.Warehouse ?? w ?? "");
}

export default function PartsCountPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [counts, setCounts] = useState([]);
  const [activeCount, setActiveCount] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideNew, setHideNew] = useState(false);
  const [hideZero, setHideZero] = useState(false);
  const [sortProp, setSortProp] = useState("Description");
  const [sortReverse, setSortReverse] = useState(false);
  const [editingQty, setEditingQty] = useState(null); // { partNo, warehouse, value }

  useEffect(() => {
    if (!token) return;
    getWarehouses(token)
      .then((data) => {
        setWarehouses(data);
        if (data.length > 0) {
          const first = getWarehouseValue(data[0]);
          setSelectedWarehouse((prev) => prev || first);
        }
      })
      .catch(() => setWarehouses([]));
  }, [token]);

  const loadCounts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getActiveCounts(token);
      const normalized = data.map((c) => ({
        ...c,
        InventoryID: c.InventoryID ?? c.InvHeaderID ?? c,
        hideNew: c.ExcludeNew === -1,
        hideZero: c.ExcludeDelete === -1,
      }));
      setCounts(normalized);
      setActiveCount((prev) => {
        if (normalized.length > 0 && !prev) return normalized[0];
        if (prev && normalized.some((n) => (n.InventoryID ?? n.InvHeaderID) === (prev.InventoryID ?? prev.InvHeaderID))) return prev;
        return normalized[0] ?? null;
      });
    } catch {
      setCounts([]);
    }
  }, [token]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const loadParts = useCallback(async () => {
    if (!token || !activeCount?.InventoryID) {
      setParts([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getCountSearch(activeCount.InventoryID, token);
      setParts(data);
      setHideNew(activeCount.hideNew ?? false);
      setHideZero(activeCount.hideZero ?? false);
    } catch {
      setParts([]);
    } finally {
      setLoading(false);
    }
  }, [token, activeCount?.InventoryID, activeCount?.hideNew, activeCount?.hideZero]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const handleActiveCountChange = (inventoryId) => {
    const c = counts.find((x) => (x.InventoryID ?? x.InvHeaderID) === inventoryId);
    setActiveCount(c ?? null);
  };

  const handleAddCount = async () => {
    const warehouse = selectedWarehouse || getWarehouseValue(warehouses[0]);
    if (!token || !warehouse) return;
    const now = new Date();
    const inventoryId = `${warehouse}${now.getMonth() + 1}${now.getFullYear()}`;
    const existing = counts.some(
      (c) => (c.InventoryID ?? c.InvHeaderID) === inventoryId
    );
    if (existing) {
      toast.error(
        `Inventory count ${inventoryId} already exists. Look for it in the active count list.`
      );
      return;
    }
    try {
      await createInventoryCount(
        {
          InventoryID: inventoryId,
          Warehouse1: warehouse,
          ExcludeNew: 0,
          ExcludeDelete: 0,
        },
        token
      );
      toast.success("New inventory count created.");
      await loadCounts();
    } catch (err) {
      toast.error(err?.message || "Failed to create inventory count");
    }
  };

  const handleCheckInventory = async (part, pass) => {
    if (!token || !activeCount) return;
    part.answer = pass;
    try {
      await updateCount(
        {
          InventoryID: activeCount.InventoryID,
          Warehouse: part.Warehouse,
          PartNo: part.PartNo,
          Count: pass ? part.OnHand : part.inventoryCount ?? part.OnHand,
        },
        token
      );
      setParts((prev) =>
        prev.map((p) =>
          p.PartNo === part.PartNo && p.Warehouse === part.Warehouse
            ? { ...p, answer: pass }
            : p
        )
      );
    } catch {
      toast.error("Failed to update count");
    }
  };

  const handleUpdateCount = async (part, value) => {
    if (!token || !activeCount) return;
    const num = parseInt(value, 10);
    if (isNaN(num) && value !== "") return;
    try {
      await updateCount(
        {
          InventoryID: activeCount.InventoryID,
          Warehouse: part.Warehouse,
          PartNo: part.PartNo,
          Count: isNaN(num) ? part.OnHand : num,
        },
        token
      );
      setParts((prev) =>
        prev.map((p) =>
          p.PartNo === part.PartNo && p.Warehouse === part.Warehouse
            ? { ...p, inventoryCount: value, answer: false }
            : p
        )
      );
    } catch {
      toast.error("Failed to update count");
    }
  };

  const handleHeaderChange = async (nextHideNew, nextHideZero) => {
    if (!token || !activeCount) return;
    setHideNew(nextHideNew);
    setHideZero(nextHideZero);
    try {
      await updateCountHeader(
        {
          InventoryID: activeCount.InventoryID,
          ExcludeNew: nextHideNew ? -1 : 0,
          ExcludeDelete: nextHideZero ? -1 : 0,
        },
        token
      );
      setCounts((prev) =>
        prev.map((c) =>
          (c.InventoryID ?? c.InvHeaderID) === activeCount.InventoryID
            ? { ...c, hideNew: nextHideNew, hideZero: nextHideZero }
            : c
        )
      );
    } catch {
      toast.error("Failed to update filters");
    }
  };

  const filteredParts = useMemo(() => {
    let list = parts;
    const binVal = (p) => p.BinLocation ?? p.Bin ?? "";
    if (hideNew) list = list.filter((p) => binVal(p) !== "New");
    if (hideZero) list = list.filter((p) => (p.OnHand ?? 0) !== 0);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.PartNo ?? "").toLowerCase().includes(q) ||
          (p.Description ?? "").toLowerCase().includes(q) ||
          binVal(p).toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortProp] ?? "";
      const bv = b[sortProp] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortReverse ? -cmp : cmp;
    });
    return list;
  }, [parts, hideNew, hideZero, searchQuery, sortProp, sortReverse]);

  const toggleSort = (prop) => {
    if (sortProp === prop) setSortReverse((r) => !r);
    else {
      setSortProp(prop);
      setSortReverse(false);
    }
  };

  const warehouseValue =
    selectedWarehouse || getWarehouseValue(warehouses[0]);
  const activeCountId = activeCount?.InventoryID ?? activeCount?.InvHeaderID ?? "";

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
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
              <ClipboardList className="h-5 w-5" />
              Parts Count
            </h1>
            <p className="mt-1 text-muted-foreground">
              Perform inventory counts for a selected warehouse.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="border-border bg-card text-card-foreground">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <Label className="text-sm font-medium">Warehouse</Label>
                    <Select
                      value={warehouseValue}
                      onValueChange={(v) => {
                        setSelectedWarehouse(v);
                      }}
                    >
                      <SelectTrigger className="mt-1 w-[180px]">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => {
                          const val = getWarehouseValue(w);
                          if (!val) return null;
                          return (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Active counts</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Select
                        value={activeCountId}
                        onValueChange={handleActiveCountChange}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select count" />
                        </SelectTrigger>
                        <SelectContent>
                          {counts.map((c) => {
                            const id = c.InventoryID ?? c.InvHeaderID ?? "";
                            if (!id) return null;
                            return (
                              <SelectItem key={id} value={id}>
                                {id}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleAddCount}
                        title="New Inventory Count"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {activeCount && (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for parts"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideNew}
                        onChange={(e) =>
                          handleHeaderChange(e.target.checked, hideZero)
                        }
                        className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="text-sm">Hide New</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideZero}
                        onChange={(e) =>
                          handleHeaderChange(hideNew, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="text-sm">Hide Zero Qty</span>
                    </label>
                  </div>
                )}
              </div>

              {!activeCount && counts.length === 0 && !loading && (
                <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
                  No active counts. Create one using the + button.
                </div>
              )}

              {!activeCount && counts.length > 0 && (
                <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
                  Select an active count from the dropdown.
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading parts…</span>
                </div>
              )}

              {activeCount && !loading && parts.length === 0 && (
                <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
                  There are no parts in this inventory count.
                </div>
              )}

              {activeCount && !loading && filteredParts.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[100px] font-semibold">
                          Action
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer hover:underline"
                          onClick={() => toggleSort("PartNo")}
                        >
                          Part No.
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer hover:underline"
                          onClick={() => toggleSort("Description")}
                        >
                          Description
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer hover:underline"
                          onClick={() => toggleSort("OnHand")}
                        >
                          Qty
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer hover:underline"
                          onClick={() => toggleSort("BinLocation")}
                        >
                          Bin
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParts.map((part) => {
                        const bin = part.BinLocation ?? part.Bin ?? "—";
                        const wh = part.Warehouse ?? warehouseValue;
                        return (
                          <TableRow
                            key={`${part.PartNo}-${part.Warehouse}-${part.ID ?? ""}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant={
                                    part.answer === true ? "default" : "ghost"
                                  }
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleCheckInventory(part, true)
                                  }
                                  title="Pass"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant={
                                    part.answer === false ? "destructive" : "ghost"
                                  }
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleCheckInventory(part, false)
                                  }
                                  title="Fail"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/parts/inventory/${encodeURIComponent(part.PartNo)}/${encodeURIComponent(wh)}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {part.PartNo}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate" title={part.Description}>
                              {part.Description}
                            </TableCell>
                            <TableCell>
                              {part.answer === false ? (
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  value={
                                    editingQty?.partNo === part.PartNo &&
                                    editingQty?.warehouse === part.Warehouse
                                      ? editingQty.value
                                      : String(part.inventoryCount ?? part.OnHand ?? "")
                                  }
                                  onChange={(e) =>
                                    setEditingQty({
                                      partNo: part.PartNo,
                                      warehouse: part.Warehouse,
                                      value: e.target.value,
                                    })
                                  }
                                  onBlur={(e) => {
                                    handleUpdateCount(part, e.target.value);
                                    setEditingQty(null);
                                  }}
                                  onFocus={() =>
                                    setEditingQty({
                                      partNo: part.PartNo,
                                      warehouse: part.Warehouse,
                                      value: String(part.inventoryCount ?? part.OnHand ?? ""),
                                    })
                                  }
                                />
                              ) : (
                                part.OnHand ?? "—"
                              )}
                            </TableCell>
                            <TableCell>{bin}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
