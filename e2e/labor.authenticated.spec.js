// @ts-check
/**
 * Labor module E2E tests (authenticated).
 * Uses shared mock helpers for API interception.
 */
const { test, expect } = require("@playwright/test");
const {
  mockAuthEndpoints,
  mockBranchesAndDepts,
  mockPendingLaborByBranch,
  mockTimecards,
  mockLaborApproveEndpoints,
  mockWorkOrderViewed,
} = require("./helpers/mocks");

test.describe("Labor module (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page);
    await mockWorkOrderViewed(page);
  });

  test("labor hub loads with action cards", async ({ page }) => {
    await page.goto("/labor");
    await expect(page.getByRole("heading", { name: /Labor Manager/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Approval/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Timecards/i })).toBeVisible();
  });

  test("navigate to labor approval from hub", async ({ page }) => {
    await page.goto("/labor");
    await page.getByRole("link", { name: /Approval/i }).click();
    await expect(page).toHaveURL(/\/labor\/approval/);
    await expect(page.getByRole("heading", { name: /Labor Approval/i })).toBeVisible();
  });

  test("labor approval shows table when mocked requests provided", async ({ page }) => {
    await mockBranchesAndDepts(page);
    const mockRequests = [
      {
        WONo: 3045001,
        ShipName: "Acme Equipment",
        SerialNo: "SN-123",
        Labor: [
          {
            ID: 101,
            MechanicName: "John Smith",
            DateOfLabor: "2025-03-08",
            Hours: 2.5,
            Section: "Engine",
          },
        ],
      },
    ];
    await mockPendingLaborByBranch(page, mockRequests);

    await page.goto("/labor/approval");
    await expect(page.getByRole("heading", { name: /Labor Approval/i })).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("3045001")).toBeVisible();
    await expect(page.getByText("SN-123")).toBeVisible();
  });

  test("labor approval shows empty state when no requests", async ({ page }) => {
    await mockBranchesAndDepts(page);
    await mockPendingLaborByBranch(page, []);

    await page.goto("/labor/approval");
    await expect(page.getByRole("heading", { name: /Labor Approval/i })).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/No pending labor entries/i)).toBeVisible();
  });

  test("navigate to timecards from hub", async ({ page }) => {
    await page.goto("/labor");
    await page.getByRole("link", { name: /Timecards/i }).click();
    await expect(page).toHaveURL(/\/labor\/timecards/);
    await expect(page.getByRole("heading", { name: /Timecards/i })).toBeVisible();
  });

  test("timecards shows table when mocked data provided", async ({ page }) => {
    await mockBranchesAndDepts(page);
    const mockTimecardsData = [
      {
        ID: 201,
        EmployeeName: "John Smith",
        EmployeeNumber: "E001",
        WONo: 3045001,
        DateOfLabor: "2025-03-08",
        ClockIn: "2025-03-08T08:00:00",
        ClockOut: "2025-03-08T16:30:00",
        Hours: 8.5,
        Status: "Pending",
      },
    ];
    await mockTimecards(page, mockTimecardsData);

    await page.goto("/labor/timecards");
    await expect(page.getByRole("heading", { name: /Timecards/i })).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("John Smith")).toBeVisible();
    await expect(page.getByText("3045001")).toBeVisible();
  });

  test("timecards shows empty state when no data", async ({ page }) => {
    await mockBranchesAndDepts(page);
    await mockTimecards(page, []);

    await page.goto("/labor/timecards");
    await expect(page.getByRole("heading", { name: /Timecards/i })).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByText("1: Main").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/No timecards in this date range/i)).toBeVisible();
  });
});
