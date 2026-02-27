# Storybook 10.x — Reference

> **Last Verified:** February 2026
> **Version:** Storybook 10.2.x (released October 2025)
> **Requires:** Node.js 20.16+, 22.19+, or 24+. ESM-only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Setup & Configuration

### React + Vite

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npx storybook@latest init
npm run storybook
```

`init` auto-detects Vite + React and installs `@storybook/react-vite`.

---

### Next.js 14.1+

```bash
npx storybook@latest init
```

Auto-installs `@storybook/nextjs-vite`. This replaces the old `@storybook/nextjs` (webpack-based). Requires Next.js 14.1+.

**Do not use** `@storybook/nextjs` with Next 14.1+ — it will conflict with the Vite-based pipeline.

---

### Astro

```bash
npx storybook@latest init
```

Installs `@storybook/addon-svelte-csf` for `.svelte` components or framework-appropriate adapters. Check storybook.js.org/docs for Astro-specific integrations.

---

### SvelteKit

```bash
npx storybook@latest init
```

Auto-installs `@storybook/sveltekit`. Supports Svelte async components natively in SB10.

---

### main.ts Configuration

`.storybook/main.ts` must be valid ESM. No CommonJS `require()`.

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

**ESM requirement:** SB10 dropped CommonJS support entirely. If you see `require is not defined`, your config is still using CJS syntax.

---

### preview.ts

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. Component Story Format

### CSF3 — Standard Format

Current default. Works with all Storybook versions.

```typescript
// src/components/Button/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',   // optional — autodocs infers from file path
  component: Button,
  parameters: {
    layout: 'centered',         // 'padded' | 'fullscreen' | 'centered'
  },
  tags: ['autodocs'],           // enables auto-generated docs page
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Visual style of the button',
    },
    onClick: { action: 'clicked' },
  },
  args: {
    label: 'Button',            // default args shared across all stories
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const LongLabel: Story = {
  args: {
    label: 'A very long label that wraps',
    variant: 'primary',
  },
};
```

---

### CSF Factories — Preview Status (SB10)

TypeScript-first. Promoted from Experimental → Preview in SB10. Expected to become default in SB11.

Factory chain: `definePreview` → `preview.meta()` → `meta.story()`.

**preview.ts with CSF Factories:**

```typescript
// .storybook/preview.ts
import { definePreview } from '@storybook/react';
import addonA11y from '@storybook/addon-a11y';

export default definePreview({
  addons: [addonA11y()],
  parameters: {
    a11y: { options: { xpath: true } },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
});
```

**Story file with CSF Factories:**

```typescript
// src/components/Button/Button.stories.ts
import preview from '../.storybook/preview';
import { Button } from './Button';

const meta = preview.meta({
  component: Button,
  parameters: { layout: 'centered' },
  args: { label: 'Button' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
});

export const Primary = meta.story({
  args: { variant: 'primary' },
});

export const Secondary = meta.story({
  args: { variant: 'secondary' },
});

// Extend an existing story — inherits all args and play functions
export const PrimaryDisabled = Primary.extend({
  args: { disabled: true },
});
```

**When to use CSF Factories vs CSF3:**

| Scenario | Use |
|---|---|
| New project, TypeScript, want best DX | CSF Factories |
| Existing project, migrating gradually | CSF3 — avoid mixed files |
| Sharing stories across frameworks | CSF3 — broader compat |
| Need `.extend()` for story composition | CSF Factories |
| Targeting SB < 10 | CSF3 only |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. Vitest Addon

Replaces `@storybook/test-runner`. Runs stories as Vitest tests in browser mode with Playwright Chromium.

**Requirements:**
- Vitest ≥ 3.0
- Vite-based framework (`@storybook/react-vite`, `@storybook/nextjs-vite`, `@storybook/sveltekit`, etc.)
- MSW v2.0.0+ if using MSW

---

### Installation

```bash
npx storybook add @storybook/addon-vitest
```

This command:
1. Installs `@storybook/addon-vitest` and Playwright Chromium
2. Registers the addon in `.storybook/main.ts`
3. Creates or updates `vitest.config.ts`
4. Creates `.storybook/vitest.setup.ts`

---

### vitest.setup.ts

```typescript
// .storybook/vitest.setup.ts
import { setProjectAnnotations } from '@storybook/react-vite';
import * as previewAnnotations from './preview';

// Replace '@storybook/react-vite' with your framework package
const annotations = setProjectAnnotations([previewAnnotations]);

beforeAll(annotations.beforeAll);
```

---

### vitest.config.ts

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import viteConfig from './vite.config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
              // Optional: run storybook in the background during tests
              storybookScript: 'yarn storybook --no-open',
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              provider: playwright({}),
              headless: true,
              instances: [{ browser: 'chromium' }],
            },
            setupFiles: ['./.storybook/vitest.setup.ts'],
          },
        },
      ],
    },
  })
);
```

---

### package.json Scripts

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "vitest --project=storybook",
    "test-storybook:coverage": "vitest --project=storybook --coverage"
  }
}
```

---

### Running Tests

```bash
# Run all storybook tests once
npm run test-storybook

# Watch mode
npx vitest --project=storybook --watch

# Run a specific story file
npx vitest --project=storybook src/components/Button/Button.stories.ts

# With coverage
npx vitest --project=storybook --coverage
```

---

### Migrating from @storybook/test-runner

```bash
# Remove old test-runner
npm uninstall @storybook/test-runner

# Install vitest addon
npx storybook add @storybook/addon-vitest
```

Key difference: test-runner used Playwright directly, addon-vitest uses Vitest browser mode. `play` functions work identically. `waitFor` assertions may need adjustment — see interaction testing section.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Interaction Testing

### play Functions

Runs after the story renders. Used for interaction sequences and assertions.

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  component: LoginForm,
};
export default meta;

type Story = StoryObj<typeof LoginForm>;

export const SuccessfulLogin: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Fill credentials', async () => {
      await userEvent.type(
        canvas.getByLabelText('Email'),
        'user@example.com'
      );
      await userEvent.type(
        canvas.getByLabelText('Password'),
        'password123'
      );
    });

    await step('Submit form', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Log in' }));
    });

    await step('Verify success', async () => {
      await expect(
        canvas.getByText('Welcome back!')
      ).toBeInTheDocument();
    });
  },
};
```

---

### @storybook/test Exports

All testing utilities come from `@storybook/test` — do not import from `@testing-library/react` directly in stories.

```typescript
import {
  within,        // scoped queries — prefer over screen
  userEvent,     // user interaction simulation
  expect,        // assertions
  waitFor,       // async polling assertions
  fn,            // spy function creator
  spyOn,         // spy on existing method
} from '@storybook/test';
```

---

### userEvent Patterns

```typescript
// Click
await userEvent.click(canvas.getByRole('button'));

// Type text
await userEvent.type(canvas.getByLabelText('Name'), 'Jane Doe');

// Clear then type
await userEvent.clear(canvas.getByLabelText('Name'));
await userEvent.type(canvas.getByLabelText('Name'), 'New Name');

// Keyboard
await userEvent.keyboard('{Enter}');
await userEvent.keyboard('{Tab}');
await userEvent.keyboard('{Escape}');

// Select option
await userEvent.selectOptions(
  canvas.getByRole('combobox'),
  'Option 2'
);

// Upload file
const file = new File(['content'], 'test.txt', { type: 'text/plain' });
await userEvent.upload(canvas.getByLabelText('Upload'), file);
```

---

### Async Assertions

```typescript
// Wait for element to appear
await waitFor(() =>
  expect(canvas.getByText('Success')).toBeInTheDocument()
);

// Wait for element to disappear
await waitFor(() =>
  expect(canvas.queryByText('Loading...')).not.toBeInTheDocument()
);

// Custom timeout
await waitFor(
  () => expect(canvas.getByRole('alert')).toBeVisible(),
  { timeout: 5000 }
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Module Mocking

SB10 introduces `sb.mock()` for automocking in stories. Register in `.storybook/preview.ts` only.

---

### Setup in preview.ts

```typescript
// .storybook/preview.ts
import { definePreview, sb } from '@storybook/react';

// Spy-only: wraps real functions with Vitest spies
// Recommended for most cases — keeps real behavior, adds tracking
sb.mock(import('../lib/session.ts'), { spy: true });

// Full automock: replaces all exports with vi.fn()
sb.mock(import('../lib/api.ts'));

// Mock file: use a hand-written mock from __mocks__/
sb.mock(import('../lib/db.ts'));  // resolves to __mocks__/lib/db.ts

export default definePreview({
  parameters: { /* ... */ },
});
```

**Rules:**
- `sb.mock()` calls MUST be in `.storybook/preview.ts` — not in story files
- Module paths require file extension: `'../lib/api.ts'` not `'../lib/api'`
- Webpack: can only automock ESM node_modules (CJS modules not supported)

---

### Three Mock Modes

| Mode | Syntax | When to use |
|---|---|---|
| Spy-only | `sb.mock(import('...'), { spy: true })` | Real behavior + call tracking |
| Full automock | `sb.mock(import('...'))` | Isolate from external side effects |
| Mock file | `sb.mock(import('...'))` + `__mocks__/` file | Custom mock implementation |

---

### Using Mocks in Stories

```typescript
// src/components/UserProfile/UserProfile.stories.ts
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import * as session from '../../lib/session.ts';
import { UserProfile } from './UserProfile';

// session.ts is spy-mocked in preview.ts

export default { component: UserProfile };

export const LoggedIn: StoryObj = {
  beforeEach() {
    // Override spy return value for this story
    vi.spyOn(session, 'getUser').mockReturnValue({
      id: '1',
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
  },
};

export const LoggedOut: StoryObj = {
  beforeEach() {
    vi.spyOn(session, 'getUser').mockReturnValue(null);
  },
};
```

---

### Mock File Pattern

Create `__mocks__/` alongside the module:

```
src/
  lib/
    payments.ts
  __mocks__/
    lib/
      payments.ts    ← hand-written mock
```

```typescript
// src/__mocks__/lib/payments.ts
export const createCheckoutSession = vi.fn().mockResolvedValue({
  id: 'cs_test_mock',
  url: 'https://checkout.stripe.com/test',
});

export const cancelSubscription = vi.fn().mockResolvedValue({ status: 'canceled' });
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Accessibility Testing

### @storybook/addon-a11y

Ships with `@storybook/addon-essentials`. Adds an Accessibility panel to the UI showing axe-core violations.

**Install (if not already present):**
```bash
npm install --save-dev @storybook/addon-a11y
```

**Register in main.ts:**
```typescript
addons: ['@storybook/addon-a11y'],
```

---

### Per-Story Configuration

```typescript
export const AccessibleButton: Story = {
  parameters: {
    a11y: {
      options: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
};

// Disable a11y for a specific story (e.g., intentional low-contrast demo)
export const LowContrastDemo: Story = {
  parameters: {
    a11y: { disable: true },
  },
};
```

---

### Vitest A11y Assertions

With `@storybook/addon-vitest`, run a11y checks in your play functions:

```typescript
import { expect } from '@storybook/test';

export const ButtonA11y: Story = {
  play: async ({ canvasElement }) => {
    // Run axe on the entire canvas
    await expect(canvasElement).toHaveNoViolations();
  },
};
```

`toHaveNoViolations` runs axe-core and throws on any violation.

---

### CSF Factories + a11y

```typescript
// .storybook/preview.ts
import { definePreview } from '@storybook/react';
import addonA11y from '@storybook/addon-a11y';

export default definePreview({
  addons: [addonA11y()],
  parameters: {
    a11y: { options: { xpath: true } },
  },
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Visual Testing Integration

### Chromatic

Cloud-based visual testing. Captures snapshots of every story on every commit.

**Free tier:** 5,000 snapshots/month
**Starter:** $179/month — 35,000 snapshots
**Pro:** $399/month — 85,000 snapshots

**Setup:**
```bash
npm install --save-dev chromatic
```

```bash
# Run manually
npx chromatic --project-token=<your-token>
```

**CI (GitHub Actions):**
```yaml
# .github/workflows/chromatic.yml
name: Chromatic
on: push
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # required for baseline comparison
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

---

### Playwright Screenshot Integration

Use Playwright's screenshot API in `play` functions for custom visual checks:

```typescript
export const VisualSnapshot: Story = {
  play: async ({ canvasElement }) => {
    // Storybook + Vitest browser mode provides access to page
    // See Playwright docs for screenshot API
    const button = canvasElement.querySelector('button');
    // Screenshot via @playwright/test page API (available in browser mode context)
  },
};
```

For full visual regression, Chromatic is the recommended path — it handles diffing, baselines, and approval flows automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. Addon Ecosystem

### Bundled in @storybook/addon-essentials

| Addon | What it does |
|---|---|
| `@storybook/addon-viewport` | Resize iframe to simulate devices |
| `@storybook/addon-backgrounds` | Set canvas background color |
| `@storybook/addon-actions` | Log handler calls in Actions panel |
| `@storybook/addon-controls` | Live-edit args in Controls panel |
| `@storybook/addon-docs` | Auto-generate docs from stories + JSDoc |
| `@storybook/addon-measure` | Inspect layout dimensions on hover |
| `@storybook/addon-outline` | Outline all elements to check alignment |
| `@storybook/addon-highlight` | Highlight DOM elements programmatically |

---

### Viewport Configuration

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '390px', height: '844px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
      },
      defaultViewport: 'responsive',
    },
  },
};
```

---

### Actions

```typescript
// In stories
import { fn } from '@storybook/test';

