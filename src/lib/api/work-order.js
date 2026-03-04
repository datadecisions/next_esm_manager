/**
 * Work order API – uses fetchWithAuth with JWT token.
 */

import { fetchWithAuth } from "../api";

/**
 * Get a single work order by ID.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getWO(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/${woNo}`, {}, token);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Work order not found");
    throw new Error("Failed to fetch work order");
  }
  return res.json();
}

/**
 * Get billing overview (calculations, line items) for a work order.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getBillingOverview(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/billing_overview/${woNo}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch billing overview");
  }
  return res.json();
}

/**
 * Get accounting breakdown for a work order (optionally by section).
 * @param {number|string} woNo
 * @param {string} token
 * @param {string} [section] - Optional section filter
 * @returns {Promise<Array>}
 */
export async function getAccountingBreakdown(woNo, token, section) {
  const path = section
    ? `/api/v1/accounting/invoice/breakdown/${woNo}/${encodeURIComponent(section)}`
    : `/api/v1/accounting/invoice/breakdown/${woNo}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch accounting breakdown");
  }
  return res.json();
}

/**
 * Get section workflows (Open, Dispatch, In Progress, Final Review, Complete).
 * @param {string} token
 * @returns {Promise<Array<{ id: number; name: string; description?: string }>>}
 */
export async function getSectionWorkflows(token) {
  const res = await fetchWithAuth("/api/v1/work_order/sections/workflows", {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch section workflows");
  }
  return res.json();
}

/**
 * Get quote workflow types (Parts, Labor, Equipment, Rental).
 * @param {string} token
 * @returns {Promise<Array<{ id: number; name: string; table_name: string }>>}
 */
export async function getQuoteWorkflowTypes(token) {
  const res = await fetchWithAuth("/api/v1/work_order/quotes/workflow_types/", {}, token);
  if (!res.ok) throw new Error("Failed to fetch workflow types");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get sections list for a work order (includes SectionWorkflowID per section).
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array<{ id?: string; title: string; SectionWorkflowID?: number; Branch?: string; Dept?: string }>>}
 */
export async function getSectionsList(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/sections/list/${woNo}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch sections list");
  }
  return res.json();
}

/**
 * Update section workflow for a work order section.
 * @param {{ WONo: number|string; title: string; Branch?: string; Dept?: string; SectionWorkflowID: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateSectionWorkflow(data, token) {
  const body = {
    WONo: data.WONo,
    title: data.title,
    Branch: data.Branch,
    Dept: data.Dept,
    SectionWorkflowID: data.SectionWorkflowID,
  };
  const res = await fetchWithAuth("/api/v1/work_order/section/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, token);
  if (!res.ok) {
    throw new Error("Failed to update section workflow");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Get recently viewed work orders.
 * @param {number} count
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getViewedWOs(count, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/viewed/${count}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch recently viewed work orders");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Search work orders by query.
 * @param {string} query - WO number, customer name, equipment, etc.
 * @param {boolean} [onlyOpen] - If true, only return open WOs
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchWOs(query, onlyOpen, token) {
  const q = encodeURIComponent(query);
  const path = onlyOpen ? `/api/v1/work_order/search/${q}/1` : `/api/v1/work_order/search/${q}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) {
    throw new Error("Search failed");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Advanced search work orders by multiple criteria.
 * @param {{ type?: 'order'|'quote'; includeClosedQuotes?: boolean; branches?: Array<{Number}>; depts?: Array<{Dept}>; ShipTo?: string; BillTo?: string; SerialNo?: string; GMSerialNo?: string; UnitNo?: string; PONo?: string }} data
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchWOsAdvanced(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/search/advanced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Advanced search failed");
  }
  const result = await res.json();
  return Array.isArray(result) ? result : [];
}

const DISPOSITION_MAP = {
  1: "Open",
  2: "Closed",
  11: "Quote",
  12: "Accepted",
  13: "Rejected",
};

/** Void customer numbers used when an invoice is voided (ShipTo/BillTo set to this). */
const VOID_NUMBERS = ["9999", "9999999"];

/**
 * Check if a work order is voided (ShipTo and BillTo both equal void number).
 * @param {object} wo - Work order with ShipTo, BillTo
 * @returns {boolean}
 */
