/**
 * Labor API – posted (arrivals) and imported labor for work orders.
 */

import { fetchWithAuth } from "../api";

function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/**
 * Get work orders closed by month (past 6 months).
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @returns {Promise<Array<{ Year: number; Month: number; TotalClosed: number; DistinctBillTo: number }>>}
 */
export async function getLaborClosedReport(startDate, endDate) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(`/api/v1/labor/reports/closed/${s}/${e}`, {});
  if (!res.ok) throw new Error("Failed to fetch closed report");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get labor hours billed by month and sale code.
 * @param {string|Date} startDate - YYYY-MM-DD or Date
 * @param {string|Date} endDate - YYYY-MM-DD or Date
 * @returns {Promise<Array<{ Year: number; Month: number; Billed: number; Code: string }>>}
 */
export async function getLaborTotalReport(startDate, endDate) {
  const s = toYMD(startDate);
  const e = toYMD(endDate);
  if (!s || !e) return [];
  const res = await fetchWithAuth(`/api/v1/labor/reports/total/${s}/${e}`, {});
  if (!res.ok) throw new Error("Failed to fetch labor report");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get posted labor (arrivals) for a work order – technician time entries not yet imported.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getLaborArrivals(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/labor/arrivals/${woNo}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch labor arrivals");
  }
  return res.json();
}

/**
 * Get imported labor for a work order – time entries already imported to the WO.
 * @param {number|string} woNo
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getLaborImports(woNo, token) {
  const res = await fetchWithAuth(`/api/v1/labor/imports/${woNo}`, {}, token);
  if (!res.ok) {
    throw new Error("Failed to fetch labor imports");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Import all posted labor entries for a work order.
 * @param {{ WONo: number|string; DispatchName?: string }} data
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function importLabor(data, token) {
  const res = await fetchWithAuth("/api/v1/labor/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to import labor");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Create a new labor entry for a work order.
 * @param {object} data - { WONo, SaleBranch, SaleDept, SaleCode?, DateOfLabor, MechanicName, EmployeeNumber, Hours, LaborRateType, Section? }
 * @param {string} token
 * @returns {Promise<object>} Created labor entry
 */
export async function createLabor(data, token) {
  const res = await fetchWithAuth("/api/v1/labor/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create labor entry");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update a posted labor (arrival) entry – times and section.
 * @param {object} data - { ID, WONo, ArrivalDateTime, DepartureDateTime, Section? }
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updatePostedArrival(data, token) {
  const res = await fetchWithAuth("/api/v1/work_order/arrivals/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update labor entry");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Update an imported labor entry.
 * @param {object} data - Full entry with ID, WONo, DateOfLabor, MechanicNo, MechanicName, Hours, LaborRateType, Section?, SaleCode?
 * @param {string} token
 * @returns {Promise<object>} Updated entry
 */
export async function updateLaborImport(data, token) {
  const res = await fetchWithAuth("/api/v1/labor/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update labor entry");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Delete an imported labor entry.
 * @param {number|string} id - Labor import ID
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function deleteLaborImport(id, token) {
  const res = await fetchWithAuth(`/api/v1/labor/import/${id}`, {
    method: "DELETE",
  }, token);
  if (!res.ok) {
    throw new Error("Failed to delete labor entry");
  }
}
