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

const DISPOSITION_MAP = {
  1: "Open",
  2: "Closed",
  11: "Quote",
  12: "Accepted",
  13: "Rejected",
};

/**
 * Map Disposition number to display text.
 * @param {number} disposition
 * @returns {string}
 */
export function getDispositionText(disposition) {
  return DISPOSITION_MAP[disposition] ?? "N/A";
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
