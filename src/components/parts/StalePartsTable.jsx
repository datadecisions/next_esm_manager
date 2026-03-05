"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getStaleParts } from "@/lib/api/parts";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(n) {
  if (n == null || n === "") return "—";
  const num = parseFloat(n);
  return isNaN(num)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function StalePartsTable({ token }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    getStaleParts(undefined, token)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = data.filter((p) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      (p.PartNo ?? "").toLowerCase().includes(t) ||
      (p.Warehouse ?? "").toLowerCase().includes(t) ||
      (p.Name ?? "").toLowerCase().includes(t)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search stale parts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                <TableHead className="font-semibold">Warehouse</TableHead>
                <TableHead className="font-semibold">Part #</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Last Sell</TableHead>
                <TableHead className="font-semibold text-right">Pricing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No stale parts at the moment.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={`${row.PartNo}-${row.Warehouse}`}>
                    <TableCell>{row.Warehouse ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/parts/inventory/${encodeURIComponent(row.PartNo)}/${encodeURIComponent(row.Warehouse ?? "Main")}`}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        {row.PartNo}
                      </Link>
                    </TableCell>
                    <TableCell>{row.Name ?? "—"}</TableCell>
                    <TableCell>{formatDate(row.LastSell)}</TableCell>
                    <TableCell className="text-right text-sm">
                      <div>
                        Qty: {row.OnHand ?? "—"}
                        <br />
                        Avg Cost: {formatCurrency(row.AvgUnitCost)}
                        <br />
                        Avg Sell: {formatCurrency(row.AvgUnitSell)}
                        <br />
                        Value: {formatCurrency(row.SellValue)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
