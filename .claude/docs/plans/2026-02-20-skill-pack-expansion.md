# Skill Pack Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 new packs (ads, seo, python, cloudinary), 11 tier-1 drop-in skills, 8 reference skill rewrites, 8 rules, 8 agent rewrites, and 3 video pack extensions — all rewritten clean from scratch using nirvana/KHOJ sources as inspiration only.

**Architecture:** Each item follows the same pattern — register in `armadillo.json`, create file at the correct path (`packs/<pack>/skills/<skill>/SKILL.md` for pack skills, `.claude/agents/<name>.md` for agents, `.claude/rules/<name>.md` for rules), update shepherd routing, update tests. Reference skills get web research first via `writing-reference-skills` process. All SKILL.md files use standard frontmatter (`model`, `name`, `description`).

**Tech Stack:** Node.js (node:test for tests), markdown SKILL.md files, armadillo.json manifest, bash hooks

**Source material:** `tmp-skill-audit/nirvana-skills/`, `tmp-skill-audit/khoj-skills/`, `tmp-skill-audit/nirvana-agents/`, `tmp-skill-audit/nirvana-rules/` — use as **inspiration only**, rewrite everything from scratch.

---

## Phase 1: Infrastructure & Test Updates

### Task 1: Update repo-structure test floor count

**Files:**
- Modify: `tests/repo-structure.test.js:89`

**Step 1: Update the pack count floor**

The current floor is `>= 20` packs. We're adding 4 new packs (ads, seo, python, cloudinary), bringing total from 22 to 26.

```javascript
// Change line 89 from:
assert.ok(packs.length >= 20, `expected at least 20 packs, got ${packs.length}`);
// To:
assert.ok(packs.length >= 26, `expected at least 26 packs, got ${packs.length}`);
```

**Step 2: Update agent count floor**

Current floor is `>= 14` agents. We're adding 8 agents, bringing total from 14 to 22.

```javascript
// Change line 47 from:
assert.ok(agents.length >= 14, `expected at least 14 agents, got ${agents.length}`);
// To:
assert.ok(agents.length >= 22, `expected at least 22 agents, got ${agents.length}`);
```

**Step 3: Update rule count assertion**

Current test only checks for `coding-standards.md` and `release-checklist.md`. Add check for new rules count. The current `.claude/rules/` has 6 files, we're adding 8 more = 14 total. But `release-checklist.md` is repo-only (not in armadillo.json core.rules), so the armadillo.json core.rules array will have 13 entries.

Add after the existing rule assertions:

```javascript
it('.claude/rules/ has at least 13 rule files', () => {
  const rules = readdirSync(join(ROOT, '.claude', 'rules')).filter(f => f.endsWith('.md'));
  assert.ok(rules.length >= 13, `expected at least 13 rules, got ${rules.length}`);
});
```

**Step 4: Run tests to confirm they fail (RED)**

Run: `node --test tests/repo-structure.test.js`
Expected: FAIL — pack count is 22 (< 26), agent count is 14 (< 22), rule count is 6 (< 13)

**Step 5: Commit**

```bash
git add tests/repo-structure.test.js
git commit -m "test: raise floor counts for skill pack expansion"
```

---

### Task 2: Create empty pack directory structures

**Files:**
- Create: `packs/ads/skills/.gitkeep`
- Create: `packs/seo/skills/.gitkeep`
- Create: `packs/python/skills/.gitkeep`
- Create: `packs/cloudinary/skills/.gitkeep`

**Step 1: Create the 4 new pack directories**

```bash
mkdir -p packs/ads/skills
mkdir -p packs/seo/skills
mkdir -p packs/python/skills
mkdir -p packs/cloudinary/skills
touch packs/ads/skills/.gitkeep
touch packs/seo/skills/.gitkeep
touch packs/python/skills/.gitkeep
touch packs/cloudinary/skills/.gitkeep
```

**Step 2: Register all 4 new packs in armadillo.json**

Add to `armadillo.json` packs object:

```json
"ads": {
  "description": "Meta Ads, Pinterest Ads, Conversions API — paid social campaign management and verification",
  "skills": [
    "meta-ads",
    "meta-audiences",
    "meta-conversions",
    "pinterest-ads",
    "verify-meta-auth"
  ]
},
"seo": {
  "description": "SEO pipeline, pulse checks, local SEO, link analysis, rank tracking, site reports",
  "skills": [
    "seo-flow",
    "seo-pulse",
    "local-seo-audit",
    "link-analysis",
    "search-rank",
    "site-report"
  ]
},
"python": {
  "description": "Django, Django ORM, Django Auth, FastAPI — Python web frameworks and APIs",
  "skills": [
    "django",
    "django-orm",
    "django-auth",
    "fastapi"
  ]
},
"cloudinary": {
  "description": "Cloudinary media management — uploads, transformations, optimization, and delivery",
  "skills": [
    "cloudinary"
  ]
}
```

**Step 3: Commit**

