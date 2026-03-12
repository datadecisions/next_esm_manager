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
import { addPartToOrder, searchParts, getWarehouses } from "@/lib/api/parts";
import { getSectionsList } from "@/lib/api/work-order";

export default function AddPartDialog({ open, onOpenChange, wo, token, onSuccess }) {
  const [warehouses, setWarehouses] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

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
    try {
      await addPartToOrder(
        {
          WONo: wo.WONo,
          PartNo: partNo,
          Warehouse: form.Warehouse,
          Qty: qty,
          Section: section,
          RepairCode: section,
        },
        token
      );
      onSuccess?.();
      onOpenChange(false);
      toast.success("Part added");
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
            <div className="rounded-md bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-300">
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
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
              )}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 shadow-md max-h-48 overflow-auto">
                  {searchResults.map((part) => (
                    <button
                      key={`${part.PartNo}-${part.Warehouse}`}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleSelectPart(part)}
                    >
                      <span className="font-medium">{part.PartNo}</span>
                      <span className="text-muted-foreground ml-2">{part.Description}</span>
                      <span className="text-muted-foreground text-xs ml-2">({part.Warehouse})</span>
                    </button>
                  ))}
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
