# Vitest Developer Reference

> **Last Updated:** February 2026
> **Current Version:** 4.0.18
> **Requires:** Vite >= 6.0.0, Node >= 20.0.0
> **Documentation:** https://vitest.dev

---

## Table of Contents

1. [Installation and Configuration](#installation-and-configuration)
2. [Test Structure](#test-structure)
3. [Assertions and Matchers](#assertions-and-matchers)
4. [Mocking](#mocking)
5. [Snapshot Testing](#snapshot-testing)
6. [Timer and Date Mocking](#timer-and-date-mocking)
7. [Component Testing](#component-testing)
8. [Browser Mode](#browser-mode)
9. [Coverage](#coverage)
10. [Projects and Monorepo](#projects-and-monorepo)
11. [TypeScript Integration](#typescript-integration)
12. [Watch Mode and Filtering](#watch-mode-and-filtering)
13. [CI/CD Integration](#cicd-integration)
14. [Migration from Jest](#migration-from-jest)
15. [Common Errors and Fixes](#common-errors-and-fixes)
16. [Recent Changes](#recent-changes)

---

## Installation and Configuration

### Install

```bash
npm install -D vitest
```

Vitest uses Vite's transform pipeline natively. No Babel, no ts-jest, no separate transpilation step. If you already have a `vite.config.ts`, Vitest reads it automatically including plugins and path aliases.

### Minimal Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['node_modules', '.git'],
  },
});
```

### Using Existing Vite Config

```typescript
// vite.config.ts — Vitest reads this automatically
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
```

### Separate Config File

When you need different settings from your Vite build config:

```typescript
// vitest.config.ts — takes precedence over vite.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
```

### Environment Options

| Environment | Package | Use Case |
|-------------|---------|----------|
| `node` | Built-in | Server-side code, APIs, utilities |
| `jsdom` | `jsdom` | DOM testing without real browser |
| `happy-dom` | `happy-dom` | Faster DOM testing (less complete than jsdom) |
| `edge-runtime` | `@edge-runtime/vm` | Edge/serverless environments |

```typescript
// Per-file environment override
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
```

### Package.json Script

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Test Structure

### describe, it, test

```typescript
import { describe, it, test, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';

describe('Calculator', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  afterEach(() => {
    calc.reset();
  });

  it('adds two numbers', () => {
    expect(calc.add(1, 2)).toBe(3);
  });

  test('subtracts two numbers', () => {
    expect(calc.subtract(5, 3)).toBe(2);
  });
});
```

`it` and `test` are aliases. Use whichever reads better in context.

### test.each — Parameterized Tests

```typescript
test.each([
  [1, 2, 3],
  [0, 0, 0],
  [-1, 1, 0],
])('add(%i, %i) returns %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});

// Template literal syntax
test.each`
  a    | b    | expected
  ${1} | ${2} | ${3}
  ${0} | ${0} | ${0}
`('add($a, $b) returns $expected', ({ a, b, expected }) => {
  expect(add(a, b)).toBe(expected);
});
```

### test.for — Alternative to test.each

`test.for` does not spread array arguments and provides `TestContext` for concurrent snapshot support:

```typescript
test.for([
  { input: 'hello', expected: 5 },
  { input: 'world', expected: 5 },
])('length of "$input" is $expected', ({ input, expected }, { expect }) => {
  expect(input.length).toBe(expected);
});
```

### test.concurrent — Parallel Execution

```typescript
describe('database queries', () => {
  test.concurrent('fetches users', async () => {
    const users = await fetchUsers();
    expect(users).toHaveLength(10);
  });

  test.concurrent('fetches posts', async () => {
    const posts = await fetchPosts();
    expect(posts).toHaveLength(25);
  });
});
```

### Skipping, Focusing, and Conditional Tests

```typescript
test.skip('not implemented yet', () => { /* ... */ });
test.todo('implement validation');
test.only('debug this specific test', () => { /* ... */ });

test.skipIf(process.env.CI)('skipped in CI', () => { /* ... */ });
test.runIf(process.env.CI)('only runs in CI', () => { /* ... */ });

// Dynamic skip within test body
test('conditional', ({ skip }) => {
  if (!someCondition) skip();
  // ...
});
```

### test.fails — Expected Failures

```typescript
test.fails('this assertion is expected to fail', () => {
  expect(1).toBe(2);
});
```

### Lifecycle Hooks

```typescript
beforeAll(async () => {
  await db.connect();
  // Return cleanup function (runs after all tests)
  return async () => { await db.disconnect(); };
});

beforeEach(async () => {
  await db.seed();
  // Return cleanup function (runs after each test)
  return async () => { await db.truncate(); };
});

afterEach(() => { /* runs after each test */ });
afterAll(() => { /* runs after all tests in suite */ });

// Runtime hooks (inside test body)
import { onTestFinished, onTestFailed } from 'vitest';

test('with runtime hooks', () => {
  onTestFinished(() => { /* always runs when test completes */ });
  onTestFailed(({ errors }) => { /* only runs if test fails */ });
  // ...
});
```

---

## Assertions and Matchers

### Equality

```typescript
expect(2 + 2).toBe(4);                          // Strict equality (===)
expect({ a: 1 }).toEqual({ a: 1 });             // Deep equality
expect({ a: 1, b: 2 }).toStrictEqual({ a: 1, b: 2 }); // Deep + type equality
```

### Truthiness and Type Checks

```typescript
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNaN();
expect(value).toBeTypeOf('string');              // typeof check
expect(value).toBeInstanceOf(Date);
```

### Numeric Matchers

```typescript
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(5);
expect(value).toBeLessThanOrEqual(5);
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);          // Floating-point precision
```

### String and Collection Matchers

```typescript
expect('hello world').toMatch(/world/);
expect('hello world').toContain('world');
expect([1, 2, 3]).toContain(2);
expect([{ a: 1 }, { b: 2 }]).toContainEqual({ a: 1 });
expect([1, 2, 3]).toHaveLength(3);
expect({ a: 1, b: { c: 2 } }).toHaveProperty('b.c', 2);
expect({ a: 1 }).toMatchObject({ a: 1 });        // Subset match
```

### Error Matchers

```typescript
expect(() => throwingFn()).toThrow();
expect(() => throwingFn()).toThrow('specific message');
expect(() => throwingFn()).toThrow(/regex/);
expect(() => throwingFn()).toThrow(CustomError);
```

### Mock Function Matchers

```typescript
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
expect(fn).toHaveBeenLastCalledWith('arg1');
expect(fn).toHaveBeenNthCalledWith(1, 'arg1');
expect(fn).toHaveReturned();
expect(fn).toHaveReturnedWith(42);
expect(fn).toHaveBeenCalledExactlyOnceWith('arg'); // Added in v3.0
```

### Promise Matchers

```typescript
await expect(asyncFn()).resolves.toBe(42);
await expect(asyncFn()).rejects.toThrow('error');
expect(fn).toHaveResolved();
expect(fn).toHaveResolvedWith(42);
```

### Asymmetric Matchers

```typescript
expect(fn).toHaveBeenCalledWith(
  expect.anything(),                              // Any value except null/undefined
  expect.any(String),                             // Any instance of String
  expect.stringContaining('partial'),
  expect.stringMatching(/regex/),
  expect.arrayContaining([1, 2]),
  expect.objectContaining({ key: 'value' }),
  expect.closeTo(0.3, 5),                        // Floating-point in objects
);

// Added in v3.0
expect(value).toBeOneOf([1, 2, 3]);

// Added in v4.0 — Standard Schema validation (Zod, Valibot, ArkType)
import { z } from 'zod';
expect(data).toEqual(
  expect.schemaMatching(z.object({ name: z.string() }))
);
```

### Soft Assertions and Polling

```typescript
// Soft assertions — continue after failure, report all at end
expect.soft(value1).toBe(1);
expect.soft(value2).toBe(2);

// Polling — retry assertion until success or timeout
await expect.poll(() => fetchStatus()).toBe('ready');
await expect.poll(() => fetchStatus(), { timeout: 5000, interval: 100 }).toBe('ready');

// Assertion count verification
expect.assertions(3);     // Exactly 3 assertions must run
expect.hasAssertions();    // At least 1 assertion must run
```

### Custom Matchers

```typescript
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor}-${ceiling}`,
    };
  },
});

// Usage
expect(100).toBeWithinRange(90, 110);

// TypeScript: augment the interface
declare module 'vitest' {
  interface Assertion<T> {
    toBeWithinRange(floor: number, ceiling: number): T;
  }
  interface AsymmetricMatchersContaining {
    toBeWithinRange(floor: number, ceiling: number): void;
  }
}
```

---

## Mocking

### vi.fn() — Mock Functions

```typescript
import { vi, describe, it, expect } from 'vitest';

const getPrice = vi.fn(() => 100);

getPrice('item-1');
getPrice('item-2');

expect(getPrice).toHaveBeenCalledTimes(2);
expect(getPrice).toHaveBeenCalledWith('item-1');
expect(getPrice.mock.calls).toEqual([['item-1'], ['item-2']]);
expect(getPrice.mock.results[0]).toEqual({ type: 'return', value: 100 });
```

### Mock Implementation Control

```typescript
const fn = vi.fn();

fn.mockReturnValue(42);
fn.mockReturnValueOnce(1).mockReturnValueOnce(2);

fn.mockImplementation((x: number) => x * 2);
fn.mockImplementationOnce((x: number) => x * 3);

fn.mockResolvedValue({ data: [] });
fn.mockRejectedValue(new Error('fail'));

// Temporary implementation
fn.withImplementation(() => 'temp', () => {
  expect(fn()).toBe('temp');
});
```

### Mock State Management

```typescript
fn.mockClear();      // Clears call history, keeps implementation
fn.mockReset();      // Clears history + restores original implementation
fn.mockRestore();    // mockReset() + restores original descriptor (for spies)

// Global variants
vi.clearAllMocks();
vi.resetAllMocks();
vi.restoreAllMocks();

// Auto-reset via config
export default defineConfig({
  test: {
    clearMocks: true,     // mockClear() before each test
    mockReset: true,      // mockReset() before each test
    restoreMocks: true,   // mockRestore() before each test
  },
});
```

### vi.spyOn() — Spy on Existing Methods

```typescript
const cart = {
  getTotal(): number { return 100; },
};

const spy = vi.spyOn(cart, 'getTotal');
cart.getTotal();

expect(spy).toHaveBeenCalledOnce();
expect(spy).toHaveReturnedWith(100);

// Override the implementation
spy.mockReturnValue(200);
expect(cart.getTotal()).toBe(200);

// Restore original
spy.mockRestore();

// Spy on getters/setters
vi.spyOn(obj, 'property', 'get').mockReturnValue('mocked');
vi.spyOn(obj, 'property', 'set').mockImplementation(() => {});
```

### vi.mock() — Module Mocking

```typescript
import { vi, describe, it, expect } from 'vitest';
import { fetchUser } from './api';

// Automatically hoisted to top of file
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
}));

it('uses mocked module', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Test');
});
```

### vi.hoisted() — Top-Level Mock Variables

```typescript
// vi.hoisted() runs before imports, solving the hoisting issue
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.mock('./api', () => ({
  fetchData: mockFetch,
}));

it('uses hoisted mock', () => {
  mockFetch.mockResolvedValue({ data: [] });
  // ...
});
```

### vi.importActual() — Partial Mocking

```typescript
vi.mock('./utils', async () => {
  const actual = await vi.importActual<typeof import('./utils')>('./utils');
  return {
    ...actual,
    formatDate: vi.fn(() => '2026-01-01'),
  };
});
```

### vi.doMock() — Non-Hoisted Mocking

```typescript
// vi.doMock is NOT hoisted — can reference local variables
let counter = 0;

it('uses dynamic mock', async () => {
  vi.doMock('./counter', () => ({
    getCount: () => ++counter,
  }));
  const { getCount } = await import('./counter');
  expect(getCount()).toBe(1);
});
```

### Environment and Global Stubs

```typescript
// Environment variables
vi.stubEnv('API_URL', 'http://test.local');
// Restores all stubbed env vars
vi.unstubAllEnvs();

// Global values
vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('navigator', { language: 'en-US' });
// Restores all stubbed globals
vi.unstubAllGlobals();
```

### vi.mockObject() — Deep Object Mocking

```typescript
const mockedObj = vi.mockObject({ nested: { method: () => 42 } });
// All methods are replaced with vi.fn() stubs
expect(vi.isMockFunction(mockedObj.nested.method)).toBe(true);
```

---

## Snapshot Testing

### Basic Snapshots

```typescript
// File-based snapshot (saved to __snapshots__/*.snap)
expect(renderComponent()).toMatchSnapshot();

// Inline snapshot (stored in the test file itself)
expect(formatDate(new Date('2026-01-15'))).toMatchInlineSnapshot(`"January 15, 2026"`);

// File snapshot (compare against an explicit file)
expect(generatedCSS).toMatchFileSnapshot('./fixtures/expected.css');
```

### Updating Snapshots

```bash
# Update all outdated snapshots
npx vitest run -u

# Update snapshots interactively in watch mode
# Press 'u' in the terminal when prompted
```

### Snapshot Serializers

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    snapshotSerializers: ['./custom-serializer.ts'],
  },
});

// custom-serializer.ts
export default {
  serialize(val: any, config: any, indentation: string, depth: number, refs: any, printer: any) {
    return `CustomType { ${printer(val.data)} }`;
  },
  test(val: any) {
    return val && val.type === 'CustomType';
  },
};
```

### v4.0 Snapshot Change

As of v4.0, snapshot tests fail on CI when obsolete snapshots exist. Shadow root contents are printed by default in snapshots; set `printShadowRoot: false` in config to restore previous behavior.

---

## Timer and Date Mocking

### Fake Timers

```typescript
import { vi, beforeEach, afterEach, it, expect } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('advances timers', () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(500);
  expect(callback).not.toHaveBeenCalled();

  vi.advanceTimersByTime(500);
  expect(callback).toHaveBeenCalledOnce();
});

it('runs all pending timers', () => {
  const callback = vi.fn();
  setTimeout(callback, 5000);
  setInterval(callback, 1000);

  vi.runAllTimers();      // Runs all timers until queue is empty (limit: 10,000 iterations)
  vi.runOnlyPendingTimers(); // Runs only currently scheduled timers
  vi.advanceTimersToNextTimer(); // Runs only the next scheduled timer
  vi.advanceTimersToNextFrame(); // Advances to next requestAnimationFrame
});

it('checks timer count', () => {
  setTimeout(() => {}, 100);
  setTimeout(() => {}, 200);
  expect(vi.getTimerCount()).toBe(2);
  vi.clearAllTimers();
  expect(vi.getTimerCount()).toBe(0);
});
```

### Async Timer Helpers

```typescript
it('handles async timers', async () => {
  const callback = vi.fn();
  setTimeout(async () => {
    await Promise.resolve();
    callback();
  }, 1000);

  await vi.advanceTimersByTimeAsync(1000);
  expect(callback).toHaveBeenCalled();
});
```

### System Time Mocking

```typescript
it('mocks system time', () => {
  vi.setSystemTime(new Date('2026-01-15T09:00:00Z'));

  expect(new Date().toISOString()).toBe('2026-01-15T09:00:00.000Z');
  expect(Date.now()).toBe(new Date('2026-01-15T09:00:00Z').getTime());

  // Check current mocked time
  const mockedTime = vi.getMockedSystemTime(); // Date | null
  const realTime = vi.getRealSystemTime();     // number (ms)
});
```

---

## Component Testing

### React Components (jsdom/happy-dom)

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

```typescript
// Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('calls onClick handler', async () => {
    const onClick = vi.fn();
    render(<Button label="Submit" onClick={onClick} />);
    await fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### Vue Components

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

describe('Counter', () => {
  it('increments count on click', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toContain('1');
  });
});
```

### Setup File for Testing Library

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

---

## Browser Mode

As of Vitest 4.0 (October 2025), Browser Mode is stable. Tests run in a real browser environment instead of simulated DOM (jsdom/happy-dom).

### Installation

```bash
# Playwright provider (recommended)
npm install -D @vitest/browser-playwright playwright

# WebdriverIO provider
npm install -D @vitest/browser-webdriverio webdriverio
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: { slowMo: 0 },
      }),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
});
```

In v4.0, the browser provider requires a factory function import instead of a string. The `instances` option (introduced in v3.0) runs tests across multiple browsers more efficiently than the `projects` approach because it creates only a single Vite server.

### Context API

```typescript
// Import from vitest/browser (changed in v4.0, previously @vitest/browser/context)
import { page, userEvent, commands } from 'vitest/browser';

it('interacts with the page', async () => {
  await page.goto('/login');
  await userEvent.fill(page.getByLabelText('Email'), 'user@test.com');
  await userEvent.click(page.getByRole('button', { name: 'Submit' }));
});
```

### Visual Regression Testing (v4.0)

```typescript
import { page } from 'vitest/browser';

it('matches screenshot', async () => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('chart')).toMatchScreenshot();
});

// toBeInViewport checks visibility via IntersectionObserver
await expect(page.getByRole('banner')).toBeInViewport();
```

### Playwright Traces (v4.0)

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    browser: {
      // 'off' | 'on' | 'on-first-retry' | 'on-all-retries' | 'retain-on-failure'
      trace: 'retain-on-failure',
    },
  },
});
```

Trace files appear as annotations in reporters and open in Playwright Trace Viewer.

### Debugging Browser Tests

The VSCode extension supports "Debug Test" buttons for browser tests as of v4.0. The `--inspect` flag enables DevTools connection for Playwright and WebdriverIO providers.

---

## Coverage

### Providers

| Provider | Package | Strengths | Limitations |
|----------|---------|-----------|-------------|
| **v8** (default) | `@vitest/coverage-v8` | Fast, low memory, AST-accurate since v3.2 | V8 environments only (no Firefox, Bun) |
| **istanbul** | `@vitest/coverage-istanbul` | Works on any JS runtime, battle-tested | Slower due to instrumentation overhead |

### Installation

```bash
npm install -D @vitest/coverage-v8
# or
npm install -D @vitest/coverage-istanbul
```

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      enabled: false,              // Enable via --coverage flag or set true
      include: ['src/**/*.{ts,tsx}'], // REQUIRED in v4.0 for complete reports
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/types/**'],
      reporter: ['text', 'html', 'json', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### v4.0 Coverage Changes

- `coverage.all` option removed. Define `coverage.include` explicitly to specify which files appear in reports; by default only files imported during tests are included.
- `coverage.ignoreEmptyLines` removed.
- `coverage.experimentalAstAwareRemapping` removed (AST-based remapping is now the default).
- v8 provider uses accurate AST analysis instead of `v8-to-istanbul`, matching Istanbul accuracy.

### Ignore Comments

```typescript
/* v8 ignore next */
const unusedLine = true;

/* v8 ignore if -- @preserve */
if (process.env.DEBUG) {
  console.log('debug');
}

// Istanbul variant
/* istanbul ignore next -- @preserve */
```

Use `@preserve` to ensure comments survive TypeScript/esbuild transpilation.

### Coverage in UI

When `coverage.enabled` is `true` and `html` reporter is configured, coverage reports display in the Vitest UI.

---

## Projects and Monorepo

As of v3.2, the `workspace` option is deprecated. As of v4.0, it is removed. Use `projects` in the root config.

### Basic Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
```

Vitest looks for `vitest.config.*` or `vite.config.*` files in each matched directory.

### Inline Projects

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['default'],
    projects: [
      {
        extends: true,  // Inherit root plugins, pool settings
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
```

### Shared Configuration

Individual project configs cannot extend the root config directly (it would inherit the `projects` array). Use a shared file instead:

```typescript
// vitest.shared.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    maxWorkers: 4,
  },
});
```

```typescript
// packages/api/vitest.config.ts
import { mergeConfig, defineProject } from 'vitest/config';
import shared from '../../vitest.shared';

