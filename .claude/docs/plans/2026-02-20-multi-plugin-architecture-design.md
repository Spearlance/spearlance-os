# Multi-Plugin Architecture Design

**Date:** 2026-02-20
**Status:** Approved
**Impact:** High — transforms armadillo from single plugin to modular ecosystem

## Problem

Current armadillo is a single monolithic plugin with 82 skills across 23 bundles. Users install everything or nothing. No granular control over which skills are available.

File-copy approach allowed bundle selection, but:
- Manual updates required
- Potential conflicts on upgrade
- Files clutter `.claude/skills/`
- No automatic version management

Pure plugin approach (current v0.18.0) loses bundle selection — all 82 skills install at once.

**Goal:** Multi-plugin architecture that gives users bundle selection via native Claude Code plugin management.

## Solution

Split armadillo into 23 plugins: 1 required core + 22 optional skill packs.

### Architecture

**Core + Skill Packs model:**

```
armadillo-core (REQUIRED)
├── .claude-plugin/
│   ├── plugin.json (name: "armadillo-core", version: "0.19.0")
│   └── marketplace.json
├── skills/ (22 workflow skills)
│   ├── brainstorming/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── onboarding/
│   ├── updating-armadillo/
│   ├── playwright/
│   ├── puppeteer/
│   ├── cypress/
│   ├── vitest/
│   └── ... (13 more)
├── agents/ (ALL 14 agents)
│   ├── claude-code-guide.md
│   ├── google-api-guide.md
│   ├── frontend-dev-guide.md
│   ├── backend-guide.md
│   ├── database-guide.md
│   ├── infra-guide.md
│   ├── frontend-testing-guide.md
│   ├── brand-strategist.md
│   ├── code-reviewer.md
│   ├── ascii-art-creator.md
│   ├── duda-migration-agent.md
│   ├── remotion-creator.md
│   ├── fullstack-architect.md
│   └── project-scaffolder.md
├── hooks/
│   ├── hooks.json (9 lifecycle hooks)
│   ├── session-start.sh
│   ├── inject-skill-awareness.sh
│   ├── enforce-skills.sh
│   ├── subagent-start.sh
│   ├── pre-compact.sh
│   ├── stop-verify.sh
│   ├── async-lint.sh
│   ├── post-push-pr-check.sh
│   ├── task-completed.sh
│   └── lib/json-escape.sh
└── rules/
    ├── coding-standards.md
    ├── git-workflow.md
    ├── output-style.md
    ├── pr-format.md
    └── project-context.md

armadillo-frontend (optional)
├── .claude-plugin/
│   ├── plugin.json (name: "armadillo-frontend", version: "0.19.0")
│   └── marketplace.json
└── skills/ (10 skills)
    ├── tailwind-css/
    ├── shadcn-ui/
    ├── nextjs/
    ├── astro/
    ├── react-vite/
    ├── sveltekit/
    ├── framer-motion/
    ├── gsap/
    ├── responsive-design/
    └── accessibility/

armadillo-google-apis (optional)
├── .claude-plugin/
│   ├── plugin.json (name: "armadillo-google-apis", version: "0.19.0")
│   └── marketplace.json
└── skills/ (7 skills)
    ├── ga4-api/
    ├── google-ads-api/
    ├── google-business-profile-api/
    ├── google-places-api/
    ├── google-search-console-api/
    ├── lighthouse-api/
    └── youtube-data-api/

... 20 more optional plugins
```

### Complete Plugin List (23 Total)

