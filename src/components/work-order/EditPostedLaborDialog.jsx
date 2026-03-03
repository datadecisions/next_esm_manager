"use client";

import React, { useEffect, useState } from "react";
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
import { updatePostedArrival } from "@/lib/api/labor";
import { getSectionsList } from "@/lib/api/work-order";

/** Format date for datetime-local input */
function toDatetimeLocal(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function EditPostedLaborDialog({ open, onOpenChange, entry, wo, token, onSuccess }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    ArrivalDateTime: "",
    DepartureDateTime: "",
    Section: "__none__",
  });

  useEffect(() => {
    if (!open || !entry) return;
    setForm({
      ArrivalDateTime: toDatetimeLocal(entry.ArrivalDateTime),
      DepartureDateTime: toDatetimeLocal(entry.DepartureDateTime),
      Section: entry.Section && String(entry.Section).trim() ? entry.Section : "__none__",
    });
    setError(null);
  }, [open, entry]);

  useEffect(() => {
    if (!token || !wo?.WONo || !open) return;
    setLoading(true);
    getSectionsList(wo.WONo, token)
      .then((secs) => setSections(Array.isArray(secs) ? secs : []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [token, wo?.WONo, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry?.ID || !wo?.WONo || !token) return;
    const arrival = form.ArrivalDateTime ? new Date(form.ArrivalDateTime).toISOString() : null;
    const departure = form.DepartureDateTime ? new Date(form.DepartureDateTime).toISOString() : null;
    if (!arrival || !departure) {
      setError("Start and end time are required.");
      return;
    }
    const section = form.Section === "__none__" || form.Section?.startsWith("__empty_") ? "" : form.Section;
    setSaving(true);
    setError(null);
    try {
      await updatePostedArrival(
        {
          ID: entry.ID,
          WONo: wo.WONo,
          ArrivalDateTime: arrival,
          DepartureDateTime: departure,
          Section: section || true,
        },
        token
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Failed to update labor entry");
    } finally {
      setSaving(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Posted Labor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {entry.DispatchName} · WO #{entry.WONo}
          </p>
          <div>
            <Label htmlFor="arrival">Start Time</Label>
            <Input
              id="arrival"
              type="datetime-local"
              value={form.ArrivalDateTime}
              onChange={(e) => setForm((p) => ({ ...p, ArrivalDateTime: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="departure">End Time</Label>
            <Input
              id="departure"
              type="datetime-local"
              value={form.DepartureDateTime}
              onChange={(e) => setForm((p) => ({ ...p, DepartureDateTime: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="section">Section</Label>
            <Select
              value={form.Section}
              onValueChange={(v) => setForm((p) => ({ ...p, Section: v }))}
              disabled={loading}
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
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
