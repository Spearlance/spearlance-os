import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

// Logs in once against the dev project and persists storageState for all tests.
setup("authenticate", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set");
  }

  await page.goto("/auth");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  // Successful login routes away from /auth.
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
  await page.context().storageState({ path: authFile });
});
