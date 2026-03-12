"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import DocumentViewerDialog from "@/components/DocumentViewerDialog";
import {
  getWorkOrderImagesMetadata,
  getCustomerImagesMetadata,
  emailWorkOrderDocuments,
} from "@/lib/api/documents";
import {
  getCustomerContacts,
  getCustomerContactsByNumber,
} from "@/lib/api/customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, Plus, X } from "lucide-react";

/**
 * Work order documents dialog – fetches WO + customer docs and wraps DocumentViewerDialog.
 */
export default function WorkOrderDocumentsDialog({
  open,
  onOpenChange,
  wo,
  token,
  onDocumentsUpdate,
}) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForEmail, setSelectedForEmail] = useState(new Set());
  const [sendToEmails, setSendToEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [contacts, setContacts] = useState([]);
  const [sending, setSending] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!wo?.WONo || !token || !open) return;
    setLoading(true);
    try {
      const [woDocs, custDocs] = await Promise.all([
        getWorkOrderImagesMetadata(wo.WONo, token),
        getCustomerImagesMetadata(wo.ShipTo || wo.BillTo, token),
      ]);
      setSections([
        {
          title: "Work Order Documents",
          docs: woDocs,
          basePath: "/api/v1/work_order/image",
          canDelete: true,
        },
        {
          title: "Customer Documents",
          docs: custDocs,
          basePath: "/api/v1/customer/image",
          canDelete: false,
        },
      ]);
    } catch (err) {
      setSections([]);
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [wo?.WONo, wo?.ShipTo, wo?.BillTo, token, open]);

  useEffect(() => {
    if (open && wo?.WONo && token) {
      fetchDocs();
    }
  }, [open, wo?.WONo, token, fetchDocs]);

  useEffect(() => {
    if (!open || !wo || !token) return;
    const loadContacts = async () => {
      try {
        const shipTo = wo.ShipTo || wo.BillTo;
        const billTo = wo.BillTo;
        const [byShipBill, byNumber] = await Promise.all([
          shipTo && billTo
            ? getCustomerContacts(shipTo, billTo, token)
            : Promise.resolve([]),
          wo.BillTo
            ? getCustomerContactsByNumber(wo.BillTo, billTo, token)
            : Promise.resolve([]),
        ]);
        const combined = [...byShipBill];
        const seen = new Set(byShipBill.map((c) => (c.EMail || "").toLowerCase()));
        for (const c of byNumber) {
          const em = (c.EMail || "").toLowerCase();
          if (em && !seen.has(em)) {
            seen.add(em);
            combined.push(c);
          }
        }
        setContacts(combined);
      } catch {
        setContacts([]);
      }
    };
    loadContacts();
  }, [open, wo?.ShipTo, wo?.BillTo, wo?.WONo, wo, token]);

  const handleRefresh = useCallback(async () => {
    await fetchDocs();
    onDocumentsUpdate?.();
  }, [fetchDocs, onDocumentsUpdate]);

  const toggleDocForEmail = useCallback((doc, basePath) => {
    if (!basePath?.includes("work_order")) return;
    const key = `${basePath}:${doc.ID}`;
    setSelectedForEmail((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isDocSelectedForEmail = useCallback(
    (doc, basePath) => selectedForEmail.has(`${basePath}:${doc.ID}`),
    [selectedForEmail]
  );

  const addEmail = () => {
    const em = (emailInput || "").trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    setSendToEmails((prev) => {
      if (prev.some((e) => (e.EMail || "").toLowerCase() === em)) return prev;
      return [...prev, { EMail: em, Contact: em }];
    });
    setEmailInput("");
  };

  const removeEmail = (em) => {
    setSendToEmails((prev) => prev.filter((e) => (e.EMail || "").toLowerCase() !== em));
  };

  const addContact = (contact) => {
    const em = (contact.EMail || "").trim().toLowerCase();
    if (!em) return;
    setSendToEmails((prev) => {
      if (prev.some((e) => (e.EMail || "").toLowerCase() === em)) return prev;
      return [...prev, { EMail: em, Contact: contact.Contact || em }];
    });
  };

  const handleEmailDocs = async () => {
    if (!wo?.WONo || !token) return;
    const emails = sendToEmails.map((e) => e.EMail).filter(Boolean);
    if (!emails.length) {
      toast.error("Please add at least one email address.");
      return;
    }
    const docList = [];
    for (const section of sections) {
      if (!section.basePath?.includes("work_order")) continue;
      for (const doc of section.docs ?? []) {
        if (selectedForEmail.has(`${section.basePath}:${doc.ID}`)) {
          docList.push(doc);
        }
      }
    }
    if (!docList.length) {
      toast.error("Please select at least one document to send.");
      return;
    }
    setSending(true);
    try {
      await emailWorkOrderDocuments(
        { WONo: wo.WONo, DocList: docList, Emails: emails },
        token
      );
      setSelectedForEmail(new Set());
      toast.success("Email sent");
    } catch (err) {
      toast.error(err?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const docsSelectedCount = selectedForEmail.size;
  const hasRecipients = sendToEmails.length > 0;

  const emailSection = (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
        <Mail className="h-4 w-4 text-cyan-500" />
        Emails
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        To send a document, add customer email addresses below. Select documents from the list with the envelope icon, then click Email Selected Documents.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            type="email"
            placeholder="Enter email address"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addEmail} disabled={!emailInput.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {contacts.length > 0 && (
          <select
            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-2"
            onChange={(e) => {
              const idx = e.target.value;
              if (idx !== "") {
                addContact(contacts[Number(idx)]);
                e.target.value = "";
              }
            }}
          >
            <option value="">Add from contacts…</option>
            {contacts.map((c, i) => (
              <option key={c.ID ?? i} value={i}>
                {c.Contact || c.EMail} ({c.EMail})
              </option>
            ))}
          </select>
        )}
      </div>
      {sendToEmails.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {sendToEmails.map((e) => (
            <span
              key={(e.EMail || "").toLowerCase()}
              className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-900/40 px-3 py-1 text-sm"
            >
              {e.EMail}
              <button
                type="button"
                onClick={() => removeEmail((e.EMail || "").toLowerCase())}
                className="hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Button
        onClick={handleEmailDocs}
        disabled={sending || !hasRecipients || docsSelectedCount === 0}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {sending ? "Sending…" : `Email Selected Documents (${docsSelectedCount} selected)`}
      </Button>
    </div>
  );

  return (
    <DocumentViewerDialog
      open={open}
      onOpenChange={onOpenChange}
      sections={loading ? [] : sections}
      onRefresh={handleRefresh}
      token={token}
      initialLoading={loading}
      emailSection={emailSection}
      showSelectForEmail
      isDocSelectedForEmail={isDocSelectedForEmail}
      onToggleDocForEmail={toggleDocForEmail}
    />
  );
}
