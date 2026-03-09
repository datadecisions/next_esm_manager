// @ts-check
/**
 * Purchase orders authenticated tests – use storageState from auth.setup.js.
 */
const { test, expect } = require("@playwright/test");
const {
  mockAuthEndpoints,
  mockBranchesAndDepts,
  mockOpenPurchaseOrders,
  mockAllBackOrders,
} = require("./helpers/mocks");

test.beforeEach(async ({ page }) => {
  await mockAuthEndpoints(page);
});

test.describe("purchase orders (authenticated)", () => {
  test("purchase orders hub loads and shows action cards", async ({ page }) => {
    await page.goto("/purchase-orders");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/purchase-orders/);
    await expect(page.getByRole("heading", { name: "Purchase Orders", level: 1 })).toBeVisible();
    await expect(page.getByText(/create and manage purchase orders/i)).toBeVisible();

    await expect(page.getByRole("link", { name: /open purchase orders/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back ordered part requests/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /restock/i })).toBeVisible();
  });
});

test.describe("open POs (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockBranchesAndDepts(page);
  });

  test("page loads with branch/dept filter and empty table", async ({ page }) => {
    await mockOpenPurchaseOrders(page, []);

    await page.goto("/purchase-orders/open");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/purchase-orders\/open/);
    await expect(page.getByRole("heading", { name: /open purchase orders/i })).toBeVisible();

    await page.getByRole("button", { name: /branch \/ dept/i }).click();
    await page.getByText("All branches · All depts").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/no open purchase orders found/i)).toBeVisible();
  });

  test("shows table when mocked POs provided", async ({ page }) => {
    const mockPOs = [
      {
        PONo: "PO-001",
        VendorNo: "V1",
        VendorName: "Test Vendor",
        OrderDate: "2025-03-01",
        amount: 100,
        items: 3,
        VendorPromiseDate: "2025-03-15",
        Comments: "Test PO",
      },
    ];
    await mockOpenPurchaseOrders(page, mockPOs);

    await page.goto("/purchase-orders/open");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /branch \/ dept/i }).click();
    await page.getByText("All branches · All depts").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("PO-001")).toBeVisible();
    await expect(page.getByText("Test Vendor")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /po #/i })).toBeVisible();
  });
});

test.describe("back orders (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockAllBackOrders(page);
  });

  test("page loads with table and create PO button", async ({ page }) => {
    await page.goto("/purchase-orders/back-orders");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/purchase-orders\/back-orders/);
    await expect(page.getByRole("heading", { name: /back ordered part requests/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search parts/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create parts order/i })).toBeVisible();
  });

  test("table loads with mocked parts, select and create PO", async ({ page }) => {
    const mockParts = [
      {
        PartNo: "P001",
        Warehouse: "WH1",
        Description: "Test Part",
        EntryDate: "2025-03-01",
        Qty: 2,
        WOs: [{ WONo: 12345 }],
        BackorderCost: 10,
      },
    ];
    await mockAllBackOrders(page, mockParts);

    await page.goto("/purchase-orders/back-orders");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("P001")).toBeVisible();
    await expect(page.getByText("Test Part")).toBeVisible();
    await expect(page.getByRole("button", { name: /create parts order/i })).toBeVisible();

    await page.getByRole("row").filter({ hasText: "P001" }).click();
    await expect(page.getByRole("button", { name: /create parts order \(1\)/i })).toBeVisible();

    await page.getByRole("button", { name: /create parts order \(1\)/i }).click();
    await expect(page).toHaveURL(/\/purchase-orders\/new/);
  });
});
