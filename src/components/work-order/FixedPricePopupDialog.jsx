"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Quote, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFixed, deleteFixed } from "@/lib/api/work-order";
import AddFixedDialog from "./AddFixedDialog";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function getTypeLabel(type) {
  const t = (type || "").toString().toUpperCase();
  if (t === "L") return "Labor";
  if (t === "R") return "Rental";
  if (t === "M") return "Misc";
  return type ?? "—";
}

export default function FixedPricePopupDialog({ open, onOpenChange, wo, billing, token, onFixedUpdate }) {
  const disposition = wo?.Disposition ?? 1;
  const isOpen = disposition === 1 || disposition === 11 || disposition === 12;

  const [fixedItems, setFixedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [addFixedOpen, setAddFixedOpen] = useState(false);

  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const fixedLineItems = lineItems.filter(
    (item) => (item.EntryType || item.Type || "").toString().toUpperCase() === "F"
  );

  const fetchFixed = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoading(true);
    try {
      const data = await getFixed(wo.WONo, token);
      setFixedItems(Array.isArray(data) ? data : []);
    } catch {
      setFixedItems([]);
    } finally {
      setLoading(false);
    }
  }, [wo?.WONo, token, open]);

  useEffect(() => {
    if (open && isOpen && wo?.WONo && token) {
      fetchFixed();
    }
  }, [open, isOpen, wo?.WONo, token, fetchFixed]);

  const handleDelete = async (entry) => {
    if (!token || !entry?.ID) return;
    if (!confirm("Are you sure you want to delete this fixed price item?")) return;
    setDeletingId(entry.ID);
    try {
      await deleteFixed(entry.ID, token);
      setFixedItems((prev) => prev.filter((e) => e.ID !== entry.ID));
      onFixedUpdate?.();
      toast.success("Fixed price item deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const fixedSubTotal = isOpen
    ? fixedItems.reduce((s, i) => s + (Number(i.Amount) || 0), 0)
    : fixedLineItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="wide" className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-primary" />
              Fixed Price
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card text-card-foreground">
            {isOpen ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold">Fixed Price Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddFixedOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add new fixed charge
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : fixedItems.length === 0 ? (
                <p className="py-4 italic text-muted-foreground">No fixed price items on this work order.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/40">
                    <tr>
                      <th className="w-20 px-4 py-2.5 text-left font-medium text-muted-foreground"></th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Section</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixedItems.map((item) => (
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
                        <td className="px-4 py-2 text-muted-foreground">{getTypeLabel(item.Type)}</td>
                        <td className="px-4 py-2 text-foreground">{item.Description ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{item.RepairCode ?? item.Section ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.Amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="px-4 py-3 text-foreground" colSpan={4}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(fixedSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ) : (
            <div className="p-4">
              {fixedLineItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No fixed price items on this work order.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixedLineItems.map((item, idx) => (
                      <tr key={item.ID ?? idx} className="border-b border-border/50">
                        <td className="px-4 py-2 text-muted-foreground">{getTypeLabel(item.Type ?? item.ItemNo)}</td>
                        <td className="px-4 py-2 text-foreground">{item.Description ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.Extended ?? item.Amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="px-4 py-3 text-foreground" colSpan={2}>
                        Fixed Price total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(fixedSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
        </DialogContent>
      </Dialog>

      <AddFixedDialog
        open={addFixedOpen}
        onOpenChange={setAddFixedOpen}
        wo={wo}
        token={token}
        onSuccess={() => {
          fetchFixed();
          onFixedUpdate?.();
        }}
      />
    </>
  );
}
