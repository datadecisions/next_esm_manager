/**
 * Documents API – work order and customer images (metadata + blob fetch).
 * Also supports document search (WO, PO, Vendor, AP, Customer, Equipment, Mechanic).
 */

import { fetchWithAuth, getApiBase } from "../api";

// ─── Document Search (for Search tab) ─────────────────────────────────────

async function documentsGet(path, token) {
  const res = await fetchWithAuth(`/api/v1/documents/${path}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getOpenWODocuments(search, token) {
  const seg = search ? `/${encodeURIComponent(search)}` : "";
  return documentsGet(`wo/open${seg}`, token);
}

export async function getPODocuments(poNo, token) {
  return documentsGet(`po/${poNo || ""}`, token);
}

export async function getVendorDocuments(vendorNo, token) {
  return documentsGet(`vendor/${vendorNo || ""}`, token);
}

export async function getAPDocuments(search, token) {
  return documentsGet(`ap/${search || ""}`, token);
}

export async function getCustomerDocuments(customerNo, token) {
  return documentsGet(`customer/${customerNo || ""}`, token);
}

export async function getEquipmentDocuments(search, token) {
  return documentsGet(`equipment/${search || ""}`, token);
}

export async function getMechanicDocuments(mechanicNo, token) {
  return documentsGet(`mechanic/${mechanicNo || ""}`, token);
}

export async function getDocumentImageUrl(table, imageId, token) {
  return getImageAsObjectUrl(`/api/v1/documents/${table}/image/${imageId}`, token);
}

/**
 * Get work order images metadata (ARImages for the WO).
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array<{ ID: number; FileName: string; AccessKey?: string; Table?: string; IncludeWithInvoice?: number }>>}
 */
export async function getWorkOrderImagesMetadata(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/images_metadata/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch work order documents");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get customer images metadata (CustomerImages).
 * @param {string} customerNo - ShipTo or BillTo
 * @param {string} token
 * @returns {Promise<Array<{ ID: number; FileName: string; Table?: string }>>}
 */
export async function getCustomerImagesMetadata(customerNo, token) {
  if (!customerNo) return [];
  const res = await fetchWithAuth(`/api/v1/customer/images_metadata/${customerNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch customer documents");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch image/blob and return an object URL for display (iframe/img).
 * Caller should revoke the URL when done: URL.revokeObjectURL(url)
 * @param {string} path - e.g. /api/v1/work_order/image/123
 * @param {string} token
 * @returns {Promise<string>} Object URL
 */
export async function getImageAsObjectUrl(path, token) {
  const base = getApiBase();
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: token ? { "x-access-token": token } : {},
  });
  if (!res.ok) throw new Error("Failed to load document");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Delete a work order image.
 * @param {number|string} id - Image ID
 * @param {string} token
 */
export async function deleteWorkOrderImage(id, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/image/${id}`, { method: "DELETE" }, token);
  if (!res.ok) throw new Error("Failed to delete document");
}

/**
 * Email selected documents to the given addresses.
 * @param {{ WONo: number|string; DocList: Array<object>; Emails: string[] }} data
 * @param {string} token
 */
export async function emailWorkOrderDocuments(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, SkipEmail: false }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to send email");
  }
}
