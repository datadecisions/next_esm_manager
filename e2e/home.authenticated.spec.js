// @ts-check
/**
 * Authenticated tests – use storageState from auth.setup.js (no sign-in per test).
 * Mocks auth and work-order APIs so pages don't hit the backend.
 */
const { test, expect } = require("@playwright/test");
const { mockAuthEndpoints, mockWorkOrderViewed } = require("./helpers/mocks");

test.beforeEach(async ({ page }) => {
  await mockAuthEndpoints(page);
  await mockWorkOrderViewed(page);
});

test.describe("home (authenticated)", () => {
  test("home loads and shows main sections", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
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

  test("can navigate to labor from home", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /labor/i }).first().click();
    await expect(page).toHaveURL(/\/labor/);
  });
});