| # | Plugin | Skills | Description |
|---|--------|--------|-------------|
| 1 | `armadillo-core` | 22 | REQUIRED — workflow skills, all agents, hooks, rules |
| 2 | `armadillo-frontend` | 10 | Tailwind, Next.js, React, Astro, animations, a11y |
| 3 | `armadillo-backend` | 4 | Hono, Express, tRPC, REST patterns |
| 4 | `armadillo-database` | 4 | Neon, Supabase, MongoDB, Redis |
| 5 | `armadillo-orm` | 2 | Drizzle, Prisma |
| 6 | `armadillo-google-apis` | 7 | GA4, Ads, Search Console, Places, YouTube, Lighthouse, Business Profile |
| 7 | `armadillo-auth` | 3 | Auth.js, Clerk, Supabase Auth |
| 8 | `armadillo-deploy` | 4 | Vercel, Cloudflare, Docker, GitHub Actions |
| 9 | `armadillo-forms` | 2 | Zod, React Hook Form |
| 10 | `armadillo-state` | 2 | Zustand, TanStack Query |
| 11 | `armadillo-monitoring` | 2 | Sentry, PostHog |
| 12 | `armadillo-cms` | 2 | Sanity, Payload |
| 13 | `armadillo-email` | 2 | Resend, React Email |
| 14 | `armadillo-storage` | 2 | Uploadthing, S3/R2 |
| 15 | `armadillo-ai` | 2 | Vercel AI SDK, Anthropic API |
| 16 | `armadillo-tooling` | 2 | ESLint/Prettier, Turborepo |
| 17 | `armadillo-fresh-project` | 3 | fresh-project, scaffold, stack-recommender |
| 18 | `armadillo-mobile` | 1 | Expo/React Native |
| 19 | `armadillo-payments` | 1 | Stripe |
| 20 | `armadillo-video` | 1 | Remotion |
| 21 | `armadillo-brand` | 2 | brand-knowledge-builder, Deepgram |
| 22 | `armadillo-web-migration` | 1 | Duda-to-Astro |
| 23 | `armadillo-creative` | 1 | ASCII art |

### Dependency Model

```
armadillo-core (foundation)
    ↑
    ├── armadillo-frontend
    ├── armadillo-google-apis
    ├── armadillo-backend
    ├── armadillo-database
    └── ... (all 22 optional packs)
```

**Rules:**
- Core is ALWAYS installed (required dependency for all skill packs)
- Core owns: hooks, rules, agents, workflow skills
- Skill packs own: only skills (SKILL.md + reference.md files)
- Skills reference core agents — works because plugins share armadillo namespace

### Repository Structure

**Monorepo for development:**

```
armadillo-cli/
├── plugins/
│   ├── core/
│   │   ├── .claude-plugin/
│   │   │   ├── plugin.json
│   │   │   └── marketplace.json
│   │   ├── skills/
│   │   ├── agents/
│   │   ├── hooks/
│   │   └── rules/
│   ├── frontend/
│   │   ├── .claude-plugin/
│   │   │   ├── plugin.json
│   │   │   └── marketplace.json
│   │   └── skills/
│   ├── google-apis/
│   │   ├── .claude-plugin/
│   │   └── skills/
│   ├── backend/
│   ├── database/
│   ├── orm/
│   ├── auth/
│   ├── deploy/
│   ├── forms/
│   ├── state/
│   ├── monitoring/
│   ├── cms/
│   ├── email/
│   ├── storage/
│   ├── ai/
│   ├── tooling/
│   ├── fresh-project/
│   ├── mobile/
│   ├── payments/
│   ├── video/
│   ├── brand/
│   ├── web-migration/
│   └── creative/
├── scripts/
│   ├── build-plugins.js          NEW — reorganizes current structure into plugins/
│   ├── sync-all.js               UPDATE — validates all 23 plugin manifests
│   ├── version-bump.js           UPDATE — bumps all plugins to same version
│   ├── publish-plugins.js        NEW — git subtree push each plugin to separate repo
│   └── update-readme.js          UPDATE — generates multi-plugin README
├── package.json
├── CHANGELOG.json                UPDATE — per-plugin changelog sections
└── README.md                     UPDATE — explains multi-plugin install
```

**Published repos (23 total):**

