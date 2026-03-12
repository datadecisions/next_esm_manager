"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Search,
  Loader2,
  Check,
  X,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getLaborByTechByBranch, approveLaborEntry } from "@/lib/api/labor";
import { BranchDeptFilter } from "@/components/BranchDeptFilter";
import { DateRangeInput, DateInput } from "@/components/DateRangeInput";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";
import EditPostedLaborDialog from "@/components/work-order/EditPostedLaborDialog";

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function formatHours(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "-";
  return `${Number(val).toFixed(2)} hrs`;
}

function techDisplayName(tech) {
  const last = tech.lastName ?? "";
  const first = tech.nickName ?? tech.firstName ?? "";
  if (last && first) return `${last}, ${first}`;
  return tech.name ?? tech.techId ?? "-";
}

const DATE_VIEW_KEY = "laborApproval_dateView";

function getStoredDateView() {
  if (typeof window === "undefined") return "range";
  try {
    const v = localStorage.getItem(DATE_VIEW_KEY);
    return v === "day" || v === "range" ? v : "range";
  } catch {
    return "range";
  }
}

export default function LaborApprovalPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [techDetailTech, setTechDetailTech] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedToImport, setSelectedToImport] = useState(new Set());
  const [editEntry, setEditEntry] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dateView, setDateView] = useState(getStoredDateView);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [singleDate, setSingleDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const handleDateViewChange = (mode) => {
    setDateView(mode);
    try {
      localStorage.setItem(DATE_VIEW_KEY, mode);
    } catch {}
  };

  const isSingleDay = dateView === "day";

  const shiftDateBy = (days) => {
    if (isSingleDay) {
      const d = new Date(singleDate + "T12:00:00");
      d.setDate(d.getDate() + days);
      setSingleDate(d.toISOString().slice(0, 10));
    } else {
      const start = new Date(startDate + "T12:00:00");
      const end = new Date(endDate + "T12:00:00");
      const span = Math.round((end - start) / (24 * 60 * 60 * 1000));
      start.setDate(start.getDate() + days);
      end.setDate(start.getDate() + span);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    }
  };

  const formatDateDisplay = (d) => {
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const effectiveStart = isSingleDay ? singleDate : startDate;
  const effectiveEnd = isSingleDay ? singleDate : endDate;
  const [debouncedEffective, setDebouncedEffective] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedRangeChange = useCallback((start, end, isValid) => {
    setDebouncedEffective({ start, end, isValid });
  }, []);
  const handleDebouncedSingleChange = useCallback((date, isValid) => {
    setDebouncedEffective({ start: date, end: date, isValid });
  }, []);

  const branches = useMemo(() => branchDeptFilter?.branches ?? [], [branchDeptFilter?.branches]);
  const selectedDepts = useMemo(() => branchDeptFilter?.depts ?? [], [branchDeptFilter?.depts]);
  const selectAllDepts = branchDeptFilter?.selectAllDepts ?? false;

  const loadTechs = useCallback(async () => {
    if (!token || branches.length === 0) {
      setTechs([]);
      return;
    }
    if (!debouncedEffective.isValid) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        branches.map((b) =>
          getLaborByTechByBranch(b.Number ?? b, token, {
            startDate: debouncedEffective.start,
            endDate: debouncedEffective.end,
            depts: selectAllDepts ? [] : selectedDepts,
          })
        )
      );
      const techMap = new Map();
      for (const { techs: list } of results) {
        for (const t of list) {
          const existing = techMap.get(t.techId);
          if (existing) {
            existing.unimported = existing.unimported.concat(t.unimported);
            existing.imported = existing.imported.concat(t.imported);
            existing.unimportedHours += t.unimportedHours;
            existing.importedHours += t.importedHours;
          } else {
            techMap.set(t.techId, { ...t });
          }
        }
      }
      const merged = Array.from(techMap.values()).map((t) => ({
        ...t,
        totalHours: t.unimportedHours + t.importedHours,
        overtime:
          t.unimportedHours > 8 ||
          t.importedHours > 8 ||
          t.unimportedHours + t.importedHours > 8,
      }));
      setTechs(merged);
      setTechDetailTech(null);
    } catch (err) {
      toast.error(err?.message || "Failed to load labor");
      setTechs([]);
    } finally {
      setLoading(false);
    }
  }, [token, branches, debouncedEffective.end, debouncedEffective.isValid, debouncedEffective.start, selectedDepts, selectAllDepts]);

  useEffect(() => {
    loadTechs();
  }, [loadTechs]);

  const filteredTechs = useMemo(() => {
    if (!searchQuery.trim()) return techs;
    const q = searchQuery.toLowerCase();
    return techs.filter(
      (t) =>
        techDisplayName(t).toLowerCase().includes(q) ||
        String(t.techId ?? "").toLowerCase().includes(q)
    );
  }, [techs, searchQuery]);

  const techsWithPending = useMemo(
    () => filteredTechs.filter((t) => t.unimported.length > 0),
    [filteredTechs]
  );
  const techsWithImported = useMemo(
    () => filteredTechs.filter((t) => t.imported.length > 0),
    [filteredTechs]
  );

  const handleOpenTechDetail = (tech) => {
    setTechDetailTech(tech);
  };

  const handleImportSelected = async () => {
    const woTechSet = new Set();
    for (const techId of selectedToImport) {
      const tech = techs.find((t) => t.techId === techId);
      if (!tech) continue;
      for (const entry of tech.unimported) {
        const key = `${entry.WONo}:${entry.MechanicName ?? tech.name}`;
        if (!woTechSet.has(key)) {
          woTechSet.add(key);
        }
      }
    }
    if (woTechSet.size === 0) {
      toast.error("No labor selected to import.");
      return;
    }
    setSubmitting(true);
    try {
      let count = 0;
      for (const key of woTechSet) {
        const [woNo, dispatchName] = key.split(":");
        await approveLaborEntry(
          { WONo: woNo, DispatchName: dispatchName },
          token
        );
        count++;
      }
      toast.success(`Imported labor for ${count} work order${count !== 1 ? "s" : ""}.`);
      setSelectedToImport(new Set());
      setTechDetailTech(null);
      loadTechs();
    } catch (err) {
      toast.error(err?.message || "Failed to import labor");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTechSelection = (techId) => {
    setSelectedToImport((prev) => {
      const next = new Set(prev);
      if (next.has(techId)) next.delete(techId);
      else next.add(techId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const withPending = techsWithPending.map((t) => t.techId);
    const allSelected = withPending.every((id) => selectedToImport.has(id));
    if (allSelected) {
      setSelectedToImport(new Set());
    } else {
      setSelectedToImport(new Set(withPending));
    }
  };

  const handleEditEntry = (entry, e) => {
    e?.stopPropagation?.();
    if (!entry?.ID) return;
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    loadTechs();
  };

  const handleImportTech = async (tech) => {
    if (!tech?.unimported?.length) return;
    const woTechSet = new Set();
    for (const entry of tech.unimported) {
      woTechSet.add(`${entry.WONo}:${entry.MechanicName ?? tech.name}`);
    }
    setSubmitting(true);
    try {
      let count = 0;
      for (const key of woTechSet) {
        const [woNo, dispatchName] = key.split(":");
        await approveLaborEntry({ WONo: woNo, DispatchName: dispatchName }, token);
        count++;
      }
      toast.success(`Imported labor for ${count} work order${count !== 1 ? "s" : ""}.`);
      setSelectedToImport((prev) => {
        const next = new Set(prev);
        next.delete(tech.techId);
        return next;
      });
      setTechDetailTech(null);
      loadTechs();
    } catch (err) {
      toast.error(err?.message || "Failed to import labor");
    } finally {
      setSubmitting(false);
    }
  };

  const buildWoGroups = (entries) => {
    const byWo = {};
    for (const e of entries) {
      const k = e.WONo;
      if (!byWo[k])
        byWo[k] = {
          WONo: k,
          ShipName: e.ShipName,
          SerialNo: e.SerialNo,
          entries: [],
        };
      byWo[k].entries.push(e);
    }
    return Object.values(byWo);
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
            <Link href="/labor">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Labor Approval
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Review and import technician labor by tech. Pending and imported hours shown together.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="dark:border-slate-700 dark:bg-slate-800/50 mb-6">
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Date view</label>
                  <div className="flex rounded-lg border border-input bg-muted/30 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleDateViewChange("day")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        dateView === "day"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Single day
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDateViewChange("range")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        dateView === "range"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Date range
                    </button>
                  </div>
                </div>
                {isSingleDay ? (
                  <DateInput
                    date={singleDate}
                    onDateChange={(val) => setSingleDate(val || "")}
                    onDebouncedChange={handleDebouncedSingleChange}
                    label="Date"
                    inputClassName="w-[140px]"
                  />
                ) : (
                  <DateRangeInput
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={(val) => setStartDate(val || "")}
                    onEndDateChange={(val) => setEndDate(val || "")}
                    onDebouncedChange={handleDebouncedRangeChange}
                    startLabel="Start Date"
                    endLabel="End Date"
                    inputClassName="w-[140px]"
                  />
                )}
                <div className="flex-1 min-w-0 max-w-sm">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search technician"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}

              {!loading && branches.length === 0 && (
                <div className="rounded-lg border dark:border-slate-700 p-12 text-center text-muted-foreground">
                  Select one or more branches to view labor.
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && branches.length > 0 && techs.length > 0 && (
            <div className="space-y-6">
              {/* Techs with pending labor */}
              <Card className="dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Techs with Labor on Open Orders
                    </CardTitle>
                    {techsWithPending.length > 0 && (
                      <Button
                        onClick={handleImportSelected}
                        disabled={selectedToImport.size === 0 || submitting}
                        className="gap-2"
                      >
                        {submitting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Import Selected ({selectedToImport.size} tech
                        {selectedToImport.size !== 1 ? "s" : ""})
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => shiftDateBy(-1)}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-foreground"
                      title={isSingleDay ? "Previous day" : "Previous period"}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-medium min-w-[160px] text-center">
                      {isSingleDay
                        ? formatDateDisplay(effectiveStart)
                        : `${formatDateDisplay(effectiveStart)} – ${formatDateDisplay(effectiveEnd)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => shiftDateBy(1)}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-foreground"
                      title={isSingleDay ? "Next day" : "Next period"}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {techsWithPending.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">
                      All labor has been approved.
                    </p>
                  ) : (
                    <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                            <TableHead className="w-12">
                              <input
                                type="checkbox"
                                checked={
                                  techsWithPending.length > 0 &&
                                  techsWithPending.every((t) =>
                                    selectedToImport.has(t.techId)
                                  )
                                }
                                onChange={toggleSelectAll}
                                className="rounded border-input"
                              />
                            </TableHead>
                            <TableHead className="font-semibold">Technician</TableHead>
                            <TableHead className="font-semibold">Unimported</TableHead>
                            <TableHead className="font-semibold">Imported</TableHead>
                            <TableHead className="font-semibold">Total</TableHead>
                            <TableHead className="font-semibold">Overtime?</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {techsWithPending.map((tech) => (
                            <TableRow
                              key={tech.techId}
                              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              onClick={() => handleOpenTechDetail(tech)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedToImport.has(tech.techId)}
                                  onChange={() =>
                                    toggleTechSelection(tech.techId)
                                  }
                                  className="rounded border-input"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {techDisplayName(tech)}
                              </TableCell>
                              <TableCell>{formatHours(tech.unimportedHours)}</TableCell>
                              <TableCell>{formatHours(tech.importedHours)}</TableCell>
                              <TableCell>{formatHours(tech.totalHours)}</TableCell>
                              <TableCell>
                                {tech.overtime ? "Yes" : ""}
                                {tech.weekend && (
                                  <span className="block text-xs text-muted-foreground">
                                    Weekend work
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Imported-only techs (reference) */}
              {techsWithImported.some(
                (t) => t.unimported.length === 0 && t.imported.length > 0
              ) && (
                <Card className="dark:border-slate-700 dark:bg-slate-800/50 border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                      <FileCheck className="h-4 w-4" />
                      Techs with Imported Labor Only (this period)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                            <TableHead>Technician</TableHead>
                            <TableHead>Imported Hours</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {techsWithImported
                            .filter((t) => t.unimported.length === 0)
                            .map((tech) => (
                              <TableRow
                                key={tech.techId}
                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 text-muted-foreground"
                                onClick={() => handleOpenTechDetail(tech)}
                              >
                                <TableCell>{techDisplayName(tech)}</TableCell>
                                <TableCell>
                                  {formatHours(tech.importedHours)}
                                </TableCell>
                                <TableCell>
                                  <ChevronRight className="h-4 w-4" />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!loading &&
            branches.length > 0 &&
            techs.length === 0 && (
              <Card className="dark:border-slate-700 dark:bg-slate-800/50">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <p>No labor entries in this date range.</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => shiftDateBy(-1)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-foreground"
                        title={isSingleDay ? "Previous day" : "Previous period"}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-medium min-w-[160px] text-center">
                        {isSingleDay
                          ? formatDateDisplay(effectiveStart)
                          : `${formatDateDisplay(effectiveStart)} – ${formatDateDisplay(effectiveEnd)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => shiftDateBy(1)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-foreground"
                        title={isSingleDay ? "Next day" : "Next period"}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </motion.div>
      </div>

      <EditPostedLaborDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entry={editEntry}
        wo={editEntry ? { WONo: editEntry.WONo } : null}
        token={token}
        onSuccess={handleEditSuccess}
      />

      <Dialog open={!!techDetailTech} onOpenChange={(open) => !open && setTechDetailTech(null)}>
        <DialogContent size="wide" className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {techDetailTech ? techDisplayName(techDetailTech) : ""}
            </DialogTitle>
          </DialogHeader>
          {techDetailTech && (
            <div className="space-y-6 py-2 overflow-y-auto min-h-0 flex-1">
              {techDetailTech.unimported.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Pending labor
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => handleImportTech(techDetailTech)}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Import all
                    </Button>
                  </div>
                  <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                          <TableHead className="font-medium">WO</TableHead>
                          <TableHead className="font-medium">Ship</TableHead>
                          <TableHead className="font-medium">Hours</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildWoGroups(techDetailTech.unimported).flatMap((wo) =>
                          wo.entries.map((e) => (
                            <TableRow key={e.ID}>
                              <TableCell>
                                <Link
                                  href={`/work-orders/${wo.WONo}`}
                                  className="text-cyan-600 hover:underline dark:text-cyan-400 font-medium"
                                  target="_blank"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  #{wo.WONo}
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground truncate max-w-[140px]">
                                {wo.ShipName || "—"}
                              </TableCell>
                              <TableCell>{formatHours(e.duration)}</TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleEditEntry(e, ev);
                                  }}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400"
                                  title="Edit labor entry"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {techDetailTech.imported.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                    Already imported
                  </h4>
                  <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                          <TableHead className="font-medium">WO</TableHead>
                          <TableHead className="font-medium">Ship</TableHead>
                          <TableHead className="font-medium">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildWoGroups(techDetailTech.imported).flatMap((wo) =>
                          wo.entries.map((e) => (
                            <TableRow key={e.ID} className="text-muted-foreground">
                              <TableCell>
                                <Link
                                  href={`/work-orders/${wo.WONo}`}
                                  className="text-cyan-600 hover:underline dark:text-cyan-400"
                                  target="_blank"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  #{wo.WONo}
                                </Link>
                              </TableCell>
                              <TableCell className="truncate max-w-[140px]">
                                {wo.ShipName || "—"}
                              </TableCell>
                              <TableCell>{formatHours(e.duration)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {techDetailTech.unimported.length === 0 && techDetailTech.imported.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No labor entries in this period.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
