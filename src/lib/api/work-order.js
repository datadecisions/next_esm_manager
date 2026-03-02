/**
 * Work order API – uses fetchWithAuth with JWT token.
 */

import { fetchWithAuth } from "../api";

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
