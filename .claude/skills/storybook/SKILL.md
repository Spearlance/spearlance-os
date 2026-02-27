---
model: claude-sonnet-4-6
name: storybook
description: Use when setting up Storybook, writing component stories, configuring the Vitest addon for testing, or using CSF Factories for TypeScript-first stories. Also use for interaction testing, module mocking, accessibility testing in stories, and visual testing integration.
---

# Storybook 10.x

ESM-only component workshop. Node 20.16+, 22.19+, or 24+ required. Install is 29% smaller; dist code ships unminified for easier debugging.

**Version:** 10.2.x (released October 2025)

## Quick Reference

| Item | Value |
|---|---|
| Version | 10.2.x |
| Init (React+Vite) | `npx storybook@latest init` |
| Init (Next.js) | `npx storybook@latest init` (auto-detects) |
| Docs | https://storybook.js.org/docs |
| Test command | `vitest --project=storybook` |
| CSF format | CSF3 (standard) or CSF Factories (preview) |
| Config dir | `.storybook/` |
| Main config | `.storybook/main.ts` (must be valid ESM) |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Setup

**React + Vite:**
```bash
npx storybook@latest init
```

**Next.js 14.1+ (uses @storybook/nextjs-vite):**
```bash
npx storybook@latest init
# installs @storybook/nextjs-vite automatically
```

**Astro:**
```bash
npx storybook@latest init
# uses @storybook/addon-svelte-csf or framework-specific adapter
```

**SvelteKit:**
```bash
npx storybook@latest init
# auto-detects SvelteKit, configures @storybook/sveltekit
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CSF3 Story Template (TypeScript)

```typescript
// Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', label: 'Click me' },
};

export const WithInteraction: Story = {
  args: { variant: 'primary', label: 'Submit' },
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import('@storybook/test');
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
  },
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Vitest Addon Quick Setup

Three steps to replace the old test-runner:

**1. Install:**
```bash
npx storybook add @storybook/addon-vitest
```
Automatically installs, registers, configures Vitest, sets up browser mode with Playwright Chromium.

**2. Add test script to package.json:**
```json
{ "scripts": { "test-storybook": "vitest --project=storybook" } }
```

**3. Run:**
```bash
npm run test-storybook
```

Requirements: Vitest ≥ 3.0, Vite-based framework.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---|---|
| CommonJS `require()` in main.ts | Storybook 10 is ESM-only — use `import`/`export` |
| Node < 20.16 | Upgrade to Node 20.16+, 22.19+, or 24+ |
| `@storybook/test-runner` installed | Replace with `@storybook/addon-vitest` |
| Module mock registered in stories | Only register `sb.mock()` in `.storybook/preview.ts` |
| Mock path missing file extension | `sb.mock(import('../lib/api'))` → `sb.mock(import('../lib/api.ts'))` |
| `@storybook/nextjs` with Next 14.1+ | Use `@storybook/nextjs-vite` instead |
| Vitest < 3.0 with addon-vitest | Upgrade Vitest — 3.0 is the minimum |
| `play` function not async | Always `async ({ canvasElement }) =>` |

## Full Reference

See `reference.md` for: full setup per framework, main.ts configuration, CSF Factories (definePreview/meta/story chain), complete Vitest addon config (vitest.config.ts + vitest.setup.ts), interaction testing, module mocking (spy-only/automock/mock file), accessibility testing, Chromatic visual testing, CI config, and debugging guide.
