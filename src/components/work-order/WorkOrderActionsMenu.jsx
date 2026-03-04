"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search,
  Plus,
  RotateCw,
  Copy,
  FileText,
  DollarSign,
  Trash2,
  CreditCard,
  Download,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  processToOrder,
  duplicateOrder,
  duplicateToQuote,
  regenerateBackup,
  creditOrder,
  voidInvoice,
  sendToPaya,
  exportToCrown,
  isVoided,
} from "@/lib/api/work-order";

/** Disposition: 1=Open, 2=Closed, 11=Quote, 12=Accepted, 13=Rejected */
function shouldShow(disposition, excludeList) {
  if (!excludeList || excludeList.length === 0) return true;
  return !excludeList.includes(disposition);
}

export function WorkOrderActionsMenu({ wo, token, onRefresh }) {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [confirmDuplicateToQuote, setConfirmDuplicateToQuote] = useState(false);
  const [confirmRegenerateBackup, setConfirmRegenerateBackup] = useState(false);
  const [confirmProcessToOrder, setConfirmProcessToOrder] = useState(false);
  const disposition = wo?.Disposition ?? 1;
  const voided = isVoided(wo);

  const runAction = async (key, fn, payload, successMsg, thenNavigate) => {
    if (!token || !wo) return;
    setLoading(key);
    try {
      const result = await fn(payload, token);
      const msg = typeof successMsg === "function" ? successMsg(result) : successMsg;
      toast.success(msg);
      onRefresh?.();
      if (thenNavigate && result?.WONo) {
        router.push(`/work-orders/${result.WONo}`);
      }
    } catch (err) {
      toast.error(err?.message || "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const handleProcessToOrder = () => {
    setConfirmProcessToOrder(true);
  };

  const confirmProcessToOrderAction = () => {
    setConfirmProcessToOrder(false);
    runAction(
      "processToOrder",
      processToOrder,
      { WONo: wo.WONo, SaleBranch: wo.SaleBranch, SaleDept: wo.SaleDept },
      `Order #${wo.WONo} has been created.`,
      true
    );
  };

  const handleDuplicateOrder = () => {
    setConfirmDuplicate(true);
  };

  const confirmDuplicateOrder = () => {
    setConfirmDuplicate(false);
    runAction(
      "duplicateOrder",
      duplicateOrder,
      { WONo: wo.WONo, SaleBranch: wo.SaleBranch, SaleDept: wo.SaleDept },
      (r) => `Order #${r?.WONo ?? wo.WONo} has been created.`,
      true
    );
  };

  const handleDuplicateToQuote = () => {
    setConfirmDuplicateToQuote(true);
  };

  const confirmDuplicateToQuoteAction = () => {
    setConfirmDuplicateToQuote(false);
    runAction(
      "duplicateToQuote",
      duplicateToQuote,
      { WONo: wo.WONo, SaleBranch: wo.SaleBranch, SaleDept: wo.SaleDept },
      (r) => `Quote #${r?.WONo ?? wo.WONo} has been created.`,
      true
    );
  };

  const handleRegenerateBackup = () => {
    setConfirmRegenerateBackup(true);
  };

  const confirmRegenerateBackupAction = () => {
    setConfirmRegenerateBackup(false);
    runAction(
      "regenerateBackup",
      regenerateBackup,
      { WONo: wo.WONo, SaleBranch: wo.SaleBranch, SaleDept: wo.SaleDept },
      `Paperwork for order #${wo.WONo} has been created.`
    );
  };

  const handleCreditOrder = () => {
    if (!confirm("Are you sure you want to convert this invoice to a credit?")) return;
    runAction(
      "creditOrder",
      creditOrder,
      { WONo: wo.WONo, SaleBranch: wo.SaleBranch, SaleDept: wo.SaleDept },
      "Credit order created.",
      true
    );
  };

  const handleVoid = () => {
    if (!confirm("Are you sure you want to void this invoice?")) return;
    runAction("void", voidInvoice, { WONo: wo.WONo }, "Invoice voided.", false);
  };

  const handleSendToPaya = async () => {
    setLoading("paya");
    try {
      await sendToPaya({ WONo: wo.WONo }, token);
      toast.success("Sent to Paya");
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to send to Paya");
    } finally {
      setLoading(null);
    }
  };

  const handleExportCrown = async () => {
    setLoading("crown");
    try {
      const blob = await exportToCrown({ ids: [wo.WONo] }, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crown.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Crown export downloaded");
    } catch (err) {
      toast.error(err?.message || "Failed to export to Crown");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (key) => loading === key;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" className="shrink-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => router.push("/work-orders")}>
          <Search className="h-4 w-4" />
          Search Orders
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/work-orders/create")}>
          <Plus className="h-4 w-4" />
          Create New Order
        </DropdownMenuItem>

        {shouldShow(disposition, [1, 2, 12]) && (
          <DropdownMenuItem onClick={handleProcessToOrder} disabled={isLoading("processToOrder")}>
            {isLoading("processToOrder") ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Process to Order
          </DropdownMenuItem>
        )}

        {shouldShow(disposition, [2]) && !voided && (
          <DropdownMenuItem onClick={handleDuplicateOrder} disabled={isLoading("duplicateOrder")}>
            {isLoading("duplicateOrder") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Duplicate Order
          </DropdownMenuItem>
        )}

        {shouldShow(disposition, [11]) && (
          <DropdownMenuItem onClick={handleDuplicateToQuote} disabled={isLoading("duplicateToQuote")}>
            {isLoading("duplicateToQuote") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Duplicate Order to Quote
          </DropdownMenuItem>
        )}

        {shouldShow(disposition, [11, 12]) && (
          <DropdownMenuItem onClick={handleRegenerateBackup} disabled={isLoading("regenerateBackup")}>
            {isLoading("regenerateBackup") ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Force Backup Paperwork
          </DropdownMenuItem>
        )}

        {shouldShow(disposition, [1, 11, 12]) && (
          <DropdownMenuItem onClick={handleCreditOrder} disabled={isLoading("creditOrder")}>
            {isLoading("creditOrder") ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Credit Order
          </DropdownMenuItem>
        )}

        {shouldShow(disposition, [2, 12]) && !voided && (
          <DropdownMenuItem onClick={handleVoid} disabled={isLoading("void")} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
            {isLoading("void") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Void this Invoice
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSendToPaya} disabled={isLoading("paya")}>
          {isLoading("paya") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Send to Paya
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportCrown} disabled={isLoading("crown")}>
          {isLoading("crown") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export to Crown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={confirmProcessToOrder} onOpenChange={setConfirmProcessToOrder}>
      <DialogContent className="sm:max-w-sm" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Process to Order</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to process this quote to an order?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmProcessToOrder(false)}>
            Cancel
          </Button>
          <Button onClick={confirmProcessToOrderAction} disabled={isLoading("processToOrder")} className="bg-cyan-600 hover:bg-cyan-500">
            {isLoading("processToOrder") ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmDuplicate} onOpenChange={setConfirmDuplicate}>
      <DialogContent className="sm:max-w-sm" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Duplicate Order</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to duplicate this invoice?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDuplicate(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDuplicateOrder} disabled={isLoading("duplicateOrder")} className="bg-cyan-600 hover:bg-cyan-500">
            {isLoading("duplicateOrder") ? <Loader2 className="h-4 w-4 animate-spin" /> : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmDuplicateToQuote} onOpenChange={setConfirmDuplicateToQuote}>
      <DialogContent className="sm:max-w-sm" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Duplicate Order to Quote</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to duplicate this closed invoice to a quote?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDuplicateToQuote(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDuplicateToQuoteAction} disabled={isLoading("duplicateToQuote")} className="bg-cyan-600 hover:bg-cyan-500">
            {isLoading("duplicateToQuote") ? <Loader2 className="h-4 w-4 animate-spin" /> : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmRegenerateBackup} onOpenChange={setConfirmRegenerateBackup}>
      <DialogContent className="sm:max-w-sm" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Force Backup Paperwork</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to generate backup paperwork for this order?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmRegenerateBackup(false)}>
            Cancel
          </Button>
          <Button onClick={confirmRegenerateBackupAction} disabled={isLoading("regenerateBackup")} className="bg-cyan-600 hover:bg-cyan-500">
            {isLoading("regenerateBackup") ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
