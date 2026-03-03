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
