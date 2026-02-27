# Visual Regression Testing — Full Reference

> **Last Verified:** February 2026
> **Tools:** Playwright 1.50+ · Chromatic 11+ · @argos-ci/playwright 6.1.3 · Lost Pixel (OSS)

---

## Table of Contents

1. [Playwright Visual Comparisons](#playwright-visual-comparisons)
2. [Docker CI for Consistent Rendering](#docker-ci-for-consistent-rendering)
3. [Chromatic](#chromatic)
4. [Argos CI](#argos-ci)
5. [Lost Pixel](#lost-pixel)
6. [Snapshot Management](#snapshot-management)
7. [Cross-Browser Strategies](#cross-browser-strategies)
8. [Common Mistakes and Debugging](#common-mistakes-and-debugging)

---

## Playwright Visual Comparisons

`toHaveScreenshot()` is built directly into `@playwright/test`. No extra packages required.

### Full API

```typescript
// Full-page screenshot
await expect(page).toHaveScreenshot('name.png', options);

// Element-scoped screenshot
await expect(page.locator('.hero')).toHaveScreenshot('hero.png', options);
```

### All Options

```typescript
await expect(page).toHaveScreenshot('name.png', {
  // Pixel-level tolerance (pick one or combine)
  maxDiffPixels: 100,          // absolute count of differing pixels
  maxDiffPixelRatio: 0.05,     // 5% of total pixels may differ
  threshold: 0.2,              // per-pixel color distance (0=strict, 1=lax)

  // Stability
  animations: 'disabled',      // freeze CSS/JS animations (strongly recommended)

  // Dynamic content suppression
  mask: [
    page.locator('.ad-banner'),
    page.locator('[data-testid="timestamp"]'),
  ],                           // masked regions fill with magenta by default
  maskColor: '#00ff00',        // override mask fill color

  // CSS injection for volatile elements
  stylePath: './tests/hide-animations.css',

  // Viewport
  fullPage: true,              // capture full scrollable page (default: false)
  clip: { x: 0, y: 0, width: 1280, height: 720 },

  // Scale
  scale: 'css',                // 'css' (default) or 'device' (hi-DPI)
  omitBackground: false,       // transparent background for element screenshots
});
```

### Global Config in playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
    // Capture on failure for debugging
    screenshot: 'only-on-failure',
  },
  expect: {
    // Applied to every toHaveScreenshot() call unless overridden locally
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
});
```

### Snapshot Storage

Snapshots are stored next to the test file in:
```
tests/
  homepage.spec.ts
  homepage.spec.ts-snapshots/
    homepage-chromium-linux.png
    homepage-firefox-linux.png
    homepage-chromium-darwin.png
```

Filename format: `<snapshot-name>-<browser>-<platform>.png`

Commit snapshot directories to version control. They are the source of truth.

### Generating and Updating Baselines

```bash
# Generate initial baselines (first run — fails if no baseline exists)
npx playwright test --update-snapshots

# Update after intentional UI change
npx playwright test --update-snapshots

# Update single test
npx playwright test homepage.spec.ts --update-snapshots

# Update specific project (browser)
npx playwright test --project=chromium --update-snapshots
```

### Element vs Page Screenshots

```typescript
// Full page — entire scrollable content
await expect(page).toHaveScreenshot('full.png', { fullPage: true });

// Viewport only (default)
await expect(page).toHaveScreenshot('viewport.png');

// Single element — tight crop around the component
const button = page.getByRole('button', { name: 'Subscribe' });
await expect(button).toHaveScreenshot('subscribe-btn.png');

// Clipped region
await expect(page).toHaveScreenshot('header.png', {
  clip: { x: 0, y: 0, width: 1280, height: 80 },
});
```

---

## Docker CI for Consistent Rendering

This is the #1 gotcha in visual regression testing.

### Why Screenshots Differ Across Environments

Browser rendering is not pixel-deterministic across:
- **Operating systems** — macOS and Linux Chromium produce different subpixel antialiasing
- **Chromium versions** — even a minor version bump can shift font hinting or shadow rendering
- **Headless mode** — `headless: true` uses a different rendering pipeline than headed
- **Hardware/GPU** — GPU acceleration changes compositing behavior
- **DPI/scale** — `deviceScaleFactor` differences alter pixel density

**Result:** A snapshot generated on a developer's MacBook will fail on Linux CI — always.

### The Fix: Generate Baselines in the Same Docker Image Used in CI

```dockerfile
# Use the official Playwright image that matches your installed version
FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
```

### GitHub Actions with Docker

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression

on:
  push:
    branches: [main]
  pull_request:

jobs:
  visual-test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble

    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run visual regression tests
        run: npx playwright test --project=chromium

      - name: Upload failure artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-regression-failures
          path: test-results/
          retention-days: 7
```

### Generating Baselines Inside Docker (Local)

```bash
# Pull the image that matches your playwright version
docker pull mcr.microsoft.com/playwright:v1.50.0-noble

# Run snapshot generation inside the container
docker run --rm \
  -v $(pwd):/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.50.0-noble \
  npx playwright test --update-snapshots --project=chromium
```

### Finding the Correct Image Tag

Match the image tag to your installed `@playwright/test` version:

```bash
# Check your installed version
npx playwright --version
# → Version 1.50.0

# Image: mcr.microsoft.com/playwright:v1.50.0-noble
```

Available tags: `mcr.microsoft.com/playwright:v<VERSION>-noble` (Ubuntu Noble) or `-jammy` (Ubuntu Jammy).

### macOS-Only Development Workflow

If your team only runs visual tests in CI (not locally), document this in your README:

```markdown
## Visual Regression Tests

Baselines are generated on Linux (Ubuntu Noble) inside the official Playwright Docker image.
Do NOT run `--update-snapshots` locally on macOS — it will overwrite Linux baselines with
macOS-rendered snapshots that will always fail in CI.

To update baselines:
  docker run --rm -v $(pwd):/work -w /work \
    mcr.microsoft.com/playwright:v1.50.0-noble \
    npx playwright test --update-snapshots --project=chromium
```

---

## Chromatic

Best for Storybook-heavy projects. Visual review UI, PR integration, and TurboSnap for incremental testing.

### Pricing (February 2026)

| Plan | Snapshots/mo | Price |
|------|-------------|-------|
| Free | 5,000 (commercial), unlimited (qualifying OSS) | $0 |
| Starter | 35,000 | $179/mo |
| Pro | 85,000 | $399/mo |
| Enterprise | Custom | Custom |
| Extra snapshots (Pro) | — | $0.008 each |

14-day free trial, no credit card required.

### Setup

```bash
npm i -D chromatic
```

```bash
# Run Chromatic (generates project token on first run at chromatic.com)
npx chromatic --project-token=<your-project-token>
```

Set `CHROMATIC_PROJECT_TOKEN` as a repo secret and never hardcode it.

### GitHub Actions Integration

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # TurboSnap requires full git history

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npm run build-storybook

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook
          # Enable TurboSnap for incremental testing
          onlyChanged: true
```

### TurboSnap

TurboSnap tests only stories that are affected by changed files. Requires `fetch-depth: 0` in checkout so git history is available for diff analysis.

```yaml
- uses: chromaui/action@latest
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    onlyChanged: true           # TurboSnap — only test changed stories
    externals: 'public/**'      # Re-test all when these files change
```

### Review Workflow

1. Chromatic runs on PR and captures current stories
2. Any visual change triggers a review request
3. Reviewer approves or denies changes at chromatic.com/review
4. Approved changes become the new baseline

### package.json Script

```json
{
  "scripts": {
    "chromatic": "chromatic --project-token=$CHROMATIC_PROJECT_TOKEN"
  }
}
```

---

## Argos CI

Cloud visual review for Playwright (and Cypress). Wraps the Playwright screenshot API with better defaults and PR annotations.

### When to Choose Argos Over Chromatic

| Situation | Choice |
|-----------|--------|
| No Storybook — full page/component Playwright tests | Argos |
| Storybook is central to the workflow | Chromatic |
| Open source project | Both have free tiers — either works |
| Want Playwright-native workflow | Argos |

### Setup

```bash
npm i @argos-ci/playwright
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@argos-ci/playwright/reporter'],  // Add Argos reporter
  ],
  use: {
    screenshot: 'only-on-failure',
  },
});
```

Set the `ARGOS_TOKEN` environment variable (get from argos-ci.com dashboard).

### Test with Argos Screenshot API

```typescript
import { test } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';

test('homepage visual', async ({ page }) => {
  await page.goto('/');
  // argosScreenshot handles stabilization, masking, and upload automatically
  await argosScreenshot(page, 'homepage');
});
```

`argosScreenshot` automatically:
- Waits for network idle
- Disables animations
- Hides scrollbars
- Uploads to Argos platform

### GitHub Actions

```yaml
# .github/workflows/argos.yml
name: Argos Visual Testing

on: [push, pull_request]

jobs:
  visual:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run Playwright tests
        env:
          ARGOS_TOKEN: ${{ secrets.ARGOS_TOKEN }}
        run: npx playwright test
```

---

## Lost Pixel

Fully open source visual regression. Self-hosted — no cloud required. GitHub: `github.com/lost-pixel/lost-pixel`

### When to Use

- Self-hosted is a hard requirement (compliance, air-gapped environments)
- No budget for cloud services
- Storybook, Ladle, or Histoire component catalog testing

### Supported Modes

| Mode | What It Tests |
|------|--------------|
| Storybook | All stories rendered via Storybook server |
| Ladle | All Ladle stories |
| Histoire | All Histoire stories |
| Page screenshots | Full page URLs (Playwright or Puppeteer) |
| Custom screenshots | Bring your own screenshots from Cypress/Playwright |

### GitHub Action Setup

```yaml
# .github/workflows/lost-pixel.yml
name: Lost Pixel Visual Regression

on: [push, pull_request]

jobs:
  lost-pixel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Lost Pixel
        uses: lost-pixel/lost-pixel@v3
        env:
          LOST_PIXEL_API_KEY: ${{ secrets.LOST_PIXEL_API_KEY }}  # Platform only; OSS needs none
```

### lost-pixel.config.ts (Storybook mode)

```typescript
import { CustomProjectConfig } from 'lost-pixel';

export const config: CustomProjectConfig = {
  storybookShots: {
    storybookUrl: 'http://localhost:6006',
  },
  generateOnly: true,          // OSS engine: store locally, no cloud upload
  lostPixelProjectId: 'your-project-id',
  apiKey: process.env.LOST_PIXEL_API_KEY,
};
```

### lost-pixel.config.ts (Page Screenshots mode)

```typescript
import { CustomProjectConfig } from 'lost-pixel';

export const config: CustomProjectConfig = {
  pageShots: {
    pages: [
      { path: '/', name: 'home' },
      { path: '/about', name: 'about' },
      { path: '/pricing', name: 'pricing' },
    ],
    baseUrl: 'http://localhost:3000',
    browserConfig: { viewport: { width: 1280, height: 720 } },
  },
  generateOnly: true,
};
```

### OSS Engine (No Cloud)

Use `generateOnly: true` and commit baseline images. The action fails if any snapshot differs from baseline. No external service required.

```bash
# Generate initial baselines
npx lost-pixel update
```

---

## Snapshot Management

### Baseline Update Workflow

```
1. Make intentional UI change
2. Confirm change is correct in browser
3. Run tests → expect failures (expected)
4. Review diff images in test-results/
5. If diffs are correct → update-snapshots
6. Commit updated baseline images alongside the code change
```

```bash
# Review what changed before accepting
npx playwright test --update-snapshots --dry-run  # (shows which snapshots would update)

# Accept all changes
npx playwright test --update-snapshots

# Accept changes for one test file
npx playwright test homepage.spec.ts --update-snapshots
```

### Where Baselines Live

Commit snapshot directories. They are part of the codebase:

```
src/
  components/
    Button/
      Button.spec.ts
      Button.spec.ts-snapshots/        ← commit these
        button-primary-chromium-linux.png
        button-secondary-chromium-linux.png
```

`.gitignore` should NOT exclude snapshot directories.

### Threshold Tuning Strategy

Start permissive, tighten over time once Docker consistency is established:

```typescript
// Phase 1: Getting started (permissive)
toHaveScreenshot: { maxDiffPixelRatio: 0.10, threshold: 0.3 }

// Phase 2: Stable Docker baseline (moderate)
toHaveScreenshot: { maxDiffPixelRatio: 0.05, threshold: 0.2 }

// Phase 3: High-confidence CI (strict)
toHaveScreenshot: { maxDiffPixels: 50, threshold: 0.1 }
```

### Per-Test Threshold Override

```typescript
test('critical checkout button — zero tolerance', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByTestId('checkout-button')).toHaveScreenshot('checkout-btn.png', {
    maxDiffPixels: 0,
    threshold: 0,
  });
});
```

### Ignoring Dynamic Regions

```typescript
// Mask with locators — these regions are filled with magenta and ignored
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('[data-testid="live-chat"]'),
    page.locator('.timestamp'),
    page.locator('[class*="ad-"]'),
    page.locator('iframe'),
  ],
});
```

Or inject CSS to hide volatile elements:

```css
/* tests/hide-volatile.css */
[data-testid="live-chat"],
.timestamp,
iframe,
[class*="ad-"] {
  visibility: hidden !important;
}
```

```typescript
await expect(page).toHaveScreenshot('page.png', {
  stylePath: './tests/hide-volatile.css',
});
```

---

## Cross-Browser Strategies

### Separate Snapshot Sets Per Browser

Playwright stores browser name in the snapshot filename automatically:
```
homepage-chromium-linux.png
homepage-firefox-linux.png
homepage-webkit-linux.png
```

No manual configuration needed — just run tests for each project.

### When to Test Multiple Browsers

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Recommendation:** Run visual tests on Chromium only in CI unless Safari/Firefox rendering bugs are a documented customer issue. Multi-browser visual testing doubles or triples snapshot storage and review burden.

### Mobile Viewports

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
```

