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
import { createFixed } from "@/lib/api/work-order";
import { getSalesCodes } from "@/lib/api/customer";
import { getSectionsList } from "@/lib/api/work-order";

const TYPE_OPTIONS = [
  { id: "L", label: "Labor" },
  { id: "R", label: "Rental" },
  { id: "M", label: "Misc" },
];

export default function AddFixedDialog({ open, onOpenChange, wo, token, onSuccess }) {
  const [salesCodes, setSalesCodes] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    Description: "",
    Type: "L",
    SaleCode: "",
    Amount: "",
    Section: "__none__",
    QuoteText: "",
    Print: true,
  });

  const saleBranch = wo?.SaleBranch ?? "";
  const saleDept = wo?.SaleDept ?? "";
  const defaultSaleCode = typeof wo?.SaleCode === "object" ? wo?.SaleCode?.Code : wo?.SaleCode;

  useEffect(() => {
    if (!open || !wo) return;
    setForm({
      Description: "",
      Type: "L",
      SaleCode: defaultSaleCode ?? "",
      Amount: "",
      Section: "__none__",
      QuoteText: "",
      Print: true,
    });
    setError(null);
  }, [open, wo, defaultSaleCode]);

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
    if (!wo?.WONo || !token) return;
    const desc = (form.Description || "").trim();
    if (!desc) {
      setError("Please enter a description.");
      return;
    }
    const saleCodeKey = form.SaleCode || defaultSaleCode;
    if (!saleCodeKey) {
      setError("Please select a sale code.");
      return;
    }
    const amount = form.Amount ? parseFloat(form.Amount) : 0;
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid amount.");
      return;
    }
    const saleCodeObj = salesCodes.find((c) => String(c?.Code) === String(saleCodeKey));
    setSaving(true);
    setError(null);
    try {
      const section = form.Section === "__none__" || form.Section?.startsWith("__empty_") ? "" : form.Section;
      const SaleCode = {
        Code: saleCodeKey,
        FixedAccount: saleCodeObj?.FixedAccount ?? "",
        FixedTax: !!saleCodeObj?.FixedTax,
        FixedStateTax: !!saleCodeObj?.FixedStateTax,
        FixedCountyTax: !!saleCodeObj?.FixedCountyTax,
        FixedCityTax: !!saleCodeObj?.FixedCityTax,
        FixedLocalTax: !!saleCodeObj?.FixedLocalTax,
      };
      await createFixed(
        {
          WONo: wo.WONo,
          SaleBranch: saleBranch,
          SaleDept: saleDept,
          SaleCode,
          Type: { id: form.Type },
          Amount: amount,
          Description: desc,
          Section: section || undefined,
          QuoteText: (form.QuoteText || "").trim() || undefined,
          Print: !!form.Print,
        },
        token
      );
      onSuccess?.();
      onOpenChange(false);
      toast.success("Fixed charge added");
    } catch (err) {
      setError(err?.message || "Failed to create fixed charge");
      toast.error(err?.message || "Failed to create fixed charge");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Fixed Charge</DialogTitle>
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
              placeholder="e.g. Fixed labor, Equipment rental"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={form.Type} onValueChange={(v) => setForm((p) => ({ ...p, Type: v }))}>
              <SelectTrigger id="type" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="saleCode">Sale Code</Label>
            <Select
              value={form.SaleCode || defaultSaleCode || ""}
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
                      {c.Code}: {c.GeneralDescription || c.MiscDescription || ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={form.Amount}
              onChange={(e) => setForm((p) => ({ ...p, Amount: e.target.value }))}
              placeholder="0.00"
              required
              className="mt-1"
            />
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
          <div>
            <Label htmlFor="quoteText">Comments</Label>
            <Input
              id="quoteText"
              value={form.QuoteText}
              onChange={(e) => setForm((p) => ({ ...p, QuoteText: e.target.value }))}
              placeholder="Optional comments"
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="print"
              checked={form.Print}
              onChange={(e) => setForm((p) => ({ ...p, Print: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="print" className="cursor-pointer">Include on invoice</Label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Add Fixed Charge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
