"use client";

import React, { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { getAccountingBreakdown } from "@/lib/api/work-order";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function groupBy(arr, key) {
  return arr.reduce((acc, x) => {
    const k = x[key] ?? "";
    (acc[k] = acc[k] || []).push(x);
    return acc;
  }, {});
}

export default function FinancialsTab({ wo, token }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!wo?.WONo || !token) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    getAccountingBreakdown(wo.WONo, token)
      .then(setBreakdown)
      .catch((err) => setError(err?.message || "Failed to load accounting breakdown"))
      .finally(() => setLoading(false));
  }, [wo?.WONo, token]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          Accounting
        </h3>
        <div className="py-8 text-center text-muted-foreground">
          Loading accounting breakdown…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          Accounting
        </h3>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const items = breakdown ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          Accounting
        </h3>
        <p className="py-6 text-center text-sm text-muted-foreground">
          No accounting breakdown for this work order.
        </p>
      </div>
    );
  }

  const grouped = groupBy(items, "Journal");
  const journals = Object.keys(grouped).sort();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          Accounting
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          GL entries grouped by journal
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Journal</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Account</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((journal) => {
              const rows = grouped[journal].sort((a, b) => (a.AccountNo || "").localeCompare(b.AccountNo || ""));
              const subTotal = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
              return (
                <React.Fragment key={String(journal || "ungrouped")}>
                  {rows.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="px-4 py-2 text-muted-foreground">
                        {i === 0 ? (journal || "—") : ""}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {item.APInvoiceDate || item.PostedDate || item.EffectiveDate
                          ? new Date(item.APInvoiceDate || item.PostedDate || item.EffectiveDate).toLocaleDateString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{item.AccountNo ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">
                        {item.CombinedDescription || item.Description || item.ControlNo || item.CheckNo || "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(item.Amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-border bg-muted/30 font-medium">
                    <td className="px-4 py-2 text-muted-foreground" colSpan={4}>
                      Subtotal ({rows.length} items)
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${subTotal < 0 ? "text-destructive" : "text-foreground"}`}
                    >
                      {formatCurrency(subTotal)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40 font-semibold">
              <td className="px-4 py-3 text-foreground" colSpan={4}>
                Total
              </td>
              <td
                className={`py-3 px-4 text-right tabular-nums ${
                  items.reduce((s, r) => s + (Number(r.Amount) || 0), 0) !== 0
                    ? "text-destructive"
                    : "text-primary"
                }`}
              >
                {formatCurrency(items.reduce((s, r) => s + (Number(r.Amount) || 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
