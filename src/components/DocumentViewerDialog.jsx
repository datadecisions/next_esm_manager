"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, ChevronDown, ChevronRight, Loader2, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageAsObjectUrl, deleteWorkOrderImage } from "@/lib/api/documents";

const SUPPORTED_IMG = /\.(png|jpg|jpeg|gif|webp)$/i;
const SUPPORTED_PDF = /\.pdf$/i;

/**
 * Reusable document viewer dialog.
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {Array<{ title: string; docs: Array<{ ID: number; FileName: string; Table?: string }>; basePath: string; canDelete?: boolean }>} props.sections
 * @param {() => Promise<void>} props.onRefresh
 * @param {string} props.token
 * @param {boolean} [props.initialLoading] - True while fetching sections (e.g. on dialog open)
 * @param {React.ReactNode} [props.emailSection] - Optional section to render above documents (emails + send button)
 * @param {boolean} [props.showSelectForEmail] - Show checkbox to select doc for email
 * @param {(doc: object, basePath: string) => boolean} [props.isDocSelectedForEmail]
 * @param {(doc: object, basePath: string) => void} [props.onToggleDocForEmail]
 */
export default function DocumentViewerDialog({
  open,
  onOpenChange,
  sections: initialSections,
  onRefresh,
  token,
  initialLoading = false,
  emailSection,
  showSelectForEmail = false,
  isDocSelectedForEmail,
  onToggleDocForEmail,
}) {
  const [sections, setSections] = useState(initialSections ?? []);
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setSections(initialSections ?? []);
  }, [initialSections]);

  const toggleSection = (idx) => {
    setExpanded((p) => ({ ...p, [idx]: !p[idx] }));
  };

  const loadDocument = useCallback(
    async (doc, basePath, canDelete) => {
      if (!doc?.ID || !basePath || !token) return;
      setLoading(true);
      setSelected({ doc, basePath, canDelete });
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      try {
        const path = `${basePath}/${doc.ID}`;
        const url = await getImageAsObjectUrl(path, token);
        setBlobUrl(url);
      } catch (err) {
        setBlobUrl(null);
        toast.error(err?.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleDelete = async (doc, basePath) => {
    if (!doc?.ID || !token) return;
    if (!confirm(`Delete "${doc.FileName}"?`)) return;
    setDeletingId(doc.ID);
    try {
      if (basePath.includes("work_order")) {
        await deleteWorkOrderImage(doc.ID, token);
      }
      await onRefresh?.();
      if (selected?.doc?.ID === doc.ID) {
        setSelected(null);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const fileType = selected?.doc?.FileName
    ? SUPPORTED_PDF.test(selected.doc.FileName)
      ? "pdf"
      : SUPPORTED_IMG.test(selected.doc.FileName)
        ? "image"
        : null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="sm:max-w-[95vw] sm:max-h-[95vh] min-h-[85vh] flex flex-col p-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-500" />
            Documents
          </DialogTitle>
        </DialogHeader>

        {emailSection && (
          <div className="px-6 pb-4 shrink-0 border-b border-slate-200 dark:border-slate-700">
            {emailSection}
          </div>
        )}

        <div className="flex flex-1 min-h-0 border-t border-slate-200 dark:border-slate-700 relative">
          {initialLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-b-lg">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading documents…</p>
              </div>
            </div>
          )}
          {/* Sidebar */}
          <aside className={`w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ${initialLoading ? "pointer-events-none opacity-60" : ""}`}>
            <div className="overflow-auto p-2">
              {sections.map((section, idx) => {
                const isOpen = expanded[idx] ?? true;
                const count = section.docs?.length ?? 0;
                return (
                  <div key={idx} className="mb-1">
                    <button
                      type="button"
                      onClick={() => toggleSection(idx)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span className="truncate">{section.title}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs shrink-0">
                        {count}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-0.5 space-y-0.5">
                        {(section.docs ?? []).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">
                            No documents
                          </p>
                        ) : (
                          (section.docs ?? []).map((doc) => {
                            const isSelected =
                              selected?.doc?.ID === doc.ID &&
                              selected?.basePath === section.basePath;
                            const canDelete =
                              section.canDelete !== false &&
                              section.basePath?.includes("work_order");
                            const fileName = doc.FileName ?? `Document ${doc.ID}`;
                            const showEmailSelect = showSelectForEmail && section.basePath?.includes("work_order");
                            return (
                              <div
                                key={doc.ID}
                                className={`group flex items-center gap-2 min-w-0 px-3 py-2 rounded-md text-sm transition-colors ${
                                  isSelected
                                    ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <button
                                  type="button"
                                  className="flex-1 min-w-0 text-left truncate cursor-pointer"
                                  onClick={() =>
                                    loadDocument(
                                      doc,
                                      section.basePath,
                                      canDelete
                                    )
                                  }
                                  disabled={loading}
                                  title={fileName}
                                >
                                  {loading && isSelected ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin inline shrink-0 mr-1.5 align-middle" />
                                  ) : null}
                                  <span className="truncate block">{fileName}</span>
                                </button>
                                <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                    {showEmailSelect && (
                                      <label
                                        className="cursor-pointer p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-600/50"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Select for email"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isDocSelectedForEmail?.(doc, section.basePath) ?? false}
                                          onChange={() => onToggleDocForEmail?.(doc, section.basePath)}
                                          className="sr-only"
                                        />
                                        <Mail className={`h-3.5 w-3.5 ${isDocSelectedForEmail?.(doc, section.basePath) ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-slate-500"}`} />
                                      </label>
                                    )}
                                    {canDelete && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 opacity-70 hover:opacity-100 hover:text-red-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(doc, section.basePath);
                                        }}
                                        disabled={deletingId === doc.ID}
                                        title="Delete"
                                      >
                                        {deletingId === doc.ID ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Main view */}
          <div className={`flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900/50 p-4 ${initialLoading ? "pointer-events-none" : ""}`}>
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400 italic text-sm">
                  Select a document from the list to view.
                </p>
              </div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading document…</p>
                </div>
              </div>
            ) : blobUrl && fileType === "pdf" ? (
              <iframe
                src={blobUrl}
                title={selected.doc.FileName}
                className="w-full flex-1 min-h-[60vh] rounded border border-slate-200 dark:border-slate-700 bg-white"
              />
            ) : blobUrl && fileType === "image" ? (
              <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from object URL, not a static path */}
                <img
                  src={blobUrl}
                  alt={selected.doc.FileName}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            ) : fileType ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Preview not available for this file type.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Unsupported file type. Download may be available.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
