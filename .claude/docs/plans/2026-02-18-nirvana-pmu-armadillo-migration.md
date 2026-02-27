# Nirvana PMU → Armadillo Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the nirvana-pmu project's existing `.claude/` infrastructure to the armadillo standard — replacing overlapping homebrew with armadillo equivalents, converting custom domain skills to armadillo format, preserving all accumulated knowledge, and registering everything in a unified skills.json manifest.

**Architecture:** Additive installation. Armadillo is installed as a plugin alongside nirvana's existing `.claude/` structure. Overlapping commands/agents are retired and replaced with armadillo skills. Custom domain commands are converted to armadillo skill format. All 15 agent memories, brand KB, education docs, and domain-specific rules are preserved untouched. Hooks are split: armadillo lifecycle hooks in `hooks/hooks.json`, project-specific hooks stay in `settings.json`.

**Tech Stack:** Astro 5 + TypeScript + Tailwind + Vitest + Vercel SSR. Claude Code plugin system.

**Project Root:** `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu`

---

## Pre-Flight Inventory

### What Nirvana Has (916+ files)

| Category | Count | Location |
|----------|-------|----------|
| Agents | 27 | `.claude/agents/` |
| Agent memories | 15 dirs | `.claude/agent-memory/` |
| Skills (project) | 47 dirs | `.claude/skills/` |
| Commands (legacy) | 22 files | `.claude/commands/` |
| Rules | 23 files | `.claude/rules/` |
| Hook scripts | 26 files | `.claude/hooks/` |
| Brand KB (LLM guides) | 14 chapters | `.claude/docs/nirvana brand documentation/` |
| Brand voice | 1 file (560 lines) | `.claude/docs/brand-voice.md` |
| Microblading education | 10 modules | `.claude/docs/Sarah Microblading Education/` |
| Codebase docs | 16 files | `.claude/docs/codebase/` |
| Output styles | 1 file | `.claude/output-styles/nirvana-pmu.md` |
| Progress tracking | 4 dirs | `.claude/progress/` |
| Context (swarm) | 1 file | `.claude/context/SWARM-STATE.md` |
| Other docs | 9 files | `.claude/docs/` (acuity, meta, press, etc.) |

### What Armadillo Replaces (overlapping)

| Nirvana Item | Armadillo Equivalent | Action |
|---|---|---|
| `/brainstorm` command | `armadillo:brainstorming` | Retire command |
| `brainstorm` skill | `armadillo:brainstorming` | Retire skill |
| `/write-plan` command + `plan` skill | `armadillo:writing-plans` | Retire both |
| `/execute-plan` command + `implement` skill | `armadillo:executing-plans` | Retire both |
| `/review` command + `review` skill | `armadillo:requesting-code-review` | Retire both |
| `/test` command + `test` skill | `armadillo:test-driven-development` | Retire both |
| `/commit` command + `commit` skill | `armadillo:finishing-a-development-branch` | Retire both |
| `/write-pr` command + `write-pr` skill | `armadillo:finishing-a-development-branch` | Retire both |
| `/build-check` command + `deploy-ready` skill | `armadillo:verification-before-completion` | Retire both |
| `/handoff` command + `handoff` skill | armadillo session lifecycle hooks | Retire both |
| `/goal` command | `armadillo:using-armadillo` | Retire command |
| `/swarm` command | `armadillo:dispatching-parallel-agents` | Retire command |
| `/self-update` command + `self-update` skill | `armadillo:updating-armadillo` | Retire both |
| `/audit-claude` command + `audit-claude` skill | `armadillo:updating-armadillo` (doctor) | Retire both |
| `/sync` command + `sync`/`deep-sync` skill | Not needed with armadillo patterns | Retire both |
| `codebase-analyzer.md` agent | `armadillo:onboarding` | Retire agent |
| `claude-code-auditor.md` agent | `armadillo:updating-armadillo` | Retire agent |
| `rules/workflow.md` | Built into armadillo core skills | Merge PMU pipelines, retire generic |
| `rules/anti-rationalization.md` | `armadillo:systematic-debugging` + `verification-before-completion` | Merge unique bits, retire rest |

### What Stays Custom (convert to armadillo format)

**Content commands → skills:** add-blog-post, add-location, add-service, add-testimonial, add-illustrations, create-supercut, create-template, ingest-content, brand

**SEO commands → skills:** seo-flow, seo-pulse, search-rank, link-analysis, site-report, drift-check, local-seo-audit (already a skill)

**Advertising commands → skills:** ads, meta-ads, meta-audiences, meta-conversions, pinterest-ads, ad-assets, render-video, render-static-ad, render-variants, upload-gdrive, verify-meta-auth

**DevOps commands → skills:** deploy-ready (→ nirvana-deploy), vercel, deps, cleanup, safe-merge, test-debug, codebase-init, audit-issues

**Domain agents (keep all 20, register in skills.json):** acuity-expert, ads-pipeline, analytics-expert, api-reviewer, astro-expert, cloudinary-expert, content-writer, debugger, email-expert, facebook-pixel-expert, google-docs-verifier, health-monitor, illustrator, meta-ads-expert, meta-docs-verifier, orchestrator, pinterest-expert, planner, posthog-expert, remotion-expert, reviewer, seo-specialist, style-expert, supercut-generator, verifier

### What's Preserved Untouched

- 15 agent memory directories
- 14-chapter brand KB + master guide
- 560-line brand voice guide
- 10-module microblading education curriculum
- 16 codebase documentation files
- Output style (`nirvana-pmu.md`)
- Progress tracking (designs, plans, handoffs, optimization-log)
- Swarm state (`SWARM-STATE.md`)
- Acuity analysis, meta integration docs, press release, media targets
- Community response templates, internal linking strategy

---

## Phase 1: Preparation & Safety

### Task 1: Create migration branch and backup manifest

**Files:**
- Create: `.claude/docs/MIGRATION-MANIFEST.md`

**Step 1: Create feature branch**

```bash
git checkout -b migrate/armadillo-integration
```

**Step 2: Create migration manifest documenting everything we're preserving**

Create `.claude/docs/MIGRATION-MANIFEST.md`:

