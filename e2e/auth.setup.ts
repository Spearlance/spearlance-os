import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env'
    );
  }

  mkdirSync(dirname(authFile), { recursive: true });

  await page.goto('/auth');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();

  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
    timeout: 15_000,
  });

  await expect(page).not.toHaveURL(/\/auth/);

  await page.context().storageState({ path: authFile });
});