const meta: Meta<typeof Button> = {
  component: Button,
  args: {
    onClick: fn(),    // tracked in Actions panel + usable in play assertions
    onChange: fn(),
  },
};
```

---

### MSW (Mock Service Worker) Integration

Requires MSW v2.0.0+.

```bash
npm install msw@2 --save-dev
npx msw init public/
```

```typescript
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';

initialize();

const preview: Preview = {
  loaders: [mswLoader],
};

export default preview;
```

```typescript
// In story file
import { http, HttpResponse } from 'msw';

export const WithData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () =>
          HttpResponse.json([{ id: 1, name: 'Jane' }])
        ),
      ],
    },
  },
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. CI Configuration

### Build Storybook for Deployment

```bash
npm run build-storybook
# outputs to storybook-static/
```

Deploy `storybook-static/` to any static host (Vercel, Netlify, Cloudflare Pages, S3).

---

### GitHub Actions — Build + Deploy

```yaml
# .github/workflows/storybook.yml
name: Storybook
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test-storybook

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build-storybook
      - uses: actions/upload-artifact@v4
        with:
          name: storybook-static
          path: storybook-static/
```

---

### Chromatic CI (Recommended for Visual Testing)

```yaml
- name: Publish to Chromatic
  uses: chromaui/action@v11
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    buildScriptName: build-storybook
```

