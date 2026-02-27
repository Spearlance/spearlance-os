---
model: claude-sonnet-4-6
name: testing-library
description: Use when testing React components with @testing-library/react — DOM queries, user interactions, async rendering, and accessibility assertions. Also use for React 19 Suspense testing patterns, Vitest integration, and Storybook portable story reuse.
---

# @testing-library/react v16

Test components like users use them — not like developers built them.

## Quick Reference

| Package | Version | Role |
|---------|---------|------|
| `@testing-library/react` | v16.x | Core render + screen queries |
| `@testing-library/dom` | peer dep | Must install explicitly (v16 breaking change) |
| `@testing-library/user-event` | v14.x | Realistic user interaction simulation |
| `@types/react-dom` | latest | TypeScript type checking |

```bash
npm install --save-dev @testing-library/react @testing-library/dom @testing-library/user-event @types/react-dom
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Query Priority

Use queries in this order. Higher = more accessible, more resilient, more like a real user.

1. **`getByRole`** — #1 always. Matches ARIA roles. Tests accessibility implicitly.
2. **`getByLabelText`** — form fields. Mirrors how screen readers navigate.
3. **`getByPlaceholderText`** — when no label exists (not ideal UX, but testable).
4. **`getByText`** — non-interactive elements: headings, paragraphs, spans.
5. **`getByDisplayValue`** — filled form elements (input/select/textarea with current value).
6. **`getByAltText`** — images and area elements.
7. **`getByTitle`** — title attribute. Inconsistent screen reader support — use sparingly.
8. **`getByTestId`** — last resort only. Use when no semantic query works.

> Test like a user navigates — not like a developer inspects the DOM.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Basic Test Template (Vitest)

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button', { name: /click me/i }));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## React 19 act() Gotcha

React 19 changes Suspense behavior: components keep rendering fallbacks and never resolve their children in tests without `act()`. However, wrapping render in `act()` makes it impossible to assert against the fallback state.

**To assert the resolved state (children rendered):**
```typescript
import { render, screen, act } from '@testing-library/react';

it('renders suspended component', async () => {
  await act(async () => {
    render(<SuspendedComponent />);
  });
  expect(screen.getByText('loaded content')).toBeInTheDocument();
});
```

**To assert the fallback (loading state):**
```typescript
it('shows fallback while loading', () => {
  // Do NOT use act() — render synchronously to capture fallback
  render(<SuspendedComponent />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

RTL will emit a warning about wrapping render in `act()`. That warning is accurate for asserting resolved state — but for fallback assertions, ignore it intentionally. This is a known React 19 behavioral change that can break 300+ tests on upgrade from React 18.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| `container.querySelector('.btn')` | Couples tests to CSS classes — breaks on rename | `screen.getByRole('button')` |
| Missing `@testing-library/dom` in `package.json` | v16 moved it to peer dep — silently broken or crashes | `npm install --save-dev @testing-library/dom` |
| `getBy` when element may be absent | Throws on missing element — crashes the test | `queryBy` returns null; assert with `not.toBeInTheDocument()` |
| `fireEvent.click()` instead of `user.click()` | Doesn't simulate real browser events (hover, focus, pointer) | `const user = userEvent.setup(); await user.click(...)` |
| Side effects inside `waitFor` callback | `waitFor` retries the callback — side effects run multiple times | Put side effects outside `waitFor`, only put assertions inside |
| React 19 Suspense without `act()` | Component never resolves — test asserts against stale fallback | `await act(async () => { render(...) })` for resolved state |
| Testing internal state or method calls | Implementation detail — breaks on refactor without behavioral change | Test outputs and DOM: what the user sees and can interact with |
| Using `getByTestId` as default query | Bypasses accessibility, doesn't reflect real user navigation | Use semantic queries first; `data-testid` only when nothing else works |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For full API reference, query examples, async patterns, form testing, modal testing, Storybook integration, and accessibility testing:

→ See [reference.md](./reference.md)