```bash
# Development (monorepo, private)
github.com/filenamedotexe/armadillo-cli

# Published plugin repos (public, for installation)
github.com/filenamedotexe/armadillo-core
github.com/filenamedotexe/armadillo-frontend
github.com/filenamedotexe/armadillo-google-apis
github.com/filenamedotexe/armadillo-backend
... (19 more)
```

Each `plugins/*/` directory publishes to its own GitHub repo via `git subtree push`.

### Publishing Strategy

**Git subtree** — one monorepo, 23 published repos:

```bash
# From armadillo-cli monorepo, push each plugin to separate repo
git subtree push --prefix=plugins/core git@github.com:filenamedotexe/armadillo-core.git main
git subtree push --prefix=plugins/frontend git@github.com:filenamedotexe/armadillo-frontend.git main
git subtree push --prefix=plugins/google-apis git@github.com:filenamedotexe/armadillo-google-apis.git main
... (20 more)
```

Automated via `scripts/publish-plugins.js` — runs on release.

**Why subtree over separate repos:**
- Single source of truth (monorepo)
- Unified versioning (all plugins bump together)
- Easy cross-plugin refactoring
- Simpler CI/CD (one workflow)

**Why publish to separate repos:**
- Claude Code plugin system requires GitHub repos for installation
- Users install only what they need: `github.com/filenamedotexe/armadillo-frontend`
- Each plugin gets its own GitHub releases

### User Flows

#### 1. Fresh Install (New Users)

```
User: "Install armadillo from https://github.com/filenamedotexe/armadillo-core"

onboarding skill runs (from core):

1. Core automatically installed (required)

2. Ask: "Which skill packs do you want?"

   Presented as checkboxes with descriptions:

   □ Frontend Development (10 skills)
     Tailwind, Next.js, React, Astro, animations, responsive design, a11y

   □ Backend APIs (4 skills)
     Hono, Express, tRPC, REST API patterns

   □ Google APIs (7 skills)
     GA4, Ads, Search Console, Places, YouTube, Lighthouse, Business Profile

   □ Database (4 skills)
     Neon, Supabase, MongoDB, Redis

   ... (show all 22 optional packs)

3. User selects (e.g., Frontend, Google APIs, Database)

4. onboarding writes to .claude/settings.json:
   {
     "extraKnownMarketplaces": {
       "armadillo-marketplace": {
         "source": { "source": "github", "repo": "filenamedotexe/armadillo" }
       }
     },
     "enabledPlugins": {
       "armadillo-core@armadillo-marketplace": true,
       "armadillo-frontend@armadillo-marketplace": true,
       "armadillo-google-apis@armadillo-marketplace": true,
       "armadillo-database@armadillo-marketplace": true
     }
   }

5. Create .claude/context/, .armadillo-manifest.json

6. Manifest tracks:
   {
     "version": "0.19.0",
     "installType": "plugin",
     "installedPlugins": ["core", "frontend", "google-apis", "database"],
     "files": {} // Only user-owned files tracked
   }

7. Project analysis (codebase scan for custom skill recommendations)

8. Report: "Installed armadillo-core + 3 skill packs. Restart Claude Code."
```

#### 2. Migration (Existing File-Copy Users)

