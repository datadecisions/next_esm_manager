"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tractor, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEquipment, deleteEquipment } from "@/lib/api/work-order";
import AddEquipmentDialog from "./AddEquipmentDialog";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}

export default function EquipmentPopupDialog({ open, onOpenChange, wo, billing, token, onEquipmentUpdate }) {
  const disposition = wo?.Disposition ?? 1;
  const isOpen = disposition === 1 || disposition === 11 || disposition === 12;

  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddEquipment, setShowAddEquipment] = useState(false);

  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const equipmentLineItems = lineItems.filter(
    (item) => (item.EntryType || item.Type || "").toString().toUpperCase() === "E"
  );

  const fetchEquipment = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoading(true);
    try {
      const data = await getEquipment(wo.WONo, token);
      setEquipmentItems(Array.isArray(data) ? data : []);
    } catch {
      setEquipmentItems([]);
    } finally {
      setLoading(false);
    }
  }, [wo?.WONo, token, open]);

  useEffect(() => {
    if (open && isOpen && wo?.WONo && token) {
      fetchEquipment();
    }
  }, [open, isOpen, wo?.WONo, token, fetchEquipment]);

  const handleDelete = async (entry) => {
    if (!token || !entry?.ID) return;
    if (!confirm("Are you sure you want to delete this equipment charge?")) return;
    setDeletingId(entry.ID);
    try {
      await deleteEquipment(entry.ID, token);
      setEquipmentItems((prev) => prev.filter((e) => e.ID !== entry.ID));
      onEquipmentUpdate?.();
      toast.success("Equipment charge deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const equipmentSubTotal = isOpen
    ? equipmentItems.reduce((s, i) => s + (Number(i.Sell) || 0), 0)
    : equipmentLineItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tractor className="h-5 w-5 text-primary" />
            Equipment Charges
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card text-card-foreground">
          {isOpen ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Equipment Charges (Rental)</h3>
                <Button size="sm" onClick={() => setShowAddEquipment(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Equipment Charge
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : equipmentItems.length === 0 ? (
                <div className="py-4">
                  <p className="mb-3 italic text-muted-foreground">No equipment charges for this work order.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddEquipment(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Equipment Charge
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/40">
                    <tr>
                      <th className="w-20 px-4 py-2.5 text-left font-medium text-muted-foreground"></th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Unit No</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Est. Cost</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentItems.map((item) => (
                      <tr key={item.ID} className="border-b border-border/50">
                        <td className="py-2 px-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/80"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.ID}
                            title="Delete"
                          >
                            {deletingId === item.ID ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                        <td className="px-4 py-2 text-foreground">{item.SerialNo ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{item.UnitNo ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(item.EntryDate)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {item.Cost != null ? formatCurrency(item.Cost) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.Sell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="px-4 py-3 text-foreground" colSpan={5}>
                        Total Amount
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(equipmentSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ) : (
            /* Closed WO – billing line items (E type) */
            <div className="p-4">
              {equipmentLineItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No equipment charges on this work order.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Item</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentLineItems.map((item, idx) => (
                      <tr key={item.ID ?? idx} className="border-b border-border/50">
                        <td className="px-4 py-2 text-muted-foreground">Equipment</td>
                        <td className="px-4 py-2 text-foreground">{item.PartNo ?? item.Code ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{item.Description ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.Extended ?? item.Sell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="px-4 py-3 text-foreground" colSpan={3}>
                        Equipment total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(equipmentSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      <AddEquipmentDialog
        open={showAddEquipment}
        onOpenChange={setShowAddEquipment}
        wo={wo}
        token={token}
        onSuccess={fetchEquipment}
      />
    </Dialog>
  );
}
