# Front-End Testing Reference Skills — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 4 reference documentation skills (Playwright, Puppeteer, Cypress, Vitest) plus a frontend-testing-guide umbrella agent, registered in the core bundle.

**Architecture:** Mirror the Google APIs pattern — each tool gets a `SKILL.md` (quick ref, ~80 lines) + `reference.md` (comprehensive, ~600 lines). One umbrella agent routes generic testing requests. All added to core bundle in skills.json.

**Tech Stack:** Markdown skills, YAML frontmatter, JSON registration

---

### Task 1: Create Playwright SKILL.md

**Files:**
- Create: `.claude/skills/playwright/SKILL.md`

**Step 1: Research current Playwright state**

Use WebSearch to verify:
- Current Playwright version and release date
- Latest API changes (last 6 months)
- Any deprecations or breaking changes

**Step 2: Write SKILL.md**

Follow the google-ads-api SKILL.md pattern exactly:
- YAML frontmatter with `name: playwright` and trigger `description`
- Trigger description: `Use when working with Playwright for E2E testing, browser automation, cross-browser testing, test generation, or visual comparison. Also use when setting up Playwright in a project, writing page object models, or debugging test failures with trace viewer.`
- Overview (one sentence, version + date)
- Quick Reference table: current version, install command (`npm init playwright@latest`), config file (`playwright.config.ts`), key CLI commands (`npx playwright test`, `npx playwright codegen`, `npx playwright show-report`)
- Setup section: minimal `playwright.config.ts` + first test
- Common Operations: 3-5 patterns (navigation + assertion, form filling, waiting for network, screenshot comparison, API mocking)
- Common Mistakes table (at least 5 rows)
- Footer: "See `reference.md` in this skill directory for complete documentation..."

**Step 3: Commit**

```bash
git add .claude/skills/playwright/SKILL.md
git commit -m "feat(playwright): add SKILL.md quick reference"
```

---

### Task 2: Create Playwright reference.md

**Files:**
- Create: `.claude/skills/playwright/reference.md`

**Step 1: Research deeply**

Use WebSearch for Playwright's official docs to get current, verified information on all sections below.

**Step 2: Write reference.md (~600 lines)**

Structure (follow google-ads-api/reference.md pattern):

```
# Playwright Developer Reference

> **Last Updated:** February 2026
> **Current Version:** [verified version]

---

## Table of Contents
1. Installation and Configuration
2. Test Structure and Fixtures
3. Locators and Selectors
4. Actions and Interactions
5. Assertions
6. Navigation and Waiting
7. Network Interception and API Mocking
8. Screenshots and Visual Comparison
9. Authentication and Storage State
10. Parallel Execution and Sharding
11. Component Testing
12. CI/CD Integration
13. Debugging and Trace Viewer
14. Common Errors and Fixes
15. Recent Changes and Deprecations
```

Key content per section:
- **Installation:** `npm init playwright@latest`, `playwright.config.ts` full options, `use` block
- **Test Structure:** `test()`, `test.describe()`, `test.beforeEach()`, fixtures, `page` fixture
- **Locators:** `page.getByRole()`, `page.getByText()`, `page.getByTestId()`, `page.locator()`, chaining, filtering — emphasize `getBy*` over CSS selectors
- **Actions:** `click()`, `fill()`, `type()`, `selectOption()`, `check()`, `setInputFiles()`, `dragTo()`
- **Assertions:** `expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveCount()`, `.toHaveURL()`, soft assertions, custom matchers
- **Navigation:** `page.goto()`, `page.waitForURL()`, `page.waitForResponse()`, auto-waiting behavior
- **Network:** `page.route()`, `page.unroute()`, HAR recording, `route.fulfill()`, `route.abort()`
- **Screenshots:** `page.screenshot()`, `expect(page).toHaveScreenshot()`, `toMatchSnapshot()`, threshold config
- **Auth:** `storageState`, `globalSetup`, reusing auth across tests
- **Parallel:** workers config, sharding with `--shard=1/4`, test.describe.serial
- **Component Testing:** `@playwright/experimental-ct-react`, mounting components
- **CI/CD:** GitHub Actions config (with `npx playwright install --with-deps`), Docker, `reporter` options
- **Debugging:** `--debug` flag, Trace Viewer (`--trace on`), `page.pause()`, VS Code extension
- **Errors:** Common error messages + exact fixes table (10+ rows)
- **Recent Changes:** Verified recent version changes

**Step 3: Commit**

