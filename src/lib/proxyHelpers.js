/**
 * Helpers for API proxy – binary response handling, etc.
 */

/** Content types that must be streamed as binary (not text) to avoid corruption */
const BINARY_TYPES = [
  "application/zip",
  "application/pdf",
  "application/octet-stream",
];

/**
 * Returns true if the response should be treated as binary.
 * Use arrayBuffer() instead of text() for these to preserve bytes.
 * @param {string} contentType - Response Content-Type header
 * @returns {boolean}
 */
export function isBinaryContentType(contentType) {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return (
    BINARY_TYPES.some((t) => lower.includes(t)) || lower.startsWith("image/")
  );
}
