# Armadillo NPM Package — Design Document

**Date:** 2026-02-16
**Status:** Approved

## Overview

Armadillo is an npm CLI tool that scaffolds a complete Claude Code skill toolkit into any project. It packages 27 skills, 6 agents, a knowledge base system, hooks, and a generated CLAUDE.md into an interactive installer that handles onboarding, updates, and skill management.

Published via GitHub Packages (private by default, can go public). Target audience: developers and agencies who want a batteries-included Claude Code setup.

## Package Structure

```
armadillo/
├── package.json              # @yourorg/armadillo, bin entry
├── bin/
│   └── cli.js                # Entry point — commander parses commands
├── src/
│   ├── commands/
│   │   ├── init.js           # Interactive onboarding
│   │   ├── update.js         # Smart merge + conflict walkthrough
│   │   ├── list.js           # Show available/installed skills
│   │   ├── add.js            # Add individual skills post-init
│   │   ├── remove.js         # Remove skills
│   │   └── doctor.js         # Verify installation integrity
│   ├── registry.js           # Reads skills.json, resolves bundles
│   ├── installer.js          # File copy/merge logic
│   ├── manifest.js           # Tracks installed files (ours vs theirs)
│   └── prompts.js            # Interactive CLI prompts (@clack/prompts)
├── templates/                # Everything that gets copied into target repos
│   ├── skills/               # All 27 skill directories
│   ├── agents/               # All 6 agent configs
│   ├── knowledge/            # KB templates + config.json
│   ├── hooks/                # Hook scripts
│   ├── lib/                  # skills-core.js
│   ├── tests/                # Skill test suites
│   ├── settings.json         # Base settings
│   └── CLAUDE.md             # Generated with smart defaults
└── skills.json               # Registry — metadata for every skill
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx armadillo init` | Full interactive onboarding — pick bundles, set up KB, generate CLAUDE.md |
| `npx armadillo update` | Pull latest skills, smart merge, walk through conflicts |
| `npx armadillo list` | Show all available skills/bundles, mark what's installed |
| `npx armadillo add <skill\|bundle>` | Install a specific skill or bundle after init |
| `npx armadillo remove <skill\|bundle>` | Remove a skill (smart agent cleanup) |
| `npx armadillo doctor` | Verify installation integrity, check for missing files |

## Bundle System

Skills are grouped into bundles. Core is always installed. Others are optional.

### Bundle Definitions

**core** (default: true) — 15 skills:
brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, verification-before-completion, receiving-code-review, requesting-code-review, subagent-driven-development, dispatching-parallel-agents, finishing-a-development-branch, using-git-worktrees, using-superpowers, writing-skills, writing-reference-skills

**google-apis** — 7 skills:
ga4-api, google-ads-api, google-search-console-api, google-business-profile-api, google-places-api, lighthouse-api, youtube-data-api

**payments** — 1 skill:
stripe-api

**video** — 1 skill:
remotion

**brand** — 2 skills:
brand-knowledge-builder, deepgram-transcription

**web-migration** — 1 skill:
duda-to-astro-migration

### Registry Format (skills.json)

```json
{
  "bundles": {
    "core": {
      "name": "Core Workflows",
      "description": "Essential development skills — TDD, debugging, planning, code review",
      "default": true,
      "skills": ["brainstorming", "writing-plans", "..."]
    },
    "google-apis": {
      "name": "Google APIs",
      "description": "GA4, Ads, Search Console, Business Profile, Lighthouse, YouTube, Places",
      "default": false,
      "skills": ["ga4-api", "google-ads-api", "..."]
    }
  },
  "skills": {
    "brainstorming": {
      "name": "Brainstorming",
      "description": "Collaborative design sessions before implementation",
      "files": ["skills/brainstorming/SKILL.md"],
      "agents": [],
      "bundle": "core"
    },
    "ga4-api": {
      "name": "GA4 API",
      "description": "Google Analytics 4 reporting, Measurement Protocol, event tracking",
      "files": ["skills/ga4-api/SKILL.md", "skills/ga4-api/reference.md"],
      "agents": ["agents/google-api-guide.md"],
      "bundle": "google-apis"
    }
  }
}
```

Shared agents (e.g. google-api-guide used by all 7 Google API skills) are tracked — installed when any skill needs them, removed only when the last skill using them is removed.

