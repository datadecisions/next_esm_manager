// @ts-check
/**
 * Authenticated tests – use storageState from auth.setup.js (no sign-in per test).
 * Mocks work-order API so pages that fetch on load don't 401 and redirect to sign-in.
 */
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/work_order/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/viewed/")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    } else {
      await route.continue();
    }
  });
});

test.describe("home (authenticated)", () => {
  test("home loads and shows main sections", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole("link", { name: /nova/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /accounting/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /parts/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /purchase orders/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /work orders/i }).first()).toBeVisible();
  });

  test("can navigate to accounting from home", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /accounting/i }).first().click();
    await expect(page).toHaveURL(/\/accounting/);
  });

  test("can navigate to parts from home", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /parts/i }).first().click();
    await expect(page).toHaveURL(/\/parts/);
  });

  test("can navigate to purchase orders from home", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /purchase orders/i }).first().click();
    await expect(page).toHaveURL(/\/purchase-orders/);
  });

  test("can navigate to work orders from home", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /work orders/i }).first().click();
    await expect(page).toHaveURL(/\/work-orders/);
  });
});