```bash
git add .claude/skills/playwright/reference.md
git commit -m "feat(playwright): add comprehensive reference.md"
```

---

### Task 3: Create Puppeteer SKILL.md

**Files:**
- Create: `.claude/skills/puppeteer/SKILL.md`

**Step 1: Research current Puppeteer state**

Use WebSearch to verify current version, recent changes, Chrome for Testing vs bundled Chromium.

**Step 2: Write SKILL.md**

Same pattern as Task 1:
- Trigger description: `Use when working with Puppeteer for browser automation, Chrome DevTools Protocol, headless Chrome, web scraping, PDF generation, or screenshot automation. Also use when working with Chrome for Testing or debugging CDP connections.`
- Quick Reference table: version, `npm install puppeteer`, config, key APIs
- Setup: minimal launch + navigate example
- Common Operations: navigation, form interaction, PDF generation, screenshot, evaluate JS
- Common Mistakes table (5+ rows)
- Footer pointing to reference.md

**Step 3: Commit**

```bash
git add .claude/skills/puppeteer/SKILL.md
git commit -m "feat(puppeteer): add SKILL.md quick reference"
```

---

### Task 4: Create Puppeteer reference.md

**Files:**
- Create: `.claude/skills/puppeteer/reference.md`

**Step 1: Research deeply**

WebSearch for Puppeteer's official docs — verify all APIs, especially recent changes around Chrome for Testing and the new headless mode.

**Step 2: Write reference.md (~600 lines)**

```
# Puppeteer Developer Reference

> **Last Updated:** February 2026
> **Current Version:** [verified]

## Table of Contents
1. Installation and Configuration
2. Browser and Page Management
3. Selectors and Element Handling
4. Navigation and Waiting
5. Network Interception
6. Screenshots and PDF Generation
7. JavaScript Evaluation
8. File Uploads and Downloads
9. Chrome DevTools Protocol (CDP)
10. Headless vs Headed Mode
11. Browser Contexts and Incognito
12. Parallel Execution
13. CI/CD Integration
14. Debugging
15. Common Errors and Fixes
16. Recent Changes (Chrome for Testing)
```

Key differentiators from Playwright:
- CDP-native (not just Chrome, now Firefox experimental too)
- `page.evaluate()` / `page.evaluateHandle()` patterns
- PDF generation (`page.pdf()`) with full options
- Chrome for Testing vs bundled Chromium
- `waitForSelector` vs Playwright's auto-waiting
- Explicit wait patterns (no auto-retry assertions)

**Step 3: Commit**

```bash
git add .claude/skills/puppeteer/reference.md
git commit -m "feat(puppeteer): add comprehensive reference.md"
```

---

### Task 5: Create Cypress SKILL.md

**Files:**
- Create: `.claude/skills/cypress/SKILL.md`

**Step 1: Research current Cypress state**

WebSearch for current version, pricing changes, component testing status, recent features.

**Step 2: Write SKILL.md**

Same pattern:
- Trigger description: `Use when working with Cypress for E2E testing, component testing, visual testing, or real-time test runner. Also use when configuring Cypress Cloud, writing custom commands, or debugging test flakiness in Cypress.`
- Quick Reference: version, `npm install cypress`, `cypress.config.ts`, `npx cypress open`, `npx cypress run`
- Setup: config + first test
- Common Operations: visit + assert, form interactions, network stubbing, component mount, viewport testing
- Common Mistakes table (5+ rows — especially Cypress-specific gotchas like async chaining, `.then()` vs promises)
- Footer

**Step 3: Commit**

```bash
git add .claude/skills/cypress/SKILL.md
git commit -m "feat(cypress): add SKILL.md quick reference"
```

---

### Task 6: Create Cypress reference.md

**Files:**
- Create: `.claude/skills/cypress/reference.md`

**Step 1: Research deeply**

WebSearch for Cypress docs — verify commands, configuration, component testing setup.

**Step 2: Write reference.md (~600 lines)**

```
# Cypress Developer Reference

> **Last Updated:** February 2026
> **Current Version:** [verified]

## Table of Contents
1. Installation and Configuration
2. Test Structure and Hooks
3. Commands and Chaining
4. Selectors and Querying
5. Assertions
6. Network Interception (cy.intercept)
7. Component Testing
8. Custom Commands
9. Fixtures and Test Data
10. Viewport and Responsive Testing
11. File Uploads and Downloads
12. Authentication Patterns
13. Parallel Execution and Cypress Cloud
14. CI/CD Integration
15. Debugging (Time Travel, Screenshots)
16. Common Errors and Fixes
17. Recent Changes and Deprecations
```

