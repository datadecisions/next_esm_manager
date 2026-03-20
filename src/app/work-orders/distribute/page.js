"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Loader2,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Mail,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAuthToken } from "@/lib/auth";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { DateRangeInput } from "@/components/DateRangeInput";
import { BranchDeptFilter, filterByBranchDept } from "@/components/BranchDeptFilter";
import {
  getPendingInvoicesSearch,
  getPendingClose,
  printInvoices,
} from "@/lib/api/accounting";
import { getAutoprintUrl } from "@/lib/api/admin";
import { exportToCrown, updateWorkOrder } from "@/lib/api/work-order";
import {
  getOpenWODocuments,
  getPODocuments,
  getVendorDocuments,
  getAPDocuments,
  getCustomerDocuments,
  getEquipmentDocuments,
  getMechanicDocuments,
  getDocumentImageUrl,
} from "@/lib/api/documents";

function formatDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
}

function toYMD(d) {
  if (d == null) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseDateInput(val) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function processDocumentStatus(inv) {
  inv.Status = "ok";
  if (inv.CrownCustomerNo) {
    if (!inv.ProblemDescription) {
      const match = (inv.Comments || "").match(/(.*)(?=CORRECTION)/gm);
      if (!match) inv.Status = "error";
    }
    if (!inv.CorrectiveAction) {
      const match = (inv.Comments || "").match(/(?=CORRECTION:)[^]+((?=04 - WORK COMPLETE)|(?=, PACKED TOOLS))/gm);
      if (!match) inv.Status = "error";
    }
  }
  return inv;
}

export default function DistributeOrdersPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [dates, setDates] = useState(getDefaultDateRange);
  const [debouncedDates, setDebouncedDates] = useState({
    start: "",
    end: "",
    isValid: false,
  });
  const handleDebouncedChange = useCallback((start, end, isValid) => {
    setDebouncedDates({ start, end, isValid });
  }, []);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [toPrint, setToPrint] = useState([]);
  const [printing, setPrinting] = useState(false);
  const [crownLoading, setCrownLoading] = useState(false);
  const [autoprintUrl, setAutoprintUrl] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [savingPanel, setSavingPanel] = useState(false);
  const [sortBy, setSortBy] = useState("InvoiceDate");
  const [sortReverse, setSortReverse] = useState(false);

  // Process tab
  const [processWOs, setProcessWOs] = useState([]);
  const [processLoading, setProcessLoading] = useState(false);
  const [processSearch, setProcessSearch] = useState("");

  // Search tab
  const [searchTab, setSearchTab] = useState("invoice");
  const [docSearch, setDocSearch] = useState("");
  const [docGrid, setDocGrid] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const t = getAuthToken();
    if (!t) {
      router.push("/sign-in");
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (token) {
      getAutoprintUrl(token).then(setAutoprintUrl);
    }
  }, [token]);

  const fetchData = useCallback(() => {
    if (!token) return;
    if (!debouncedDates.isValid) return;
    setLoading(true);
    getPendingInvoicesSearch(debouncedDates.start, debouncedDates.end, token)
      .then((data) => {
        const processed = data.map(processDocumentStatus);
        setDocuments(processed);
      })
      .catch((err) => {
        toast.error(err?.message || "Failed to load invoices");
        setDocuments([]);
      })
      .finally(() => setLoading(false));
  }, [token, debouncedDates.start, debouncedDates.end, debouncedDates.isValid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchProcess = useCallback(() => {
    if (!token) return;
    const branch = branchDeptFilter?.branches?.[0]?.Number ?? branchDeptFilter?.branches?.[0];
    if (!branch) {
      setProcessWOs([]);
      setProcessLoading(false);
      return;
    }
    setProcessLoading(true);
    getPendingClose(branch, token)
      .then(setProcessWOs)
      .catch((err) => {
        toast.error(err?.message || "Failed to load work orders");
        setProcessWOs([]);
      })
      .finally(() => setProcessLoading(false));
  }, [token, branchDeptFilter]);

  useEffect(() => {
    fetchProcess();
  }, [fetchProcess]);

  const processFiltered = processWOs.filter(
    (wo) =>
      !processSearch ||
      String(wo.WONo || "").includes(processSearch) ||
      (wo.ShipName || "").toLowerCase().includes(processSearch.toLowerCase()) ||
      (wo.SerialNo || "").toLowerCase().includes(processSearch.toLowerCase()) ||
      (wo.ServiceVan || "").toLowerCase().includes(processSearch.toLowerCase()) ||
      (wo.Comments || "").toLowerCase().includes(processSearch.toLowerCase())
  );

  const fetchDocSearch = useCallback(() => {
    if (!token) return;
    setDocLoading(true);
    setDocGrid([]);
    const fns = {
      invoice: () => getOpenWODocuments(docSearch, token),
      po: () => getPODocuments(docSearch, token),
      vendor: () => getVendorDocuments(docSearch, token),
      ap: () => getAPDocuments(docSearch, token),
      customer: () => getCustomerDocuments(docSearch, token),
      equipment: () => getEquipmentDocuments(docSearch, token),
      mechanic: () => getMechanicDocuments(docSearch, token),
    };
    const fn = fns[searchTab] || fns.invoice;
    fn()
      .then(setDocGrid)
      .catch((err) => {
        toast.error(err?.message || "Failed to search");
        setDocGrid([]);
      })
      .finally(() => setDocLoading(false));
  }, [token, docSearch, searchTab]);

  useEffect(() => {
    if (docSearch !== "" || searchTab === "invoice") {
      fetchDocSearch();
    } else {
      setDocGrid([]);
    }
  }, [fetchDocSearch, docSearch, searchTab]);

  const handleSelectDoc = async (item) => {
    if (!token) return;
    const tableMap = { invoice: "wo", po: "po", vendor: "vendor", ap: "ap", customer: "customer", equipment: "equipment", mechanic: "mechanic" };
    const table = tableMap[searchTab] || "wo";
    setPreviewLoading(true);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const url = await getDocumentImageUrl(table, item.ID, token);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err?.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const searchFiltered = documents.filter(
    (d) =>
      !search ||
      String(d.InvoiceNo || "").includes(search) ||
      (d.ShipName || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.BillToName || "").toLowerCase().includes(search.toLowerCase()) ||
      String(d.PONo || "").includes(search)
  );
  const filtered = filterByBranchDept(searchFiltered, branchDeptFilter);
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortBy] ?? "";
    const vb = b[sortBy] ?? "";
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortReverse ? -cmp : cmp;
  });

  const toggleSelect = (inv) => {
    setToPrint((prev) => {
      const has = prev.some((p) => p.InvoiceNo === inv.InvoiceNo);
      if (has) return prev.filter((p) => p.InvoiceNo !== inv.InvoiceNo);
      return [...prev, inv];
    });
  };

  const hasCrownInvoices = toPrint.some((p) => p.CrownCustomerNo);

  const handlePrintInvoices = async () => {
    if (!toPrint.length || !token) return;
    setPrinting(true);
    try {
      await printInvoices(
        { toPrint: toPrint.map((p) => p.InvoiceNo) },
        token
      );
      toast.success("Invoices sent to print.");
      setToPrint([]);
      setDocuments((prev) =>
        prev.map((d) => ({
          ...d,
          sendToPrint: toPrint.some((p) => p.InvoiceNo === d.InvoiceNo)
            ? false
            : d.sendToPrint,
        }))
      );
    } catch (err) {
      toast.error(err?.message || "Failed to print invoices");
    } finally {
      setPrinting(false);
    }
  };

  const handleGetCrownInvoice = async () => {
    if (!toPrint.length || !token) return;
    setCrownLoading(true);
    try {
      const blob = await exportToCrown(
        { ids: toPrint.map((p) => p.InvoiceNo) },
        token
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crown.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice zip file created.");
      setToPrint([]);
    } catch (err) {
      toast.error(err?.message || "Failed to export Crown invoice");
    } finally {
      setCrownLoading(false);
    }
  };

  const toggleSort = (prop) => {
    setSortReverse((prev) => (sortBy === prop ? !prev : false));
    setSortBy(prop);
  };

  const openPanel = (inv) => {
    setSelectedInvoice(inv ? { ...inv } : null);
    setPanelOpen(!!inv);
  };

  const handleSavePanel = async () => {
    if (!selectedInvoice || !token) return;
    setSavingPanel(true);
    try {
      await updateWorkOrder(
        {
          WONo: selectedInvoice.InvoiceNo,
          ProblemDescription: selectedInvoice.ProblemDescription ?? "",
          CorrectiveAction: selectedInvoice.CorrectiveAction ?? "",
        },
        "Update",
        token
      );
      setDocuments((prev) =>
        prev.map((d) =>
          d.InvoiceNo === selectedInvoice.InvoiceNo
            ? {
                ...d,
                ProblemDescription: selectedInvoice.ProblemDescription,
                CorrectiveAction: selectedInvoice.CorrectiveAction,
                ...processDocumentStatus({
                  ...d,
                  ProblemDescription: selectedInvoice.ProblemDescription,
                  CorrectiveAction: selectedInvoice.CorrectiveAction,
                }),
              }
            : d
        )
      );
      toast.success("Work order updated.");
      openPanel(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    } finally {
      setSavingPanel(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Close / Distribute Orders
          </h1>
        </div>

        <Tabs defaultValue="distribute" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="distribute">Distribute</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="distribute" className="space-y-6">
        <Card className="mb-6 border-border bg-card text-card-foreground">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Invoices Available to Print</CardTitle>
            <CardDescription>
              Select a date range and optionally filter by branch/department
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <DateRangeInput
              startDate={dates.start}
              endDate={dates.end}
              onStartDateChange={(val) =>
                setDates((d) => ({ ...d, start: val ? new Date(val + "T12:00:00") : d.start }))
              }
              onEndDateChange={(val) =>
                setDates((d) => ({ ...d, end: val ? new Date(val + "T12:00:00") : d.end }))
              }
              onDebouncedChange={handleDebouncedChange}
              startLabel="Start date"
              endLabel="End date"
              inputClassName="w-40"
            />
            {token && (
              <BranchDeptFilter
                value={branchDeptFilter}
                onChange={setBranchDeptFilter}
                token={token}
              />
            )}
            <Button onClick={fetchData} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                {filtered.length} invoice{filtered.length !== 1 ? "s" : ""} in date range
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              {toPrint.length > 0 && (
                <>
                  <Button
                    onClick={handlePrintInvoices}
                    disabled={printing}
                    className="gap-2"
                  >
                    {printing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    Distribute Selected ({toPrint.length})
                  </Button>
                  {hasCrownInvoices && (
                    <Button
                      variant="outline"
                      onClick={handleGetCrownInvoice}
                      disabled={crownLoading}
                      className="gap-2"
                    >
                      {crownLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Get Crown Invoice File
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No invoices for the selected date range.
              </p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-6 rounded-lg border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Legend</span>
                  <span className="flex items-center gap-1.5">
                    <Printer className="h-4 w-4" /> Print
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Upload className="h-4 w-4" /> Crown
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> OK
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-500" /> Needs Problem Description / Corrective Action
                  </span>
                </div>
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                      <TableHead className="w-10" />
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("EmailInvoice")}
                      >
                        TYPE
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("InvoiceNo")}
                      >
                        INVOICE #
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("ShipName")}
                      >
                        SHIP TO
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("BillToName")}
                      >
                        BILL TO
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline w-16"
                        onClick={() => toggleSort("Status")}
                      >
                        Status
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("PONo")}
                      >
                        PO #
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("InvoiceDate")}
                      >
                        INVOICE DATE
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:underline"
                        onClick={() => toggleSort("ClosedBy")}
                      >
                        CLOSED BY
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((inv) => {
                      const isSelected = toPrint.some(
                        (p) => p.InvoiceNo === inv.InvoiceNo
                      );
                      return (
                        <TableRow key={inv.InvoiceNo}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(inv)}
                            />
                          </TableCell>
                          <TableCell>
                            {inv.EMailInvoice == null || inv.EMailInvoice === 0 ? (
                              inv.CrownCustomerNo ? (
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Printer className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : (
                              inv.CrownCustomerNo ? (
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/work-orders/${inv.InvoiceNo}`)
                              }
                              className="text-primary hover:underline"
                            >
                              {inv.InvoiceNo}
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{inv.ShipTo}</span>{" "}
                            {inv.ShipName}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{inv.BillTo}</span>{" "}
                            {inv.BillToName}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => openPanel(inv)}
                              className="p-1 rounded hover:bg-muted"
                              title="Edit Problem Description / Corrective Action"
                            >
                              {inv.Status === "ok" ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>{inv.PONo || "—"}</TableCell>
                          <TableCell>{formatDate(inv.InvoiceDate)}</TableCell>
                          <TableCell>{inv.ClosedBy || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              </>
            )}

            {autoprintUrl && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" asChild>
                  <a
                    href={autoprintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Autoprint Client
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-6">
            <Card className="border-border bg-card text-card-foreground">
              <CardHeader>
                <CardTitle>Paperwork Complete Work Orders</CardTitle>
                <CardDescription>
                  Work orders with paperwork complete, pending close. Select a branch to load.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  {token && (
                    <BranchDeptFilter
                      value={branchDeptFilter}
                      onChange={setBranchDeptFilter}
                      token={token}
                    />
                  )}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search WOs..."
                      value={processSearch}
                      onChange={(e) => setProcessSearch(e.target.value)}
                      className="pl-9 max-w-xs"
                    />
                  </div>
                </div>
                {processLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : processWOs.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    No work orders for the selected branch.
                  </p>
                ) : (
                  <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                          <TableHead>WO #</TableHead>
                          <TableHead>COMPANY</TableHead>
                          <TableHead>TECHNICIAN</TableHead>
                          <TableHead>EQUIPMENT</TableHead>
                          <TableHead>TIMELINE</TableHead>
                          <TableHead>COMMENTS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processFiltered.map((wo) => (
                          <TableRow
                            key={wo.WONo}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/work-orders/${wo.WONo}`)}
                          >
                            <TableCell>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); router.push(`/work-orders/${wo.WONo}`); }}
                                className="text-primary hover:underline"
                              >
                                {wo.WONo}
                              </button>
                            </TableCell>
                            <TableCell>{wo.ShipName}</TableCell>
                            <TableCell>{wo.ServiceVan || "—"}</TableCell>
                            <TableCell>
                              <span className="text-xs">Serial: {wo.SerialNo}</span>
                              <br />
                              <span className="text-xs">Unit: {wo.UnitNo || "—"}</span>
                            </TableCell>
                            <TableCell className="text-xs">
                              Opened: {formatDate(wo.OpenDate)}
                              <br />
                              Dispatched: {formatDate(wo.DispatchedDate)}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{wo.Comments || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card className="border-border bg-card text-card-foreground">
              <CardHeader>
                <CardTitle>Document Search</CardTitle>
                <CardDescription>
                  Search documents by type. Select a row to preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
                  <div className="space-y-4">
                    <Tabs value={searchTab} onValueChange={setSearchTab} className="w-full">
                      <TabsList className="flex flex-wrap h-auto gap-1">
                        <TabsTrigger value="invoice">Invoice / WO</TabsTrigger>
                        <TabsTrigger value="po">PO</TabsTrigger>
                        <TabsTrigger value="vendor">Vendor</TabsTrigger>
                        <TabsTrigger value="ap">AP Invoice</TabsTrigger>
                        <TabsTrigger value="customer">Customer</TabsTrigger>
                        <TabsTrigger value="equipment">Equipment</TabsTrigger>
                        <TabsTrigger value="mechanic">Mechanic</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div>
                      <Label>
                        {searchTab === "invoice" ? "Customer # or Invoice #" : searchTab === "po" ? "PO #" : searchTab === "mechanic" ? "Mechanic #" : "Search"}
                      </Label>
                      <Input
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        placeholder={searchTab === "invoice" ? "Leave empty for all, or type to filter" : "Type to search"}
                        className="mt-2"
                      />
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
                      {docLoading ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : docGrid.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No documents found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{searchTab === "invoice" ? "Customer #" : searchTab === "po" ? "PO #" : searchTab === "mechanic" ? "Mechanic #" : "ID"}</TableHead>
                              <TableHead>{searchTab === "invoice" ? "WO #" : "Date"}</TableHead>
                              <TableHead>File</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {docGrid.map((item, idx) => (
                              <TableRow
                                key={item.ID ?? idx}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSelectDoc(item)}
                              >
                                <TableCell>{item.CustomerNo ?? item.PONo ?? item.VendorNo ?? item.APInvoiceNo ?? item.MechanicNo ?? item.SerialNo ?? "—"}</TableCell>
                                <TableCell>{item.InvoiceNo ?? item.DateAdded ?? "—"}</TableCell>
                                <TableCell className="truncate max-w-[120px]">{item.FileName ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="min-h-[40vh] rounded-lg border bg-muted/30 flex items-center justify-center">
                      {previewLoading ? (
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      ) : previewUrl ? (
                        <iframe src={previewUrl} title="Document preview" className="w-full h-[40vh] rounded" />
                      ) : (
                        <p className="text-sm text-muted-foreground">Select a document to preview</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={panelOpen} onOpenChange={(o) => !o && openPanel(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              Work Order #{selectedInvoice?.InvoiceNo}
            </SheetTitle>
          </SheetHeader>
          {selectedInvoice && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedInvoice.ShipName}
              </p>
              <div>
                <Label>Comments</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedInvoice.Comments || "—"}
                </p>
              </div>
              <div>
                <Label htmlFor="problem">Problem Description</Label>
                <Input
                  id="problem"
                  value={selectedInvoice.ProblemDescription ?? ""}
                  onChange={(e) =>
                    setSelectedInvoice((prev) => ({
                      ...prev,
                      ProblemDescription: e.target.value,
                    }))
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="corrective">Corrective Action</Label>
                <Input
                  id="corrective"
                  value={selectedInvoice.CorrectiveAction ?? ""}
                  onChange={(e) =>
                    setSelectedInvoice((prev) => ({
                      ...prev,
                      CorrectiveAction: e.target.value,
                    }))
                  }
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => openPanel(null)}
                  disabled={savingPanel}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePanel}
                  disabled={savingPanel}
                >
                  {savingPanel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