Mobile snapshots get device name in filename:
```
homepage-mobile-chrome-linux.png
```

### Targeting Visual Tests to Specific Projects

```bash
# Only run visual tests in Chromium (faster CI)
npx playwright test --project=chromium visual.spec.ts

# Run in all projects
npx playwright test visual.spec.ts
```

---

## Common Mistakes and Debugging

### Flaky Screenshots

**Symptom:** Test passes locally, fails in CI, or fails intermittently.

| Cause | Diagnosis | Fix |
|-------|-----------|-----|
| OS rendering difference | Diff shows subpixel or font shifts | Generate baselines in Docker |
| Animations not settled | Diff shows blurred or mid-transition state | Set `animations: 'disabled'` |
| Network-loaded images | Images blank or partially loaded | Add `waitForLoadState('networkidle')` before screenshot |
| Dynamic content (timestamps, ads) | Diff shows text differences | Use `mask` or `stylePath` |
| Viewport mismatch | Layout shifts in diff | Lock viewport in config: `{ width: 1280, height: 720 }` |
| Font loading | Text renders differently | Preload fonts or use `waitForLoadState` |

### Debugging Diff Output

Failed screenshots generate three files in `test-results/`:
```
test-results/
  homepage-test-1/
    actual.png     ← what the test captured
    expected.png   ← stored baseline
    diff.png       ← magenta highlights on differing pixels
```