```bash
git add packs/ads packs/seo packs/python packs/cloudinary armadillo.json
git commit -m "chore: scaffold 4 new pack directories and register in armadillo.json"
```

---

## Phase 2: New Pack Skills (rewrite from scratch)

Each skill in this phase must be **rewritten from scratch**. Read the nirvana/KHOJ source for inspiration on what the skill covers, then write a clean SKILL.md following armadillo conventions. Strip all project-specific references (nirvana, PMU, KHOJ-Z, specific database names, specific domain references).

### Task 3: Write ads pack — meta-ads skill

**Files:**
- Create: `packs/ads/skills/meta-ads/SKILL.md`

**Step 1: Read nirvana source for inspiration**

Read `tmp-skill-audit/nirvana-skills/meta-ads/SKILL.md` to understand scope and structure.

**Step 2: Do web research on current Meta Marketing API**

Use WebSearch to find current Meta Marketing API docs (v21.0+), endpoints, campaign structure, and best practices.

**Step 3: Write SKILL.md from scratch**

Standard frontmatter:
```yaml
---
model: claude-sonnet-4-6
name: meta-ads
description: Use when managing Meta/Facebook Ads campaigns — creating campaigns, ad sets, ads, budget optimization, performance reporting, or A/B testing. Also use when working with Meta Marketing API for programmatic ad management.
---
```

Body should cover: campaign hierarchy (campaign → ad set → ad), CRUD operations, budget management, performance metrics, targeting, creative specs. Generic — no project-specific content.

**Step 4: Commit**

```bash
git add packs/ads/skills/meta-ads/SKILL.md
git commit -m "feat(ads): add meta-ads skill"
```

### Task 4: Write ads pack — meta-audiences skill

**Files:**
- Create: `packs/ads/skills/meta-audiences/SKILL.md`

**Step 1: Read nirvana source, web research Meta Audiences API**

**Step 2: Write SKILL.md from scratch**

Frontmatter: `name: meta-audiences`, description about custom audiences, lookalikes, retargeting.

Body: custom audience types (customer list, pixel, engagement, video), lookalike creation, audience sizing, overlap analysis.

**Step 3: Commit**

```bash
git add packs/ads/skills/meta-audiences/SKILL.md
git commit -m "feat(ads): add meta-audiences skill"
```

### Task 5: Write ads pack — meta-conversions skill

**Files:**
- Create: `packs/ads/skills/meta-conversions/SKILL.md`

**Step 1: Read nirvana source, web research Meta Conversions API (CAPI)**

**Step 2: Write SKILL.md from scratch**

Cover: CAPI setup, server-side events, event deduplication, EMQ monitoring, custom conversions, pixel integration.

**Step 3: Commit**

```bash
git add packs/ads/skills/meta-conversions/SKILL.md
git commit -m "feat(ads): add meta-conversions skill"
```

### Task 6: Write ads pack — pinterest-ads skill

**Files:**
- Create: `packs/ads/skills/pinterest-ads/SKILL.md`

**Step 1: Read nirvana source, web research Pinterest Ads API**

**Step 2: Write SKILL.md from scratch**

Cover: campaign management, ad groups, pins, targeting, CAPI health, audience management, performance reporting.

**Step 3: Commit**

```bash
git add packs/ads/skills/pinterest-ads/SKILL.md
git commit -m "feat(ads): add pinterest-ads skill"
```

### Task 7: Write ads pack — verify-meta-auth skill

**Files:**
- Create: `packs/ads/skills/verify-meta-auth/SKILL.md`

**Step 1: Read nirvana source, web research Meta token verification**

**Step 2: Write SKILL.md from scratch**

Cover: token validation, permission scope checking, token debugging, long-lived token exchange, system user vs page token.

**Step 3: Commit**

```bash
git add packs/ads/skills/verify-meta-auth/SKILL.md
git commit -m "feat(ads): add verify-meta-auth skill"
```

### Task 8: Write seo pack — seo-flow skill

**Files:**
- Create: `packs/seo/skills/seo-flow/SKILL.md`

**Step 1: Read nirvana source, web research current SEO best practices**

**Step 2: Write SKILL.md from scratch**

Cover: full SEO optimization pipeline — technical audit, content analysis, keyword research, on-page optimization, structured data, internal linking, approval-gated action plan.

**Step 3: Commit**

```bash
git add packs/seo/skills/seo-flow/SKILL.md
git commit -m "feat(seo): add seo-flow skill"
```

### Task 9: Write seo pack — seo-pulse skill

**Files:**
- Create: `packs/seo/skills/seo-pulse/SKILL.md`

**Step 1: Read nirvana source, web research SEO monitoring patterns**

**Step 2: Write SKILL.md from scratch**

Cover: quick SEO health check — Core Web Vitals, index status, ranking changes, search analytics summary, performance trends. Single-command diagnostic.

**Step 3: Commit**

```bash
git add packs/seo/skills/seo-pulse/SKILL.md
git commit -m "feat(seo): add seo-pulse skill"
```

