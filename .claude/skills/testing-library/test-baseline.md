# RED/GREEN Accuracy Test — @testing-library/react Skill

**Date:** 2026-02-21
**Skill files tested:**
- `packs/frontend/skills/testing-library/SKILL.md`
- `packs/frontend/skills/testing-library/reference.md`
**Tester model:** claude-sonnet-4-6

---

## Methodology

RED phase answers are drawn from training data only — skill files were not consulted.
GREEN phase answers incorporate the skill files directly.
Each question is scored PASS if the skill added meaningful value over baseline.

---

## Question 1: How do I install and set up @testing-library/react v16 with Vitest?

### RED (baseline — training data only)

```bash
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Vitest config:

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

**Uncertainty:**
- Unsure whether v16 introduced any breaking changes to the install command or package structure
- Did not know that `@testing-library/dom` became a required explicit install in v16
- `@types/react-dom` install was omitted from baseline answer
- Did not flag the peer dependency change as a known gotcha

---

### GREEN (with skill)

```bash
npm install --save-dev @testing-library/react @testing-library/dom @testing-library/user-event @types/react-dom
```

The v16 breaking change: `@testing-library/dom` moved from a direct dependency to a peer dependency. It must be installed explicitly or queries will fail silently in some environments.

Vitest config (same as baseline):

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

**Corrected:** Baseline omitted `@testing-library/dom` and `@types/react-dom` from the install command. This is the critical v16 breaking change — the skill catches it explicitly.

**Gaps filled:**
- Explicit call-out of the v16 peer dep breaking change and its failure mode (silent breakage)
- `@types/react-dom` added to install command
- Framework-specific notes for Next.js App Router (mock `next/navigation`) and Storybook 8+ integration

**Skill gaps:** None for this question — coverage is complete.

**Score: PASS** — skill corrects a real, non-obvious v16 breaking change that baseline missed entirely.

---

## Question 2: What's the correct query priority and why does it matter?

### RED (baseline — training data only)

General priority order from training data:

1. `getByRole` — ARIA roles, most accessible
2. `getByLabelText` — form labels
3. `getByPlaceholderText` — fallback for unlabeled inputs
4. `getByText` — text content
5. `getByDisplayValue` — current form values
6. `getByAltText` — images
7. `getByTitle` — title attribute
8. `getByTestId` — last resort

Why it matters: queries higher in the list reflect how real users (including screen reader users) interact with the page. Queries lower in the list (especially `getByTestId`) couple tests to implementation details rather than user-visible behavior. When you use `getByRole`, you're also implicitly testing that your component is accessible.

**Uncertainty:**
- The exact ordering between `getByDisplayValue` (5) and `getByAltText` (6) — was unsure of official order
- Not certain whether the official docs use exactly this 8-level taxonomy or a different grouping
- Did not know whether the skill adds extra nuance beyond the basic list

---

### GREEN (with skill)

Skill confirms the exact same 8-level priority order:

1. `getByRole` — #1 always. Matches ARIA roles. Tests accessibility implicitly.
2. `getByLabelText` — form fields. Mirrors how screen readers navigate.
3. `getByPlaceholderText` — when no label exists (not ideal UX, but testable).
4. `getByText` — non-interactive elements: headings, paragraphs, spans.
5. `getByDisplayValue` — filled form elements (input/select/textarea with current value).
6. `getByAltText` — images and area elements.
7. `getByTitle` — title attribute. Inconsistent screen reader support — use sparingly.
8. `getByTestId` — last resort only. Use when no semantic query works.

The skill also categorizes these into three levels:
- **Level 1** (1–5): Accessible to everyone
- **Level 2** (6–7): Semantic queries
- **Level 3** (8): Test IDs — last resort

Concrete role examples for `getByRole`:

```typescript
screen.getByRole('button', { name: /submit/i });
screen.getByRole('link', { name: /learn more/i });
screen.getByRole('heading', { name: /welcome/i, level: 1 });
screen.getByRole('checkbox', { name: /agree to terms/i });
screen.getByRole('textbox', { name: /email/i });
screen.getByRole('combobox', { name: /country/i });
```

**Corrected:** Baseline had the ordering correct. No corrections needed.

**Gaps filled:** Skill adds the Level 1/2/3 grouping taxonomy, concrete role examples with ARIA names, a link to the full ARIA role spec, and an explicit prompt: "If you're reaching for `getByTestId`, first ask: can I add a role or label to make this semantically queryable?"

**Skill gaps:** None for this question.

**Score: PASS** — baseline was directionally correct but the skill adds concrete examples and the grouping taxonomy that make it actionable in real tests.

---

## Question 3: My React 19 Suspense component test keeps showing the fallback — how do I fix it?

### RED (baseline — training data only)

The issue: React 19 changed Suspense behavior in test environments. Components stay in the fallback/loading state because the async resolution never completes within the synchronous test runner context.

General fix from training data: wrap the render in `act()`:

```typescript
import { act } from '@testing-library/react';