```
User runs: "Update armadillo"

updating-armadillo skill detects installType: "legacy-file-copy"

Step 2.6 (mandatory migration):

1. Read manifest.bundles: ["core", "google-apis", "frontend-dev"]

2. Announce migration (brand voice):
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🛡 Armadillo Plugin Migration
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   where my real dillas at?!

   armadillo has moved to a plugin-based system.
   Your current install (v0.18.0) uses the old file-copy approach.

   What this means:
   ▪ Skills now load from plugins automatically
   ▪ Updates happen through the plugin system
   ▪ Your .claude/ directory gets cleaner
   ▪ Custom skills, agent-memory, docs never touched

   What we're about to do:
   1. Back up your current skills/, agents/, hooks/
   2. Register armadillo plugins in settings.json
   3. Create runtime directories
   4. Update manifest

   Your backups: .claude/*-backup-YYYYMMDD/

   ▸ Ready to migrate?

3. After user confirms:

   a. Backup (only if real directories, not symlinks):
      mv .claude/skills .claude/skills-backup-20260220
      mv .claude/agents .claude/agents-backup-20260220
      mv .claude/hooks .claude/hooks-backup-20260220

   b. Map bundles → plugins:
      manifest.bundles          enabledPlugins
      ─────────────────         ──────────────
      "core"                →   armadillo-core
      "google-apis"         →   armadillo-google-apis
      "frontend-dev"        →   armadillo-frontend

   c. Register plugins in settings.json:
      {
        "extraKnownMarketplaces": {
          "armadillo-marketplace": {
            "source": { "source": "github", "repo": "filenamedotexe/armadillo" }
          }
        },
        "enabledPlugins": {
          "armadillo-core@armadillo-marketplace": true,
          "armadillo-google-apis@armadillo-marketplace": true,
          "armadillo-frontend@armadillo-marketplace": true
        }
      }

   d. Remove hooks from settings.json if present
      (plugin hooks.json from core takes over)

   e. Create .claude/context/ if missing

   f. Update .gitignore:
      .claude/context/*
      !.claude/context/.gitkeep

   g. Update manifest:
      {
        "version": "0.19.0",
        "installType": "plugin",
        "installedPlugins": ["core", "google-apis", "frontend"],
        "files": {
          // Only user-owned files remain
          "skills/my-custom-skill/SKILL.md": {
            "owner": "user",
            "hash": "..."
          }
        }
      }

4. Report:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✓ Plugin migration complete

   ▪ Plugins registered: core, google-apis, frontend
   ▪ Backups at .claude/*-backup-20260220/
   ▪ Runtime directories created
   ▪ Manifest updated (installType: plugin)

   ⚠ Restart Claude Code for plugins to load.
   Skills and hooks activate on next session.

   ● ahh, that felt good didn't it?
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. Skip to Step 6 (health check)
```

**Bundle → Plugin Mapping Table:**

| Old Bundle (skills.json) | New Plugin |
|--------------------------|------------|
| `core` | `armadillo-core` |
| `google-apis` | `armadillo-google-apis` |
| `frontend-dev` | `armadillo-frontend` |
| `backend` | `armadillo-backend` |
| `database` | `armadillo-database` |
| `orm` | `armadillo-orm` |
| `auth` | `armadillo-auth` |
| `deploy` | `armadillo-deploy` |
| `forms` | `armadillo-forms` |
| `state` | `armadillo-state` |
| `monitoring` | `armadillo-monitoring` |
| `cms` | `armadillo-cms` |
| `email` | `armadillo-email` |
| `storage` | `armadillo-storage` |
| `ai` | `armadillo-ai` |
| `tooling` | `armadillo-tooling` |
| `fresh-project` | `armadillo-fresh-project` |
| `mobile` | `armadillo-mobile` |
| `payments` | `armadillo-payments` |
| `video` | `armadillo-video` |
| `brand` | `armadillo-brand` |
| `web-migration` | `armadillo-web-migration` |
| `creative` | `armadillo-creative` |

#### 3. Updates (Multi-Plugin Users)

```
User: "Update armadillo"

updating-armadillo skill:

1. Check each installed plugin for updates:

   Installed plugins:
   - armadillo-core: 0.18.0 → 0.19.0 available ✓
   - armadillo-frontend: 0.18.0 → 0.19.0 available ✓
   - armadillo-google-apis: 0.18.0 → 0.19.0 available ✓
   - armadillo-database: 0.18.0 → 0.19.0 available ✓

2. Fetch CHANGELOG.json from each plugin repo

3. Aggregate "What's New":

   ## What's New (v0.18.0 → v0.19.0)

   ### Core
   - Added: verification-before-completion skill
   - Improved: systematic-debugging root cause tracing

   ### Frontend
   - Added: Tailwind v4 CSS-first configuration
   - Fixed: Next.js server action type inference

   ### Google APIs
   - Improved: GA4 dimension/metric reference updated

   ### Database
   - Added: Neon branching workflow

4. User-owned audit (Step 5.5) — runs ONCE across all plugins

5. Health check

6. Update manifest:
   {
     "version": "0.19.0",
     "installedPlugins": ["core", "frontend", "google-apis", "database"]
   }

7. Report:
   ✓ Updated 4 plugins to v0.19.0
   ● ahh, that felt good didn't it?
```

