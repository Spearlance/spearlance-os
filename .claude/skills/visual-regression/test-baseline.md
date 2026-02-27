# RED/GREEN Accuracy Test — visual-regression skill

**Date:** 2026-02-21
**Skill files tested:**
- `packs/frontend/skills/visual-regression/SKILL.md`
- `packs/frontend/skills/visual-regression/reference.md`
**Tester:** claude-sonnet-4-6

---

## Question 1: How do I set up visual regression testing with Playwright's toHaveScreenshot()?

### RED (baseline — training data only)

Install `@playwright/test`. In `playwright.config.ts`, configure:
```typescript
expect: {
  toHaveScreenshot: {
    threshold: 0.2,
  },
}
```
Write tests with `await expect(page).toHaveScreenshot('name.png')`. First run generates baseline. Subsequent runs compare. Update with `--update-snapshots` flag. Snapshots go in a folder next to the test file.

**Uncertainty:**
- Did not know `maxDiffPixelRatio` as a separate option from `threshold`
- Did not know `animations: 'disabled'` is a config option at the `toHaveScreenshot` level
- Did not know `mask` option exists for volatile regions
- Did not know exact snapshot directory naming format (`[testfile].spec.ts-snapshots/`)
- Did not know the `fullPage`, `clip`, `scale`, `omitBackground`, `stylePath`, `maskColor` options
- Did not know element-scoped screenshots via `expect(locator).toHaveScreenshot()`

### GREEN (with skill)

**Install:**
```bash
npm i -D @playwright/test
```

**playwright.config.ts:**
```typescript
export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
});
```

**Test with masking for volatile regions:**
```typescript
await expect(page).toHaveScreenshot('homepage.png', {
  mask: [page.locator('.ad-banner')],
});
```

**Generate baselines:**
```bash
npx playwright test --update-snapshots
```

Snapshots land in `[testfile].spec.ts-snapshots/` named `<snapshot-name>-<browser>-<platform>.png`.

**Corrected:** Confirmed `threshold: 0.2` is correct range (0-1 as suspected). Added `maxDiffPixelRatio` as a distinct, combinable option.

**Gaps filled:**
- `animations: 'disabled'` in global config
- `mask` option for volatile regions with magenta fill
- `stylePath` for CSS injection
- `fullPage`, `clip`, `scale`, `omitBackground`, `maskColor` options
- Element-scoped screenshots: `expect(page.locator('.hero')).toHaveScreenshot()`
- Exact snapshot directory format and filename convention
- `--update-snapshots` per-file and per-project targeting
- Threshold tuning strategy (permissive → moderate → strict phases)

**Skill gaps:** None — skill is comprehensive for this question.

**Score: PASS** — skill added substantial value. Baseline answer was ~30% of what the skill covers.

---

## Question 2: Why do my Playwright screenshots differ between local Mac and CI Linux? How do I fix it?

### RED (baseline — training data only)

Known causes: font rendering differences between OS, different Chromium versions. Fix: use Docker with a matching Linux image. Something about locking to `--project=chromium` and headless mode.

**Uncertainty:**
- Did not know the specific official Docker image (`mcr.microsoft.com/playwright`)
- Did not know the exact image tag format (`v1.50.0-noble`)
- Did not know the specific rendering causes: subpixel antialiasing, GPU compositing, `deviceScaleFactor`, headless vs headed rendering pipeline differences
- Did not know the exact `docker run` command for local baseline generation
- Did not know the complete GitHub Actions workflow YAML
- Did not know the warning about NOT running `--update-snapshots` locally on macOS

### GREEN (with skill)

**Root causes (from reference.md):**
- macOS and Linux Chromium produce different subpixel antialiasing
- Headless vs headed uses different rendering pipeline
- Hardware/GPU changes compositing behavior
- `deviceScaleFactor` differences alter pixel density
- Even a minor Chromium version bump shifts font hinting or shadow rendering

**The fix — run baselines in the same Docker image used in CI:**

```bash
# Match image tag to installed Playwright version
npx playwright --version
# → Version 1.50.0

docker run --rm \
  -v $(pwd):/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.50.0-noble \
  npx playwright test --update-snapshots --project=chromium
```

**GitHub Actions workflow:**
```yaml
jobs:
  visual-test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=chromium
```

**Critical warning from skill:** Do NOT run `--update-snapshots` on macOS — it overwrites Linux baselines that will always fail in CI.

**Corrected:** Training data mentioned Docker generically but lacked the specific image registry, tag format, and `docker run` command.

**Gaps filled:**
- Complete causal explanation of why rendering differs (6 distinct causes)
- Official image: `mcr.microsoft.com/playwright:v<VERSION>-noble` or `-jammy`
- How to find the correct image tag from `npx playwright --version`
- Full `docker run` command with volume mount
- Full GitHub Actions YAML with `container:` key
- Warning not to run `--update-snapshots` locally on macOS
- Font rendering specifically as a major source (with 4 fix options: Docker, mask, raise threshold, use `scale: 'css'`)

**Skill gaps:** None — reference.md has the most thorough treatment of this problem available anywhere.

**Score: PASS** — training data had the concept but none of the implementation details. Skill is the difference between "try Docker" and actually being able to do it.

---

## Question 3: What's the pricing for Chromatic visual testing in 2026?

### RED (baseline — training data only)

