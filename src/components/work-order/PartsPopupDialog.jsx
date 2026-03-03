"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package } from "lucide-react";

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

export default function PartsPopupDialog({ open, onOpenChange, billing }) {
  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const partsItems = lineItems.filter(
    (item) => (item.EntryType || item.Type || "").toString().toUpperCase() === "P"
  );
  const partsSubTotal = partsItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);
  const calc = billing?.calculations ?? {};
  const showCost = true; // Could derive from permissions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-500" />
            Parts
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700">
          {partsItems.length === 0 ? (
            <p className="py-8 text-center text-slate-500 dark:text-slate-400">No parts on this work order.</p>
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
                {partsItems.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 dark:border-slate-700/50 ${
                      item.BOStatus === 1 ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                    }`}
                  >
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                      {item.CodeDescription || "Parts"} ({item.Code || item.EntryType || "P"})
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
                    Parts total
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                    {formatCurrency(partsSubTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