### Task 10: Write seo pack — local-seo-audit skill

**Files:**
- Create: `packs/seo/skills/local-seo-audit/SKILL.md`

**Step 1: Read nirvana source, web research local SEO audit checklist**

**Step 2: Write SKILL.md from scratch**

Cover: NAP consistency, location page uniqueness, local schema markup, review signals, GBP alignment, citation audit.

**Step 3: Commit**

```bash
git add packs/seo/skills/local-seo-audit/SKILL.md
git commit -m "feat(seo): add local-seo-audit skill"
```

### Task 11: Write seo pack — link-analysis skill

**Files:**
- Create: `packs/seo/skills/link-analysis/SKILL.md`

**Step 1: Read nirvana source, web research backlink analysis patterns**

**Step 2: Write SKILL.md from scratch**

Cover: competitor backlink analysis, no-outreach link building opportunities, linkable asset creation, authority building, broken link recovery. Approval-gated workflow.

**Step 3: Commit**

```bash
git add packs/seo/skills/link-analysis/SKILL.md
git commit -m "feat(seo): add link-analysis skill"
```

### Task 12: Write seo pack — search-rank skill

**Files:**
- Create: `packs/seo/skills/search-rank/SKILL.md`

**Step 1: Read nirvana source, web research rank tracking approaches**

**Step 2: Write SKILL.md from scratch**

Cover: keyword ranking analysis, page-1 opportunity identification, position change tracking, SERP feature detection, search intent classification.

**Step 3: Commit**

```bash
git add packs/seo/skills/search-rank/SKILL.md
git commit -m "feat(seo): add search-rank skill"
```

### Task 13: Write seo pack — site-report skill

**Files:**
- Create: `packs/seo/skills/site-report/SKILL.md`

**Step 1: Read nirvana source, web research site audit report structure**

**Step 2: Write SKILL.md from scratch**

Cover: comprehensive site health report — Lighthouse scores, Core Web Vitals, SEO audit, content quality, schema validation, broken links, performance data. Self-contained HTML output.

**Step 3: Commit**

```bash
git add packs/seo/skills/site-report/SKILL.md
git commit -m "feat(seo): add site-report skill"
```

### Task 14: Write python pack — django skill

**Files:**
- Create: `packs/python/skills/django/SKILL.md`

**Step 1: Read KHOJ source, web research current Django (5.x) docs**

**Step 2: Write SKILL.md from scratch**

Cover: project structure, views, URLs, templates, middleware, settings, management commands, testing, deployment. Current Django 5.x patterns.

**Step 3: Commit**

```bash
git add packs/python/skills/django/SKILL.md
git commit -m "feat(python): add django skill"
```

### Task 15: Write python pack — django-orm skill

**Files:**
- Create: `packs/python/skills/django-orm/SKILL.md`

**Step 1: Read KHOJ source, web research Django ORM patterns**

**Step 2: Write SKILL.md from scratch**

Cover: models, querysets, managers, migrations, relationships, aggregation, F/Q objects, transactions, raw SQL, optimization.

**Step 3: Commit**

```bash
git add packs/python/skills/django-orm/SKILL.md
git commit -m "feat(python): add django-orm skill"
```

### Task 16: Write python pack — django-auth skill

**Files:**
- Create: `packs/python/skills/django-auth/SKILL.md`

**Step 1: Read KHOJ django-auth source, web research Django auth system**

**Step 2: Write SKILL.md from scratch**

Cover: authentication backends, custom user models, permissions, groups, decorators, middleware, password management, session handling, social auth.

**Step 3: Commit**

```bash
git add packs/python/skills/django-auth/SKILL.md
git commit -m "feat(python): add django-auth skill"
```

### Task 17: Write python pack — fastapi skill

**Files:**
- Create: `packs/python/skills/fastapi/SKILL.md`

**Step 1: Read KHOJ source, web research current FastAPI docs**

**Step 2: Write SKILL.md from scratch**

Cover: path operations, Pydantic models, dependency injection, middleware, background tasks, WebSockets, testing, deployment. Strip KHOJ-specific coupling.

**Step 3: Commit**

```bash
git add packs/python/skills/fastapi/SKILL.md
git commit -m "feat(python): add fastapi skill"
```

### Task 18: Write cloudinary pack — cloudinary skill (reference skill)

**Files:**
- Create: `packs/cloudinary/skills/cloudinary/SKILL.md`
- Create: `packs/cloudinary/skills/cloudinary/reference.md`

**Step 1: Read nirvana cloudinary-reference source for scope inspiration**

**Step 2: Web research current Cloudinary API docs**

Use WebSearch for current Cloudinary Upload API, Transformation API, Admin API, and SDKs.

**Step 3: Write SKILL.md (compact quick-ref)**

```yaml
---
model: claude-sonnet-4-6
name: cloudinary
description: Use when working with Cloudinary for media management — image/video uploads, transformations, optimization, responsive delivery, or Admin API. Also use when choosing a media CDN or setting up asset pipelines.
---
```

