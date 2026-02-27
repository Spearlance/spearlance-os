# Playwright Developer Reference

> **Last Updated:** February 2026
> **Current Version:** 1.58.2 (released January 30, 2026)
> **Bundled Browsers:** Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0
> **Node.js:** Requires 18+ (Node.js 18 deprecated; 20+ recommended)

---

## Table of Contents

1. [Installation and Configuration](#1-installation-and-configuration)
2. [Test Structure and Fixtures](#2-test-structure-and-fixtures)
3. [Locators and Selectors](#3-locators-and-selectors)
4. [Actions and Interactions](#4-actions-and-interactions)
5. [Assertions](#5-assertions)
6. [Navigation and Waiting](#6-navigation-and-waiting)
7. [Network Interception and API Mocking](#7-network-interception-and-api-mocking)
8. [Screenshots and Visual Comparison](#8-screenshots-and-visual-comparison)
9. [Authentication and Storage State](#9-authentication-and-storage-state)
10. [Parallel Execution and Sharding](#10-parallel-execution-and-sharding)
11. [Component Testing](#11-component-testing)
12. [CI/CD Integration](#12-cicd-integration)
13. [Debugging and Trace Viewer](#13-debugging-and-trace-viewer)
14. [Common Errors and Fixes](#14-common-errors-and-fixes)
15. [Recent Changes and Deprecations](#15-recent-changes-and-deprecations)

---

## 1. Installation and Configuration

### Installation

```bash
# New project (interactive setup)
npm init playwright@latest

# Add to existing project
npm install -D @playwright/test
npx playwright install
```

### Full Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // --- Test Discovery ---
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/helpers/**',

  // --- Execution ---
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,             // Per-test timeout (ms)
  expect: {
    timeout: 5_000,            // Per-assertion timeout (ms)
    toHaveScreenshot: {
      maxDiffPixels: 10,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  // --- Reporting ---
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }],
    ['list'],
  ],
  outputDir: './test-results',

  // --- Shared Settings ---
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    geolocation: { latitude: 40.7128, longitude: -74.0060 },
    colorScheme: 'dark',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  // --- Projects (browsers/devices) ---
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],

  // --- Dev Server ---
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // --- Flaky Test Detection (as of v1.52) ---
  failOnFlakyTests: true,

  // --- Git Info in Reports (as of v1.51) ---
  captureGitInfo: { commit: true, diff: true },
});
```

### Key Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `testDir` | `string` | `'.'` | Directory to scan for test files |
| `timeout` | `number` | `30000` | Per-test timeout in ms |
| `retries` | `number` | `0` | Number of retries per test |
| `workers` | `number\|string` | `'50%'` | Parallel workers (`'50%'` = half CPU cores) |
| `fullyParallel` | `boolean` | `false` | Run tests within a file in parallel |
| `forbidOnly` | `boolean` | `false` | Fail if `test.only` present (for CI) |
| `use.baseURL` | `string` | - | Base URL for `page.goto('/')` |
| `use.trace` | `string` | `'off'` | `'off'`, `'on'`, `'retain-on-failure'`, `'on-first-retry'` |
| `use.screenshot` | `string` | `'off'` | `'off'`, `'on'`, `'only-on-failure'` |
| `use.video` | `string` | `'off'` | `'off'`, `'on'`, `'retain-on-failure'`, `'on-first-retry'` |

---

## 2. Test Structure and Fixtures

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

### Test Groups

```typescript
test.describe('authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('failed login shows error', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('bad');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
```

### Serial Execution

```typescript
// Forces tests in this block to run sequentially
test.describe.serial('checkout flow', () => {
  test('add item to cart', async ({ page }) => { /* ... */ });
  test('proceed to checkout', async ({ page }) => { /* ... */ });
  test('complete payment', async ({ page }) => { /* ... */ });
});
```

### Test Annotations

```typescript
test.skip('broken feature', async ({ page }) => { /* ... */ });
test.fixme('needs investigation', async ({ page }) => { /* ... */ });
test.slow('large data set', async ({ page }) => { /* 3x timeout */ });

test('conditional skip', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Not supported on WebKit');
  // ...
});

// Tags
test('admin feature @admin @smoke', async ({ page }) => { /* ... */ });
// Run with: npx playwright test --grep @smoke
```

### Custom Fixtures

```typescript
import { test as base, expect } from '@playwright/test';

type MyFixtures = {
  todoPage: TodoPage;
};

const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
    // Teardown runs after each test
    await todoPage.removeAll();
  },
});

class TodoPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/todos');
  }

  async addTodo(text: string) {
    await this.page.getByPlaceholder('What needs to be done?').fill(text);
    await this.page.getByPlaceholder('What needs to be done?').press('Enter');
  }

  async removeAll() {
    // cleanup logic
  }
}

test('add a todo', async ({ todoPage }) => {
  await todoPage.addTodo('Buy milk');
});
```

### Built-in Fixtures

| Fixture | Scope | Description |
|---------|-------|-------------|
| `page` | test | Isolated browser page |
| `context` | test | Isolated browser context |
| `browser` | worker | Shared browser instance |
| `browserName` | worker | `'chromium'`, `'firefox'`, or `'webkit'` |
| `request` | test | API request context (for API testing) |

### Test Steps

```typescript
test('checkout flow', async ({ page }) => {
  await test.step('add item to cart', async () => {
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
  });

  await test.step('complete checkout', async () => {
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
  });

  // Steps support timeout (as of v1.50)
  await test.step('payment', async () => {
    await page.getByLabel('Card number').fill('4242424242424242');
  }, { timeout: 60_000 });
});
```

---

## 3. Locators and Selectors

### Recommended Locators (Priority Order)

```typescript
// 1. Role-based (best -- mirrors how users interact with the page)
page.getByRole('button', { name: 'Submit' });
page.getByRole('heading', { name: 'Welcome', level: 1 });
page.getByRole('link', { name: 'Sign up' });
page.getByRole('checkbox', { name: 'Accept terms' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('combobox', { name: 'Country' });
page.getByRole('dialog', { name: 'Confirm' });
page.getByRole('navigation');
page.getByRole('tab', { name: 'Settings' });
page.getByRole('row', { name: 'John Doe' });

// 2. Label-based (form fields)
page.getByLabel('Email address');
page.getByLabel('Password');

// 3. Placeholder-based
page.getByPlaceholder('Search...');

// 4. Text-based
page.getByText('Welcome back');
page.getByText('Welcome', { exact: true });  // exact match

// 5. Alt text (images)
page.getByAltText('Company logo');

// 6. Title attribute
page.getByTitle('Close dialog');

// 7. Test ID (fallback when no semantic locator works)
page.getByTestId('submit-button');
// Configure custom attribute:
// use: { testIdAttribute: 'data-cy' }  // in config
```

### CSS and XPath (Use Sparingly)

```typescript
// CSS selector
page.locator('css=div.card >> text=Buy now');
page.locator('.card:has-text("Buy now")');
page.locator('article:has(img.hero)');

// XPath
page.locator('xpath=//button[contains(text(), "Submit")]');
```

### Filtering and Chaining

```typescript
// Filter by text
page.getByRole('listitem').filter({ hasText: 'Product 1' });

// Filter by NOT having text
page.getByRole('listitem').filter({ hasNotText: 'Sold out' });

// Filter by child locator
page.getByRole('listitem').filter({
  has: page.getByRole('button', { name: 'Add to cart' }),
});

// Filter by visibility (as of v1.51)
page.getByRole('button', { name: 'Submit' }).filter({ visible: true });

// Chaining: narrow scope
page.getByRole('dialog').getByRole('button', { name: 'Confirm' });

// nth, first, last
page.getByRole('listitem').nth(2);     // 0-indexed
page.getByRole('listitem').first();
page.getByRole('listitem').last();

// or() - match either locator
page.getByRole('button', { name: 'Log in' })
  .or(page.getByRole('button', { name: 'Sign in' }));

// and() - match both conditions
page.getByRole('button').and(page.getByText('Submit'));
```

### Frame Locators

```typescript
// Locate element inside an iframe
const frame = page.frameLocator('#payment-iframe');
await frame.getByRole('button', { name: 'Pay' }).click();

// Nested iframes
page.frameLocator('#outer').frameLocator('#inner').getByText('Hello');
```

---

## 4. Actions and Interactions

### Click Actions

```typescript
await locator.click();
await locator.click({ button: 'right' });         // right-click
await locator.click({ clickCount: 2 });            // double-click
await locator.dblclick();                          // shorthand for double-click
await locator.click({ modifiers: ['Shift'] });     // shift+click
await locator.click({ modifiers: ['Control'] });   // ctrl+click
await locator.click({ position: { x: 10, y: 20 } }); // click at offset
await locator.click({ force: true });              // skip actionability checks
await locator.click({ timeout: 10_000 });          // custom timeout
await locator.click({ trial: true });              // check clickability, don't click
await locator.click({ steps: 5 });                 // mouse move steps (as of v1.57)
```

### Text Input

```typescript
await locator.fill('hello@example.com');           // clear + type instantly
await locator.clear();                             // clear field
await locator.pressSequentially('hello', { delay: 100 }); // type char by char
await locator.press('Enter');                      // single key
await locator.press('Control+a');                  // key combo
await locator.press('Meta+c');                     // Cmd+C on Mac
```

**Note:** `locator.type()` is deprecated as of v1.54. Use `locator.fill()` for setting values or `locator.pressSequentially()` for character-by-character typing.

### Select, Check, Upload

```typescript
// Select dropdown
await locator.selectOption('value');               // by value
await locator.selectOption({ label: 'Blue' });     // by visible text
await locator.selectOption(['red', 'green']);       // multi-select

// Checkbox / Radio
await locator.check();
await locator.uncheck();
await locator.setChecked(true);

// File upload
await locator.setInputFiles('file.pdf');
await locator.setInputFiles(['file1.pdf', 'file2.pdf']);
await locator.setInputFiles([]);                   // clear file input
await locator.setInputFiles({
  name: 'data.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from('col1,col2\na,b'),
});
```

### Drag and Drop

```typescript
await source.dragTo(target);
await source.dragTo(target, {
  sourcePosition: { x: 10, y: 10 },
  targetPosition: { x: 20, y: 20 },
  steps: 5,   // as of v1.57
});
```

### Hover, Focus, Scroll

```typescript
await locator.hover();
await locator.focus();
await locator.scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 500);  // scroll down 500px
```

### Keyboard

```typescript
await page.keyboard.press('Escape');
await page.keyboard.press('Tab');
await page.keyboard.down('Shift');
await page.keyboard.press('ArrowDown');
await page.keyboard.up('Shift');
await page.keyboard.insertText('Hello');
```

---

## 5. Assertions

### Locator Assertions

```typescript
// Visibility
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeAttached();
await expect(locator).not.toBeAttached();

// State
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeEditable();
await expect(locator).toBeChecked();
await expect(locator).toBeFocused();
await expect(locator).toBeEmpty();

// Content
await expect(locator).toHaveText('exact text');
await expect(locator).toHaveText(/regex/);
await expect(locator).toContainText('partial');
await expect(locator).toHaveValue('input value');
await expect(locator).toHaveValues(['a', 'b']);   // multi-select
await expect(locator).toHaveAttribute('href', '/home');
await expect(locator).toHaveClass(/active/);
await expect(locator).toContainClass('active');   // as of v1.52
await expect(locator).toHaveCSS('color', 'rgb(0, 0, 0)');
await expect(locator).toHaveId('main-header');
await expect(locator).toHaveCount(5);             // number of matching elements

// Accessibility
await expect(locator).toHaveAccessibleName('Submit form');
await expect(locator).toHaveAccessibleDescription('Click to submit');
await expect(locator).toHaveAccessibleErrorMessage('Required'); // as of v1.50
await expect(locator).toHaveRole('button');

// Aria snapshot matching (as of v1.50)
await expect(locator).toMatchAriaSnapshot(`
  - heading "Welcome"
  - button "Sign in"
`);
```

### Page Assertions

```typescript
await expect(page).toHaveTitle('Dashboard');
await expect(page).toHaveTitle(/Dashboard/);
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/\/dashboard/);
await expect(page).toHaveURL(url => url.searchParams.has('id')); // predicate (v1.51)
await expect(page).toHaveScreenshot();
await expect(page).toHaveScreenshot('login.png');
```

### API Response Assertions

```typescript
const response = await page.request.get('/api/users');
await expect(response).toBeOK();                  // status 200-299
expect(response.status()).toBe(200);
expect(await response.json()).toEqual({ users: [] });
```

### Soft Assertions

```typescript
// Soft assertions do not stop the test on failure
await expect.soft(locator).toHaveText('expected');
await expect.soft(locator).toBeVisible();
// Test continues; failures collected and reported at end
```

### Custom Timeout on Assertions

```typescript
await expect(locator).toBeVisible({ timeout: 10_000 });
```

### Negation

```typescript
await expect(locator).not.toBeVisible();
await expect(locator).not.toHaveText('wrong');
```

---

## 6. Navigation and Waiting

### Navigation

```typescript
await page.goto('/');                               // uses baseURL
await page.goto('https://example.com');
await page.goto('/', { waitUntil: 'networkidle' }); // wait for network idle
await page.goto('/', { timeout: 60_000 });

await page.goBack();
await page.goForward();
await page.reload();
```

### Wait Until Options

| Option | Description |
|--------|-------------|
| `'load'` | Wait for `load` event (default) |
| `'domcontentloaded'` | Wait for `DOMContentLoaded` event |
| `'networkidle'` | Wait until no network requests for 500ms |
| `'commit'` | Wait for response received and document starts loading |

### Auto-Waiting

Playwright auto-waits for elements before performing actions. The following actionability checks run automatically:

| Check | Actions |
|-------|---------|
| Attached to DOM | All actions |
| Visible | `click`, `dblclick`, `hover`, `fill`, `selectOption`, `check`, `uncheck` |
| Stable (not animating) | `click`, `dblclick`, `hover` |
| Receives events (not obscured) | `click`, `dblclick`, `hover` |
| Enabled | `click`, `dblclick`, `fill`, `selectOption`, `check`, `uncheck` |
| Editable | `fill`, `selectOption` |

### Explicit Waits

```typescript
// Wait for locator state
await locator.waitFor();                            // default: 'visible'
await locator.waitFor({ state: 'attached' });
await locator.waitFor({ state: 'detached' });
await locator.waitFor({ state: 'hidden' });

// Wait for URL
await page.waitForURL('/dashboard');
await page.waitForURL(/\/dashboard/);

// Wait for network response
const response = await page.waitForResponse('**/api/users');
const response = await page.waitForResponse(
  resp => resp.url().includes('/api/users') && resp.status() === 200
);

// Wait for network request
const request = await page.waitForRequest('**/api/submit');

// Wait for load state
await page.waitForLoadState('networkidle');
await page.waitForLoadState('domcontentloaded');

// Wait for event
await page.waitForEvent('download');
await page.waitForEvent('popup');
await page.waitForEvent('dialog');
```

### Handling Dialogs

```typescript
// Accept dialog
page.on('dialog', dialog => dialog.accept());

// Accept with input (prompt dialog)
page.on('dialog', dialog => dialog.accept('my input'));

// Dismiss dialog
page.on('dialog', dialog => dialog.dismiss());

// Assert dialog message
page.once('dialog', async dialog => {
  expect(dialog.message()).toBe('Are you sure?');
  await dialog.accept();
});
```

---

## 7. Network Interception and API Mocking

### Route Interception

```typescript
// Mock an API endpoint
await page.route('**/api/users', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Alice' }]),
  });
});

// Modify a response
await page.route('**/api/users', async route => {
  const response = await route.fetch();
  const json = await response.json();
  json.push({ id: 99, name: 'Injected' });
  await route.fulfill({ response, json });
});

// Abort a request
await page.route('**/*.png', route => route.abort());

// Continue with modifications
await page.route('**/api/data', async route => {
  await route.continue({
    headers: {
      ...route.request().headers(),
      'X-Custom-Header': 'value',
    },
  });
});

// Remove route
await page.unroute('**/api/users');

// Route on context (applies to all pages)
await context.route('**/api/**', route => route.fulfill({ body: '{}' }));
```

### URL Patterns

```typescript
// Glob patterns
await page.route('**/api/users', handler);         // any path ending in /api/users
await page.route('**/api/*', handler);              // single segment wildcard

// Regex
await page.route(/\/api\/users\/\d+/, handler);

// Predicate function
await page.route(
  url => url.pathname.startsWith('/api/') && url.searchParams.has('key'),
  handler
);
```

### HAR Recording and Playback

```typescript
// Record network to HAR file
await page.routeFromHAR('tests/data/api.har', {
  url: '**/api/**',
  update: true,  // record mode
});
// Run the test -- requests are captured to the HAR file

// Playback from HAR file
await page.routeFromHAR('tests/data/api.har', {
  url: '**/api/**',
  update: false,  // playback mode (default)
});
```

### API Testing (Without Browser)

```typescript
import { test, expect } from '@playwright/test';

test('API: create user', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'Alice', email: 'alice@example.com' },
  });
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user.name).toBe('Alice');
});

