"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Package, Pencil, Check, X, Loader2, Trash2, RefreshCw, Plus, Download, ArrowRight, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getParts, getApprovedParts, updatePart, refreshPartPrice, deletePart, deleteRequestedPart, approvePart, downloadPartsCsv } from "@/lib/api/parts";
import AddPartDialog from "./AddPartDialog";
import { getSectionsList } from "@/lib/api/work-order";

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

export default function PartsPopupDialog({ open, onOpenChange, wo, billing, token, onPartsUpdate }) {
  const disposition = wo?.Disposition ?? 1;
  const isOpen = disposition === 1 || disposition === 11 || disposition === 12;

  const [parts, setParts] = useState([]);
  const [approvedParts, setApprovedParts] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [editingSell, setEditingSell] = useState(false);
  const [editSell, setEditSell] = useState("");
  const [editingSection, setEditingSection] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [sortProp, setSortProp] = useState("Section");
  const [sortReverse, setSortReverse] = useState(false);

  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const partsLineItems = lineItems.filter(
    (item) => (item.EntryType || item.Type || "").toString().toUpperCase() === "P"
  );
  const partsSubTotal = partsLineItems.reduce((s, i) => s + (Number(i.Extended) || 0), 0);

  const totalPartsQty = parts.reduce((s, p) => s + (Number(p.Qty) || 0), 0);
  const totalPartsSell = parts.reduce((s, p) => s + (Number(p.Sell) || 0), 0);

  const fetchParts = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoading(true);
    try {
      const [currentData, approvedData] = await Promise.all([
        getParts(wo.WONo, token),
        getApprovedParts(wo.WONo, token),
      ]);
      setParts(Array.isArray(currentData) ? currentData : []);
      setApprovedParts(Array.isArray(approvedData) ? approvedData : []);
      setSelectedPart((prev) => (prev ? currentData?.find((p) => p.ID === prev.ID) ?? null : null));
    } catch {
      setParts([]);
      setApprovedParts([]);
      setSelectedPart(null);
    } finally {
      setLoading(false);
    }
  }, [wo?.WONo, token, open]);

  useEffect(() => {
    if (open && isOpen && wo?.WONo && token) {
      fetchParts();
    }
  }, [open, isOpen, wo?.WONo, token, fetchParts]);

  useEffect(() => {
    if (open && wo?.WONo && token) {
      getSectionsList(wo.WONo, token).then(setSections).catch(() => setSections([]));
    }
  }, [open, wo?.WONo, token]);

  const handleSaveSell = async () => {
    if (!selectedPart || !token || !wo?.WONo) return;
    const sell = parseFloat(editSell);
    if (isNaN(sell) || sell < 0) return;
    setSavingId(selectedPart.ID);
    try {
      await updatePart({ ID: selectedPart.ID, WONo: wo.WONo, Sell: sell }, token);
      setParts((prev) => prev.map((p) => (p.ID === selectedPart.ID ? { ...p, Sell: sell } : p)));
      setApprovedParts((prev) => prev.map((p) => (p.ID === selectedPart.ID ? { ...p, Sell: sell } : p)));
      setSelectedPart((prev) => (prev ? { ...prev, Sell: sell } : null));
      setEditingSell(false);
      setEditSell("");
      onPartsUpdate?.();
      toast.success("Part price updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    } finally {
      setSavingId(null);
    }
  };

  const handleSectionChange = async (sectionTitle) => {
    if (!selectedPart || !token || !wo?.WONo) return;
    setSavingId(selectedPart.ID);
    try {
      await updatePart(
        { ID: selectedPart.ID, WONo: wo.WONo, Section: sectionTitle, RepairCode: sectionTitle },
        token
      );
      const updated = { ...selectedPart, Section: sectionTitle, RepairCode: sectionTitle };
      setParts((prev) => prev.map((p) => (p.ID === selectedPart.ID ? updated : p)));
      setApprovedParts((prev) => prev.map((p) => (p.ID === selectedPart.ID ? updated : p)));
      setSelectedPart(updated);
      setEditingSection(false);
      onPartsUpdate?.();
      toast.success("Section updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update section");
    } finally {
      setSavingId(null);
    }
  };

  const handleRefreshPrice = async () => {
    if (!selectedPart || !token || selectedPart.type === "WebPartsOrder") return;
    setRefreshingId(selectedPart.ID);
    try {
      await refreshPartPrice({ ...selectedPart, WONo: wo.WONo }, token);
      await fetchParts();
      onPartsUpdate?.();
      toast.success("Price refreshed");
    } catch (err) {
      toast.error(err?.message || "Failed to refresh price");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDeletePart = async (part) => {
    const toDelete = part ?? selectedPart;
    if (!toDelete || !token || !wo?.WONo) return;
    if (!confirm("Are you sure you want to remove this part from the work order?")) return;
    try {
      const isWebPart = toDelete.type === "WebPartsOrder";
      if (isWebPart) {
        await deleteRequestedPart(toDelete.ID, wo.WONo, token);
      } else {
        await deletePart(toDelete.ID, wo.WONo, token);
      }
      setParts((prev) => prev.filter((p) => p.ID !== toDelete.ID));
      setApprovedParts((prev) => prev.filter((p) => p.ID !== toDelete.ID));
      if (selectedPart?.ID === toDelete.ID) setSelectedPart(null);
      onPartsUpdate?.();
      toast.success("Part removed");
    } catch (err) {
      toast.error(err?.message || "Failed to remove part");
    }
  };

  const handleApprovePart = async (part) => {
    if (!part || !token || part.type !== "WebPartsOrder") return;
    setApprovingId(part.ID);
    try {
      await approvePart({ ...part, WONo: wo.WONo }, token);
      await fetchParts();
      onPartsUpdate?.();
      toast.success("Part approved");
    } catch (err) {
      toast.error(err?.message || "Failed to approve part");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDownload = async () => {
    if (!wo?.WONo || !token) return;
    try {
      const csv = await downloadPartsCsv(wo.WONo, token);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "approved_parts.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Parts CSV downloaded");
    } catch (err) {
      toast.error(err?.message || "Failed to download");
    }
  };

  const sortBy = (prop) => {
    if (sortProp === prop) setSortReverse((r) => !r);
    else {
      setSortProp(prop);
      setSortReverse(false);
    }
  };

  const sortedParts = [...parts].sort((a, b) => {
    const av = a[sortProp] ?? "";
    const bv = b[sortProp] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortReverse ? -cmp : cmp;
  });

  const isWebPart = selectedPart?.type === "WebPartsOrder";
  const canEdit = selectedPart && !isWebPart;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] flex flex-col min-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-primary" />
            Parts
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden flex-1 min-h-0 flex flex-col text-base">
          {isOpen ? (
            <div className="flex flex-1 min-h-0 gap-4 p-4">
              {loading ? (
                <div className="col-span-2 flex items-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : parts.length === 0 ? (
                <p className="col-span-2 py-12 text-center text-muted-foreground">There are no parts for this work order.</p>
              ) : (
                <>
                  {/* Left: Compact table */}
                  <div className="flex flex-col min-w-0 flex-1">
                    {(() => {
                      const pendingParts = parts.filter((p) => p.type === "WebPartsOrder");
                      return pendingParts.length > 0 ? (
                        <div className="mb-3">
                          <p className="mb-2 text-sm font-medium text-muted-foreground">Quick approve</p>
                          <div className="flex flex-wrap gap-2">
                            {pendingParts.map((part) => (
                              <div
                                key={part.ID}
                                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
                              >
                                <span className="truncate max-w-[140px] font-medium">{part.PartNo || part.RequestedPartNo}</span>
                                <span className="text-sm text-muted-foreground">×{part.Qty ?? 1}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-primary/30 text-primary hover:bg-primary/10"
                                    onClick={() => handleApprovePart(part)}
                                    disabled={approvingId === part.ID}
                                  >
                                    {approvingId === part.ID ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                    <span className="ml-1">Approve</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeletePart(part)}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span className="ml-1">Deny</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
                      <table className="w-full">
                        <thead className="sticky top-0 z-10 border-b border-border bg-muted/40">
                          <tr>
                            <th className="w-10 px-3 py-2.5 text-left font-medium text-muted-foreground"></th>
                            <th className="cursor-pointer px-3 py-2.5 text-left font-medium text-muted-foreground hover:underline" onClick={() => sortBy("Section")}>Part</th>
                            <th className="w-16 px-3 py-2.5 text-left font-medium text-muted-foreground">Qty</th>
                            <th className="cursor-pointer px-3 py-2.5 text-right font-medium text-muted-foreground hover:underline" onClick={() => sortBy("Sell")}>Sale</th>
                            <th className="text-left py-2.5 px-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedParts.map((part) => (
                            <tr
                              key={part.ID}
                              onClick={() => setSelectedPart(part)}
                              className={`cursor-pointer border-b border-border/50 transition-colors ${
                                selectedPart?.ID === part.ID
                                  ? "bg-primary/10"
                                  : "hover:bg-muted/40"
                              } ${part.BOStatus != null && part.BOStatus !== 0 ? "border-l-2 border-l-primary/60" : ""}`}
                            >
                              <td className="py-2 px-3">
                                {part.BOStatus != null && part.BOStatus !== 0 && (
                                  <span className="inline-block h-2 w-2 rounded-full bg-primary" title="Back ordered" />
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-medium">{part.PartNo || part.RequestedPartNo}</div>
                                <div className="max-w-[200px] truncate text-sm text-muted-foreground" title={part.Description}>
                                  {part.Description}
                                </div>
                              </td>
                              <td className="py-2 px-3">{part.Qty ?? "—"}</td>
                              <td className="py-2 px-3 text-right font-medium tabular-nums">{formatCurrency(part.Sell)}</td>
                              <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-48 p-1">
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeletePart(part)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {part.type === "WebPartsOrder" ? "Deny / Remove" : "Remove part"}
                                    </Button>
                                  </PopoverContent>
                                </Popover>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between rounded-b-lg border border-t-0 border-border bg-muted/40 px-3 py-2.5">
                      <span className="font-medium">Total Qty <span className="text-primary">{Number(totalPartsQty).toFixed(2)}</span></span>
                      <span className="font-medium">Total Billed <span className="text-primary">{formatCurrency(totalPartsSell)}</span></span>
                    </div>
                  </div>

                  {/* Right: Detail panel */}
                  <div className="w-80 shrink-0 flex flex-col gap-3">
                    {selectedPart ? (
                      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <CardHeader className="py-4 pb-2">
                          <CardTitle className="text-base">
                            {selectedPart.PartNo || selectedPart.RequestedPartNo}
                          </CardTitle>
                          <p className="line-clamp-2 text-sm text-muted-foreground">{selectedPart.Description}</p>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto space-y-4 py-2">
                          <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section</label>
                            {editingSection ? (
                              <div className="flex gap-2 mt-1">
                                <Select
                                  value={(selectedPart.Section || selectedPart.RepairCode || "__none__").toString()}
                                  onValueChange={(v) => handleSectionChange(v === "__none__" || (typeof v === "string" && v.startsWith("__empty_")) ? "" : v)}
                                  disabled={savingId === selectedPart.ID}
                                >
                                  <SelectTrigger className="h-9"><SelectValue placeholder="Choose section" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">—</SelectItem>
                                    {sections.map((s, i) => {
                                      const val = s.title && String(s.title).trim() ? s.title : `__empty_${i}`;
                                      return (
                                        <SelectItem key={val} value={val}>{s.title ?? "—"}</SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setEditingSection(false)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between mt-1">
                                <span>{selectedPart.RepairCode ?? selectedPart.Section ?? "—"}</span>
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection(true)} title="Edit section">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</label>
                            <div className="mt-1 text-sm space-y-0.5">
                              <div>Code: {selectedPart.SaleCode ?? "—"}</div>
                              <div>Bin: {selectedPart.Bin ?? "—"}</div>
                              <div>Warehouse: {selectedPart.Warehouse ?? "—"}</div>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rates</label>
                            <div className="mt-1 text-sm space-y-0.5">
                              <div>Cost: {formatCurrency(selectedPart.CostRate)}</div>
                              <div>List: {formatCurrency(selectedPart.ListRate)}</div>
                              <div>Sell: {formatCurrency(selectedPart.SellRate)}</div>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</label>
                            <div className="mt-1 text-sm">
                              Requested: {selectedPart.Qty ?? "—"} · BO: {selectedPart.BOQty ?? "—"}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sale price</label>
                            {editingSell ? (
                              <div className="flex gap-2 mt-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editSell}
                                  onChange={(e) => setEditSell(e.target.value)}
                                  className="h-9"
                                  autoFocus
                                />
                                <Button size="icon" className="h-9 w-9 shrink-0 text-primary" onClick={handleSaveSell} disabled={savingId === selectedPart.ID}>
                                  {savingId === selectedPart.ID ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setEditingSell(false); setEditSell(""); }} disabled={savingId === selectedPart.ID}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-semibold text-lg">{formatCurrency(selectedPart.Sell)}</span>
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingSell(true); setEditSell(String(selectedPart.Sell ?? "")); }} title="Edit price">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                            {(() => {
                              const cost = Number(selectedPart.Cost) || 0;
                              const sell = Number(selectedPart.Sell) || 0;
                              const markup = cost > 0 ? (((sell - cost) / cost) * 100).toFixed(1) : "—";
                              return <p className="mt-0.5 text-xs text-muted-foreground">Markup: {markup}%</p>;
                            })()}
                          </div>
                          {isWebPart ? (
                            <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprovePart(selectedPart)}
                                disabled={approvingId === selectedPart.ID}
                              >
                                {approvingId === selectedPart.ID ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeletePart()}>
                                <XCircle className="h-4 w-4 mr-1.5" />
                                Deny
                              </Button>
                            </div>
                          ) : canEdit ? (
                            <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshPrice}
                                disabled={refreshingId === selectedPart.ID}
                              >
                                {refreshingId === selectedPart.ID ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                                Refresh price
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeletePart()}>
                                <Trash2 className="h-4 w-4 mr-1.5" />
                                Remove
                              </Button>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="flex-1 flex items-center justify-center min-h-[200px]">
                        <CardContent className="py-8 text-center text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Select a part to view details and edit</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 overflow-auto">
              {partsLineItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No parts on this work order.</p>
              ) : (
                <table className="w-full text-base">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Item</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Cost</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partsLineItems.map((item, i) => (
                      <tr key={i} className={`border-b border-border/50 ${item.BOStatus === 1 ? "bg-muted/40" : ""}`}>
                        <td className="px-4 py-2 text-muted-foreground">{item.CodeDescription || "Parts"} ({item.Code || "P"})</td>
                        <td className="px-4 py-2 text-muted-foreground">{[item.ItemNo, item.ItemName].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-2 text-foreground">{item.Description ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(item.ItemDate)}</td>
                        <td className="py-2 px-4 text-right tabular-nums">{item.Qty != null ? Number(item.Qty).toFixed(2) : "—"}</td>
                        <td className="py-2 px-4 text-right tabular-nums">{item.Cost != null && item.Cost !== "N/A" ? formatCurrency(item.Cost) : (item.Cost ?? "—")}</td>
                        <td className="py-2 px-4 text-right tabular-nums font-medium">{formatCurrency(item.Extended)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-medium">
                      <td className="py-3 px-4" colSpan={5}>Parts total</td>
                      <td colSpan={2} className="py-3 px-4 text-right tabular-nums">{formatCurrency(partsSubTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* Toolbar - always visible when open WO */}
          {isOpen && (
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setAddPartOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Part
                </Button>
                {parts.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
                  </Button>
                )}
              </div>
              <Link href="/parts/approval" className="inline-flex items-center gap-1 text-base text-primary hover:opacity-80">
                Go to Parts Approval <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
      <AddPartDialog
        open={addPartOpen}
        onOpenChange={setAddPartOpen}
        wo={wo}
        token={token}
        onSuccess={fetchParts}
      />
    </Dialog>
  );
}
