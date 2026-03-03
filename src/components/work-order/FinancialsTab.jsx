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
    setLoading(true);
    setError(null);
    getAccountingBreakdown(wo.WONo, token)
      .then(setBreakdown)
      .catch((err) => setError(err?.message || "Failed to load accounting breakdown"))
      .finally(() => setLoading(false));
  }, [wo?.WONo, token]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-500" />
          Accounting
        </h3>
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          Loading accounting breakdown…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-500" />
          Accounting
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const items = breakdown ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-500" />
          Accounting
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          No accounting breakdown for this work order.
        </p>
      </div>
    );
  }

  const grouped = groupBy(items, "Journal");
  const journals = Object.keys(grouped).sort();

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-500" />
          Accounting
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          GL entries grouped by journal
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">Journal</th>
              <th className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">Date</th>
              <th className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">Account</th>
              <th className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">Description</th>
              <th className="text-right py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">Amount</th>
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
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                        {i === 0 ? (journal || "—") : ""}
                      </td>
                      <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                        {item.APInvoiceDate || item.PostedDate || item.EffectiveDate
                          ? new Date(item.APInvoiceDate || item.PostedDate || item.EffectiveDate).toLocaleDateString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{item.AccountNo ?? "—"}</td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">
                        {item.CombinedDescription || item.Description || item.ControlNo || item.CheckNo || "—"}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.Amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 font-medium">
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-400" colSpan={4}>
                      Subtotal ({rows.length} items)
                    </td>
                    <td
                      className={`py-2 px-4 text-right tabular-nums ${subTotal < 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      {formatCurrency(subTotal)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
              <td className="py-3 px-4 text-slate-800 dark:text-slate-200" colSpan={4}>
                Total
              </td>
              <td
                className={`py-3 px-4 text-right tabular-nums ${
                  items.reduce((s, r) => s + (Number(r.Amount) || 0), 0) !== 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
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
