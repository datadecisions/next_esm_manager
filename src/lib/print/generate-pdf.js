/**
 * Generate PDF from a print-view URL using Playwright (Chromium).
 * Used by API routes under src/app/api/print/*.
 *
 * @param {object} opts
 * @param {string} opts.url - Full URL of the print page (e.g. https://app.example.com/print/work-order/123)
 * @param {Array<{ name: string; value: string; domain?: string; path?: string }>} [opts.cookies] - Cookies to set in the browser context (e.g. auth_token)
 * @param {import('playwright').PDFOptions} [opts.pdfOptions] - Override default PDF options
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePdf({ url, cookies = [], pdfOptions = {} }) {
  const { chromium } = await import("playwright");
  const { defaultPdfOptions } = await import("./options.js");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    if (cookies.length > 0) {
      const parsed = cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain ?? new URL(url).hostname,
        path: c.path ?? "/",
      }));
      await context.addCookies(parsed);
    }

    const page = await context.newPage();
    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      const buffer = await page.pdf({
        ...defaultPdfOptions,
        ...pdfOptions,
      });
      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