export function isVoided(wo) {
  if (!wo) return false;
  const s = String(wo.ShipTo ?? "").trim();
  const b = String(wo.BillTo ?? "").trim();
  return VOID_NUMBERS.includes(s) && s === b;
}

/**
 * Map Disposition number to display text.
 * @param {number} disposition
 * @returns {string}
 */
export function getDispositionText(disposition) {
  return DISPOSITION_MAP[disposition] ?? "N/A";
}

/**
 * Get display status for a work order. Returns "Voided" when ShipTo and BillTo are 9999.
 * @param {object} wo - Work order with Disposition, ShipTo, BillTo
 * @returns {string}
 */
export function getDisplayStatus(wo) {
  if (!wo) return "N/A";
  if (isVoided(wo)) return "Voided";
  return getDispositionText(wo.Disposition);
}

/**
 * Update work order (sale/expense/other/order info). Uses work_order/edit.
 * @param {object} data - Fields to update (WONo required, SaleBranch, SaleDept, SaleCode, ExpBranch, ExpDept, ExpCode, PONo, Salesman, Writer, ShipContact, ShipPhone, AssociatedWONo, ShopQuoteHours, etc.)
 * @param {string} [actionName] - "Update" or "Update & Reprocess Line Items"
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateWorkOrder(data, actionName, token) {
  const body = { ...data, actionName: actionName || "Update" };
  const res = await fetchWithAuth("/api/v1/work_order/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update work order");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Create a work order.
 * @param {object} data - WO data (ShipTo, BillTo, Branch, Dept, SalesCode, etc.)
 * @param {string} token
 * @returns {Promise<object>} Created WO
 */
export async function createWO(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create work order");
  }
  return res.json();
}

/**
 * Upload a photo to a work order.
 * @param {number|string} woNo - Work order number
 * @param {File} file - Image file to upload
 * @param {{ ShipTo?: string; BillTo?: string }} [context] - Optional ShipTo/BillTo for ARImages
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function uploadWorkOrderImage(woNo, file, context, token) {
  const formData = new FormData();
  formData.append("WONo", String(woNo));
  if (context?.ShipTo) formData.append("ShipTo", context.ShipTo);
  if (context?.BillTo) formData.append("BillTo", context.BillTo);
  formData.append("file", file);

  const res = await fetchWithAuth("/api/v1/work_order/image/", {
    method: "POST",
    body: formData,
    // Do not set Content-Type - browser sets multipart boundary
    headers: {},
  }, token);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to upload ${file.name}`);
  }
}

/**
 * Update work order comments (General Comments).
 * @param {{ WONo: string|number; Comments: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateWOComments(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/edit/comments", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update comments");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update work order comment fields (Comments, MobileRecommended, PrivateComments).
 * Uses technician update endpoint; only updates fields that are provided.
 * @param {{ WONo: string|number; Comments?: string; MobileRecommended?: string; PrivateComments?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateWOCommentFields(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/update/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update comments");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Get misc charges for a work order (raw WOMisc records).
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getMisc(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/misc/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch misc charges");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Create a misc charge for a work order.
 * @param {{ WONo: number|string; SaleCode: string; Description: string; Cost?: number|string; Sell?: number|string; Section?: string }} data
 * @param {string} token
 * @returns {Promise<object>} Created misc entry
 */
