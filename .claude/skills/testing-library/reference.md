# @testing-library/react v16 — Full Reference

## Installation & Setup

### Install Command

```bash
npm install --save-dev @testing-library/react @testing-library/dom @testing-library/user-event @types/react-dom
```

> v16 breaking change: `@testing-library/dom` moved from direct dep to peer dep. Must install explicitly or queries will fail silently in some environments.

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

### Jest Config

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
```

### Framework-Specific Notes

**Next.js (App Router):** Use `jest-environment-jsdom` and mock `next/navigation` for route-dependent components.

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

**Vite:** Use `@vitejs/plugin-react` + `vitest` with `environment: 'jsdom'`. No extra config needed.

**Storybook 8+:** Install `@storybook/experimental-addon-test` for portable story → Vitest integration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Query Types

Six query variants. Each exists for `getBy`, `queryBy`, `findBy`, `getAllBy`, `queryAllBy`, `findAllBy`.

| Prefix | Returns | No Match Behavior | Multiple Match |
|--------|---------|------------------|----------------|
| `getBy` | Element | Throws | Throws |
| `queryBy` | Element or `null` | Returns `null` | Throws |
| `findBy` | `Promise<Element>` | Rejects (after timeout) | Rejects |
| `getAllBy` | `Element[]` | Throws | Returns all |
| `queryAllBy` | `Element[]` or `[]` | Returns `[]` | Returns all |
| `findAllBy` | `Promise<Element[]>` | Rejects (after timeout) | Returns all |

### When to Use Each

| Situation | Query |
|-----------|-------|
| Element must exist right now | `getBy*` |
| Element must NOT exist | `queryBy*` + `expect(...).not.toBeInTheDocument()` |
| Element appears asynchronously | `findBy*` |
| Assert multiple elements exist | `getAllBy*` |
| Assert zero or more elements | `queryAllBy*` |
| Multiple elements appear async | `findAllBy*` |

```typescript
// Element must exist
const button = screen.getByRole('button', { name: /submit/i });

// Element must NOT exist
expect(screen.queryByText('Error message')).not.toBeInTheDocument();

// Element appears after async action
const toast = await screen.findByRole('alert');

// All matching elements
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(3);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Query Priority Guide

### Level 1 — Accessible to Everyone

**`getByRole`** — use first, always.

```typescript
// Buttons
screen.getByRole('button', { name: /submit/i });

// Links
screen.getByRole('link', { name: /learn more/i });

// Headings
screen.getByRole('heading', { name: /welcome/i, level: 1 });

// Checkboxes
screen.getByRole('checkbox', { name: /agree to terms/i });

// Text inputs
screen.getByRole('textbox', { name: /email/i });

// Comboboxes (select elements)
screen.getByRole('combobox', { name: /country/i });
```

Full ARIA role list: https://www.w3.org/TR/wai-aria-1.2/#role_definitions

**`getByLabelText`** — form fields with associated labels.

```typescript
// <label for="email">Email</label><input id="email" />
screen.getByLabelText(/email/i);

// aria-label
screen.getByLabelText('Search');

// aria-labelledby
screen.getByLabelText('Username', { selector: 'input' });
```

**`getByPlaceholderText`** — when no label exists (document the missing label as an a11y issue).

```typescript
screen.getByPlaceholderText(/search.../i);
```

**`getByText`** — non-interactive text content.

```typescript
screen.getByText(/welcome to the dashboard/i);
screen.getByText('Exact match');
screen.getByText(/partial match/i, { selector: 'p' });
```

**`getByDisplayValue`** — current value of filled inputs, selects, textareas.

```typescript
// Input pre-filled with "John"
screen.getByDisplayValue('John');

// Select with current value
screen.getByDisplayValue('United States');
```

### Level 2 — Semantic Queries

**`getByAltText`** — images and image maps.

```typescript
screen.getByAltText(/company logo/i);
screen.getByAltText(''); // decorative image with empty alt
```

**`getByTitle`** — title attribute. Screen reader support is inconsistent. Use sparingly.

```typescript
screen.getByTitle(/close dialog/i);
```

### Level 3 — Test IDs (Last Resort)

**`getByTestId`** — when zero semantic queries work.

```typescript
screen.getByTestId('custom-complex-widget');
```

