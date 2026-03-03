/**
 * Admin API – salesmen, labor rates, tax codes, etc.
 */

import { fetchWithAuth } from "../api";

/**
 * Get salesmen list.
 * @param {string} token
 * @returns {Promise<Array<{ Name: string; Number?: string }>>}
 */
export async function getSalesmen(token) {
  const res = await fetchWithAuth("/api/v1/admin/salesmen", {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get labor rates (for WO Labor Rate dropdown).
 * @param {string} token
 * @returns {Promise<Array<{ Code: string; Rate?: number; OverTime?: number; Premium?: number }>>}
 */
export async function getLaborRates(token) {
  const res = await fetchWithAuth("/api/v1/admin/labor_rates", {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get tax codes (for WO Tax Code dropdown).
 * @param {string} token
 * @returns {Promise<Array<{ Code: string; Rate?: number; Description?: string; TaxAccount?: string }>>}
 */
export async function getTaxCodes(token) {
  const res = await fetchWithAuth("/api/v1/admin/tax_codes", {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get all tax codes (State, County, City, Local) for override dropdowns.
 * @param {string} token
 * @returns {Promise<Array<{ Code: string; Rate?: number; type: string }>>}
 */
export async function getAllTaxCodes(token) {
  const res = await fetchWithAuth("/api/v1/admin/all_tax_codes", {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
