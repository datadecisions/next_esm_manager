"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { getBackOrderedParts } from "@/lib/api/purchase-order";
import { Button } from "@/components/ui/button";
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

const BACKORDER_PARTS_KEY = "purchase-order-backorder-parts";

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

/**
 * Reusable Back Ordered Parts table.
 * Shows parts from WOs that are back ordered. Users can select parts and create a PO.
 * @param {object} props
 * @param {string} props.token - Auth token
 * @param {string} [props.className] - Optional wrapper class
 */
export function BackOrderedPartsTable({ token, className }) {
  const router = useRouter();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (!token) return;
    getBackOrderedParts(token)
      .then(setParts)
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [token]);

  const togglePart = (part) => {
    const key = `${part.PartNo}|${part.Warehouse}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const createPartsOrder = () => {
    const partsToOrder = parts.filter((p) => selected.has(`${p.PartNo}|${p.Warehouse}`));
    if (partsToOrder.length === 0) return;
    const toStore = partsToOrder.map((p) => ({
      ...p,
      itemType: "part",
      CostEach: p.BackorderCost ?? p.CostRate ?? p.Cost,
      qtyToUse: p.BOQty ?? p.Qty ?? 1,
    }));
    try {
      sessionStorage.setItem(BACKORDER_PARTS_KEY, JSON.stringify(toStore));
    } catch {
      // ignore
    }
    router.push("/purchase-orders/new");
  };

  const filtered = parts.filter((p) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      (p.PartNo ?? "").toLowerCase().includes(t) ||
      (p.Description ?? "").toLowerCase().includes(t) ||
      (p.Warehouse ?? "").toLowerCase().includes(t)
    );
  });

  const selectedCount = filtered.filter((p) => selected.has(`${p.PartNo}|${p.Warehouse}`)).length;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Input
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={createPartsOrder}
          disabled={selectedCount === 0}
          className="gap-2 w-fit"
        >
          <Plus className="h-4 w-4" />
          Create Parts Order {selectedCount > 0 && `(${selectedCount})`}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10"></TableHead>
                <TableHead className="font-semibold">Part #</TableHead>
                <TableHead className="font-semibold">Warehouse</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold text-right">Qty</TableHead>
                <TableHead className="font-semibold">WO&apos;s Requesting</TableHead>
                <TableHead className="font-semibold text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((part) => {
                const key = `${part.PartNo}|${part.Warehouse}`;
                const isSelected = selected.has(key);
                const isExpanded = expandedRows.has(key);
                const wos = part.WOs ?? [];
                return (
                  <TableRow
                    key={key}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected && "bg-primary/10"
                    )}
                    onClick={() => togglePart(part)}
                  >
                    <TableCell>
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center",
                          isSelected ? "border-primary bg-primary" : "border-input bg-background"
                        )}
                      >
                        {isSelected && <span className="text-xs text-primary-foreground">✓</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{part.PartNo}</TableCell>
                    <TableCell>{part.Warehouse ?? "—"}</TableCell>
                    <TableCell>{part.Description ?? "—"}</TableCell>
                    <TableCell>{formatDate(part.EntryDate)}</TableCell>
                    <TableCell className="text-right">{part.Qty ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span>{wos.length}</span>
                        {wos.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRows((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                            }}
                            className="rounded p-0.5 hover:bg-muted"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                        {isExpanded && wos.length > 0 && (
                          <div className="w-full flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                            {wos.map((wo) => (
                              <a
                                key={wo.WONo}
                                href={`/work-orders/${wo.WONo}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-primary hover:underline"
                              >
                                #{wo.WONo}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(part.BackorderCost ?? part.CostRate ?? part.Cost)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} part{filtered.length !== 1 ? "s" : ""}
              {selectedCount > 0 && ` · ${selectedCount} selected`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { BACKORDER_PARTS_KEY };