```markdown
# Armadillo Migration Manifest — Nirvana PMU

## Date: 2026-02-18

## Preserved Content (DO NOT MODIFY)

### Agent Memories (15 directories)
- .claude/agent-memory/ads-pipeline/MEMORY.md
- .claude/agent-memory/analytics-expert/MEMORY.md
- .claude/agent-memory/astro-expert/MEMORY.md
- .claude/agent-memory/cloudinary-expert/MEMORY.md
- .claude/agent-memory/content-writer/MEMORY.md
- .claude/agent-memory/debugger/MEMORY.md
- .claude/agent-memory/facebook-pixel-expert/MEMORY.md
- .claude/agent-memory/google-docs-verifier/MEMORY.md
- .claude/agent-memory/health-monitor/MEMORY.md
- .claude/agent-memory/meta-ads-expert/MEMORY.md
- .claude/agent-memory/planner/MEMORY.md
- .claude/agent-memory/posthog-expert/MEMORY.md
- .claude/agent-memory/remotion-expert/MEMORY.md
- .claude/agent-memory/reviewer/MEMORY.md
- .claude/agent-memory/seo-specialist/MEMORY.md

### Brand Knowledge Base
- .claude/docs/nirvana brand documentation/ (14 LLM-friendly chapters + master guide)
- .claude/docs/brand-voice.md (560-line brand voice guide)
- .claude/docs/community-response-templates.md
- .claude/docs/internal-linking-strategy.md
- .claude/docs/media-target-list.md
- .claude/docs/press-release-draft.md

### Microblading Education (10 modules)
- .claude/docs/Sarah Microblading Education/00-START-HERE/
- .claude/docs/Sarah Microblading Education/01-SUPPLIES-AND-TOOLS/
- .claude/docs/Sarah Microblading Education/02-UNDERSTANDING-THE-PROCESS/
- .claude/docs/Sarah Microblading Education/03-CORE-CONCEPTS/
- .claude/docs/Sarah Microblading Education/04-FUNDAMENTAL-SKILLS/
- .claude/docs/Sarah Microblading Education/05-EXECUTION-MASTERY/
- .claude/docs/Sarah Microblading Education/06-TREATMENT-ROOM/
- .claude/docs/Sarah Microblading Education/07-CLIENT-LIFECYCLE/
- .claude/docs/Sarah Microblading Education/08-REFERENCE/
- .claude/docs/Sarah Microblading Education/09-COURSE-MAP.md
- .claude/docs/Sarah Microblading Education/notes/

### Codebase Documentation (16 files)
- .claude/docs/codebase/ (all 16 files)

### Other Preserved Docs
- .claude/docs/AGENT-GUIDELINES.md
- .claude/docs/ARCHITECTURE-SHOWCASE.md
- .claude/docs/BRANCH-PROTECTION-SYSTEM.md
- .claude/docs/GOOGLE-SETUP.md
- .claude/docs/HOOKS-REFERENCE.md
- .claude/docs/TROUBLESHOOTING.md
- .claude/docs/acuity_analysis/ (all files)
- .claude/docs/meta-integration/ (all files)
- .claude/docs/reference/ (all files)

### Output Styles
- .claude/output-styles/nirvana-pmu.md

### Progress Tracking
- .claude/progress/ (all subdirectories)

### Context
- .claude/context/SWARM-STATE.md

## Retired Content (archived in .claude/archive/)

See Phase 2-3 tasks for full list of retired commands and skills.
```

**Step 3: Commit**

```bash
git add .claude/docs/MIGRATION-MANIFEST.md
git commit -m "docs: create armadillo migration manifest"
```

---

## Phase 2: Install Armadillo Foundation

### Task 2: Install armadillo plugin structure

**Files:**
- Create: `.claude/hooks/hooks.json` (armadillo lifecycle hooks)
- Create: `.claude/lib/skills-core.js`
- Modify: `.claude/settings.json` (add $schema if missing, keep all existing)

**Step 1: Create hooks.json for armadillo lifecycle hooks**

This lives alongside the existing hook scripts. Project hooks stay in settings.json; armadillo hooks go in hooks.json.