**Step 4: Write reference.md (deep API docs)**

No frontmatter. Full API reference: Upload API, Transformation URL syntax, Admin API, SDKs (Node, Python), webhooks, optimization presets.

**Step 5: Commit**

```bash
git add packs/cloudinary/skills/cloudinary/
git commit -m "feat(cloudinary): add cloudinary reference skill"
```

---

## Phase 3: Tier 1 Drop-In Skills

These skills are nearly armadillo-ready. Read the source, strip project-specific content, ensure frontmatter follows conventions, and write clean.

### Task 19: Add google-genai skill to ai pack

**Files:**
- Create: `packs/ai/skills/google-genai/SKILL.md`
- Modify: `armadillo.json` — add `"google-genai"` to `packs.ai.skills`

**Step 1: Read KHOJ source, web research Google Generative AI (Gemini) API**

**Step 2: Write SKILL.md — current Gemini API patterns, models, tool use, multimodal**

**Step 3: Update armadillo.json**

Add `"google-genai"` to `packs.ai.skills` array.

**Step 4: Commit**

```bash
git add packs/ai/skills/google-genai/SKILL.md armadillo.json
git commit -m "feat(ai): add google-genai skill"
```

### Task 20: Add openai-api skill to ai pack

**Files:**
- Create: `packs/ai/skills/openai-api/SKILL.md`
- Modify: `armadillo.json` — add `"openai-api"` to `packs.ai.skills`

**Step 1: Read KHOJ source, web research current OpenAI API**

**Step 2: Write SKILL.md — Chat Completions, Assistants, tool use, embeddings, images**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/ai/skills/openai-api/SKILL.md armadillo.json
git commit -m "feat(ai): add openai-api skill"
```

### Task 21: Add postgresql-pgvector skill to database pack

**Files:**
- Create: `packs/database/skills/postgresql-pgvector/SKILL.md`
- Modify: `armadillo.json` — add `"postgresql-pgvector"` to `packs.database.skills`

**Step 1: Read KHOJ source, web research pgvector extension**

**Step 2: Write SKILL.md — vector storage, similarity search, indexing (IVFFlat, HNSW), hybrid search**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/database/skills/postgresql-pgvector/SKILL.md armadillo.json
git commit -m "feat(database): add postgresql-pgvector skill"
```

### Task 22: Add swr skill to state pack

**Files:**
- Create: `packs/state/skills/swr/SKILL.md`
- Modify: `armadillo.json` — add `"swr"` to `packs.state.skills`

**Step 1: Read KHOJ source, web research SWR (stale-while-revalidate)**

**Step 2: Write SKILL.md — data fetching, caching, mutation, revalidation, optimistic updates**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/state/skills/swr/SKILL.md armadillo.json
git commit -m "feat(state): add swr skill"
```

### Task 23: Add cleanup skill to core

**Files:**
- Create: `.claude/skills/cleanup/SKILL.md`
- Modify: `armadillo.json` — add `"cleanup"` to `core.skills`

**Step 1: Read nirvana source, rewrite generic**

**Step 2: Write SKILL.md — post-implementation cleanup: orphaned files, debug code, import organization, doc archival**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add .claude/skills/cleanup/SKILL.md armadillo.json
git commit -m "feat(core): add cleanup skill"
```

### Task 24: Add deps skill to core

**Files:**
- Create: `.claude/skills/deps/SKILL.md`
- Modify: `armadillo.json` — add `"deps"` to `core.skills`

**Step 1: Read nirvana source, rewrite generic**

**Step 2: Write SKILL.md — safe dependency management: audit, changelog review, test, rollback on failure**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add .claude/skills/deps/SKILL.md armadillo.json
git commit -m "feat(core): add deps skill"
```

### Task 25: Add safe-merge skill to core

**Files:**
- Create: `.claude/skills/safe-merge/SKILL.md`
- Modify: `armadillo.json` — add `"safe-merge"` to `core.skills`

**Step 1: Read nirvana source, rewrite generic**

**Step 2: Write SKILL.md — pre-merge quality gates: test pass, lint clean, no conflicts, changelog updated**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add .claude/skills/safe-merge/SKILL.md armadillo.json
git commit -m "feat(core): add safe-merge skill"
```

### Task 26: Add test-debug skill to core

**Files:**
- Create: `.claude/skills/test-debug/SKILL.md`
- Modify: `armadillo.json` — add `"test-debug"` to `core.skills`

**Step 1: Read nirvana source, rewrite generic**

**Step 2: Write SKILL.md — root-cause test failure diagnosis: read test + code + imports, classify failure type, targeted fix**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add .claude/skills/test-debug/SKILL.md armadillo.json
git commit -m "feat(core): add test-debug skill"
```

### Task 27: Add ingest-content skill to video pack

**Files:**
- Create: `packs/video/skills/ingest-content/SKILL.md`
- Modify: `armadillo.json` — add `"ingest-content"` to `packs.video.skills`

**Step 1: Read nirvana source, rewrite generic**

**Step 2: Write SKILL.md — content ingestion pipeline: AI classification, deduplication, metadata extraction for media files**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/video/skills/ingest-content/SKILL.md armadillo.json
git commit -m "feat(video): add ingest-content skill"
```

