"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getEmployeesWithTimecards,
  getTimecardMetadata,
  getTimecardImageUrl,
  getTimecardZipUrl,
} from "@/lib/api/labor";
import { Button } from "@/components/ui/button";
import { DateRangeInput } from "@/components/DateRangeInput";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function TimecardViewer({ imageId, fileName, onClose }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    getTimecardImageUrl(imageId)
      .then((u) => {
        objectUrl = u;
        setUrl(u);
      })
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "timecard.pdf";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="truncate font-medium">{fileName || "Timecard"}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={!url}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="flex min-h-[60vh] items-center justify-center bg-muted/30 p-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <span>Loading PDF...</span>
            </div>
          )}
          {error && (
            <div className="text-center text-destructive">{error}</div>
          )}
          {url && !error && (
            <iframe
              src={url}
              title={fileName}
              className="h-[70vh] w-full rounded border-0"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TechRow({ employee, startDate, endDate, searchQuery }) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [viewingFileName, setViewingFileName] = useState(null);

  const displayName = [employee.LastName, employee.FirstName].filter(Boolean).join(", ") || employee.DispatchName || "-";
  const matchesSearch =
    !searchQuery ||
    displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.DispatchName || "").toLowerCase().includes(searchQuery.toLowerCase());

  const loadFiles = useCallback(async () => {
    if (!employee.DispatchName || !startDate || !endDate) return;
    setLoading(true);
    try {
      const data = await getTimecardMetadata(employee.DispatchName, startDate, endDate);
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load timecards");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [employee.DispatchName, startDate, endDate]);

  useEffect(() => {
    if (expanded && startDate && endDate) {
      loadFiles();
    }
  }, [expanded, startDate, endDate, loadFiles]);

  const handleView = (id, fileName) => {
    setViewingId(id);
    setViewingFileName(fileName);
  };

  const handleDownload = async (id, fileName) => {
    try {
      const url = await getTimecardImageUrl(id);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "timecard.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || "Download failed");
    }
  };

  const handleExportZip = async () => {
    if (!employee.DispatchName || !startDate || !endDate) return;
    setExporting(true);
    try {
      const url = await getTimecardZipUrl(employee.DispatchName, startDate, endDate);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayName.replace(/\s+/g, "_")}_timecards.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP exported successfully");
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!matchesSearch) return null;

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((x) => !x)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">
            {displayName}
          </div>
          {employee.DispatchName && (
            <div className="truncate text-sm text-muted-foreground">
              {employee.DispatchName}
            </div>
          )}
        </div>
        {expanded && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportZip}
              disabled={exporting || loading}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Export ZIP
            </Button>
            <span className="text-sm text-muted-foreground">
              {loading ? "..." : `${files.length} file${files.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 bg-muted/30 px-4 py-3">
              {loading && (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading timecards...</span>
                </div>
              )}
              {!loading && files.length === 0 && (
                <div className="py-4 text-center text-muted-foreground">
                  No timecard PDFs in this date range.
                </div>
              )}
              {!loading && files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f) => (
                    <div
                      key={f.ID}
                      className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate text-sm font-medium">
                          {f.FileName || `Timecard ${f.ID}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(f.DateAdded)}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(f.ID, f.FileName)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(f.ID, f.FileName)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewingId && (
        <TimecardViewer
          imageId={viewingId}
          fileName={viewingFileName}
          onClose={() => {
            setViewingId(null);
            setViewingFileName(null);
          }}
        />
      )}
    </div>
  );
}

export default function TimecardsPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getEmployeesWithTimecards();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const filteredCount = employees.filter((e) => {
    const name = [e.LastName, e.FirstName].filter(Boolean).join(", ") || e.DispatchName || "";
    return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()) || (e.DispatchName || "").toLowerCase().includes(searchQuery.toLowerCase());
  }).length;

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-background text-foreground"
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
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
              <FileText className="h-5 w-5" />
              Timecard Document Center
            </h1>
            <p className="mt-1 text-muted-foreground">
              View signed timecard PDFs grouped by technician.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <Card className="border-border bg-card text-card-foreground">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
                <DateRangeInput
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={(val) => setStartDate(val || "")}
                  onEndDateChange={(val) => setEndDate(val || "")}
                  onDebouncedChange={handleDebouncedChange}
                  startLabel="Start Date"
                  endLabel="End Date"
                  inputClassName="w-[140px]"
                />
                <div className="flex-1 min-w-0 max-w-sm">
                  <label className="text-sm font-medium mb-2 block">Search technician</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
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
                  <span>Loading technicians...</span>
                </div>
              )}

              {!loading && employees.length === 0 && (
                <div className="rounded-lg border border-border p-12 text-center text-muted-foreground">
                  No technicians with timecard PDFs found.
                </div>
              )}

              {!loading && employees.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground">
                    {filteredCount} technician{filteredCount !== 1 ? "s" : ""} with timecards
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {employees.map((emp) => (
                      <TechRow
                        key={emp.DispatchName || emp.Number || emp.LastName + emp.FirstName}
                        employee={emp}
                        startDate={debouncedDates.start}
                        endDate={debouncedDates.end}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
