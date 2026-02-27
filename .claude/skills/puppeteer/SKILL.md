---
model: claude-sonnet-4-6
name: puppeteer
description: Use when working with Puppeteer for browser automation, Chrome DevTools Protocol, headless Chrome, web scraping, PDF generation, or screenshot automation. Also use when working with Chrome for Testing, debugging CDP connections, or WebDriver BiDi.
---

# Puppeteer

## Overview
Puppeteer is Google's Node.js library for controlling Chrome/Firefox via the DevTools Protocol (CDP) or WebDriver BiDi. As of February 2026, the current version is **24.x** (v24.37.4), bundling Chrome for Testing.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 24.37.4 (as of February 2026) |
| **Install** | `npm install puppeteer` |
| **Install (no browser)** | `npm install puppeteer-core` |
| **Config** | `.puppeteerrc.cjs` or `puppeteer.config.ts` |
| **Bundled Browser** | Chrome for Testing (auto-downloaded) |
| **Node.js** | 18+ required |
| **Protocols** | CDP (Chrome default), WebDriver BiDi (Firefox default) |

## Setup

```javascript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
await page.screenshot({ path: 'screenshot.png' });
await browser.close();
```

## Common Operations

```javascript
// Navigate and wait
await page.goto('https://example.com', { waitUntil: 'networkidle2' });

// Click and type
await page.click('#login-button');
await page.type('#email', 'user@example.com');

// Generate PDF (headless only)
await page.pdf({ path: 'page.pdf', format: 'A4', printBackground: true });

// Evaluate JavaScript in browser context
const title = await page.evaluate(() => document.title);

// Wait for selector
const element = await page.waitForSelector('.results');
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `headless: "new"` | Removed in v22+. Use `headless: true` (default) or `headless: 'shell'` for chrome-headless-shell. |
| PDF generation in headed mode | `page.pdf()` only works in headless mode. Launch with `headless: true`. |
| Not awaiting navigation | Always `await page.goto()` and `await page.waitForSelector()` -- Puppeteer has no auto-waiting assertions. |
| Missing `--no-sandbox` in Docker/CI | Launch with `args: ['--no-sandbox', '--disable-setuid-sandbox']` in containerized environments. |
| Using `page.waitForTimeout()` | Deprecated. Use `setTimeout` from `node:timers/promises` or explicit wait conditions. |
| Request interception disables cache | `page.setRequestInterception(true)` turns off browser cache. Re-enable manually if needed. |
| Not closing browser | Always call `await browser.close()` to avoid zombie Chrome processes. |

## Full Reference

See `reference.md` in this skill directory for complete documentation covering selectors, network interception, CDP sessions, browser contexts, parallel execution, CI/CD setup, debugging, and recent Chrome for Testing changes.
