"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { getConsignmentOrders } from "@/lib/api/parts";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";

export function ConsignmentsTable({ token }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    if (!token) return;
    getConsignmentOrders(token)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = data.filter((row) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    const ref = row.reference ?? row.Reference ?? "";
    const inv = row.invoice_number ?? row.InvoiceNumber ?? "";
    return (
      String(ref).toLowerCase().includes(t) ||
      String(inv).toLowerCase().includes(t)
    );
  });

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        placeholder="Search consignments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                <TableHead className="w-10"></TableHead>
                <TableHead className="font-semibold">Reference</TableHead>
                <TableHead className="font-semibold">Count</TableHead>
                <TableHead className="font-semibold text-right">Price</TableHead>
                <TableHead className="font-semibold">Invoice</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No consignment orders.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const id = row.id ?? row.reference ?? row.Reference ?? "";
                  const isExpanded = expanded.has(id);
                  return (
                    <TableRow
                      key={id}
                      className="cursor-pointer"
                      onClick={() => toggleExpand(id)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.reference ?? row.Reference ?? "—"}
                      </TableCell>
                      <TableCell>{row.length ?? row.Count ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.price ?? row.Price)}
                      </TableCell>
                      <TableCell>{row.invoice_number ?? row.InvoiceNumber ?? "—"}</TableCell>
                      <TableCell>{formatDate(row.date_created ?? row.DateCreated)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
