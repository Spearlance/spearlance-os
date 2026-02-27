# Front-End Testing Reference Skills — Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Create 4 reference documentation skills for front-end testing tools, plus an umbrella routing agent. Follows the established reference skill pattern (mirror of Google APIs bundle).

## Deliverables

### 4 Reference Skills (core bundle)

| Skill | Focus | SKILL.md | reference.md |
|-------|-------|----------|--------------|
| `playwright` | E2E testing, cross-browser automation | ~80 lines | ~600 lines |
| `puppeteer` | Browser automation, Chrome DevTools Protocol | ~80 lines | ~600 lines |
| `cypress` | E2E + component testing | ~80 lines | ~600 lines |
| `vitest` | Unit/component testing (modern, Vite-native) | ~80 lines | ~600 lines |

### 1 Umbrella Agent

- **Name:** `frontend-testing-guide`
- **Model:** `claude-sonnet-4-6`
- **Role:** Routes generic testing requests ("write tests", "add E2E tests", "which testing tool?") to the right skill
- **Behavior:**
  1. Checks project for existing test setup (package.json, config files)
  2. If tool already in use → routes to that tool's skill
  3. If no tool → recommends based on project context
  4. Has access to all 4 skill reference docs

## File Structure

```
.claude/skills/
├── playwright/
│   ├── SKILL.md
│   └── reference.md
├── puppeteer/
│   ├── SKILL.md
│   └── reference.md
├── cypress/
│   ├── SKILL.md
│   └── reference.md
├── vitest/
│   ├── SKILL.md
│   └── reference.md

.claude/agents/
├── frontend-testing-guide.md
```

## SKILL.md Pattern (each skill)

Following established reference skill pattern:
- Quick Reference table: current version, install command, config file, key CLI commands
- Authentication/Setup: minimal setup code
- Common Operations: 3-5 most frequent patterns with concise code examples
- Common Mistakes table: gotchas specific to that tool
- Footer: points to reference.md

## reference.md Coverage (each skill, scaled to tool)

- Configuration and project setup
- Selectors/locators
- Assertions and matchers
- Navigation and interactions (clicks, typing, file uploads, drag-drop)
- Waiting strategies (auto-wait vs explicit waits, timeouts)
- Network interception (mocking APIs, intercepting requests)
- Visual testing / screenshots
- Parallel execution (sharding, workers)
- CI/CD integration (GitHub Actions configs)
- Debugging (trace viewers, headed mode, step-through)
- Error codes/messages with fixes

## skills.json Changes

- Add all 4 skills to the **core** bundle
- Add `frontend-testing-guide` agent
- Trigger descriptions:
  - **playwright:** "Use when working with Playwright for E2E testing, browser automation, cross-browser testing, or test generation..."
  - **puppeteer:** "Use when working with Puppeteer for browser automation, Chrome DevTools Protocol, web scraping, PDF generation..."
  - **cypress:** "Use when working with Cypress for E2E testing, component testing, or visual testing..."
  - **vitest:** "Use when working with Vitest for unit testing, component testing, or mocking in Vite-based projects..."
  - **frontend-testing-guide:** "Use when the user asks about testing without specifying a tool, or needs help choosing a testing framework..."

## CLAUDE.md Changes

Add under skill list:
```
### Testing
- **playwright** — Playwright E2E testing reference
- **puppeteer** — Puppeteer browser automation reference
- **cypress** — Cypress testing reference
- **vitest** — Vitest unit testing reference
```

## Model Selection

| Component | Model | Rationale |
|-----------|-------|-----------|
| All 4 reference skills | N/A (skills are docs, not agents) | Skills are reference docs loaded into context |
| `frontend-testing-guide` agent | `claude-sonnet-4-6` | Implementation/domain expert tier |

## Research Required

Each skill requires web research (per writing-reference-skills pattern):
- Current version and release date
- API changes in last 6-12 months
- Deprecations and migration deadlines
- Pricing/licensing changes
- New features and breaking changes
