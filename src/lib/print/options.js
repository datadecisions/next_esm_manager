/**
 * Default options for PDF generation (Playwright page.pdf()).
 * Shared across all document types; can be overridden per request.
 */

export const defaultPdfOptions = {
  format: "A4",
  printBackground: true,
  margin: {
    top: "16mm",
    right: "12mm",
    bottom: "16mm",
    left: "12mm",
  },
};
