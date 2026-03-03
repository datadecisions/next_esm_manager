/**
 * Equipment API – uses fetchWithAuth with JWT token.
 */

import { fetchWithAuth } from "../api";

/**
 * Search equipment for a customer (requires Ship To and Bill To).
 * @param {string} query - Search by serial, unit, make, model
 * @param {string} shipTo - Ship To customer number
 * @param {string} billTo - Bill To customer number
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchCustomerEquipment(query, shipTo, billTo, token) {
  const q = encodeURIComponent(query || " ");
  const s = encodeURIComponent(shipTo || "");
  const b = encodeURIComponent(billTo || "");
  const res = await fetchWithAuth(
    `/api/v1/equipment/search_customer/${q}/${s}/${b}`,
    {},
    token
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Search all equipment by serial, unit, make, model (no customer required).
 * Use when force-enabling equipment without customers.
 * @param {string} query
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchEquipment(query, token) {
  const q = encodeURIComponent(query || "");
  const res = await fetchWithAuth(`/api/v1/equipment/get/${q}`, {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open work orders for equipment by serial number.
 * @param {string} serialNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getOpenOrdersForEquipment(serialNo, token) {
  const s = encodeURIComponent(serialNo || "");
  const res = await fetchWithAuth(
    `/api/v1/equipment/orders/open/${s}`,
    {},
    token
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get spec status options (for equipment Status dropdown).
 * @param {string} token
 * @returns {Promise<Array<{ SpecStatus: string }>>}
 */
export async function getSpecStatusOptions(token) {
  const res = await fetchWithAuth("/api/v1/equipment/status/items/all", {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get equipment work order history by serial number.
 * @param {string} serialNo
 * @param {string} token
 * @returns {Promise<Array<{ WONo: number; ClosedDate?: string; HourMeter?: number; TotalWithoutTax?: number; Disposition?: number }>>}
 */
export async function getEquipmentHistory(serialNo, token) {
  const s = encodeURIComponent(serialNo || "");
  const res = await fetchWithAuth(`/api/v1/equipment/history/${s}`, {}, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to fetch equipment history");
  }
  return res.json();
}

/**
 * Get equipment financials (AR aging + invoice history) for charts.
 * Requires SerialNo; uses BillTo for AR aging.
 * @param {{ serialNo: string; controlNo?: string; billTo?: string }} params
 * @param {string} token
 * @returns {Promise<{ outstandingBalance: Array<{ WONo: number; Balance: number; InvoiceDate: string }>; history: Array<{ ClosedDate: string; TotalWithoutTax: number; TotalParts: number; TotalLabor: number; TotalMisc: number; TotalEquipment: number; TotalRental: number }> }>}
 */
export async function getEquipmentFinancials({ serialNo, controlNo, billTo }, token) {
  const s = encodeURIComponent(serialNo || "");
  const c = encodeURIComponent(controlNo || " ");
  const b = encodeURIComponent(billTo || "");
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const res = await fetchWithAuth(
    `/api/v1/equipment/financials/${s}/${c}/${startStr}/${endStr}/${b}`,
    {},
    token
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to fetch equipment financials");
  }
  return res.json();
}

/**
 * Update equipment SpecStatus for a WO's equipment.
 * @param {{ SerialNo: string; UnitNo?: string; Model?: string; SpecStatus?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateEquipmentSpecStatus(data, token) {
  const res = await fetchWithAuth("/api/v1/equipment/spec_status/wo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update equipment status");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
