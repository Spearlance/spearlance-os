---
model: claude-sonnet-4-6
name: lighthouse-api
description: Use when running Lighthouse audits, performance testing, web vitals analysis, PageSpeed Insights API calls, or CI/CD performance monitoring. Also use when working with Core Web Vitals, accessibility audits, or LHCI.
---

# Lighthouse API

## Overview
Lighthouse is Google's web auditing tool for performance, accessibility, SEO, and best practices. Available as CLI, Node.js module, PageSpeed Insights API, and Lighthouse CI (LHCI).

## Quick Reference

| Method | Best For |
|--------|----------|
| **CLI** | Local testing, scripting |
| **Node.js** | Programmatic audits, custom flows |
| **PageSpeed Insights API** | Remote testing, CrUX data |
| **LHCI** | CI/CD integration, budgets |

## CLI Usage

```bash
npm install -g lighthouse
lighthouse https://example.com --output=json --output-path=report.json
lighthouse https://example.com --only-categories=performance,accessibility
lighthouse https://example.com --preset=desktop  # Desktop emulation
```

**Key flags:** `--output` (json/html/csv), `--only-categories`, `--preset` (desktop/perf), `--chrome-flags`

## Node.js API

```javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
const result = await lighthouse('https://example.com', {
  port: chrome.port,
  onlyCategories: ['performance', 'accessibility'],
});
const { lhr } = result; // Lighthouse Result object
console.log(`Performance: ${lhr.categories.performance.score * 100}`);
await chrome.kill();
```

## PageSpeed Insights API

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&key=API_KEY&category=performance&category=accessibility&strategy=mobile"
```

- Free tier: 25,000 queries/day
- Returns both Lighthouse audit + CrUX field data
- Strategies: `mobile` (default), `desktop`

## Lighthouse CI (LHCI)

```bash
npm install -g @lhci/cli
lhci autorun --collect.url=https://example.com --assert.preset=lighthouse:recommended
```

**lighthouserc.js:**
```javascript
module.exports = {
  ci: {
    collect: { url: ['https://example.com/'], numberOfRuns: 3 },
    assert: { assertions: { 'categories:performance': ['error', {minScore: 0.9}] } },
    upload: { target: 'temporary-public-storage' },
  }
};
```

## Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | ≤4.0s | >4.0s |
| INP | ≤200ms | ≤500ms | >500ms |
| CLS | ≤0.1 | ≤0.25 | >0.25 |

## Full Reference

See `reference.md` in this skill directory for User Flows API, Timespan/Snapshot modes, CI configuration, and advanced audit customization.
