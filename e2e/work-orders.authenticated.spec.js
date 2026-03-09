// @ts-check
/**
 * Work orders authenticated tests – use storageState from auth.setup.js.
 * Uses shared mock helpers for API interception.
 */
const { test, expect } = require("@playwright/test");
const {
  mockWorkOrderViewed,
  mockBranchesAndDepts,
  mockSalesCodes,
  mockCustomerForCreate,
  mockCreateWO,
  mockWorkOrderDetail,
  mockAuthEndpoints,
} = require("./helpers/mocks");

test.beforeEach(async ({ page }) => {
  await mockAuthEndpoints(page);
  await mockWorkOrderViewed(page);
});

test.describe("work orders (authenticated)", () => {
  test("work orders list loads and shows main sections", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/work-orders/);
    await expect(page.getByRole("heading", { name: "Work Orders", level: 1 })).toBeVisible();
    await expect(page.getByText(/search, create, and view work orders/i)).toBeVisible();
  });

  test("action cards are visible", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: /create work order/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /recurring orders/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /close \/ distribute orders/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /credit approval/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /workflow/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /reports dashboard/i })).toBeVisible();
  });

  test("recently viewed section loads when empty", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /recently viewed/i })).toBeVisible();
    await expect(page.getByText(/no recently viewed work orders/i)).toBeVisible();
  });

  test("recently viewed section shows mocked orders when provided", async ({ page }) => {
    const mockOrders = [
      { WONo: 12345, ShipName: "Test Customer", Status: "Open", DispositionText: "Open" },
    ];
    await mockWorkOrderViewed(page, mockOrders);

    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /recently viewed/i })).toBeVisible();
    await expect(page.getByText("12345")).toBeVisible();
    await expect(page.getByText("Test Customer")).toBeVisible();
  });

  test("search section is visible", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /search work orders/i })).toBeVisible();
  });
});

test.describe("create work order (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkOrderViewed(page);
    await mockBranchesAndDepts(page);
    await mockSalesCodes(page);
    await mockCustomerForCreate(page);
    await mockCreateWO(page);
  });

  test("create form loads and branch/dept selectors visible", async ({ page }) => {
    await page.goto("/work-orders/create");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/work-orders\/create/);
    await expect(page.getByRole("heading", { name: "Create Work Order", level: 1 })).toBeVisible();
    // Radix Select shows placeholder as text, not HTML placeholder attr
    await expect(page.getByText("Choose branch").first()).toBeVisible();
    await expect(page.getByText("Choose department").first()).toBeVisible();
    await expect(page.getByText("Select type of sale").first()).toBeVisible();
  });

  test("can select branch and department", async ({ page }) => {
    await page.goto("/work-orders/create");
    await page.waitForLoadState("networkidle");

    await page.getByText("Choose branch").first().click();
    await page.getByRole("option", { name: /1:.*Main/i }).click();

    await page.getByText("Choose department").first().click();
    await page.getByRole("option", { name: /10:.*Service/i }).click();

    await expect(page.getByRole("combobox").filter({ hasText: "Select type of sale" }).first()).not.toBeDisabled();
  });

  test("submit creates WO and redirects to WO detail", async ({ page }) => {
    await page.goto("/work-orders/create");
    await page.waitForLoadState("networkidle");

    // Branch
    await page.getByText("Choose branch").first().click();
    await page.getByRole("option", { name: /1:.*Main/i }).click();

    // Dept
    await page.getByText("Choose department").first().click();
    await page.getByRole("option", { name: /10:.*Service/i }).click();

    // Type of Sale
    await page.getByText("Select type of sale").first().click();
    await page.getByRole("option", { name: /SVC/i }).click();

    // Ship To - type and select (wait for debounced search; CustomerCombobox uses buttons)
    await page.getByPlaceholder("Search customers...").first().fill("Test");
    await page.getByRole("button", { name: /Test Customer/i }).waitFor({ state: "visible", timeout: 5000 });

    // Bill To auto-fills from Ship To via getCustomerByNum; wait for it before submitting
    const billToPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/customer/") && !res.url().includes("/search/"),
      { timeout: 5000 }
    );
    await page.getByRole("button", { name: /Test Customer/i }).click();
    await billToPromise;

    // Submit
    await page.getByRole("button", { name: /create work order/i }).click();

    await expect(page).toHaveURL(/\/work-orders\/12345/, { timeout: 10000 });
  });
});

test.describe("view work order detail (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockWorkOrderViewed(page);
    await mockWorkOrderDetail(page, 12345);
  });

  test("WO detail loads and shows WO number", async ({ page }) => {
    await page.goto("/work-orders/12345");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/work-orders\/12345/);
    await expect(page.getByRole("heading", { name: /work order #12345/i })).toBeVisible();
    await expect(page.getByText("12345")).toBeVisible();
  });

  test("tabs are visible (Line Items, Order, Dispatch, etc.)", async ({ page }) => {
    await page.goto("/work-orders/12345");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("tab", { name: /line items/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /order/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /dispatch/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /prices/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /equipment/i })).toBeVisible();
  });

  test("does not redirect to sign-in when authenticated", async ({ page }) => {
    await page.goto("/work-orders/12345");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/work-orders\/12345/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });
});