Create `.claude/hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh",
            "async": false
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "EnterPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Blocked: EnterPlanMode is disabled. Use the writing-plans skill instead: invoke Skill tool with skill=\"writing-plans\"' >&2; exit 2"
          }
        ]
      },
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce-skills.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/inject-skill-awareness.sh"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-compact.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop-verify.sh"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Install armadillo hook scripts**

Copy from armadillo-cli to nirvana project:
- `hooks/session-start.sh`
- `hooks/enforce-skills.sh`
- `hooks/inject-skill-awareness.sh`
- `hooks/pre-compact.sh` (rename existing nirvana `pre-compact.sh` to `nirvana-pre-compact.sh` first)
- `hooks/stop-verify.sh` (rename existing nirvana `stop-check.sh` stays as-is — different purpose)

**IMPORTANT:** Nirvana already has `pre-compact.sh` and `stop-check.sh`. The armadillo versions are different scripts with different purposes. Keep both:
- `.claude/hooks/pre-compact.sh` → rename to `nirvana-pre-compact.sh`
- `.claude/hooks/armadillo-pre-compact.sh` ← armadillo's version
- Update hooks.json to reference `armadillo-pre-compact.sh`
- Update settings.json to reference `nirvana-pre-compact.sh`

OR: Merge the functionality into one script that does both.

**Step 3: Install lib/skills-core.js**

Copy `lib/skills-core.js` from armadillo-cli to `.claude/lib/skills-core.js`.

**Step 4: Commit**

```bash
git add .claude/hooks/hooks.json .claude/lib/skills-core.js .claude/hooks/*.sh
git commit -m "feat: install armadillo plugin foundation"
```

---

### Task 3: Create skills.json manifest

**Files:**
- Create: `.claude/skills.json`

**Step 1: Create the unified skills.json**

This is the central registry. It registers both armadillo core skills AND all nirvana domain skills.

Create `.claude/skills.json`:

```json
{
  "bundles": {
    "core": {
      "name": "Core Workflows (Armadillo)",
      "description": "Essential development skills — TDD, debugging, planning, code review",
      "default": true,
      "skills": [
        "brainstorming",
        "dispatching-parallel-agents",
        "executing-plans",
        "finishing-a-development-branch",
        "receiving-code-review",
        "requesting-code-review",
        "subagent-driven-development",
        "systematic-debugging",
        "test-driven-development",
        "using-git-worktrees",
        "using-armadillo",
        "verification-before-completion",
        "writing-plans",
        "writing-reference-skills",
        "writing-skills",
        "onboarding",
        "updating-armadillo"
      ]
    },
    "nirvana-content": {
      "name": "Nirvana Content",
      "description": "Blog posts, locations, testimonials, illustrations, supercuts, brand voice",
      "default": true,
      "skills": [
        "add-blog-post",
        "add-location",
        "add-service",
        "add-testimonial",
        "add-illustrations",
        "create-supercut",
        "create-template",
        "ingest-content",
        "brand"
      ]
    },
    "nirvana-seo": {
      "name": "Nirvana SEO",
      "description": "SEO workflows, rankings, link building, local SEO audits, site health",
      "default": true,
      "skills": [
        "seo-flow",
        "seo-pulse",
        "search-rank",
        "link-analysis",
        "site-report",
        "drift-check",
        "local-seo-audit"
      ]
    },
    "nirvana-ads": {
      "name": "Nirvana Advertising",
      "description": "Google Ads, Meta Ads, Pinterest Ads, ad assets, video rendering",
      "default": true,
      "skills": [
        "ads",
        "meta-ads",
        "meta-audiences",
        "meta-conversions",
        "pinterest-ads",
        "ad-assets",
        "render-video",
        "render-static-ad",
        "render-variants",
        "upload-gdrive",
        "verify-meta-auth"
      ]
    },
    "nirvana-devops": {
      "name": "Nirvana DevOps",
      "description": "Deployment, testing, dependencies, project maintenance",
      "default": true,
      "skills": [
        "deploy-ready",
        "vercel",
        "deps",
        "cleanup",
        "safe-merge",
        "test-debug",
        "codebase-init",
        "audit-issues"
      ]
    }
  },
  "skills": {},
  "sharedFiles": {
    "hooks": [
      "hooks/hooks.json",
      "hooks/enforce-skills.sh",
      "hooks/inject-skill-awareness.sh",
      "hooks/session-start.sh",
      "hooks/armadillo-pre-compact.sh",
      "hooks/armadillo-stop-verify.sh"
    ],
    "lib": ["lib/skills-core.js"],
    "rules": [
      "rules/coding-standards.md",
      "rules/git-workflow.md"
    ],
    "settings": ["settings.json"]
  }
}
```

**NOTE:** The `"skills"` object will be populated in Phase 3 as each skill gets its SKILL.md created/verified. For now, leave it as `{}` — the bundle references are sufficient for discovery.

**Step 2: Commit**

```bash
git add .claude/skills.json
git commit -m "feat: create unified skills.json manifest with armadillo core + nirvana bundles"
```

---

## Phase 3: CLAUDE.md Migration

### Task 4: Rebuild CLAUDE.md with armadillo markers

**Files:**
- Modify: `CLAUDE.md` (project root)

**Step 1: Add armadillo marker block at the top of CLAUDE.md**

Insert the armadillo block at the very top of the file, before the existing content. The existing content stays below the `<!-- armadillo:end -->` marker.

```markdown
<!-- armadillo:start -->
# Claude Code Configuration

## Skills

This project uses [Armadillo](https://github.com/yourorg/armadillo) skills. Use the Skill tool to invoke them.

### Core Workflow (Armadillo)
- **brainstorming** — Start here before any creative/feature work
- **writing-plans** — Create implementation plans from designs
- **executing-plans** — Execute plans task-by-task with review checkpoints
- **test-driven-development** — RED/GREEN/REFACTOR cycle for all code
- **systematic-debugging** — Root cause analysis before fixing bugs
- **verification-before-completion** — Verify before claiming done
- **requesting-code-review** — Request review after completing work
- **receiving-code-review** — Process review feedback with rigor
- **subagent-driven-development** — Dispatch subagents per task
- **dispatching-parallel-agents** — Run independent tasks in parallel
- **using-git-worktrees** — Isolated feature branches
- **finishing-a-development-branch** — Merge/PR/cleanup guidance
- **using-armadillo** — Discover and invoke skills
- **onboarding** — Set up or migrate armadillo
- **updating-armadillo** — Check for updates, upgrade, health check
- **writing-skills** — Create new skills (TDD cycle)
- **writing-reference-skills** — API/tool reference skills

### Nirvana Content
- **add-blog-post** — Create SEO-optimized blog posts
- **add-location** — Local SEO landing pages (60%+ unique content)
- **add-service** — PMU service detail pages
- **add-testimonial** — Dan Henry transformation framework testimonials
- **add-illustrations** — Hormozi-style whiteboard illustrations
- **create-supercut** — Testimonial supercut video story arcs
- **create-template** — Remotion video templates
- **ingest-content** — Ingest external content for repurposing
- **brand** — Brand voice audit and enforcement

### Nirvana SEO
- **seo-flow** — Full SEO optimization workflow
- **seo-pulse** — Quick SEO health check
- **search-rank** — Google rankings snapshot
- **link-analysis** — Backlink opportunity discovery
- **site-report** — Comprehensive site health report
- **drift-check** — Content/config drift detection
- **local-seo-audit** — Local SEO audit with NAP checks

### Nirvana Advertising
- **ads** — Google Ads campaign management
- **meta-ads** — Meta campaign CRUD
- **meta-audiences** — Custom/lookalike audiences
- **meta-conversions** — Custom conversions setup
- **pinterest-ads** — Pinterest ad campaigns
- **ad-assets** — Ad creative pipeline
- **render-video** — Remotion video rendering
- **render-static-ad** — Static ad image generation
- **render-variants** — Multi-format ad variants
- **upload-gdrive** — Google Drive asset uploads
- **verify-meta-auth** — Meta API token verification

### Nirvana DevOps
- **deploy-ready** — Pre-deployment verification
- **vercel** — Vercel deployment management
- **deps** — Dependency audit and updates
- **cleanup** — Code cleanup and dead code removal
- **safe-merge** — Protected merge workflow
- **test-debug** — Test failure investigation
- **codebase-init** — New developer onboarding
- **audit-issues** — GitHub issue triage

## Rules

@.claude/rules/coding-standards.md
@.claude/rules/git-workflow.md

## Principles
- DRY, YAGNI, TDD
- One question at a time
- Verify before claiming done
- Frequent commits
- **Never use `EnterPlanMode`** — use the `writing-plans` skill instead

## Background Execution
Use `run_in_background: true` selectively:
- **Task (agent dispatch)** calls — always background subagent dispatches.
- **Long-running Bash** (test suites, builds, installs) — background and poll.
- **Quick Bash** (git status, file validation) — run synchronously.

## Git Authentication
Claude Code sets a `GITHUB_TOKEN` env var with limited scopes. Always prefix git push and gh api calls with `env -u GITHUB_TOKEN`.
<!-- armadillo:end -->

<!-- ═══════════════════════════════════════════════════ -->
<!-- NIRVANA PMU PROJECT-SPECIFIC CONFIGURATION BELOW -->
<!-- ═══════════════════════════════════════════════════ -->
```

**Step 2: Keep all existing project content below the armadillo end marker**

The current nirvana CLAUDE.md content (`## Project`, `## Verification Commands`, `## Quick Actions`, `## Architecture`, `## Session Continuity`, `## Branch Protection`, `## Model Selection`, `## Agent Rules`, `## Style`) should all remain below `<!-- armadillo:end -->`.

**Step 3: Update the Quick Actions table**

Remove rows for retired commands. Update remaining rows to reference armadillo skills where applicable:

| Task | Command |
|------|---------|
| Feature | Use `brainstorming` skill then `writing-plans` skill |
| Bug | Use `systematic-debugging` skill |
| SEO optimize | Use `seo-flow` skill |
| Rankings check | Use `search-rank` skill |
| Site health | Use `site-report` skill |
| Brand audit | Use `brand` skill |
| Blog post | Use `add-blog-post` skill |
| Illustrations | Use `add-illustrations` skill |
| Location page | Use `add-location` skill |
| Ad campaigns | Use `ads` skill |
| Pinterest ads | Use `pinterest-ads` skill |
| Ad assets | Use `ad-assets` skill |
| Render video | Use `render-video` skill |
| Static ads | Use `render-static-ad` skill |
| GDrive upload | Use `upload-gdrive` skill |
| Link analysis | Use `link-analysis` skill |
| Review | Use `requesting-code-review` skill |
| Verify | Use `verification-before-completion` skill |
| Cleanup | Use `cleanup` skill |
| Commit | Use `finishing-a-development-branch` skill |
| Deploy | Use `deploy-ready` skill |
| End session | Handled by armadillo stop hooks |

**Step 4: Update the project-specific @ imports**

Keep all existing nirvana rule imports. Add the armadillo rule imports if not already in the armadillo block:

```markdown
@.claude/rules/code-style.md
@.claude/rules/deployment-safety.md
@.claude/rules/testing.md
@.claude/rules/security.md
@.claude/rules/content-conventions.md
@.claude/rules/workflow-safety.md
@.claude/rules/auto-branch.md
@.claude/rules/database.md
@.claude/rules/email.md
@.claude/rules/tracking.md
@.claude/rules/posthog.md
@.claude/rules/facebook-capi.md
@.claude/rules/google-ads.md
@.claude/rules/meta-ads.md
@.claude/rules/meta-api-versioning.md
@.claude/rules/pinterest.md
@.claude/rules/remotion.md
@.claude/rules/static-ads.md
@.claude/rules/ad-assets.md
@.claude/rules/api-routes.md
@.claude/rules/content-sync.md
```

**Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: rebuild CLAUDE.md with armadillo markers + nirvana project content"
```

---

## Phase 4: Retire Overlapping Commands & Skills

### Task 5: Archive overlapping commands

**Files:**
- Create: `.claude/archive/commands/` (archive directory)
- Move: 13 command files to archive

**Step 1: Create archive directory**

```bash
mkdir -p .claude/archive/commands
```

**Step 2: Move overlapping commands to archive**

These commands are now replaced by armadillo skills:

```bash
mv .claude/commands/brainstorm.md .claude/archive/commands/
mv .claude/commands/write-plan.md .claude/archive/commands/
mv .claude/commands/execute-plan.md .claude/archive/commands/
mv .claude/commands/review.md .claude/archive/commands/
mv .claude/commands/test.md .claude/archive/commands/
mv .claude/commands/commit.md .claude/archive/commands/
mv .claude/commands/write-pr.md .claude/archive/commands/
mv .claude/commands/build-check.md .claude/archive/commands/
mv .claude/commands/handoff.md .claude/archive/commands/
mv .claude/commands/goal.md .claude/archive/commands/
mv .claude/commands/swarm.md .claude/archive/commands/
mv .claude/commands/sync.md .claude/archive/commands/
```

**Step 3: Verify remaining commands are domain-specific only**

Expected remaining commands (9):
- add-blog-post.md, add-illustrations.md, add-location.md, add-service.md, add-testimonial.md
- deploy-check.md, link-analysis.md, local-seo-audit.md, style-check.md, sync-reviews.md

These stay until their skill equivalents are verified in Phase 5.

**Step 4: Commit**

```bash
git add .claude/archive/ .claude/commands/
git commit -m "refactor: archive 12 overlapping commands replaced by armadillo skills"
```

---

### Task 6: Archive overlapping skills

**Files:**
- Move: overlapping skill directories to `.claude/archive/skills/`

**Step 1: Create archive directory**

```bash
mkdir -p .claude/archive/skills
```

**Step 2: Move overlapping skill directories**

```bash
mv .claude/skills/brainstorm .claude/archive/skills/
mv .claude/skills/plan .claude/archive/skills/
mv .claude/skills/implement .claude/archive/skills/
mv .claude/skills/review .claude/archive/skills/
mv .claude/skills/test .claude/archive/skills/
mv .claude/skills/commit .claude/archive/skills/
mv .claude/skills/write-pr .claude/archive/skills/
mv .claude/skills/deploy-ready .claude/archive/skills/
mv .claude/skills/handoff .claude/archive/skills/
mv .claude/skills/sync .claude/archive/skills/
mv .claude/skills/deep-sync .claude/archive/skills/
mv .claude/skills/self-update .claude/archive/skills/
mv .claude/skills/audit-claude .claude/archive/skills/
mv .claude/skills/codebase-init .claude/archive/skills/
```

**Step 3: Before archiving, extract PMU-specific additions**

Read each overlapping skill's SKILL.md. If it contains PMU-specific rules or checks beyond what armadillo provides, extract those to a supplementary file:

Create `.claude/docs/PMU-WORKFLOW-SUPPLEMENTS.md`:

```markdown
# PMU Workflow Supplements

Content extracted from retired nirvana skills that adds PMU-specific context
to armadillo's generic workflow skills.

## Review Supplements (from retired /review)

PMU-specific checks to apply during code review:
- Content collection schemas validated
- Schema markup (JSON-LD) present and correct
- Cloudinary images optimized (no raw URLs)
- Prices match source of truth ($650/$150/$300)
- Alt text on all images
- Dark mode variants for all components

## Build Check Supplements (from retired /build-check)

Additional verification for nirvana:
- `npm run check:astro` for Astro-specific type checking
- Content collection schema validation
- No hardcoded prices (must reference settings)

## Commit Supplements (from retired /commit)

Nirvana-specific scopes: services, locations, testimonials, blog, schema, components, seo, images
```

**Step 4: Commit**

```bash
git add .claude/archive/skills/ .claude/skills/ .claude/docs/PMU-WORKFLOW-SUPPLEMENTS.md
git commit -m "refactor: archive 14 overlapping skills, extract PMU supplements"
```

---

### Task 7: Archive overlapping agents

**Files:**
- Move: 2 agent files to `.claude/archive/agents/`

**Step 1: Create archive directory**

```bash
mkdir -p .claude/archive/agents
```

**Step 2: Move agents that armadillo replaces**

```bash
mv .claude/agents/codebase-analyzer.md .claude/archive/agents/
mv .claude/agents/claude-code-auditor.md .claude/archive/agents/
```

These two agents' functionality is now covered by:
- `codebase-analyzer` → `armadillo:onboarding` skill
- `claude-code-auditor` → `armadillo:updating-armadillo` skill (doctor mode)

**Step 3: Commit**

```bash
git add .claude/archive/agents/ .claude/agents/
git commit -m "refactor: archive 2 agents replaced by armadillo skills"
```

---

### Task 8: Merge overlapping rules

**Files:**
- Modify: `.claude/rules/workflow.md` (remove generic pipeline, keep PMU-specific pipelines)
- Modify: `.claude/rules/anti-rationalization.md` (extract unique PMU patterns)
- Create: `.claude/rules/coding-standards.md` (armadillo version)
- Create: `.claude/rules/git-workflow.md` (armadillo version)

**Step 1: Install armadillo rules**

Copy from armadillo-cli:
- `rules/coding-standards.md` → `.claude/rules/coding-standards.md`
- `rules/git-workflow.md` → `.claude/rules/git-workflow.md`

**Step 2: Trim workflow.md**

Read `.claude/rules/workflow.md`. The generic BRAINSTORM→PLAN→IMPLEMENT→VERIFY→REVIEW→CLEANUP→COMMIT→WRITE-PR→HANDOFF pipeline is now covered by armadillo's core skills. Remove the generic pipeline section but KEEP:
- PMU-specific pipelines (SEO Pipeline, Content Pipeline, Site Health Pipeline)
- Task classification rules
- Quality gate specifics that reference nirvana tools
- Task tracking best practices

**Step 3: Trim anti-rationalization.md**

Read `.claude/rules/anti-rationalization.md`. Keep only the PMU-specific anti-patterns. Generic anti-patterns (skipping tests, skipping reviews, rushing commits) are covered by armadillo's TDD and verification skills.

**Step 4: Commit**

```bash
git add .claude/rules/
git commit -m "feat: install armadillo rules, trim overlapping nirvana rules"
```

---

## Phase 5: Verify & Register Remaining Skills

### Task 9: Verify all remaining skills have proper SKILL.md format

**Files:**
- Verify: Each remaining `.claude/skills/*/SKILL.md` exists and has content

**Step 1: Audit remaining skill directories**

For each remaining skill directory, verify:
1. Has a `SKILL.md` file
2. SKILL.md has a clear title and description
3. SKILL.md describes when to use the skill
4. SKILL.md describes the workflow/process

List of remaining skills to verify (33 directories after archiving 14):
- Content: add-blog-post, add-location, add-service, add-testimonial, add-illustrations, create-supercut, create-template, ingest-content, brand
- SEO: seo-flow, seo-pulse, search-rank, link-analysis, site-report, drift-check
- Ads: ads, meta-ads, meta-audiences, meta-conversions, pinterest-ads, ad-assets, render-video, render-static-ad, render-variants, upload-gdrive, verify-meta-auth
- DevOps: vercel, deps, cleanup, safe-merge, test-debug, audit-issues

**Step 2: For any skill missing SKILL.md, create one from the corresponding command file**

If a skill directory exists but has no SKILL.md (or it's empty), create one using the content from `.claude/commands/<name>.md` as the source.

**Step 3: Commit any fixes**

```bash
git add .claude/skills/
git commit -m "fix: ensure all remaining skills have proper SKILL.md files"
```

---

### Task 10: Populate skills.json skill entries

**Files:**
- Modify: `.claude/skills.json`

**Step 1: Add skill entries for each nirvana skill**

For each remaining skill, add an entry to the `"skills"` object in skills.json:

```json
{
  "skills": {
    "add-blog-post": {
      "name": "Add Blog Post",
      "description": "Create SEO-optimized blog posts with Dan Henry framework",
      "files": ["skills/add-blog-post/SKILL.md"],
      "agents": ["agents/content-writer.md"],
      "bundle": "nirvana-content"
    },
    "add-location": {
      "name": "Add Location Page",
      "description": "Local SEO landing pages with 60%+ unique content",
      "files": ["skills/add-location/SKILL.md"],
      "agents": ["agents/seo-specialist.md"],
      "bundle": "nirvana-content"
    },
    "add-service": {
      "name": "Add Service",
      "description": "PMU service detail pages with pricing and FAQs",
      "files": ["skills/add-service/SKILL.md"],
      "agents": ["agents/content-writer.md"],
      "bundle": "nirvana-content"
    },
    "add-testimonial": {
      "name": "Add Testimonial",
      "description": "Dan Henry transformation framework testimonials",
      "files": ["skills/add-testimonial/SKILL.md"],
      "agents": ["agents/content-writer.md"],
      "bundle": "nirvana-content"
    },
    "add-illustrations": {
      "name": "Add Illustrations",
      "description": "Hormozi-style whiteboard scene illustrations for blog posts",
      "files": ["skills/add-illustrations/SKILL.md"],
      "agents": ["agents/illustrator.md"],
      "bundle": "nirvana-content"
    },
    "create-supercut": {
      "name": "Create Supercut",
      "description": "Testimonial supercut video story arc generation",
      "files": ["skills/create-supercut/SKILL.md"],
      "agents": ["agents/supercut-generator.md"],
      "bundle": "nirvana-content"
    },
    "create-template": {
      "name": "Create Template",
      "description": "Remotion video template creation",
      "files": ["skills/create-template/SKILL.md"],
      "agents": ["agents/remotion-expert.md"],
      "bundle": "nirvana-content"
    },
    "ingest-content": {
      "name": "Ingest Content",
      "description": "Ingest external content for repurposing",
      "files": ["skills/ingest-content/SKILL.md"],
      "agents": ["agents/content-writer.md"],
      "bundle": "nirvana-content"
    },
    "brand": {
      "name": "Brand Voice",
      "description": "Brand voice audit, enforcement, and knowledge base queries",
      "files": ["skills/brand/SKILL.md"],
      "agents": ["agents/content-writer.md"],
      "bundle": "nirvana-content"
    },
    "seo-flow": {
      "name": "SEO Flow",
      "description": "Full SEO optimization workflow — audit, implement, verify",
      "files": ["skills/seo-flow/SKILL.md"],
      "agents": ["agents/seo-specialist.md"],
      "bundle": "nirvana-seo"
    },
    "seo-pulse": {
      "name": "SEO Pulse",
      "description": "Quick SEO health check — rankings, issues, opportunities",
      "files": ["skills/seo-pulse/SKILL.md"],
      "agents": ["agents/seo-specialist.md"],
      "bundle": "nirvana-seo"
    },
    "search-rank": {
      "name": "Search Rankings",
      "description": "Google rankings snapshot from GSC data",
      "files": ["skills/search-rank/SKILL.md"],
      "agents": ["agents/analytics-expert.md"],
      "bundle": "nirvana-seo"
    },
    "link-analysis": {
      "name": "Link Analysis",
      "description": "Backlink opportunity discovery and competitor analysis",
      "files": ["skills/link-analysis/SKILL.md"],
      "agents": ["agents/seo-specialist.md"],
      "bundle": "nirvana-seo"
    },
    "site-report": {
      "name": "Site Report",
      "description": "Comprehensive site health report — performance, SEO, content",
      "files": ["skills/site-report/SKILL.md"],
      "agents": ["agents/health-monitor.md"],
      "bundle": "nirvana-seo"
    },
    "drift-check": {
      "name": "Drift Check",
      "description": "Content and config drift detection",
      "files": ["skills/drift-check/SKILL.md"],
      "agents": ["agents/health-monitor.md"],
      "bundle": "nirvana-seo"
    },
    "local-seo-audit": {
      "name": "Local SEO Audit",
      "description": "Local SEO audit — NAP, location uniqueness, schema, GBP",
      "files": ["skills/local-seo-audit/SKILL.md"],
      "agents": ["agents/seo-specialist.md"],
      "bundle": "nirvana-seo"
    },
    "ads": {
      "name": "Google Ads",
      "description": "Google Ads campaign management and optimization",
      "files": ["skills/ads/SKILL.md"],
      "agents": ["agents/analytics-expert.md"],
      "bundle": "nirvana-ads"
    },
    "meta-ads": {
      "name": "Meta Ads",
      "description": "Meta campaign creation, optimization, and management",
      "files": ["skills/meta-ads/SKILL.md"],
      "agents": ["agents/meta-ads-expert.md"],
      "bundle": "nirvana-ads"
    },
    "meta-audiences": {
      "name": "Meta Audiences",
      "description": "Custom and lookalike audience management",
      "files": ["skills/meta-audiences/SKILL.md"],
      "agents": ["agents/meta-ads-expert.md"],
      "bundle": "nirvana-ads"
    },
    "meta-conversions": {
      "name": "Meta Conversions",
      "description": "Custom conversion setup and CAPI verification",
      "files": ["skills/meta-conversions/SKILL.md"],
      "agents": ["agents/facebook-pixel-expert.md"],
      "bundle": "nirvana-ads"
    },
    "pinterest-ads": {
      "name": "Pinterest Ads",
      "description": "Pinterest ad campaigns and CAPI integration",
      "files": ["skills/pinterest-ads/SKILL.md"],
      "agents": ["agents/pinterest-expert.md"],
      "bundle": "nirvana-ads"
    },
    "ad-assets": {
      "name": "Ad Assets",
      "description": "Ad creative pipeline — crawl, classify, resize, sync",
      "files": ["skills/ad-assets/SKILL.md"],
      "agents": ["agents/ads-pipeline.md"],
      "bundle": "nirvana-ads"
    },
    "render-video": {
      "name": "Render Video",
      "description": "Remotion video composition rendering",
      "files": ["skills/render-video/SKILL.md"],
      "agents": ["agents/remotion-expert.md"],
      "bundle": "nirvana-ads"
    },
    "render-static-ad": {
      "name": "Render Static Ad",
      "description": "Static ad image generation from Remotion",
      "files": ["skills/render-static-ad/SKILL.md"],
      "agents": ["agents/remotion-expert.md"],
      "bundle": "nirvana-ads"
    },
    "render-variants": {
      "name": "Render Variants",
      "description": "Multi-format ad variant generation (16:9, 1:1, 9:16)",
      "files": ["skills/render-variants/SKILL.md"],
      "agents": ["agents/remotion-expert.md"],
      "bundle": "nirvana-ads"
    },
    "upload-gdrive": {
      "name": "Upload to GDrive",
      "description": "Google Drive asset uploads for client sharing",
      "files": ["skills/upload-gdrive/SKILL.md"],
      "agents": [],
      "bundle": "nirvana-ads"
    },
    "verify-meta-auth": {
      "name": "Verify Meta Auth",
      "description": "Meta API token and permissions verification",
      "files": ["skills/verify-meta-auth/SKILL.md"],
      "agents": ["agents/meta-ads-expert.md"],
      "bundle": "nirvana-ads"
    },
    "deploy-ready": {
      "name": "Deploy Ready",
      "description": "Pre-deployment verification — build, types, SEO, security",
      "files": ["skills/deploy-ready/SKILL.md"],
      "agents": ["agents/verifier.md"],
      "bundle": "nirvana-devops"
    },
    "vercel": {
      "name": "Vercel Deploy",
      "description": "Vercel deployment management and environment config",
      "files": ["skills/vercel/SKILL.md"],
      "agents": [],
      "bundle": "nirvana-devops"
    },
    "deps": {
      "name": "Dependencies",
      "description": "Dependency audit, updates, and security patches",
      "files": ["skills/deps/SKILL.md"],
      "agents": [],
      "bundle": "nirvana-devops"
    },
    "cleanup": {
      "name": "Cleanup",
      "description": "Dead code removal, unused imports, file cleanup",
      "files": ["skills/cleanup/SKILL.md"],
      "agents": [],
      "bundle": "nirvana-devops"
    },
    "safe-merge": {
      "name": "Safe Merge",
      "description": "Protected merge workflow with conflict resolution",
      "files": ["skills/safe-merge/SKILL.md"],
      "agents": ["agents/reviewer.md"],
      "bundle": "nirvana-devops"
    },
    "test-debug": {
      "name": "Test Debug",
      "description": "Test failure investigation and fix",
      "files": ["skills/test-debug/SKILL.md"],
      "agents": ["agents/debugger.md"],
      "bundle": "nirvana-devops"
    },
    "audit-issues": {
      "name": "Audit Issues",
      "description": "GitHub issue triage and categorization",
      "files": ["skills/audit-issues/SKILL.md"],
      "agents": [],
      "bundle": "nirvana-devops"
    }
  }
}
```

**Step 2: Commit**

```bash
git add .claude/skills.json
git commit -m "feat: populate skills.json with all 33 nirvana domain skills"
```

---

## Phase 6: Hook Architecture Cleanup

### Task 11: Reconcile hook architecture

**Files:**
- Modify: `.claude/settings.json` (remove lifecycle hooks that armadillo now handles)
- Modify: `.claude/hooks/hooks.json` (ensure no conflicts)

**Step 1: Identify hook overlaps between settings.json and hooks.json**

Armadillo hooks.json now handles:
- `SessionStart` (skill awareness injection)
- `PreToolUse` on `EnterPlanMode` (block) and `Task` (enforce skills)
- `UserPromptSubmit` (skill awareness)
- `PreCompact` (context preservation)
- `Stop` (verification reminder)

Nirvana settings.json has:
- `SessionStart` — 5 hooks (auto-suggest-feature-branch, validate-settings, session-log, workflow-enforcement, detect-env-newlines)
- `PreToolUse` on `Bash` — 5 hooks (block-direct-main-commit, block-direct-vercel-deploy, protect-database-operations, validate-command, validate-meta-config)
- `PreToolUse` on `Edit|Write` — 4 hooks (google-api-version-check, meta-api-version-check, pinterest-api-check, posthog-pii-check)
- `PostToolUse` on `Edit|Write` — 3 hooks (format-on-save, track-changes, brand-check-content)
- `PostToolUse` on `Bash` — 1 hook (enforce-pr-workflow)
- `PostToolUseFailure` — 1 hook (error-log)
- `UserPromptSubmit` — 1 hook (inject-context)
- `SubagentStart` — 1 hook (brand-context-inject)
- `Stop` — 1 hook (stop-check)
- `SessionEnd` — 1 hook (session-end)
- `PreCompact` — 3 hooks (rotate-logs, pre-compact, validate-critical-files)

**Step 2: Resolution**

**No removals from settings.json.** All nirvana hooks are project-specific and do different things than armadillo's hooks. They coexist:

- Armadillo's `SessionStart` injects skill awareness → nirvana's `SessionStart` does auto-branch + validation
- Armadillo's `UserPromptSubmit` injects skill discovery → nirvana's `UserPromptSubmit` injects project context
- Armadillo's `PreCompact` saves branch context → nirvana's `PreCompact` rotates logs + validates files
- Armadillo's `Stop` reminds about verification → nirvana's `Stop` runs stop-check

Both fire. No conflicts. Keep both.

**Step 3: Remove nirvana's `workflow-enforcement.sh` from SessionStart**

This hook enforced the old nirvana workflow pipeline. Now that armadillo's `enforce-skills.sh` and `inject-skill-awareness.sh` handle workflow enforcement, the nirvana version is redundant.

In `.claude/settings.json`, remove the workflow-enforcement entry from SessionStart hooks:

```json
// REMOVE this entry from SessionStart hooks:
{
  "type": "command",
  "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/workflow-enforcement.sh",
  "timeout": 5000
}
```

Move the script:
```bash
mv .claude/hooks/workflow-enforcement.sh .claude/archive/hooks/
```

**Step 4: Commit**

```bash
git add .claude/settings.json .claude/hooks/ .claude/archive/
git commit -m "refactor: reconcile hook architecture — armadillo lifecycle + nirvana project hooks coexist"
```

---

## Phase 7: Remaining Commands → Archive

### Task 12: Archive remaining legacy commands

**Files:**
- Move: All remaining `.claude/commands/*.md` to `.claude/archive/commands/`

**Step 1: Archive remaining commands**

Now that all skills are registered in skills.json, the legacy commands directory is no longer needed. Skills are the canonical format.

```bash
mv .claude/commands/*.md .claude/archive/commands/
```

This archives:
- add-blog-post.md, add-illustrations.md, add-location.md, add-service.md, add-testimonial.md
- deploy-check.md, link-analysis.md, local-seo-audit.md, style-check.md, sync-reviews.md

**Step 2: Keep the commands directory but add a README**

Create `.claude/commands/README.md`:

```markdown
# Legacy Commands

Commands have been migrated to armadillo skills format.
Use the Skill tool to invoke skills instead.

Archived commands are in `.claude/archive/commands/`.
```

**Step 3: Commit**

```bash
git add .claude/commands/ .claude/archive/commands/
git commit -m "refactor: archive all legacy commands — skills are now canonical"
```

---

## Phase 8: Agent Memory System Integration

### Task 13: Verify agent memory compatibility

**Files:**
- Verify: All 15 agent memory files are intact and referenced
- Verify: All 25 remaining agents have `memory: project` or `memory: user` in frontmatter

**Step 1: Verify all agent memory directories exist and have content**

Check each of the 15 directories:
```
.claude/agent-memory/ads-pipeline/MEMORY.md
.claude/agent-memory/analytics-expert/MEMORY.md
.claude/agent-memory/astro-expert/MEMORY.md
.claude/agent-memory/cloudinary-expert/MEMORY.md
.claude/agent-memory/content-writer/MEMORY.md
.claude/agent-memory/debugger/MEMORY.md
.claude/agent-memory/facebook-pixel-expert/MEMORY.md
.claude/agent-memory/google-docs-verifier/MEMORY.md
.claude/agent-memory/health-monitor/MEMORY.md
.claude/agent-memory/meta-ads-expert/MEMORY.md
.claude/agent-memory/planner/MEMORY.md
.claude/agent-memory/posthog-expert/MEMORY.md
.claude/agent-memory/remotion-expert/MEMORY.md
.claude/agent-memory/reviewer/MEMORY.md
.claude/agent-memory/seo-specialist/MEMORY.md
```

Each should have a MEMORY.md with accumulated knowledge. If any are empty templates, note but don't modify.

**Step 2: Verify all remaining agents have memory frontmatter**

All 25 remaining agents should have `memory: project` (or `memory: user` for verifier). This is already confirmed from the audit — all agents have proper YAML frontmatter.

**Step 3: No changes needed**

Armadillo's `memory` field in agent frontmatter is the same mechanism nirvana already uses. The `agent-memory/` directory is a project-specific persistence pattern that coexists with armadillo's system. No migration needed.

**Step 4: Document the memory architecture**

Add to `.claude/docs/MIGRATION-MANIFEST.md`:

```markdown
## Memory Architecture

### Agent Frontmatter Memory
All 25 agents declare `memory: project` (or `memory: user` for verifier) in YAML frontmatter.
This tells Claude Code to persist session knowledge for each agent.

### Agent Memory Files
15 agents have dedicated `.claude/agent-memory/<agent>/MEMORY.md` files containing
accumulated domain knowledge (rankings, API gotchas, baselines, patterns).
These files are MANUALLY curated and must NEVER be auto-generated or overwritten.

### Armadillo Compatibility
Armadillo's `memory` field is the same field nirvana already uses.
The agent-memory/ directory is a project-specific addition that armadillo does not manage.
Both systems coexist without conflict.
```

**Step 5: Commit**

```bash
git add .claude/docs/MIGRATION-MANIFEST.md
git commit -m "docs: document agent memory architecture and armadillo compatibility"
```

---

## Phase 9: Knowledge Base Preservation Verification

### Task 14: Verify all preserved content is intact

**Step 1: Count and verify brand KB files**

```bash
find .claude/docs/nirvana\ brand\ documentation/ -name "*.md" | wc -l
# Expected: 15 (14 chapters + master guide)
```

**Step 2: Count and verify microblading education modules**

```bash
ls -d .claude/docs/Sarah\ Microblading\ Education/*/ | wc -l
# Expected: 10 directories (00 through 08 + notes)