Always inspect `diff.png` before deciding whether to update snapshots or fix the code.

```bash
# Open all diff images (macOS)
open test-results/**/diff.png
```

### Animation Timing Issues

```typescript
// Wait for all animations to complete before screenshot
await page.waitForFunction(() => {
  return Array.from(document.getAnimations()).every(a => a.playState === 'finished');
});
await expect(page).toHaveScreenshot('page.png', { animations: 'disabled' });
```

Or force-disable animations with CSS injection:

```css
/* tests/disable-animations.css */
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
```

### Font Rendering Differences

Fonts are a major source of cross-OS rendering differences. Options:

1. **Use Docker** — same OS = same font rasterizer (best fix)
2. **Mask text regions** — if exact text rendering doesn't matter
3. **Raise `threshold`** — allows slight subpixel differences
4. **Use `scale: 'css'`** — CSS pixel scale instead of device pixels (default, usually better)

### Responsive Breakpoint Testing

```typescript
const viewports = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'desktop' },
];

for (const vp of viewports) {
  test(`hero section — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page.locator('.hero')).toHaveScreenshot(`hero-${vp.name}.png`);
  });
}
```

### Screenshot Timing — Wait Helpers

```typescript
// Wait for network idle (images, fonts loaded)
await page.waitForLoadState('networkidle');

// Wait for specific element to appear
await page.waitForSelector('.hero-image', { state: 'visible' });

// Wait for font to load
await page.evaluate(() => document.fonts.ready);

// Wait for custom animation to complete
await page.waitForTimeout(300); // last resort — use sparingly

// Then screenshot
await expect(page).toHaveScreenshot('page.png');
```

### Debugging Workflow

```bash
# Run with headed browser to see what's happening
npx playwright test visual.spec.ts --headed

# Slow down actions to observe timing
npx playwright test visual.spec.ts --headed --slow-mo=500

# Open Playwright Inspector
npx playwright test visual.spec.ts --debug

# View HTML report with screenshots
npx playwright show-report
```