## Init Flow

1. **Pre-flight**: Check for existing `.claude/` directory. If found, suggest `update` instead.
2. **Bundle selection**: Multi-select checkboxes. Core auto-included, others optional.
3. **Knowledge base**: Offer guided setup — agency templates, client templates, or both. Can skip.
4. **CLAUDE.md**: Generate with smart defaults or minimal skeleton. Can skip.
5. **Install**: Copy files, configure hooks, write manifest.
6. **Summary**: Show what was installed with counts and next steps.

Uses `@clack/prompts` for modern, readable CLI aesthetics — grouped steps, spinners, clean spacing, subtle color.

## Update Strategy

### File Ownership Model

Every file tracked in the manifest has an owner:
- **armadillo-owned**: Skills, agents, hooks, lib. Armadillo can update these.
- **user-owned**: Knowledge base content, custom additions. Never touched without asking.

### Update Logic

1. **Armadillo-owned, unmodified**: Auto-update silently. Manifest stores SHA-256 hash at install time. If file still matches hash, safe to overwrite.
2. **Armadillo-owned, user-modified**: Conflict walkthrough. Show what changed on both sides with contextual blurbs explaining what each change does and why. User picks: merge both, keep theirs, take ours, or view full diff.
3. **User-owned files**: Skip with a note. Never touched.
4. **CLAUDE.md**: Armadillo sections wrapped in `<!-- armadillo:start -->` / `<!-- armadillo:end -->` markers. Update replaces content between markers, preserves user additions.
5. **New skills/bundles**: Offered interactively. User can accept or skip.

### Manifest Format (.claude/.armadillo-manifest.json)

```json
{
  "version": "1.0.0",
  "installedAt": "2026-02-16T...",
  "updatedAt": "2026-02-16T...",
  "bundles": ["core", "google-apis"],
  "files": {
    "skills/brainstorming/SKILL.md": {
      "hash": "a1b2c3...",
      "owner": "armadillo"
    },
    "knowledge/client/brand-identity.md": {
      "hash": "d4e5f6...",
      "owner": "user"
    }
  }
}
```

## List Command

Shows installed bundles and available bundles with skill counts and descriptions. `--all` flag expands to show individual skills within each bundle.

## Add/Remove Commands

- `armadillo add <bundle|skill>` — installs with description of what's being added
- `armadillo remove <skill>` — warns about shared agent dependencies, only cleans up agents when last dependent skill is removed

## Doctor Command

Validates installation against manifest:
- Checks all expected files exist
- Verifies hooks configuration
- Checks CLAUDE.md armadillo sections intact
- Reports empty knowledge base templates with helpful nudge

## Tech Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| CLI framework | `@clack/prompts` | Modern, polished interactive prompts |
| Argument parsing | `commander` | Lightweight, battle-tested |
| File hashing | Node `crypto` (built-in) | SHA-256 for manifest. Zero deps. |
| Diffing | `diff` (npm) | Conflict visualization in update |
| Colors/styling | `picocolors` | Tiny, fast. Used by Vite/Astro. |
| Node version | `>=18` | Broad coverage, no exotic APIs |

No build step. Plain Node.js, no TypeScript compilation, no bundler. Skills are static markdown files, CLI is vanilla JS.

## Publishing

- **Registry**: GitHub Packages (`https://npm.pkg.github.com`)
- **Scope**: `@yourorg/armadillo`
- **Access control**: Private via GitHub repo visibility. Make repo public to go public.
- **Auth**: Users run `npm login --registry=https://npm.pkg.github.com` once with GitHub PAT.
- **CI/CD**: GitHub Action auto-publishes on version tag (`v1.0.0` push → publish).

### Version Bumping Workflow

1. Update skills/agents/templates in the repo
2. Bump version in `package.json`
3. Tag and push — CI publishes automatically
4. Users get updates via `npx @yourorg/armadillo update`

## Future Evolution (Not in v1)

- **Plugin registry (Approach 3)**: Third-party skill authoring and distribution. The internal `skills.json` registry is a stepping stone toward this.
- **`armadillo create-skill`**: Scaffold a new skill with SKILL.md template and test harness.
- **`armadillo sync`**: Watch mode that auto-updates when new versions publish.
