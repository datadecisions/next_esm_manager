/**
 * Dispatch API – branches and departments.
 */

import { fetchWithAuth } from "../api";

/**
 * Get all branches.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getBranches(token) {
  const res = await fetchWithAuth("/api/v1/dispatch/branches", {}, token);
  if (!res.ok) throw new Error("Failed to fetch branches");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get departments for a branch.
 * @param {number|string} branch
 * @param {string} token
 * @returns {Promise<Array>} Array of dept objects { Branch, Dept, Title, ... }
 */
export async function getBranchDepts(branch, token) {
  const res = await fetchWithAuth(`/api/v1/dispatch/dept/${branch}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch departments");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get mechanics (technicians) for a branch.
 * @param {number|string} branch - Branch number (optional; if omitted uses default)
 * @param {string} token
 * @returns {Promise<Array>} Array of { Number, FirstName, LastName, NickName, ServiceVan, Branch, DispatchName, ... }
 */
export async function getMechanics(branch, token) {
  const path = branch ? `/api/v1/dispatch/mechanics/${branch}` : "/api/v1/dispatch/mechanics";
  const res = await fetchWithAuth(path, {}, token);
  if (!res.ok) throw new Error("Failed to fetch mechanics");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get quotes for workflow approval (Disposition=11, PaperWorkComplete=1).
 * @param {{ branch?: string|number; dept?: string|number }} params - Use "null" for all
 * @param {string} token
 * @returns {Promise<Array>} Quotes with quoteWorkflows
 */
export async function getQuotesForWorkflow(params, token) {
  const branch = params?.branch ?? "null";
  const dept = params?.dept ?? "null";
  const res = await fetchWithAuth(
    `/api/v1/dispatch/quotes/${dept}/${branch}`,
    {},
    token
  );
  if (!res.ok) throw new Error("Failed to fetch quotes");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Set workflow active/approved state.
 * @param {{ woNo: string|number; typeId: number; active: boolean; employee?: string|object }} data
 * @param {string} token
 */
export async function setQuoteWorkflowActive(data, token) {
  const res = await fetchWithAuth("/api/v1/dispatch/quotes/workflow/active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update workflow");
  }
}

/**
 * Approve workflow (set status date and approver).
 * @param {{ id: number; name: string }} data
 * @param {string} token
 */
export async function approveQuoteWorkflow(data, token) {
  const res = await fetchWithAuth("/api/v1/dispatch/quotes/workflow/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to approve");
  }
}
