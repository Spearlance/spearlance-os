---
model: claude-sonnet-4-6
name: visual-regression
description: Use when setting up visual regression testing, screenshot comparison, or visual CI pipelines. Covers Playwright toHaveScreenshot(), Chromatic for Storybook, Argos CI, and Lost Pixel. Also use when debugging screenshot flakiness or configuring visual testing in Docker CI.
---

# Visual Regression Testing

Catch UI changes before they ship. Screenshot comparison that fails the build when pixels drift.

**Version:** Playwright 1.50+ · Chromatic 11+ · Argos @argos-ci/playwright 6.1.3 (February 2026)

## Decision Tree

| Scenario | Tool | Why |
|----------|------|-----|
| Already have Playwright tests | Playwright `toHaveScreenshot()` | Free, built-in, zero extra deps |
| Storybook-heavy project | Chromatic | Native Storybook integration, visual review UI |
| Open source project | Chromatic (free unlimited) or Argos | Both offer free OSS tiers |
| Self-hosted requirement | Lost Pixel Engine | Fully self-hosted, no cloud dependency |
| Playwright + cloud review UI | Argos CI | Wraps Playwright with better defaults + PR review |
| Budget-conscious, no Storybook | Playwright built-in | $0 — just needs Docker for CI consistency |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Playwright Quick Setup

**Install:**
```bash
npm i -D @playwright/test
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
});
```

**Test:**
```typescript
import { test, expect } from '@playwright/test';

test('homepage matches snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    mask: [page.locator('.ad-banner')],
  });
});
```

**Generate baselines:**
```bash
npx playwright test --update-snapshots
```

Snapshots land in `[testfile].spec.ts-snapshots/` with browser+platform in filename.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| macOS baseline fails Linux CI | Run baseline generation inside the same Docker image used in CI |
| `threshold: 0` — every run fails | Start at `0.2` — tune down only after Docker consistency is established |
| Screenshots of animated elements | Always set `animations: 'disabled'` in config |
| Timestamps, avatars, ads in frame | Use `mask` option to cover volatile regions |
| Snapshot stored without browser tag | Playwright auto-includes platform — never rename snapshots manually |
| Headless vs headed rendering differs | Lock to `--project=chromium` and headless mode in CI |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Pricing (February 2026)

**Playwright** — free, self-managed snapshots in repo

**Chromatic:**
- Free: 5,000 snapshots/month (commercial), unlimited (qualifying OSS)
- Starter: $179/mo — 35K snapshots
- Pro: $399/mo — 85K snapshots, $0.008/extra
- Enterprise: custom

**Argos CI** — free tier for open source, paid plans for private repos

**Lost Pixel** — open source engine free, Platform SaaS has paid tiers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Full Reference

See `reference.md` for: complete `toHaveScreenshot()` API, element screenshots, full-page screenshots, Docker CI setup (the #1 gotcha), Chromatic setup + TurboSnap, Argos CI integration, Lost Pixel self-hosted, snapshot management workflows, cross-browser strategies, and debugging flaky screenshots.