---

## Phase 4: Video Pack Extensions

### Task 28: Add render-video skill to video pack

**Files:**
- Create: `packs/video/skills/render-video/SKILL.md`
- Modify: `armadillo.json` — add `"render-video"` to `packs.video.skills`

**Step 1: Read nirvana source, web research Remotion rendering API**

**Step 2: Write SKILL.md — Remotion composition rendering: preview, single render, batch render, aspect ratios, platform presets**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/video/skills/render-video/SKILL.md armadillo.json
git commit -m "feat(video): add render-video skill"
```

### Task 29: Add create-supercut skill to video pack

**Files:**
- Create: `packs/video/skills/create-supercut/SKILL.md`
- Modify: `armadillo.json` — add `"create-supercut"` to `packs.video.skills`

**Step 1: Read nirvana source, web research supercut/compilation video patterns**

**Step 2: Write SKILL.md — transcript analysis, story arc generation, approval flow, render pipeline**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/video/skills/create-supercut/SKILL.md armadillo.json
git commit -m "feat(video): add create-supercut skill"
```

### Task 30: Add create-template skill to video pack

**Files:**
- Create: `packs/video/skills/create-template/SKILL.md`
- Modify: `armadillo.json` — add `"create-template"` to `packs.video.skills`

**Step 1: Read nirvana source, web research Remotion composition patterns**

**Step 2: Write SKILL.md — create Remotion compositions from design references: analyze visuals, generate matching code, register, test render**

**Step 3: Update armadillo.json**

**Step 4: Commit**

```bash
git add packs/video/skills/create-template/SKILL.md armadillo.json
git commit -m "feat(video): add create-template skill"
```

---

## Phase 5: Reference Skill Rewrites

Each reference skill gets the full `writing-reference-skills` treatment: **web research first** to get current API docs, then write from scratch. Nirvana versions are inspiration only — not source of truth.

### Task 31: Rewrite acuity-reference → add to new scheduling pack

**Files:**
- Create: `packs/scheduling/skills/acuity-scheduling/SKILL.md`
- Create: `packs/scheduling/skills/acuity-scheduling/reference.md`
- Modify: `armadillo.json` — add `scheduling` pack with `["acuity-scheduling"]`

**Step 1: Read nirvana `acuity-reference` for scope**

**Step 2: Web research current Acuity Scheduling API (now Squarespace Scheduling)**

**Step 3: Write SKILL.md + reference.md from scratch**

SKILL.md: compact quick-ref with frontmatter. reference.md: full API — appointments, availability, calendars, clients, certificates, webhooks.

**Step 4: Commit**

```bash
git add packs/scheduling/ armadillo.json
git commit -m "feat(scheduling): add acuity-scheduling reference skill"
```

### Task 32: Rewrite google-ads-api-reference → update existing google-apis pack

**Files:**
- Modify: `packs/google-apis/skills/google-ads-api/reference.md` (rewrite)

**Step 1: Read nirvana source for scope**

**Step 2: Web research current Google Ads API v17+ docs**

**Step 3: Rewrite reference.md from scratch — GAQL, campaign management, reporting, bidding strategies, conversion tracking**

**Step 4: Commit**

```bash
git add packs/google-apis/skills/google-ads-api/reference.md
git commit -m "docs(google-apis): rewrite google-ads-api reference with current v17 docs"
```

### Task 33: Rewrite meta-api-reference → add to ads pack

**Files:**
- Create: `packs/ads/skills/meta-api-reference/SKILL.md`
- Create: `packs/ads/skills/meta-api-reference/reference.md`
- Modify: `armadillo.json` — add `"meta-api-reference"` to `packs.ads.skills`

**Step 1: Read nirvana source for scope**

**Step 2: Web research current Meta Marketing API (v21.0+)**

**Step 3: Write SKILL.md + reference.md — Graph API, Marketing API, auth flows, rate limits, versioning, deprecation policy**

**Step 4: Commit**

```bash
git add packs/ads/skills/meta-api-reference/ armadillo.json
git commit -m "feat(ads): add meta-api-reference skill"
```

### Task 34: Rewrite pinterest-api-reference → add to ads pack

**Files:**
- Create: `packs/ads/skills/pinterest-api-reference/SKILL.md`
- Create: `packs/ads/skills/pinterest-api-reference/reference.md`
- Modify: `armadillo.json` — add `"pinterest-api-reference"` to `packs.ads.skills`

**Step 1: Read nirvana source for scope**

**Step 2: Web research current Pinterest API v5**

**Step 3: Write SKILL.md + reference.md — Pins, Boards, Ads, Audiences, Conversions, OAuth, rate limits**

**Step 4: Commit**

```bash
git add packs/ads/skills/pinterest-api-reference/ armadillo.json
git commit -m "feat(ads): add pinterest-api-reference skill"
```

