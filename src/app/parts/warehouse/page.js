"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Warehouse, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getWarehouses, searchParts, searchAllParts } from "@/lib/api/parts";
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
import { fadeIn, fadeInUp } from "@/lib/motion";

function getWarehouseValue(w) {
  return String(w?.WebWarehouse ?? w?.Warehouse ?? w ?? "");
}

export default function PartsWarehousePage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [searchAll, setSearchAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [parts, setParts] = useState([]);
  const [allWarehouseParts, setAllWarehouseParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);

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

  const fetchWarehouseParts = useCallback(
    async (warehouse, query = "") => {
      if (!token || !warehouse) return;
      setLoading(true);
      try {
        const data = await searchParts(query, warehouse, token);
        setParts(data);
      } catch {
        setParts([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!searchAll && selectedWarehouse) {
      // Use "%" for "all parts" to match legacy (avoids double-slash URL issues)
      fetchWarehouseParts(selectedWarehouse, "%");
    } else if (searchAll) {
      setParts([]);
    }
  }, [searchAll, selectedWarehouse, fetchWarehouseParts]);

  useEffect(() => {
    if (!searchAll || !token) return;
    if (searchQuery.trim().length <= 3) {
      setAllWarehouseParts([]);
      setSearchingAll(false);
      return;
    }
    const t = setTimeout(() => {
      setSearchingAll(true);
      searchAllParts(searchQuery.trim(), token)
        .then(setAllWarehouseParts)
        .catch(() => setAllWarehouseParts([]))
        .finally(() => setSearchingAll(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchAll, searchQuery, token]);

  const filteredParts = useMemo(() => {
    if (searchAll) return allWarehouseParts;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter(
      (p) =>
        (p.PartNo ?? "").toLowerCase().includes(q) ||
        (p.Description ?? "").toLowerCase().includes(q) ||
        (p.Bin ?? "").toLowerCase().includes(q)
    );
  }, [searchAll, parts, allWarehouseParts, searchQuery]);

  const warehouseValue = selectedWarehouse ?? getWarehouseValue(warehouses[0]);
  const showSingleTable = !searchAll && (parts.length > 0 || loading);
  const showAllTable = searchAll && (allWarehouseParts.length > 0 || searchingAll);
  const showEmptySingle = !searchAll && !loading && parts.length === 0;
  const showEmptyAll = searchAll && !searchingAll && searchQuery.trim().length <= 3;
  const showNoMatchAll = searchAll && !searchingAll && searchQuery.trim().length > 3 && allWarehouseParts.length === 0;

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
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Warehouse
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Search for parts in a selected warehouse or across all warehouses.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="dark:border-slate-700 dark:bg-slate-800/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            {!searchAll && (
              <div className="flex-1 max-w-xs">
                <Label>Warehouse</Label>
                <Select
                  value={warehouseValue}
                  onValueChange={(v) => {
                    setSelectedWarehouse(v);
                    setParts([]);
                  }}
                >
                  <SelectTrigger className="mt-1">
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
            )}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  searchAll
                    ? "Search all warehouses (min 4 characters)"
                    : `Search in ${warehouseValue || "warehouse"}`
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="checkbox"
                id="search-all"
                checked={searchAll}
                onChange={(e) => {
                  const v = e.target.checked;
                  setSearchAll(v);
                  if (v) {
                    setAllWarehouseParts([]);
                  } else {
                    setSearchQuery("");
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="search-all" className="text-sm font-medium cursor-pointer">
                Search All Warehouses
              </Label>
            </div>
          </div>

          {(loading || searchingAll) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading…</span>
            </div>
          )}

          {showEmptySingle && (
            <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
              There are currently no parts in this warehouse.
            </div>
          )}

          {showEmptyAll && (
            <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
              Search for a part by part number or description (min 4 characters).
            </div>
          )}

          {showNoMatchAll && (
            <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
              No match found. Try another search.
            </div>
          )}

          {showSingleTable && (
            <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                    <TableHead className="font-semibold">Part No.</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Qty</TableHead>
                    <TableHead className="font-semibold">Bin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={`${part.PartNo}-${part.Warehouse}-${part.ID}`}>
                      <TableCell>
                        <Link
                          href={`/parts/inventory/${encodeURIComponent(part.PartNo)}/${encodeURIComponent(part.Warehouse ?? warehouseValue)}`}
                          className="text-cyan-600 hover:underline dark:text-cyan-400"
                        >
                          {part.PartNo}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={part.Description}>
                        {part.Description}
                      </TableCell>
                      <TableCell>{part.Qty ?? part.OnHand ?? "—"}</TableCell>
                      <TableCell>{part.Bin ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {showAllTable && (
            <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                    <TableHead className="font-semibold">Part No.</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Warehouse</TableHead>
                    <TableHead className="font-semibold">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={`${part.PartNo}-${part.Warehouse}`}>
                      <TableCell>
                        <Link
                          href={`/parts/inventory/${encodeURIComponent(part.PartNo)}/${encodeURIComponent(part.Warehouse ?? "")}`}
                          className="text-cyan-600 hover:underline dark:text-cyan-400"
                        >
                          {part.PartNo}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={part.Description}>
                        {part.Description}
                      </TableCell>
                      <TableCell>{part.Warehouse ?? "—"}</TableCell>
                      <TableCell>{part.OnHand ?? "—"}</TableCell>
                    </TableRow>
                  ))}
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
