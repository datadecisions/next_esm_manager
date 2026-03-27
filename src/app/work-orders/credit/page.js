"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthToken } from "@/lib/auth";
import { getCreditApprovals } from "@/lib/api/accounting";
import { updateWorkOrder } from "@/lib/api/work-order";

function formatCurrency(val) {
  if (val == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function getDispositionLabel(disp) {
  const m = { 1: "Open", 2: "Closed", 11: "Quote", 12: "Accepted" };
  return m[disp] ?? "—";
}

const DEMO_DATA = [
  {
    BillTo: "10001",
    CustomerName: "Acme Equipment Co.",
    BalanceWithoutCredit: 18500,
    OutstandingBalance: 18500,
    CreditLimit: 15000,
    orders: [
      { WONo: 3045001, Disposition: 1, CreditFlag: 2, CreditAmount: 0, ShipName: "Acme Equipment Co.", Comments: "PM service - awaiting credit approval" },
      { WONo: 3045002, Disposition: 1, CreditFlag: 1, CreditAmount: 0, ShipName: "Acme Equipment Co.", Comments: "Rental repair" },
    ],
  },
  {
    BillTo: "10042",
    CustomerName: "Metro Fleet Services",
    BalanceWithoutCredit: 8750,
    OutstandingBalance: 8750,
    CreditLimit: 10000,
    orders: [
      { WONo: 3044892, Disposition: 1, CreditFlag: 2, CreditAmount: 450, ShipName: "Metro Fleet - Downtown", Comments: "Credit requested for overcharge" },
    ],
  },
];

export default function CreditApprovalPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [approving, setApproving] = useState(null);

  const displayData = showDemo ? DEMO_DATA : data;

  useEffect(() => {
    const t = getAuthToken();
    if (!t) {
      router.push("/sign-in");
      return;
    }
    setToken(t);
  }, [router]);

  const fetchData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    getCreditApprovals(token)
      .then(setData)
      .catch((err) => {
        toast.error(err?.message || "Failed to load credit approvals");
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (billTo) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(billTo)) next.delete(billTo);
      else next.add(billTo);
      return next;
    });
  };

  const handleApprove = async (wo) => {
    if (!token || !wo?.WONo) return;
    setApproving(wo.WONo);
    try {
      await updateWorkOrder(
        { WONo: wo.WONo, CreditFlag: 1, CreditBy: "Approved" },
        "Update",
        token
      );
      toast.success(`Order #${wo.WONo} approved`);
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const isOverLimit = (item) => {
    const bal = Number(item.BalanceWithoutCredit ?? item.OutstandingBalance ?? 0);
    const limit = Number(item.CreditLimit ?? 0);
    return limit > 0 && bal > limit;
  };

  const hasCreditRequests = (item) =>
    (item.orders ?? []).some((o) => o.CreditFlag === 2);

  if (!token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Credit Approval
          </h1>
        </div>

        <Card className="border-border bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pending Credit Review
              </CardTitle>
              <CardDescription>
                Customers over credit limit or with pending credit requests. Review
                and approve or take action on individual work orders.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : displayData.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  No pending credit approvals.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDemo(true);
                    setExpanded(new Set(["10001"]));
                  }}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  View example
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {showDemo && (
                  <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
                      Example data — not from your system
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowDemo(false)}>
                      Hide example
                    </Button>
                  </div>
                )}
                {displayData.map((item) => {
                  const overLimit = isOverLimit(item);
                  const creditRequests = hasCreditRequests(item);
                  const orders = item.orders ?? [];
                  const isOpen = expanded.has(item.BillTo);

                  return (
                    <div
                      key={item.BillTo}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.BillTo)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">#{item.BillTo} {item.CustomerName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Balance: {formatCurrency(item.BalanceWithoutCredit)} · Limit: {formatCurrency(item.CreditLimit)}
                            {overLimit && (
                              <span className="ml-2 font-medium text-primary">
                                Over by {formatCurrency(Number(item.BalanceWithoutCredit ?? 0) - Number(item.CreditLimit ?? 0))}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {overLimit && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Over limit
                            </span>
                          )}
                          {creditRequests && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              <CreditCard className="h-3.5 w-3.5" />
                              Credit requested
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {orders.length} order{orders.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                      {isOpen && (
                          <div className="border-t border-border bg-muted/20">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-transparent hover:bg-transparent">
                                  <TableHead className="w-24">WO #</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Credit</TableHead>
                                  <TableHead>Ship To</TableHead>
                                  <TableHead>Comments</TableHead>
                                  <TableHead className="w-28 text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orders.map((wo) => (
                                  <TableRow key={wo.WONo}>
                                    <TableCell>
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/work-orders/${wo.WONo}`)}
                                        className="font-medium text-primary hover:underline"
                                      >
                                        {wo.WONo}
                                      </button>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-muted-foreground">
                                        {getDispositionLabel(wo.Disposition)}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {wo.CreditFlag === 2 ? (
                                        <span className="text-sm text-primary">
                                          Pending approval
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">
                                          {formatCurrency(wo.CreditAmount)}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="max-w-[180px] truncate">
                                      {wo.ShipName || "—"}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                      {wo.Comments || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => router.push(`/work-orders/${wo.WONo}`)}
                                        >
                                          View
                                        </Button>
                                        {wo.CreditFlag === 2 && !showDemo && (
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleApprove(wo);
                                            }}
                                            disabled={approving === wo.WONo}
                                          >
                                            {approving === wo.WONo ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <>
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Approve
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
