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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Loader2, ChevronDown } from "lucide-react";
import { createEquipment } from "@/lib/api/work-order";
import { getSectionsList } from "@/lib/api/work-order";
import { searchCustomerEquipment, searchEquipment } from "@/lib/api/equipment";

function useDebounce(fn, delay) {
  const timeoutRef = useRef(null);
  return useCallback(
    (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

function equipmentDisplay(eq) {
  if (!eq) return "";
  const u = eq.UnitNo ?? eq.unitNo ?? "";
  const m = eq.Make ?? eq.make ?? "";
  const mod = eq.Model ?? eq.model ?? "";
  const s = eq.SerialNo ?? eq.serialNo ?? "";
  return [u, m, mod, s].filter(Boolean).join(" · ") || "Equipment";
}

export default function AddEquipmentDialog({ open, onOpenChange, wo, token, onSuccess }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const [form, setForm] = useState({
    SerialNo: "",
    UnitNo: "",
    Make: "",
    Model: "",
    Description: "",
    Cost: "",
    Sell: "",
    Section: "__none__",
    Comments: "",
    Print: true,
  });

  const shipTo = wo?.ShipTo;
  const billTo = wo?.BillTo;
  const hasCustomers = !!(shipTo || billTo);

  const performSearch = useCallback(
    async (query) => {
      if (!token || !query?.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        let data;
        if (hasCustomers) {
          data = await searchCustomerEquipment(query.trim(), String(shipTo || ""), String(billTo || ""), token);
        } else {
          data = await searchEquipment(query.trim(), token);
        }
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [token, hasCustomers, shipTo, billTo]
  );

  const debouncedSearch = useDebounce(performSearch, 200);

  useEffect(() => {
    if (searchText.trim()) {
      debouncedSearch(searchText);
    } else {
      setSearchResults([]);
    }
  }, [searchText, debouncedSearch]);

  useEffect(() => {
    if (!open || !wo) return;
    setForm({
      SerialNo: "",
      UnitNo: "",
      Make: "",
      Model: "",
      Description: "",
      Cost: "",
      Sell: "",
      Section: "__none__",
      Comments: "",
      Print: true,
    });
    setSelectedEquipment(null);
    setSearchText("");
    setSearchResults([]);
    setError(null);
  }, [open, wo]);

  useEffect(() => {
    if (!token || !wo?.WONo || !open) return;
    setLoading(true);
    getSectionsList(wo.WONo, token)
      .then((secs) => setSections(Array.isArray(secs) ? secs : []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [token, wo?.WONo, open]);

  const handleSelectEquipment = (eq) => {
    setSelectedEquipment(eq);
    setForm((p) => ({
      ...p,
      SerialNo: eq.SerialNo ?? eq.serialNo ?? "",
      UnitNo: eq.UnitNo ?? eq.unitNo ?? "",
      Make: eq.Make ?? eq.make ?? "",
      Model: eq.Model ?? eq.model ?? "",
      Description: equipmentDisplay(eq),
    }));
    setSearchOpen(false);
    setSearchText("");
    setSearchResults([]);
  };

  const handleClearEquipment = () => {
    setSelectedEquipment(null);
    setForm((p) => ({
      ...p,
      SerialNo: "",
      UnitNo: "",
      Make: "",
      Model: "",
      Description: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wo?.WONo || !token) return;
    const desc = (form.Description || form.SerialNo || "").trim();
    if (!desc) {
      setError("Please enter a description or select equipment.");
      return;
    }
    const sell = form.Sell ? parseFloat(form.Sell) : (form.Cost ? parseFloat(form.Cost) : 0);
    if (isNaN(sell) || sell < 0) {
      setError("Please enter a valid equipment price.");
      return;
    }
    const section = (form.Section === "__none__" || (typeof form.Section === "string" && form.Section.startsWith("__empty_"))) ? "" : (form.Section || "").trim();
    setSaving(true);
    setError(null);
    try {
      await createEquipment(
        {
          WONo: wo.WONo,
          SerialNo: form.SerialNo || desc,
          UnitNo: (form.UnitNo || "").trim() || "",
          Make: (form.Make || "").trim() || "",
          Model: (form.Model || "").trim() || "",
          Cost: form.Cost ? parseFloat(form.Cost) : 0,
          Sell: sell,
          SaleBranch: wo.SaleBranch,
          SaleDept: wo.SaleDept,
          SaleCode: typeof wo.SaleCode === "object" ? wo.SaleCode?.Code : wo.SaleCode,
          Disposition: wo.Disposition ?? 1,
          Taxable: -1,
          Transfer: 0,
          Section: section || "",
          Comments: (form.Comments || "").trim() || "",
          NoPrint: form.Print ? 0 : 1,
        },
        token
      );
      onSuccess?.();
      onOpenChange(false);
      toast.success("Equipment charge added");
    } catch (err) {
      setError(err?.message || "Failed to create equipment charge");
      toast.error(err?.message || "Failed to create equipment charge");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Equipment Charge — WO {wo?.WONo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Equipment search */}
          <div>
            <Label>Equipment</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverAnchor asChild>
                <div className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs">
                  {selectedEquipment ? (
                    <>
                      <span className="flex-1 text-foreground">
                        {equipmentDisplay(selectedEquipment)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => { e.preventDefault(); handleClearEquipment(); }}
                      >
                        Clear
                      </Button>
                    </>
                  ) : (
                    <>
                      <input
                        value={searchText}
                        onChange={(e) => { setSearchText(e.target.value); setSearchOpen(true); }}
                        onFocus={() => searchText && setSearchOpen(true)}
                        placeholder="Search equipment (serial, unit, make, model)..."
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </div>
              </PopoverAnchor>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto p-0" align="start">
                {searching ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {searchText.trim() ? "No equipment found. Enter details manually below." : "Type to search..."}
                  </div>
                ) : (
                  <ul className="py-1">
                    {searchResults.map((eq) => (
                      <li key={eq.SerialNo ?? eq.serialNo ?? eq.ID ?? Math.random()}>
                        <button
                          type="button"
                          className="flex w-full flex-col gap-0.5 px-2 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                          onClick={() => handleSelectEquipment(eq)}
                        >
                          <span className="font-medium">
                            #{eq.UnitNo ?? eq.unitNo ?? "—"}: {eq.Make ?? eq.make} {eq.Model ?? eq.model} {eq.SerialNo ?? eq.serialNo}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Section */}
          <div>
            <Label htmlFor="section">Section</Label>
            <Select
              value={form.Section || "__none__"}
              onValueChange={(v) => setForm((p) => ({ ...p, Section: v }))}
              disabled={loading || sections.length === 0}
            >
              <SelectTrigger id="section" className="mt-1 w-full">
                <SelectValue placeholder="Choose a Section (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Choose a Section</SelectItem>
                {sections.map((s, i) => {
                  const val = s.title && String(s.title).trim() ? s.title : `__empty_${i}`;
                  return (
                    <SelectItem key={val} value={val}>
                      {s.title || "—"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={form.Description}
              onChange={(e) => setForm((p) => ({ ...p, Description: e.target.value }))}
              placeholder="Equipment description"
              required
              className="mt-1"
            />
          </div>

          {/* Equipment Cost & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Equipment Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={form.Cost}
                onChange={(e) => setForm((p) => ({ ...p, Cost: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sell">Equipment Price</Label>
              <Input
                id="sell"
                type="number"
                step="0.01"
                min="0"
                value={form.Sell}
                onChange={(e) => setForm((p) => ({ ...p, Sell: e.target.value }))}
                placeholder="0.00"
                required
                className="mt-1"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={form.Comments}
              onChange={(e) => setForm((p) => ({ ...p, Comments: e.target.value }))}
              placeholder="Optional"
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Include on invoice */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="print"
              checked={form.Print}
              onChange={(e) => setForm((p) => ({ ...p, Print: e.target.checked }))}
              className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Label htmlFor="print" className="cursor-pointer font-normal text-sm">
              Include on invoice?
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Add Equipment Charge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
