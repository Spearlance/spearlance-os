---
paths:
  - "**/*.{jsx,tsx,svelte,vue,astro}"
  - "**/components/**"
  - "**/pages/**"
  - "**/app/**"
---

# Visual Testing

## When This Rule Activates

Only when the project has a frontend stack. Detected from:
- `stack.json` containing framework like `nextjs`, `astro`, `sveltekit`, `react-vite`
- `package.json` with framework deps (`react`, `next`, `astro`, `svelte`, `vue`)
- File patterns: `src/components/`, `app/`, `pages/`, `*.tsx`, `*.jsx`

**Pure backend/CLI projects:** This rule is inactive. Skip visual testing entirely.

## Expanded TDD Cycle

When frontend work is detected, the TDD cycle becomes:

```
RED → GREEN → VISUAL → REFACTOR
```

- **RED** — failing functional test (behavior, not appearance)
- **GREEN** — implementation passes functional test
- **VISUAL** — capture/verify visual baseline
  - Playwright `toHaveScreenshot()` for automated regression
  - Cross-browser: Chromium + Firefox + WebKit (minimum)
  - Viewports: mobile (375px), tablet (768px), desktop (1280px)
  - Deterministic: `animations: 'disabled'`, fonts loaded, time frozen
  - `mask` option for dynamic elements (timestamps, avatars, ads)
- **REFACTOR** — clean up with both functional + visual tests as safety net

## Approval Workflow

| Scenario | Action |
|----------|--------|
| Intentional visual change | `npx playwright test --update-snapshots` |
| Unintentional visual diff | Treat as RED — it's a regression, fix it |
| New component (no baseline) | First run creates baseline, commit snapshots |

## Local vs CI

| Context | Scope |
|---------|-------|
| Local development | Selective — only changed components' visual tests |
| CI pipeline | Full visual suite across all browsers + viewports |
| Pre-commit | Affected visual tests only |
| Pre-push | Full visual suite |

## Interactive Verification

When `claude --chrome` is available:
- Use for live design verification during development
- Complementary to automated tests, not a replacement
- Good for subjective quality checks automated tests can't catch

## Deterministic Rendering Checklist

Before capturing screenshots:
- [ ] `animations: 'disabled'` in Playwright config
- [ ] Fonts loaded (`page.waitForLoadState('networkidle')` or font-face check)
- [ ] Time frozen (`page.clock.setFixedTime()` for timestamps)
- [ ] Dynamic content masked (`mask: [page.locator('.avatar')]`)
- [ ] Viewport set explicitly (`page.setViewportSize()`)
- [ ] Color scheme set (`page.emulateMedia({ colorScheme: 'light' })`)

## Integration

| Skill | How it uses this rule |
|-------|----------------------|
| `test-driven-development` | Adds VISUAL step after GREEN when frontend detected |
| `verification-before-completion` | Adds visual regression check to completion gate |
| `playwright` | Viewport presets + cross-browser config templates |