#### 4. Adding/Removing Plugins

**Add a plugin later:**

```
User: "Add the backend plugin"

onboarding skill (or manual):

1. Update settings.json enabledPlugins:
   {
     "armadillo-backend@armadillo-marketplace": true
   }

2. Update manifest:
   {
     "installedPlugins": ["core", "frontend", "google-apis", "database", "backend"]
   }

3. Restart session → 4 new skills available (Hono, Express, tRPC, REST patterns)
```

**Remove a plugin:**

```
User: "Remove the database plugin"

1. Remove from settings.json enabledPlugins

2. Update manifest:
   {
     "installedPlugins": ["core", "frontend", "google-apis", "backend"]
   }

3. Restart session → database skills no longer available
```

### Versioning Strategy

**Synchronized versioning** — all plugins share one version number.

```
Release 0.19.0:
- armadillo-core: 0.19.0
- armadillo-frontend: 0.19.0
- armadillo-google-apis: 0.19.0
... (all 23 plugins: 0.19.0)
```

**Why synchronized:**
- Simple mental model: "I'm on armadillo 0.19.0" not "core 0.19, frontend 0.18, google-apis 0.20"
- Unified changelog: one release = one version across ecosystem
- Easier support: "What version?" → "0.19.0" (not 23 different versions)

**How it works:**
- `npm run bump -- patch` → bumps ALL 23 plugin.json versions
- CHANGELOG.json has sections per plugin but one top-level version
- GitHub releases: create 23 releases (one per repo) with same tag `v0.19.0`

**Independent updates (future):**
- If a plugin needs a hotfix: bump only that plugin
- But default workflow: synchronized releases

### Breaking Changes & Migration

**File-copy users (pre-0.18.0):**
- Mandatory migration in updating-armadillo Step 2.6
- Bundle selection → plugin enablement (1:1 mapping)
- All file-copy users convert to plugin in one update cycle

**Plugin users (post-0.18.0, single plugin):**
- Current: armadillo (monolith, 82 skills)
- New: armadillo-core (22 skills) + enable remaining plugins
- Migration: detect single-plugin install, offer to enable skill packs
- Default: enable all (preserve current behavior), user can disable later

**Edge cases:**

| Scenario | Solution |
|----------|----------|
| User has custom skills in `.claude/skills/` | Never touched — manifest tracks as `owner: user`, coexist with plugins |
| User has agent-memory, docs, context | Sacred (Bucket D), manifest tracks as `owner: user` |
| Skill references core agent | Works — agent paths relative, all plugins share namespace |
| Cross-plugin skill dependency | Keep dependencies in same plugin (e.g., fresh-project + scaffold + stack-recommender) |
| User uninstalls core | Not possible — core is required dependency |
| User installs skill pack without core | Claude Code plugin system enforces dependencies (future) |
| Hooks fire multiple times | Won't happen — only core ships hooks |
| Rules loaded from multiple plugins | Won't happen — only core ships rules |

### Implementation Phases

#### Phase 1: Restructure (Monorepo Setup)

1. Create `plugins/` directory structure
2. Build script: reorganize current flat structure → 23 plugin directories
3. Generate 23 plugin.json + marketplace.json manifests
4. Update sync-all.js to validate all 23 plugins
5. Update version-bump.js to bump all plugin manifests
6. All 578 tests pass with new structure

#### Phase 2: Publishing Pipeline