Key Cypress-specific content:
- Command chaining model (not async/await — `.should()`, `.then()`)
- `cy.intercept()` patterns (vs `cy.route()` which was removed)
- Component testing setup (`cypress/component`)
- Custom commands (`Cypress.Commands.add()`)
- `cy.fixture()` patterns
- Cypress Cloud integration (parallelization, analytics)
- Time-travel debugging in the runner
- `cy.session()` for auth

**Step 3: Commit**

```bash
git add .claude/skills/cypress/reference.md
git commit -m "feat(cypress): add comprehensive reference.md"
```

---

### Task 7: Create Vitest SKILL.md

**Files:**
- Create: `.claude/skills/vitest/SKILL.md`

**Step 1: Research current Vitest state**

WebSearch for current version, Vitest 3.x changes, browser mode, workspace support.

**Step 2: Write SKILL.md**

Same pattern:
- Trigger description: `Use when working with Vitest for unit testing, component testing, snapshot testing, or mocking in Vite-based projects. Also use when migrating from Jest to Vitest, configuring Vitest workspaces, or using Vitest Browser Mode for component tests.`
- Quick Reference: version, `npm install -D vitest`, `vitest.config.ts`, `npx vitest`, `npx vitest --ui`
- Setup: config + first test
- Common Operations: test + expect, mocking, snapshot, component test, coverage
- Common Mistakes table (5+ rows)
- Footer

**Step 3: Commit**

```bash
git add .claude/skills/vitest/SKILL.md
git commit -m "feat(vitest): add SKILL.md quick reference"
```

---

### Task 8: Create Vitest reference.md

**Files:**
- Create: `.claude/skills/vitest/reference.md`

**Step 1: Research deeply**

WebSearch for Vitest docs — especially v3.x features, browser mode, workspace config.

**Step 2: Write reference.md (~600 lines)**

```
# Vitest Developer Reference

> **Last Updated:** February 2026
> **Current Version:** [verified]

## Table of Contents
1. Installation and Configuration
2. Test Structure (describe, it, test)
3. Assertions and Matchers
4. Mocking (vi.fn, vi.mock, vi.spyOn)
5. Snapshot Testing
6. Timer and Date Mocking
7. Component Testing
8. Browser Mode
9. Coverage (v8, istanbul)
10. Workspace and Monorepo
11. TypeScript Integration
12. Watch Mode and Filtering
13. CI/CD Integration
14. Migration from Jest
15. Common Errors and Fixes
16. Recent Changes (v3.x)
```

