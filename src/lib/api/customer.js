/**
 * Customer API – uses fetchWithAuth with JWT token.
 */

import { fetchWithAuth } from "../api";

/**
 * Search customers by name, number, city, etc.
 * @param {string} query
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function searchCustomers(query, token) {
  const q = encodeURIComponent(query);
  const res = await fetchWithAuth(`/api/v1/customer/search/${q}`, {}, token);
  if (!res.ok) throw new Error("Customer search failed");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get customer by number.
 * @param {string} number - Customer number
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function getCustomerByNum(number, token) {
  const res = await fetchWithAuth(`/api/v1/customer/${number}`, {}, token);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

/**
 * Get sale codes for a branch/dept (Type of Sale).
 * @param {string} branch
 * @param {string} dept
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getSalesCodes(branch, dept, token) {
  const res = await fetchWithAuth(
    `/api/v1/customer/sales_codes/${branch}/${dept}`,
    {},
    token
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get expense codes for a branch/dept (Type of Expense).
 * @param {string} branch
 * @param {string} dept
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getExpenseCodes(branch, dept, token) {
  const res = await fetchWithAuth(
    `/api/v1/customer/expense_codes/${branch}/${dept}`,
    {},
    token
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
