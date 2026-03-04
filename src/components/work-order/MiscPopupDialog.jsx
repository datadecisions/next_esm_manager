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
            <Cog className="h-5 w-5 text-cyan-500" />
            Misc
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700">
          {isOpen ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Misc Charges</h3>
                <Button size="sm" onClick={() => setShowAddMisc(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Misc Charge
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : miscItems.length === 0 ? (
                <div className="py-4">
                  <p className="text-slate-500 dark:text-slate-400 italic mb-3">No misc charges on this work order.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddMisc(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Misc Charge
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400 w-20"></th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Code</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Description</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                      {showCost && (
                        <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Cost</th>
                      )}
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miscItems.map((item) => (
                      <tr key={item.ID} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-cyan-600"
                              onClick={() => setEditEntry(item)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
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
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{getSaleCode(item)}</td>
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{item.Description ?? "—"}</td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{formatDate(item.EntryDate)}</td>
                        {showCost && (
                          <td className="py-2 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {item.Cost != null ? formatCurrency(item.Cost) : "—"}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.Sell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-medium">
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300" colSpan={showCost ? 5 : 4}>
                        Misc total
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
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
                <p className="py-8 text-center text-slate-500 dark:text-slate-400">No misc charges on this work order.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Type</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Item</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Description</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Qty</th>
                      {showCost && (
                        <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Cost</th>
                      )}
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miscLineItems.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {item.CodeDescription || "Misc"} ({item.Code || item.EntryType || "M"})
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {[item.ItemNo, item.ItemName].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{item.Description ?? "—"}</td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{formatDate(item.ItemDate)}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {item.Qty != null ? Number(item.Qty).toFixed(2) : "—"}
                        </td>
                        {showCost && (
                          <td className="py-2 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {item.Cost != null && item.Cost !== "N/A" ? formatCurrency(item.Cost) : (item.Cost ?? "—")}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.Extended)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-medium">
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300" colSpan={showCost ? 5 : 4}>
                        Misc total
                      </td>
                      <td colSpan={showCost ? 2 : 1} className="py-3 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
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
