// @ts-check
const { test, expect } = require("@playwright/test");

/** Helper to sign in with mocked API - leaves user on /home */
async function signIn(page) {
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

  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Username").fill("testuser");
  await page.getByPlaceholder("Password").fill("testpass");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
}

test.describe("auth flow", () => {
  test.describe("sign-out", () => {
    test("redirects to sign-in after signing out", async ({ page }) => {
      await signIn(page);

      await page.getByRole("button", { name: /sign out/i }).click();

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 5000 });
      await expect(page.getByPlaceholder("Username")).toBeVisible();
    });

    test("cannot access protected route after sign-out", async ({ page }) => {
      await signIn(page);
      await page.getByRole("button", { name: /sign out/i }).click();
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 5000 });

      await page.goto("/parts");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/sign-in/);
    });
  });

  test.describe("protected route redirect", () => {
    test("redirects to sign-in when visiting /parts unauthenticated", async ({ page }) => {
      await page.goto("/parts");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/sign-in/);
      await expect(page.getByPlaceholder("Username")).toBeVisible();
    });

    test("redirects to sign-in when visiting /work-orders unauthenticated", async ({ page }) => {
      await page.goto("/work-orders");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("redirects to sign-in when visiting /accounting unauthenticated", async ({ page }) => {
      await page.goto("/accounting");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/sign-in/);
    });

    test("redirects to sign-in when visiting /purchase-orders unauthenticated", async ({ page }) => {
      await page.goto("/purchase-orders");
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/sign-in/);
    });
  });
});
