---
model: claude-sonnet-4-6
name: vitest
description: Use when working with Vitest for unit testing, component testing, snapshot testing, or mocking in Vite-based projects. Also use when migrating from Jest to Vitest, configuring Vitest workspaces, or using Vitest Browser Mode for component tests.
---

# Vitest

## Overview
Vitest (v4.0.18, as of February 2026) is a Vite-native testing framework with ESM-first design, built-in TypeScript support, and a Jest-compatible API.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 4.0.18 (January 2026) |
| **Install** | `npm install -D vitest` |
| **Config** | `vitest.config.ts` |
| **Run Tests** | `npx vitest` |
| **Run Once** | `npx vitest run` |
| **UI Mode** | `npx vitest --ui` |
| **Coverage** | `npx vitest --coverage` |
| **Requires** | Vite >= 6.0.0, Node >= 20.0.0 |

## Setup

**Minimal config:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

**First test:**
```typescript
import { describe, it, expect } from 'vitest';
import { sum } from './sum';

describe('sum', () => {
  it('adds two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```

## Common Operations

**Mocking:**
```typescript
import { vi, describe, it, expect } from 'vitest';

const fn = vi.fn(() => 42);
fn();
expect(fn).toHaveBeenCalledOnce();
expect(fn).toHaveReturnedWith(42);
```

**Snapshot testing:**
```typescript
expect(component).toMatchSnapshot();
expect(value).toMatchInlineSnapshot(`"expected"`);
// Update snapshots: npx vitest run -u
```

**Fake timers:**
```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-15'));
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

**Coverage:**
```bash
npm install -D @vitest/coverage-v8
npx vitest --coverage
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `jest.fn()` instead of `vi.fn()` | Import `vi` from `vitest`; all Jest globals map to `vi.*` equivalents |
| Expecting `mockReset()` to return `undefined` | In Vitest, `mockReset()` restores the original implementation, not an empty function |
| Using `workspace` config option | Deprecated since v3.2, removed in v4.0 -- use `projects` in `vitest.config.ts` instead |
| Missing `coverage.include` pattern | v4.0 requires explicit `coverage.include` to specify which files to analyze |
| Using string for browser provider | v4.0 requires factory function: `import { playwright } from '@vitest/browser-playwright'` |
| Importing from `@vitest/browser/context` | v4.0 moved context imports to `vitest/browser` |
| Using `poolOptions` config | v4.0 removed `poolOptions`; pool settings are now top-level (`maxWorkers`, `isolate`) |

## Full Reference

See `reference.md` in this skill directory for complete documentation including all matchers, mocking patterns, timer APIs, Browser Mode, coverage configuration, monorepo setup, Jest migration guide, and v3.x/v4.0 changelog.
