# RED/GREEN Accuracy Test — Storybook Reference Skill

**Date:** 2026-02-21
**Skill files:** `packs/frontend/skills/storybook/SKILL.md` + `packs/frontend/skills/storybook/reference.md`
**Model:** claude-sonnet-4-6
**Methodology:** RED answers produced from training data only, before reading skill files. GREEN answers produced after reading both skill files.

---

## Question 1: How do I set up Storybook testing with Vitest in a React+Vite project?

**RED (baseline):**
Install `@storybook/addon-vitest` or use `@storybook/test-runner`. Run `npx storybook add @storybook/addon-vitest`. Configure `vitest.config.ts` to include a storybook plugin. Stories become test files automatically.

**Uncertainty:** Exact package name (`@storybook/addon-vitest` vs `@storybook/vitest-plugin`), whether test-runner or addon-vitest is current, exact vitest.config.ts shape, minimum Vitest version requirement.

---

**GREEN (with skill):**

Three steps:

1. Install the addon:
```bash
npx storybook add @storybook/addon-vitest
```
This auto-installs the addon, registers it in `.storybook/main.ts`, creates/updates `vitest.config.ts`, and creates `.storybook/vitest.setup.ts` with Playwright Chromium.

2. Create `.storybook/vitest.setup.ts`:
```typescript
import { setProjectAnnotations } from '@storybook/react-vite';
import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([previewAnnotations]);
beforeAll(annotations.beforeAll);
```

3. Configure `vitest.config.ts` using the `storybookTest` plugin:
```typescript
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    projects: [{
      plugins: [storybookTest({ configDir: '.storybook' })],
      test: {
        name: 'storybook',
        browser: { enabled: true, provider: playwright({}), headless: true, instances: [{ browser: 'chromium' }] },
        setupFiles: ['./.storybook/vitest.setup.ts'],
      },
    }],
  },
}));
```

4. Add script and run:
```bash
# package.json: "test-storybook": "vitest --project=storybook"
npm run test-storybook
```

**Requirements:** Vitest ≥ 3.0, Vite-based framework. Do NOT use `@storybook/test-runner` (replaced).

**Corrected:** Confirmed `@storybook/addon-vitest` is correct package name. Clarified that `@storybook/test-runner` is the OLD approach — the addon replaces it entirely. Plugin import is `@storybook/addon-vitest/vitest-plugin` (not a separate `@storybook/vitest-plugin` package).

**Gaps filled:** Minimum Vitest version (3.0), the `vitest.setup.ts` setup with `setProjectAnnotations`, exact `vitest.config.ts` shape with `projects` array and Playwright browser mode, `--project=storybook` flag for scoped runs, the fact that `npx storybook add` automates most configuration.

**Skill gaps:** None on this question — complete coverage.

**Score: PASS**

---

## Question 2: What is CSF Factories and how do I use it?

**RED (baseline):**
Uncertain. CSF = Component Story Format. "CSF Factories" sounds like a newer API — possibly a factory function pattern for creating stories with shared args. Not confident this is a real named feature vs something I'm confusing with another pattern.

**Uncertainty:** Whether CSF Factories is a real named API, what the actual syntax is, whether it's stable or experimental.

---

**GREEN (with skill):**

CSF Factories is a TypeScript-first story authoring API introduced in Storybook 10. Status: **Preview** (promoted from Experimental in SB10, expected to become default in SB11).

Factory chain: `definePreview` → `preview.meta()` → `meta.story()`.

**Step 1 — preview.ts with `definePreview`:**
```typescript
import { definePreview } from '@storybook/react';
import addonA11y from '@storybook/addon-a11y';

export default definePreview({
  addons: [addonA11y()],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
  },
});
```

**Step 2 — Story file:**
```typescript
import preview from '../.storybook/preview';
import { Button } from './Button';

const meta = preview.meta({
  component: Button,
  args: { label: 'Button' },
});

export const Primary = meta.story({ args: { variant: 'primary' } });
export const Secondary = meta.story({ args: { variant: 'secondary' } });

// Key feature: .extend() for story composition
export const PrimaryDisabled = Primary.extend({ args: { disabled: true } });
```

**When to use CSF Factories vs CSF3:**

| Scenario | Use |
|---|---|
| New project, TypeScript, want best DX | CSF Factories |
| Existing project, migrating gradually | CSF3 |
| Sharing stories across frameworks | CSF3 |
| Need `.extend()` for story composition | CSF Factories |
| Targeting SB < 10 | CSF3 only |

**Corrected:** CSF Factories is a real, named, documented API. Training data had no knowledge of it.

**Gaps filled:** Everything — the concept, the factory chain (`definePreview` → `.meta()` → `.story()`), the `.extend()` method, status (Preview, not stable), when to use it vs CSF3.

**Skill gaps:** No guidance on migrating an existing CSF3 project to CSF Factories story-by-story.

**Score: PASS**

---

## Question 3: How do I mock modules in Storybook 10?

**RED (baseline):**
Module mocking in Storybook uses `@storybook/addon-mock` or MSW for network mocking. For module mocking, possibly `moduleNameMapper` in config.

**Uncertainty:** Whether `@storybook/addon-mock` is real, whether SB10 has a first-party module mocking API, exact syntax for any mock approach.

---

