"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { addPartToOrder, addPartToOrderReserved, searchParts, getWarehouses } from "@/lib/api/parts";
import { getSectionsList } from "@/lib/api/work-order";

/** Search API returns OnHand as Count (MSSQL); Qty may be lower when open web part requests hold stock. */
function partSearchStockHint(part) {
  const onHand = part.OnHand ?? part.Count;
  const nOh =
    onHand !== undefined && onHand !== null && onHand !== ""
      ? Number(onHand)
      : NaN;
  const nQty =
    part.Qty !== undefined && part.Qty !== null && part.Qty !== ""
      ? Number(part.Qty)
      : NaN;
  if (!Number.isFinite(nOh) && !Number.isFinite(nQty)) return null;
  if (Number.isFinite(nOh) && Number.isFinite(nQty) && nQty !== nOh) {
    return {
      text: `${nOh} on hand · ${nQty} avail.`,
      title:
        "Physical on hand in this warehouse vs. available after open technician part requests.",
    };
  }
  if (Number.isFinite(nOh)) {
    return { text: `${nOh} on hand`, title: "Quantity on hand in this warehouse" };
  }
  if (Number.isFinite(nQty)) {
    return { text: `${nQty} avail.`, title: "Available quantity" };
  }
  return null;
}

/** Parts search includes BackOrder from inventory (qty or flag depending on data). */
function partSearchBackOrderHint(part) {
  const bo = part.BackOrder;
  if (bo === undefined || bo === null || bo === "") return null;
  const n = Number(bo);
  if (Number.isFinite(n)) {
    if (n <= 0) return null;
    return {
      text: n === 1 ? "1 on back order" : `${n} on back order`,
      title: "Reported back-order quantity for this part in this warehouse.",
    };
  }
  const s = String(bo).trim().toLowerCase();
  if (s === "y" || s === "yes" || s === "true") {
    return {
      text: "On back order",
      title: "This part is flagged on back order for this warehouse.",
    };
  }
  return null;
}

