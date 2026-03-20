# Print / PDF generation

HTML/CSS → PDF via headless browser (Playwright). One pipeline for all document types.

## Folder structure

| Location | Purpose |
|----------|--------|
| **`src/lib/print/`** | Shared PDF generation: `generatePdf()`, default options. Used by all document types. |
| **`src/app/print/<type>/[id]/page.js`** | Print-view pages (e.g. work order, work-order-parts). Server-rendered; auth via cookie. Playwright opens these URLs to capture PDF. |
| **`src/app/api/print/<type>/[id]/route.js`** | API routes that run Playwright, open the print page with auth cookies, and return the PDF. |
| **`src/components/print/`** | Shared print UI: `PrintDocumentLayout`, and per-type content (e.g. `WorkOrderPrint.jsx`). Reuse layout for consistent margins, headers, footers. |
| **`src/hooks/use-print-pdf.js`** | Hook: call print API, loading state, download or open in new tab. Use from any feature page. |

## Notes

- Print pages are server components; they read `cookies()` and fetch from the backend with that token.
- The API route forwards the request’s cookies to Playwright so the print page loads authenticated.
- For serverless (e.g. Vercel), Playwright’s browser binary may require a custom runtime or an external PDF service; this layout still applies.
