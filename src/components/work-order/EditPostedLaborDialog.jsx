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
import { Loader2 } from "lucide-react";
import { updatePostedArrival } from "@/lib/api/labor";
import { getSectionsList, searchWOs } from "@/lib/api/work-order";
import { getBranches, getMechanics } from "@/lib/api/dispatch";

/** Format date for datetime-local input */
function toDatetimeLocal(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

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

export default function EditPostedLaborDialog({ open, onOpenChange, entry, wo, token, onSuccess }) {
  const [sections, setSections] = useState([]);
  const [branches, setBranches] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [woSearchResults, setWoSearchResults] = useState([]);
  const [woSearchLoading, setWoSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    ArrivalDateTime: "",
    DepartureDateTime: "",
    Section: "__none__",
    TransferWONo: null,
    TransferWOSearch: "",
    NewMechanic: "",
    NewEmployeeNumber: "",
    SignatureComments: "",
  });

  const saleBranch = entry?.SaleBranch ?? wo?.SaleBranch ?? "";

  const performWoSearch = useCallback(
    async (query) => {
      const trimmed = query?.trim() || "";
      if (trimmed.length < 3) {
        setWoSearchResults([]);
        return;
      }
      setWoSearchLoading(true);
      try {
        const data = await searchWOs(trimmed, false, token);
        setWoSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setWoSearchResults([]);
      } finally {
        setWoSearchLoading(false);
      }
    },
    [token]
  );

  const debouncedWoSearch = useDebounce(performWoSearch, 300);

  useEffect(() => {
    if (!open || !entry) return;
    setForm({
      ArrivalDateTime: toDatetimeLocal(entry.ArrivalDateTime),
      DepartureDateTime: toDatetimeLocal(entry.DepartureDateTime),
      Section: entry.Section && String(entry.Section).trim() ? entry.Section : "__none__",
      TransferWONo: null,
      TransferWOSearch: "",
      NewMechanic: "",
      NewEmployeeNumber: "",
      SignatureComments: entry.SignatureComments ?? "",
    });
    setError(null);
    setWoSearchResults([]);
  }, [open, entry]);

  useEffect(() => {
    if (!token || !open) return;
    setLoading(true);
    const woNo = wo?.WONo ?? entry?.WONo;
    Promise.all([
      getBranches(token),
      saleBranch ? getMechanics(saleBranch, token) : Promise.resolve([]),
      woNo ? getSectionsList(woNo, token) : Promise.resolve([]),
    ])
      .then(([b, m, s]) => {
        setBranches(Array.isArray(b) ? b : []);
        setMechanics(Array.isArray(m) ? m : []);
        setSections(Array.isArray(s) ? s : []);
      })
      .catch(() => {
        setBranches([]);
        setMechanics([]);
        setSections([]);
      })
      .finally(() => setLoading(false));
  }, [token, saleBranch, wo?.WONo, entry?.WONo, open]);

  const handleTransferWoSearch = (v) => {
    setForm((p) => ({ ...p, TransferWOSearch: v, TransferWONo: null }));
    debouncedWoSearch(v);
  };

  const handleSelectTransferWo = (woItem) => {
    setForm((p) => ({
      ...p,
      TransferWONo: woItem,
      TransferWOSearch: woItem ? `#${woItem.WONo} ${woItem.ShipName || ""}`.trim() : "",
    }));
    setWoSearchResults([]);
  };

  const handleMechanicChange = (val) => {
    const mech = mechanics.find((m) => String(m.Number) === val);
    if (mech) {
      setForm((p) => ({
        ...p,
        NewEmployeeNumber: String(mech.Number),
        NewMechanic: mech.DispatchName ?? `${mech.FirstName ?? ""} ${mech.LastName ?? ""}`.trim(),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry?.ID || !token) return;
    const arrival = form.ArrivalDateTime ? new Date(form.ArrivalDateTime).toISOString() : null;
    const departure = form.DepartureDateTime ? new Date(form.DepartureDateTime).toISOString() : null;
    if (!arrival || !departure) {
      setError("Start and end time are required.");
      return;
    }
    const section = form.Section === "__none__" || form.Section?.startsWith("__empty_") ? "" : form.Section;
    const targetWONo = form.TransferWONo?.WONo ?? entry.WONo ?? wo?.WONo;
    if (!targetWONo) {
      setError("Work order is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updatePostedArrival(
        {
          ID: entry.ID,
          WONo: targetWONo,
          ArrivalDateTime: arrival,
          DepartureDateTime: departure,
          Section: section || true,
          MechanicName: form.NewMechanic || undefined,
          EmployeeNumber: form.NewEmployeeNumber || undefined,
          SignatureComments: form.SignatureComments?.trim() || undefined,
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

  const branchLabel = branches.find((b) => String(b.Number ?? b) === String(saleBranch));
  const branchDisplay = branchLabel ? `${branchLabel.Number}: ${branchLabel.Name || branchLabel.Title || ""}`.trim() : saleBranch || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Labor Entry</DialogTitle>
          <p className="text-sm text-muted-foreground">Update labor details and assignments</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Transfer to New Work Order */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-semibold text-foreground">Transfer to New Work Order</h4>
            <p className="text-xs text-muted-foreground">Move this labor entry to a different work order</p>
            <div className="relative">
              <Label htmlFor="wo-search" className="sr-only">Search Work Orders</Label>
              <Input
                id="wo-search"
                placeholder="Type to search work orders (3+ chars)..."
                value={form.TransferWOSearch}
                onChange={(e) => handleTransferWoSearch(e.target.value)}
                className="pr-8"
              />
              {woSearchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {woSearchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-auto">
                  {woSearchResults.map((item) => (
                    <button
                      key={item.WONo}
                      type="button"
                      onClick={() => handleSelectTransferWo(item)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">#{item.WONo}</span>
                      {item.ShipName && (
                        <span className="text-muted-foreground ml-2">{item.ShipName}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignment Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Assignment Details</h4>
            <div>
              <Label className="text-muted-foreground">Branch</Label>
              <p className="text-sm font-medium mt-0.5">{branchDisplay}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Current Mechanic</Label>
              <p className="text-sm font-medium mt-0.5">{entry.DispatchName ?? entry.MechanicName ?? "—"}</p>
            </div>
            <div>
              <Label htmlFor="new-mechanic">Assign New Mechanic</Label>
              <Select
                value={form.NewEmployeeNumber || "__none__"}
                onValueChange={(v) => v !== "__none__" && handleMechanicChange(v)}
                disabled={loading}
              >
                <SelectTrigger id="new-mechanic" className="mt-1">
                  <SelectValue placeholder="Choose a mechanic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Choose a mechanic</SelectItem>
                  {mechanics
                    .filter((m) => m?.Number != null)
                    .map((m) => (
                      <SelectItem key={m.Number} value={String(m.Number)}>
                        {m.DispatchName ?? `${m.FirstName ?? ""} ${m.LastName ?? ""}`.trim()} ({m.Number})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Tracking */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Time Tracking</h4>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Work Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Work Details</h4>
            <div>
              <Label htmlFor="section">Section/Repair Code</Label>
              <Select
                value={form.Section}
                onValueChange={(v) => setForm((p) => ({ ...p, Section: v }))}
                disabled={loading}
              >
                <SelectTrigger id="section" className="mt-1 w-full">
                  <SelectValue placeholder="Choose section (optional)" />
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
            <div>
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={form.SignatureComments}
                onChange={(e) => setForm((p) => ({ ...p, SignatureComments: e.target.value }))}
                placeholder="Enter any additional comments or notes about this labor entry..."
                rows={4}
                className="mt-1"
              />
            </div>
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