export async function createMisc(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/misc/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create misc charge");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update a misc charge.
 * @param {{ ID: number|string; WONo: number|string; SaleCode?: string; Description?: string; Cost?: number|string; Sell?: number|string; Section?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateMisc(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/misc/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update misc charge");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete a misc charge.
 * @param {number|string} id - Misc entry ID
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteMisc(id, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/misc/${id}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to delete misc charge");
}

/**
 * Get equipment charges (rental) for a work order (WOEq records).
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getEquipment(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/equipment/order/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch equipment charges");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Create an equipment charge for a work order.
 * @param {{ WONo: number|string; SerialNo?: string; UnitNo?: string; Make?: string; Model?: string; Cost?: number|string; Sell?: number|string; SaleBranch?: number|string; SaleDept?: number|string; SaleCode?: string; Section?: string }} data
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function createEquipment(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/equipment/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create equipment charge");
  }
}

/**
 * Get fixed price items (WOQuote) for a work order.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getFixed(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/fixed/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch fixed price items");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Create a fixed price item for a work order.
 * @param {object} data - See backend createWOFixed for full schema (WONo, SaleBranch, SaleDept, SaleCode, Type, Amount, Description, etc.)
 * @param {string} token
 * @returns {Promise<object>} Created fixed entry
 */
export async function createFixed(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/fixed/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create fixed price item");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete a fixed price item.
 * @param {number|string} id - Fixed entry ID
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteFixed(id, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/fixed/${id}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to delete fixed price item");
}

/**
 * Delete an equipment charge.
 * @param {number|string} id - Equipment entry ID
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteEquipment(id, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/equipment/${id}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to delete equipment charge");
}

/**
 * Process comments with AI (expand/format based on equipment context).
 * @param {{ comment: string; model?: string; make?: string; serial?: string }} data
 * @param {string} token
 * @returns {Promise<string>} Processed comment text
 */
export async function processComment(data, token) {
  const res = await fetchWithAuth("/api/v1/ai/comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to process comment");
  }
  return res.json();
}

/**
 * Process quote to order (duplicate with disposition change).
 * @param {{ WONo: number|string; SaleBranch: string; SaleDept: string }} data
 * @param {string} token
 * @returns {Promise<object>} Created WO
 */
export async function processToOrder(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/create/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to process to order");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Duplicate order (no parts, labor, misc, equipment).
 * @param {{ WONo: number|string; SaleBranch: string; SaleDept: string }} data
 * @param {string} token
 * @returns {Promise<object>} Created WO
 */
export async function duplicateOrder(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/create/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, noEq: true, noParts: true, noLabor: true, noMisc: true }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to duplicate order");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Duplicate closed invoice to quote.
 * @param {{ WONo: number|string; SaleBranch: string; SaleDept: string; disposition: number }} data
 * @param {string} token
 * @returns {Promise<object>} Created WO
 */
export async function duplicateToQuote(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/duplicate/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, disposition: 11 }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to duplicate to quote");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Regenerate backup paperwork.
 * @param {{ WONo: number|string; SaleBranch: string; SaleDept: string }} data
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function regenerateBackup(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/regenerate_backup/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to regenerate paperwork");
  }
}

/**
 * Convert invoice to credit.
 * @param {{ WONo: number|string; SaleBranch: string; SaleDept: string }} data
 * @param {string} token
 * @returns {Promise<object>} Created credit WO
 */
export async function creditOrder(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/create/credit/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create credit");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Void an invoice.
 * @param {{ WONo: number|string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function voidInvoice(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/void", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to void invoice");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Send invoice to Paya.
 * @param {{ WONo: number|string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function sendToPaya(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/paya/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to send to Paya");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Export to Crown (downloads crown.zip).
 * @param {{ ids: number[]|string[] }} data
 * @param {string} token
 * @returns {Promise<Blob>}
 */
export async function exportToCrown(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/exports/crown/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to export to Crown");
  }
  return res.blob();
}

/**
 * Close a work order (generate invoice PDF, process ledger, close WO).
 * @param {{ WONo: number|string; Branch: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function closeWorkOrder(data, token) {
  const res = await fetchWithAuth("/api/v1/accounting/close_wo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ WONo: data.WONo, Branch: data.Branch }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to close work order");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Get invoice PDF as blob URL for preview/print/download.
 * Caller should revoke the URL when done: URL.revokeObjectURL(url)
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<string>} Object URL for the PDF
 */
export async function getInvoicePdfUrl(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/invoice_pdf/${woNo}`, {}, token);
  if (!res.ok) {
    const text = await res.text();
    let msg = "Failed to generate invoice PDF";
    try {
      const j = JSON.parse(text);
      if (j?.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 100);
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Get multiple invoices PDF as blob URL for preview/print.
 * @param {number[]|string[]} invoices - Array of WO numbers (original/closed)
 * @param {string} token
 * @returns {Promise<string>} Object URL for the PDF (caller should revoke when done)
 */
export async function getMultipleInvoicePdfUrl(invoices, token) {
  const res = await fetchWithAuth("/api/v1/work_order/multiple/invoice_pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoices),
  }, token);
  if (!res.ok) {
    const text = await res.text();
    let msg = "Failed to generate invoice PDF";
    try {
      const j = JSON.parse(text);
      if (j?.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 100);
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Email multiple invoices (combined or separate).
 * @param {{ emailBody: string; invoices: number[]; emails: string[]; bcc?: string; useRentalReplyTo?: boolean; groupEmail?: boolean; splitEmail?: boolean }} data
 * @param {string} token
 * @returns {Promise<object>} Response with emailData.accepted, emailData.rejected
 */
export async function emailMultipleInvoices(data, token) {
  const endpoint = data.splitEmail
    ? "/api/v1/work_order/email_seperated_invoices"
    : "/api/v1/work_order/email_multiple_invoices";
  const res = await fetchWithAuth(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailBody: (data.emailBody || "") + " ",
      invoices: data.invoices,
      emails: data.emails,
      bcc: data.bcc,
      useRentalReplyTo: data.useRentalReplyTo ?? true,
      groupEmail: data.groupEmail ?? false,
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to email invoices");
  }
  return res.json();
}

/**
 * Email invoice to specified addresses.
 * @param {{ emailBody: string; invoices: number[]; emails: string[] }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function emailInvoice(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/email_invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to email invoice");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Recurring ─────────────────────────────────────────────────────────────

/**
 * Get open recurring orders (GM/Rental) for date range.
 * @param {string} startDate - YYYY-MM-DD or Date
 * @param {string} endDate - YYYY-MM-DD or Date
 * @param {boolean} [hideGM] - Hide GM monthly billing
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getOpenRecurringOrders(startDate, endDate, hideGM, token) {
  const s = typeof startDate === "string" ? startDate : formatDateForApi(startDate);
  const e = typeof endDate === "string" ? endDate : formatDateForApi(endDate);
  const path = `/api/v1/work_order/open/recurring/${s}/${e}/${hideGM ? "true" : "false"}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch recurring orders");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get recurring continuations (created WOs) for date range.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getRecurringContinuations(startDate, endDate, token) {
  const s = typeof startDate === "string" ? startDate : formatDateForApi(startDate);
  const e = typeof endDate === "string" ? endDate : formatDateForApi(endDate);
  const res = await fetchWithAuth(`/api/v1/work_order/recurring/show/${s}/${e}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch recurring continuations");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get scheduled PM for date range.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getScheduledPM(startDate, endDate, token) {
  const s = typeof startDate === "string" ? startDate : formatDateForApi(startDate);
  const e = typeof endDate === "string" ? endDate : formatDateForApi(endDate);
  const res = await fetchWithAuth(`/api/v1/work_order/pm/scheduled/${s}/${e}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch scheduled PM");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Close multiple work orders (recurring GM processing).
 * @param {{ toClose: Array<{ WONo: number|string; Branch: string; SaleBranch?: string; awaitingPONumber?: boolean }> }} data
 * @param {string} token
 * @returns {Promise<{ closedWorkOrders: Array; openedWorkOrders: Array }>}
 */
export async function closeWOs(data, token) {
  const toClose = data.toClose.map((item) => ({
    WONo: item.WONo,
    Branch: item.Branch ?? item.SaleBranch,
    awaitingPONumber: item.awaitingPONumber ?? false,
  }));
  const res = await fetchWithAuth("/api/v1/accounting/close_wos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toClose }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to close work orders");
  }
  return res.json();
}

/**
 * Open selected PM records (create WOs from scheduled PM).
 * @param {{ ids: Array<{ id: number|string }> }} data
 * @param {string} token
 * @returns {Promise<{ openedWorkOrders: Array }>}
 */
export async function openPM(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/pm/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to open PM");
  }
  return res.json();
}

/**
 * Update PO number for a work order.
 * @param {{ WONo: number|string; PONo: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updatePONo(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/edit/po_no", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update PO number");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

function formatDateForApi(d) {
  if (typeof d === "string") return d;
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}