test('API: get users', async ({ request }) => {
  const response = await request.get('/api/users');
  expect(response.ok()).toBeTruthy();
  const users = await response.json();
  expect(users.length).toBeGreaterThan(0);
});
```

---

## 8. Screenshots and Visual Comparison

### Screenshots

```typescript
// Full page screenshot
await page.screenshot({ path: 'screenshot.png' });
await page.screenshot({ path: 'full.png', fullPage: true });

// Element screenshot
await locator.screenshot({ path: 'button.png' });

// Clip a region
await page.screenshot({
  path: 'region.png',
  clip: { x: 0, y: 0, width: 800, height: 600 },
});

// Screenshot to buffer
const buffer = await page.screenshot();
```

### Visual Comparison (Snapshot Testing)

```typescript
// Compare page screenshot against baseline
await expect(page).toHaveScreenshot();

// Named snapshot
await expect(page).toHaveScreenshot('homepage.png');

// Element comparison
await expect(locator).toHaveScreenshot('button.png');

// With threshold options
await expect(page).toHaveScreenshot({
  maxDiffPixels: 100,           // allow up to 100 different pixels
  maxDiffPixelRatio: 0.01,      // allow 1% pixel difference
  threshold: 0.2,               // per-pixel color threshold (0-1)
  animations: 'disabled',       // disable CSS animations
  mask: [page.locator('.ad')],  // mask dynamic elements
});
```

### Screenshot Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 10,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  // Snapshot path template (as of v1.50)
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
});
```

