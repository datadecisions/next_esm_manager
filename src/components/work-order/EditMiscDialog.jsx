"use client";

import React, { useEffect, useState } from "react";
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
import { updateMisc } from "@/lib/api/work-order";
import { getSalesCodes } from "@/lib/api/customer";
import { getSectionsList } from "@/lib/api/work-order";

export default function EditMiscDialog({ open, onOpenChange, entry, wo, token, onSuccess }) {
  const [salesCodes, setSalesCodes] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    Description: "",
    SaleCode: "",
    Cost: "",
    Sell: "",
    Section: "__none__",
  });

  const saleBranch = wo?.SaleBranch ?? entry?.SaleBranch ?? "";
  const saleDept = wo?.SaleDept ?? entry?.SaleDept ?? "";
  const defaultSaleCode = typeof wo?.SaleCode === "object" ? wo?.SaleCode?.Code : wo?.SaleCode;

  useEffect(() => {
    if (!open || !entry) return;
    const saleCode = typeof entry.SaleCode === "object" ? entry.SaleCode?.Code : entry.SaleCode;
    setForm({
      Description: entry.Description ?? "",
      SaleCode: saleCode ?? defaultSaleCode ?? "",
      Cost: entry.Cost != null ? String(entry.Cost) : "",
      Sell: entry.Sell != null ? String(entry.Sell) : "",
      Section: entry.Section && String(entry.Section).trim() ? entry.Section : "__none__",
    });
    setError(null);
  }, [open, entry, defaultSaleCode]);

  useEffect(() => {
    if (!token || !saleBranch || !open) return;
    setLoading(true);
    Promise.all([
      getSalesCodes(saleBranch, saleDept, token),
      wo?.WONo ? getSectionsList(wo.WONo, token) : Promise.resolve([]),
    ])
      .then(([codes, secs]) => {
        setSalesCodes(Array.isArray(codes) ? codes : []);
        setSections(Array.isArray(secs) ? secs : []);
      })
      .catch(() => {
        setSalesCodes([]);
        setSections([]);
      })
      .finally(() => setLoading(false));
  }, [token, saleBranch, saleDept, wo?.WONo, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry?.ID || !wo?.WONo || !token) return;
    const desc = (form.Description || "").trim();
    if (!desc) {
      setError("Please enter a description.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const section = form.Section === "__none__" || form.Section?.startsWith("__empty_") ? "" : form.Section;
      await updateMisc(
        {
          ID: entry.ID,
          WONo: wo.WONo,
          SaleCode: form.SaleCode || defaultSaleCode,
          Description: desc,
          Cost: form.Cost ? parseFloat(form.Cost) : undefined,
          Sell: form.Sell ? parseFloat(form.Sell) : undefined,
          Section: section || undefined,
        },
        token
      );
      onSuccess?.();
      onOpenChange(false);
      toast.success("Misc charge updated");
    } catch (err) {
      setError(err?.message || "Failed to update misc charge");
      toast.error(err?.message || "Failed to update misc charge");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Misc Charge</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={form.Description}
              onChange={(e) => setForm((p) => ({ ...p, Description: e.target.value }))}
              placeholder="e.g. Freight, Travel, Other"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="saleCode">Sale Code</Label>
            <Select
              value={form.SaleCode || ""}
              onValueChange={(v) => setForm((p) => ({ ...p, SaleCode: v }))}
              disabled={loading}
              required
            >
              <SelectTrigger id="saleCode" className="mt-1 w-full">
                <SelectValue placeholder="Choose sale code" />
              </SelectTrigger>
              <SelectContent>
                {salesCodes
                  .filter((c) => c?.Code != null && c.Code !== "")
                  .map((c) => (
                    <SelectItem key={c.Code} value={String(c.Code)}>
                      {c.Code}: {c.MiscDescription || c.GeneralDescription || ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Cost</Label>
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
              <Label htmlFor="sell">Amount Billed</Label>
              <Input
                id="sell"
                type="number"
                step="0.01"
                min="0"
                value={form.Sell}
                onChange={(e) => setForm((p) => ({ ...p, Sell: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="section">Section</Label>
            <Select
              value={form.Section || "__none__"}
              onValueChange={(v) => setForm((p) => ({ ...p, Section: v }))}
              disabled={loading || sections.length === 0}
            >
              <SelectTrigger id="section" className="mt-1 w-full">
                <SelectValue placeholder="Choose section (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
