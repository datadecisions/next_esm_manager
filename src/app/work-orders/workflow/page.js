"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  CheckCircle2,
  Circle,
  RefreshCw,
  AlertTriangle,
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
import { useAuth } from "@/lib/auth";
import { useBranchDeptFilter } from "@/hooks/use-branch-dept-filter";
import { BranchDeptFilter, filterByBranchDept } from "@/components/BranchDeptFilter";
import {
  getQuotesForWorkflow,
  setQuoteWorkflowActive,
  approveQuoteWorkflow,
} from "@/lib/api/dispatch";
import { getQuoteWorkflowTypes } from "@/lib/api/work-order";

function formatDate(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DEMO_QUOTES = [
  {
    WONo: 3045100,
    ShipName: "Acme Equipment Co.",
    BillTo: "10001",
    ShipTo: "10001",
    SerialNo: "EQ-001",
    Comments: "PM quote - Parts and Labor",
    quoteWorkflows: {
      1: { id: 101, typeId: 1, typeName: "Parts", approved: 1, approvedBy: "J.Smith", date: "2024-01-15T10:30:00", assignedTo: null, created: "2024-01-14T09:00:00" },
      2: { id: 102, typeId: 2, typeName: "Labor", approved: 0, approvedBy: null, date: null, assignedTo: null, created: "2024-01-14T09:00:00" },
    },
  },
  {
    WONo: 3045101,
    ShipName: "Metro Fleet Services",
    BillTo: "10042",
    ShipTo: "10042",
    SerialNo: "EQ-042",
    Comments: "Rental repair quote",
    quoteWorkflows: {
      1: { id: 103, typeId: 1, typeName: "Parts", approved: 0, approvedBy: null, date: null, assignedTo: null, created: "2024-01-13T14:00:00" },
      2: { id: 104, typeId: 2, typeName: "Labor", approved: 0, approvedBy: null, date: null, assignedTo: null, created: "2024-01-13T14:00:00" },
      3: { id: 105, typeId: 3, typeName: "Equipment", approved: 0, approvedBy: null, date: null, assignedTo: null, created: "2024-01-13T14:00:00" },
    },
  },
];

const DEMO_TYPES = [
  { id: 1, name: "Parts", table_name: "WOParts" },
  { id: 2, name: "Labor", table_name: "WOLabor" },
  { id: 3, name: "Equipment", table_name: "WOEquip" },
  { id: 4, name: "Rental", table_name: "WORental" },
];

export default function WorkflowPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [quotes, setQuotes] = useState([]);
  const [workflowTypes, setWorkflowTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [branchDeptFilter, setBranchDeptFilter] = useBranchDeptFilter();
  const [updating, setUpdating] = useState(null);

  const fetchData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const branch = branchDeptFilter?.branches?.[0]?.Number ?? branchDeptFilter?.branches?.[0] ?? "null";
    const dept = branchDeptFilter?.depts?.[0]?.Dept ?? branchDeptFilter?.depts?.[0] ?? "null";
    Promise.all([
      getQuotesForWorkflow({ branch, dept }),
      getQuoteWorkflowTypes(),
    ])
      .then(([q, t]) => {
        setQuotes(q);
        setWorkflowTypes(t);
      })
      .catch((err) => {
        toast.error(err?.message || "Failed to load workflow");
        setQuotes([]);
        setWorkflowTypes([]);
      })
      .finally(() => setLoading(false));
  }, [token, branchDeptFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayQuotes = showDemo ? DEMO_QUOTES : quotes;
  const displayTypes = showDemo ? DEMO_TYPES : workflowTypes;

  const handleToggleApproved = async (wo, typeId, workflow, active) => {
    if (!token || showDemo) return;
    const key = `${wo.WONo}-${typeId}`;
    setUpdating(key);
    try {
      await setQuoteWorkflowActive(
        { woNo: wo.WONo, typeId, active, employee: workflow?.assignedTo }
      );
      toast.success(active ? "Approved" : "Unapproved");
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  const handleApproveWithDate = async (wo, workflow) => {
    if (!token || !workflow?.id || showDemo) return;
    const key = `approve-${workflow.id}`;
    setUpdating(key);
    try {
      await setQuoteWorkflowActive(
        { woNo: wo.WONo, typeId: workflow.typeId, active: true }
      );
      await approveQuoteWorkflow({ id: workflow.id, name: "Approved" });
      toast.success(`${workflow.typeName} approved`);
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to approve");
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading || !token) {
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
            Workflow
          </h1>
        </div>

        <Card className="border-border bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Quote Workflow Approval
              </CardTitle>
              <CardDescription>
                Approve quote line items (Parts, Labor, Equipment, Rental) before
                sending to customer. Quotes with paperwork complete.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {token && (
                <BranchDeptFilter
                  value={branchDeptFilter}
                  onChange={setBranchDeptFilter}
                  token={token}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : displayQuotes.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  No quotes pending workflow approval.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowDemo(true)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  View example
                </Button>
              </div>
            ) : (
              <>
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
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-24">Quote #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Comments</TableHead>
                        {displayTypes.map((t) => (
                          <TableHead key={t.id} className="text-center min-w-[100px]">
                            {t.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayQuotes.map((wo) => (
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
                          <TableCell>{wo.ShipName || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{wo.SerialNo || "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {wo.Comments || "—"}
                          </TableCell>
                          {displayTypes.map((t) => {
                            const wf = wo.quoteWorkflows?.[t.id];
                            const isApproved = wf?.approved === 1 || wf?.approved === true;
                            const key = `${wo.WONo}-${t.id}`;
                            const isUpdating = updating === key || updating === `approve-${wf?.id}`;

                            return (
                              <TableCell key={t.id} className="text-center">
                                {wf ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {isApproved ? (
                                      <CheckCircle2 className="h-5 w-5 text-primary" title={wf.approvedBy ? `By ${wf.approvedBy}` : "Approved"} />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground" title="Pending" />
                                    )}
                                    {!showDemo && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          isApproved
                                            ? handleApproveWithDate(wo, wf)
                                            : handleToggleApproved(wo, t.id, wf, true)
                                        }
                                        disabled={isUpdating}
                                      >
                                        {isUpdating ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : isApproved ? (
                                          "Record"
                                        ) : (
                                          "Approve"
                                        )}
                                      </Button>
                                    )}
                                    {wf.approvedBy && (
                                      <span className="text-xs text-muted-foreground">
                                        {wf.approvedBy}
                                      </span>
                                    )}
                                  </div>
                                ) : !showDemo ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleToggleApproved(wo, t.id, null, true)}
                                    disabled={updating === `${wo.WONo}-${t.id}`}
                                  >
                                    {updating === `${wo.WONo}-${t.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Approve"
                                    )}
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
