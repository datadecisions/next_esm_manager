"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DateRangeInput } from "@/components/DateRangeInput";
import { getEquipmentHistory } from "@/lib/api/equipment";
import { getDispositionText } from "@/lib/api/work-order";

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
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const HISTORY_TYPES = [
  { id: "closed", name: "Closed", dateKey: "ClosedDate", dateTitle: "Closed Date" },
];

export default function WoHistoryDialog({ open, onOpenChange, wo, token }) {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyType, setHistoryType] = useState(HISTORY_TYPES[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortProp, setSortProp] = useState("ClosedDate");
  const [sortReverse, setSortReverse] = useState(true);

  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  const defaultStart = start.toISOString().slice(0, 10);
  const defaultEnd = end.toISOString().slice(0, 10);

  useEffect(() => {
    if (!open || !wo?.SerialNo || !token) return;
    queueMicrotask(() => {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      setHistory([]);
      setError(null);
    });
  }, [open, wo?.SerialNo, token, defaultStart, defaultEnd]);

  useEffect(() => {
    if (!open || !wo?.SerialNo || !token) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    getEquipmentHistory(wo.SerialNo, token)
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch((err) => setError(err?.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }, [open, wo?.SerialNo, token]);

  const filtered = React.useMemo(() => {
    let list = [...history];
    const startVal = startDate || defaultStart;
    const endVal = endDate || defaultEnd;
    const startMs = new Date(startVal).getTime();
    const endMs = new Date(endVal).getTime();
    list = list.filter((o) => {
      const d = o[historyType.dateKey];
      if (!d) return false;
      const ms = new Date(d).getTime();
      return ms >= startMs && ms <= endMs;
    });
    list.sort((a, b) => {
      let va = a[sortProp];
      let vb = b[sortProp];
      if (sortProp === "TotalWithoutTax" || sortProp === "HourMeter") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      }
      const cmp = va == null && vb == null ? 0 : (va < vb ? -1 : va > vb ? 1 : 0);
      return sortReverse ? -cmp : cmp;
    });
    return list;
  }, [history, startDate, endDate, historyType, sortProp, sortReverse, defaultStart, defaultEnd]);

  const sortBy = (prop) => {
    if (sortProp === prop) setSortReverse((r) => !r);
    else {
      setSortProp(prop);
      setSortReverse(prop === "ClosedDate" || prop === "WONo" ? true : false);
    }
  };

  const handleRowClick = (wono) => {
    onOpenChange(false);
    router.push(`/work-orders/${wono}`);
  };

  if (!wo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Work Order History</DialogTitle>
        </DialogHeader>

        {!wo.SerialNo ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
            Add equipment (Serial No.) to this work order to view history.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[140px]">
                <Label className="text-xs">Type</Label>
                <Select value={historyType.id} onValueChange={(v) => setHistoryType(HISTORY_TYPES.find((t) => t.id === v) || HISTORY_TYPES[0])}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HISTORY_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DateRangeInput
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(val) => setStartDate(val || "")}
                onEndDateChange={(val) => setEndDate(val || "")}
                onDebouncedChange={() => {}}
                startLabel="Start Date"
                endLabel="End Date"
                inputClassName="mt-1 min-w-[120px]"
              />
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">Loading…</div>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400 py-4">{error}</p>
            ) : (
              <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th
                        className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                        onClick={() => sortBy("WONo")}
                      >
                        WONo {sortProp === "WONo" && (sortReverse ? "↓" : "↑")}
                      </th>
                      <th
                        className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                        onClick={() => sortBy(historyType.dateKey)}
                      >
                        {historyType.dateTitle} {sortProp === historyType.dateKey && (sortReverse ? "↓" : "↑")}
                      </th>
                      <th
                        className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                        onClick={() => sortBy("HourMeter")}
                      >
                        Meter {sortProp === "HourMeter" && (sortReverse ? "↓" : "↑")}
                      </th>
                      <th
                        className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                        onClick={() => sortBy("TotalWithoutTax")}
                      >
                        Amount {sortProp === "TotalWithoutTax" && (sortReverse ? "↓" : "↑")}
                      </th>
                      <th
                        className="text-left py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                        onClick={() => sortBy("Disposition")}
                      >
                        Type {sortProp === "Disposition" && (sortReverse ? "↓" : "↑")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => (
                      <tr
                        key={order.WONo}
                        onClick={() => handleRowClick(order.WONo)}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
                      >
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200 font-medium">
                          {order.WONo}
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {formatDate(order[historyType.dateKey])}
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {order.HourMeter ?? "—"}
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {formatCurrency(order.TotalWithoutTax)}
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {order.GuaranteedMaintenance === -1 ? "Int" : getDispositionText(order.Disposition) || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No work orders in date range
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
