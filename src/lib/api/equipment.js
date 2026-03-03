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
