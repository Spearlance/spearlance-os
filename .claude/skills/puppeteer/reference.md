# Puppeteer Developer Reference

> **Last Updated:** February 2026
> **Current Version:** 24.37.4
> **Bundled Browser:** Chrome for Testing (auto-downloaded per release)
> **Node.js Requirement:** 18+

---

## Table of Contents

1. [Installation and Configuration](#installation-and-configuration)
2. [Browser and Page Management](#browser-and-page-management)
3. [Selectors and Element Handling](#selectors-and-element-handling)
4. [Navigation and Waiting](#navigation-and-waiting)
5. [Network Interception](#network-interception)
6. [Screenshots and PDF Generation](#screenshots-and-pdf-generation)
7. [JavaScript Evaluation](#javascript-evaluation)
8. [File Uploads and Downloads](#file-uploads-and-downloads)
9. [Chrome DevTools Protocol (CDP)](#chrome-devtools-protocol-cdp)
10. [Headless vs Headed Mode](#headless-vs-headed-mode)
11. [Browser Contexts and Incognito](#browser-contexts-and-incognito)
12. [Parallel Execution](#parallel-execution)
13. [CI/CD Integration](#cicd-integration)
14. [Debugging](#debugging)
15. [Common Errors and Fixes](#common-errors-and-fixes)
16. [Recent Changes (Chrome for Testing)](#recent-changes-chrome-for-testing)
17. [Sources](#sources)

---

## Installation and Configuration

### Install

```bash
# Full install — downloads Chrome for Testing automatically
npm install puppeteer

# Core only — no browser download (bring your own Chrome)
npm install puppeteer-core
```

`puppeteer` downloads a compatible Chrome for Testing binary into `~/.cache/puppeteer` on install. Use `puppeteer-core` when you want to connect to an existing Chrome/Chromium installation or a remote browser.

### puppeteer vs puppeteer-core

| | `puppeteer` | `puppeteer-core` |
|---|---|---|
| Downloads browser | Yes (Chrome for Testing) | No |
| Default `executablePath` | Bundled Chrome for Testing | Must be specified |
| Use case | Standalone automation | Custom Chrome, Docker, remote browsers |

### Configuration File

Puppeteer reads configuration from `.puppeteerrc.cjs`, `.puppeteerrc.js`, `.puppeteerrc.mjs`, `puppeteer.config.ts`, or `puppeteer.config.cjs` in the project root.

```javascript
// .puppeteerrc.cjs
const { join } = require('path');

/** @type {import('puppeteer').Configuration} */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  defaultProduct: 'chrome',  // 'chrome' or 'firefox'
};
```

### TypeScript Configuration

```typescript
// puppeteer.config.ts
import { defineConfig } from 'puppeteer';

export default defineConfig({
  cacheDirectory: '.cache/puppeteer',
});
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PUPPETEER_CACHE_DIR` | Override browser cache directory |
| `PUPPETEER_SKIP_DOWNLOAD` | Set to `true` to skip browser download on install |
| `PUPPETEER_BROWSER_REVISION` | Pin a specific browser revision |
| `PUPPETEER_EXECUTABLE_PATH` | Path to browser executable |
| `PUPPETEER_CHROMIUM_REVISION` | Deprecated -- use `PUPPETEER_BROWSER_REVISION` |

---

## Browser and Page Management

### Launching a Browser

```javascript
import puppeteer from 'puppeteer';

// Default launch (headless, Chrome for Testing)
const browser = await puppeteer.launch();

// Headed mode (visible browser window)
const browser = await puppeteer.launch({ headless: false });

// With arguments
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
  ],
  defaultViewport: { width: 1920, height: 1080 },
  timeout: 30000,
});
```

### Key Launch Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | `boolean \| 'shell'` | `true` | `true` = new headless, `'shell'` = chrome-headless-shell, `false` = headed |
| `args` | `string[]` | `[]` | Chrome CLI flags |
| `defaultViewport` | `object \| null` | `{width: 800, height: 600}` | Set to `null` to use full window size |
| `executablePath` | `string` | bundled | Path to browser binary |
| `timeout` | `number` | `30000` | Max time in ms to wait for browser launch |
| `userDataDir` | `string` | temp dir | Persistent user profile directory |
| `devtools` | `boolean` | `false` | Auto-open DevTools (forces headed mode) |
| `slowMo` | `number` | `0` | Slow down operations by N ms (debugging) |
| `ignoreHTTPSErrors` | `boolean` | `false` | Accept self-signed certificates |
| `protocolTimeout` | `number` | `180000` | Timeout for CDP protocol calls |

### Connecting to an Existing Browser

```javascript
import puppeteer from 'puppeteer-core';

// Connect via WebSocket endpoint
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/...',
});

// Connect via CDP URL
const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
});
```

### Page Lifecycle

```javascript
const page = await browser.newPage();

// Set viewport
await page.setViewport({ width: 1920, height: 1080 });

// Set user agent
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...');

// Set extra HTTP headers
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' });

// Navigate
await page.goto('https://example.com');

// Get all pages
const pages = await browser.pages();

// Close page
await page.close();

// Close browser (always do this)
await browser.close();
```

---

## Selectors and Element Handling

### Selector Types

Puppeteer supports CSS selectors, XPath, ARIA selectors, and custom selectors.

```javascript
// CSS selector
const element = await page.$('.my-class');
const elements = await page.$$('div.item');

// XPath (prefix with ::-p-xpath)
const element = await page.$('::-p-xpath(//button[text()="Submit"])');

// ARIA selector (prefix with ::-p-aria)
const element = await page.$('::-p-aria(Submit button)');

// Text selector (prefix with ::-p-text)
const element = await page.$('::-p-text(Click here)');

// Piercing shadow DOM selector (prefix with >>>)
const element = await page.$('my-component >>> .inner-element');
```

### Locator API (Recommended)

Locators are the preferred way to interact with elements. They automatically wait for the element to be ready.

```javascript
// Click with auto-waiting
await page.locator('button#submit').click();

// Type with auto-waiting
await page.locator('#email').fill('user@example.com');

// Hover
await page.locator('.menu-item').hover();

// Scroll into view
await page.locator('.footer').scroll({ scrollTop: 100 });

// Wait for a locator to be visible
await page.locator('.results').wait();

// Chain with filters
await page.locator('button').filter(el => el.textContent === 'Submit').click();

// Set timeout for a specific locator
await page.locator('#slow-element').setTimeout(60000).click();

// Race multiple locators (first one wins)
await page.locator('button#accept').or(page.locator('button#ok')).click();
```

### Element Handles (Lower-Level)

```javascript
const element = await page.$('#my-element');

if (element) {
  await element.click();
  await element.type('Hello');
  await element.press('Enter');

  // Get property
  const text = await element.evaluate(el => el.textContent);
  const href = await element.evaluate(el => el.getAttribute('href'));

  // Get bounding box
  const box = await element.boundingBox();
  console.log(box); // { x, y, width, height }

  // Screenshot element
  await element.screenshot({ path: 'element.png' });

  // Dispose handle when done
  await element.dispose();
}

// Query all and iterate
const items = await page.$$('.list-item');
for (const item of items) {
  const text = await item.evaluate(el => el.textContent);
  console.log(text);
}

// Combined query + evaluate ($$eval)
const texts = await page.$$eval('.list-item', elements =>
  elements.map(el => el.textContent)
);
```

### Form Interactions

```javascript
// Type text (simulates keystrokes)
await page.type('#input-field', 'Hello World', { delay: 50 });

// Clear and retype
await page.click('#input-field', { clickCount: 3 }); // Select all
await page.type('#input-field', 'New text');

// Select dropdown option
await page.select('#dropdown', 'option-value');
// Multiple selection
await page.select('#multi-select', 'value1', 'value2');

// Checkbox / radio
await page.click('#checkbox');

// Keyboard shortcuts
await page.keyboard.down('Control');
await page.keyboard.press('A');
await page.keyboard.up('Control');
await page.keyboard.press('Backspace');
await page.keyboard.type('Replacement text');
```

---

## Navigation and Waiting

### page.goto() Options

```javascript
await page.goto('https://example.com', {
  waitUntil: 'networkidle2',  // See options below
  timeout: 30000,
  referer: 'https://google.com',
});
```

### waitUntil Options

| Value | Meaning |
|-------|---------|
| `'load'` | Fires when `load` event fires (default) |
| `'domcontentloaded'` | Fires when `DOMContentLoaded` event fires |
| `'networkidle0'` | No more than 0 network connections for 500ms |
| `'networkidle2'` | No more than 2 network connections for 500ms |

**Recommendation:** Use `networkidle2` for most pages. Use `networkidle0` only when you need all resources loaded. Avoid relying on `load` for SPAs.

### Explicit Wait Methods

```javascript
// Wait for a selector to appear in DOM
const element = await page.waitForSelector('.results', {
  visible: true,       // Wait until visible (not just in DOM)
  hidden: false,       // Wait until hidden/removed
  timeout: 5000,
});

// Wait for XPath
const element = await page.waitForSelector(
  '::-p-xpath(//div[@class="loaded"])'
);

// Wait for a function to return true in browser context
await page.waitForFunction(
  () => document.querySelectorAll('.item').length >= 10,
  { timeout: 10000, polling: 500 }
);

// Wait for navigation (after a click that triggers navigation)
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2' }),
  page.click('#navigate-link'),
]);

// Wait for a network response
const response = await page.waitForResponse(
  response => response.url().includes('/api/data') && response.status() === 200
);
const data = await response.json();

// Wait for a network request
const request = await page.waitForRequest(
  request => request.url().includes('/api/submit')
);
```

### No Auto-Retry Assertions

Unlike Playwright, Puppeteer does not have built-in auto-retry assertions. You must manually wait and then assert.

```javascript
// Correct pattern: wait then assert
const element = await page.waitForSelector('.result-count');
const text = await element.evaluate(el => el.textContent);
if (text !== 'Results: 10') {
  throw new Error(`Expected "Results: 10", got "${text}"`);
}

// Or use waitForFunction for assertion-like behavior
await page.waitForFunction(
  () => document.querySelector('.result-count')?.textContent === 'Results: 10',
  { timeout: 5000 }
);
```

---

## Network Interception

### Request Interception

Enabling request interception disables browser caching for that page.

```javascript
await page.setRequestInterception(true);

page.on('request', request => {
  // Block images and stylesheets
  if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
    request.abort();
    return;
  }

  // Modify headers
  if (request.url().includes('/api/')) {
    request.continue({
      headers: {
        ...request.headers(),
        'Authorization': 'Bearer my-token',
      },
    });
    return;
  }

  // Mock a response
  if (request.url().includes('/api/mock')) {
    request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mocked: true }),
    });
    return;
  }

  // Let everything else through
  request.continue();
});
```

### Request Properties

| Property | Returns |
|----------|---------|
| `request.url()` | Full URL |
| `request.method()` | HTTP method |
| `request.headers()` | Request headers object |
| `request.postData()` | POST body string (if any) |
| `request.resourceType()` | `document`, `script`, `stylesheet`, `image`, `font`, `xhr`, `fetch`, etc. |
| `request.isNavigationRequest()` | `true` if this request caused navigation |
| `request.redirectChain()` | Array of redirect requests |
| `request.frame()` | The frame that initiated the request |

### Response Monitoring (No Interception Needed)

```javascript
// Listen to all responses
page.on('response', async response => {
  if (response.url().includes('/api/')) {
    console.log(`${response.status()} ${response.url()}`);
    try {
      const json = await response.json();
      console.log(json);
    } catch {}
  }
});

// Listen to request failures
page.on('requestfailed', request => {
  console.log(`Failed: ${request.url()} ${request.failure()?.errorText}`);
});

// Listen to completed requests
page.on('requestfinished', request => {
  console.log(`Finished: ${request.url()}`);
});
```

---

## Screenshots and PDF Generation

### Screenshots

```javascript
// Full page screenshot
await page.screenshot({ path: 'full-page.png', fullPage: true });

// Viewport only (default)
await page.screenshot({ path: 'viewport.png' });

// JPEG with quality
await page.screenshot({
  path: 'page.jpg',
  type: 'jpeg',
  quality: 80,
});

// WebP format
await page.screenshot({
  path: 'page.webp',
  type: 'webp',
  quality: 90,
});

// Clip to specific region
await page.screenshot({
  path: 'region.png',
  clip: { x: 0, y: 0, width: 800, height: 600 },
});

// Transparent background (PNG only)
await page.screenshot({
  path: 'transparent.png',
  omitBackground: true,
});

// Return buffer instead of saving to file
const buffer = await page.screenshot({ encoding: 'binary' });
const base64 = await page.screenshot({ encoding: 'base64' });

// Element screenshot
const element = await page.$('.card');
await element.screenshot({ path: 'card.png' });
```

### PDF Generation

PDF generation only works in headless mode (`headless: true` or `headless: 'shell'`).

```javascript
// Basic PDF
await page.pdf({ path: 'page.pdf' });

// Full options
await page.pdf({
  path: 'document.pdf',
  format: 'A4',                    // 'Letter', 'Legal', 'Tabloid', 'A0'-'A6'
  printBackground: true,            // Include CSS backgrounds
  landscape: false,
  scale: 1,                         // 0.1 to 2.0
  margin: {
    top: '20mm',
    right: '15mm',
    bottom: '20mm',
    left: '15mm',
  },
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size: 10px; width: 100%; text-align: center;">
      <span class="title"></span>
    </div>
  `,
  footerTemplate: `
    <div style="font-size: 10px; width: 100%; text-align: center;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `,
  pageRanges: '1-5',                // '1', '1-3', '1,3,5-7'
  preferCSSPageSize: false,          // Use @page CSS rule size if true
  omitBackground: false,
  timeout: 30000,
});

// Return buffer (no file save)
const pdfBuffer = await page.pdf({ format: 'A4' });
```

### Header/Footer Template Variables

These CSS classes are replaced with actual values in header/footer templates:

| Class | Value |
|-------|-------|
| `date` | Formatted print date |
| `title` | Document title |
| `url` | Document URL |
| `pageNumber` | Current page number |
| `totalPages` | Total number of pages |

### PDF with Custom CSS

```javascript
// Inject print-specific CSS before generating PDF
await page.addStyleTag({
  content: `
    @media print {
      .no-print { display: none !important; }
      body { font-size: 12pt; }
      h1 { page-break-before: always; }
    }
  `
});
await page.pdf({ path: 'styled.pdf', printBackground: true });
```

---

## JavaScript Evaluation

### page.evaluate()

Runs a function in the browser context. Arguments and return values are serialized (no DOM references can be returned).

```javascript
// Simple evaluation
const title = await page.evaluate(() => document.title);
const url = await page.evaluate(() => window.location.href);

// With arguments
const text = await page.evaluate(
  (selector) => document.querySelector(selector)?.textContent,
  '.my-element'
);

// Multiple arguments
const result = await page.evaluate(
  (a, b) => a + b,
  5, 10
);

// Return complex data (must be serializable)
const data = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('table tr'));
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return cells.map(cell => cell.textContent.trim());
  });
});
```

### page.evaluateHandle()

Returns a `JSHandle` to a browser object (not serialized). Use when you need to reference DOM elements or non-serializable objects.

```javascript
// Get a handle to a DOM element
const bodyHandle = await page.evaluateHandle(() => document.body);

// Get a handle to an array
const arrayHandle = await page.evaluateHandle(() =>
  Array.from(document.querySelectorAll('.item'))
);

// Use a handle as an argument to another evaluate
const length = await page.evaluate(
  (arr) => arr.length,
  arrayHandle
);

// Dispose when done
await bodyHandle.dispose();
await arrayHandle.dispose();
```

### page.$eval() and page.$$eval()

Shorthand for querying + evaluating.

```javascript
// Single element
const text = await page.$eval('.title', el => el.textContent);
const href = await page.$eval('a.link', el => el.getAttribute('href'));

// Multiple elements
const allTexts = await page.$$eval('.item', elements =>
  elements.map(el => el.textContent.trim())
);

// With extra arguments
const hasClass = await page.$eval(
  '#my-el',
  (el, className) => el.classList.contains(className),
  'active'
);
```

### page.exposeFunction()

Expose a Node.js function to the browser context. The function persists across navigations.

```javascript
import fs from 'fs/promises';

// Expose a Node.js function
await page.exposeFunction('readFile', async (filePath) => {
  return await fs.readFile(filePath, 'utf8');
});

await page.exposeFunction('saveData', async (data) => {
  await fs.writeFile('output.json', JSON.stringify(data, null, 2));
  return 'saved';
});

// Use from browser context
const result = await page.evaluate(async () => {
  const content = await window.readFile('/tmp/data.txt');
  await window.saveData({ content, timestamp: Date.now() });
  return content;
});
```

---

## File Uploads and Downloads

### File Upload

```javascript
// Standard file input
const fileInput = await page.$('input[type="file"]');
await fileInput.uploadFile('/path/to/file.pdf');

// Multiple files
await fileInput.uploadFile('/path/to/file1.pdf', '/path/to/file2.pdf');

// Non-standard upload (drag-and-drop or custom button)
const [fileChooser] = await Promise.all([
  page.waitForFileChooser(),
  page.click('#upload-button'),
]);
await fileChooser.accept(['/path/to/file.pdf']);
```

### File Download

```javascript
import path from 'path';

// Set download directory via CDP session
const client = await page.createCDPSession();
await client.send('Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: path.resolve('./downloads'),
});

// Trigger download
await page.click('#download-button');

// Wait for download to complete (check file existence)
import { setTimeout } from 'node:timers/promises';

async function waitForDownload(filePath, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      await setTimeout(500);
    }
  }
  throw new Error(`Download timed out: ${filePath}`);
}
```

---

## Chrome DevTools Protocol (CDP)

Puppeteer is built on CDP. You can access the raw protocol for features not exposed by the high-level API.

### CDP Sessions

```javascript
// Create a CDP session for a page
const client = await page.createCDPSession();

// Enable a domain
await client.send('Network.enable');
await client.send('Performance.enable');

// Listen to CDP events
client.on('Network.requestWillBeSent', event => {
  console.log(`Request: ${event.request.url}`);
});

// Send CDP commands
const { metrics } = await client.send('Performance.getMetrics');
console.log(metrics);

// Emulate network conditions
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: 1.5 * 1024 * 1024 / 8,  // 1.5 Mbps
  uploadThroughput: 750 * 1024 / 8,             // 750 Kbps
  latency: 40,
});

// Emulate geolocation
await client.send('Emulation.setGeolocationOverride', {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 100,
});

// Detach when done
await client.detach();
```

### Common CDP Use Cases

```javascript
// Block specific URLs
await client.send('Network.setBlockedURLs', {
  urls: ['*.analytics.com', '*.ads.com'],
});

// Capture console messages with stack traces
client.on('Runtime.consoleAPICalled', event => {
  const args = event.args.map(a => a.value || a.description);
  console.log(`[${event.type}]`, ...args);
});

// Intercept and modify cookies
await client.send('Network.setCookie', {
  name: 'session',
  value: 'abc123',
  domain: 'example.com',
  path: '/',
});
```

---

## Headless vs Headed Mode

### Headless Modes (as of Puppeteer v22+)

| Mode | `headless` value | Description |
|------|-----------------|-------------|
| **New Headless** | `true` (default) | Full Chrome, no visible window. Shares code with headed Chrome. |
| **chrome-headless-shell** | `'shell'` | Lightweight headless binary. Faster, but missing some features (extensions, etc.). |
| **Headed** | `false` | Visible browser window. Required for some debugging. |

```javascript
// New headless (default) — recommended for most use cases
const browser = await puppeteer.launch({ headless: true });

// chrome-headless-shell — faster, for pure automation
const browser = await puppeteer.launch({ headless: 'shell' });

// Headed — for debugging, visual verification
const browser = await puppeteer.launch({ headless: false });
```

### Historical Note

Before Puppeteer v22, `headless: "new"` was used to opt into the new headless mode. This value is no longer accepted in v22+. Use `headless: true` instead.

---

## Browser Contexts and Incognito

Browser contexts provide isolated sessions (separate cookies, cache, localStorage).

```javascript
// Create an incognito browser context
const context = await browser.createBrowserContext();

// Pages in this context are isolated
const page1 = await context.newPage();
const page2 = await context.newPage();

// Login in one context, browse as guest in another
const userContext = await browser.createBrowserContext();
const guestContext = await browser.createBrowserContext();

const userPage = await userContext.newPage();
await userPage.goto('https://example.com/login');
// ...login flow...

const guestPage = await guestContext.newPage();
await guestPage.goto('https://example.com');
// Guest sees logged-out state

// Override permissions per context
await context.overridePermissions('https://example.com', [
  'geolocation',
  'notifications',
]);

// Close context (closes all pages in it)
await context.close();

// Default context
const defaultContext = browser.defaultBrowserContext();
```

---

## Parallel Execution

### Multiple Pages in One Browser

```javascript
const browser = await puppeteer.launch();

// Open multiple pages
const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3',
];

const results = await Promise.all(
  urls.map(async url => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const title = await page.title();
    await page.close();
    return { url, title };
  })
);

await browser.close();
```

### Concurrency Control with a Pool

```javascript
async function processWithPool(urls, concurrency = 5) {
  const browser = await puppeteer.launch();
  const results = [];
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const url = urls[index++];
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        results.push({ url, title });
      } catch (err) {
        results.push({ url, error: err.message });
      } finally {
        await page.close();
      }
    }
  }

  // Launch N workers
  await Promise.all(
    Array.from({ length: concurrency }, () => worker())
  );

  await browser.close();
  return results;
}
```

### Multiple Browser Instances

For true isolation, launch separate browser processes:

```javascript
async function runIsolated(urls) {
  const results = await Promise.all(
    urls.map(async url => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        return { url, title: await page.title() };
      } finally {
        await browser.close();
      }
    })
  );
  return results;
}
```

---

## CI/CD Integration

### Docker Setup

```dockerfile
FROM node:22-slim

