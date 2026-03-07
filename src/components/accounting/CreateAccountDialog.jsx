"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { createAccount } from "@/lib/api/accounting";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: "Balance Sheet", label: "Balance Sheet" },
  { value: "Profit/Loss", label: "Profit/Loss" },
];

const initialForm = {
  AccountNo: "",
  Description: "",
  Type: "",
  GPAccountNo: "",
  ReportType: "",
  Section: "",
  SectionGroup: "",
  Item: "",
  ItemDescription: "",
  Controlled: 0,
  AccountsRecievable: 0,
  AccountsPayable: 0,
  CashAccount: 0,
};

export function CreateAccountDialog({ open, onOpenChange, onSuccess, token }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckbox = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field] === -1 ? 0 : -1,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!form.AccountNo?.trim() || !form.Description?.trim() || !form.ReportType || !form.Section?.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await createAccount(
        {
          AccountNo: form.AccountNo.trim(),
          Description: form.Description.trim(),
          Type: form.Type || null,
          GPAccountNo: form.GPAccountNo || null,
          ReportType: form.ReportType,
          Section: form.Section.trim(),
          SectionGroup: form.SectionGroup || null,
          Item: form.Item || null,
          ItemDescription: form.ItemDescription || null,
          Controlled: form.Controlled ?? 0,
          AccountsRecievable: form.AccountsRecievable ?? 0,
          AccountsPayable: form.AccountsPayable ?? 0,
          CashAccount: form.CashAccount ?? 0,
        },
        token
      );
      setForm(initialForm);
      onOpenChange(false);
      onSuccess?.();
      toast.success("Account created successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) setForm(initialForm);
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="wide" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Add a new account to the chart of accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <section className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Individual Account Info
              </h4>
              <div className="space-y-2">
                <Label htmlFor="AccountNo">Account # *</Label>
                <Input
                  id="AccountNo"
                  value={form.AccountNo}
                  onChange={(e) => handleChange("AccountNo", e.target.value)}
                  required
                  placeholder="e.g. 1100001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="GPAccountNo">GP Account #</Label>
                <Input
                  id="GPAccountNo"
                  value={form.GPAccountNo}
                  onChange={(e) => handleChange("GPAccountNo", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Description">Description *</Label>
                <Input
                  id="Description"
                  value={form.Description}
                  onChange={(e) => handleChange("Description", e.target.value)}
                  required
                  placeholder="Account description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Type">Type</Label>
                <Input
                  id="Type"
                  value={form.Type}
                  onChange={(e) => handleChange("Type", e.target.value)}
                  placeholder="A, L, S, E, C..."
                />
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Accounting Admin
              </h4>
              <div className="space-y-2">
                <Label htmlFor="Section">Section *</Label>
                <Input
                  id="Section"
                  value={form.Section}
                  onChange={(e) => handleChange("Section", e.target.value)}
                  required
                  placeholder="Section"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="SectionGroup">Section Group</Label>
                <Input
                  id="SectionGroup"
                  value={form.SectionGroup}
                  onChange={(e) => handleChange("SectionGroup", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ReportType">Report Type *</Label>
                <Select
                  value={form.ReportType}
                  onValueChange={(v) => handleChange("ReportType", v)}
                  required
                >
                  <SelectTrigger id="ReportType">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Options</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.Controlled === -1}
                  onChange={() => handleCheckbox("Controlled")}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <span className="text-sm">Controlled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.AccountsRecievable === -1}
                  onChange={() => handleCheckbox("AccountsRecievable")}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <span className="text-sm">Accounts Receivable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.AccountsPayable === -1}
                  onChange={() => handleCheckbox("AccountsPayable")}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <span className="text-sm">Accounts Payable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.CashAccount === -1}
                  onChange={() => handleCheckbox("CashAccount")}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <span className="text-sm">Cash Account</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