Key Vitest-specific content:
- Vite-native (uses Vite's transform pipeline, ESM-first)
- `vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.hoisted()` patterns
- `vi.useFakeTimers()`, `vi.setSystemTime()`
- Snapshot testing with inline snapshots
- Browser Mode (`@vitest/browser`) — real browser testing
- Workspace config for monorepos
- Coverage with `@vitest/coverage-v8`
- Jest compatibility and migration guide (API differences)
- TypeScript: built-in, no config needed

**Step 3: Commit**

```bash
git add .claude/skills/vitest/reference.md
git commit -m "feat(vitest): add comprehensive reference.md"
```

---

### Task 9: Create frontend-testing-guide Agent

**Files:**
- Create: `.claude/agents/frontend-testing-guide.md`

**Step 1: Write agent definition**

Follow the `google-api-guide.md` pattern exactly but with `model: claude-sonnet-4-6` (not inherit):

```yaml
---
name: frontend-testing-guide
description: |
  Use this agent when the user asks about front-end testing without specifying a tool,
  needs help choosing a testing framework, or wants to set up a testing strategy.
  Also use for generic requests like "write tests", "add E2E tests", or
  "set up testing" when no specific tool is mentioned.
model: claude-sonnet-4-6
memory: user
maxTurns: 20
---
```

Agent body should cover:
1. **Tools You Cover** — Playwright, Puppeteer, Cypress, Vitest (with one-line descriptions)
2. **Your Approach:**
   - First: check project for existing test setup (`package.json` deps, config files like `playwright.config.ts`, `cypress.config.ts`, `vitest.config.ts`, `jest.config.*`)
   - If tool already in use → read that tool's skill reference docs and answer directly
   - If no tool → recommend based on project context (framework, use case)
   - Decision matrix: Playwright for cross-browser E2E, Puppeteer for Chrome automation/scraping, Cypress for team-friendly E2E + component, Vitest for unit/component in Vite projects
3. **Skill directories:** `playwright/`, `puppeteer/`, `cypress/`, `vitest/`
4. **Output Format:** Direct answer → Code example → Gotchas → Reference pointer

**Step 2: Commit**

```bash
git add .claude/agents/frontend-testing-guide.md
git commit -m "feat(agent): add frontend-testing-guide umbrella agent"
```

---

### Task 10: Register Skills in skills.json

**Files:**
- Modify: `skills.json`

**Step 1: Add 4 skills to the `skills` object**

Add after the last existing skill entry (before the closing `}` of `skills`):

```json
"playwright": {
  "name": "Playwright",
  "description": "E2E testing, cross-browser automation, visual comparison, test generation",
  "files": ["skills/playwright/SKILL.md", "skills/playwright/reference.md"],
  "agents": ["agents/frontend-testing-guide.md"],
  "bundle": "core"
},
"puppeteer": {
  "name": "Puppeteer",
  "description": "Browser automation, Chrome DevTools Protocol, headless Chrome, PDF generation",
  "files": ["skills/puppeteer/SKILL.md", "skills/puppeteer/reference.md"],
  "agents": ["agents/frontend-testing-guide.md"],
  "bundle": "core"
},
"cypress": {
  "name": "Cypress",
  "description": "E2E and component testing with real-time runner and time-travel debugging",
  "files": ["skills/cypress/SKILL.md", "skills/cypress/reference.md"],
  "agents": ["agents/frontend-testing-guide.md"],
  "bundle": "core"
},
"vitest": {
  "name": "Vitest",
  "description": "Vite-native unit and component testing with Jest-compatible API",
  "files": ["skills/vitest/SKILL.md", "skills/vitest/reference.md"],
  "agents": ["agents/frontend-testing-guide.md"],
  "bundle": "core"
}
```

**Step 2: Add 4 skill names to the `bundles.core.skills` array**

Add `"playwright"`, `"puppeteer"`, `"cypress"`, `"vitest"` to the core skills array.

**Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills.json','utf8')); console.log('valid')"`
Expected: `valid`

**Step 4: Commit**

```bash
git add skills.json
git commit -m "feat(skills): register playwright, puppeteer, cypress, vitest in core bundle"
```

---

### Task 11: Update CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md`

**Step 1: Add Testing section**

Insert after the `### Meta` section (before `## Rules`):

```markdown
### Testing
- **playwright** — Playwright E2E testing reference
- **puppeteer** — Puppeteer browser automation reference
- **cypress** — Cypress testing reference
- **vitest** — Vitest unit testing reference
```

**Step 2: Update Model Selection table**

Add `frontend-testing-guide` to the Sonnet 4.6 row's use cases:

Change:
```
| **Sonnet 4.6** | `claude-sonnet-4-6` | Implementation, content creation, API work, domain experts (ascii-art-creator, duda-migration-agent, remotion-creator) |
```

To:
```
| **Sonnet 4.6** | `claude-sonnet-4-6` | Implementation, content creation, API work, domain experts (ascii-art-creator, duda-migration-agent, remotion-creator, frontend-testing-guide) |
```

Remove `google-api-guide` from the Inherit row since the user doesn't want inherit models. Actually — only change `frontend-testing-guide` since it's the new one. Leave existing entries as-is to minimize blast radius.

**Step 3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs(claude): add testing skills section and frontend-testing-guide model"
```

---

### Task 12: Validate Everything

**Step 1: Verify all files exist**

Run: `ls -la .claude/skills/playwright/ .claude/skills/puppeteer/ .claude/skills/cypress/ .claude/skills/vitest/ .claude/agents/frontend-testing-guide.md`

Expected: SKILL.md and reference.md in each skill dir, agent file exists.

**Step 2: Validate skills.json**

Run: `node -e "const s = JSON.parse(require('fs').readFileSync('skills.json','utf8')); console.log('skills:', Object.keys(s.skills).length); console.log('core:', s.bundles.core.skills.length); ['playwright','puppeteer','cypress','vitest'].forEach(k => { if (!s.skills[k]) throw new Error(k + ' missing'); if (!s.bundles.core.skills.includes(k)) throw new Error(k + ' not in core'); }); console.log('all 4 registered')"`

Expected: `all 4 registered`

**Step 3: Verify CLAUDE.md has Testing section**

Run: `grep -c "### Testing" .claude/CLAUDE.md`
Expected: `1`

**Step 4: Commit (if any fixes needed)**

Only commit if validation uncovered issues that required fixes.