# Install dependencies for Chrome
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Run as non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app
USER pptruser

CMD ["node", "index.js"]
```

### Launch Args for Docker/CI

```javascript
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',  // Use /tmp instead of /dev/shm
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',         // Use only if needed (reduces stability)
  ],
});
```

### GitHub Actions

```yaml
name: Puppeteer Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Run Puppeteer scripts
        run: node scrape.js
        env:
          PUPPETEER_CACHE_DIR: ${{ github.workspace }}/.cache/puppeteer
```

No additional Chrome install is needed -- `npm ci` triggers `puppeteer`'s postinstall script which downloads Chrome for Testing.

### GitLab CI

```yaml
test:
  image: node:22-slim
  before_script:
    - apt-get update && apt-get install -y chromium --no-install-recommends
    - npm ci
  script:
    - node scrape.js
  variables:
    PUPPETEER_SKIP_DOWNLOAD: 'true'
    PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium'
```

---

## Debugging

### slowMo

```javascript
const browser = await puppeteer.launch({
  headless: false,
  slowMo: 250,  // Slow down every operation by 250ms
});
```

### DevTools Protocol Logging

```bash
# Set DEBUG env var to see CDP protocol traffic
DEBUG="puppeteer:*" node script.js

# More targeted
DEBUG="puppeteer:protocol:SEND" node script.js
DEBUG="puppeteer:protocol:RECV" node script.js
```

### Console and Error Events

```javascript
// Capture browser console messages
page.on('console', msg => {
  for (const arg of msg.args()) {
    console.log(`[browser ${msg.type()}]`, arg);
  }
});

