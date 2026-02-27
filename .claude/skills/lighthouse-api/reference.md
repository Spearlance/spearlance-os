# Google Lighthouse Developer Reference

> Comprehensive reference for Google Lighthouse as of February 2026.
> Current version: **Lighthouse 13.0.x** (released October 2025, shipped in Chrome 143).
> Requires **Node.js 22.19 LTS** or later.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [CLI Usage](#cli-usage)
4. [Node.js Programmatic Usage](#nodejs-programmatic-usage)
5. [User Flows API](#user-flows-api)
6. [PageSpeed Insights API](#pagespeed-insights-api)
7. [Audit Categories](#audit-categories)
8. [Performance Scoring](#performance-scoring)
9. [Core Web Vitals](#core-web-vitals)
10. [Configuration](#configuration)
11. [Custom Audits](#custom-audits)
12. [CI/CD Integration](#cicd-integration)
13. [Lighthouse CI (LHCI)](#lighthouse-ci-lhci)
14. [Lighthouse 13 Changes](#lighthouse-13-changes)
15. [Sources](#sources)

---

## Overview

Google Lighthouse is an open-source automated tool for auditing web page quality. It runs audits across four scoring categories: **Performance**, **Accessibility**, **Best Practices**, and **SEO**.

### Ways to Run Lighthouse

| Method | Use Case |
|--------|----------|
| Chrome DevTools (Lighthouse tab) | Quick manual audits |
| CLI (`lighthouse` command) | Automation, scripting |
| Node.js module | Programmatic integration, CI/CD |
| PageSpeed Insights (pagespeed.web.dev) | Web-based, no install needed |
| PageSpeed Insights API | Automated remote analysis |
| Chrome Extension | Quick browser-based audits |

---

## Installation

```bash
# Global CLI install
npm install -g lighthouse

# Or with yarn
yarn global add lighthouse

# As a project dependency
npm install --save-dev lighthouse

# Verify installation
lighthouse --version
```

**Requirement:** Node.js 22.19 LTS or later. Google Chrome must be installed on the system.

---

## CLI Usage

### Basic Commands

```bash
# Run all audits, generate HTML report in current directory
lighthouse https://example.com

# Open report in browser automatically
lighthouse https://example.com --view

# Output JSON report
lighthouse https://example.com --output json --output-path ./report.json

# Output both HTML and JSON
lighthouse https://example.com --output html --output json --output-path ./report

# Output CSV
lighthouse https://example.com --output csv --output-path ./report.csv

# Run specific categories only
lighthouse https://example.com --only-categories=performance,accessibility

# Run specific audits only
lighthouse https://example.com --only-audits=first-contentful-paint,largest-contentful-paint

# Skip specific audits
lighthouse https://example.com --skip-audits=screenshot-thumbnails,final-screenshot

# Desktop mode (default is mobile)
lighthouse https://example.com --preset=desktop

# Custom config file
lighthouse https://example.com --config-path=./custom-config.js

# Verbose logging
lighthouse https://example.com --verbose

# Quiet mode (suppress output)
lighthouse https://example.com --quiet
```

### All Major CLI Flags

```bash
# === Output ===
--output=<html|json|csv>         # Report format (default: html)
--output-path=<path>             # File path for report
--view                           # Open HTML report in browser

# === Configuration ===
--config-path=<path>             # Path to custom config JS file
--preset=<perf|desktop>          # Built-in configuration preset
--chrome-flags="<flags>"         # Custom Chrome launch flags
--port=<port>                    # Chrome debugging protocol port
--hostname=<hostname>            # Chrome debugging hostname
--form-factor=<mobile|desktop>   # Device form factor for scoring

# === Audit Control ===
--only-categories=<cats>         # Comma-separated: performance,accessibility,best-practices,seo
--only-audits=<audits>           # Comma-separated audit IDs
--skip-audits=<audits>           # Comma-separated audit IDs to skip

# === Throttling ===
--throttling-method=<method>     # simulate (default), devtools, or provided
--throttling.cpuSlowdownMultiplier=<n>  # CPU throttle factor (default: 4)
--throttling.downloadThroughputKbps=<n> # Download speed
--throttling.uploadThroughputKbps=<n>   # Upload speed
--throttling.rttMs=<n>                  # Round-trip time

# === Advanced ===
--emulated-user-agent=<string>   # Custom user agent
--max-wait-for-load=<ms>         # Page load timeout in ms
-G, --gather-mode=<path>         # Collect artifacts only
-A, --audit-mode=<path>          # Audit saved artifacts
-GA                              # Full run with artifact persistence

# === Logging ===
--verbose                        # Detailed logging
--quiet                          # Suppress output
```

### Practical CLI Examples

```bash
# Performance-only audit on mobile with JSON output
lighthouse https://example.com \
  --only-categories=performance \
  --output=json \
  --output-path=./perf-report.json

# Desktop audit with custom throttling
lighthouse https://example.com \
  --preset=desktop \
  --throttling-method=simulate \
  --throttling.cpuSlowdownMultiplier=1

# Audit with custom Chrome flags (e.g., for authenticated pages)
lighthouse https://example.com \
  --chrome-flags="--headless --no-sandbox --disable-gpu"

# Run against a local dev server
lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility \
  --view

# Gather artifacts first, then audit later
lighthouse https://example.com -G=./artifacts
lighthouse https://example.com -A=./artifacts --output=json
```

---

## Node.js Programmatic Usage

### Basic Example

```javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runLighthouse(url) {
  // Launch Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox']
  });

  // Configure options
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  // Run Lighthouse
  const result = await lighthouse(url, options);

  // Access results
  const { lhr, report } = result;

  console.log('URL:', lhr.finalDisplayedUrl);
  console.log('Performance:', lhr.categories.performance.score * 100);
  console.log('Accessibility:', lhr.categories.accessibility.score * 100);
  console.log('Best Practices:', lhr.categories['best-practices'].score * 100);
  console.log('SEO:', lhr.categories.seo.score * 100);

  // Kill Chrome
  await chrome.kill();

  return { lhr, report };
}

runLighthouse('https://example.com');
```

### With Custom Configuration

```javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runWithConfig(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless']
  });

  const options = {
    port: chrome.port,
    output: ['json', 'html'],  // Multiple output formats
    onlyCategories: ['performance'],
  };

  // Custom Lighthouse config
  const config = {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  };

  const result = await lighthouse(url, options, config);

  // result.report is an array when multiple outputs are specified
  const [jsonReport, htmlReport] = result.report;

  await chrome.kill();
  return result;
}
```

### Batch Auditing Multiple URLs

```javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';

async function batchAudit(urls) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox']
  });

  const results = [];

  for (const url of urls) {
    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: 'json',
        onlyCategories: ['performance'],
      });

      results.push({
        url,
        performance: result.lhr.categories.performance.score * 100,
        lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
        cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
        tbt: result.lhr.audits['total-blocking-time'].numericValue,
        fcp: result.lhr.audits['first-contentful-paint'].numericValue,
        si: result.lhr.audits['speed-index'].numericValue,
      });
    } catch (err) {
      results.push({ url, error: err.message });
    }
  }

  await chrome.kill();

  // Write summary
  fs.writeFileSync('batch-results.json', JSON.stringify(results, null, 2));
  return results;
}

batchAudit([
  'https://example.com',
  'https://example.com/about',
  'https://example.com/blog',
]);
```

### Extracting Specific Audit Data

```javascript
// After running lighthouse, the lhr (Lighthouse Result) object contains:
const { lhr } = result;

// === Scores (0-1 scale, multiply by 100 for percentage) ===
lhr.categories.performance.score;
lhr.categories.accessibility.score;
lhr.categories['best-practices'].score;
lhr.categories.seo.score;

// === Individual Metrics ===
lhr.audits['first-contentful-paint'].numericValue;       // ms
lhr.audits['largest-contentful-paint'].numericValue;      // ms
lhr.audits['cumulative-layout-shift'].numericValue;       // score
lhr.audits['total-blocking-time'].numericValue;           // ms
lhr.audits['speed-index'].numericValue;                   // ms
lhr.audits['interactive'].numericValue;                   // ms (TTI, if present)

// === Audit Details ===
lhr.audits['largest-contentful-paint'].displayValue;      // "2.5 s"
lhr.audits['largest-contentful-paint'].score;             // 0-1

// === Metadata ===
lhr.finalDisplayedUrl;
lhr.fetchTime;
lhr.lighthouseVersion;
lhr.userAgent;
lhr.environment.networkUserAgent;
lhr.configSettings.formFactor;

// === All Audit IDs ===
Object.keys(lhr.audits);
```

---

## User Flows API

Lighthouse supports three modes beyond standard navigation: **Navigation**, **Timespan**, and **Snapshot**. These enable testing user interactions, not just cold page loads.

### Navigation Mode (Default)

Analyzes a single page load from start to finish.

```javascript
import puppeteer from 'puppeteer';
import { startFlow } from 'lighthouse';
import fs from 'fs';

async function navigationFlow() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const flow = await startFlow(page, { name: 'Navigation Flow' });

  // Cold navigation (clears cache/storage)
  await flow.navigate('https://example.com', {
    stepName: 'Cold navigation',
  });

  // Warm navigation (preserves cache/storage)
  await flow.navigate('https://example.com', {
    stepName: 'Warm navigation',
    configContext: {
      settingsOverrides: { disableStorageReset: true },
    },
  });

  await browser.close();

  // Generate combined flow report
  const report = await flow.generateReport();
  fs.writeFileSync('flow-report.html', report);

  // Access individual step results
  const flowResult = await flow.createFlowResult();
  for (const step of flowResult.steps) {
    console.log(step.name, step.lhr.categories.performance.score);
  }
}
```

### Timespan Mode

Measures what happens during a period of user interaction.

```javascript
import puppeteer from 'puppeteer';
import { startFlow } from 'lighthouse';
import fs from 'fs';

async function timespanFlow() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const flow = await startFlow(page, { name: 'Interaction Audit' });

  // Navigate to page first
  await page.goto('https://example.com', { waitUntil: 'networkidle0' });

  // Start timespan measurement
  await flow.startTimespan({ stepName: 'User Interaction' });

  // Simulate user interactions
  await page.click('#search-button');
  await page.type('#search-input', 'lighthouse');
  await page.click('#submit');
  await page.waitForSelector('.results');

  // End timespan measurement
  await flow.endTimespan();

  await browser.close();

  const report = await flow.generateReport();
  fs.writeFileSync('timespan-report.html', report);
}
```

### Snapshot Mode

Captures the state of the page at a specific moment (useful for SPAs, modals, etc.).

```javascript
import puppeteer from 'puppeteer';
import { startFlow } from 'lighthouse';
import fs from 'fs';

async function snapshotFlow() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const flow = await startFlow(page, { name: 'Snapshot Audit' });

  await page.goto('https://example.com', { waitUntil: 'networkidle0' });
  await flow.snapshot({ stepName: 'Page loaded' });

  // Open a modal
  await page.click('#open-modal');
  await page.waitForSelector('.modal.visible');
  await flow.snapshot({ stepName: 'Modal open' });

  // Fill form
  await page.type('.modal input[name="email"]', 'test@example.com');
  await flow.snapshot({ stepName: 'Form filled' });

  await browser.close();

  const report = await flow.generateReport();
  fs.writeFileSync('snapshot-report.html', report);
}
```

### Combined Flow (All Modes)

```javascript
import puppeteer from 'puppeteer';
import { startFlow } from 'lighthouse';
import fs from 'fs';

async function fullFlow() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const flow = await startFlow(page, { name: 'Complete User Journey' });

  // 1. Navigation: initial page load
  await flow.navigate('https://example.com');

  // 2. Timespan: measure interaction responsiveness
  await flow.startTimespan({ stepName: 'Add to cart interaction' });
  await page.click('.product-card');
  await page.waitForSelector('.product-detail');
  await page.click('#add-to-cart');
  await page.waitForSelector('.cart-updated');
  await flow.endTimespan();

  // 3. Snapshot: check current state
  await flow.snapshot({ stepName: 'Cart state' });

  // 4. Navigation: go to checkout
  await flow.navigate('https://example.com/checkout', {
    stepName: 'Checkout page load',
  });

  await browser.close();

  const report = await flow.generateReport();
  fs.writeFileSync('full-flow-report.html', report);
}
```

**Install dependencies for user flows:**

```bash
npm install lighthouse puppeteer
```

Ensure `package.json` has `"type": "module"` for ES module imports.

---

## PageSpeed Insights API

The PageSpeed Insights (PSI) API provides Lighthouse audits remotely without needing a local Chrome instance. It returns both **lab data** (Lighthouse) and **field data** (Chrome User Experience Report / CrUX).

### API Endpoint

```
GET https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The URL to analyze |
| `category` | enum | No | Repeat for multiple: `ACCESSIBILITY`, `BEST_PRACTICES`, `PERFORMANCE`, `SEO` |
| `strategy` | enum | No | `DESKTOP` or `MOBILE` (default) |
| `locale` | string | No | Locale for formatted results (e.g., `en_US`) |
| `key` | string | No | API key (recommended for production) |

### Rate Limits

| Quota | Limit |
|-------|-------|
| Queries per day | 25,000 |
| Queries per 100 seconds | 400 |

**No API key required** for basic usage, but **recommended** for production/automated queries. Get a key from the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).

### cURL Examples

```bash
# Basic performance audit (no API key)
curl "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&category=PERFORMANCE"

# All categories with API key
curl "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&key=YOUR_API_KEY"

# Desktop strategy
curl "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&category=PERFORMANCE&strategy=DESKTOP&key=YOUR_API_KEY"

# Mobile strategy (default)
curl "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&category=PERFORMANCE&strategy=MOBILE&key=YOUR_API_KEY"
```

### JavaScript / Node.js Examples

```javascript
// === Basic fetch ===
const API_KEY = 'YOUR_API_KEY';
const TARGET_URL = 'https://example.com';

async function runPageSpeedInsights(url, strategy = 'MOBILE') {
  const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'];
  const categoryParams = categories.map(c => `category=${c}`).join('&');

  const apiUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&${categoryParams}&strategy=${strategy}&key=${API_KEY}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`PSI API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// === Extract scores ===
async function getScores(url) {
  const data = await runPageSpeedInsights(url);

  // Lab data (Lighthouse results)
  const lighthouse = data.lighthouseResult;
  const scores = {
    performance: lighthouse.categories.performance.score * 100,
    accessibility: lighthouse.categories.accessibility.score * 100,
    bestPractices: lighthouse.categories['best-practices'].score * 100,
    seo: lighthouse.categories.seo.score * 100,
  };

  // Core Web Vitals from lab data
  const metrics = {
    fcp: lighthouse.audits['first-contentful-paint'].displayValue,
    lcp: lighthouse.audits['largest-contentful-paint'].displayValue,
    tbt: lighthouse.audits['total-blocking-time'].displayValue,
    cls: lighthouse.audits['cumulative-layout-shift'].displayValue,
    si: lighthouse.audits['speed-index'].displayValue,
  };

  // Field data (CrUX - real user metrics, if available)
  const fieldData = data.loadingExperience?.metrics || null;

  return { scores, metrics, fieldData };
}

getScores('https://example.com').then(console.log);
```

### Batch PSI Requests with Rate Limiting

```javascript
async function batchPSI(urls, apiKey, delayMs = 3000) {
  const results = [];

  for (const url of urls) {
    try {
      const apiUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=PERFORMANCE&strategy=MOBILE&key=${apiKey}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      results.push({
        url,
        performance: data.lighthouseResult.categories.performance.score * 100,
        lcp: data.lighthouseResult.audits['largest-contentful-paint'].numericValue,
        cls: data.lighthouseResult.audits['cumulative-layout-shift'].numericValue,
        tbt: data.lighthouseResult.audits['total-blocking-time'].numericValue,
      });
    } catch (err) {
      results.push({ url, error: err.message });
    }

    // Respect rate limits: ~400 per 100 seconds
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return results;
}
```

### Response Structure

```jsonc
{
  "captchaResult": "CAPTCHA_NOT_NEEDED",
  "kind": "pagespeedonline#result",
  "id": "https://example.com/",
  "loadingExperience": {
    // Real-user field data (CrUX) for the specific URL
    "metrics": {
      "LARGEST_CONTENTFUL_PAINT_MS": { "percentile": 1200, "distributions": [...], "category": "FAST" },
      "INTERACTION_TO_NEXT_PAINT": { "percentile": 150, "distributions": [...], "category": "FAST" },
      "CUMULATIVE_LAYOUT_SHIFT_SCORE": { "percentile": 5, "distributions": [...], "category": "FAST" },
      // ...
    },
    "overall_category": "FAST"
  },
  "originLoadingExperience": {
    // Real-user field data aggregated for the entire origin
    // Same structure as loadingExperience
  },
  "lighthouseResult": {
    // Full Lighthouse lab data report
    "categories": {
      "performance": { "score": 0.95 },
      "accessibility": { "score": 0.92 },
      "best-practices": { "score": 1.0 },
      "seo": { "score": 0.98 }
    },
    "audits": {
      "first-contentful-paint": { "score": 0.99, "numericValue": 800, "displayValue": "0.8 s" },
      "largest-contentful-paint": { "score": 0.85, "numericValue": 1800, "displayValue": "1.8 s" },
      // ... all audits
    },
    "lighthouseVersion": "13.0.3",
    "fetchTime": "2026-02-16T12:00:00.000Z",
    "configSettings": { "formFactor": "mobile", ... }
  },
  "analysisUTCTimestamp": "2026-02-16T12:00:00.000Z",
  "version": { "major": 5, "minor": 12 }
}
```

---

## Audit Categories

### Performance

Evaluates page load speed and runtime performance. Contains scored metrics plus diagnostic audits (insights in Lighthouse 13).

**Scored metrics:** FCP, SI, LCP, TBT, CLS.

### Accessibility

Uses the **axe-core** library to evaluate WCAG compliance. Tests include:

- Color contrast ratios
- ARIA attribute validity and usage
- Image alt text
- Form label associations
- Document language declaration
- Heading hierarchy
- Keyboard navigability
- Link and button naming
- Tab order
- Focus management

Scoring: each audit is pass/fail; the score is a weighted average.

### Best Practices

Evaluates general web development best practices:

- HTTPS usage
- Console error detection
- Deprecated API usage
- Correct image aspect ratios
- Proper charset declaration
- Avoidance of document.write()
- Safe cross-origin links
- Permissions policy / feature policy
- CSP (Content Security Policy) presence

### SEO

Evaluates search engine optimization fundamentals (13 audits):

- Valid HTTP status codes
- Meta description presence
- Document has a `<title>`
- Page is not blocked from indexing
- Link text is descriptive
- `hreflang` validity
- Canonical URL validity
- Structured data validity
- Robots.txt validity
- Tap targets sized appropriately (mobile)
- Font sizes legible (mobile)
- Plugins avoided
- Viewport meta tag present

---

## Performance Scoring

### Metric Weights (Lighthouse 10+, including 13)

| Metric | Weight | Good Threshold |
|--------|--------|----------------|
| **Total Blocking Time (TBT)** | 30% | < 200 ms |
| **Largest Contentful Paint (LCP)** | 25% | < 2.5 s |
| **Cumulative Layout Shift (CLS)** | 25% | < 0.1 |
| **First Contentful Paint (FCP)** | 10% | < 1.8 s |
| **Speed Index (SI)** | 10% | < 3.4 s |

**Note:** Time to Interactive (TTI) was removed in Lighthouse 10. Its weight was redistributed to TBT and CLS.

### Score Ranges

| Range | Color | Rating |
|-------|-------|--------|
| 90-100 | Green | Good |
| 50-89 | Orange | Needs Improvement |
| 0-49 | Red | Poor |

### Scoring Methodology

Scores use **log-normal distributions** derived from HTTP Archive data. Each metric's raw value is mapped to a 0-1 score using these distributions. The overall performance score is a weighted average of all metric scores.

Use the [Lighthouse Scoring Calculator](https://googlechrome.github.io/lighthouse/scorecalc/) to see how metric values map to the overall score.

---

## Core Web Vitals

The three Core Web Vitals are the user-centric metrics that Google uses as ranking signals. As of late 2025, all three are measurable in **all major browsers** (including Safari 26.2+).

### Largest Contentful Paint (LCP)

Measures **perceived load speed** -- when the largest content element becomes visible.

| Rating | Threshold |
|--------|-----------|
| Good | <= 2.5 s |
| Needs Improvement | <= 4.0 s |
| Poor | > 4.0 s |

**Common LCP elements:** `<img>`, `<video>`, elements with `background-image`, block-level text elements.

**Optimization strategies:**
- Optimize server response time (TTFB)
- Eliminate render-blocking resources
- Preload LCP image
- Optimize and compress images
- Use CDN for static assets

### Interaction to Next Paint (INP)

Replaced FID (First Input Delay) as a Core Web Vital in March 2024. Measures **responsiveness** to all user interactions throughout the page lifecycle, not just the first one.

| Rating | Threshold |
|--------|-----------|
| Good | <= 200 ms |
| Needs Improvement | <= 500 ms |
| Poor | > 500 ms |

**Note:** INP is a **field metric** (real user data). Lighthouse measures **Total Blocking Time (TBT)** as its lab proxy.

**Optimization strategies:**
- Break up long tasks
- Reduce JavaScript execution time
- Use `requestAnimationFrame` / `requestIdleCallback`
- Minimize main thread work
- Use web workers for heavy computation

### Cumulative Layout Shift (CLS)

Measures **visual stability** -- unexpected layout shifts during the page lifecycle.

| Rating | Threshold |
|--------|-----------|
| Good | <= 0.1 |
| Needs Improvement | <= 0.25 |
| Poor | > 0.25 |

**Optimization strategies:**
- Set explicit `width`/`height` on images and video
- Use CSS `aspect-ratio`
- Reserve space for ad slots and embeds
- Avoid dynamically injecting content above existing content
- Use `font-display: optional` or preload fonts

### Measurement at the 75th Percentile

Google measures Core Web Vitals at the **75th percentile** of real user data. This means 75% of page visits must meet the "Good" threshold for the page to pass.

---

## Configuration

### Custom Configuration File

Lighthouse configs are JavaScript files that export a configuration object.

```javascript
// custom-config.js
export default {
  extends: 'lighthouse:default',  // Inherit all default audits
  settings: {
    // Form factor
    formFactor: 'desktop',

    // Throttling
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },

    // Screen emulation
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },

    // Throttling method
    throttlingMethod: 'simulate',  // 'simulate', 'devtools', or 'provided'

    // Audit control
    onlyCategories: ['performance', 'accessibility'],
    skipAudits: ['screenshot-thumbnails'],
  },
};
```

### Extending the Default Config

The `extends: 'lighthouse:default'` property is the recommended approach. It inherits all default artifacts, audits, groups, and categories, letting you make targeted modifications.

```javascript
// Only performance audits, with desktop settings
export default {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  },
};
```

### Config Properties Reference

| Property | Description |
|----------|-------------|
| `extends` | `'lighthouse:default'` to inherit defaults |
| `settings` | Throttling, categories, screen emulation, etc. |
| `audits` | Array of audit module paths to include |
| `categories` | Define/override scoring categories |
| `artifacts` | Define custom artifact gatherers |
| `groups` | Group audits in the report |

### Throttling Presets

**Mobile (default):**
- RTT: 150ms
- Throughput: 1,638.4 Kbps
- CPU slowdown: 4x

**Desktop (`--preset=desktop`):**
- RTT: 40ms
- Throughput: 10,240 Kbps
- CPU slowdown: 1x

**No throttling:**
```bash
lighthouse https://example.com --throttling-method=provided
```

---

## Custom Audits

### Creating a Custom Audit

```javascript
// audits/has-twitter-cards.js
import { Audit } from 'lighthouse';

class HasTwitterCards extends Audit {
  static get meta() {
    return {
      id: 'has-twitter-cards',
      title: 'Page has Twitter card meta tags',
      failureTitle: 'Page is missing Twitter card meta tags',
      description: 'Twitter cards improve link sharing appearance. [Learn more](https://developer.twitter.com/en/docs/twitter-for-websites/cards).',
      requiredArtifacts: ['MetaElements'],
    };
  }

  static audit(artifacts) {
    const metaElements = artifacts.MetaElements;
    const twitterCard = metaElements.find(
      el => el.name === 'twitter:card'
    );

    return {
      score: twitterCard ? 1 : 0,
      displayValue: twitterCard
        ? `Found: ${twitterCard.content}`
        : 'No twitter:card meta tag found',
    };
  }
}

export default HasTwitterCards;
```

### Custom Config Using the Audit

```javascript
// custom-config.js
export default {
  extends: 'lighthouse:default',
  audits: [
    './audits/has-twitter-cards.js',
  ],
  categories: {
    // Add to a new custom category
    'social-sharing': {
      title: 'Social Sharing',
      description: 'Validates social media sharing metadata.',
      auditRefs: [
        { id: 'has-twitter-cards', weight: 1 },
      ],
    },
  },
};
```

### Running with Custom Config

```bash
lighthouse https://example.com --config-path=./custom-config.js
```

Or programmatically:

```javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import customConfig from './custom-config.js';

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
const result = await lighthouse('https://example.com', { port: chrome.port }, customConfig);
await chrome.kill();
```

---

## CI/CD Integration

### GitHub Actions -- Direct CLI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse Audit
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies and build
        run: |
          npm ci
          npm run build

      - name: Install Lighthouse
        run: npm install -g lighthouse

      - name: Start server
        run: npm run preview &
        # Wait for server to be ready
      - name: Wait for server
        run: npx wait-on http://localhost:4321

      - name: Run Lighthouse
        run: |
          lighthouse http://localhost:4321 \
            --output=json \
            --output-path=./lighthouse-report.json \
            --chrome-flags="--headless --no-sandbox"

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-report
          path: lighthouse-report.json
```

### GitHub Actions -- treosh/lighthouse-ci-action

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: push

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            https://example.com/
            https://example.com/blog
          budgetPath: ./budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Performance Budget File

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "document", "budget": 18 },
      { "resourceType": "script", "budget": 150 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "image", "budget": 300 },
      { "resourceType": "font", "budget": 100 },
      { "resourceType": "total", "budget": 500 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 10 },
      { "resourceType": "total", "budget": 50 }
    ]
  }
]
```

### GitHub Actions -- Custom Script with Score Thresholds

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse Performance Gate
on: pull_request

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci && npm run build

      - name: Run Lighthouse with score check
        run: |
          npm install -g lighthouse
          lighthouse http://localhost:4321 \
            --output=json \
            --output-path=./report.json \
            --chrome-flags="--headless --no-sandbox" &
          # Parse and check scores with Node.js
          node -e "
            const report = require('./report.json');
            const perf = report.categories.performance.score * 100;
            const a11y = report.categories.accessibility.score * 100;
            console.log('Performance: ' + perf);
            console.log('Accessibility: ' + a11y);
            if (perf < 90) { console.error('Performance below 90!'); process.exit(1); }
            if (a11y < 90) { console.error('Accessibility below 90!'); process.exit(1); }
          "
```

---

## Lighthouse CI (LHCI)

Lighthouse CI is a dedicated tool for running Lighthouse on every commit, tracking results over time, and preventing regressions.

### Installation

```bash
npm install -g @lhci/cli@0.15.x
```

### Configuration File (lighthouserc.js)

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    // === Collect: how to gather Lighthouse results ===
    collect: {
      // Option A: Audit a static directory (serves it locally)
      staticDistDir: './dist',

      // Option B: Start a custom server
      // startServerCommand: 'npm run preview',
      // url: ['http://localhost:4321/', 'http://localhost:4321/about/'],

      // Option C: Audit external URLs
      // url: ['https://example.com/'],

      numberOfRuns: 3,  // Run multiple times for stability
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-gpu',
      },
    },

    // === Assert: define pass/fail thresholds ===
    assert: {
      // Use a preset as baseline
      preset: 'lighthouse:recommended',

      // Override specific assertions
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        // Disable specific assertions
        'uses-rel-preload': 'off',
        'uses-rel-preconnect': 'off',
      },
    },

    // === Upload: where to store results ===
    upload: {
      // Option A: Temporary public storage (7-day retention)
      target: 'temporary-public-storage',

      // Option B: Private LHCI server
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.example.com',
      // token: process.env.LHCI_TOKEN,
    },
  },
};
```

### LHCI Commands

```bash
# Run the full CI workflow (collect + assert + upload)
lhci autorun

# Individual steps
lhci collect          # Gather Lighthouse reports
lhci assert           # Validate against thresholds
lhci upload           # Send to storage

# Interactive setup wizard
lhci wizard

# Open the LHCI dashboard
lhci open
```

### LHCI Assertion Presets

| Preset | Description |
|--------|-------------|
| `lighthouse:all` | Asserts every audit at "error" level |
| `lighthouse:recommended` | Sensible defaults for most projects |
| `lighthouse:no-pwa` | Recommended without PWA audits |

### Assertion Levels

| Level | Behavior |
|-------|----------|
| `'off'` | Disable the assertion |
| `'warn'` | Log a warning but do not fail |
| `'error'` | Fail the CI build |

### Assertion Operators

```javascript
assertions: {
  // Score-based (0-1)
  'categories:performance': ['error', { minScore: 0.9 }],

  // Numeric value-based
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],

  // Length-based (number of items in details)
  'diagnostics': ['warn', { maxLength: 0 }],

  // Aggregate across multiple runs
  'largest-contentful-paint': ['error', {
    maxNumericValue: 2500,
    aggregationMethod: 'median-run',  // or 'optimistic', 'pessimistic'
  }],
}
```

### GitHub Actions with LHCI

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lhci:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.15.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### LHCI Server Setup

The LHCI server provides a dashboard for historical tracking.

```bash
# Create a new project
lhci wizard

# The wizard generates:
# - Build token (safe to share with CI)
# - Admin token (keep secret, grants deletion)

# Deploy the server (Docker example)
docker run -p 9001:9001 -v lhci-data:/data patrickhulce/lhci-server

# Or via npm
npm install -g @lhci/server
lhci server --port=9001 --storage.storageMethod=sql --storage.sqlDatabasePath=./lhci.db
```

### GitHub Status Checks

Install the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) for PR status checks:

1. Install the app on your repository
2. Copy the provided app token
3. Add as `LHCI_GITHUB_APP_TOKEN` in repository secrets
4. Include the env variable in your workflow (shown above)

---

## Lighthouse 13 Changes

Released **October 2025**. Ships in Chrome 143.

### Key Changes

**Performance audits consolidated into "insights":** Old audits were replaced with new insight-based audits that are shared between Lighthouse and the Chrome DevTools Performance panel. **No changes to performance scoring** -- scoring is based on metrics (LCP, CLS, TBT, FCP, SI), not on the diagnostic audits.

### Renamed Audits (old -> new)

| Old Audit | New Insight |
|-----------|-------------|
| `layout-shifts` | `cls-culprits-insight` |
| `redirects`, `server-response-time`, `uses-text-compression` | `document-latency-insight` |
| `dom-size` | `dom-size-insight` |
| `duplicated-javascript` | `duplicated-javascript-insight` |
| `font-display` | `font-display-insight` |
| Image-related audits | `image-delivery-insight` |
| `work-during-interaction` | `interaction-to-next-paint-insight` |
| LCP-related audits | `lcp-discovery-insight`, `lcp-phases-insight` |
| `legacy-javascript` | `legacy-javascript-insight` |
| `uses-http2` | `modern-http-insight` |
| `critical-request-chains`, `uses-rel-preconnect` | `network-dependency-tree-insight` |
| `render-blocking-resources` | `render-blocking-insight` |
| `third-party-summary` | `third-parties-insight` |
| `uses-long-cache-ttl` | `use-cache-insight` |
| `viewport` | `viewport-insight` |

### Removed Audits (no replacement)

| Audit | Reason |
|-------|--------|
| `first-meaningful-paint` | Replaced by LCP long ago |
| `font-size` | High cost, low SEO signal value |
| `no-document-write` | Rarely an issue in modern code |
| `offscreen-images` | Browsers already deprioritize these |
| `preload-fonts` | Risk of over-recommending |
| `third-party-facades` | Limited scope |
| `uses-passive-event-listeners` | Rarely problematic now |
| `uses-rel-preload` | Risk of over-recommending |

### Breaking Changes

- **Node.js 22.19+** required (up from 22 LTS)
- Audit IDs changed (see table above) -- update any code or configs referencing old audit IDs
- JSON report structure reflects the new insight audit IDs

---

## Sources

- [Lighthouse GitHub Repository](https://github.com/GoogleChrome/lighthouse)
- [Lighthouse npm Package](https://www.npmjs.com/package/lighthouse)
- [What's New in Lighthouse 13](https://developer.chrome.com/blog/lighthouse-13-0)
- [Chrome Developers: Lighthouse Overview](https://developer.chrome.com/docs/lighthouse/overview/)
- [Lighthouse Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- [PageSpeed Insights API: Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
- [PageSpeed Insights API Reference](https://developers.google.com/speed/docs/insights/v5/reference)
- [PageSpeed Insights API: runpagespeed](https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed)
- [Lighthouse Configuration Docs](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md)
- [Lighthouse User Flows](https://web.dev/articles/lighthouse-user-flows)
- [Lighthouse CI GitHub Repository](https://github.com/GoogleChrome/lighthouse-ci)
- [LHCI Getting Started](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)
- [Lighthouse CI Action on GitHub Marketplace](https://github.com/marketplace/actions/lighthouse-ci-action)
- [Core Web Vitals: Google Search Central](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Web Vitals (web.dev)](https://web.dev/articles/vitals)
- [LCP and INP Baseline Browser Support](https://web.dev/blog/lcp-and-inp-are-now-baseline-newly-available)
- [Lighthouse Scoring Calculator](https://googlechrome.github.io/lighthouse/scorecalc/)
- [Lighthouse Custom Audit Recipe](https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/custom-audit/readme.md)
- [PageSpeed Insights API Rate Limits Discussion](https://groups.google.com/g/pagespeed-insights-discuss/c/dB7hWmGAGsw)
- [DebugBear: PageSpeed Insights API Guide](https://www.debugbear.com/blog/pagespeed-insights-api)
- [Lighthouse Accessibility Scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)
