"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, FileText, Send, Loader2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { closeWorkOrder, emailInvoice, regenerateBackup, getInvoicePdfUrl, isVoided } from "@/lib/api/work-order";
import { getCustomerContacts } from "@/lib/api/customer";

/** Disposition: 1=Open, 2=Closed, 11=Quote, 12=Accepted */
export function CloseWorkOrderFlow({ wo, billing, token, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [emailing, setEmailing] = useState(false);
  const pdfIframeRef = useRef(null);

  const disposition = wo?.Disposition ?? 1;
  const voided = isVoided(wo);
  const isQuote = disposition === 11;
  const isClosed = disposition === 2;
  const isOpenOrAccepted = disposition === 1 || disposition === 12;

  const buttonText = isClosed
    ? "Re-Generate Invoice"
    : isQuote
      ? "Distribute Quote"
      : `Generate ${isQuote ? "Quote" : "Invoice"} & Close`;

  const loadPdf = useCallback(async () => {
    if (!wo?.WONo || !token) return null;
    setGenerating(true);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const url = await getInvoicePdfUrl(wo.WONo, token);
      setPdfUrl(url);
      return url;
    } catch (err) {
      toast.error(err?.message || "Failed to generate PDF");
      return null;
    } finally {
      setGenerating(false);
    }
  }, [wo?.WONo, token]);

  useEffect(() => {
    if (open && wo?.ShipTo && wo?.BillTo && token && isQuote) {
      getCustomerContacts(wo.ShipTo, wo.BillTo, token).then(setContacts);
    }
  }, [open, wo?.ShipTo, wo?.BillTo, token, isQuote]);

  useEffect(() => {
    if (open && (isOpenOrAccepted || isQuote || isClosed)) {
      loadPdf();
    }
    return () => {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [open, isOpenOrAccepted, isQuote, isClosed, loadPdf]);

  const handleOpen = () => {
    setSelectedContact(null);
    setPdfUrl(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setClosing(false);
    setEmailing(false);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    if (pdfIframeRef.current?.contentWindow) {
      pdfIframeRef.current.contentWindow.print();
    } else {
      const w = window.open(pdfUrl, "_blank", "noopener");
      if (w) w.onload = () => w.print();
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `invoice-${wo?.WONo ?? "wo"}.pdf`;
    a.click();
  };

  const handleRegenerateInvoice = async () => {
    if (!wo || !token) return;
    setClosing(true);
    try {
      await regenerateBackup(
        { WONo: wo.WONo, SaleBranch: wo.SaleBranch, SaleDept: wo.SaleDept },
        token
      );
      toast.success(`Paperwork for order #${wo.WONo} has been created.`);
      handleClose();
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to regenerate invoice");
    } finally {
      setClosing(false);
    }
  };

  const handleCloseInvoice = async () => {
    if (!wo || !token) return;
    setClosing(true);
    try {
      await closeWorkOrder(
        { WONo: wo.WONo, Branch: wo.SaleBranch ?? wo.SaleDept ?? "" },
        token
      );
      toast.success("Work order closed successfully");
      handleClose();
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to close work order");
    } finally {
      setClosing(false);
    }
  };

  const handleEmailQuote = async () => {
    const email = selectedContact?.EMail ?? selectedContact?.Email;
    if (!email) {
      toast.error("Please select a contact");
      return;
    }
    if (!wo || !token) return;
    setEmailing(true);
    try {
      await emailInvoice(
        {
          emailBody: `Please find the quote for order #${wo.WONo}`,
          invoices: [wo.WONo],
          emails: [email],
        },
        token
      );
      toast.success("Quote sent successfully");
      handleClose();
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to send quote");
    } finally {
      setEmailing(false);
    }
  };

  const showPdf = isOpenOrAccepted || isQuote || isClosed;

  if (voided) return null;

  return (
    <>
      <Button
        onClick={handleOpen}
        className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
      >
        <CheckCircle2 className="h-4 w-4" />
        {buttonText}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !closing && !emailing && setOpen(v)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isQuote ? "Distribute Quote" : isClosed ? "Re-Generate Invoice" : "Close Work Order"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {generating ? (
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <p>Generating PDF…</p>
                </div>
              </div>
            ) : pdfUrl && showPdf ? (
              <>
                <div className="flex-1 min-h-[50vh] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <iframe
                    ref={pdfIframeRef}
                    src={pdfUrl}
                    title="Invoice PDF"
                    className="w-full h-full min-h-[50vh]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </>
            ) : null}

            {isOpenOrAccepted && (
              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={handleClose} disabled={closing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseInvoice}
                  disabled={closing || generating}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  {closing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Closing…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Close this invoice
                    </>
                  )}
                </Button>
              </DialogFooter>
            )}

            {isQuote && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email to</label>
                  <Select
                    value={
                      selectedContact
                        ? String(selectedContact.EMail ?? selectedContact.Email ?? selectedContact.ID ?? selectedContact.Contact)
                        : ""
                    }
                    onValueChange={(v) => {
                      const c = contacts.find(
                        (x) =>
                          String(x.EMail ?? x.Email ?? x.ID ?? x.Contact) === v
                      );
                      setSelectedContact(c ?? null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c, i) => (
                        <SelectItem
                          key={c.ID ?? c.EMail ?? c.Email ?? i}
                          value={String(c.EMail ?? c.Email ?? c.ID ?? c.Contact)}
                        >
                          {c.Contact ?? c.Name} ({c.EMail ?? c.Email ?? "—"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={handleClose} disabled={emailing}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailQuote}
                    disabled={!selectedContact || emailing}
                    className="bg-cyan-600 hover:bg-cyan-500"
                  >
                    {emailing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Email this quote
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}

            {isClosed && (
              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={handleClose} disabled={closing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateInvoice}
                  disabled={closing}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  {closing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Re-generate paperwork
                    </>
                  )}
                </Button>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
