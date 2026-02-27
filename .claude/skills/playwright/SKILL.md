---
model: claude-sonnet-4-6
name: playwright
description: Use when working with Playwright for E2E testing, browser automation, cross-browser testing, test generation, or visual comparison. Also use when setting up Playwright in a project, writing page object models, or debugging test failures with trace viewer.
---

# Playwright

## Overview
Playwright (v1.58, January 2026) is a cross-browser E2E testing framework by Microsoft supporting Chromium, Firefox, and WebKit with auto-waiting, network interception, and built-in test runner.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 1.58.2 (January 30, 2026) |
| **Install** | `npm init playwright@latest` |
| **Config** | `playwright.config.ts` |
| **Run Tests** | `npx playwright test` |
| **UI Mode** | `npx playwright test --ui` |
| **Codegen** | `npx playwright codegen [url]` |
| **Debug** | `npx playwright test --debug` |
| **Report** | `npx playwright show-report` |
| **Trace Viewer** | `npx playwright show-trace trace.zip` |
| **Browsers** | Chromium 145, Firefox 146, WebKit 26.0 |

## Setup

**Minimal config:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**First test:**
```typescript
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
```

## Common Operations

**Locators (prefer role-based):**
```typescript
page.getByRole('button', { name: 'Submit' });
page.getByText('Welcome');
page.getByLabel('Email');
page.getByTestId('login-form');
page.getByPlaceholder('Search...');
```

**Actions:**
```typescript
await locator.click();
await locator.fill('text');
await locator.selectOption('value');
await locator.check();
await locator.setInputFiles('file.pdf');
```

**Assertions:**
```typescript
await expect(locator).toBeVisible();
await expect(locator).toHaveText('expected');
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveScreenshot();
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `locator.type()` | Deprecated as of v1.54 -- use `locator.fill()` instead |
| Using CSS selectors over role-based locators | Prefer `getByRole()`, `getByText()`, `getByTestId()` for resilience |
| Missing `await` on actions/assertions | All Playwright actions and `expect()` assertions are async |
| Hardcoded `sleep()` / `waitForTimeout()` | Use auto-waiting: `await expect(locator).toBeVisible()` |
| Not setting `baseURL` in config | Set `use.baseURL` to avoid repeating full URLs in `page.goto()` |
| Running all browsers in CI | Use `--project=chromium` to run a single browser for speed |
| Forgetting `--with-deps` in CI | Use `npx playwright install --with-deps` for system dependencies |

## Full Reference

See `reference.md` in this skill directory for complete documentation including all locator strategies, network interception, visual comparison, authentication patterns, and CI/CD configuration.
