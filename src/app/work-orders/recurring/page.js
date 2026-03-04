"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, RefreshCw, Loader2, FileOutput, Mail, Plus, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { getAuthToken } from "@/lib/auth";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { BranchDeptFilter, filterByBranchDept } from "@/components/BranchDeptFilter";
import {
  getOpenRecurringOrders,
  getRecurringContinuations,
  getScheduledPM,
  closeWOs,
  openPM,
  updatePONo,
  updateWOComments,
  getMultipleInvoicePdfUrl,
  emailMultipleInvoices,
} from "@/lib/api/work-order";
import { getCustomerContactsByNumber } from "@/lib/api/customer";

function formatDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function formatCurrency(val) {
  if (val == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
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

export default function RecurringOrdersPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [dates, setDates] = useState(() => getMonthRange());
  const [hideGM, setHideGM] = useState(false);
  const [search, setSearch] = useState("");
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();

  useEffect(() => {
    const t = getAuthToken();
    if (!t) {
      router.push("/sign-in");
      return;
    }
    setToken(t);
  }, [router]);

  if (!token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Recurring Orders
          </h1>
        </div>

        {/* Date range */}
        <Card className="mb-6 dark:border-slate-700 dark:bg-slate-800/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Date range</CardTitle>
            <CardDescription>
              Select start and end dates for recurring orders
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={toYMD(dates.start) || ""}
                onChange={(e) => {
                  const d = parseDateInput(e.target.value);
                  if (d) setDates((prev) => ({ ...prev, start: d }));
                }}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                value={toYMD(dates.end) || ""}
                onChange={(e) => {
                  const d = parseDateInput(e.target.value);
                  if (d) setDates((prev) => ({ ...prev, end: d }));
                }}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDates(getMonthRange(-1))}
              >
                Last month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDates(getMonthRange(0))}
              >
                This month
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Branch / Department</Label>
              <BranchDeptFilter
                value={branchDeptFilter}
                onChange={setBranchDeptFilter}
                token={token}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="gm" className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="gm">GM / Rental Recurring</TabsTrigger>
            <TabsTrigger value="pm">PM Schedule</TabsTrigger>
            <TabsTrigger value="created">Created</TabsTrigger>
          </TabsList>

          <TabsContent value="gm">
            <GMTab
              dates={dates}
              hideGM={hideGM}
              setHideGM={setHideGM}
              search={search}
              setSearch={setSearch}
              branchDeptFilter={branchDeptFilter}
              token={token}
              router={router}
            />
          </TabsContent>
          <TabsContent value="pm">
            <PMTab
              dates={dates}
              search={search}
              setSearch={setSearch}
              branchDeptFilter={branchDeptFilter}
              token={token}
              router={router}
            />
          </TabsContent>
          <TabsContent value="created">
            <CreatedTab
              dates={dates}
              search={search}
              setSearch={setSearch}
              branchDeptFilter={branchDeptFilter}
              token={token}
              router={router}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function GMTab({ dates, hideGM, setHideGM, search, setSearch, branchDeptFilter, token, router }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toClose, setToClose] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingPONo, setEditingPONo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [sortBy, setSortBy] = useState("OpenDate");
  const [sortReverse, setSortReverse] = useState(false);

  const fetchData = useCallback(() => {
    if (!token) return;
    const startStr = toYMD(dates.start) || toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const endStr = toYMD(dates.end) || toYMD(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    if (!startStr || !endStr) return;
    setLoading(true);
    getOpenRecurringOrders(startStr, endStr, hideGM, token)
      .then(setDocuments)
      .catch((err) => {
        toast.error(err?.message || "Failed to load recurring orders");
        setDocuments([]);
      })
      .finally(() => setLoading(false));
  }, [token, dates, hideGM, branchDeptFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelect = (inv) => {
    setToClose((prev) => {
      const has = prev.some((p) => p.WONo === inv.WONo);
      if (has) return prev.filter((p) => p.WONo !== inv.WONo);
      return [...prev, { ...inv, Branch: inv.SaleBranch }];
    });
  };

  const handleProcess = async () => {
    if (toClose.length === 0) return;
    setConfirmOpen(true);
  };

  const confirmProcess = async () => {
    setProcessing(true);
    try {
      const result = await closeWOs(
        {
          toClose: toClose.map((item) => ({
            WONo: item.WONo,
            Branch: item.Branch ?? item.SaleBranch,
            SaleBranch: item.SaleBranch,
            awaitingPONumber: item.awaitingPONumber ?? false,
          })),
        },
        token
      );
      const opened = result?.openedWorkOrders || [];
      const wos = opened.map((o) =>
        typeof o === "object" ? o.WONo : o
      ).filter(Boolean);
      const msg =
        wos.length > 0
          ? `Invoices created & Hr. Meter Updated: ${wos.join(", ")}.`
          : "Orders processed.";
      toast.success(msg);
      setToClose([]);
      setConfirmOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to process orders");
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePONo = async (inv) => {
    try {
      await updatePONo({ WONo: inv.WONo, PONo: inv.PONo || "" }, token);
      toast.success("PO Number updated");
      setEditingPONo(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update PO");
    }
  };

  const handleSaveComment = async (inv) => {
    try {
      await updateWOComments(
        { WONo: inv.WONo, Comments: inv.Comments || "" },
        token
      );
      toast.success("Comments updated");
      setEditingComment(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update comments");
    }
  };

  const toggleSort = (prop) => {
    setSortReverse((prev) => (sortBy === prop ? !prev : false));
    setSortBy(prop);
  };

  const searchFiltered = documents.filter(
    (d) =>
      !search ||
      String(d.WONo).includes(search) ||
      (d.BillToName || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.ShipToName || "").toLowerCase().includes(search.toLowerCase())
  );
  const filtered = filterByBranchDept(searchFiltered, branchDeptFilter);
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortReverse ? -cmp : cmp;
  });

  return (
    <Card className="dark:border-slate-700 dark:bg-slate-800/50">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Recurring Orders to Process</CardTitle>
          <CardDescription>
            Select orders to close and create continuations
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hideGM}
              onChange={(e) => setHideGM(e.target.checked)}
              className="rounded"
            />
            Hide GM Monthly Billing
          </label>
          <Button
            onClick={handleProcess}
            disabled={toClose.length === 0}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Process Selected ({toClose.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : documents.length === 0 ? (
          <p className="py-12 text-center text-slate-500 dark:text-slate-400">
            No available recurring items for dates selected.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 hover:bg-muted/95">
                  <TableHead className="w-10" />
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("WONo")}
                  >
                    ORDER NO.
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("PONo")}
                  >
                    PO NO.
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("BillToName")}
                  >
                    COMPANY
                  </TableHead>
                  <TableHead>EQUIPMENT</TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("OpenDate")}
                  >
                    OPEN DATE
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("PartsCost")}
                  >
                    PARTS
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("MiscCost")}
                  >
                    MISC
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("GrandTotal")}
                  >
                    GRAND TOTAL
                  </TableHead>
                  <TableHead className="min-w-[120px]">COMMENTS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((inv) => (
                  <TableRow key={inv.WONo}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={toClose.some((p) => p.WONo === inv.WONo)}
                        onChange={() => toggleSelect(inv)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => router.push(`/work-orders/${inv.WONo}`)}
                        className="text-cyan-600 hover:underline dark:text-cyan-400"
                      >
                        {inv.WONo}
                      </button>
                      {inv.SaleDept && inv.SaleCode && (
                        <span className="text-slate-500 text-xs ml-1">
                          ({inv.SaleDept} {inv.SaleCode})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPONo === inv.WONo ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={inv.PONo || ""}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.WONo === inv.WONo
                                    ? { ...d, PONo: e.target.value }
                                    : d
                                )
                              )
                            }
                            className="h-7 w-24"
                            autoFocus
                          />
                          <Button
                            size="xs"
                            onClick={() => handleSavePONo(inv)}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setEditingPONo(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-1 rounded"
                          onClick={() => setEditingPONo(inv.WONo)}
                          title="Click to edit"
                        >
                          {inv.PONo || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium">BT: {inv.BillTo}</span>{" "}
                        {inv.BillToName}
                        <br />
                        <span className="font-medium">ST: {inv.ShipTo}</span>{" "}
                        {inv.ShipToName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {inv.rentalEquipment?.length > 0 ? (
                        <div className="space-y-1">
                          {inv.rentalEquipment.map((eq) => (
                            <div key={eq.SerialNo} className="text-xs">
                              <b>{eq.UnitNo}</b> {eq.SerialNo} — {eq.Make}{" "}
                              {eq.Model} ({formatCurrency(eq.Sell)})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs">
                          {inv.UnitNo} {inv.SerialNo} — {inv.Make} {inv.Model}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(inv.OpenDate)}</TableCell>
                    <TableCell>{formatCurrency(inv.PartsCost)}</TableCell>
                    <TableCell>{formatCurrency(inv.MiscCost)}</TableCell>
                    <TableCell>{formatCurrency(inv.GrandTotal)}</TableCell>
                    <TableCell>
                      {editingComment === inv.WONo ? (
                        <div className="flex gap-1">
                          <Input
                            value={inv.Comments || ""}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.WONo === inv.WONo
                                    ? { ...d, Comments: e.target.value }
                                    : d
                                )
                              )
                            }
                            className="h-7 flex-1"
                            autoFocus
                          />
                          <Button
                            size="xs"
                            onClick={() => handleSaveComment(inv)}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setEditingComment(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-1 rounded block truncate max-w-[140px]"
                          onClick={() => setEditingComment(inv.WONo)}
                          title={inv.Comments || "Click to add"}
                        >
                          {inv.Comments || "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Orders To Be Closed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {toClose.map((order) => (
              <div
                key={order.WONo}
                className="rounded-lg border p-4 dark:border-slate-700"
              >
                <h3 className="font-semibold">Order #{order.WONo}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Ship To: {order.ShipToName}
                  <br />
                  Rental Period: {order.RentalPeriod}
                  <br />
                  Rental Start: {formatDate(order.RentalStart)} — End:{" "}
                  {formatDate(order.RentalEnd)}
                </p>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={order.awaitingPONumber ?? false}
                    onChange={(e) =>
                      setToClose((prev) =>
                        prev.map((p) =>
                          p.WONo === order.WONo
                            ? { ...p, awaitingPONumber: e.target.checked }
                            : p
                        )
                      )
                    }
                  />
                  Awaiting PO Number from Customer
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Close & Process"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PMTab({ dates, search, setSearch, branchDeptFilter, token, router }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toClose, setToClose] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [sortBy, setSortBy] = useState("OpenDate");
  const [sortReverse, setSortReverse] = useState(false);

  const fetchData = useCallback(() => {
    if (!token) return;
    const startStr = toYMD(dates.start) || toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const endStr = toYMD(dates.end) || toYMD(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    if (!startStr || !endStr) return;
    setLoading(true);
    getScheduledPM(startStr, endStr, token)
      .then(setSchedules)
      .catch((err) => {
        toast.error(err?.message || "Failed to load PM schedule");
        setSchedules([]);
      })
      .finally(() => setLoading(false));
  }, [token, dates, branchDeptFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelect = (pm) => {
    setToClose((prev) => {
      const has = prev.some((p) => p.ID === pm.ID);
      if (has) return prev.filter((p) => p.ID !== pm.ID);
      return [...prev, pm];
    });
  };

  const handleOpenPM = async () => {
    if (toClose.length === 0) return;
    setProcessing(true);
    try {
      const result = await openPM(
        { ids: toClose.map((item) => ({ id: item.ID })) },
        token
      );
      const opened = result?.openedWorkOrders || [];
      const msg =
        opened.length > 0
          ? `Following PM have been opened: ${opened.join(", ")}.`
          : "PM opened.";
      toast.success(msg);
      setToClose([]);
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to open PM");
    } finally {
      setProcessing(false);
    }
  };

  const toggleSort = (prop) => {
    setSortReverse((prev) => (sortBy === prop ? !prev : false));
    setSortBy(prop);
  };

  const searchFiltered = schedules.filter(
    (s) =>
      !search ||
      String(s.WONo || s.SerialNo || "").includes(search) ||
      (s.BillToName || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.ShipToName || "").toLowerCase().includes(search.toLowerCase())
  );
  const filtered = filterByBranchDept(searchFiltered, branchDeptFilter);
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortBy] ?? a.NextPMDate ?? "";
    const vb = b[sortBy] ?? b.NextPMDate ?? "";
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortReverse ? -cmp : cmp;
  });

  return (
    <Card className="dark:border-slate-700 dark:bg-slate-800/50">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>PM Order Schedule</CardTitle>
          <CardDescription>
            Scheduled preventive maintenance to open as work orders
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Button
            onClick={handleOpenPM}
            disabled={toClose.length === 0 || processing}
            className="gap-2"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Open Selected ({toClose.length})
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="py-12 text-center text-slate-500 dark:text-slate-400">
            No PM items for this selection.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 hover:bg-muted/95">
                  <TableHead className="w-10" />
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("WONo")}
                  >
                    ORDER #
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("BillToName")}
                  >
                    COMPANY
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("NextPMDate")}
                  >
                    DUE DATE
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("SerialNo")}
                  >
                    SERIAL #
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("Comments")}
                  >
                    COMMENTS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((pm) => (
                  <TableRow key={pm.ID}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={toClose.some((p) => p.ID === pm.ID)}
                        onChange={() => toggleSelect(pm)}
                      />
                    </TableCell>
                    <TableCell>
                      {pm.WONo ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/work-orders/${pm.WONo}`)
                          }
                          className="text-cyan-600 hover:underline dark:text-cyan-400"
                        >
                          {pm.WONo}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium">BT: {pm.BillTo}</span>{" "}
                        {pm.BillToName}
                        <br />
                        <span className="font-medium">ST: {pm.ShipTo}</span>{" "}
                        {pm.ShipToName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(pm.NextPMDate || pm.OpenDate)}
                    </TableCell>
                    <TableCell>{pm.SerialNo || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {pm.Comments || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreatedTab({ dates, search, setSearch, branchDeptFilter, token, router }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date_created");
  const [sortReverse, setSortReverse] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [emailInfo, setEmailInfo] = useState({
    emails: [],
    emailToAdd: "",
    emailMessage: "",
    groupEmail: true,
    splitEmail: false,
  });
  const [sending, setSending] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);

  const fetchData = useCallback(() => {
    if (!token) return;
    const startStr = toYMD(dates.start) || toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const endStr = toYMD(dates.end) || toYMD(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    if (!startStr || !endStr) return;
    setLoading(true);
    getRecurringContinuations(startStr, endStr, token)
      .then(setSchedules)
      .catch((err) => {
        toast.error(err?.message || "Failed to load created continuations");
        setSchedules([]);
      })
      .finally(() => setLoading(false));
  }, [token, dates, branchDeptFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedRows = schedules.filter((s) => s.isSelected);
  const selectedOriginals = selectedRows.map((s) => s.original);
  const hasSelection = selectedOriginals.length > 0;

  const toggleSelect = (row) => {
    setSchedules((prev) =>
      prev.map((r) =>
        r.original === row.original && r.created === row.created
          ? { ...r, isSelected: !r.isSelected }
          : r
      )
    );
  };

  const handleExportClick = useCallback(async () => {
    if (!hasSelection || !token) return;
    setExportOpen(true);
    setPdfLoading(true);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const first = selectedRows[0];
    try {
      const [url, contactList] = await Promise.all([
        getMultipleInvoicePdfUrl(selectedOriginals, token),
        getCustomerContactsByNumber(first.ShipTo, first.BillTo, token),
      ]);
      setPdfUrl(url);
      const seen = new Set();
      const emails = (contactList || [])
        .map((c) => c.EMail || c.email)
        .filter((e) => e && !seen.has(e.toLowerCase()) && (seen.add(e.toLowerCase()), true));
      setContacts(emails);
    } catch (err) {
      toast.error(err?.message || "Failed to load invoices");
    } finally {
      setPdfLoading(false);
    }
  }, [hasSelection, selectedRows, selectedOriginals, token]);

  const handleCloseExport = useCallback(() => {
    setExportOpen(false);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSchedules((prev) => prev.map((r) => ({ ...r, isSelected: false })));
    setEmailInfo({ emails: [], emailToAdd: "", emailMessage: "", groupEmail: true, splitEmail: false });
  }, []);

  const addEmail = () => {
    const e = emailInfo.emailToAdd?.trim();
    if (e && !emailInfo.emails.includes(e)) {
      setEmailInfo((prev) => ({
        ...prev,
        emails: [...prev.emails, e],
        emailToAdd: "",
      }));
      setFilteredContacts([]);
    }
  };

  const removeEmail = (email) => {
    setEmailInfo((prev) => ({
      ...prev,
      emails: prev.emails.filter((x) => x !== email),
    }));
  };

  const filterContacts = (q) => {
    setEmailInfo((prev) => ({ ...prev, emailToAdd: q }));
    if (!q) setFilteredContacts([]);
    else {
      const added = new Set(emailInfo.emails.map((e) => e.toLowerCase()));
      setFilteredContacts(
        contacts.filter(
          (e) =>
            e &&
            e.toLowerCase().includes(q.toLowerCase()) &&
            !added.has(e.toLowerCase())
        )
      );
    }
  };

  const selectContact = (email) => {
    if (email && !emailInfo.emails.includes(email)) {
      setEmailInfo((prev) => ({
        ...prev,
        emails: [...prev.emails, email],
        emailToAdd: "",
      }));
    }
    setFilteredContacts([]);
  };

  const handleSendEmails = async () => {
    if (!emailInfo.emails.length) {
      toast.error("Please add at least one recipient");
      return;
    }
    setSending(true);
    try {
      const res = await emailMultipleInvoices(
        {
          emailBody: emailInfo.emailMessage,
          invoices: selectedOriginals,
          emails: emailInfo.emails,
          groupEmail: emailInfo.groupEmail,
          splitEmail: emailInfo.splitEmail,
          useRentalReplyTo: true,
        },
        token
      );
      const accepted = res?.emailData?.accepted ?? [];
      const rejected = res?.emailData?.rejected ?? [];
      let msg = "Email sent to: " + accepted.join(", ");
      if (selectedOriginals.length) msg += " — Invoices: " + selectedOriginals.join(", ");
      if (rejected.length) msg += " — Rejected: " + rejected.join(", ");
      toast.success(msg);
      handleCloseExport();
    } catch (err) {
      toast.error(err?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const toggleSort = (prop) => {
    setSortReverse((prev) => (sortBy === prop ? !prev : false));
    setSortBy(prop);
  };

  const searchFiltered = schedules.filter(
    (s) =>
      !search ||
      String(s.original || "").includes(search) ||
      String(s.created || "").includes(search) ||
      (s.BillToName || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.ShipToName || "").toLowerCase().includes(search.toLowerCase())
  );
  const filtered = filterByBranchDept(searchFiltered, branchDeptFilter);
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortBy] ?? "";
    const vb = b[sortBy] ?? "";
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortReverse ? -cmp : cmp;
  });

  return (
    <Card className="dark:border-slate-700 dark:bg-slate-800/50">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Recurring Creation</CardTitle>
          <CardDescription>
            Work orders created from recurring closures
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          {hasSelection && (
            <Button onClick={handleExportClick} className="gap-2">
              <FileOutput className="h-4 w-4" />
              Export Invoices ({selectedOriginals.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="py-12 text-center text-slate-500 dark:text-slate-400">
            No available recurring items for dates selected.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 hover:bg-muted/95">
                  <TableHead className="w-10" />
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("original")}
                  >
                    ORIGINAL
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("BillToName")}
                  >
                    COMPANY
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("date_created")}
                  >
                    OPEN DATE
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("created")}
                  >
                    CREATED
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("RentalStart")}
                  >
                    INVOICE START
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:underline"
                    onClick={() => toggleSort("Comments")}
                  >
                    COMMENTS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, idx) => (
                  <TableRow key={`${row.original}-${row.created}-${idx}`}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={!!row.isSelected}
                        onChange={() => toggleSelect(row)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/work-orders/${row.original}`)
                        }
                        className="text-cyan-600 hover:underline dark:text-cyan-400"
                      >
                        {row.original}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium">BT: {row.BillTo}</span>{" "}
                        {row.BillToName}
                        <br />
                        <span className="font-medium">ST: {row.ShipTo}</span>{" "}
                        {row.ShipToName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(row.date_created)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/work-orders/${row.created}`)
                        }
                        className="text-cyan-600 hover:underline dark:text-cyan-400"
                      >
                        {row.created}
                      </button>
                    </TableCell>
                    <TableCell>
                      {formatDate(row.RentalStart)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {row.Comments || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={exportOpen} onOpenChange={(o) => !o && handleCloseExport()}>
        <DialogContent size="xl" className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="px-6 pt-6 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-500" />
                Export &amp; Email Invoices
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Preview, download, or email {selectedOriginals.length} invoice{selectedOriginals.length !== 1 ? "s" : ""}
              </p>
            </DialogHeader>

            {/* Invoice summary bar */}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Invoices:</span>
              <div className="flex flex-wrap gap-2">
                {selectedOriginals.map((wo) => (
                  <span
                    key={wo}
                    className="rounded-md bg-background px-2 py-1 text-sm font-mono shadow-sm"
                  >
                    {wo}
                  </span>
                ))}
              </div>
              {pdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5"
                  asChild
                >
                  <a href={pdfUrl} download="invoices.pdf">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr,1.2fr]">
              {/* Left: Form */}
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">Recipients</Label>
                  <div className="mt-2 flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3 min-h-[52px]">
                    {emailInfo.emails.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Add recipients to email invoices</span>
                    ) : (
                      emailInfo.emails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-700 dark:text-cyan-300"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="rounded-full p-0.5 hover:bg-cyan-500/20 transition-colors"
                            aria-label={`Remove ${email}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={emailInfo.emailToAdd}
                        onChange={(e) => filterContacts(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                        placeholder="Search contacts or type email..."
                        className="pr-9"
                      />
                      {filteredContacts.length > 0 && (
                        <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border bg-popover py-1 shadow-lg">
                          {filteredContacts.map((email) => (
                            <li key={email}>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                onClick={() => selectContact(email)}
                              >
                                {email}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button size="icon" variant="secondary" onClick={addEmail} title="Add email">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Personal message</Label>
                  <Textarea
                    value={emailInfo.emailMessage}
                    onChange={(e) =>
                      setEmailInfo((prev) => ({ ...prev, emailMessage: e.target.value }))
                    }
                    placeholder="Optional note to include with the invoices..."
                    className="mt-2 min-h-[72px] resize-none"
                  />
                </div>

                {emailInfo.emails.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">How to send</Label>
                    <div className="space-y-2 rounded-lg border p-3">
                      <label className="flex items-start gap-3 cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="sendMode"
                          checked={!emailInfo.splitEmail}
                          onChange={() =>
                            setEmailInfo((prev) => ({ ...prev, splitEmail: false, groupEmail: true }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <span className="text-sm font-medium">One email to all</span>
                          <p className="text-xs text-muted-foreground">
                            Single email with all recipients in To/CC
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="sendMode"
                          checked={emailInfo.splitEmail}
                          onChange={() =>
                            setEmailInfo((prev) => ({ ...prev, splitEmail: true, groupEmail: false }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <span className="text-sm font-medium">Separate email per invoice</span>
                          <p className="text-xs text-muted-foreground">
                            Each invoice sent in its own email
                          </p>
                        </div>
                      </label>
                    </div>
                    <Button onClick={handleSendEmails} disabled={sending} className="w-full gap-2" size="lg">
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Send to {emailInfo.emails.length} recipient{emailInfo.emails.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </div>

              {/* Right: Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="min-h-[280px] rounded-lg border bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
                  {pdfLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                      <span className="text-sm text-muted-foreground">Generating PDF...</span>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      title="Invoice preview"
                      className="h-[50vh] min-h-[320px] w-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <FileOutput className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Preview will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
