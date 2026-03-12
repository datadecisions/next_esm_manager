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
import { createSection } from "@/lib/api/work-order";
import { getBranches, getBranchDepts } from "@/lib/api/dispatch";

export default function AddSectionDialog({ open, onOpenChange, wo, token, onSuccess }) {
  const [branches, setBranches] = useState([]);
  const [depts, setDepts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    Branch: null,
    Dept: null,
    outputType: "standard",
    outputDestination: "equipment",
    attachmentUnitNo: "",
    attachmentComments: "",
    skillsWelding: false,
    skillsMachining: false,
  });

  useEffect(() => {
    if (!open || !token) return;
    setForm({
      title: "",
      description: "",
      Branch: null,
      Dept: null,
      outputType: "standard",
      outputDestination: "equipment",
      attachmentUnitNo: "",
      attachmentComments: "",
      skillsWelding: false,
      skillsMachining: false,
    });
    setDepts([]);
  }, [open, token]);

  useEffect(() => {
    if (!token || !open) return;
    getBranches(token)
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [token, open]);

  useEffect(() => {
    if (!token || !form.Branch) {
      setDepts([]);
      return;
    }
    getBranchDepts(form.Branch, token)
      .then(setDepts)
      .catch(() => setDepts([]));
  }, [token, form.Branch]);

  const handleBranchChange = (branchNum) => {
    setForm((p) => ({ ...p, Branch: branchNum, Dept: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wo?.WONo || !token || !form.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.Branch || !form.Dept) {
      toast.error("Branch and Department are required");
      return;
    }
    if (form.outputType === "output" && form.outputDestination === "attachment" && !form.attachmentUnitNo?.trim()) {
      toast.error("Unit No is required when creating a new attachment");
      return;
    }
    setSaving(true);
    try {
      await createSection(
        {
          woNo: wo.WONo,
          title: form.title.trim(),
          description: form.description?.trim() ?? "",
          Branch: form.Branch,
          Dept: form.Dept,
          outputType: form.outputType,
          outputDestination: form.outputType === "output" ? form.outputDestination : null,
          attachmentUnitNo: form.outputType === "output" && form.outputDestination === "attachment" ? form.attachmentUnitNo.trim() : null,
          attachmentComments: form.outputType === "output" && form.outputDestination === "attachment" ? form.attachmentComments?.trim() ?? null : null,
          skillsWelding: form.skillsWelding,
          skillsMachining: form.skillsMachining,
        },
        token
      );
      toast.success("Section added");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to add section");
    } finally {
      setSaving(false);
    }
  };

  const branchOptions = branches.map((b) => ({
    value: String(b.Number ?? b),
    label: `${b.Number ?? b}: ${b.Name ?? b}`,
  }));
  const deptOptions = depts.map((d) => ({
    value: String(d.Dept ?? d),
    label: `${d.Dept ?? d}: ${d.Title ?? d}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="section-title">Title *</Label>
            <Input
              id="section-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Section title"
              maxLength={200}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe this section"
              rows={3}
              maxLength={2000}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="section-branch">Branch *</Label>
            <Select
              value={form.Branch ? String(form.Branch) : ""}
              onValueChange={handleBranchChange}
              required
            >
              <SelectTrigger id="section-branch" className="mt-1">
                <SelectValue placeholder="Choose branch" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="section-dept">Department *</Label>
            <Select
              value={form.Dept ? String(form.Dept) : ""}
              onValueChange={(v) => setForm((p) => ({ ...p, Dept: v }))}
              disabled={!form.Branch || depts.length === 0}
              required
            >
              <SelectTrigger id="section-dept" className="mt-1">
                <SelectValue placeholder="Choose department" />
              </SelectTrigger>
              <SelectContent>
                {deptOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div>
            <Label className="mb-2 block">Type *</Label>
            <div className="flex gap-8 mt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outputType"
                  checked={form.outputType === "standard"}
                  onChange={() => setForm((p) => ({ ...p, outputType: "standard" }))}
                  className="rounded-full border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Standard</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outputType"
                  checked={form.outputType === "output"}
                  onChange={() => setForm((p) => ({ ...p, outputType: "output" }))}
                  className="rounded-full border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Output</span>
              </label>
            </div>
          </div>

          {/* Output destination (only when Type = Output) */}
          {form.outputType === "output" && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-4">
              <Label className="mb-2 block">Where should the output be placed?</Label>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outputDestination"
                    checked={form.outputDestination === "equipment"}
                    onChange={() => setForm((p) => ({ ...p, outputDestination: "equipment" }))}
                    className="rounded-full border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Add value to selected equipment</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outputDestination"
                    checked={form.outputDestination === "attachment"}
                    onChange={() => setForm((p) => ({ ...p, outputDestination: "attachment" }))}
                    className="rounded-full border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Create new attachment</span>
                </label>
              </div>
              {form.outputDestination === "attachment" && (
                <div className="space-y-3 pt-3">
                  <div>
                    <Label htmlFor="attachmentUnitNo">Unit No *</Label>
                    <Input
                      id="attachmentUnitNo"
                      value={form.attachmentUnitNo}
                      onChange={(e) => setForm((p) => ({ ...p, attachmentUnitNo: e.target.value }))}
                      placeholder="Enter Unit Number"
                      maxLength={100}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="attachmentComments">Comments</Label>
                    <Textarea
                      id="attachmentComments"
                      value={form.attachmentComments}
                      onChange={(e) => setForm((p) => ({ ...p, attachmentComments: e.target.value }))}
                      placeholder="Add any comments (optional)"
                      rows={2}
                      maxLength={1000}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section requires skills */}
          <div>
            <Label className="mb-2 block">Section requires skills in the following areas:</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.skillsWelding}
                  onChange={(e) => setForm((p) => ({ ...p, skillsWelding: e.target.checked }))}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Welding</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.skillsMachining}
                  onChange={(e) => setForm((p) => ({ ...p, skillsMachining: e.target.checked }))}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Machining</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
