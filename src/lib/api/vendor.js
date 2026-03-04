/**
 * Vendor API – vendor search and lookup.
 */

import { fetchWithAuth } from "../api";

/**
 * Search vendors by name, number, etc.
 * @param {string} query
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchVendors(query, token) {
  const q = encodeURIComponent(query || "");
  const res = await fetchWithAuth(`/api/v1/vendor/search/${q}`, {}, token);
  if (!res.ok) throw new Error("Vendor search failed");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get vendor by number.
 * @param {string} number - Vendor number
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function getVendorByNum(number, token) {
  const res = await fetchWithAuth(`/api/v1/vendor/${encodeURIComponent(number)}`, {}, token);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}
