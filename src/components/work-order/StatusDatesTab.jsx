"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateWorkOrder } from "@/lib/api/work-order";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function StatusDatesTab({ wo, token, onStatusUpdate }) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const paperWorkComplete = wo?.PaperWorkComplete === -1 || wo?.PaperWorkComplete === 1;
  const shopRentalGiven = wo?.ShopRentalGiven === -1 || wo?.ShopRentalGiven === 1;
  const shopInboundDroppedOff = wo?.ShopInboundDroppedOff === 1 || wo?.ShopInboundDroppedOff === -1;
  const shopInboundPickedUp = wo?.ShopInboundPickedUp === 1 || wo?.ShopInboundPickedUp === -1;
  const shopOutboundDroppedOff = wo?.ShopOutboundDroppedOff === 1 || wo?.ShopOutboundDroppedOff === -1;
  const shopOutboundPickedUp = wo?.ShopOutboundPickedUp === 1 || wo?.ShopOutboundPickedUp === -1;

  const handleSave = async (payload) => {
    if (!token || !wo?.WONo || saving) return;
    setSaving(true);
    try {
      await updateWorkOrder({ WONo: wo.WONo, ...payload }, "Update", token);
      onStatusUpdate?.(payload);
      setDirty(false);
      toast.success("Status updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = () => {
    const form = document.querySelector("form[name='serviceAdmin']");
    if (!form) return;
    const fd = new FormData(form);
    const payload = {};
    const numFields = ["ShopQuoteHours", "ShopQuoteAmount", "ShopApprovedAmount"];
    const dateFields = [
      "ShopQuoteDate", "ShopAdditionalQuoteDate", "ShopQuoteDeclinedDate",
      "ShopRecvDate", "ShopDateIn", "ShopSoldDate", "ShopWorkStarted", "ShopEstimatedCompletionDate",
    ];
    const textFields = ["ShopStatus", "AuthorizedBy", "RONo", "ReWorkTechnician", "ShopComments"];
    numFields.forEach((k) => {
      const v = fd.get(k);
      payload[k] = v === "" || v === null || v === undefined ? null : (parseFloat(v) || 0);
    });
    dateFields.forEach((k) => {
      const v = fd.get(k);
      if (v) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) payload[k] = d.toISOString();
      } else payload[k] = null;
    });
    textFields.forEach((k) => {
      payload[k] = fd.get(k) ?? "";
    });
    payload.PaperWorkComplete = fd.get("PaperWorkComplete") === "on" ? -1 : 0;
    payload.ShopRentalGiven = fd.get("ShopRentalGiven") === "on" ? -1 : 0;
    payload.ShopInboundDroppedOff = fd.get("ShopInboundDroppedOff") === "on" ? 1 : 0;
    payload.ShopInboundPickedUp = fd.get("ShopInboundPickedUp") === "on" ? 1 : 0;
    payload.ShopOutboundDroppedOff = fd.get("ShopOutboundDroppedOff") === "on" ? 1 : 0;
    payload.ShopOutboundPickedUp = fd.get("ShopOutboundPickedUp") === "on" ? 1 : 0;
    if (payload.PaperWorkComplete === -1) payload.PaperWorkDate = new Date().toISOString();
    handleSave(payload);
  };

  const fieldProps = (name, type = "text") => ({
    name,
    defaultValue: wo?.[name] ?? "",
    onChange: () => setDirty(true),
    ...(type === "number" && { type: "number", min: 0, step: 0.01 }),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold">Service Admin</h2>
      </div>
      <form name="serviceAdmin" className="p-6 space-y-8" onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
        {/* Quotes & Dates */}
        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h4 className="mb-4 text-lg font-semibold text-primary">Quotes</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quote Hours</Label>
                <Input {...fieldProps("ShopQuoteHours", "number")} />
              </div>
              <div className="space-y-2">
                <Label>Quoted Amount</Label>
                <Input {...fieldProps("ShopQuoteAmount", "number")} />
              </div>
              <div className="space-y-2">
                <Label>Approved Amount</Label>
                <Input {...fieldProps("ShopApprovedAmount", "number")} />
              </div>
              <div className="space-y-2">
                <Label>Quote Date</Label>
                <Input type="date" {...fieldProps("ShopQuoteDate")} defaultValue={wo?.ShopQuoteDate ? new Date(wo.ShopQuoteDate).toISOString().slice(0, 10) : ""} />
              </div>
              <div className="space-y-2">
                <Label>Additional Quote Date</Label>
                <Input type="date" name="ShopAdditionalQuoteDate" defaultValue={wo?.ShopAdditionalQuoteDate ? new Date(wo.ShopAdditionalQuoteDate).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
              <div className="space-y-2">
                <Label>Quote Declined Date</Label>
                <Input type="date" name="ShopQuoteDeclinedDate" defaultValue={wo?.ShopQuoteDeclinedDate ? new Date(wo.ShopQuoteDeclinedDate).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-4 text-lg font-semibold text-primary">Dates</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shop Recv Date</Label>
                <Input type="date" name="ShopRecvDate" defaultValue={wo?.ShopRecvDate ? new Date(wo.ShopRecvDate).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
              <div className="space-y-2">
                <Label>Shop In Date</Label>
                <Input type="date" name="ShopDateIn" defaultValue={wo?.ShopDateIn ? new Date(wo.ShopDateIn).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
              <div className="space-y-2">
                <Label>Shop Sold Date</Label>
                <Input type="date" name="ShopSoldDate" defaultValue={wo?.ShopSoldDate ? new Date(wo.ShopSoldDate).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
              <div className="space-y-2">
                <Label>Shop Work Started Date</Label>
                <Input type="date" name="ShopWorkStarted" defaultValue={wo?.ShopWorkStarted ? new Date(wo.ShopWorkStarted).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
              <div className="space-y-2">
                <Label>Estimated Completion Date</Label>
                <Input type="date" name="ShopEstimatedCompletionDate" defaultValue={wo?.ShopEstimatedCompletionDate ? new Date(wo.ShopEstimatedCompletionDate).toISOString().slice(0, 10) : ""} onChange={() => setDirty(true)} />
              </div>
            </div>
          </section>
        </div>

        <hr className="border-border" />

        {/* Other & Inbound/Outbound */}
        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h4 className="mb-4 text-lg font-semibold text-primary">Other</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shop Status</Label>
                <Input {...fieldProps("ShopStatus")} />
              </div>
              <div className="space-y-2">
                <Label>Authorized By</Label>
                <Input {...fieldProps("AuthorizedBy")} />
              </div>
              <div className="space-y-2">
                <Label>RO #</Label>
                <Input {...fieldProps("RONo")} />
              </div>
              <div className="space-y-2">
                <Label>Rework Technician</Label>
                <Input {...fieldProps("ReWorkTechnician")} />
              </div>
            </div>
          </section>

          <section>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h5 className="mb-2 text-sm font-semibold text-foreground">Inbound</h5>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" name="ShopInboundDroppedOff" defaultChecked={shopInboundDroppedOff} onChange={() => setDirty(true)} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <span className="text-sm">Dropped Off</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ShopInboundPickedUp" defaultChecked={shopInboundPickedUp} onChange={() => setDirty(true)} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <span className="text-sm">Picked Up</span>
                </label>
              </div>
              <div>
                <h5 className="mb-2 text-sm font-semibold text-foreground">Outbound</h5>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" name="ShopOutboundDroppedOff" defaultChecked={shopOutboundDroppedOff} onChange={() => setDirty(true)} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <span className="text-sm">Dropped Off</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="ShopOutboundPickedUp" defaultChecked={shopOutboundPickedUp} onChange={() => setDirty(true)} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <span className="text-sm">Picked Up</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="PaperWorkComplete" defaultChecked={paperWorkComplete} onChange={() => setDirty(true)} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <span className="text-sm font-medium">Paperwork turned in?</span>
              </label>
              {wo?.PaperWorkDate && <p className="ml-6 text-xs text-muted-foreground">Date submitted: <em>{formatDate(wo.PaperWorkDate)}</em></p>}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="ShopRentalGiven" defaultChecked={shopRentalGiven} onChange={() => setDirty(true)} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <span className="text-sm font-medium">Rental issued?</span>
              </label>
              <div className="space-y-2">
                <Label>Shop Comments / Repairs</Label>
                <Textarea name="ShopComments" defaultValue={wo?.ShopComments ?? ""} onChange={() => setDirty(true)} className="min-h-[80px]" />
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? "Saving…" : "Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
