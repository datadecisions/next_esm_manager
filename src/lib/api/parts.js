/**
 * Parts API – work order parts (current, update).
 */

import { fetchWithAuth } from "../api";

/**
 * Get current parts for a work order (WebPartsOrder + WOParts – pending + approved).
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getParts(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/current/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get approved parts only (WOParts – excludes pending WebPartsOrder).
 * Matches legacy approve form which uses view.wo.Parts from getApprovedParts.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getApprovedParts(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/approved/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch approved parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Update a work order part (Sell, Cost, Section, etc.).
 * @param {{ ID: number|string; WONo: number|string; Sell?: number|string; Cost?: number|string; Section?: string; [key: string]: unknown }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updatePart(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/update_line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Refresh part price from cost/markup.
 * @param {{ ID: number|string; WONo: number|string; [key: string]: unknown }} part
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function refreshPartPrice(part, token) {
  const res = await fetchWithAuth("/api/v1/parts/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(part),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to refresh price");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete an approved part (WOParts) from a work order.
 * @param {number|string} partId
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deletePart(partId, woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/approved_part/${partId}/${woNo}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to delete part");
}

/**
 * Delete a requested/pending part (WebPartsOrder) from a work order.
 * Use when part.type === "WebPartsOrder".
 * @param {number|string} partId - UniqueField from WebPartsOrder
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteRequestedPart(partId, woNo, token) {
  const res = await fetchWithAuth(`/api/v1/parts/requested/${partId}/${woNo}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) throw new Error("Failed to remove requested part");
}

/**
 * Approve a pending part (WebPartsOrder) – adds it to WOParts.
 * @param {{ PartNo?: string; RequestedPartNo?: string; Warehouse?: string; Qty?: number; Section?: string; RepairCode?: string; Sell?: number; [key: string]: unknown }} part
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function approvePart(part, token) {
  const body = {
    PartNo: part.PartNo || part.RequestedPartNo,
    Warehouse: part.Warehouse,
    WONo: part.WONo,
    Qty: part.Qty,
    Section: part.Section || part.RepairCode,
    RepairCode: part.RepairCode || part.Section,
    Sell: part.Sell ?? 0,
  };
  const res = await fetchWithAuth("/api/v1/parts/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to approve part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Download approved parts as CSV.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<string>} CSV content
 */
export async function downloadPartsCsv(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/work_order/approved_parts/csv/${woNo}`, {}, token);
  if (!res.ok) throw new Error("Failed to download parts");
  return res.text();
}

/**
 * Search parts by query (optionally filtered by warehouse).
 * @param {string} query
 * @param {string} [warehouse]
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchParts(query, warehouse, token) {
  const q = encodeURIComponent(query || "");
  const w = warehouse ? `/${encodeURIComponent(warehouse)}` : "";
  const res = await fetchWithAuth(`/api/v1/parts/search_warehouse/${q}${w}`, {}, token);
  if (!res.ok) throw new Error("Failed to search parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Search all parts (for PO add part flow).
 * @param {string} query
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchAllParts(query, token) {
  const q = encodeURIComponent(query || "");
  const res = await fetchWithAuth(`/api/v1/parts/search_all/${q}`, {}, token);
  if (!res.ok) throw new Error("Failed to search parts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get parts that need to be ordered (Restock flow).
 * @param {number|string} branch
 * @param {string} [recent]
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPartsToOrder(branch, recent, token) {
  const path = recent
    ? `/api/v1/parts/parts_to_order/${branch}/${recent}`
    : `/api/v1/parts/parts_to_order/${branch}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch parts to order");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get list of warehouses.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getWarehouses(token) {
  const res = await fetchWithAuth("/api/v1/parts/warehouses", {}, token);
  if (!res.ok) throw new Error("Failed to fetch warehouses");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Add a part to a work order (POST /api/v1/parts/post).
 * @param {{ WONo: number|string; PartNo: string; Warehouse: string; Qty: number; Section: string; RepairCode?: string; BOQty?: number }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function addPartToOrder(data, token) {
  const res = await fetchWithAuth("/api/v1/parts/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      WONo: data.WONo,
      PartNo: data.PartNo,
      Warehouse: data.Warehouse,
      Qty: data.Qty,
      Section: data.Section,
      RepairCode: data.RepairCode ?? data.Section,
      BOQty: data.BOQty,
    }),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to add part");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
