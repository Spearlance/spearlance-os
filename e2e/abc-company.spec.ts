import { test, expect } from '@playwright/test';

const ABC_COMPANY = 'ABC Company';

test.describe('ABC Company — read-only smoke', () => {
  test('app shell loads after auth', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('body')).toBeVisible();

    const realErrors = consoleErrors.filter(
      (e) =>
        !/favicon|404/i.test(e) &&
        !/minified code outside of NODE_ENV/i.test(e) &&
        !/forwardRef render functions/i.test(e) &&
        !/Warning:/i.test(e)
    );
    expect(realErrors).toEqual([]);
  });

  test('can navigate to ABC Company', async ({ page }) => {
    await page.goto('/');

    const abcLink = page.getByRole('link', { name: new RegExp(ABC_COMPANY, 'i') }).first();
    const abcButton = page.getByRole('button', { name: new RegExp(ABC_COMPANY, 'i') }).first();
    const abcText = page.getByText(new RegExp(ABC_COMPANY, 'i')).first();

    const found = await Promise.race([
      abcLink.waitFor({ timeout: 10_000 }).then(() => 'link').catch(() => null),
      abcButton.waitFor({ timeout: 10_000 }).then(() => 'button').catch(() => null),
      abcText.waitFor({ timeout: 10_000 }).then(() => 'text').catch(() => null),
    ]);

    expect(found, `Could not find "${ABC_COMPANY}" on the home page`).not.toBeNull();
  });

  test('Analytics page loads', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('body')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /analytics/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // Helper: wait for /analytics to reach a stable terminal state — either the
  // Optimization tab is visible OR one of the three gating empty-states appears.
  async function waitForAnalyticsTerminalState(page: import('@playwright/test').Page) {
    const TIMEOUT = 20_000;
    const tab = page.getByRole('tab', { name: /optimization/i }).first();
    const gateWebsite = page.getByRole('heading', {
      name: /Analytics Available with Website/i,
    });
    const gateClarity = page.getByRole('heading', {
      name: /Connect Microsoft Clarity/i,
    });
    const gateData = page.getByRole('heading', { name: /Waiting for Data/i });

    return await Promise.race([
      tab.waitFor({ timeout: TIMEOUT }).then(() => 'tab' as const).catch(() => null),
      gateWebsite
        .waitFor({ timeout: TIMEOUT })
        .then(() => 'gate-website' as const)
        .catch(() => null),
      gateClarity
        .waitFor({ timeout: TIMEOUT })
        .then(() => 'gate-clarity' as const)
        .catch(() => null),
      gateData
        .waitFor({ timeout: TIMEOUT })
        .then(() => 'gate-data' as const)
        .catch(() => null),
    ]);
  }

  test('Analytics → Optimization tab is reachable (new in v3)', async ({ page }) => {
    await page.goto('/analytics');
    const state = await waitForAnalyticsTerminalState(page);

    if (state === 'gate-website') {
      test.skip(true, 'BLOCKED: client lacks website_unlocked=true');
      return;
    }
    if (state === 'gate-clarity') {
      test.skip(
        true,
        'BLOCKED: Microsoft Clarity is not configured for this client (Settings → Integrations)'
      );
      return;
    }
    if (state === 'gate-data') {
      test.skip(true, 'BLOCKED: Clarity is configured but has not synced data yet');
      return;
    }

    expect(state, 'Page reached neither tab nor a known gate state').toBe('tab');
  });

  test('Optimization tab content actually renders when clicked', async ({ page }) => {
    await page.goto('/analytics');
    const state = await waitForAnalyticsTerminalState(page);

    if (state !== 'tab') {
      test.skip(true, `BLOCKED: terminal state was "${state ?? 'unknown'}", not "tab"`);
      return;
    }

    const optimizationTab = page.getByRole('tab', { name: /optimization/i }).first();
    await optimizationTab.click();

    await expect(optimizationTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 5_000,
    });

    await page.screenshot({
      path: 'e2e/.screenshots/optimization-tab.png',
      fullPage: true,
    });

    const tabPanel = page.getByRole('tabpanel').filter({ hasText: /.+/ }).first();
    await expect(tabPanel).toBeVisible({ timeout: 5_000 });
  });
});
