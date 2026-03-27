"use client";

import { useState, useCallback } from "react";

/**
 * Hook to trigger PDF generation and download (or open in new tab).
 * Use for any document type: work order, work order parts, etc.
 *
 * @param {object} opts
 * @param {string} opts.url - API URL that returns PDF (e.g. /api/print/work-order/123)
 * @param {string} [opts.filename] - Suggested filename for download (e.g. work-order-123.pdf)
 * @returns {{ generate: () => Promise<void>, loading: boolean, error: string | null }}
 */
export function usePrintPdf({ url, filename }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to generate PDF (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const name = filename || (disposition?.match(/filename="?([^";]+)"?/)?.[1]) || "document.pdf";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err?.message || "Failed to generate PDF");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, filename]);

  return { generate, loading, error };
}