### Updating Snapshots

```bash
# Update all snapshots
npx playwright test --update-snapshots

# Update only changed snapshots (as of v1.50)
# Set in config: updateSnapshots: 'changed'
```

---

## 9. Authentication and Storage State

### Save and Reuse Auth State

```typescript
// auth.setup.ts -- runs before all tests
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  // Save signed-in state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Setup project runs first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### IndexedDB Storage State (as of v1.51)

```typescript
// Save including IndexedDB
await page.context().storageState({
  path: 'auth.json',
  indexedDB: true,  // captures IndexedDB contents
});

// Restore with IndexedDB
const context = await browser.newContext({
  storageState: 'auth.json',
});
```

### Multiple Roles

```typescript
// admin.setup.ts
setup('admin auth', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('adminpass');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});

// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'admin-tests',
    testMatch: /.*admin.*\.spec\.ts/,
    use: { storageState: 'playwright/.auth/admin.json' },
    dependencies: ['setup'],
  },
  {
    name: 'user-tests',
    use: { storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```

### `.gitignore` Entry

```
playwright/.auth/
```

---

## 10. Parallel Execution and Sharding

### Parallel Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  // Run test files in parallel
  fullyParallel: true,

  // Number of worker processes
  workers: 4,          // fixed count
  workers: '50%',      // percentage of CPU cores

  // Per-project workers (as of v1.52)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      workers: 2,  // limit this project to 2 workers
    },
  ],
});
```

### Serial Tests

```typescript
// Force sequential execution within a describe block
test.describe.serial('multi-step flow', () => {
  test('step 1', async ({ page }) => { /* ... */ });
  test('step 2', async ({ page }) => { /* ... */ });
  test('step 3', async ({ page }) => { /* ... */ });
});
```

### Sharding (CI Distribution)

```bash
# Split tests across 4 machines
npx playwright test --shard=1/4  # machine 1
npx playwright test --shard=2/4  # machine 2
npx playwright test --shard=3/4  # machine 3
npx playwright test --shard=4/4  # machine 4
```

### Merging Shard Reports

```bash
# Each shard outputs a blob report
npx playwright test --shard=1/4 --reporter=blob

# Merge all blob reports into a single HTML report
npx playwright merge-reports --reporter=html ./blob-reports
```

---

## 11. Component Testing

Component testing is **experimental** as of February 2026. It supports React, Vue, and Svelte.

### Setup

```bash
npm init playwright@latest -- --ct
```

### React Example

```typescript
// Button.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('renders with text', async ({ mount }) => {
  const component = await mount(<Button label="Click me" />);
  await expect(component).toContainText('Click me');
});

test('handles click', async ({ mount }) => {
  let clicked = false;
  const component = await mount(
    <Button label="Click me" onClick={() => { clicked = true; }} />
  );
  await component.click();
  expect(clicked).toBe(true);
});
```

### Vue Example

```typescript
// Counter.spec.ts
import { test, expect } from '@playwright/experimental-ct-vue';
import Counter from './Counter.vue';

test('increments count', async ({ mount }) => {
  const component = await mount(Counter, {
    props: { initialCount: 0 },
  });
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component.getByTestId('count')).toHaveText('1');
});
```

### Component Test Config

```typescript
// playwright-ct.config.ts
import { defineConfig } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.spec.tsx',
  use: {
    ctPort: 3100,
    ctViteConfig: {
      // Custom Vite configuration
    },
  },
});
```

---

## 12. CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Sharded GitHub Actions

```yaml
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }} --reporter=blob

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ strategy.job-index }}
          path: blob-report/
          retention-days: 1

  merge-reports:
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter=html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report/
          retention-days: 14
```

### Docker

```bash
# Use official Playwright Docker image
docker run --rm -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:v1.58.0-noble \
  npx playwright test
```

### CI Tips

| Tip | Details |
|-----|---------|
| Use `--with-deps` | `npx playwright install --with-deps` installs OS-level dependencies |
| Single browser for speed | `npx playwright test --project=chromium` |
| Set `forbidOnly: true` | Fail CI if `test.only` is left in code |
| Retries in CI | `retries: process.env.CI ? 2 : 0` |
| Single worker in CI | `workers: process.env.CI ? 1 : undefined` for stability |
| Upload artifacts | Always upload report/trace on failure |

---

## 13. Debugging and Trace Viewer

### Debug Mode

```bash
# Launch tests with Playwright Inspector (step through)
npx playwright test --debug

# Debug a specific test
npx playwright test --debug -g "login test"

# Debug in headed mode
npx playwright test --headed
```

### Trace Viewer

```bash
# View a trace file
npx playwright show-trace trace.zip

# Trace configuration in playwright.config.ts:
use: {
  trace: 'on',                  // always record
  trace: 'off',                 // never record
  trace: 'on-first-retry',     // record on first retry (recommended)
  trace: 'retain-on-failure',  // record all, keep only failures
}
```

The Trace Viewer shows:
- Timeline of actions with screenshots at each step
- DOM snapshot at each action (inspectable)
- Network requests and responses
- Console logs
- Source code for each action

### page.pause()

```typescript
test('debug this', async ({ page }) => {
  await page.goto('/');
  await page.pause();  // Opens Playwright Inspector here
  // Continue stepping through from the Inspector
  await page.getByRole('button', { name: 'Submit' }).click();
});
```

### VS Code Extension

The Playwright VS Code extension provides:
- Run/debug tests from the editor gutter
- Pick locators by clicking elements in the browser
- Live test recording (codegen)
- Step-through debugging with breakpoints
- Show/update trace viewer inline

Install: Search "Playwright Test for VS Code" in VS Code Extensions.

### Console and Network Inspection

```typescript
// Log all console messages
page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

// Log all requests
page.on('request', req => console.log(`>> ${req.method()} ${req.url()}`));
page.on('response', res => console.log(`<< ${res.status()} ${res.url()}`));

// Collect console messages (as of v1.56)
const messages = page.consoleMessages();
const errors = page.pageErrors();
const requests = page.requests();
```

### Codegen (Test Generator)

```bash
# Open browser and record actions as code
npx playwright codegen https://example.com

# Record with specific device emulation
npx playwright codegen --device="iPhone 13" https://example.com

# Record with specific viewport
npx playwright codegen --viewport-size=800,600 https://example.com
```

As of v1.55, Codegen automatically inserts `toBeVisible()` assertions for UI interactions.

---

## 14. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `TimeoutError: locator.click: Timeout 30000ms exceeded` | Element not found, not visible, or obscured within timeout | Use a more specific locator; check element is rendered; increase timeout with `{ timeout: 60000 }` |
| `Error: strict mode violation: getByRole('button') resolved to N elements` | Locator matches multiple elements | Make locator more specific: add `{ name: '...' }`, use `.filter()`, or chain from a parent container |
| `Error: Element is not visible` | Element exists in DOM but has `display:none`, `visibility:hidden`, or zero dimensions | Wait for visibility: `await locator.waitFor({ state: 'visible' })`; check CSS; scroll into view |
| `Error: Element is outside of the viewport` | Element exists but is scrolled off-screen | Call `await locator.scrollIntoViewIfNeeded()` before interacting, or use `{ force: true }` |
| `Error: Element is not enabled` | Attempting to click/fill a disabled element | Wait for the element to become enabled: `await expect(locator).toBeEnabled()` before acting |
| `Error: Target closed` | Browser or page closed before action completed | Check for unhandled navigation; ensure `await` on all async calls; increase navigation timeout |
| `Error: page.goto: net::ERR_CONNECTION_REFUSED` | Dev server not running or wrong URL | Check `webServer` config in `playwright.config.ts`; verify `baseURL` is correct |
| `Error: browserType.launch: Executable doesn't exist` | Browsers not installed | Run `npx playwright install` or `npx playwright install --with-deps` |
| `Error: locator.fill: Element is not an <input>, <textarea> or [contenteditable] element` | Calling `.fill()` on wrong element type | Target the actual `<input>` element; use `getByLabel()` or `getByRole('textbox')` |
| `Error: expect(locator).toBeEditable: Element is not editable` | As of v1.50, `toBeEditable()` throws for non-editable element types | Ensure the locator targets an `<input>`, `<textarea>`, `<select>`, or `[contenteditable]` element |
| `Snapshot mismatch: X pixels differ` | Visual regression detected | Run `--update-snapshots` if change is intentional; add `mask` for dynamic content; increase `threshold` |
| `Error: No tests found` | Test file pattern does not match or test directory is wrong | Check `testDir` and `testMatch` in config; ensure files end in `.spec.ts` or `.test.ts` |
| `Error: Cannot use import statement outside a module` | Missing TypeScript/ESM configuration | Ensure `@playwright/test` is installed and config uses `.ts` extension; check `tsconfig.json` |

---

## 15. Recent Changes and Deprecations

### v1.58 (January 2026)

**New:**
- Timeline visualization in HTML report Speedboard tab for merged reports
- `browserType.connectOverCDP()` accepts `isLocal` option for file system optimizations
- UI Mode and Trace Viewer: system theme option, search in code editors, reorganized network panel, auto-formatted JSON

**Breaking:**
- `_react` and `_vue` selectors removed -- use standard CSS or role-based locators
- `:light` selector engine suffix removed
- `devtools` option removed from `browserType.launch()` -- use `args: ['--auto-open-devtools-for-tabs']`
- macOS 13 WebKit support discontinued

**Browsers:** Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0

### v1.57 (December 2025)

**New:**
- Switched from Chromium to Chrome for Testing builds (headed and headless)
- Speedboard tab in HTML reporter shows tests sorted by execution time
- `testConfig.webServer.wait` field -- regex to match webserver logs before starting tests
- `testConfig.tag` property adds tags to all tests in a run
- `worker.on('console')` event for Service Worker console messages
- `locator.description()` and `locator.toString()` improvements
- Service Worker network requests now routable via BrowserContext (Chromium only)
- New `steps` option in `locator.click()` and `locator.dragTo()`

**Breaking:**
- `page.accessibility` API removed (deprecated for 3 years) -- use Axe or similar libraries

### v1.56 (October 2025)

**New:**
- Playwright Test Agents: planner, generator, and healer for LLM-driven test workflows
- `page.consoleMessages()`, `page.pageErrors()`, `page.requests()` methods
- `--test-list` and `--test-list-invert` CLI options
- Aria snapshots render `input` `placeholder` attributes
- `PLAYWRIGHT_TEST` environment variable set in worker processes

**Breaking:**
- `browserContext.on('backgroundpage')` event deprecated; `backgroundPages()` returns empty list

### v1.55 (September 2025)

**New:**
- `testStepInfo.titlePath` property
- Codegen auto-generates `toBeVisible()` assertions

**Breaking:**
- Chromium extension manifest v2 support dropped

### v1.54 (July 2025)

**New:**
- Partitioned cookies: `partitionKey` property in `browserContext.cookies()` and `addCookies()`
- `npx playwright install --list` shows installed browsers
- HTML reporter `noSnippets` option
- Test annotations include `location` property

**Breaking:**
- `locator.type()`, `page.type()`, `frame.type()` deprecated -- use `locator.fill()`
- `-gv` flag removed -- use `--grep-invert`
- `npx playwright open` no longer opens test recorder -- use `npx playwright codegen`
- Node.js 16 support removed; Node.js 18 deprecated

### v1.53 (June 2025)

**New:**
- Steps visualization in Trace Viewer and HTML reporter
- `locator.describe()` method
- HTML reporter `title` option

### v1.52 (April 2025)

**New:**
- `expect(locator).toContainClass()` assertion
- `testProject.workers` for per-project worker count
- `testConfig.failOnFlakyTests`
- `maxRedirects` option in `apiRequest.newContext()`
- NOT filtering via `!@tag` in HTML reporter

**Breaking:**
- Glob URL patterns no longer support `?` and `[]` -- use regex
- `route.continue()` cannot override `Cookie` header
- macOS 13 WebKit support deprecated (removed in v1.58)

### v1.51 (February 2025)

**New:**
- `indexedDB` option in `browserContext.storageState()`
- "Copy prompt" button in HTML report for LLM error context
- `visible` option in `locator.filter()`
- `testConfig.captureGitInfo`
- `TestStepInfo` with `skip()` and `attach()` methods
- `contrast` option in `page.emulateMedia()`
- `expect(page).toHaveURL()` supports predicates

### v1.50 (December 2024)

**New:**
- Test step `timeout` option
- `test.step.skip()` method
- `expect(locator).toMatchAriaSnapshot()` with YAML files
- `expect(locator).toHaveAccessibleErrorMessage()`
- `updateSnapshots: 'changed'` config option
- `pathTemplate` for screenshot and aria snapshots
- Codegen element picker for aria snapshots

**Breaking:**
- `expect(locator).toBeEditable()` and `locator.isEditable()` throw for non-editable elements
- `updateSnapshots: 'all'` now updates all snapshots, not only changed ones

---

## Appendix: CLI Commands

| Command | Description |
|---------|-------------|
| `npx playwright test` | Run all tests |
| `npx playwright test tests/login.spec.ts` | Run specific file |
| `npx playwright test -g "login"` | Run tests matching grep pattern |
| `npx playwright test --project=chromium` | Run on specific browser |
| `npx playwright test --headed` | Run in headed mode |
| `npx playwright test --debug` | Run with Playwright Inspector |
| `npx playwright test --ui` | Run in UI Mode |
| `npx playwright test --trace on` | Force trace recording |
| `npx playwright test --update-snapshots` | Update snapshot baselines |
| `npx playwright test --shard=1/4` | Run shard 1 of 4 |
| `npx playwright test --grep @smoke` | Run tagged tests |
| `npx playwright test --grep-invert @slow` | Exclude tagged tests |
| `npx playwright test --reporter=list` | Use specific reporter |
| `npx playwright test --workers=4` | Set worker count |
| `npx playwright test --retries=3` | Set retry count |
| `npx playwright codegen [url]` | Record a test |
| `npx playwright show-report` | Open HTML report |
| `npx playwright show-trace trace.zip` | Open Trace Viewer |
| `npx playwright install` | Install browsers |
| `npx playwright install --with-deps` | Install browsers + OS dependencies |
| `npx playwright install --list` | Show installed browsers |
| `npx playwright install chromium` | Install specific browser |

## Appendix: Useful Links

- [Official Documentation](https://playwright.dev/docs/intro)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Release Notes](https://playwright.dev/docs/release-notes)
- [GitHub Repository](https://github.com/microsoft/playwright)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
- [Docker Images](https://mcr.microsoft.com/en-us/artifact/mar/playwright)
- [Community Discord](https://aka.ms/playwright/discord)