1. Create 23 empty GitHub repos (armadillo-core, armadillo-frontend, etc.)
2. Build publish-plugins.js script (git subtree push automation)
3. CI/CD workflow: on tag push → publish all 23 plugins
4. Test: publish to test repos, verify plugin installation works

#### Phase 3: Skill Updates

1. Update onboarding skill: bundle selection → plugin enablement
2. Update updating-armadillo skill: Step 2.6 migration logic
3. Update README: multi-plugin install instructions
4. Update CHANGELOG format: per-plugin sections

#### Phase 4: Migration Testing

1. Test: file-copy user → plugin migration (bundle mapping)
2. Test: single-plugin user → multi-plugin (enable all)
3. Test: fresh install → bundle selection → verify enabledPlugins
4. Test: add/remove plugins post-install

#### Phase 5: Release

1. Bump all plugins to 0.19.0
2. Publish all 23 repos to GitHub
3. Create GitHub releases for all 23 plugins
4. Update armadillo-cli README to point to multi-plugin install
5. Announce migration to existing users

### Testing Strategy

**Existing tests (578) must pass:**
- All current tests run against core plugin
- No functionality regression

**New tests:**

| Test | What it validates |
|------|-------------------|
| Plugin manifest schema | All 23 plugin.json files valid |
| Cross-plugin agent references | Skills can reference core agents |
| Subtree publish | Each plugin repo contains correct files |
| Onboarding bundle selection | User picks bundles → correct enabledPlugins |
| Migration bundle mapping | file-copy bundles → correct plugins enabled |
| Add/remove plugin | enabledPlugins updates correctly |
| Synchronized versioning | All 23 plugins have matching version |
| Hook isolation | Hooks only fire from core, not duplicated |

**Integration tests:**

```bash
# Fresh install flow
1. Start with empty .claude/
2. Run onboarding skill
3. Select 3 bundles
4. Verify settings.json has 4 plugins enabled (core + 3)
5. Verify skills load from all 4 plugins
6. Verify hooks fire once from core

# Migration flow
1. Start with file-copy manifest (bundles: ["core", "google-apis"])
2. Run updating-armadillo
3. Verify backups created
4. Verify settings.json has 2 plugins enabled
5. Verify manifest updated to installType: "plugin"
6. Restart session
7. Verify skills load from plugins
```

### Success Metrics

**Technical:**
- All 578 existing tests pass
- All 23 plugin repos publish successfully
- Plugin installation works via Claude Code
- Bundle selection → enabledPlugins mapping 100% accurate
- File-copy → plugin migration 100% success rate

**User Experience:**
- Onboarding completes in <2 minutes
- Migration completes in <1 minute
- Users understand which plugins are installed
- Skill discovery works (users find the skills they installed)

**Business:**
- Users install only what they need (smaller footprint)
- Clear value prop per plugin (easier to market bundles)
- Scalable (add new plugins without touching core)
- Modular pricing potential (future: premium plugins)

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bundle mapping breaks for edge-case manifest | Exhaustive testing with all 23 bundle names, fallback to interactive selection |
| Git subtree publish fails | Manual publish script, CI retry logic, test repos before production |
| Users confused by 23 repos | Clear README in armadillo-core explaining ecosystem, onboarding guides installation |
| Dependency hell (core version mismatch) | Synchronized versioning (all plugins always same version) |
| Breaking change in migration | Extensive testing, dry-run mode, backups created automatically |
| Hooks fire multiple times | Only core ships hooks, validation test ensures no other plugin has hooks/ |

### Open Questions

None — design is complete and approved.

### Next Steps

1. Write implementation plan (via writing-plans skill)
2. Execute Phase 1: restructure monorepo
3. Execute Phase 2: publishing pipeline
4. Execute Phase 3: skill updates
5. Execute Phase 4: migration testing
6. Execute Phase 5: release v0.19.0

---

**Design approved:** 2026-02-20
**Ready for implementation planning**
