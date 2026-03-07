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
 * Get full customer info (CreditLimit, ARComments, CreditHoldDays, etc.).
 * @param {string} number - Customer number
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function getCustomerFullInfo(number, token) {
  const res = await fetchWithAuth(`/api/v1/customer/${number}/all`, {}, token);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

/**
 * Update customer (e.g. ARComments).
 * @param {{ Number: string; ARComments?: string; [key: string]: unknown }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateCustomer(data, token) {
  const res = await fetchWithAuth("/api/v1/customer/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update customer");
  }
  return res.json();
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

/**
 * Get customer contacts for ShipTo/BillTo (organization contacts).
 * @param {string} shipTo
 * @param {string} billTo
 * @param {string} token
 * @returns {Promise<Array<{ Contact?: string; EMail?: string; ID?: number }>>}
 */
export async function getCustomerContacts(shipTo, billTo, token) {
  if (!shipTo || !billTo) return [];
  const res = await fetchWithAuth(
    `/api/v1/customer/organization/contacts/${encodeURIComponent(shipTo)}/${encodeURIComponent(billTo)}`,
    {},
    token
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get all contacts for a customer number (optionally filtered by BillTo).
 * @param {string} customerNo
 * @param {string} [billTo]
 * @param {string} token
 * @returns {Promise<Array<{ Contact?: string; EMail?: string; ID?: number }>>}
 */
export async function getCustomerContactsByNumber(customerNo, billTo, token) {
  if (!customerNo) return [];
  const path = billTo
    ? `/api/v1/customer/organization/all/${encodeURIComponent(customerNo)}/${encodeURIComponent(billTo)}`
    : `/api/v1/customer/organization/all/${encodeURIComponent(customerNo)}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