```html
<!-- In component -->
<div data-testid="custom-complex-widget">...</div>
```

> If you're reaching for `getByTestId`, first ask: can I add a role or label to make this semantically queryable?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## user-event v14

Always use `userEvent` over `fireEvent`. `userEvent` simulates the full browser event chain (pointer, hover, focus, keyboard, input, change). `fireEvent` dispatches a single synthetic event — it won't trigger browser-native behaviors.

### Setup Pattern

Create a fresh instance per test. `userEvent.setup()` returns a bound API.

```typescript
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  it('handles interaction', async () => {
    const user = userEvent.setup();
    // use `user` for all interactions in this test
  });
});
```

Options on `setup()`:

```typescript
const user = userEvent.setup({
  delay: null,        // disable default delay between key presses (faster tests)
  pointerEventsCheck: 0, // skip pointer-events CSS check (faster for deep nesting)
});
```

### Click

```typescript
await user.click(screen.getByRole('button', { name: /submit/i }));
await user.dblClick(screen.getByRole('button'));
await user.click(element, { ctrlKey: true }); // ctrl+click
```

### Keyboard

```typescript
// Type text (keyboard simulation)
await user.keyboard('Hello World');

// Key sequences using brackets
await user.keyboard('{Enter}');
await user.keyboard('{Tab}');
await user.keyboard('{Escape}');
await user.keyboard('{ArrowDown}');
await user.keyboard('[ShiftLeft>]a[/ShiftLeft]'); // Shift+a = "A"

// Hold modifier
await user.keyboard('{Control>}a{/Control}'); // select all
```

### Type

Convenience method for typing into focused elements.

```typescript
const input = screen.getByRole('textbox', { name: /username/i });
await user.click(input); // focus first
await user.type(input, 'john_doe');

// Clear and retype
await user.clear(input);
await user.type(input, 'new_value');
```

### Pointer

Mouse, touch, and stylus interactions.

```typescript
// Hover
await user.hover(screen.getByText('Tooltip trigger'));
await user.unhover(screen.getByText('Tooltip trigger'));

// Right click
await user.pointer({ keys: '[MouseRight]', target: element });

// Touch
await user.pointer({ keys: '[TouchA]', target: element });
```

### Clipboard

```typescript
await user.click(input);
await user.keyboard('{Control>}a{/Control}'); // select all
await user.copy();

await user.paste(); // paste into focused element
await user.cut();
```

### Select Options

```typescript
const select = screen.getByRole('combobox', { name: /country/i });
await user.selectOptions(select, 'Canada');
await user.selectOptions(select, ['Option A', 'Option B']); // multi-select
await user.deselectOptions(select, 'Canada');
```

### Tab Navigation

```typescript
await user.tab(); // move focus forward
await user.tab({ shift: true }); // move focus backward
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Async Utilities

### waitFor

Retries the callback until it passes or times out (default: 1000ms).

```typescript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});

// Custom timeout
await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument(), {
  timeout: 3000,
  interval: 100,
});
```

**Rule:** Only put assertions inside `waitFor`. Never put side effects (clicks, API calls) inside — the callback retries and side effects will fire multiple times.

```typescript
// WRONG — side effect inside waitFor
await waitFor(async () => {
  await user.click(screen.getByRole('button')); // fires multiple times!
  expect(screen.getByText('Result')).toBeInTheDocument();
});