**GREEN (with skill):**

SB10 introduces `sb.mock()` — a first-party module mocking API. Three modes:

**Setup (must be in `.storybook/preview.ts` only — never in story files):**
```typescript
import { definePreview, sb } from '@storybook/react';

// Spy-only: wraps real functions with Vitest spies (recommended)
sb.mock(import('../lib/session.ts'), { spy: true });

// Full automock: replaces all exports with vi.fn()
sb.mock(import('../lib/api.ts'));

// Mock file: resolves to __mocks__/lib/db.ts
sb.mock(import('../lib/db.ts'));

export default definePreview({ /* ... */ });
```

**Three mock modes:**

| Mode | Syntax | When |
|---|---|---|
| Spy-only | `sb.mock(import('...'), { spy: true })` | Real behavior + call tracking |
| Full automock | `sb.mock(import('...'))` | Isolate from external side effects |
| Mock file | `sb.mock(import('...'))` + `__mocks__/` file | Custom mock implementation |

**Using mocks per-story:**
```typescript
// Override per story using vi.spyOn in beforeEach
export const LoggedIn: StoryObj = {
  beforeEach() {
    vi.spyOn(session, 'getUser').mockReturnValue({ id: '1', name: 'Jane' });
  },
};
```

**Critical rules:**
- `sb.mock()` calls MUST be in `preview.ts` — not story files
- Module paths require file extension: `'../lib/api.ts'` not `'../lib/api'`
- Webpack: only supports ESM node_modules automocking (CJS not supported)

**Corrected:** `@storybook/addon-mock` doesn't appear to be the right package — SB10 has `sb.mock()` built-in via `@storybook/react`. `moduleNameMapper` is a Jest/Vitest config approach, not the Storybook-native solution.

**Gaps filled:** The entire `sb.mock()` API, three mock modes, the preview.ts registration requirement, file extension requirement, mock file pattern (`__mocks__/` directory), per-story override via `beforeEach`.

**Skill gaps:** No coverage of MSW v2 integration for HTTP mocking (though reference.md covers it separately in the addons section).

**Score: PASS**

---

## Question 4: What's the current version of Storybook and what breaking changes does it have?

**RED (baseline):**
My training cutoff is August 2025. Storybook 8.x was current at that time. No reliable data on Storybook 10 or its breaking changes.

**Uncertainty:** Everything post-August 2025. Version number, release date, breaking changes.

---

**GREEN (with skill):**

**Current version:** Storybook 10.2.x (released October 2025)

**Breaking changes from SB8/9 → SB10:**

| Change | Detail |
|---|---|
| ESM-only | Dropped CommonJS entirely — `require()` in `.storybook/main.ts` breaks |
| Node version | Requires Node 20.16+, 22.19+, or 24+ |
| Next.js adapter | `@storybook/nextjs` replaced by `@storybook/nextjs-vite` for Next 14.1+ |
| Test runner replaced | `@storybook/test-runner` replaced by `@storybook/addon-vitest` |
| Vitest minimum | `@storybook/addon-vitest` requires Vitest ≥ 3.0 |
| Install size | 29% smaller — dist ships unminified |
| CSF Factories | Promoted from Experimental → Preview (opt-in, not default) |
| Svelte async | SvelteKit adapter now supports Svelte async components natively |

**Common migration errors:**
- `require is not defined` → convert `main.ts` to ESM syntax
- Stories don't render in Next.js → switch to `@storybook/nextjs-vite`
- Test runner missing → replace with `@storybook/addon-vitest`
- Mocks not applying → missing `.ts` extension in `sb.mock()` import path

**Corrected:** Training data had Storybook 8.x as current. Version is actually 10.2.x, released October 2025 (post-cutoff). Breaking changes are entirely new information.

**Gaps filled:** Version number, release date, ESM-only requirement, Node version floor, Next.js adapter change, test-runner deprecation, Vitest minimum, install size improvement.

**Skill gaps:** No explicit changelog or migration guide path from SB8 → SB10 (e.g., codemods available, step-by-step upgrade). No information on what changed between SB9 and SB10 vs SB8 and SB10.

**Score: PASS**

---

## Summary

| Question | Skill added value? | Key gap filled |
|---|---|---|
| Q1: Vitest setup | PASS | Exact config shape, `vitest.setup.ts`, Vitest 3.0 minimum, `--project=storybook` flag |
| Q2: CSF Factories | PASS | Entire concept — factory chain, `.extend()`, status, when to use |
| Q3: Module mocking | PASS | `sb.mock()` API, three modes, preview.ts requirement, file extension rule |
| Q4: Version + breaking changes | PASS | SB10.2.x, ESM-only, Node floor, Next.js adapter, test-runner replacement |

**Questions where skill added value: 4/4**

**Overall assessment: PASS**

The skill provides high-value, post-cutoff information that training data cannot supply:
- SB10 is a post-August 2025 release — all version-specific details are net-new
- CSF Factories API is entirely absent from training data
- `sb.mock()` first-party mocking API is SB10-specific and unknown to baseline
- ESM-only, Node version floor, and adapter changes are critical breaking changes that would cause real failures without the skill

The skill is well-structured for lookup: SKILL.md gives quick answers, reference.md provides copy-paste-ready code for every scenario. No question required significant fallback to training data.