Last known: free tier with ~5,000 snapshots/month, paid tiers exist. No reliable numbers for paid tiers. Flagged as likely outdated.

**Uncertainty:**
- Paid tier prices completely unknown
- OSS tier terms unknown
- Whether trial exists unknown
- Extra snapshot overage pricing unknown

### GREEN (with skill)

From `reference.md` (verified February 2026):

| Plan | Snapshots/mo | Price |
|------|-------------|-------|
| Free | 5,000 (commercial), unlimited (qualifying OSS) | $0 |
| Starter | 35,000 | $179/mo |
| Pro | 85,000 | $399/mo |
| Enterprise | Custom | Custom |
| Extra snapshots (Pro) | — | $0.008 each |

14-day free trial, no credit card required.

**Corrected:** Free tier snapshot count (5,000) matched training data. OSS unlimited tier was unknown.

**Gaps filled:**
- Starter: $179/mo for 35K snapshots
- Pro: $399/mo for 85K snapshots
- Extra snapshot overage: $0.008 each on Pro
- 14-day free trial detail
- OSS qualifying tier = unlimited (not just 5,000)

**Skill gaps:** None for the information it covers. "Qualifying OSS" criteria not defined — would need Chromatic docs for that detail.

**Score: PASS** — training data had the free tier number right but nothing else. Skill fills the complete pricing table.

---

## Question 4: Should I use Chromatic, Argos CI, or Lost Pixel? What's the decision tree?

### RED (baseline — training data only)

- **Chromatic:** Storybook-first, well-known, paid after free tier
- **Argos CI:** Open-source-friendly, GitHub integration
- **Lost Pixel:** Self-hostable, open source

No structured decision tree. No clear criteria for choosing between them beyond those broad strokes.

**Uncertainty:**
- When exactly to pick Argos vs Chromatic when you have Playwright tests (not just Storybook)
- Lost Pixel's supported modes (Storybook, Ladle, Histoire, etc.)
- Argos's specific Playwright integration details (`argosScreenshot` API)
- Self-hosting nuances of Lost Pixel (`generateOnly: true`)
- Budget-path recommendation when no Storybook exists

### GREEN (with skill)

**Decision tree from SKILL.md:**

| Scenario | Tool | Why |
|----------|------|-----|
| Already have Playwright tests | Playwright `toHaveScreenshot()` | Free, built-in, zero extra deps |
| Storybook-heavy project | Chromatic | Native Storybook integration, visual review UI |
| Open source project | Chromatic (free unlimited) or Argos | Both offer free OSS tiers |
| Self-hosted requirement | Lost Pixel Engine | Fully self-hosted, no cloud dependency |
| Playwright + cloud review UI | Argos CI | Wraps Playwright with better defaults + PR review |
| Budget-conscious, no Storybook | Playwright built-in | $0 — just needs Docker for CI consistency |

**Argos vs Chromatic comparison (from reference.md):**

| Situation | Choice |
|-----------|--------|
| No Storybook — full page/component Playwright tests | Argos |
| Storybook is central to the workflow | Chromatic |
| Open source project | Both — either works |
| Want Playwright-native workflow | Argos |

**Lost Pixel supported modes:** Storybook, Ladle, Histoire, page screenshots, custom screenshots from Cypress/Playwright. OSS engine uses `generateOnly: true` — stores locally, no external service.

**Corrected:** Training data had the broad strokes right but the nuance wrong. "Argos = open-source friendly" is imprecise — the real differentiator is "Playwright-native workflow without Storybook."

**Gaps filled:**
- Playwright built-in as a zeroth option (when you already have Playwright, don't add a tool)
- Explicit Storybook vs no-Storybook split between Chromatic and Argos
- Lost Pixel's multi-mode support (Ladle, Histoire — not just Storybook)
- `generateOnly: true` for self-hosted OSS Lost Pixel
- `argosScreenshot()` API that handles stabilization, masking, upload automatically
- TurboSnap for Chromatic (incremental testing on changed stories only)
- Budget path is Playwright built-in, not "pick the cheapest cloud"

**Skill gaps:** No guidance on migration from one tool to another. No coverage of Percy or Applitools as alternatives.

**Score: PASS** — training data was directionally correct but too vague to act on. Skill provides an actionable decision tree with specific criteria.

---

## Summary

| Question | Skill Added Value? | Score |
|----------|--------------------|-------|
| Q1: Playwright toHaveScreenshot() setup | Yes — filled ~70% of the answer | PASS |
| Q2: Mac vs CI Linux diffs | Yes — implementation details entirely from skill | PASS |
| Q3: Chromatic 2026 pricing | Yes — full pricing table, trial, OSS tier | PASS |
| Q4: Decision tree | Yes — structured criteria vs vague impressions | PASS |

**Questions where skill added value: 4/4**

**Overall assessment: PASS**

The skill adds value across all four questions. The most impactful contribution is Q2 (Docker CI fix) — training data had the concept but none of the implementation. The skill provides the specific Docker image registry, tag format, `docker run` command, and the critical warning about not running `--update-snapshots` on macOS. Without the skill, an Armadilloer would waste significant debugging time on CI rendering failures.

The pricing information (Q3) has a natural decay rate — the skill's February 2026 timestamp makes it reliable now but will need updating quarterly.

The one notable skill gap across all questions: no coverage of Percy or Applitools as alternatives, and no guidance on migrating between tools. These are edge cases that don't affect the skill's core value.
