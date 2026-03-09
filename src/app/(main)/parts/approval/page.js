"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Search,
  Loader2,
  Check,
  X,
  Plus,
  Package,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getRequestedPartsByBranch,
  getParts,
  getApprovedParts,
  approvePart,
  deleteRequestedPart,
  deletePart,
} from "@/lib/api/parts";
import { updateWOCommentFields } from "@/lib/api/work-order";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import AddPartDialog from "@/components/work-order/AddPartDialog";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function formatMarkup(cost, sell) {
  const c = Number(cost);
  const s = Number(sell);
  if (!c || isNaN(c) || isNaN(s)) return "—";
  if (c === 0) return "—";
  const pct = ((s - c) / c) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PartsApprovalPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWO, setSelectedWO] = useState(null);
  const [currentParts, setCurrentParts] = useState([]);
  const [approvedParts, setApprovedParts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [denyCommentsOpen, setDenyCommentsOpen] = useState(false);
  const [deletingPartId, setDeletingPartId] = useState(null);
  const [approveAllProcessing, setApproveAllProcessing] = useState(false);

  const branches = branchDeptFilter?.branches ?? [];

  const loadRequests = useCallback(async () => {
    if (!token || branches.length === 0) {
      setRequests([]);
      return;
    }
    setLoading(true);
    try {
      const arrays = await Promise.all(
        branches.map((b) =>
          getRequestedPartsByBranch(b.Number ?? b, token)
        )
      );
      const seen = new Set();
      const merged = [];
      for (const arr of arrays) {
        for (const wo of arr) {
          if (!seen.has(wo.WONo)) {
            seen.add(wo.WONo);
            merged.push(wo);
          }
        }
      }
      setRequests(merged);
      setSelectedWO((prev) => {
        if (!prev) return null;
        const updated = merged.find((r) => r.WONo === prev.WONo);
        if (!updated) return null;
        return { ...updated, Parts: (updated.Parts ?? []).map((p) => ({ ...p, approve: prev.Parts?.find((x) => x.UniqueField === p.UniqueField)?.approve ?? "APPROVE" })) };
      });
    } catch (err) {
      toast.error(err?.message || "Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, branches]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadPanelData = useCallback(async () => {
    if (!token || !selectedWO?.WONo) return;
    try {
      const [current, approved] = await Promise.all([
        getParts(selectedWO.WONo, token),
        getApprovedParts(selectedWO.WONo, token),
      ]);
      setCurrentParts(Array.isArray(current) ? current : []);
      setApprovedParts(Array.isArray(approved) ? approved : []);
    } catch {
      setCurrentParts([]);
      setApprovedParts([]);
    }
  }, [token, selectedWO?.WONo]);

  useEffect(() => {
    if (selectedWO) loadPanelData();
  }, [selectedWO, loadPanelData]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.WONo ?? "").toLowerCase().includes(q) ||
          (r.SerialNo ?? "").toLowerCase().includes(q) ||
          (r.ShipName ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.DispatchedDate || 0).getTime();
      const db = new Date(b.DispatchedDate || 0).getTime();
      return db - da;
    });
  }, [requests, searchQuery]);

  const handleApproveSubmit = async () => {
    if (!token || !selectedWO) return;
    const toApprove = selectedWO.Parts?.filter((p) => p.approve === "APPROVE") ?? [];
    const toDeny = selectedWO.Parts?.filter((p) => p.approve === "DENY") ?? [];

    if (toDeny.length > 0 && !denyCommentsOpen) {
      setDenyCommentsOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      for (const part of toApprove) {
        await approvePart(
          {
            ...part,
            WONo: selectedWO.WONo,
            Section: part.Section ?? "",
            RepairCode: part.RepairCode ?? part.Section ?? "",
          },
          token
        );
      }
      for (const part of toDeny) {
        await deleteRequestedPart(part.UniqueField, selectedWO.WONo, token);
      }
      if (toDeny.length > 0 && selectedWO.PrivateComments) {
        await updateWOCommentFields(
          { WONo: selectedWO.WONo, PrivateComments: selectedWO.PrivateComments },
          token
        );
      }
      toast.success("Parts updated.");
      setDenyCommentsOpen(false);
      setSelectedWO(null);
      loadRequests();
    } catch (err) {
      toast.error(err?.message || "Failed to update parts");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (wo) => {
    setSelectedWO((prev) => (prev?.WONo === wo.WONo ? null : { ...wo, Parts: wo.Parts?.map((p) => ({ ...p, approve: p.approve ?? "APPROVE" })) ?? [] }));
  };

  const handlePartApproveChange = (part, value) => {
    if (!selectedWO) return;
    setSelectedWO({
      ...selectedWO,
      Parts: selectedWO.Parts.map((p) =>
        p.UniqueField === part.UniqueField ? { ...p, approve: value } : p
      ),
    });
  };

  const hasChanges = selectedWO?.Parts?.some((p) => p.approve === "DENY" || p.approve === "APPROVE");

  const handleApproveAll = async () => {
    if (!token || requests.length === 0) return;
    setApproveAllProcessing(true);
    let approved = 0;
    try {
      for (const wo of requests) {
        const parts = wo.Parts ?? [];
        for (const part of parts) {
          await approvePart(
            {
              ...part,
              WONo: wo.WONo,
              Section: part.Section ?? "",
              RepairCode: part.RepairCode ?? part.Section ?? "",
            },
            token
          );
          approved += 1;
        }
      }
      toast.success(`Approved ${approved} part${approved !== 1 ? "s" : ""}.`);
      setSelectedWO(null);
      loadRequests();
    } catch (err) {
      toast.error(err?.message || "Failed to approve some parts");
    } finally {
      setApproveAllProcessing(false);
    }
  };

  const totalRequestedParts = requests.reduce((sum, r) => sum + (r.Parts?.length ?? 0), 0);

  const handleDeleteApprovedPart = async (part) => {
    if (!token || !selectedWO?.WONo || !part?.ID) return;
    setDeletingPartId(part.ID);
    try {
      await deletePart(part.ID, selectedWO.WONo, token);
      toast.success(`${part.PartNo ?? "Part"} removed.`);
      loadPanelData();
      loadRequests();
    } catch (err) {
      toast.error(err?.message || "Failed to delete part");
    } finally {
      setDeletingPartId(null);
    }
  };

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Parts Approval
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Approve work order parts requests.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="dark:border-slate-700 dark:bg-slate-800/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
                <div>
                  <label className="text-sm font-medium mb-2 block">Branch</label>
                  <BranchDeptFilter
                    value={branchDeptFilter}
                    onChange={setBranchDeptFilter}
                    token={token}
                    className="min-w-[200px]"
                  />
                </div>
                <div className="flex-1 min-w-0 max-w-sm">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search work orders"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                {filteredRequests.length > 0 && totalRequestedParts > 0 && (
                  <Button
                    onClick={handleApproveAll}
                    disabled={approveAllProcessing}
                    className="gap-2"
                  >
                    {approveAllProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve All ({totalRequestedParts} parts)
                  </Button>
                )}
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}

              {!loading && branches.length === 0 && (
                <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
                  Select one or more branches to view parts requests.
                </div>
              )}

              {!loading && branches.length > 0 && requests.length === 0 && (
                <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
                  There are no work orders requesting parts.
                </div>
              )}

              {!loading && filteredRequests.length > 0 && (
                <div className="rounded-lg border dark:border-slate-700 overflow-hidden max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                        <TableHead className="font-semibold">WO No.</TableHead>
                        <TableHead className="font-semibold">Dispatch Date</TableHead>
                        <TableHead className="font-semibold">Equipment</TableHead>
                        <TableHead className="font-semibold">Parts Requested</TableHead>
                        <TableHead className="font-semibold">Comments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((r) => (
                        <TableRow
                          key={r.WONo}
                          className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedWO?.WONo === r.WONo ? "bg-cyan-50 dark:bg-cyan-950/30" : ""}`}
                          onClick={() => handleRowClick(r)}
                          onDoubleClick={() => window.open(`/work-orders/${r.WONo}`, "_blank")}
                        >
                          <TableCell className="font-medium">{r.WONo}</TableCell>
                          <TableCell>{formatDate(r.DispatchedDate)}</TableCell>
                          <TableCell>
                            <span className="font-medium">Serial:</span> {r.SerialNo ?? "-"}
                            <br />
                            <span className="font-medium">Unit:</span> {r.UnitNo ?? "-"}
                          </TableCell>
                          <TableCell>{r.Parts?.length ?? 0}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={r.Comments}>
                            {(r.Comments ?? "").slice(0, 40)}
                            {(r.Comments ?? "").length > 40 ? "..." : ""}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Approve panel */}
      <Dialog open={!!selectedWO} onOpenChange={(open) => !open && setSelectedWO(null)}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          {selectedWO && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Approve Parts for WO #{selectedWO.WONo}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="font-medium">
                    <Link href={`/work-orders/${selectedWO.WONo}`} className="text-cyan-600 hover:underline dark:text-cyan-400" target="_blank">
                      {selectedWO.ShipName}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Serial: {selectedWO.SerialNo ?? "-"} | Unit: {selectedWO.UnitNo ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedWO.Make ?? ""} / {selectedWO.Model ?? ""}
                  </p>
                  {selectedWO.Comments && (
                    <p className="text-sm mt-2 border-l-2 pl-2 border-slate-200 dark:border-slate-700">
                      {selectedWO.Comments}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Requested Parts</h4>
                  <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                          <TableHead className="w-24">Action</TableHead>
                          <TableHead>Part #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Wh</TableHead>
                          <TableHead className="w-14">Qty</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="w-16">Markup</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedWO.Parts ?? []).map((part) => (
                          <TableRow
                            key={part.UniqueField}
                            className={part.approve === "DENY" ? "opacity-60 bg-red-50/50 dark:bg-red-950/20" : part.approve === "APPROVE" ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                          >
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant={part.approve === "APPROVE" ? "default" : "ghost"}
                                  className={`h-7 w-7 ${part.approve === "APPROVE" ? "bg-green-600 hover:bg-green-700" : ""}`}
                                  onClick={() => handlePartApproveChange(part, "APPROVE")}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant={part.approve === "DENY" ? "destructive" : "ghost"}
                                  className="h-7 w-7"
                                  onClick={() => handlePartApproveChange(part, "DENY")}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{part.PartNo ?? part.RequestedPartNo}</TableCell>
                            <TableCell className="max-w-[180px] truncate" title={part.Description}>{part.Description}</TableCell>
                            <TableCell>{part.Warehouse}</TableCell>
                            <TableCell>{part.Qty}</TableCell>
                            <TableCell>
                              Cost: {formatCurrency(part.Cost)}<br />
                              Sell: {formatCurrency(part.Sell)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatMarkup(part.Cost, part.Sell)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {denyCommentsOpen && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-4 space-y-2">
                    <label className="text-sm font-medium">Private comments (for technician)</label>
                    <p className="text-xs text-muted-foreground">
                      Add a reason for the denial. The technician will see this on the work order.
                    </p>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm"
                      value={selectedWO.PrivateComments ?? ""}
                      onChange={(e) =>
                        setSelectedWO((p) => (p ? { ...p, PrivateComments: e.target.value } : null))
                      }
                      placeholder="Reason for denial..."
                    />
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Click the button below to deny the parts and save your comments.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleApproveSubmit}
                    disabled={!hasChanges || submitting}
                  >
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {denyCommentsOpen ? "Confirm & Submit" : "Submit"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddPartOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Part
                  </Button>
                </div>

                {approvedParts.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Approved Parts on WO</h4>
                    <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Part #</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Wh</TableHead>
                            <TableHead className="w-14">Qty</TableHead>
                            <TableHead>Sell</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedParts.map((p) => (
                            <TableRow key={p.ID}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => handleDeleteApprovedPart(p)}
                                  disabled={deletingPartId === p.ID}
                                  title="Remove part from work order"
                                >
                                  {deletingPartId === p.ID ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>{p.PartNo}</TableCell>
                              <TableCell className="max-w-[180px] truncate">{p.Description}</TableCell>
                              <TableCell>{p.Warehouse}</TableCell>
                              <TableCell>{p.Qty}</TableCell>
                              <TableCell>{formatCurrency(p.Sell)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddPartDialog
        open={addPartOpen}
        onOpenChange={setAddPartOpen}
        wo={selectedWO}
        token={token}
        onSuccess={() => {
          loadPanelData();
          loadRequests();
        }}
      />
    </motion.div>
  );
}
