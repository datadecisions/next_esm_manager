"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateWorkOrder } from "@/lib/api/work-order";
import { getSpecStatusOptions, updateEquipmentSpecStatus } from "@/lib/api/equipment";

const NONE_VALUE = "__none__";

const SERVICE_PRIORITY_OPTIONS = [
  { value: NONE_VALUE, label: "—" },
  { value: "High", label: "High" },
  { value: "Normal", label: "Normal" },
  { value: "Low", label: "Low" },
];

export default function EquipmentTab({ wo, token, onEquipmentUpdate, onHistoryClick }) {
  const [specStatusOptions, setSpecStatusOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [serialNo, setSerialNo] = useState(wo?.SerialNo ?? "");
  const [unitNo, setUnitNo] = useState(wo?.UnitNo ?? "");
  const [make, setMake] = useState(wo?.Make ?? "");
  const [model, setModel] = useState(wo?.Model ?? "");
  const [hourMeter, setHourMeter] = useState(wo?.HourMeter ?? "");
  const [specStatus, setSpecStatus] = useState(wo?.SpecStatus ? String(wo.SpecStatus) : NONE_VALUE);
  const [servicePriority, setServicePriority] = useState(
    wo?.ServicePriority ? String(wo.ServicePriority) : NONE_VALUE
  );

  useEffect(() => {
    if (!wo) return;
    setSerialNo(wo.SerialNo ?? "");
    setUnitNo(wo.UnitNo ?? "");
    setMake(wo.Make ?? "");
    setModel(wo.Model ?? "");
    setHourMeter(wo.HourMeter ?? "");
    setSpecStatus(wo.SpecStatus ? String(wo.SpecStatus) : NONE_VALUE);
    setServicePriority(wo.ServicePriority ? String(wo.ServicePriority) : NONE_VALUE);
  }, [wo]);

  useEffect(() => {
    if (!token) return;
    getSpecStatusOptions(token)
      .then(setSpecStatusOptions)
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!token || !wo?.WONo || saving) return;
    setSaving(true);
    try {
      const woPayload = {
        WONo: wo.WONo,
        SerialNo: serialNo,
        UnitNo: unitNo,
        Make: make,
        Model: model,
        HourMeter: hourMeter === "" ? null : (parseFloat(hourMeter) ?? 0),
        ServicePriority: servicePriority === NONE_VALUE ? "" : servicePriority,
      };
      if (woPayload.HourMeter != null) {
        woPayload.HourMeterDate = new Date().toISOString();
      }
      await updateWorkOrder(woPayload, "Update", token);

      if (serialNo && specStatus !== NONE_VALUE) {
        await updateEquipmentSpecStatus(
          {
            SerialNo: serialNo,
            UnitNo: unitNo || undefined,
            Model: model || undefined,
            SpecStatus: specStatus === NONE_VALUE ? "" : specStatus,
          },
          token
        );
      }

      onEquipmentUpdate?.({
        SerialNo: serialNo,
        UnitNo: unitNo,
        Make: make,
        Model: model,
        HourMeter: woPayload.HourMeter,
        SpecStatus: specStatus === NONE_VALUE ? "" : specStatus,
        ServicePriority: woPayload.ServicePriority,
      });
      setDirty(false);
      toast.success("Equipment updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update equipment");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    handleSave();
  };

  const validSpecStatuses = specStatusOptions.filter(
    (s) => s.SpecStatus != null && String(s.SpecStatus).trim() !== ""
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold">Equipment</h2>
      </div>
      <form className="p-6" onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="SerialNo">Serial Number</Label>
              <Input
                id="SerialNo"
                value={serialNo}
                onChange={(e) => { setSerialNo(e.target.value); setDirty(true); }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="UnitNo">Unit Number</Label>
              <Input
                id="UnitNo"
                value={unitNo}
                onChange={(e) => { setUnitNo(e.target.value); setDirty(true); }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Make">Make</Label>
              <Input
                id="Make"
                value={make}
                onChange={(e) => { setMake(e.target.value); setDirty(true); }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="Model">Model</Label>
              <Input
                id="Model"
                value={model}
                onChange={(e) => { setModel(e.target.value); setDirty(true); }}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="HourMeter">Hour Meter</Label>
              <Input
                id="HourMeter"
                type="number"
                min={0}
                step={1}
                value={hourMeter}
                onChange={(e) => { setHourMeter(e.target.value); setDirty(true); }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="SpecStatus">Status</Label>
              <Select value={specStatus} onValueChange={(v) => { setSpecStatus(v); setDirty(true); }}>
                <SelectTrigger id="SpecStatus" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {validSpecStatuses.map((s) => (
                    <SelectItem key={s.SpecStatus} value={String(s.SpecStatus)}>
                      {s.SpecStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ServicePriority">Priority</Label>
              <Select value={servicePriority} onValueChange={(v) => { setServicePriority(v); setDirty(true); }}>
                <SelectTrigger id="ServicePriority" className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={onHistoryClick}
            >
              History
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              Build
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