Chromatic builds Storybook internally — no separate build step needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. Common Mistakes & Debugging

### ESM Issues

**Error:** `require is not defined` or `SyntaxError: Cannot use import statement`

Root cause: CJS syntax in `.storybook/main.ts`.

```typescript
// WRONG — CJS
const path = require('path');
module.exports = { /* ... */ };

// CORRECT — ESM
import path from 'node:path';
export default { /* ... */ };
```

---

### Framework Mismatch

**Error:** Stories don't render, blank canvas, or React errors in Next.js project.

Check that `@storybook/nextjs-vite` is installed for Next.js 14.1+, not `@storybook/nextjs`.

```bash
# Check what's installed
npm ls | grep storybook

# Fix
npm uninstall @storybook/nextjs
npm install @storybook/nextjs-vite
```

Update `main.ts`:
```typescript
framework: {
  name: '@storybook/nextjs-vite',  // not '@storybook/nextjs'
  options: {},
},
```

---

### Vitest Version Mismatch

**Error:** `Cannot find module '@storybook/addon-vitest/vitest-plugin'` or unexpected test failures.

Minimum: Vitest 3.0.

```bash
npm install vitest@latest @vitest/browser@latest
```

---

### Browser Mode Not Starting

**Error:** Tests hang or fail with Playwright timeout.

```bash
# Install Playwright browsers
npx playwright install chromium

# Verify browser mode config in vitest.config.ts
# browser.enabled must be true
# provider must be playwright({})
```

---

### play Function Not Running

**Error:** Interaction tests silently pass without executing play.

- Ensure the story has a `play` export (not `Play`)
- Ensure `@storybook/addon-vitest` is registered in `main.ts` addons array
- Check `.storybook/vitest.setup.ts` calls `setProjectAnnotations` with your preview

---

### Module Mock Not Applying

**Error:** Mocked module still runs real code in stories.

Common causes:
- `sb.mock()` called in a story file instead of `preview.ts`
- Missing file extension in import path: `'../lib/api'` → `'../lib/api.ts'`
- Using webpack (only supports ESM node_modules automocking)

---

### Story Not Appearing in Sidebar

Check `stories` glob in `main.ts`:

```typescript
stories: [
  '../src/**/*.mdx',
  '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
],
```

Ensure your story file matches the glob and exports `default` (the meta object).

---

### Node Version

```bash
node --version
# Must be >= 20.16.0, >= 22.19.0, or >= 24.0.0
```

Use `nvm use 20` or `nvm use 22` if on an older version.
