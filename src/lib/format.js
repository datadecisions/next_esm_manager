/**
 * Shared formatting utilities. Used across components for consistent display.
 */

/**
 * Format a value as USD currency.
 * @param {number|string|null|undefined} n
 * @returns {string} Formatted currency or "—" for invalid/empty
 */
export function formatCurrency(n) {
  if (n == null || n === "") return "—";
  const num = parseFloat(n);
  return isNaN(num)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

/**
 * Format a date for display (e.g. "Jan 1, 2025").
 * @param {Date|string|number|null|undefined} d
 * @returns {string} Formatted date or "—" for invalid/empty
 */
export function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Format account for combobox display (e.g. "1100001: Cash").
 * @param {{ AccountNo?: string; Description?: string }|null|undefined} acc
 * @returns {string}
 */
export function formatAccountDisplay(acc) {
  if (!acc) return "";
  return `${acc.AccountNo ?? ""}: ${acc.Description ?? ""}`.trim();
}

/**
 * Extract warehouse value from API response object.
 * @param {{ WebWarehouse?: string; Warehouse?: string }|string|null|undefined} w
 * @returns {string}
 */
export function getWarehouseValue(w) {
  return String(w?.WebWarehouse ?? w?.Warehouse ?? w ?? "");
}

/**
 * Build inventory count ID from warehouse and current date.
 * Format: warehouse + month (1-12) + year (e.g. "Main32025").
 * @param {string} warehouse
 * @param {Date} [refDate] - Reference date (defaults to now)
 * @returns {string} Inventory ID or "" if warehouse is empty
 */
export function buildInventoryId(warehouse, refDate = new Date()) {
  if (!warehouse?.trim()) return "";
  const month = (refDate.getMonth() + 1).toString();
  const year = refDate.getFullYear().toString();
  return `${warehouse.trim()}${month}${year}`;
}