find ".claude/docs/Sarah Microblading Education/" -name "*.md" | wc -l
# Expected: significant number of files
```

**Step 3: Verify codebase docs**

```bash
ls .claude/docs/codebase/*.md | wc -l
# Expected: 16
```

**Step 4: Verify output style**

```bash
cat .claude/output-styles/nirvana-pmu.md | head -5
# Should show the nirvana output style header
```

**Step 5: Verify progress tracking**

```bash
ls .claude/progress/
# Expected: designs/, plans/, handoffs/, optimization-log/ (and possibly more)
```

**Step 6: Verify other docs**

```bash
ls .claude/docs/brand-voice.md
ls .claude/docs/AGENT-GUIDELINES.md
ls .claude/docs/ARCHITECTURE-SHOWCASE.md
ls .claude/docs/HOOKS-REFERENCE.md
ls .claude/docs/TROUBLESHOOTING.md
ls -d .claude/docs/acuity_analysis/
ls -d .claude/docs/meta-integration/
ls -d .claude/docs/reference/
```

**Step 7: No changes expected — this is a verification-only task**

If anything is missing, investigate immediately. Do NOT proceed to the next phase.

---

## Phase 10: Full System Verification

### Task 15: Validate skills.json structure

**Step 1: Validate JSON**

```bash
node -e "const s = JSON.parse(require('fs').readFileSync('.claude/skills.json','utf8')); console.log('Bundles:', Object.keys(s.bundles).length); console.log('Skills:', Object.keys(s.skills).length); console.log('Valid JSON: OK')"
```

Expected:
- Bundles: 5 (core + 4 nirvana)
- Skills: 33+ (nirvana domain skills)
- Valid JSON: OK

**Step 2: Verify all skill files referenced in skills.json exist**

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('.claude/skills.json','utf8'));
let missing = 0;
for (const [name, skill] of Object.entries(s.skills)) {
  for (const f of skill.files || []) {
    if (!require('fs').existsSync('.claude/' + f)) {
      console.log('MISSING:', f, '(skill:', name, ')');
      missing++;
    }
  }
  for (const a of skill.agents || []) {
    if (!require('fs').existsSync('.claude/' + a)) {
      console.log('MISSING AGENT:', a, '(skill:', name, ')');
      missing++;
    }
  }
}
console.log(missing === 0 ? 'All files present' : missing + ' files missing');
"
```

Expected: All files present.

**Step 3: Verify hooks.json structure**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/hooks/hooks.json','utf8')); console.log('Valid JSON: OK')"
```

**Step 4: Verify settings.json structure**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON: OK')"
```

**Step 5: Verify CLAUDE.md has armadillo markers**

```bash
grep -c 'armadillo:start' CLAUDE.md
grep -c 'armadillo:end' CLAUDE.md
# Both should output 1
```

**Step 6: Verify no orphaned skill references**

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('.claude/skills.json','utf8'));
const allBundleSkills = Object.values(s.bundles).flatMap(b => b.skills);
const registeredSkills = Object.keys(s.skills);
const unregistered = allBundleSkills.filter(sk => !registeredSkills.includes(sk) && !['brainstorming','dispatching-parallel-agents','executing-plans','finishing-a-development-branch','receiving-code-review','requesting-code-review','subagent-driven-development','systematic-debugging','test-driven-development','using-git-worktrees','using-armadillo','verification-before-completion','writing-plans','writing-reference-skills','writing-skills','onboarding','updating-armadillo'].includes(sk));
if (unregistered.length) console.log('Unregistered:', unregistered);
else console.log('All bundle skills are registered or armadillo-core');
"
```

---

### Task 16: Run project build verification

**Step 1: Run type check**

```bash
npm run check
```

Expected: No errors (migration only touched .claude/ files, not source code).

**Step 2: Run build**

```bash
npm run build
```

Expected: Clean build (no source changes).

**Step 3: Run tests**

```bash
npm run test:run
```

Expected: All existing tests pass.

---

### Task 17: Create final migration summary and commit

**Files:**
- Modify: `.claude/docs/MIGRATION-MANIFEST.md` (add completion summary)

**Step 1: Update migration manifest with results**

Add to `.claude/docs/MIGRATION-MANIFEST.md`:

```markdown
## Migration Complete

### Summary

| Metric | Before | After |
|--------|--------|-------|
| Agents | 27 | 25 (2 archived → armadillo skills) |
| Skills (project) | 47 | 33 (14 archived → armadillo core) |
| Commands | 22 | 0 (all archived → skills) |
| Rules | 23 | 25 (23 original + 2 armadillo) |
| Hook scripts | 26 | 31 (26 original + 5 armadillo) |
| Bundles | 0 | 5 (1 core + 4 nirvana) |
| Agent memories | 15 | 15 (preserved) |
| Brand KB files | 15 | 15 (preserved) |
| Education modules | 10 | 10 (preserved) |
| Codebase docs | 16 | 16 (preserved) |

### What Changed
1. Armadillo plugin installed (hooks.json, skills.json, lib/skills-core.js)
2. CLAUDE.md rebuilt with armadillo markers + project content
3. 12 overlapping commands archived → armadillo core skills
4. 14 overlapping skills archived → armadillo core skills
5. 2 overlapping agents archived → armadillo skills
6. 33 domain skills registered in skills.json
7. 25 domain agents preserved and referenced
8. 2 armadillo rules installed alongside 23 nirvana rules
9. Armadillo lifecycle hooks installed alongside project hooks
10. All knowledge preserved: memories, brand KB, education, codebase docs

### What Didn't Change
- All agent memory files (untouched)
- All brand documentation (untouched)
- All microblading education content (untouched)
- All codebase documentation (untouched)
- All output styles (untouched)
- All progress tracking (untouched)
- All project hooks (untouched)
- All domain rules (untouched, 2 trimmed of generic content)
- All source code (zero changes)
- settings.json (1 hook removed: workflow-enforcement)
```

**Step 2: Final commit**

```bash
git add .
git commit -m "feat: complete armadillo migration — 5 bundles, 33 skills, 25 agents, all knowledge preserved"
```

**Step 3: Present merge options**

The migration is on `migrate/armadillo-integration` branch. Present options:
1. Merge to main via PR
2. Merge directly (if admin)
3. Squash merge for clean history

---

## Post-Migration: Using the System

After migration, the workflow changes from slash commands to Skill tool invocation:

| Old Way | New Way |
|---------|---------|
| `/brainstorm` | Use `brainstorming` skill |
| `/add-blog-post` | Use `add-blog-post` skill |
| `/seo-flow` | Use `seo-flow` skill |
| `/ads` | Use `ads` skill |
| `/review` | Use `requesting-code-review` skill |
| `/commit` | Use `finishing-a-development-branch` skill |

All skills are discoverable via the `using-armadillo` skill. Armadillo hooks inject skill awareness into every prompt, so Claude always knows what skills are available.

To update armadillo in the future: Use the `updating-armadillo` skill.
