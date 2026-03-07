// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("smoke", () => {
  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveTitle(/NOVA|Sign In/i);
  });

  test("root redirects to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/sign-in/);
  });
});