export default mergeConfig(shared, defineProject({
  test: {
    name: 'api',
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}));
```

### Running Specific Projects

```bash
npx vitest --project unit
npx vitest --project unit --project browser
```

### Project Constraints

Global options like `coverage`, `reporters`, and `resolveSnapshotPath` belong in the root config only, not in individual project configs. Use `defineProject()` instead of `defineConfig()` in project files for type safety.

---

## TypeScript Integration

Vitest has built-in TypeScript support via Vite's esbuild transform. No `ts-jest` or separate transpilation needed.

### Type Checking

Vitest can type-check tests alongside running them:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
  },
});
```

### Typed Mocks

```typescript
import { vi } from 'vitest';
import type { UserService } from './user-service';

// vi.mocked() provides correct types for mocked modules
vi.mock('./user-service');
import { getUser } from './user-service';
const mockedGetUser = vi.mocked(getUser);

mockedGetUser.mockResolvedValue({ id: 1, name: 'Test' });
```

### Test Context Types with test.extend

```typescript
import { test } from 'vitest';

interface MyFixtures {
  db: Database;
  user: User;
}

const myTest = test.extend<MyFixtures>({
  db: async ({}, use) => {
    const db = await createTestDb();
    await use(db);
    await db.close();
  },
  user: async ({ db }, use) => {
    const user = await db.createUser({ name: 'Test' });
    await use(user);
  },
});

myTest('creates order', async ({ db, user }) => {
  const order = await db.createOrder({ userId: user.id });
  expect(order.userId).toBe(user.id);
});
```

---

## Watch Mode and Filtering

### Watch Mode (Default)

```bash
npx vitest          # Starts in watch mode
npx vitest run      # Single run, exits after completion
```

In watch mode, Vitest re-runs affected tests when files change. Press keys for interactive control:

| Key | Action |
|-----|--------|
| `a` | Run all tests |
| `f` | Re-run only failed tests |
| `u` | Update snapshots |
| `p` | Filter by filename |
| `t` | Filter by test name |
| `q` | Quit |

### Filtering

```bash
# By filename pattern
npx vitest auth                    # Files matching "auth"
npx vitest src/utils/              # Files in directory

# By test name
npx vitest -t "validates email"

# By line number (added in v3.0)
npx vitest src/auth.test.ts:42

# Changed files only (git-aware)
npx vitest --changed               # Changed since last commit
npx vitest --changed HEAD~3        # Changed in last 3 commits
```

### UI Mode

```bash
npm install -D @vitest/ui
npx vitest --ui
```

Opens a browser-based test dashboard with file tree, test results, and coverage visualization.

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run --coverage --reporter=default --reporter=junit --outputFile=junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
```

### Reporter Options

```typescript
export default defineConfig({
  test: {
    reporters: [
      'default',           // Terminal output
      ['junit', { outputFile: 'junit.xml' }],
      ['json', { outputFile: 'results.json' }],
    ],
  },
});
```

v4.0 reporter changes:
- `basic` reporter removed. Use `default` reporter with `summary: false` instead.
- `default` reporter only shows tree view for single test files. Use new `tree` reporter for consistent tree display.
- `verbose` reporter prints tests one-by-one upon completion.

### Pool Options

| Pool | Use Case |
|------|----------|
| `threads` (default) | Worker threads; best for most projects |
| `forks` | Child processes; better isolation, required for some native modules |
| `vmThreads` | VM contexts in threads; strongest isolation with shared thread pool |

```typescript
export default defineConfig({
  test: {
    pool: 'threads',
    maxWorkers: 4,       // Replaces maxThreads/maxForks (removed in v4.0)
    isolate: true,       // Isolate test files from each other
  },
});
```

v4.0 pool changes:
- Removed tinypool dependency entirely; pool system rewritten.
- `maxThreads`/`maxForks` replaced with `maxWorkers`.
- `singleThread`/`singleFork` replaced with `maxWorkers: 1, isolate: false`.
- `poolOptions` removed; settings are now top-level.
- `minWorkers` removed; automatically set to 0 in non-watch mode.

---

## Migration from Jest

### API Mapping

| Jest | Vitest | Notes |
|------|--------|-------|
| `jest.fn()` | `vi.fn()` | Same API |
| `jest.mock('module')` | `vi.mock('module')` | Factory function syntax differs slightly |
| `jest.spyOn(obj, 'method')` | `vi.spyOn(obj, 'method')` | Same API |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | Same API |
| `jest.requireActual('module')` | `vi.importActual('module')` | Returns a Promise |
| `jest.resetModules()` | `vi.resetModules()` | Same API |
| `jest.setTimeout(ms)` | `vi.setConfig({ testTimeout: ms })` | Different API |
| `@jest/globals` | `vitest` | Import source |

### Configuration Differences

| Jest (`jest.config.ts`) | Vitest (`vitest.config.ts`) |
|---|---|
| `transform: { '^.+\\.tsx?$': 'ts-jest' }` | Not needed (Vite handles transforms) |
| `moduleNameMapper` | `resolve.alias` in Vite config |
| `testEnvironment: 'jsdom'` | `test.environment: 'jsdom'` |
| `setupFilesAfterFramework` | `test.setupFiles` |
| `collectCoverageFrom` | `test.coverage.include` |
| `coverageThreshold` | `test.coverage.thresholds` |

### Behavioral Differences

1. **Globals disabled by default.** Import from `vitest` explicitly, or set `globals: true` in config for Jest compatibility.

2. **`mockReset()` restores original implementation** in Vitest, not an empty function returning `undefined` as in Jest.

3. **`vi.restoreAllMocks()` does not reset state** of spies in v4.0. Only manually created spies are restored.

4. **Module mocks must explicitly return exports.** Unlike Jest, the factory function must return the full module shape.

5. **`__mocks__` directory** auto-mocking does not load unless `vi.mock()` is explicitly called for that module.

6. **`vi.importActual()` returns a Promise** (use `await`), unlike Jest's synchronous `jest.requireActual()`.

7. **Test name separator** is `>` in Vitest (e.g., `Suite > test name`) vs spaces in Jest.

### Migration Steps

1. Install Vitest and remove Jest:
   ```bash
   npm uninstall jest ts-jest @types/jest babel-jest
   npm install -D vitest
   ```

2. Create `vitest.config.ts` with equivalent settings.

3. Update imports in test files:
   ```typescript
   // Before (Jest)
   import { jest } from '@jest/globals';
   // After (Vitest)
   import { vi, describe, it, expect } from 'vitest';
   ```

4. Replace `jest.*` calls with `vi.*` calls.

5. Update `jest.requireActual` to `await vi.importActual`.

6. Run tests and update snapshots: `npx vitest run -u`.

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'vitest'` | Vitest not installed | Run `npm install -D vitest` |
| `Vite >= 6.0.0 is required` | Old Vite version | Upgrade Vite: `npm install -D vite@latest` |
| `ReferenceError: describe is not defined` | Missing imports | Import from `vitest`: `import { describe, it, expect } from 'vitest'` |
| `TypeError: vi.mock is not a function` | Imported `vi` from wrong source | Import from `vitest`, not `@vitest/browser` |
| `Error: vi.mock factory must return an object` | Factory missing return | Return object with named exports from `vi.mock` factory |
| `Snapshot is obsolete` (CI failure) | Outdated snapshot files committed | Run `npx vitest run -u` locally and commit updated snapshots |
| `Test timed out in 5000ms` | Async test exceeds default timeout | Add timeout: `it('test', async () => {...}, 10000)` or set `test.testTimeout` in config |
| `Cannot use import statement outside a module` | Dependency not ESM-compatible | Add to `deps.inline` or configure `server.deps` in config |
| `ENOSPC: System limit for number of file watchers reached` | Too many files watched | Increase limit: `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf` |
| `Coverage report shows 0% for untested files` | Missing `coverage.include` in v4.0 | Add `coverage.include: ['src/**/*.{ts,tsx}']` to config |
| `TypeError: provider is not a function` | String browser provider (v3 syntax) | Use factory import: `import { playwright } from '@vitest/browser-playwright'` |
| `'workspace' is not a valid config option` | Using removed v3 config | Replace `workspace` with `projects` in `vitest.config.ts` |
| `maxThreads is not a valid config option` | Using removed v3 pool config | Replace with `maxWorkers` |
| `Cannot find module '@vitest/browser/context'` | v3 import path used in v4 | Change import to `vitest/browser` |

---

## Recent Changes

### v4.0 (October 22, 2025)

**Stable Browser Mode.** Browser Mode graduated from experimental to stable. Provider packages split into `@vitest/browser-playwright` and `@vitest/browser-webdriverio`. The `@vitest/browser` package is no longer needed as a direct dependency.

**Visual Regression Testing.** New `toMatchScreenshot()` assertion compares UI screenshots against reference images. New `toBeInViewport()` matcher checks element visibility via IntersectionObserver.

**Playwright Traces.** Configure via `trace` option with values: `off`, `on`, `on-first-retry`, `on-all-retries`, `retain-on-failure`.

**Pool Rewrite.** Removed tinypool dependency. `maxThreads`/`maxForks` replaced with `maxWorkers`. `poolOptions` removed; settings are top-level. Custom pool interface rewritten.

**Coverage Overhaul.** AST-based remapping is now default for v8 provider. Removed `coverage.all`, `coverage.ignoreEmptyLines`, `coverage.experimentalAstAwareRemapping`. Explicit `coverage.include` required for complete reports.

**Projects replace Workspace.** `workspace` config option removed. Use `projects` array in root config. `environmentMatchGlobs` and `poolMatchGlobs` also removed in favor of `projects`.

**New APIs.** `expect.assert` for type narrowing, `expect.schemaMatching()` for Standard Schema (Zod, Valibot, ArkType), `toMatchScreenshot()`, `toBeInViewport()`. Advanced APIs: `enableCoverage`/`disableCoverage`, `getSeed`, `watcher`.

**Reporter changes.** `basic` reporter removed (use `default` with `summary: false`). New `tree` reporter. `verbose` reporter prints tests sequentially.

**Other breaking changes.** Requires Vite >= 6.0.0. `vi.fn().getMockName()` returns `vi.fn()` instead of `spy`. `vi.restoreAllMocks()` no longer resets spy state. Snapshot tests fail on CI with obsolete snapshots. Tests without functions auto-marked as `todo`.

### v3.2 (Mid-2025)

**Deprecated `workspace` in favor of `projects`.** Inline workspace configuration in `vitest.config.ts` using a `projects` array. Separate `vitest.workspace.js` file no longer recommended.

**AST-aware coverage remapping** (experimental in v3.2, default in v4.0). V8 coverage accuracy matches Istanbul.

### v3.1 (March 2025)

Performance improvements and expanded test setup flexibility with new options.

### v3.0 (January 17, 2025)

**New matchers.** `toHaveBeenCalledExactlyOnceWith`, `toHaveBeenCalledAfter`, `toHaveBeenCalledBefore`, `toSatisfy` asymmetric matcher, `toBeOneOf`.

**Location-based test filtering.** Filter by line number: `vitest basic/foo.js:10`.

**Inline workspace configuration.** `workspace` array field in `vitest.config.ts` (later renamed to `projects` in v3.2).

**Multi-browser instances.** New `instances` option for Browser Mode runs tests across browsers with a single Vite server.

**Public API redesign.** `vitest/node` API redesigned with updated documentation.

**Reporter rewrite.** Less flicker, more stable output, redesigned reporter lifecycle API.