// CORRECT — side effect before, assertion inside
await user.click(screen.getByRole('button'));
await waitFor(() => {
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

### findBy* (Async Queries)

Sugar for `waitFor + getBy`. Preferred for simple async cases.

```typescript
// Waits for element to appear (up to 1000ms)
const alert = await screen.findByRole('alert');
const items = await screen.findAllByRole('listitem');

// Custom timeout
const el = await screen.findByText('Loaded', {}, { timeout: 2000 });
```

### act

Wraps state updates to ensure React flushes them before assertions.

```typescript
import { act } from '@testing-library/react';

// React 19 Suspense
await act(async () => {
  render(<AsyncComponent />);
});

// Wrap state updates not triggered by user events
act(() => {
  someExternalStateUpdate();
});
```

RTL's `user.*` methods and `findBy*` queries handle `act()` internally. Only manually wrap when dealing with non-RTL state updates or React 19 Suspense.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## React 19 Patterns

### Suspense — Asserting Resolved State

React 19 keeps components in fallback state until `act()` forces resolution.

```typescript
import { render, screen, act } from '@testing-library/react';

it('renders resolved content', async () => {
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncUserCard userId="1" />
      </Suspense>
    );
  });

  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

### Suspense — Asserting Fallback State

Do NOT use `act()` here — synchronous render captures the fallback before React resolves.

```typescript
it('shows loading fallback', () => {
  render(
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncUserCard userId="1" />
    </Suspense>
  );

  // RTL will warn about act() — ignore it for fallback assertions
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

### React 18 vs React 19 Behavioral Differences

| Behavior | React 18 | React 19 |
|----------|----------|----------|
| Suspense fallback in tests | Resolves to children | Stays in fallback without `act()` |
| `act()` warning | Occasional | More frequent — concurrent features |
| `startTransition` | Works as expected | Wrapped transitions need `act()` |
| Server components | N/A | Render via dedicated test patterns |

### Concurrent Features

```typescript
import { startTransition } from 'react';
import { act, render, screen } from '@testing-library/react';

it('handles startTransition', async () => {
  render(<SearchResults />);

  await act(async () => {
    startTransition(() => {
      // trigger transition
    });
  });

  await screen.findByText('Search results');
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Testing Patterns

### Custom Render with Providers

Wrap render to include required context providers once — not in every test.

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './ThemeProvider';

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

```typescript
// In tests — import from utils, not RTL directly
import { render, screen } from '../test/utils';

it('renders with providers', () => {
  render(<MyComponent />);
  // providers are wrapped automatically
});
```

### Forms

```typescript
it('submits form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<ContactForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await user.selectOptions(screen.getByLabelText(/country/i), 'Canada');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'Jane Smith',
    email: 'jane@example.com',
    country: 'Canada',
  });
});

it('shows validation errors on empty submit', async () => {
  const user = userEvent.setup();

  render(<ContactForm onSubmit={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});
```

### Modals and Dialogs

```typescript
it('opens and closes modal', async () => {
  const user = userEvent.setup();

  render(<App />);

  // Modal not present initially
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  // Open modal
  await user.click(screen.getByRole('button', { name: /open settings/i }));
  expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();

  // Close with escape
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('traps focus within modal', async () => {
  const user = userEvent.setup();

  render(<Modal isOpen>
    <input data-testid="first" />
    <input data-testid="last" />
  </Modal>);

  const first = screen.getByTestId('first');
  const last = screen.getByTestId('last');

  first.focus();
  await user.tab();
  expect(last).toHaveFocus();

  await user.tab(); // should cycle back
  expect(first).toHaveFocus();
});
```

### Navigation (React Router)

```typescript
import { MemoryRouter } from 'react-router-dom';

it('navigates on click', async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </MemoryRouter>
  );

  await user.click(screen.getByRole('link', { name: /about/i }));

  expect(screen.getByRole('heading', { name: /about us/i })).toBeInTheDocument();
});
```

### Context

```typescript
import { createContext, useContext } from 'react';
import { render } from '@testing-library/react';

const ThemeContext = createContext<'light' | 'dark'>('light');

it('responds to dark theme', () => {
  render(
    <ThemeContext.Provider value="dark">
      <ThemedButton />
    </ThemeContext.Provider>
  );

  expect(screen.getByRole('button')).toHaveClass('btn-dark');
});
```

### Async Data Loading

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Jane' }]))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('loads and displays users', async () => {
  render(<UserList />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  const user = await screen.findByText('Jane');
  expect(user).toBeInTheDocument();
});

it('handles API error', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.json({ error: 'Server error' }, { status: 500 }))
  );

  render(<UserList />);

  expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Storybook Interaction Test Reuse

Portable stories allow Storybook `play` functions to run as Vitest tests. Write once, run in both environments.

### Writing a Portable Story

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
};
export default meta;
type Story = StoryObj<typeof Button>;

export const ClickInteraction: Story = {
  args: { children: 'Click me' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    await expect(button).toHaveFocus();
  },
};
```

### Running Portable Stories in Vitest

```typescript
// Button.test.tsx
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as stories from './Button.stories';

const { ClickInteraction } = composeStories(stories);

it('runs ClickInteraction play function', async () => {
  const { container } = render(<ClickInteraction />);
  await ClickInteraction.play({ canvasElement: container });
});
```

### Storybook 8 + Vitest Plugin (Recommended)

Install `@storybook/experimental-addon-test` to auto-generate Vitest tests from stories. Stories with `play` functions run as integration tests. No manual `composeStories` needed.

```bash
npx storybook add @storybook/experimental-addon-test
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|-------------|---------------|------------|
| `container.querySelector('.btn')` | Couples to CSS class names — breaks on rename or style change | `screen.getByRole('button')` |
| `wrapper.find(ComponentName)` (Enzyme style) | Tests internal component tree, not user-visible behavior | Query by role, text, or label |
| Testing `useState` directly | Implementation detail — user doesn't see state | Assert the DOM output that state drives |
| Testing method calls on class components | Spying on internals — breaks on refactor | Test behavior: what renders, what the user can do |
| Snapshot tests for everything | Brittle — breaks on any markup change, even unrelated ones | Explicit assertions on important elements |
| Testing styled-components class names | Classes are generated/hashed — meaningless in tests | Test visual behavior via `toHaveStyle()` or `getByRole` |
| Side effects inside `waitFor` | Callback retries — side effects run 2-10+ times | Move side effects before `waitFor`, only assert inside |
| `getByTestId` as default query | Doesn't test accessibility, ignores semantic structure | Use role/label/text first; `data-testid` is last resort |
| Missing cleanup | State leaks between tests in some setups | RTL auto-cleans after each test with Vitest/Jest — verify `@testing-library/jest-dom` is in setup |
| Over-mocking child components | Removes integration coverage, tests false positives | Mock only at boundaries (API calls, external services) |
| `fireEvent` for complex interactions | Skips hover, focus, pointer events that browsers fire | `userEvent` for all user-facing interaction |
| `screen.debug()` left in committed code | Logs full DOM to stdout in CI — noisy | Remove after debugging; use `logRoles(element)` for quick a11y inspection |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Accessibility Testing Integration

### jest-axe / vitest-axe

```bash
npm install --save-dev @axe-core/react jest-axe
# or for vitest
npm install --save-dev @axe-core/react vitest-axe
```

```typescript
// vitest setup
import { toHaveNoViolations } from 'vitest-axe';
expect.extend(toHaveNoViolations);
```

```typescript
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<MyForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Keyboard Navigation Testing

```typescript
it('supports full keyboard navigation', async () => {
  const user = userEvent.setup();

  render(<Dropdown options={['A', 'B', 'C']} />);

  const trigger = screen.getByRole('button', { name: /select option/i });
  await user.click(trigger);

  // Arrow key navigation
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('option', { name: 'A' })).toHaveFocus();

  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('option', { name: 'B' })).toHaveFocus();

  // Select with Enter
  await user.keyboard('{Enter}');
  expect(trigger).toHaveTextContent('B');
});
```

### Screen Reader Announcements (ARIA Live Regions)

```typescript
it('announces form submission result', async () => {
  const user = userEvent.setup();

  render(<ContactForm />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  // aria-live="polite" region
  const announcement = await screen.findByRole('status');
  expect(announcement).toHaveTextContent(/message sent/i);
});

it('announces errors immediately', async () => {
  const user = userEvent.setup();

  render(<ContactForm />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  // aria-live="assertive" or role="alert"
  const error = await screen.findByRole('alert');
  expect(error).toHaveTextContent(/please fill in all required fields/i);
});
```

### logRoles Utility

Quick a11y inspection during development (not in committed tests).

```typescript
import { logRoles } from '@testing-library/dom';

it('debug roles', () => {
  const { container } = render(<MyComponent />);
  logRoles(container); // logs all accessible roles + names to stdout
});
```

### Common jest-dom Matchers

```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toBeEnabled();
expect(element).toHaveFocus();
expect(element).toHaveValue('text');
expect(element).toHaveDisplayValue('Displayed Text');
expect(element).toBeChecked();
expect(element).toHaveAttribute('aria-expanded', 'true');
expect(element).toHaveClass('active');
expect(element).toHaveStyle({ color: 'red' });
expect(element).toHaveTextContent(/pattern/i);
expect(element).toHaveAccessibleName('Label text');
expect(element).toHaveAccessibleDescription('Description text');
```
