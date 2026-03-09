// @ts-check
/**
 * Auth setup – signs in with mocked API and saves storageState for authenticated tests.
 * Runs once before the "authenticated" project. Creates e2e/.auth/state.json.
 */
const { test, expect } = require("@playwright/test");
const path = require("path");

const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");

test.describe("auth setup", () => {
  test("sign in and save storage state", async ({ page }) => {
    const userPayload = { name: "Test User", fullName: "Test User", username: "testuser" };
    await page.route("**/api/auth/login", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.username && postData?.password) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Signed in",
            name: "Test User",
            username: "testuser",
          }),
        });
        // Proxy checks auth_token; add cookies explicitly so they persist in storageState
        await page.context().addCookies([
          {
            name: "auth_token",
            value: "test-token",
            domain: "localhost",
            path: "/",
          },
          {
            name: "auth_refresh_token",
            value: "test-refresh-token",
            domain: "localhost",
            path: "/",
          },
          {
            name: "auth_user",
            value: encodeURIComponent(JSON.stringify(userPayload)),
            domain: "localhost",
            path: "/",
          },
        ]);
      } else {
        await route.continue();
      }
    });

    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Username").fill("testuser");
    await page.getByPlaceholder("Password").fill("testpass");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });

    await page.context().storageState({ path: AUTH_STATE_PATH });
  });
});