### Task 35: Rewrite posthog-reference → update existing monitoring pack

**Files:**
- Modify: `packs/monitoring/skills/posthog/reference.md` (create if doesn't exist)

**Step 1: Read nirvana source for scope**

**Step 2: Web research current PostHog API docs**

**Step 3: Write reference.md — Capture API, Decide API, feature flags, experiments, batch events, person profiles**

**Step 4: Commit**

```bash
git add packs/monitoring/skills/posthog/
git commit -m "docs(monitoring): add posthog reference docs"
```

### Task 36: Rewrite resend-reference → update existing email pack

**Files:**
- Modify: `packs/email/skills/resend/reference.md` (create if doesn't exist)

**Step 1: Read nirvana source for scope**

**Step 2: Web research current Resend API docs**

**Step 3: Write reference.md — send email, batch, domains, API keys, webhooks, React Email integration**

**Step 4: Commit**

```bash
git add packs/email/skills/resend/
git commit -m "docs(email): add resend reference docs"
```

### Task 37: Rewrite turso-reference → add to database pack

**Files:**
- Create: `packs/database/skills/turso/SKILL.md`
- Create: `packs/database/skills/turso/reference.md`
- Modify: `armadillo.json` — add `"turso"` to `packs.database.skills`

**Step 1: Read nirvana source for scope**

**Step 2: Web research current Turso (libSQL) docs**

**Step 3: Write SKILL.md + reference.md — embedded replicas, libSQL client, Platform API, groups, locations**

**Step 4: Commit**

```bash
git add packs/database/skills/turso/ armadillo.json
git commit -m "feat(database): add turso reference skill"
```

### Task 38: Cloudinary reference already handled in Task 18

(Skip — cloudinary was written in Phase 2, Task 18)

---

## Phase 6: Rules (add to core)

Each rule gets stripped of project-specific content and rewritten generic. Rules go in `.claude/rules/` and get registered in `armadillo.json` `core.rules`.

### Task 39: Add 8 rules to core

**Files:**
- Create: `.claude/rules/security.md`
- Create: `.claude/rules/testing.md`
- Create: `.claude/rules/deployment-safety.md`
- Create: `.claude/rules/facebook-capi.md`
- Create: `.claude/rules/meta-api-versioning.md`
- Create: `.claude/rules/pinterest.md`
- Create: `.claude/rules/workflow-safety.md`
- Create: `.claude/rules/auto-branch.md`
- Modify: `armadillo.json` — add all 8 to `core.rules`

**Step 1: Read each nirvana rule source**

Read all 8 from `tmp-skill-audit/nirvana-rules/`: `security.md`, `testing.md`, `deployment-safety.md`, `facebook-capi.md`, `meta-api-versioning.md`, `pinterest.md`, `workflow-safety.md`, `auto-branch.md`

**Step 2: Rewrite each rule**

For each rule:
- Strip project-specific references (nirvana, specific URLs, specific database names)
- Keep the universal safety/quality principles
- Add `paths:` frontmatter if the rule should only activate for certain file types
- `security.md` — input validation, secret management, auth patterns
- `testing.md` — test quality standards, coverage expectations, test naming
- `deployment-safety.md` — pre-deploy checks, rollback plans, environment isolation
- `facebook-capi.md` — Meta CAPI event patterns, deduplication rules (scope to `paths: ["**/meta/**", "**/facebook/**"]`)
- `meta-api-versioning.md` — Meta API version pinning, upgrade patterns (scope to `paths: ["**/meta/**"]`)
- `pinterest.md` — Pinterest API patterns and rate limits (scope to `paths: ["**/pinterest/**"]`)
- `workflow-safety.md` — branch protection, PR requirements, deployment gates
- `auto-branch.md` — automatic branch creation before work, naming conventions

**Step 3: Update armadillo.json**

Add all 8 filenames to `core.rules` array:
```json
"security.md",
"testing.md",
"deployment-safety.md",
"facebook-capi.md",
"meta-api-versioning.md",
"pinterest.md",
"workflow-safety.md",
"auto-branch.md"
```

**Step 4: Commit**

```bash
git add .claude/rules/security.md .claude/rules/testing.md .claude/rules/deployment-safety.md .claude/rules/facebook-capi.md .claude/rules/meta-api-versioning.md .claude/rules/pinterest.md .claude/rules/workflow-safety.md .claude/rules/auto-branch.md armadillo.json
git commit -m "feat(core): add 8 rules — security, testing, deployment-safety, ads platform rules, workflow-safety, auto-branch"
```

---

## Phase 7: Agent Rewrites

Each agent gets rewritten generic. Agents go in `.claude/agents/` and get registered in `armadillo.json` `core.agents`.

### Task 40: Add api-reviewer agent

**Files:**
- Create: `.claude/agents/api-reviewer.md`
- Modify: `armadillo.json` — add `"api-reviewer.md"` to `core.agents`

**Step 1: Read nirvana `api-reviewer.md` for scope**

**Step 2: Write generic agent — reviews API endpoint implementations for security, REST patterns, error handling, validation**

Frontmatter:
```yaml
---
name: api-reviewer
description: |
  Use this agent to review API endpoint implementations for security,
  REST pattern compliance, error handling, input validation, and response consistency.
model: claude-sonnet-4-6
maxTurns: 15
---
```

**Step 3: Commit**

```bash
git add .claude/agents/api-reviewer.md armadillo.json
git commit -m "feat(core): add api-reviewer agent"
```

### Task 41: Add verifier agent

**Files:**
- Create: `.claude/agents/verifier.md`
- Modify: `armadillo.json` — add `"verifier.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — post-implementation verification: runs tests, checks types, validates output, confirms nothing broke**

**Step 3: Commit**

```bash
git add .claude/agents/verifier.md armadillo.json
git commit -m "feat(core): add verifier agent"
```

### Task 42: Add debugger agent

**Files:**
- Create: `.claude/agents/debugger.md`
- Modify: `armadillo.json` — add `"debugger.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — systematic debugging: reproduce, isolate, trace root cause, fix, verify**

**Step 3: Commit**

```bash
git add .claude/agents/debugger.md armadillo.json
git commit -m "feat(core): add debugger agent"
```

### Task 43: Add meta-docs-verifier agent

**Files:**
- Create: `.claude/agents/meta-docs-verifier.md`
- Modify: `armadillo.json` — add `"meta-docs-verifier.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — verifies Meta API documentation accuracy against live API behavior**

**Step 3: Commit**

```bash
git add .claude/agents/meta-docs-verifier.md armadillo.json
git commit -m "feat(core): add meta-docs-verifier agent"
```

### Task 44: Add facebook-pixel-expert agent

**Files:**
- Create: `.claude/agents/facebook-pixel-expert.md`
- Modify: `armadillo.json` — add `"facebook-pixel-expert.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — Meta Pixel implementation, CAPI integration, event deduplication, debugging**

**Step 3: Commit**

```bash
git add .claude/agents/facebook-pixel-expert.md armadillo.json
git commit -m "feat(core): add facebook-pixel-expert agent"
```

### Task 45: Add pinterest-expert agent

**Files:**
- Create: `.claude/agents/pinterest-expert.md`
- Modify: `armadillo.json` — add `"pinterest-expert.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — Pinterest Ads API, tag management, CAPI, audience targeting**

**Step 3: Commit**

```bash
git add .claude/agents/pinterest-expert.md armadillo.json
git commit -m "feat(core): add pinterest-expert agent"
```

### Task 46: Add posthog-expert agent

**Files:**
- Create: `.claude/agents/posthog-expert.md`
- Modify: `armadillo.json` — add `"posthog-expert.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — PostHog analytics, feature flags, experiments, session replay**

**Step 3: Commit**

```bash
git add .claude/agents/posthog-expert.md armadillo.json
git commit -m "feat(core): add posthog-expert agent"
```

### Task 47: Add cloudinary-expert agent

**Files:**
- Create: `.claude/agents/cloudinary-expert.md`
- Modify: `armadillo.json` — add `"cloudinary-expert.md"` to `core.agents`

**Step 1: Read nirvana source**

**Step 2: Write generic agent — Cloudinary media management, transformations, optimization, delivery**

**Step 3: Commit**

```bash
git add .claude/agents/cloudinary-expert.md armadillo.json
git commit -m "feat(core): add cloudinary-expert agent"
```

---

## Phase 8: Routing & Documentation Updates

### Task 48: Update armadillo-shepherd routing table

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`

**Step 1: Add routing entries for all new skills**

Add to the routing table sections:

**Ads & Social:**
```markdown
| Meta Ads campaigns, ad management | `meta-ads` |
| Meta audiences, lookalikes, retargeting | `meta-audiences` |
| Meta Conversions API, CAPI, pixel events | `meta-conversions` |
| Pinterest Ads, pin promotion | `pinterest-ads` |
| Meta auth verification, token debugging | `verify-meta-auth` |
```

**SEO:**
```markdown
| Full SEO optimization pipeline | `seo-flow` |
| Quick SEO health check, pulse | `seo-pulse` |
| Local SEO audit, NAP, GBP | `local-seo-audit` |
| Backlink analysis, link building | `link-analysis` |
| Keyword rankings, position tracking | `search-rank` |
| Site health report, Lighthouse | `site-report` |
```

**Python:**
```markdown
| Django project, views, URLs | `django` |
| Django models, querysets, migrations | `django-orm` |
| Django authentication, permissions | `django-auth` |
| FastAPI, async Python API | `fastapi` |
```

**Media:**
```markdown
| Cloudinary uploads, transformations | `cloudinary` |
```

**Video (extend existing):**
```markdown
| Render Remotion compositions | `render-video` |
| Supercut compilation videos | `create-supercut` |
| New Remotion templates from design | `create-template` |
| Ingest media content | `ingest-content` |
```

**Core (extend existing):**
```markdown
| Post-implementation cleanup | `cleanup` |
| Dependency management, audit | `deps` |
| Pre-merge quality gates | `safe-merge` |
| Test failure diagnosis | `test-debug` |
```

**Database (extend existing):**
```markdown
| Turso, libSQL, embedded replicas | `turso` |
| PostgreSQL vectors, pgvector | `postgresql-pgvector` |
```

**AI (extend existing):**
```markdown
| Google Gemini, generative AI | `google-genai` |
| OpenAI API, GPT, embeddings | `openai-api` |
```

**State (extend existing):**
```markdown
| SWR data fetching, React stale-while-revalidate | `swr` |
```

**Scheduling:**
```markdown
| Acuity/Squarespace scheduling | `acuity-scheduling` |
```

**Step 2: Commit**

```bash
git add .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat(core): update shepherd routing table with all new skills"
```

### Task 49: Regenerate CLAUDE.md and README.md

**Files:**
- Modify: `.claude/CLAUDE.md` (auto-generated)
- Modify: `README.md` (auto-generated)

**Step 1: Run build-claude-md script**

```bash
node scripts/build-claude-md.js
```

**Step 2: Run update-readme script**

```bash
node scripts/update-readme.js
```

**Step 3: Verify output includes all new packs and skills**

Check that CLAUDE.md has entries for ads, seo, python, cloudinary, scheduling packs and all new skills.

**Step 4: Commit**

```bash
git add .claude/CLAUDE.md README.md
git commit -m "docs: regenerate CLAUDE.md and README.md with expanded skill packs"
```

### Task 50: Run full test suite and fix

**Files:**
- Possibly modify: `tests/repo-structure.test.js` if counts need adjustment

**Step 1: Run all tests**

```bash
node --test tests/*.test.js
```

**Step 2: Fix any failures**

If pack count, agent count, or rule count assertions fail, adjust the floor numbers.

**Step 3: Commit if fixes needed**

```bash
git add tests/
git commit -m "test: fix test assertions for expanded pack counts"
```

### Task 51: Clean up temp audit files

**Files:**
- Delete: `tmp-skill-audit/` directory

**Step 1: Remove temp directory**

```bash
rm -rf tmp-skill-audit/
```

**Step 2: Verify it's not tracked in git**

```bash
git status
```

**Step 3: Commit .gitignore if needed (or just verify it was already untracked)**

---

## Parallelization Guide

These task groups can run in parallel (no shared files):

**Group A (ads pack skills):** Tasks 3, 4, 5, 6, 7 — each creates a different `packs/ads/skills/*/SKILL.md`

**Group B (seo pack skills):** Tasks 8, 9, 10, 11, 12, 13 — each creates a different `packs/seo/skills/*/SKILL.md`

**Group C (python pack skills):** Tasks 14, 15, 16, 17 — each creates a different `packs/python/skills/*/SKILL.md`

**Group D (tier-1 drop-ins to existing packs):** Tasks 19, 20, 21, 22 — each creates in different pack dirs, BUT they all modify `armadillo.json` so must be sequential

**Group E (core drop-ins):** Tasks 23, 24, 25, 26 — each creates different `.claude/skills/*/SKILL.md`, BUT they all modify `armadillo.json` so must be sequential

**Group F (video extensions):** Tasks 27, 28, 29, 30 — each creates different `packs/video/skills/*/SKILL.md`, BUT they all modify `armadillo.json` so must be sequential

**Group G (reference rewrites):** Tasks 31-37 — each modifies different pack dirs, some modify `armadillo.json` so must be sequential

**Group H (agents):** Tasks 40-47 — each creates different `.claude/agents/*.md`, BUT they all modify `armadillo.json` so must be sequential

**Recommended execution:** Run Groups A, B, C in parallel (no armadillo.json conflicts). Then D, E, F, G sequentially (armadillo.json). Then H. Then Phase 8 tasks (48, 49, 50, 51) sequentially.

---

## Summary

| Phase | Tasks | Items | Parallelizable |
|-------|-------|-------|----------------|
| 1. Infrastructure | 1-2 | Test updates, scaffolding | Sequential |
| 2. New pack skills | 3-18 | 16 new SKILL.md files | Groups A/B/C parallel |
| 3. Tier-1 drop-ins | 19-27 | 9 skills to existing packs + core | Sequential (armadillo.json) |
| 4. Video extensions | 28-30 | 3 new video skills | Sequential (armadillo.json) |
| 5. Reference rewrites | 31-37 | 7 reference skill rewrites | Sequential (armadillo.json) |
| 6. Rules | 39 | 8 new rules (one task) | Single task |
| 7. Agents | 40-47 | 8 new agents | Sequential (armadillo.json) |
| 8. Routing & docs | 48-51 | Shepherd, CLAUDE.md, tests, cleanup | Sequential |

**Total: 51 tasks · ~50 new files · 4 new packs + 1 new pack (scheduling) from reference rewrite**