// Capture page errors (uncaught exceptions)
page.on('pageerror', error => {
  console.error('Page error:', error.message);
});

// Capture failed requests
page.on('requestfailed', request => {
  console.error(`Request failed: ${request.url()} — ${request.failure()?.errorText}`);
});

// Dialog handling (alert, confirm, prompt)
page.on('dialog', async dialog => {
  console.log('Dialog:', dialog.type(), dialog.message());
  await dialog.accept();  // or dialog.dismiss()
});
```

### Taking Debug Screenshots

```javascript
try {
  await page.click('#submit');
  await page.waitForSelector('.success', { timeout: 5000 });
} catch (error) {
  await page.screenshot({ path: 'debug-failure.png', fullPage: true });
  throw error;
}
```

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `TimeoutError: Navigation timeout of 30000ms exceeded` | Page load took too long | Increase `timeout` in `goto()` or use a less strict `waitUntil` |
| `Error: No node found for selector` | Element not in DOM | Use `waitForSelector()` before interacting |
| `Error: Node is either not clickable or not an HTMLElement` | Element obscured or not interactive | Scroll into view, wait for visibility, or use `{ force: true }` with locator |
| `Error: Protocol error: Target closed` | Browser/page closed mid-operation | Check for race conditions; ensure browser is still alive |
| `Error: net::ERR_ABORTED` | Navigation was canceled | Another navigation or `page.close()` interrupted the load |
| `Error: Execution context was destroyed` | Page navigated during evaluate | Ensure no navigation happens during `page.evaluate()` calls |
| `Error: Request is already handled!` | Multiple handlers called `continue/respond/abort` | Ensure each request is handled exactly once |
| `EACCES: permission denied` in Docker | Chrome can't create sandbox | Add `--no-sandbox --disable-setuid-sandbox` to launch args |
| `Error: Failed to launch the browser` | Missing system dependencies | Install Chrome dependencies (see Docker section) |
| `ProtocolError: Protocol error ... Timed out` | CDP command timed out (default 180s) | Increase `protocolTimeout` in launch options |

### Handling Navigation Errors Gracefully

```javascript
try {
  const response = await page.goto('https://example.com', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  if (!response) {
    console.error('No response received');
  } else if (!response.ok()) {
    console.error(`HTTP ${response.status()}: ${response.statusText()}`);
  }
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.error('Page load timed out');
  } else {
    throw error;
  }
}
```

---

## Recent Changes (Chrome for Testing)

### Chrome for Testing (v20.0.0+)

Starting with Puppeteer v20.0.0, Puppeteer downloads and uses **Chrome for Testing** instead of Chromium. Chrome for Testing is a dedicated build of Chrome designed for automated testing, maintained by the Chrome team.

**What changed:**
- Browser binary is now a full Chrome build (not Chromium)
- Headless mode uses the same Chrome codebase as headed mode (unified architecture)
- `chrome-headless-shell` is a separate lightweight binary for pure headless automation
- Browser is downloaded to `~/.cache/puppeteer` (configurable)

### Headless Mode Evolution

| Puppeteer Version | `headless: true` Behavior |
|-------------------|--------------------------|
| < v20 | Old headless Chromium (separate codebase) |
| v20 - v21 | Old headless by default; `headless: "new"` for new headless |
| v22+ | New headless by default; `headless: "shell"` for chrome-headless-shell |

### WebDriver BiDi Support (v23+)

As of Puppeteer v23, WebDriver BiDi is production-ready for Firefox and experimentally supported for Chrome. When launching Firefox, WebDriver BiDi is the default protocol.

```javascript
// Launch Firefox with WebDriver BiDi (default)
const browser = await puppeteer.launch({
  browser: 'firefox',
});

