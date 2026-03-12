/**
 * Date validation utilities for YYYY-MM-DD strings.
 * Used by useDebouncedDateRange to avoid sending invalid dates to APIs.
 */

/**
 * Returns true if str is a valid YYYY-MM-DD date with year 1900-2100.
 * Rejects partial input (e.g. "202", "0020-01-08") that can occur while typing.
 *
 * @param {string} str - Date string to validate
 * @returns {boolean}
 */
export function isValidDateStr(str) {
  if (!str || typeof str !== "string") return false;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
