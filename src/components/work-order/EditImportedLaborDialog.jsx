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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateLaborImport } from "@/lib/api/labor";
import { getMechanics } from "@/lib/api/dispatch";
import { getSalesCodes } from "@/lib/api/customer";
import { getSectionsList } from "@/lib/api/work-order";

export default function EditImportedLaborDialog({ open, onOpenChange, entry, wo, token, onSuccess }) {
  const [mechanics, setMechanics] = useState([]);
  const [salesCodes, setSalesCodes] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    DateOfLabor: "",
    EmployeeNumber: "",
    MechanicName: "",
    SaleCode: "",
    LaborRateType: "R",
    Hours: "",
    Section: "__none__",
    Comments: "",
  });

  const saleBranch = wo?.SaleBranch ?? entry?.SaleBranch ?? "";
  const saleDept = wo?.SaleDept ?? entry?.SaleDept ?? "";

  useEffect(() => {
    if (!open || !entry) return;
    const saleCode = typeof entry.SaleCode === "object" ? entry.SaleCode?.Code : entry.SaleCode;
    setForm({
      DateOfLabor: entry.DateOfLabor ? new Date(entry.DateOfLabor).toISOString().slice(0, 10) : "",
      EmployeeNumber: String(entry.MechanicNo ?? entry.EmployeeNumber ?? ""),
      MechanicName: entry.MechanicName ?? "",
      SaleCode: saleCode ?? "",
      LaborRateType: entry.LaborRateType ?? "R",
      Hours: String(entry.Hours ?? ""),
      Section: entry.Section && String(entry.Section).trim() ? entry.Section : "__none__",
      Comments: "",
    });
    setError(null);
  }, [open, entry]);

  useEffect(() => {
    if (!token || !saleBranch || !open) return;
    setLoading(true);
    Promise.all([
      getMechanics(saleBranch, token),
      getSalesCodes(saleBranch, saleDept, token),
      wo?.WONo ? getSectionsList(wo.WONo, token) : Promise.resolve([]),
    ])
      .then(([mechs, codes, secs]) => {
        setMechanics(Array.isArray(mechs) ? mechs : []);
        setSalesCodes((Array.isArray(codes) ? codes : []).filter((c) => c?.LaborDescription));
        setSections(Array.isArray(secs) ? secs : []);
      })
      .catch(() => {
        setMechanics([]);
        setSalesCodes([]);
        setSections([]);
      })
      .finally(() => setLoading(false));
  }, [token, saleBranch, saleDept, wo?.WONo, open]);

  const handleMechanicChange = (val) => {
    const mech = mechanics.find((m) => String(m.Number) === val);
    if (mech) {
      setForm((p) => ({
        ...p,
        EmployeeNumber: String(mech.Number),
        MechanicName: mech.DispatchName ?? `${mech.FirstName ?? ""} ${mech.LastName ?? ""}`.trim(),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry?.ID || !token) return;
    const hours = parseFloat(form.Hours);
    if (!form.EmployeeNumber || form.EmployeeNumber === "__choose__" || !form.MechanicName) {
      setError("Please select a mechanic.");
      return;
    }
    if (!form.DateOfLabor) {
      setError("Please enter the date of labor.");
      return;
    }
    if (isNaN(hours) || hours <= 0) {
      setError("Please enter valid hours.");
      return;
    }
    const rawSection = form.Section === "__none__" || form.Section?.startsWith("__empty_") ? "" : form.Section;
    const section = rawSection || (form.Comments ? form.Comments.toUpperCase() : "") || "";
    setSaving(true);
    setError(null);
    try {
      await updateLaborImport(
        {
          ...entry,
          DateOfLabor: form.DateOfLabor,
          MechanicNo: form.EmployeeNumber,
          MechanicName: form.MechanicName,
          SaleCode: form.SaleCode || (typeof wo?.SaleCode === "object" ? wo?.SaleCode?.Code : wo?.SaleCode),
          Hours: hours,
          LaborRateType: form.LaborRateType,
          Section: section,
        },
        token
      );
      onSuccess?.();
      onOpenChange(false);
      toast.success("Labor entry updated");
    } catch (err) {
      setError(err?.message || "Failed to update labor entry");
      toast.error(err?.message || "Failed to update labor entry");
    } finally {
      setSaving(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Labor Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date of Labor</Label>
              <Input
                id="date"
                type="date"
                value={form.DateOfLabor}
                onChange={(e) => setForm((p) => ({ ...p, DateOfLabor: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mechanic">Mechanic</Label>
              <Select
                value={form.EmployeeNumber && String(form.EmployeeNumber).trim() ? form.EmployeeNumber : "__choose__"}
                onValueChange={(v) => v !== "__choose__" && handleMechanicChange(v)}
                disabled={loading}
              >
                <SelectTrigger id="mechanic" className="mt-1 w-full">
                  <SelectValue placeholder="Choose mechanic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__choose__">Choose mechanic</SelectItem>
                  {mechanics
                    .filter((m) => m?.Number != null && String(m.Number) !== "")
                    .map((m) => (
                      <SelectItem key={m.Number} value={String(m.Number)}>
                        {m.DispatchName || `${m.FirstName ?? ""} ${m.LastName ?? ""}`.trim()} ({m.Number})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saleCode">Sale Code</Label>
              <Select
                value={form.SaleCode || "__none__"}
                onValueChange={(v) => setForm((p) => ({ ...p, SaleCode: v === "__none__" ? "" : v }))}
                disabled={loading}
              >
                <SelectTrigger id="saleCode" className="mt-1 w-full">
                  <SelectValue placeholder="Choose sale code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {salesCodes
                    .filter((c) => c?.Code != null && c.Code !== "")
                    .map((c) => (
                      <SelectItem key={c.Code} value={String(c.Code)}>
                        {c.Code}: {c.LaborDescription || c.GeneralDescription || ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rateType">Labor Rate Type</Label>
              <Select
                value={form.LaborRateType}
                onValueChange={(v) => setForm((p) => ({ ...p, LaborRateType: v }))}
              >
                <SelectTrigger id="rateType" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R">Regular x1 (R)</SelectItem>
                  <SelectItem value="O">Overtime x1.5 (O)</SelectItem>
                  <SelectItem value="P">Premium x2 (P)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours">Hours Billed</Label>
              <Input
                id="hours"
                type="number"
                step="0.01"
                min="0"
                value={form.Hours}
                onChange={(e) => setForm((p) => ({ ...p, Hours: e.target.value }))}
                required
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="section">Section</Label>
              <Select
                value={form.Section}
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
          </div>
          <div>
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={form.Comments}
              onChange={(e) => setForm((p) => ({ ...p, Comments: e.target.value }))}
              placeholder="Optional"
              rows={2}
              className="mt-1"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
