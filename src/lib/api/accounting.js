/**
 * Accounting API – pending invoices, distribute, print.
 */

import { fetchWithAuth } from "../api";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Get invoices available to print (by date range).
 * Used by Close / Distribute Orders.
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPendingInvoicesSearch(startDate, endDate, token) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/pending_invoices_search/${s}/${e}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get pending invoices by branch (and optionally dept).
 * @param {number|string} [branch]
 * @param {number|string} [dept]
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPendingInvoices(branch, dept, token) {
  let path = "/api/v1/accounting/pending_invoices";
  if (branch) path += `/${branch}`;
  if (dept) path += `/${dept}`;
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get paperwork-complete work orders pending close (by branch).
 * Used by Process tab.
 * @param {number|string} branch
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPendingClose(branch, token) {
  const res = await fetchWithAuth(
    `/api/v1/accounting/pending_close/${branch}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch pending close");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get credit approval data: customers over credit limit or with pending credit requests.
 * Each item has BillTo, CustomerName, BalanceWithoutCredit, OutstandingBalance, CreditLimit, orders[].
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getCreditApprovals(token) {
  const res = await fetchWithAuth("/api/v1/accounting/credit/approvals", {}, token);
  if (!res.ok) throw new Error("Failed to fetch credit approvals");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get sales report for date range (MTD/YTD by account).
 * @param {{ startDate: string|Date; endDate: string|Date }} params
 * @returns {Promise<Array>}
 */
export async function getSalesReportMonthly(params) {
  const res = await fetchWithAuth("/api/v1/accounting/sales_report_monthly/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: typeof params.startDate === "string" ? params.startDate : params.startDate?.toISOString?.()?.slice(0, 10),
      endDate: typeof params.endDate === "string" ? params.endDate : params.endDate?.toISOString?.()?.slice(0, 10),
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch sales report");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get open/closed work order summary by department.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{ SaleDept: string; open_count: number; closed_count: number }>>}
 */
export async function getOpenClosedSummary(startDate, endDate) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(
    `/api/v1/accounting/invoices/open_closed_summary/${s}/${e}`,
    {}
  );
  if (!res.ok) throw new Error("Failed to fetch open/closed summary");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get accounting accounts (for PO line item account selection).
 * @param {string} [query] - Optional search query
 * @param {string} token
 * @returns {Promise<Array<{ AccountNo: string; Description: string }>>}
 */
export async function getAccounts(query, token) {
  const path = query
    ? `/api/v1/accounting/accounts/${encodeURIComponent(query)}`
    : "/api/v1/accounting/accounts";
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch accounts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Send selected invoices to print (or email if EMailInvoice = -1).
 * @param {{ toPrint: number[] }} data - Array of InvoiceNo (WONo)
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function printInvoices(data, token) {
  const res = await fetchWithAuth("/api/v1/accounting/print_invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to print invoices");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
