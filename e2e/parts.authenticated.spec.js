// @ts-check
/**
 * Parts authenticated tests – use storageState from auth.setup.js.
 * Uses shared mock helpers for API interception.
 */
const { test, expect } = require("@playwright/test");
const {
  mockAuthEndpoints,
  mockPartsSearch,
  mockAssemblies,
  mockCreateAssembly,
  mockBranchesAndDepts,
  mockRequestedPartsByBranch,
} = require("./helpers/mocks");

test.beforeEach(async ({ page }) => {
  await mockAuthEndpoints(page);
});

test.describe("parts (authenticated)", () => {
  test("parts hub loads and shows main sections", async ({ page }) => {
    await page.goto("/parts");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/parts/);
    await expect(page.getByRole("heading", { name: "Parts Manager", level: 1 })).toBeVisible();
    await expect(page.getByText(/search for parts, manage inventory/i)).toBeVisible();
  });

  test("action cards are visible", async ({ page }) => {
    await page.goto("/parts");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: /kpi dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /approval/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /inventory tables/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /transfer/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /receive/i })).toBeVisible();
    await expect(page.locator("a[href='/parts/count']")).toBeVisible();
    await expect(page.getByRole("link", { name: /assembly/i })).toBeVisible();
    await expect(page.locator("a[href='/parts/warehouse']")).toBeVisible();
    await expect(page.getByRole("link", { name: /upload prices/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /scan/i })).toBeVisible();
  });

  test("search section is visible", async ({ page }) => {
    await page.goto("/parts");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /search parts/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search by part/i)).toBeVisible();
  });

  test("search returns mocked results when user types", async ({ page }) => {
    const mockParts = [
      { PartNo: "P001", Description: "Test Part A", VendorNo: "V1" },
      { PartNo: "P002", Description: "Test Part B", VendorNo: "V1" },
    ];
    await mockPartsSearch(page, mockParts);

    await page.goto("/parts");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder(/search by part/i).fill("Test");
    await page.getByRole("button", { name: /test part a/i }).waitFor({ state: "visible", timeout: 5000 });
    await expect(page.getByRole("button", { name: /test part a/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /test part b/i })).toBeVisible();
  });
});

test.describe("create assembly (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockAssemblies(page);
    await mockCreateAssembly(page);
  });

  test("assembly list loads and shows empty state", async ({ page }) => {
    await page.goto("/parts/assembly");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/parts\/assembly/);
    await expect(page.getByRole("heading", { name: /assembly \(bom\)/i })).toBeVisible();
    await expect(page.getByText(/there are no assemblies yet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create/i })).toBeVisible();
  });

  test("create button opens dialog with Model and Name fields", async ({ page }) => {
    await page.goto("/parts/assembly");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /create/i }).click();

    await expect(page.getByRole("dialog", { name: /create assembly/i })).toBeVisible();
    await expect(page.getByLabel(/model/i)).toBeVisible();
    await expect(page.getByLabel(/assembly name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /add assembly/i })).toBeVisible();
  });

  test("submit creates assembly and closes dialog", async ({ page }) => {
    await page.goto("/parts/assembly");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByRole("dialog", { name: /create assembly/i })).toBeVisible();

    await page.getByLabel(/assembly name/i).fill("Test Assembly");
    await page.getByRole("button", { name: /add assembly/i }).click();

    await expect(page.getByRole("dialog", { name: /create assembly/i })).not.toBeVisible();
  });
});

test.describe("parts approval (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockBranchesAndDepts(page);
    await mockRequestedPartsByBranch(page);
  });

  test("approval page loads with branch selector", async ({ page }) => {
    await page.goto("/parts/approval");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/parts\/approval/);
    await expect(page.getByRole("heading", { name: /parts approval/i })).toBeVisible();
    await expect(page.getByText(/approve work order parts requests/i)).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
    await expect(page.getByPlaceholder(/search work orders/i)).toBeVisible();
  });

  test("shows empty state when no requested parts", async ({ page }) => {
    await page.goto("/parts/approval");
    await page.waitForLoadState("networkidle");

    await page.getByRole("combobox").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/there are no work orders requesting parts/i)).toBeVisible();
  });

  test("shows table when mocked requests provided", async ({ page }) => {
    const mockRequests = [
      {
        WONo: 12345,
        ShipName: "Test Customer",
        SerialNo: "SN001",
        UnitNo: "U001",
        DispatchedDate: "2025-03-01",
        Parts: [{ UniqueField: "P1", PartNo: "PART001", Description: "Test Part", Qty: 1 }],
      },
    ];
    await mockRequestedPartsByBranch(page, mockRequests);

    await page.goto("/parts/approval");
    await page.waitForLoadState("networkidle");

    await page.getByRole("combobox").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("12345")).toBeVisible();
    await expect(page.getByText("SN001")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /parts requested/i })).toBeVisible();
  });
});
