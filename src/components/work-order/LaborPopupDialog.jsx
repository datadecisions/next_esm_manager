"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench, Download, Trash2, Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLaborArrivals, getLaborImports, importLabor, deleteLaborImport } from "@/lib/api/labor";
import AddLaborDialog from "./AddLaborDialog";
import EditPostedLaborDialog from "./EditPostedLaborDialog";
import EditImportedLaborDialog from "./EditImportedLaborDialog";

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

function formatDateTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Duration in ms to fractional hours (e.g. 1.5) */
function msToHours(ms) {
  if (ms == null || isNaN(ms)) return "0.00";
  return (ms / (1000 * 60 * 60)).toFixed(2);
}

/** Compute duration between arrival and departure */
function getDuration(arrival, departure) {
  if (!arrival || !departure) return 0;
  const a = new Date(arrival).getTime();
  const d = new Date(departure).getTime();
  return isNaN(a) || isNaN(d) ? 0 : Math.max(0, d - a);
}

export default function LaborPopupDialog({ open, onOpenChange, wo, billing, token, onLaborUpdate }) {
  const disposition = wo?.Disposition ?? 1;
  const isOpen = disposition === 1 || disposition === 11 || disposition === 12; // Open, Quote, Accepted

  const [postedLabor, setPostedLabor] = useState([]);
  const [importedLabor, setImportedLabor] = useState([]);
  const [loadingPosted, setLoadingPosted] = useState(false);
  const [loadingImported, setLoadingImported] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [editPostedEntry, setEditPostedEntry] = useState(null);
  const [editImportedEntry, setEditImportedEntry] = useState(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const setMidnight = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const setBeforeMidnight = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x.getTime();
  };
  const filteredPostedLabor = showDateFilter
    ? postedLabor.filter((e) => {
        const arrival = new Date(e.ArrivalDateTime).getTime();
        const departure = e.DepartureDateTime ? new Date(e.DepartureDateTime).getTime() : arrival;
        return arrival >= setMidnight(startDate) && departure <= setBeforeMidnight(endDate);
      })
    : postedLabor;
  const totalPostedHours = filteredPostedLabor.reduce((s, e) => s + (e.duration || 0), 0);

  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const laborLineItems = lineItems.filter(
    (item) => (item.EntryType || item.Type || "").toString().toUpperCase() === "L"
  );
  const laborSubTotal = laborLineItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);
  const laborHours = laborLineItems.reduce((s, i) => s + (Number(i.Qty) || Number(i.Hours) || 0), 0);

  const fetchPosted = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoadingPosted(true);
    try {
      const data = await getLaborArrivals(wo.WONo, token);
      const filtered = Array.isArray(data)
        ? data.filter((e) => !e.ImportFlag)
        : [];
      const withDuration = filtered.map((e) => ({
        ...e,
        duration: getDuration(e.ArrivalDateTime, e.DepartureDateTime),
      }));
      setPostedLabor(withDuration);
    } catch {
      setPostedLabor([]);
    } finally {
      setLoadingPosted(false);
    }
  }, [wo?.WONo, token, open]);

  const fetchImported = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoadingImported(true);
    try {
      const data = await getLaborImports(wo.WONo, token);
      const filtered = Array.isArray(data)
        ? data.filter((item) => !item.TransferWONoFrom)
        : [];
      setImportedLabor(filtered);
    } catch {
      setImportedLabor([]);
    } finally {
      setLoadingImported(false);
    }
  }, [wo?.WONo, token, open]);

  useEffect(() => {
    if (open && isOpen && wo?.WONo && token) {
      fetchPosted();
      fetchImported();
    }
  }, [open, isOpen, wo?.WONo, token, fetchPosted, fetchImported]);

  const handleImportAll = async () => {
    if (!wo?.WONo || !token || importing) return;
    const inProgress = postedLabor.filter(
      (e) => !e.DepartureDateTime || (e.Disposition === 2 && e.ImportFlag !== -1)
    );
    if (inProgress.length) {
      if (!confirm("In progress and closed time will not be imported. Continue?")) return;
    }
    setImporting(true);
    try {
      await importLabor({ WONo: wo.WONo }, token);
      await fetchPosted();
      await fetchImported();
      onLaborUpdate?.();
    } catch (err) {
      alert(err?.message || "Failed to import labor");
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteImport = async (entry) => {
    if (!token || !entry?.ID) return;
    if (!confirm("Are you sure you want to delete this labor entry?")) return;
    setDeletingId(entry.ID);
    try {
      await deleteLaborImport(entry.ID, token);
      setImportedLabor((prev) => prev.filter((e) => e.ID !== entry.ID));
      onLaborUpdate?.();
    } catch (err) {
      alert(err?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const totalImportedHours = importedLabor
    .filter((e) => e.Transfer !== -1)
    .reduce((s, e) => s + (Number(e.Hours) || 0), 0);
  const totalImportedBilled = importedLabor
    .filter((e) => e.Transfer !== -1)
    .reduce((s, e) => s + (Number(e.Sell) || 0), 0);

  const getSaleCode = (entry) => {
    if (typeof entry?.SaleCode === "object" && entry?.SaleCode !== null) {
      return entry.SaleCode.Code;
    }
    return entry?.SaleCode ?? "—";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-500" />
            Labor
            {laborHours > 0 && (
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({laborHours.toFixed(1)} hrs)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700">
          {isOpen ? (
            <div className="space-y-6 p-4">
              {/* Posted Labor (Labor To Import) */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Labor To Import</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={showDateFilter ? "secondary" : "ghost"}
                      onClick={() => setShowDateFilter((v) => !v)}
                    >
                      Filter by date
                    </Button>
                    {postedLabor.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleImportAll}
                        disabled={importing}
                        className="gap-2"
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Import All Posted Labor
                      </Button>
                    )}
                  </div>
                </div>
                {showDateFilter && postedLabor.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <div>
                      <Label htmlFor="startDate" className="text-xs">Start</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-0.5 h-8 w-36"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-xs">End</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-0.5 h-8 w-36"
                      />
                    </div>
                  </div>
                )}
                {loadingPosted ? (
                  <div className="flex items-center gap-2 py-8 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : postedLabor.length === 0 ? (
                  <p className="py-4 text-slate-500 dark:text-slate-400 italic">There is no labor to import.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400 w-12"></th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Technician</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">WO</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Start</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">End</th>
                          <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Duration</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredPostedLabor]
                          .sort((a, b) => new Date(b.ArrivalDateTime) - new Date(a.ArrivalDateTime))
                          .map((hours) => (
                            <tr key={hours.ID} className="border-t border-slate-100 dark:border-slate-700/50">
                              <td className="py-2 px-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-cyan-600"
                                  onClick={() => setEditPostedEntry(hours)}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="py-2 px-4">{hours.DispatchName ?? "—"}</td>
                              <td className="py-2 px-4">{hours.WONo ?? "—"}</td>
                              <td className="py-2 px-4">{formatDate(hours.ArrivalDateTime)}</td>
                              <td className="py-2 px-4">{formatDateTime(hours.ArrivalDateTime)}</td>
                              <td className="py-2 px-4">{formatDateTime(hours.DepartureDateTime)}</td>
                              <td className="py-2 px-4 text-right tabular-nums">{msToHours(hours.duration)} hrs</td>
                              <td className="py-2 px-4">{hours.Section === "true" || hours.Section === true ? "Labor" : hours.Section ?? hours.SignatureComments ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-medium">
                          <td className="py-2.5 px-4" colSpan={6}>Total Hours</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                            {msToHours(totalPostedHours)} hrs
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>

              {/* Imported Labor */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Labor</h3>
                  <Button size="sm" onClick={() => setShowAddLabor(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Labor Entry
                  </Button>
                </div>
                {loadingImported ? (
                  <div className="flex items-center gap-2 py-8 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : importedLabor.length === 0 ? (
                  <div className="py-4">
                    <p className="text-slate-500 dark:text-slate-400 italic mb-3">No labor has been imported.</p>
                    <Button size="sm" variant="outline" onClick={() => setShowAddLabor(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Labor Entry
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400 w-20"></th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Tech</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                          <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Hrs</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">WO</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Code</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Rate</th>
                          <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Billed</th>
                          <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Billed × Hrs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...importedLabor]
                          .sort((a, b) => new Date(b.DateOfLabor) - new Date(a.DateOfLabor))
                          .map((entry) => (
                            <tr
                              key={entry.ID}
                              className={`border-t border-slate-100 dark:border-slate-700/50 ${
                                entry.Transfer === -1 ? "bg-red-50 dark:bg-red-950/50 line-through text-slate-400" : ""
                              }`}
                            >
                              <td className="py-2 px-4">
                                {entry.Disposition !== 2 && entry.Transfer !== -1 && (
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-500 hover:text-cyan-600"
                                      onClick={() => setEditImportedEntry(entry)}
                                      title="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                      onClick={() => handleDeleteImport(entry)}
                                      disabled={deletingId === entry.ID}
                                      title="Delete"
                                    >
                                      {deletingId === entry.ID ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-4 whitespace-nowrap">
                                {entry.MechanicName} ({entry.MechanicNo})
                              </td>
                              <td className="py-2 px-4 whitespace-nowrap">{formatDate(entry.DateOfLabor)}</td>
                              <td className="py-2 px-4 text-right tabular-nums">{(entry.Hours ?? 0).toFixed(2)}</td>
                              <td className="py-2 px-4 whitespace-nowrap">{entry.WONo}</td>
                              <td className="py-2 px-4 whitespace-nowrap">{getSaleCode(entry)}</td>
                              <td className="py-2 px-4 whitespace-nowrap">{entry.LaborRateType ?? "—"}</td>
                              <td className="py-2 px-4 whitespace-nowrap">{formatCurrency(entry.SellRate)}</td>
                              <td className="py-2 px-4 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">
                                {formatCurrency(entry.Sell)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-medium">
                          <td className="py-2.5 px-4" colSpan={3}>Total Hours</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                            {totalImportedHours.toFixed(2)} hrs
                          </td>
                          <td className="py-2.5 px-4" colSpan={4} />
                          <td className="py-2.5 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                            Total Billed: {formatCurrency(totalImportedBilled)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : (
            /* Closed WO – billing line items (L type) */
            <div className="p-4">
              {laborLineItems.length === 0 ? (
                <p className="py-8 text-center text-slate-500 dark:text-slate-400">No labor on this work order.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Type</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Item</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Description</th>
                      <th className="text-left py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Hrs</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Cost</th>
                      <th className="text-right py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laborLineItems.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {item.CodeDescription || "Labor"} ({item.Code || item.EntryType || "L"})
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {[item.ItemNo, item.ItemName].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{item.Description ?? "—"}</td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{formatDate(item.ItemDate)}</td>
                        <td className="py-2 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {(item.Qty ?? item.Hours) != null ? Number(item.Qty ?? item.Hours).toFixed(2) : "—"}
                        </td>
                        <td className="py-2 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {item.Cost != null && item.Cost !== "N/A" ? formatCurrency(item.Cost) : (item.Cost ?? "—")}
                        </td>
                        <td className="py-2 px-4 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.Extended)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-medium">
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300" colSpan={5}>
                        Labor total {laborHours > 0 && `(${laborHours.toFixed(1)} hrs)`}
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                        {formatCurrency(laborSubTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      <AddLaborDialog
        open={showAddLabor}
        onOpenChange={setShowAddLabor}
        wo={wo}
        token={token}
        onSuccess={() => {
          fetchImported();
          onLaborUpdate?.();
        }}
      />
      <EditPostedLaborDialog
        open={!!editPostedEntry}
        onOpenChange={(o) => !o && setEditPostedEntry(null)}
        entry={editPostedEntry}
        wo={wo}
        token={token}
        onSuccess={() => {
          fetchPosted();
          onLaborUpdate?.();
        }}
      />
      <EditImportedLaborDialog
        open={!!editImportedEntry}
        onOpenChange={(o) => !o && setEditImportedEntry(null)}
        entry={editImportedEntry}
        wo={wo}
        token={token}
        onSuccess={() => {
          fetchImported();
          onLaborUpdate?.();
        }}
      />
    </Dialog>
  );
}