export default function AddPartDialog({ open, onOpenChange, wo, token, onSuccess }) {
  const [warehouses, setWarehouses] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  /** When true (default), uses POST /parts/post_reserved (Allocated only until pick). Uncheck for immediate OnHand issue. */
  const [reserveInventory, setReserveInventory] = useState(true);

  const [form, setForm] = useState({
    PartNo: "",
    Warehouse: "",
    Qty: 1,
    Section: "",
  });

  const timeoutRef = useRef(null);
  const searchDebounce = useCallback(
    (query, warehouse) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!query || query.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      timeoutRef.current = setTimeout(async () => {
        if (!token) return;
        setSearching(true);
        try {
          const results = await searchParts(query, warehouse || undefined, token);
          setSearchResults(Array.isArray(results) ? results : []);
          setShowSearchResults(true);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [token]
  );

  useEffect(() => {
    if (!open || !token) return;
    setForm({
      PartNo: "",
      Warehouse: "",
      Qty: 1,
      Section: "",
    });
    setSearchResults([]);
    setShowSearchResults(false);
    setError(null);
    setReserveInventory(true);
  }, [open, token]);

  useEffect(() => {
    if (!token || !open) return;
    setLoading(true);
    Promise.all([
      getWarehouses(token),
      wo?.WONo ? getSectionsList(wo.WONo, token) : Promise.resolve([]),
    ])
      .then(([whs, secs]) => {
        const whList = Array.isArray(whs) ? whs : [];
        setWarehouses(whList);
        setSections(Array.isArray(secs) ? secs : []);
        if (whList.length > 0) {
          const main = whList.find((w) => (w.Warehouse ?? w).toString().toLowerCase() === "main") ?? whList[0];
          const defWh = main.Warehouse ?? main;
          setForm((p) => (p.Warehouse ? p : { ...p, Warehouse: defWh }));
        }
      })
      .catch(() => {
        setWarehouses([]);
        setSections([]);
      })
      .finally(() => setLoading(false));
  }, [token, wo?.WONo, open]);

  const handlePartNoChange = (val) => {
    setForm((p) => ({ ...p, PartNo: val }));
    searchDebounce(val, form.Warehouse);
  };

  const handleSelectPart = (part) => {
    setForm((p) => ({
      ...p,
      PartNo: part.PartNo ?? part.RequestedPartNo ?? "",
      Warehouse: part.Warehouse ?? p.Warehouse,
    }));
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wo?.WONo || !token) return;
    const partNo = (form.PartNo || "").trim();
    if (!partNo) {
      setError("Please enter a part number.");
      return;
    }
    if (!form.Warehouse) {
      setError("Please select a warehouse.");
      return;
    }
    const qty = parseInt(form.Qty, 10);
    if (isNaN(qty) || qty < 1) {
      setError("Please enter a valid quantity.");
      return;
    }
    const section = (form.Section === "__none__" || (typeof form.Section === "string" && form.Section.startsWith("__empty_"))) ? "" : (form.Section || "").trim();
    setSaving(true);
    setError(null);
    const payload = {
      WONo: wo.WONo,
      PartNo: partNo,
      Warehouse: form.Warehouse,
      Qty: qty,
      Section: section,
      RepairCode: section,
    };
    try {
      if (reserveInventory) {
        await addPartToOrderReserved(payload, token);
        toast.success("Part added (reserved — pick when pulled from shelf)");
      } else {
        await addPartToOrder(payload, token);
        toast.success("Part added");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Failed to add part");
      toast.error(err?.message || "Failed to add part");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Part to Work Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="partNo">Part number</Label>
            <div className="relative">
              <Input
                id="partNo"
                value={form.PartNo}
                onChange={(e) => handlePartNoChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Type to search or enter part #"
                disabled={loading}
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full min-w-[min(100%,22rem)] rounded-md border bg-popover py-1 shadow-md max-h-56 overflow-auto">
                  {searchResults.map((part) => {
                    const stock = partSearchStockHint(part);
                    const backOrder = partSearchBackOrderHint(part);
                    const meta = stock || backOrder;
                    return (
                      <button
                        key={`${part.PartNo}-${part.Warehouse}`}
                        type="button"
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleSelectPart(part)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-medium">{part.PartNo}</span>
                            <span className="text-muted-foreground text-xs">({part.Warehouse})</span>
                          </div>
                          {part.Description ? (
                            <div className="truncate text-xs text-muted-foreground" title={part.Description}>
                              {part.Description}
                            </div>
                          ) : null}
                        </div>
                        {meta ? (
                          <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                            {stock ? (
                              <span
                                className="tabular-nums text-xs font-medium text-muted-foreground"
                                title={stock.title}
                              >
                                {stock.text}
                              </span>
                            ) : null}
                            {backOrder ? (
                              <span
                                className="text-xs font-medium text-amber-800 dark:text-amber-400"
                                title={backOrder.title}
                              >
                                {backOrder.text}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select
              value={form.Warehouse || "__none__"}
              onValueChange={(v) => setForm((p) => ({ ...p, Warehouse: v === "__none__" ? "" : v }))}
              disabled={loading}
            >
              <SelectTrigger id="warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select warehouse</SelectItem>
                {warehouses.map((w) => {
                  const val = w.Warehouse ?? w;
                  return (
                    <SelectItem key={val} value={val}>
                      {val}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={form.Qty}
              onChange={(e) => setForm((p) => ({ ...p, Qty: e.target.value }))}
              disabled={loading}
            />
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <input
              id="reserveInventory"
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-input"
              checked={reserveInventory}
              onChange={(e) => setReserveInventory(e.target.checked)}
              disabled={loading || saving}
            />
            <div className="min-w-0">
              <Label htmlFor="reserveInventory" className="cursor-pointer font-medium leading-tight">
                Reserve for this work order (pick later)
              </Label>
              <p className="text-muted-foreground mt-1 text-xs leading-snug">
                On by default: on-hand stays on the shelf until you record a pick. Uncheck to issue from inventory immediately.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Select
              value={form.Section || "__none__"}
              onValueChange={(v) => setForm((p) => ({ ...p, Section: (v === "__none__" || (typeof v === "string" && v.startsWith("__empty_"))) ? "" : v }))}
              disabled={loading || sections.length === 0}
            >
              <SelectTrigger id="section">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select section</SelectItem>
                {sections.map((s, i) => {
                  const val = s.title && String(s.title).trim() ? s.title : `__empty_${i}`;
                  return (
                    <SelectItem key={val} value={val}>
                      {s.title ?? "—"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Part
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
