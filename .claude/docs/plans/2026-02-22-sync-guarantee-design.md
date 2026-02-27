# Sync Guarantee System — Design

**Date:** 2026-02-22
**Status:** Approved

## Problem

Armadillo has 5+ generated artifacts (README, CLAUDE.md, package.json, armadillo.json, CHANGELOG.json) that must stay in sync. Currently, version-bump.js orchestrates sync at pre-push time but:

- Skill descriptions are hardcoded in 3 separate files (can drift)
- No bidirectional validation between armadillo.json and packs/ directory
- sync-all.js only validates structure, doesn't generate content
- publish.yml publishes to npm (armadillo is git-distributed, not npm)
- "plugin" terminology persists in scripts and README markers
- npm published version (0.22.0) is stale and unmaintained

## Decision

**Git-only distribution.** No npm registry. GitHub Releases for versioning.

**Single source of truth:** armadillo.json + packs/ directory + skill frontmatter.

**One script generates everything:** `scripts/sync-all.js` validates AND generates all derived files.

## Architecture

```
armadillo.json (source of truth — version, pack registry, core skills)
    │
    ├─ packs/ directory (source of truth — skill files exist here)
    │   └─ each skill's SKILL.md frontmatter → description field
    │
    ├─ .claude/skills/ (source of truth — core skill files)
    │   └─ each skill's SKILL.md frontmatter → description field
    │
    └─► scripts/sync-all.js (generates + validates)
        │
        ├─► package.json (version sync)
        ├─► CHANGELOG.json (version validated, content untouched)
        ├─► README.md (regenerates marked sections)
        └─► .claude/CLAUDE.md (regenerates armadillo:start/end sections)
```

## What sync-all.js Does

1. **Read armadillo.json** as manifest
2. **Scan packs/ directory** — build actual pack→skills map from filesystem
3. **Scan .claude/skills/** — build core skills list from filesystem
4. **Read skill frontmatter** — extract `description:` from each SKILL.md
5. **Validate bidirectional** — armadillo.json ↔ packs/ and ↔ .claude/skills/ (no orphans)
6. **Validate versions** — package.json = armadillo.json = CHANGELOG.json latest key
7. **Generate README.md** — replace marked sections using manifest + frontmatter descriptions
8. **Generate CLAUDE.md** — replace armadillo sections using manifest + frontmatter descriptions
9. **Report** — show what was validated, what was generated, what failed

### Modes

- **Default (no flags):** Generate + validate. Used by pre-push hook.
- **`--check`:** Validate only, compare generated output to current files. Exit 1 if stale. Used by CI.

## What Gets Killed

| File | Action |
|------|--------|
| `scripts/update-readme.js` | Absorbed into sync-all.js |
| `scripts/build-claude-md.js` | `generateClaudeMd()` extracted as importable lib, rest absorbed |
| `.github/workflows/publish.yml` | Replaced with `release.yml` (GitHub Releases only) |
| `tests/github-files.test.js` | Updated to test release.yml instead of npm publish |
| Hardcoded `SKILL_DESCRIPTIONS` (3 files) | Read from frontmatter at sync time |
| "plugin" terminology in scripts/README | Renamed to "pack" |
| npm scope `@filenamedotexe/armadillo` | Removed — just `armadillo` |
| `NPM_TOKEN` secret reference | Removed from CI |

## What Stays

| File | Why |
|------|-----|
| `package.json` | Still needed for `node --test`, `type: "module"`, git hooks install |
| `scripts/install-hooks.js` | Installs git hooks — git, not npm |
| `scripts/version-bump.js` | Orchestrates version bump, calls sync-all.js |
| `postinstall` script in package.json | Installs git hooks on `npm install` (dev convenience) |

## CI: release.yml

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  validate:
    steps:
      - Checkout
      - node scripts/sync-all.js --check
      - Run tests

  release:
    needs: validate
    steps:
      - Read version from package.json
      - Create GitHub Release with tag vX.Y.Z
      - Generate release notes from CHANGELOG.json
```

## Pre-push Hook Flow

```
git push
  └─► .git/hooks/pre-push
      └─► node scripts/version-bump.js
          ├─ Detect change type from commits
          ├─ Bump version in package.json + armadillo.json
          ├─ Update CHANGELOG.json
          └─ node scripts/sync-all.js
              ├─ Read all frontmatter descriptions
              ├─ Generate README.md marked sections
              ├─ Generate .claude/CLAUDE.md armadillo sections
              ├─ Validate everything matches
              └─ git add + commit "chore: release X.Y.Z"
```

## Frontmatter as Description Source

Kill the 3 hardcoded `SKILL_DESCRIPTIONS` maps. Instead:

```js
import { parseFrontmatter } from './lib/parse-frontmatter.js';

// Read description from skill's SKILL.md
const fm = parseFrontmatter(skillMdContent);
const description = fm.description; // "Collaborative design sessions before implementation"
```

Already have `scripts/lib/parse-frontmatter.js`. Use it.

## Dogfooding

This repo uses the same sync system that armadillo installs in user projects. The pre-push hook and sync-all.js are the reference implementation. What runs here is what dillas get.
