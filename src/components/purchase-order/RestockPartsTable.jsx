"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Package } from "lucide-react";
import { getPartsToOrder } from "@/lib/api/parts";
import { getBranches } from "@/lib/api/dispatch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const RESTOCK_PARTS_KEY = "purchase-order-backorder-parts";

/**
 * Restock parts table – matches old app UX.
 * Part Groups Needing Restock (left): groups by PartsGroup, warehouses under each. Click to add/remove.
 * Part Groups Included in Reorder (right): selected groups + warehouses. Create Order button.
 */
export function RestockPartsTable({ token, className }) {
  const router = useRouter();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedPartGroups, setSelectedPartGroups] = useState({});
  const [recentOnly, setRecentOnly] = useState(false);

  useEffect(() => {
    if (!token) return;
    getBranches(token).then(setBranches).catch(() => setBranches([]));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedBranch) {
      queueMicrotask(() => {
        setParts([]);
        setSelectedPartGroups({});
      });
      return;
    }
    queueMicrotask(() => setLoading(true));
    const branchNum = selectedBranch?.Number ?? selectedBranch;
    const recent = recentOnly ? "1" : null;
    getPartsToOrder(branchNum, recent, token)
      .then(setParts)
      .then(() => setSelectedPartGroups({}))
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [token, selectedBranch, recentOnly]);

  const groupedOrders = useMemo(() => {
    const out = {};
    for (const p of parts) {
      const group = p.PartsGroup ?? "Other";
      if (!out[group]) out[group] = { warehouses: [], parts: [] };
      if (!out[group].warehouses.includes(p.Warehouse)) {
        out[group].warehouses.push(p.Warehouse);
      }
      out[group].parts.push(p);
    }
    return out;
  }, [parts]);

  const partGroups = useMemo(() => Object.keys(groupedOrders).sort(), [groupedOrders]);

  const addOrRemovePartGroup = (partGroup, warehouse) => {
    setSelectedPartGroups((prev) => {
      const next = { ...prev };
      const list = next[partGroup] ?? [];
      const idx = list.indexOf(warehouse);
      if (idx >= 0) {
        const newList = list.filter((_, i) => i !== idx);
        if (newList.length === 0) delete next[partGroup];
        else next[partGroup] = newList;
      } else {
        next[partGroup] = [...list, warehouse];
      }
      return next;
    });
  };

  const isSelected = (partGroup, warehouse) =>
    (selectedPartGroups[partGroup] ?? []).includes(warehouse);

  const selectedCount = Object.values(selectedPartGroups).reduce((a, arr) => a + arr.length, 0);

  const createPartsOrder = () => {
    const partsToOrder = [];
    for (const [partGroup, warehouses] of Object.entries(selectedPartGroups)) {
      if (!warehouses?.length) continue;
      const groupParts = groupedOrders[partGroup]?.parts ?? [];
      for (const p of groupParts) {
        if (warehouses.includes(p.Warehouse)) {
          partsToOrder.push({
            ...p,
            itemType: "part",
            CostEach: p.Cost ?? p.CostRate ?? p.BackorderCost,
            qtyToUse: p.QtyToOrder ?? p.Qty ?? 1,
          });
        }
      }
    }
    if (partsToOrder.length === 0) return;
    try {
      sessionStorage.setItem(RESTOCK_PARTS_KEY, JSON.stringify(partsToOrder));
    } catch {
      // ignore
    }
    router.push("/purchase-orders/new");
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="min-w-[200px]">
          <Label className="text-sm">Branch</Label>
          <Select
            value={selectedBranch ? String(selectedBranch.Number ?? selectedBranch) : ""}
            onValueChange={(v) => setSelectedBranch(branches.find((b) => String(b.Number ?? b) === v))}
          >
            <SelectTrigger className="mt-1">
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
        </div>
        {selectedBranch && (
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={recentOnly}
                onChange={(e) => setRecentOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              Recent only (used in last 2 days)
            </label>
          </div>
        )}
      </div>

      {!selectedBranch ? (
        <div className="py-16 text-center text-muted-foreground rounded-lg border border-dashed dark:border-slate-700">
          <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-2">Select a branch to view parts to order.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground rounded-lg border dark:border-slate-700">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading parts to order...
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Create Restock Purchase Order
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Part Groups Needing Restock
                </h3>
                <div className="space-y-4 max-h-[50vh] overflow-auto">
                  {partGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No parts to order for this branch.</p>
                  ) : (
                    partGroups.map((partGroup) => (
                      <div
                        key={partGroup}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 font-medium text-slate-900 dark:text-white">
                          {partGroup}
                        </div>
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {(groupedOrders[partGroup]?.warehouses ?? []).map((warehouse) => {
                            const sel = isSelected(partGroup, warehouse);
                            return (
                              <li
                                key={warehouse}
                                onClick={() => addOrRemovePartGroup(partGroup, warehouse)}
                                className={cn(
                                  "px-4 py-2 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                  sel && "bg-cyan-50 dark:bg-cyan-950/30 font-medium"
                                )}
                              >
                                {warehouse}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Part Groups Included in Reorder
                  </h3>
                  <Button
                    onClick={createPartsOrder}
                    disabled={selectedCount === 0}
                    className="gap-2 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Create Order
                  </Button>
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-auto">
                  {selectedCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Click warehouses in the left column to add them to the reorder.
                    </p>
                  ) : (
                    Object.entries(selectedPartGroups).map(([partGroup, warehouses]) =>
                      warehouses?.length ? (
                        <div
                          key={partGroup}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 font-medium text-slate-900 dark:text-white">
                            {partGroup}
                          </div>
                          <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {warehouses.map((warehouse) => (
                              <li
                                key={warehouse}
                                className="px-4 py-2 text-slate-700 dark:text-slate-300"
                              >
                                {warehouse}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