// Launch Chrome with WebDriver BiDi (experimental)
const browser = await puppeteer.launch({
  browser: 'chrome',
  protocol: 'webdriver-bidi',
});
```

CDP remains the default and recommended protocol for Chrome automation. WebDriver BiDi does not yet support all CDP features (cookie access, some emulation features, and permissions are still being standardized as of February 2026).

### Firefox Support

Puppeteer supports Firefox automation via WebDriver BiDi. Install Firefox:

```bash
npx puppeteer browsers install firefox
```

```javascript
const browser = await puppeteer.launch({ browser: 'firefox' });
const page = await browser.newPage();
await page.goto('https://example.com');
await browser.close();
```

### Stealth / Bot Detection Evasion

The `puppeteer-extra` ecosystem provides plugins for avoiding bot detection:

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

```javascript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://example.com');
```

The stealth plugin applies 17 evasion techniques: removing `HeadlessChrome` from the User-Agent, hiding `navigator.webdriver`, spoofing `navigator.plugins`, mocking `chrome.runtime`, and more.

**Limitations (as of February 2026):** The stealth plugin has not been actively maintained since 2022 and its evasion techniques are increasingly defeated by advanced anti-bot systems (Cloudflare Turnstile, DataDome, Imperva). It remains effective against basic bot detection only. For production scraping against protected sites, consider dedicated scraping APIs or managed browser services.

---

## Sources

- [Puppeteer GitHub Repository](https://github.com/puppeteer/puppeteer)
- [Puppeteer Documentation (pptr.dev)](https://pptr.dev/)
- [Puppeteer API Reference](https://pptr.dev/api)
- [Puppeteer npm Package](https://www.npmjs.com/package/puppeteer)
- [Puppeteer Headless Modes Guide](https://pptr.dev/guides/headless-modes)
- [Puppeteer Network Interception Guide](https://pptr.dev/guides/network-interception)
- [Puppeteer Screenshots Guide](https://pptr.dev/guides/screenshots)
- [Puppeteer PDF Generation Guide](https://pptr.dev/guides/pdf-generation)
- [Puppeteer Page Interactions Guide](https://pptr.dev/guides/page-interactions)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)
- [Puppeteer Supported Browsers](https://pptr.dev/supported-browsers)
- [Puppeteer Configuration](https://pptr.dev/guides/configuration)
- [Puppeteer WebDriver BiDi Support](https://pptr.dev/webdriver-bidi)
- [Chrome for Testing Blog Post](https://developer.chrome.com/blog/chrome-for-testing)
- [WebDriver BiDi Production-Ready Announcement](https://developer.chrome.com/blog/firefox-support-in-puppeteer-with-webdriver-bidi)
- [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Puppeteer Changelog](https://pptr.dev/CHANGELOG)
