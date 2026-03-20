"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMechanics } from "@/lib/api/dispatch";
import { updateWorkOrder } from "@/lib/api/work-order";
import { MapPin, ExternalLink } from "lucide-react";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function DispatchTab({ wo, token, onDispatchUpdate }) {
  const [mechanics, setMechanics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scheduleHoursInput, setScheduleHoursInput] = useState("");

  const branch = wo?.SaleBranch ?? "";
  const serviceVan = wo?.ServiceVan ?? "";
  const scheduleDate = wo?.ScheduleDate ? new Date(wo.ScheduleDate).toISOString().slice(0, 16) : "";
  const scheduleHoursFromWo = wo?.ScheduleHours ?? "";

  useEffect(() => {
    setScheduleHoursInput(String(scheduleHoursFromWo));
  }, [scheduleHoursFromWo]);

  useEffect(() => {
    if (!token || !branch) return;
    getMechanics(branch, token).then(setMechanics);
  }, [token, branch]);

  const handleSave = async (payload) => {
    if (!token || !wo?.WONo || saving) return;
    setSaving(true);
    try {
      await updateWorkOrder({ WONo: wo.WONo, ...payload }, "Update", token);
      onDispatchUpdate?.(payload);
      toast.success("Dispatch updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update dispatch");
    } finally {
      setSaving(false);
    }
  };

  const mapAddress = [wo?.ShipAddress, wo?.ShipCity, wo?.ShipState, wo?.ShipZipCode].filter(Boolean).join(", ");
  const mapSearchUrl = mapAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`
    : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Mechanic and Hours */}
      <div className="flex-1 min-w-0">
        <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold">Mechanic and Hours</h3>
          </div>
          <div className="p-6 space-y-4">
            {wo?.DispatchedDate && (
              <p className="text-sm text-muted-foreground">
                Dispatched on <em>{formatDate(wo.DispatchedDate)}</em> to:
              </p>
            )}
            {!branch && (
              <p className="text-sm text-muted-foreground">Select a sale branch in the Order tab to assign mechanics.</p>
            )}
            <div className="space-y-2">
              <Label>Primary Mechanic</Label>
              <Select
                value={serviceVan}
                onValueChange={(v) => handleSave({ ServiceVan: v })}
                disabled={!branch}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={branch ? "Choose mechanic" : "Select branch first"} />
                </SelectTrigger>
                <SelectContent>
                  {mechanics
                    .filter((m) => m.ServiceVan)
                    .map((m) => (
                      <SelectItem key={m.ServiceVan || m.Number} value={String(m.ServiceVan)}>
                        {m.DispatchName || m.ServiceVan || `${m.FirstName || ""} ${m.LastName || ""}`.trim() || "—"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule Date</Label>
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleSave({ ScheduleDate: v ? new Date(v).toISOString() : null });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Schedule Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 1.5"
                  value={scheduleHoursInput}
                  onChange={(e) => setScheduleHoursInput(e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value;
                    const num = v === "" ? null : parseFloat(v);
                    const current = wo?.ScheduleHours ?? null;
                    if ((v === "" && current != null) || (v !== "" && !isNaN(num) && num !== current)) {
                      handleSave({ ScheduleHours: num });
                    }
                  }}
                />
              </div>
            </div>
            {saving && (
              <p className="text-xs text-muted-foreground">Saving…</p>
            )}
          </div>
        </div>
      </div>

      {/* Map / Location */}
      <div className="flex-1 min-w-0 lg:min-w-[400px]">
        <div className="flex h-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </h3>
            {mapSearchUrl && (
              <a
                href={mapSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:opacity-80"
              >
                View on map
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {mapAddress ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{wo?.ShipName || "Ship To"}</p>
                <p className="text-sm text-muted-foreground">{mapAddress}</p>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">No address available for this work order.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
