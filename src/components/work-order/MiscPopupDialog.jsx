"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cog, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMisc, deleteMisc } from "@/lib/api/work-order";
import AddMiscDialog from "./AddMiscDialog";
import EditMiscDialog from "./EditMiscDialog";

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

function getSaleCode(entry) {
  if (typeof entry?.SaleCode === "object" && entry?.SaleCode !== null) {
    return entry.SaleCode.Code;
  }
  return entry?.SaleCode ?? "—";
}

export default function MiscPopupDialog({ open, onOpenChange, wo, billing, token, onMiscUpdate }) {
  const disposition = wo?.Disposition ?? 1;
  const isOpen = disposition === 1 || disposition === 11 || disposition === 12;

  const [miscItems, setMiscItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddMisc, setShowAddMisc] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const miscLineItems = lineItems.filter(
    (item) => (item.EntryType || item.Type || "").toString().toUpperCase() === "M"
  );
  const showCost = true;

  const fetchMisc = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoading(true);
    try {
      const data = await getMisc(wo.WONo, token);
      setMiscItems(Array.isArray(data) ? data : []);
    } catch {
      setMiscItems([]);
    } finally {
      setLoading(false);
    }
  }, [wo?.WONo, token, open]);

  useEffect(() => {
    if (open && isOpen && wo?.WONo && token) {
      fetchMisc();
    }
  }, [open, isOpen, wo?.WONo, token, fetchMisc]);

  const handleDelete = async (entry) => {
    if (!token || !entry?.ID) return;
    if (!confirm("Are you sure you want to delete this misc charge?")) return;
    setDeletingId(entry.ID);
    try {
      await deleteMisc(entry.ID, token);
      setMiscItems((prev) => prev.filter((e) => e.ID !== entry.ID));
      onMiscUpdate?.();
      toast.success("Misc charge deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const miscSubTotal = isOpen
    ? miscItems.reduce((s, i) => s + (Number(i.Sell) || 0), 0)
    : miscLineItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5 text-primary" />
            Misc
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card text-card-foreground">
          {isOpen ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Misc Charges</h3>
                <Button size="sm" onClick={() => setShowAddMisc(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Misc Charge
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : miscItems.length === 0 ? (
                <div className="py-4">
                  <p className="mb-3 italic text-muted-foreground">No misc charges on this work order.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddMisc(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Misc Charge
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/40">
                    <tr>
                      <th className="w-20 px-4 py-2.5 text-left font-medium text-muted-foreground"></th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Code</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      {showCost && (
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Cost</th>
                      )}
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miscItems.map((item) => (
                      <tr key={item.ID} className="border-b border-border/50">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => setEditEntry(item)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                          </div>
                        </td>
                        <td className="py-2 px-4 text-muted-foreground">{getSaleCode(item)}</td>
                        <td className="py-2 px-4 text-foreground">{item.Description ?? "—"}</td>
                        <td className="py-2 px-4 text-muted-foreground">{formatDate(item.EntryDate)}</td>
                        {showCost && (
                          <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                            {item.Cost != null ? formatCurrency(item.Cost) : "—"}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.Sell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="py-3 px-4 text-foreground" colSpan={showCost ? 5 : 4}>
                        Misc total
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-foreground">
                        {formatCurrency(miscSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ) : (
            /* Closed WO – billing line items (M type) */
            <div className="p-4">
              {miscLineItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No misc charges on this work order.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Item</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                      {showCost && (
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Cost</th>
                      )}
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miscLineItems.map((item, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 px-4 text-muted-foreground">
                          {item.CodeDescription || "Misc"} ({item.Code || item.EntryType || "M"})
                        </td>
                        <td className="py-2 px-4 text-muted-foreground">
                          {[item.ItemNo, item.ItemName].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="py-2 px-4 text-foreground">{item.Description ?? "—"}</td>
                        <td className="py-2 px-4 text-muted-foreground">{formatDate(item.ItemDate)}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                          {item.Qty != null ? Number(item.Qty).toFixed(2) : "—"}
                        </td>
                        {showCost && (
                          <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                            {item.Cost != null && item.Cost !== "N/A" ? formatCurrency(item.Cost) : (item.Cost ?? "—")}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.Extended)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="py-3 px-4 text-foreground" colSpan={showCost ? 5 : 4}>
                        Misc total
                      </td>
                      <td colSpan={showCost ? 2 : 1} className="py-3 px-4 text-right tabular-nums text-foreground">
                        {formatCurrency(miscSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      <AddMiscDialog
        open={showAddMisc}
        onOpenChange={setShowAddMisc}
        wo={wo}
        token={token}
        onSuccess={() => {
          fetchMisc();
          onMiscUpdate?.();
        }}
      />
      <EditMiscDialog
        open={!!editEntry}
        onOpenChange={(o) => !o && setEditEntry(null)}
        entry={editEntry}
        wo={wo}
        token={token}
        onSuccess={() => {
          fetchMisc();
          onMiscUpdate?.();
        }}
      />
    </Dialog>
  );
}
