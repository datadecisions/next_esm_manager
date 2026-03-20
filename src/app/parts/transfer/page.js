"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  Plus,
  Search,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getWarehouses,
  searchParts,
  transferParts,
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

export default function PartsTransferPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [warehouses, setWarehouses] = useState([]);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortProp, setSortProp] = useState("Description");
  const [sortReverse, setSortReverse] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!token) return;
    getWarehouses(token)
      .then((data) => {
        setWarehouses(data);
        if (data.length > 0) {
          const first = getWarehouseValue(data[0]);
          setFromWarehouse((prev) => prev || first);
        }
      })
      .catch(() => setWarehouses([]));
  }, [token]);

  const loadParts = useCallback(async () => {
    if (!token || !fromWarehouse) return;
    setLoading(true);
    try {
      const data = await searchParts("%", fromWarehouse, token);
      setParts(data.map((p) => ({ ...p, answer: false, transferQty: p.Qty ?? p.OnHand ?? 0, transferToWarehouse: "" })));
    } catch {
      setParts([]);
    } finally {
      setLoading(false);
    }
  }, [token, fromWarehouse]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const handleCheckInventory = (part, include) => {
    setParts((prev) =>
      prev.map((p) =>
        p.PartNo === part.PartNo && (p.Warehouse ?? "") === (part.Warehouse ?? "")
          ? { ...p, answer: include }
          : p
      )
    );
  };

  const handleTransferQtyChange = (part, value) => {
    const num = parseInt(value, 10);
    setParts((prev) =>
      prev.map((p) =>
        p.PartNo === part.PartNo && (p.Warehouse ?? "") === (part.Warehouse ?? "")
          ? { ...p, transferQty: isNaN(num) ? 0 : num }
          : p
      )
    );
  };

  const handleToWarehouseChange = (part, toWh) => {
    setParts((prev) =>
      prev.map((p) =>
        p.PartNo === part.PartNo && (p.Warehouse ?? "") === (part.Warehouse ?? "")
          ? { ...p, transferToWarehouse: toWh }
          : p
      )
    );
  };

  const handleCreateTransfer = async () => {
    const toTransfer = parts.filter((p) => p.answer && p.transferToWarehouse);
    if (toTransfer.length === 0) {
      toast.error("Select parts and choose a destination warehouse for each.");
      return;
    }
    if (!token) return;
    setTransferring(true);
    try {
      await Promise.all(
        toTransfer.map((item) =>
          transferParts(
            {
              Qty: item.transferQty ?? item.Qty ?? item.OnHand ?? 0,
              PartNo: item.PartNo,
              Warehouse: item.Warehouse ?? fromWarehouse,
              toWarehouse: item.transferToWarehouse,
            },
            token
          )
        )
      );
      toast.success("Transfer complete.");
      loadParts();
    } catch (err) {
      toast.error(err?.message || "Failed to transfer parts");
    } finally {
      setTransferring(false);
    }
  };

  const filteredParts = useMemo(() => {
    const list = parts;
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (p) =>
            (p.PartNo ?? "").toLowerCase().includes(q) ||
            (p.Description ?? "").toLowerCase().includes(q)
        )
      : list;
    return [...filtered].sort((a, b) => {
      const av = a[sortProp] ?? "";
      const bv = b[sortProp] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortReverse ? -cmp : cmp;
    });
  }, [parts, searchQuery, sortProp, sortReverse]);

  const toggleSort = (prop) => {
    if (sortProp === prop) setSortReverse((r) => !r);
    else {
      setSortProp(prop);
      setSortReverse(false);
    }
  };

  const warehouseValue = fromWarehouse || getWarehouseValue(warehouses[0]);
  const toTransferCount = parts.filter((p) => p.answer && p.transferToWarehouse).length;

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-background text-foreground"
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
              <ArrowRightLeft className="h-5 w-5" />
              Transfer
            </h1>
            <p className="mt-1 text-muted-foreground">
              Move parts between warehouses.
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Transfer from</Label>
                  <Select
                    value={warehouseValue}
                    onValueChange={(v) => {
                      setFromWarehouse(v);
                      setParts([]);
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
                <Button
                  onClick={handleCreateTransfer}
                  disabled={toTransferCount === 0 || transferring}
                  className="shrink-0"
                >
                  {transferring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-2" />
                  Create Transfer
                  {toTransferCount > 0 && ` (${toTransferCount})`}
                </Button>
              </div>

              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for parts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading parts...</span>
                </div>
              )}

              {!loading && parts.length === 0 && fromWarehouse && (
                <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
                  No parts in this warehouse.
                </div>
              )}

              {!loading && filteredParts.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[80px] font-semibold">Action</TableHead>
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
                          onClick={() => toggleSort("Qty")}
                        >
                          Qty
                        </TableHead>
                        <TableHead className="font-semibold">To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParts.map((part) => {
                        const qty = part.Qty ?? part.OnHand ?? 0;
                        const wh = part.Warehouse ?? warehouseValue;
                        return (
                          <TableRow
                            key={`${part.PartNo}-${wh}-${part.ID ?? ""}`}
                          >
                            <TableCell>
                              <Button
                                size="icon"
                                variant={part.answer ? "default" : "ghost"}
                                className="h-8 w-8"
                                onClick={() => handleCheckInventory(part, !part.answer)}
                                title={part.answer ? "Remove from transfer" : "Include in transfer"}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
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
                              {part.answer ? (
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  min={1}
                                  max={qty}
                                  value={part.transferQty ?? qty}
                                  onChange={(e) =>
                                    handleTransferQtyChange(part, e.target.value)
                                  }
                                />
                              ) : (
                                qty
                              )}
                            </TableCell>
                            <TableCell>
                              {part.answer ? (
                                <Select
                                  value={part.transferToWarehouse}
                                  onValueChange={(v) => handleToWarehouseChange(part, v)}
                                >
                                  <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue placeholder="Select warehouse" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {warehouses
                                      .filter((w) => getWarehouseValue(w) !== wh)
                                      .map((w) => {
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
                              ) : (
                                "-"
                              )}
                            </TableCell>
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
