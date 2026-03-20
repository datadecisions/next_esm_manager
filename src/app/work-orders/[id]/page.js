"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Wrench,
  DollarSign,
  Truck,
  FileText,
  Cog,
  Tag,
  Calculator,
  Receipt,
  CreditCard,
  Tractor,
  History,
  Construction,
  MessageSquare,
  Quote,
  Lock,
  Copy,
  Sparkles,
  Undo2,
  Printer,
  Upload,
  ClipboardList,
  MapPin,
  Calendar,
  BarChart2,
  Settings,
  ChevronRight,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthToken } from "@/lib/auth";
import { getWO, getBillingOverview, getDisplayStatus, updateWOComments, updateWOCommentFields, processComment as processCommentApi, uploadWorkOrderImage } from "@/lib/api/work-order";
import LineItemsTab from "@/components/work-order/LineItemsTab";
import OrderTab from "@/components/work-order/OrderTab";
import DispatchTab from "@/components/work-order/DispatchTab";
import StatusDatesTab from "@/components/work-order/StatusDatesTab";
import PricesTab from "@/components/work-order/PricesTab";
import EquipmentTab from "@/components/work-order/EquipmentTab";
import ChartsTab from "@/components/work-order/ChartsTab";
import FinancialsTab from "@/components/work-order/FinancialsTab";
import WoHistoryDialog from "@/components/work-order/WoHistoryDialog";
import PartsPopupDialog from "@/components/work-order/PartsPopupDialog";
import LaborPopupDialog from "@/components/work-order/LaborPopupDialog";
import MiscPopupDialog from "@/components/work-order/MiscPopupDialog";
import EquipmentPopupDialog from "@/components/work-order/EquipmentPopupDialog";
import FixedPricePopupDialog from "@/components/work-order/FixedPricePopupDialog";
import WorkOrderDocumentsDialog from "@/components/work-order/WorkOrderDocumentsDialog";
import { WorkOrderActionsMenu } from "@/components/work-order/WorkOrderActionsMenu";
import { CloseWorkOrderFlow } from "@/components/work-order/CloseWorkOrderFlow";
import { getCustomerByNum } from "@/lib/api/customer";
import { getWorkOrderImagesMetadata, getCustomerImagesMetadata } from "@/lib/api/documents";
import { fadeInUp } from "@/lib/motion";
import { toast } from "sonner";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function hasExpenseInfo(wo) {
  if (!wo) return false;
  const v = (x) => {
    if (x == null || x === "") return false;
    const s = String(x).trim();
    return s !== "" && s !== "0";
  };
  return v(wo.ExpBranch) || v(wo.ExpDept) || v(wo.ExpCode);
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [wo, setWo] = useState(null);
  const [billing, setBilling] = useState(null);
  const [billToCustomer, setBillToCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalComments, setOriginalComments] = useState(null);
  const [processingComment, setProcessingComment] = useState(false);
  const [documentsDragOver, setDocumentsDragOver] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPartsPopup, setShowPartsPopup] = useState(false);
  const [showLaborPopup, setShowLaborPopup] = useState(false);
  const [showMiscPopup, setShowMiscPopup] = useState(false);
  const [showEquipmentPopup, setShowEquipmentPopup] = useState(false);
  const [showFixedPopup, setShowFixedPopup] = useState(false);
  const [showDocumentsPopup, setShowDocumentsPopup] = useState(false);
  const [docCount, setDocCount] = useState(null);
  const [commentsCopied, setCommentsCopied] = useState(false);
  const [savingEnhancedComment, setSavingEnhancedComment] = useState(false);
  const [savingComments, setSavingComments] = useState(false);
  const [savingToQuote, setSavingToQuote] = useState(false);
  const [savingPrivateComments, setSavingPrivateComments] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const token = typeof window !== "undefined" ? getAuthToken() : null;

  const handleDocumentsDrop = async (e) => {
    e.preventDefault();
    setDocumentsDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length || !token || !wo) return;
    setDocumentsUploading(true);
    try {
      const context = { ShipTo: wo.ShipTo, BillTo: wo.BillTo };
      for (const file of files) {
        await uploadWorkOrderImage(wo.WONo, file, context, token);
      }
      fetchDocCount();
      toast.success(files.length === 1 ? "Document uploaded" : `${files.length} documents uploaded`);
    } catch (err) {
      setError(err?.message || "Failed to upload");
      toast.error("Failed to upload documents");
    } finally {
      setDocumentsUploading(false);
    }
  };

  const handleDocumentsFileSelect = async (e) => {
    const files = Array.from(e.target?.files ?? []);
    e.target.value = "";
    if (!files.length || !token || !wo) return;
    setDocumentsUploading(true);
    try {
      const context = { ShipTo: wo.ShipTo, BillTo: wo.BillTo };
      for (const file of files) {
        await uploadWorkOrderImage(wo.WONo, file, context, token);
      }
      fetchDocCount();
      toast.success(files.length === 1 ? "Document uploaded" : `${files.length} documents uploaded`);
    } catch (err) {
      setError(err?.message || "Failed to upload");
      toast.error("Failed to upload documents");
    } finally {
      setDocumentsUploading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (text && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCommentsCopied(true);
        setTimeout(() => setCommentsCopied(false), 2000);
        toast.success("Copied to clipboard");
      }).catch(() => toast.error("Failed to copy"));
    }
  };

  const handleProcessComment = async () => {
    if (!wo?.Comments || !token || processingComment) return;
    setProcessingComment(true);
    setOriginalComments(wo.Comments);
    try {
      const processed = await processCommentApi(
        {
          comment: wo.Comments,
          model: wo.Model,
          make: wo.Make,
          serial: wo.SerialNo,
        },
        token
      );
      setWo((prev) => (prev ? { ...prev, Comments: processed } : null));
      toast.success("Comments enhanced");
    } catch {
      setOriginalComments(null);
      toast.error("Failed to enhance comments");
    } finally {
      setProcessingComment(false);
    }
  };

  const saveComments = async () => {
    if (!wo || !token) return;
    try {
      await updateWOComments({ WONo: wo.WONo, Comments: wo.Comments }, token);
      toast.success("Comments saved");
    } catch (err) {
      setError(err?.message || "Failed to save comments");
      toast.error("Failed to save comments");
    }
  };

  const handleSaveComments = async () => {
    setSavingComments(true);
    try {
      await saveComments();
    } finally {
      setSavingComments(false);
    }
  };

  const saveToQuote = async () => {
    if (!wo || !token) return;
    try {
      await updateWOCommentFields({ WONo: wo.WONo, MobileRecommended: wo.MobileRecommended ?? "" }, token);
      toast.success("To Quote saved");
    } catch (err) {
      setError(err?.message || "Failed to save To Quote");
      toast.error("Failed to save To Quote");
    }
  };

  const handleToQuoteBlur = () => void saveToQuote();

  const handleSaveToQuote = async () => {
    setSavingToQuote(true);
    try {
      await saveToQuote();
    } finally {
      setSavingToQuote(false);
    }
  };

  const savePrivateComments = async () => {
    if (!wo || !token) return;
    try {
      await updateWOCommentFields({ WONo: wo.WONo, PrivateComments: wo.PrivateComments ?? "" }, token);
      toast.success("Private comments saved");
    } catch (err) {
      setError(err?.message || "Failed to save private comments");
      toast.error("Failed to save private comments");
    }
  };

  const handlePrivateCommentsBlur = () => void savePrivateComments();

  const handleSavePrivateComments = async () => {
    setSavingPrivateComments(true);
    try {
      await savePrivateComments();
    } finally {
      setSavingPrivateComments(false);
    }
  };

  const handleSaveEnhancedComment = async () => {
    if (!wo || !token) return;
    setSavingEnhancedComment(true);
    try {
      await updateWOComments({ WONo: wo.WONo, Comments: wo.Comments }, token);
      setOriginalComments(null);
      toast.success("Comments saved");
    } catch (err) {
      setError(err?.message || "Failed to save comments");
      toast.error("Failed to save comments");
    } finally {
      setSavingEnhancedComment(false);
    }
  };

  const handleUndoComment = async () => {
    if (originalComments == null || !token) return;
    setWo((prev) => (prev ? { ...prev, Comments: originalComments } : null));
    setOriginalComments(null);
    try {
      await updateWOComments({ WONo: wo.WONo, Comments: originalComments }, token);
      toast.success("Changes reverted");
    } catch (err) {
      setError(err?.message || "Failed to restore comments");
      toast.error("Failed to restore comments");
    }
  };

  const fetchOrderDetails = useCallback(() => {
    if (!token || !id) return Promise.resolve();
    return getWO(id, token)
      .then((woData) => {
        setWo(woData);
        return Promise.all([
          getBillingOverview(id, token).catch(() => null),
          woData.BillTo ? getCustomerByNum(woData.BillTo, token).catch(() => null) : Promise.resolve(null),
        ]);
      })
      .then(([billingData, customer]) => {
        setBilling(billingData);
        setBillToCustomer(customer || null);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load work order");
      });
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) {
      if (!token) router.push("/sign-in");
      return;
    }
    setLoading(true);
    setError(null);
    fetchOrderDetails().finally(() => setLoading(false));
  }, [token, id, router, fetchOrderDetails]);

  const fetchDocCount = useCallback(async () => {
    if (!wo?.WONo || !token) return;
    try {
      const [woDocs, custDocs] = await Promise.all([
        getWorkOrderImagesMetadata(wo.WONo, token),
        getCustomerImagesMetadata(wo.ShipTo || wo.BillTo, token),
      ]);
      setDocCount((woDocs?.length ?? 0) + (custDocs?.length ?? 0));
    } catch {
      setDocCount(0);
    }
  }, [wo?.WONo, wo?.ShipTo, wo?.BillTo, token]);

  useEffect(() => {
    if (wo?.WONo && token) fetchDocCount();
  }, [wo?.WONo, token, fetchDocCount]);


  const dispositionText = wo ? getDisplayStatus(wo) : "";
  const calc = billing?.calculations ?? {};
  const sales = calc.sales ?? {};
  const lineItems = billing?.lineItems ?? billing?.printableLineItems ?? [];
  const fixedLineItems = lineItems.filter(
    (i) => (i.EntryType || "").toString().toUpperCase() === "F"
  );
  const fixedDisplayValue = fixedLineItems.length > 0 ? "Flat Rate" : "None";
  const statusColor =
    dispositionText === "Open" || dispositionText === "Accepted" || dispositionText === "Quote"
      ? "bg-primary/10 border-primary/30 text-primary"
      : dispositionText === "Closed"
        ? "bg-muted border-border text-muted-foreground"
        : dispositionText === "Rejected"
          ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:text-red-300"
          : dispositionText === "Voided"
            ? "bg-muted border-border text-muted-foreground"
            : "bg-muted border-border text-muted-foreground";

  if (loading) {
    return (
      <div className="min-h-full bg-linear-to-b from-background via-accent/10 to-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.push("/work-orders")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Work Order #{id}
            </h1>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-12 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !wo) {
    return (
      <div className="min-h-full bg-linear-to-b from-background via-accent/10 to-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.push("/work-orders")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/50">
            <p className="text-sm sm:text-base text-red-700 dark:text-red-300">{error || "Work order not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const openDate = wo.OpenDate ? new Date(wo.OpenDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const closedDate = wo.ClosedDate ? new Date(wo.ClosedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <motion.div
      className="min-h-full bg-linear-to-b from-background via-accent/10 to-background text-foreground"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={fadeInUp.transition}
    >
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/work-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                Work Order #{wo.WONo}
              </h1>
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs sm:text-sm font-medium align-baseline ${statusColor}`}
              >
                {dispositionText || "N/A"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-sm sm:text-base text-muted-foreground">
              {wo.PONo && <span>PO: {wo.PONo}</span>}
              {wo.AuthorizedBy && <span>Auth: {wo.AuthorizedBy}</span>}
              {(dispositionText === "Closed" || dispositionText === "Voided") && (closedDate || wo.ClosedBy) ? (
                <span>{[closedDate, wo.ClosedBy && `By ${wo.ClosedBy}`].filter(Boolean).join(" · ")}</span>
              ) : (openDate || wo.OpenBy) ? (
                <span>{[openDate, wo.OpenBy && `By ${wo.OpenBy}`].filter(Boolean).join(" · ")}</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CloseWorkOrderFlow wo={wo} billing={billing} token={token} onRefresh={fetchOrderDetails} />
            <WorkOrderActionsMenu wo={wo} token={token} onRefresh={fetchOrderDetails} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* Left column: Addresses + Equipment + Quick totals + Documents */}
          <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
            {/* Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Shipping
                </h3>
                <p className="text-sm sm:text-base font-medium text-foreground">
                  Branch {wo.SaleBranch} · Dept {wo.SaleDept} · Code {wo.SaleCode}
                </p>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  {wo.ShipName || wo.ShipTo}
                </p>
                {wo.ShipAddress && (
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {[wo.ShipAddress, wo.ShipCity, wo.ShipState, wo.ShipZipCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Billing
                </h3>
                {(hasExpenseInfo(wo) || billToCustomer) ? (
                  <>
                    {hasExpenseInfo(wo) && (
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        Branch {wo.ExpBranch ?? "—"} · Dept {wo.ExpDept ?? "—"} · Code {wo.ExpCode ?? "—"}
                      </p>
                    )}
                    {billToCustomer && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-sm sm:text-base font-medium text-foreground">
                          {billToCustomer.Name ?? billToCustomer.name ?? ""} #{billToCustomer.Number ?? billToCustomer.number ?? wo.BillTo}
                        </p>
                        {((billToCustomer.Address ?? billToCustomer.address) || (billToCustomer.POBox ?? billToCustomer.poBox)) && (
                          <p className="text-sm sm:text-base text-muted-foreground">
                            {[billToCustomer.Address ?? billToCustomer.address, billToCustomer.POBox ?? billToCustomer.poBox].filter(Boolean).join(" ")}
                          </p>
                        )}
                        {(billToCustomer.City ?? billToCustomer.city) && (
                          <p className="text-sm sm:text-base text-muted-foreground">
                            {[billToCustomer.City ?? billToCustomer.city, billToCustomer.State ?? billToCustomer.state, billToCustomer.ZipCode ?? billToCustomer.zipCode].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm sm:text-base text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* Equipment */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2 mb-4">
                <Tractor className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Equipment
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Serial No.</p>
                  <p className="text-sm sm:text-base font-medium text-foreground mt-0.5">
                    {wo.SerialNo || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Unit</p>
                  <p className="text-sm sm:text-base font-medium text-foreground mt-0.5">
                    {wo.UnitNo || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Model Group</p>
                  <p className="text-sm sm:text-base font-medium text-foreground mt-0.5">
                    {wo.ModelGroup || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Make</p>
                  <p className="text-sm sm:text-base font-medium text-foreground mt-0.5">
                    {wo.Make || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Model</p>
                  <p className="text-sm sm:text-base font-medium text-foreground mt-0.5">
                    {wo.Model || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Hour Meter (Key)</p>
                  <p className="text-sm sm:text-base font-medium text-foreground mt-0.5">
                    {wo.HourMeter ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setActiveTab("equipment")}
                >
                  <Construction className="h-4 w-4 mr-2" />
                  Build
                </Button>
              </div>
            </div>

            {/* Quick totals - row under equipment */}
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-foreground">
                  Quick totals
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click Parts, Labor, Misc, Equipment, or Fixed Price to view details
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowPartsPopup(true)}
                  onKeyDown={(e) => e.key === "Enter" && setShowPartsPopup(true)}
                  className="cursor-pointer transition-colors rounded-lg border-2 border-transparent hover:border-primary/40 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <SummaryCard
                    icon={Package}
                    label="Parts"
                    value={formatCurrency(sales.parts)}
                    compact
                    interactive
                  />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowLaborPopup(true)}
                  onKeyDown={(e) => e.key === "Enter" && setShowLaborPopup(true)}
                  className="cursor-pointer transition-colors rounded-lg border-2 border-transparent hover:border-primary/40 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <SummaryCard
                    icon={Wrench}
                    label="Labor"
                    value={formatCurrency(sales.labor)}
                    sub={sales.laborHours ? `${sales.laborHours} hrs` : null}
                    compact
                    interactive
                  />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowMiscPopup(true)}
                  onKeyDown={(e) => e.key === "Enter" && setShowMiscPopup(true)}
                  className="cursor-pointer transition-colors rounded-lg border-2 border-transparent hover:border-primary/40 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <SummaryCard icon={Cog} label="Misc" value={formatCurrency(sales.misc)} compact interactive />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowEquipmentPopup(true)}
                  onKeyDown={(e) => e.key === "Enter" && setShowEquipmentPopup(true)}
                  className="cursor-pointer transition-colors rounded-lg border-2 border-transparent hover:border-primary/40 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <SummaryCard icon={Tractor} label="Equipment" value={formatCurrency(sales.equipment)} compact interactive />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowFixedPopup(true)}
                  onKeyDown={(e) => e.key === "Enter" && setShowFixedPopup(true)}
                  className="cursor-pointer transition-colors rounded-lg border-2 border-transparent hover:border-primary/40 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <SummaryCard icon={Quote} label="Fixed Price" value={fixedDisplayValue} compact interactive />
                </div>
                <SummaryCard icon={DollarSign} label="Rental" value={formatCurrency(sales.rental)} compact muted />
                <SummaryCard icon={Calculator} label="Subtotal" value={formatCurrency(calc.subTotal)} compact muted />
                <SummaryCard icon={Receipt} label="Tax" value={formatCurrency(calc.tax)} compact muted />
                {calc.paymentTotal != null && Number(calc.paymentTotal) !== 0 && (
                  <SummaryCard
                    icon={CreditCard}
                    label="Payments"
                    value={formatCurrency(calc.paymentTotal)}
                    highlight
                    compact
                    muted
                  />
                )}
                <SummaryCard
                  icon={Tag}
                  label="Balance"
                  value={formatCurrency(calc.balance)}
                  highlight
                  compact
                  muted
                />
              </div>
            </div>

            {/* Documents card */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Documents
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/90 hover:bg-accent/50"
                  onClick={() => setShowDocumentsPopup(true)}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  View Documents ({docCount != null ? docCount : "…"})
                </Button>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDocumentsDragOver(true); }}
                onDragLeave={() => setDocumentsDragOver(false)}
                onDrop={handleDocumentsDrop}
                className={`relative rounded-xl border-2 border-dashed transition-colors ${
                  documentsDragOver
                    ? "border-primary/50 bg-accent/40"
                    : "border-border hover:border-border/80"
                } ${documentsUploading ? "pointer-events-none opacity-70" : ""}`}
              >
                <label className="block cursor-pointer p-6 sm:p-8 text-center">
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleDocumentsFileSelect}
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {documentsUploading ? "Uploading…" : "Drag files here or click to upload"}
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Right column: Comments - fixed max height so card does not grow; content scrolls */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm flex-1 min-h-0 max-h-[min(80vh,950px)] flex flex-col overflow-y-auto">
                {/* General Comments */}
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          General Comments
                        </h3>
                        {originalComments != null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-violet-500/20 to-fuchsia-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30 dark:ring-violet-400/30">
                            <Sparkles className="h-3 w-3" />
                            AI Enhanced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          onClick={originalComments != null ? handleSaveEnhancedComment : handleSaveComments}
                          disabled={originalComments != null ? savingEnhancedComment : savingComments}
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shrink-0"
                        >
                          {(originalComments != null ? savingEnhancedComment : savingComments) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-accent/40"
                          onClick={() => copyToClipboard(wo.Comments)}
                          title={commentsCopied ? "Copied!" : "Copy to clipboard"}
                        >
                          {commentsCopied ? (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={wo.Comments ?? ""}
                      onChange={(e) => setWo((prev) => (prev ? { ...prev, Comments: e.target.value } : null))}
                      className={`text-sm sm:text-base resize-none whitespace-pre-wrap overflow-y-auto flex-1 min-h-[120px] border-input ${originalComments != null ? "border-violet-200/60 bg-violet-50/30 dark:border-violet-500/20 dark:bg-violet-950/20" : ""}`}
                    />
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2 min-w-0">
                      <Button
                        onClick={handleProcessComment}
                        disabled={processingComment || !!originalComments}
                        title="Transform rough notes into professional, formatted service descriptions using AI"
                        className="h-8 gap-1.5 rounded-lg bg-linear-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50 disabled:hover:shadow-md shrink-0"
                      >
                        <Sparkles className={`h-3.5 w-3.5 shrink-0 ${processingComment ? "animate-spin" : ""}`} />
                        {processingComment ? "Enhancing…" : "AI Enhance"}
                      </Button>
                      {originalComments != null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground hover:text-primary hover:bg-accent/40 shrink-0"
                          onClick={handleUndoComment}
                          disabled={savingEnhancedComment}
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1" />
                          Undo
                        </Button>
                      )}
                    </div>
                </div>

                {/* To Quote */}
                <div className="flex flex-col min-h-0 flex-1 mt-6">
                    <div className="mb-3">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                        <Quote className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        To Quote
                      </h3>
                    </div>
                    <Textarea
                      value={wo.MobileRecommended ?? ""}
                      onChange={(e) => setWo((prev) => (prev ? { ...prev, MobileRecommended: e.target.value } : null))}
                      onBlur={handleToQuoteBlur}
                      className="text-sm sm:text-base resize-none whitespace-pre-wrap overflow-y-auto flex-1 min-h-[120px] border-input"
                    />
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={handleSaveToQuote}
                        disabled={savingToQuote}
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shrink-0"
                      >
                        {savingToQuote ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                {/* Private Comments */}
                <div className="flex flex-col min-h-0 flex-1 mt-6">
                    <div className="mb-3">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        Private Comments
                      </h3>
                    </div>
                    <Textarea
                      value={wo.PrivateComments ?? ""}
                      onChange={(e) => setWo((prev) => (prev ? { ...prev, PrivateComments: e.target.value } : null))}
                      onBlur={handlePrivateCommentsBlur}
                      className="text-sm sm:text-base resize-none whitespace-pre-wrap overflow-y-auto flex-1 min-h-[120px] border-input"
                    />
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={handleSavePrivateComments}
                        disabled={savingPrivateComments}
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shrink-0"
                      >
                        {savingPrivateComments ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
            </div>
          </div>
        </div>

        {/* Tabbed section: Line Items, Order, Dispatch, etc. */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-lg">
            <TabsTrigger value="details" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Line Items
            </TabsTrigger>
            <TabsTrigger value="order" className="gap-1.5">
              <Package className="h-4 w-4" />
              Order
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="gap-1.5">
              <MapPin className="h-4 w-4" />
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="dates" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Status / Dates
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-1.5">
              <Tag className="h-4 w-4" />
              Prices
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-1.5">
              <Tractor className="h-4 w-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-1.5">
              <BarChart2 className="h-4 w-4" />
              Charts
            </TabsTrigger>
            {/* Time Map — not ready to port yet
            <TabsTrigger value="timemap" className="gap-1.5">
              <MapPin className="h-4 w-4" />
              Time Map
            </TabsTrigger>
            */}
            <TabsTrigger value="financials" className="gap-1.5">
              <Calculator className="h-4 w-4" />
              Financials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <LineItemsTab
              wo={wo}
              billing={billing}
              token={token}
              onRefresh={() => getBillingOverview(id, token).then(setBilling).catch(() => {})}
            />
          </TabsContent>
          <TabsContent value="order" className="mt-4">
            <OrderTab
              wo={wo}
              billing={billing}
              billToCustomer={billToCustomer}
              token={token}
              onOrderUpdate={(fields) => setWo((p) => (p ? { ...p, ...fields } : null))}
            />
          </TabsContent>
          <TabsContent value="dispatch" className="mt-4">
            <DispatchTab
              wo={wo}
              token={token}
              onDispatchUpdate={(fields) => setWo((p) => (p ? { ...p, ...fields } : null))}
            />
          </TabsContent>
          <TabsContent value="dates" className="mt-4">
            <StatusDatesTab
              wo={wo}
              token={token}
              onStatusUpdate={(fields) => setWo((p) => (p ? { ...p, ...fields } : null))}
            />
          </TabsContent>
          <TabsContent value="prices" className="mt-4">
            <PricesTab
              wo={wo}
              token={token}
              onPricesUpdate={(fields) => setWo((p) => (p ? { ...p, ...fields } : null))}
            />
          </TabsContent>
          <TabsContent value="equipment" className="mt-4">
            <EquipmentTab
              wo={wo}
              token={token}
              onEquipmentUpdate={(fields) => setWo((p) => (p ? { ...p, ...fields } : null))}
              onHistoryClick={() => setShowHistory(true)}
            />
          </TabsContent>
          <TabsContent value="charts" className="mt-4">
            <ChartsTab wo={wo} token={token} />
          </TabsContent>
          {/* Time Map — not ready to port yet
          <TabsContent value="timemap" className="mt-4">
            <TimeMapTab wo={wo} />
          </TabsContent>
          */}
          <TabsContent value="financials" className="mt-4">
            <FinancialsTab wo={wo} token={token} />
          </TabsContent>
        </Tabs>
      </div>

      <WoHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        wo={wo}
        token={token}
      />
      <PartsPopupDialog
        open={showPartsPopup}
        onOpenChange={setShowPartsPopup}
        wo={wo}
        billing={billing}
        token={token}
        onPartsUpdate={() => getBillingOverview(id, token).then(setBilling).catch(() => {})}
      />
      <LaborPopupDialog
        open={showLaborPopup}
        onOpenChange={setShowLaborPopup}
        wo={wo}
        billing={billing}
        token={token}
        onLaborUpdate={() => getBillingOverview(id, token).then(setBilling).catch(() => {})}
      />
      <MiscPopupDialog
        open={showMiscPopup}
        onOpenChange={setShowMiscPopup}
        wo={wo}
        billing={billing}
        token={token}
        onMiscUpdate={() => getBillingOverview(id, token).then(setBilling).catch(() => {})}
      />
      <EquipmentPopupDialog
        open={showEquipmentPopup}
        onOpenChange={setShowEquipmentPopup}
        wo={wo}
        billing={billing}
        token={token}
        onEquipmentUpdate={() => getBillingOverview(id, token).then(setBilling).catch(() => {})}
      />
      <FixedPricePopupDialog
        open={showFixedPopup}
        onOpenChange={setShowFixedPopup}
        wo={wo}
        billing={billing}
        token={token}
        onFixedUpdate={() => getBillingOverview(id, token).then(setBilling).catch(() => {})}
      />
      <WorkOrderDocumentsDialog
        open={showDocumentsPopup}
        onOpenChange={setShowDocumentsPopup}
        wo={wo}
        token={token}
        onDocumentsUpdate={fetchDocCount}
      />
    </motion.div>
  );
}

{/* Time Map — not ready to port yet
function TimeMapTab({ wo }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-4">Time Map</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Time-based map — coming soon.</p>
    </div>
  );
}
*/}

function SummaryCard({ icon: Icon, label, value, sub, highlight, compact, muted, interactive }) {
  return (
    <div
      className={`rounded-lg border shadow-sm flex flex-col justify-center ${
        compact
          ? "px-2.5 py-1.5 min-w-[100px] shrink-0"
          : "px-3 py-2 sm:px-4 sm:py-3 w-full min-w-0"
      } ${
        highlight
          ? muted
            ? "border-primary/35 bg-primary/8"
            : "border-primary/40 bg-primary/10"
          : muted
            ? "border-border/70 bg-muted/60"
            : "border-border/80 bg-card"
      }`}
    >
      <div className={`font-medium text-muted-foreground flex items-center gap-1.5 ${compact ? "text-xs" : "text-xs sm:text-sm"}`}>
        <Icon className={`shrink-0 ${compact ? "h-3 w-3" : "h-3 w-3 sm:h-4 sm:w-4"}`} />
        <span>{label}</span>
        {sub && <span className="text-muted-foreground/80">· {sub}</span>}
        {interactive && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </div>
      <p
        className={`font-semibold tabular-nums mt-0.5 ${
          compact ? "text-sm" : "text-sm sm:text-base"
        } ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