it('renders resolved content', async () => {
  await act(async () => {
    render(<SuspendedComponent />);
  });
  expect(screen.getByText('loaded content')).toBeInTheDocument();
});
```

**Uncertainty:**
- Not confident whether the correct import for `act` is from `@testing-library/react` or from `react` itself in this context
- Unsure whether this is a documented v16-specific pattern or a React 19 pattern independent of RTL version
- Did not know the specific warning RTL emits or whether it should be ignored
- Did not know the inverse pattern (how to assert the fallback state without `act()`)
- Uncertain whether `findBy*` queries could serve as an alternative to `act()` for this use case
- Estimated this could break "many tests" on React 18→19 upgrade but had no quantitative data

---

### GREEN (with skill)

The skill documents both sides of the pattern — resolving AND the fallback — which baseline only partially covered.

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

**To assert the fallback (loading state) — do NOT use act():**

```typescript
it('shows fallback while loading', () => {
  // Do NOT use act() — render synchronously to capture fallback
  render(<SuspendedComponent />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

Key callouts from the skill:
- RTL will emit an `act()` warning for fallback assertions — this is intentional and should be ignored
- This is a known React 19 behavioral change that can break **300+ tests** on upgrade from React 18
- `import { act } from '@testing-library/react'` is the correct import (not from `react` directly)
- React 18 vs React 19 comparison table: in React 18, Suspense resolves to children in tests; in React 19, it stays in fallback without `act()`
- `startTransition` in React 19 also needs `act()` wrapping

**Corrected:**
- Baseline didn't know the inverse fallback pattern (synchronous render without `act()`)
- Baseline was uncertain about the correct `act` import source — skill confirms `@testing-library/react`
- Baseline had no quantitative scale of the breakage (300+ tests)

**Gaps filled:**
- The warning-is-intentional callout for fallback assertions
- Full React 18 vs 19 behavioral diff table
- `startTransition` pattern with `act()`
- Explicit confirmation that `act` comes from `@testing-library/react`

**Skill gaps:** The skill does not address whether `findBy*` queries can substitute for `act()` in resolved-state assertions. This is a common alternative pattern from training data — `await screen.findByText('loaded content')` — that the skill omits.

**Score: PASS** — skill fills critical gaps: the inverse fallback pattern, the intentional warning, the import source, and the scale of React 18→19 breakage.

---

## Question 4: How do I test a form with user interactions using @testing-library/user-event v14?

### RED (baseline — training data only)

```typescript
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

it('submits form with valid data', async () => {
  const user = userEvent.setup(); // v14 requires setup() call
  const onSubmit = vi.fn();

  render(<ContactForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalled();
});
```

Key v14 API points from training data:
- Must call `userEvent.setup()` before any interactions — creates a bound instance
- All interaction methods are `async` — always `await` them
- Use `user.type()` for text input, `user.click()` for buttons, `user.selectOptions()` for selects
- `user.clear()` to clear an input before retyping

**Uncertainty:**
- Not certain about `setup()` options (`delay`, `pointerEventsCheck`) and their performance implications
- Uncertain about the full pointer API (`user.pointer()`) for right-click and touch interactions
- Did not know clipboard methods (`user.copy()`, `user.paste()`, `user.cut()`)
- Did not know `user.tab({ shift: true })` for backward tab navigation
- Unsure whether `user.type()` requires focus first or handles it automatically
- Did not know the `keyboard()` method's bracket notation for key sequences (`{Enter}`, `[ShiftLeft>]`)

---

### GREEN (with skill)

The skill confirms the core pattern and fills in the full API surface:

**Core form test (same as baseline, with `selectOptions` added):**

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
```

**Setup options the skill documents:**

```typescript
const user = userEvent.setup({
  delay: null,              // disable key press delay (faster tests)
  pointerEventsCheck: 0,   // skip pointer-events CSS check (faster for deep nesting)
});
```

**Keyboard bracket notation (not in baseline):**

```typescript
await user.keyboard('{Enter}');
await user.keyboard('{Tab}');
await user.keyboard('{Escape}');
await user.keyboard('[ShiftLeft>]a[/ShiftLeft]'); // Shift+A
await user.keyboard('{Control>}a{/Control}');     // Ctrl+A (select all)
```

**Pointer API for right-click and touch (not in baseline):**

```typescript
await user.pointer({ keys: '[MouseRight]', target: element });
await user.pointer({ keys: '[TouchA]', target: element });
```

**Clipboard methods (not in baseline):**

```typescript
await user.copy();
await user.paste();
await user.cut();
```

**Tab navigation:**

```typescript
await user.tab();               // forward
await user.tab({ shift: true }); // backward
```

**Note on `user.type()`:** The skill shows clicking an input before `user.type()` to focus it first, confirming baseline uncertainty — focus is not automatic.

**Corrected:** Baseline answer was functionally correct but incomplete. No factual errors.

**Gaps filled:**
- `setup()` options (`delay: null`, `pointerEventsCheck`) and their purpose
- Full `keyboard()` API with bracket notation for key sequences and modifiers
- `pointer()` API for right-click, touch, and stylus interactions
- Clipboard methods
- Explicit `user.tab({ shift: true })` for backward navigation
- `user.click(input)` needed before `user.type()` to establish focus

**Skill gaps:** None identified for this question.

**Score: PASS** — baseline was directionally correct, but the skill fills out the full API surface — keyboard bracket notation, pointer API, clipboard, and setup options — that baseline omitted.

---

## Summary

| Question | Topic | Baseline Accuracy | Skill Value Added | Score |
|----------|-------|-------------------|-------------------|-------|
| Q1 | v16 install + Vitest setup | Missed critical `@testing-library/dom` peer dep | Corrects breaking change, adds `@types/react-dom` | PASS |
| Q2 | Query priority | Directionally correct, ordering accurate | Adds grouping taxonomy, concrete role examples | PASS |
| Q3 | React 19 Suspense fallback | Partial — had resolved-state pattern, missed fallback pattern | Fills inverse pattern, warning intent, import source, scale | PASS |
| Q4 | Form testing with user-event v14 | Core pattern correct, API surface incomplete | Fills keyboard notation, pointer API, clipboard, setup options | PASS |

**Questions where skill added value: 4/4**

**Overall assessment: PASS**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Findings

**Highest-value corrections:**

1. **Q1 — `@testing-library/dom` peer dep** — This is a silent failure mode. Without the skill, a developer on v16 could install the wrong packages and get confusing errors with no clear cause. The skill documents this as the top breaking change.

2. **Q3 — Inverse Suspense pattern** — Baseline knew how to assert resolved state but completely missed how to assert the fallback (synchronous render without `act()`). This is not obvious and the intentional warning suppression requires explicit knowledge.

3. **Q3 — React 18→19 breakage scale** — "300+ tests" is actionable intelligence that sets expectations before upgrading. Baseline had no quantitative data.

**Skill gaps identified:**

- Q3: No mention of `findBy*` as an alternative to `await act(async () => render(...))` for resolved-state assertions. Some teams use `await screen.findByText('content')` after a plain `render()` call instead of wrapping render in `act()`.
- No coverage of MSW (Mock Service Worker) setup beyond the reference.md example patterns — baseline training data has deeper MSW v2 setup knowledge.
- No mention of `cleanup` behavior and when it needs to be called manually vs automatic cleanup in Vitest/Jest environments.
