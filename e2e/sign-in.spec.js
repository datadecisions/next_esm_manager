// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("sign-in flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
  });

  test("shows error when credentials are invalid", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Invalid username or password",
          attemptsRemaining: 4,
        }),
      });
    });

    await page.getByPlaceholder("Username").fill("wronguser");
    await page.getByPlaceholder("Password").fill("wrongpass");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("redirects to home after successful sign-in", async ({ page }) => {
    const userPayload = { name: "Test User", fullName: "Test User", username: "testuser" };
    await page.route("**/api/auth/login", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.username && postData?.password) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Set-Cookie":
              "auth_token=test-token; path=/; max-age=604800; SameSite=Lax; HttpOnly",
          },
          body: JSON.stringify({
            success: true,
            message: "Signed in",
            name: "Test User",
            username: "testuser",
          }),
        });
        await page.context().addCookies([
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

    await page.getByPlaceholder("Username").fill("testuser");
    await page.getByPlaceholder("Password").fill("testpass");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
    await expect(page.getByRole("link", { name: /nova/i })).toBeVisible();
  });

  test("shows loading state while signing in", async ({ page }) => {
    let resolveLogin;
    const loginPromise = new Promise((r) => {
      resolveLogin = r;
    });

    await page.route("**/api/auth/login", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.username && postData?.password) {
        await loginPromise;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Failed" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByPlaceholder("Username").fill("user");
    await page.getByPlaceholder("Password").fill("pass");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("button", { name: /signing in/i })).toBeVisible();
    resolveLogin();
  });
});
