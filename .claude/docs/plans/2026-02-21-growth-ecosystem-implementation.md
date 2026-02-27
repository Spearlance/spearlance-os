# Growth Ecosystem Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Implement 23 skills (17 new, 3 rewrites, 3 updates) across SEO, CRO, Performance, Google APIs, and Monitoring packs — plus 5 workflow orchestrators, shepherd routing, and manifest wiring.

**Architecture:** Each skill is a standalone SKILL.md (workflow skills) or SKILL.md + reference.md pair (reference skills) inside `packs/<pack>/skills/<skill-name>/`. The manifest (`armadillo.json`) registers all skills per pack, and `scripts/build-claude-md.js` auto-generates `.claude/CLAUDE.md` from it. The shepherd routing table (`.claude/skills/armadillo-shepherd/SKILL.md`) must be updated to route requests to new skills.

**Tech Stack:** Markdown (skill files), JSON (armadillo.json), Node.js (build scripts)

**Design doc:** `.claude/docs/plans/2026-02-21-growth-ecosystem-design.md`

**Reference architecture:** `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/` (server-side tracking patterns — READ ONLY)

---

## Batch Structure

Skills are organized into batches that can be parallelized internally. Each batch completes before the next starts because later batches depend on earlier ones (e.g., orchestrators reference component skills).

| Batch | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-2 | Infrastructure — new pack dirs, manifest wiring |
| 2 | 3-8 | Reference skills — API/tool knowledge (no cross-references) |
| 3 | 9-18 | Workflow skills — SEO rewrites + new workflow skills |
| 4 | 19-23 | Orchestrators — chain skills from batches 2-3 |
| 5 | 24-25 | Integration — shepherd routing + PostHog update |
| 6 | 26-27 | Validation — sync-all, build-claude-md, final verify |

---

## Batch 1: Infrastructure

### Task 1: Create new pack directories

**Files:**
- Create: `packs/cro/skills/.gitkeep` (directory structure)
- Create: `packs/performance/skills/.gitkeep` (directory structure)

**Step 1: Create CRO pack directory**

```bash
mkdir -p packs/cro/skills
```

**Step 2: Create Performance pack directory**

```bash
mkdir -p packs/performance/skills
```

**Step 3: Verify directories exist**

```bash
ls -la packs/cro/skills/
ls -la packs/performance/skills/
```

Expected: Both directories exist.

**Step 4: Commit**

```bash
git add packs/cro/ packs/performance/
git commit -m "chore: create cro and performance pack directories"
```

---

### Task 2: Update armadillo.json manifest

**Files:**
- Modify: `armadillo.json`

**Step 1: Read current armadillo.json**

Read the full file to understand structure.

**Step 2: Add CRO pack to manifest**

In `armadillo.json` → `packs` object, add after the `cloudinary` entry:

```json
"cro": {
  "description": "CRO audit, A/B testing, landing page optimization, Microsoft Clarity, server-side tracking",
  "skills": [
    "cro-audit",
    "ab-testing",
    "landing-page-cro",
    "microsoft-clarity",
    "server-side-tracking"
  ]
}
```

**Step 3: Add Performance pack to manifest**

In `armadillo.json` → `packs` object, add:

```json
"performance": {
  "description": "Core Web Vitals diagnosis, CrUX field data API, performance budgets",
  "skills": [
    "web-performance",
    "crux-api"
  ]
}
```

**Step 4: Update SEO pack skills list**

Replace the SEO pack's `skills` array with:

```json
"seo": {
  "description": "SEO audit, pulse checks, local SEO, link analysis, rank tracking, site reports, schema markup, reviews, content strategy, AI visibility, workflow orchestrators",
  "skills": [
    "seo-audit",
    "seo-pulse",
    "local-seo-audit",
    "search-rank",
    "link-analysis",
    "site-report",
    "schema-markup",
    "review-management",
    "content-strategy",
    "ai-visibility",
    "client-audit",
    "monthly-pulse",
    "cro-sprint",
    "local-growth",
    "tracking-foundation"
  ]
}
```

Note: `seo-flow` is renamed to `seo-audit`. The old `seo-flow` directory will be renamed in the rewrite task.

**Step 5: Add google-tag-manager to google-apis pack**

Add `"google-tag-manager"` to the `google-apis.skills` array:

```json
"google-apis": {
  "description": "GA4, Ads, Search Console, Business Profile, Lighthouse, YouTube, Places, Tag Manager",
  "skills": [
    "ga4-api",
    "google-ads-api",
    "google-business-profile-api",
    "google-places-api",
    "google-search-console-api",
    "lighthouse-api",
    "youtube-data-api",
    "google-tag-manager"
  ]
}
```

**Step 6: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('armadillo.json','utf8')); console.log('✓ valid JSON')"
```

Expected: `✓ valid JSON`

**Step 7: Commit**

```bash
git add armadillo.json
git commit -m "feat(manifest): register cro, performance packs + seo expansion + google-tag-manager"
```

---

## Batch 2: Reference Skills (parallelizable — all independent)

These skills document external APIs/tools. They have no cross-references to other new skills. Each creates a `SKILL.md` + `reference.md` pair.

### Task 3: Write microsoft-clarity reference skill

**Files:**
- Create: `packs/cro/skills/microsoft-clarity/SKILL.md`
- Create: `packs/cro/skills/microsoft-clarity/reference.md`

**Step 1: Research latest Microsoft Clarity docs**

Use WebSearch/WebFetch to verify latest API details from `https://learn.microsoft.com/en-us/clarity/`. Key areas:
- Consent V2 API (required since Oct 2025 for EEA/UK)
- AI Chat Channel Groups for LLM referral tracking
- Data Export API with JWT auth
- Smart Events: dead clicks, rage clicks, excessive scroll, quick backs
- Copilot AI: natural language insight queries

**Step 2: Create SKILL.md**

Create `packs/cro/skills/microsoft-clarity/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: microsoft-clarity
description: Use when implementing Microsoft Clarity for heatmaps, session recordings, smart events, AI insights, or consent management. Also use when analyzing user behavior, identifying UX friction, or setting up LLM referral tracking.
---
```

Content sections (see design doc for structure):
- Overview with quick reference table (free tier, setup, key features)
- Setup: `npm install @microsoft/clarity`, script tag, consent API
- Consent V2: `window.clarity('consent')` / `window.clarity('set', 'consent', false)`, EEA/UK requirement
- Heatmaps: click, scroll, area — interpretation guide with actionable patterns
- Session Recordings: filtering by smart events, rage clicks, dead clicks
- Smart Events: built-in rage click/dead click/excessive scroll/quick back/scripting error detection
- Copilot AI: natural language queries for insights
- AI Chat Channel Groups: configuration for ChatGPT/Claude/Gemini/Copilot referral tracking
- Data Export API: JWT authentication, dashboard data export
- Integration patterns: alongside GA4 and PostHog

**Step 3: Create reference.md**

Create `packs/cro/skills/microsoft-clarity/reference.md` with detailed API reference:
- Client-side API: `window.clarity()` methods — `identify`, `consent`, `set`, `event`, `upgrade`
- Custom identifiers and custom tags
- Data Export API endpoints: authentication flow, export request, polling, download
- Smart Event types and thresholds
- Clarity Copilot prompt patterns
- AI Chat Channel Group configuration steps

**Step 4: Commit**

```bash
git add packs/cro/skills/microsoft-clarity/
git commit -m "feat(cro): add microsoft-clarity reference skill"
```

---

### Task 4: Write crux-api reference skill

**Files:**
- Create: `packs/performance/skills/crux-api/SKILL.md`
- Create: `packs/performance/skills/crux-api/reference.md`

**Step 1: Research latest CrUX API docs**

Use WebSearch/WebFetch to verify from `https://developer.chrome.com/docs/crux/api` and `https://developer.chrome.com/docs/crux/`. Key areas:
- API endpoint and authentication
- Rate limits (150 QPM free)
- Origin-level vs URL-level queries
- Form factor filtering
- Metrics: LCP, CLS, INP — p75, histogram, good/NI/poor thresholds
- Data freshness: 28-day rolling, daily ~04:00 UTC
- History API: monthly snapshots
- BigQuery CrUX dataset

**Step 2: Create SKILL.md**

Create `packs/performance/skills/crux-api/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: crux-api
description: Use when querying Chrome UX Report field data, comparing lab vs field metrics, tracking Core Web Vitals trends, or correlating performance with search rankings. Also use when verifying CWV pass rates or checking p75 thresholds.
---
```

Sections:
- Overview + quick reference (endpoint, auth, rate limits, data freshness)
- Querying: origin-level, URL-level, form factor filtering
- Metrics: LCP, CLS, INP with thresholds table (Good < X, NI < Y, Poor ≥ Y)
- Response parsing: histogram buckets, p75 extraction, percentile calculation
- History API: monthly snapshots for trend analysis
- BigQuery: CrUX dataset for historical deep dives
- Integration: correlate with GSC ranking changes, Lighthouse lab data comparison
- Practical patterns: before/after tracking, performance budgets from field data

**Step 3: Create reference.md**

Detailed API reference:
- POST `https://chromeuxreport.googleapis.com/v1/records:queryRecord`
- POST `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord`
- Request body schema (origin/url, formFactor, metrics)
- Response schema (record, urlNormalizationDetails, key)
- Rate limiting: 150 QPM, API key required
- Error codes and handling
- Code examples: Node.js fetch patterns

**Step 4: Commit**

```bash
git add packs/performance/skills/crux-api/
git commit -m "feat(performance): add crux-api reference skill"
```

---

### Task 5: Write google-tag-manager reference skill

**Files:**
- Create: `packs/google-apis/skills/google-tag-manager/SKILL.md`
- Create: `packs/google-apis/skills/google-tag-manager/reference.md`

**Step 1: Research latest GTM docs**

Use WebSearch/WebFetch to verify from `https://developers.google.com/tag-platform/tag-manager`. Key areas:
- GTM API v2 (container, workspace, tag, trigger, variable management)
- Server-side tagging (sGTM) setup and architecture
- Consent Mode v2 (defaults, updates, per-tag consent, required since March 2024 in EEA)
- Data layer: `dataLayer.push()` patterns
- April 2025 auto-loading Google tag change

**Step 2: Create SKILL.md**

Create `packs/google-apis/skills/google-tag-manager/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: google-tag-manager
description: Use when setting up Google Tag Manager, configuring data layers, managing tags and triggers, implementing server-side tagging, or configuring Consent Mode v2. Also use when debugging tag firing, managing workspaces, or integrating GTM with GA4/Meta/Pinterest.
---
```

Sections:
- Overview + quick reference (web container, sGTM, API)
- Web Container Setup: snippet placement, environments
- Data Layer: `dataLayer.push()` patterns, standard event names, ecommerce
- Tags: GA4 config + event, Meta Pixel, Pinterest Tag, Clarity, custom HTML
- Triggers: custom events, form submission, scroll depth, element visibility, timer
- Variables: data layer variable, URL, cookie, constant, custom JavaScript
- Server-Side Tagging: sGTM architecture, client proxy, first-party domain, benefits
- Consent Mode v2: default consent state, update commands, per-tag consent, EEA requirements
- Debug: Preview mode, Tag Assistant, GTM/GA4 DebugView
- API: Tag Manager API v2 for programmatic management

**Step 3: Create reference.md**

Detailed API reference:
- Tag Manager API v2 endpoints: accounts, containers, workspaces, tags, triggers, variables, versions
- Data layer event schema standards
- sGTM Client API
- Consent Mode v2 implementation code
- Common tag configurations (GA4, Meta, Pinterest, Clarity)

**Step 4: Commit**

```bash
git add packs/google-apis/skills/google-tag-manager/
git commit -m "feat(google-apis): add google-tag-manager reference skill"
```

---

### Task 6: Write server-side-tracking skill

**Files:**
- Create: `packs/cro/skills/server-side-tracking/SKILL.md`
- Create: `packs/cro/skills/server-side-tracking/reference.md`

This is the crown jewel — codifies the nirvana-pmu tracking architecture.

**Step 1: Read nirvana-pmu reference files (READ ONLY)**

Read the following files from `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/` for reference patterns:
- `src/pages/api/track.ts` — unified tracking endpoint
- `src/lib/tracking/consent.ts` — two-tier consent (analytics/marketing)
- `src/lib/tracking/hash.ts` — SHA-256 PII hashing with normalization
- `src/lib/tracking/types.ts` — core types
- `src/lib/tracking/cookies.ts` — cookie extraction
- `src/lib/platforms/meta/capi.ts` — Meta CAPI patterns
- `src/lib/platforms/google/ga4.ts` — GA4 Measurement Protocol
- `src/lib/platforms/pinterest/capi.ts` — Pinterest CAPI
- `src/lib/platforms/posthog/client.ts` — PostHog server SDK
- `AD-INFRASTRUCTURE.md` — 7-layer architecture overview

**Step 2: Create SKILL.md**

Create `packs/cro/skills/server-side-tracking/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: server-side-tracking
description: Use when implementing server-side tracking, building a unified /api/track endpoint, setting up Conversions API fan-out to Meta/GA4/Pinterest/PostHog, configuring consent management, or implementing PII hashing. Also use when debugging event deduplication, attribution models, or CAPI health.
---
```

Sections (from design doc — must include complete reference code patterns from nirvana-pmu):

1. **Architecture** — Unified `/api/track` endpoint, 7-layer diagram (client event → API route → consent check → PII hash → server enrichment → platform fan-out → response), why server-side wins over client-side
2. **Tracking Pipeline** — Cookie extraction (`fbp`, `fbc`, `_ga` GS1/GS2, `_ga_session`, `gcl_aw`, `epik`, `_pin_unauth`, consent cookie), IP extraction (x-forwarded-for, cf-connecting-ip, x-real-ip), PII hashing (SHA-256 with normalization — lowercase, trim, E.164 phone, Gmail dot/plus stripping for EMQ)
3. **Consent Framework** — Two-tier model: analytics (GA4, PostHog — always fire) vs marketing (Meta, Pinterest, Google Ads — consent-gated), GPC header check (`Sec-GPC: 1`), consent cookie format, `shouldTrack()` per-platform function
4. **Platform Fan-Out** — Implementation patterns for each platform:
   - Meta CAPI: event mapping, hashed PII (both with-dots and without-dots for Gmail EMQ), fbp/fbc cookies, event_id dedup, test event codes
   - GA4 Measurement Protocol: client_id + engagement_time_msec + session_id requirements, Enhanced Conversions user_data, mp_key auth
   - Pinterest CAPI v5: underscore event names, `_epik` click attribution, `_pin_unauth` partner_id, skip if no identifiers
   - PostHog server: serverless config (flushAt=1, flushInterval=0, disableGeoip=true), hashed email as distinctId
   - Google Ads: batch cron upload pattern (daily)
5. **Event Taxonomy** — Standard events (PageView, Lead, Contact, Purchase, Schedule), platform-specific mapping table, custom event data fields, value and currency fallback logic
6. **Attribution** — 4 models: first click, last click, scientific (Hyros-style: short window → first, long window → last), linear. Identity resolution via email stitching. Touchpoint storage schema (Turso/Postgres).
7. **Cron Infrastructure** — Daily sync schedule, CAPI health check cron, Google Ads batch upload, database cleanup
8. **Launch Checklist** — Per-platform verification steps: test event, dedup check, consent enforcement test, hash verification, cookie extraction test
9. **Safety Gates** — Always return 200 (never break client), PAUSED campaign check, budget ceiling awareness, PII never in logs, `Promise.allSettled` for resilient fan-out

**Step 3: Create reference.md**

Detailed implementation reference:
- Complete TypeScript type definitions (ConversionEvent, ServerEnrichment, ConsentStatus, TrackingCookies)
- Cookie extraction code patterns
- PII hashing functions with normalization
- Consent check implementation
- Platform-specific API call patterns with authentication
- Error handling and retry patterns
- Environment variables needed per platform
- Test event verification commands

**Step 4: Commit**

```bash
git add packs/cro/skills/server-side-tracking/
git commit -m "feat(cro): add server-side-tracking skill — unified CAPI pipeline"
```

---

### Task 7: Write landing-page-cro skill

**Files:**
- Create: `packs/cro/skills/landing-page-cro/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/cro/skills/landing-page-cro/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: landing-page-cro
description: Use when optimizing service business landing pages — hero sections, CTAs, social proof, objection handling, form UX, or mobile conversion. Also use when auditing a landing page for conversion rate improvement.
---
```

This is a workflow skill (no reference.md needed). Sections from design doc:

1. **Above-the-Fold** — Hero headline (benefit-first, max 8 words), sub-headline (proof/specificity), primary CTA (action verb + outcome, high contrast, above fold), trust badges (BBB, Google rating, industry certs), imagery (real team/work photos > stock)
2. **Social Proof Architecture** — Review widgets (Google, Yelp, industry), testimonial placement (near objections), before/after galleries (service businesses), client logos/counts, "as seen in" media mentions
3. **Objection Handling** — FAQ section (address top 3 objections), pricing transparency (range or "starting at"), risk reversal (guarantees, free estimates), process section ("here's how it works" — 3 steps)
4. **CTA Strategy** — Repeat cadence (every 2 scroll depths), secondary CTAs (phone number, chat), mobile sticky CTA bar, form optimization (max 5 fields, multi-step for complex), click-to-call prominence on mobile
5. **Mobile CRO** — Thumb zone layout, click-to-call button, appropriate input types (tel, email), load speed impact on conversion, scroll depth analysis

Output template:

```
# Landing Page CRO Audit — [Page] — [Date]

## Above-the-Fold
| Element | Present | Quality | Recommendation |
|---------|---------|---------|----------------|

## Social Proof
| Type | Present | Location | Recommendation |
|------|---------|----------|----------------|

## Objection Handling
| Objection | Addressed | How | Recommendation |
|-----------|-----------|-----|----------------|

## CTA Analysis
| CTA | Location | Text | Contrast | Recommendation |
|-----|----------|------|----------|----------------|

## Mobile Experience
| Factor | Score | Issue | Fix |
|--------|-------|-------|-----|
```

**Step 2: Commit**

```bash
git add packs/cro/skills/landing-page-cro/
git commit -m "feat(cro): add landing-page-cro workflow skill"
```

---

### Task 8: Write ab-testing skill

**Files:**
- Create: `packs/cro/skills/ab-testing/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/cro/skills/ab-testing/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: ab-testing
description: Use when designing, implementing, monitoring, or analyzing A/B tests. Also use when calculating sample sizes, setting up PostHog experiments, checking statistical significance, or documenting experiment results.
---
```

Workflow skill — 6-phase lifecycle using PostHog experiments. Sections from design doc:

1. **Phase 1: Hypothesis** — Template: "Changing [X] will increase [Y] by [Z]% because [reason]". Must state element, metric, expected lift, and reasoning.
2. **Phase 2: Sample Size Calculation** — MDE (minimum detectable effect), baseline conversion rate, significance level (default 95%), statistical power (default 80%), duration estimation formula. Include inline calculation: `n = (Zα/2 + Zβ)² × 2p(1-p) / δ²`
3. **Phase 3: Implementation** — PostHog feature flag creation, variant code implementation, event tracking for goal metric. Reference `posthog` skill for API details.
4. **Phase 4: Monitoring** — SRM (sample ratio mismatch) check formula and threshold, early stopping rules (only stop early if 99.5% significance), interim analysis schedule
5. **Phase 5: Analysis** — Statistical significance calculation, practical significance (absolute pp lift), confidence intervals, decision framework (SHIP if stat + practical sig, ITERATE if stat sig but small practical, DISCARD if neither)
6. **Phase 6: Documentation** — Archive template with hypothesis, design parameters, results, decision, learnings

Anti-patterns section: peeking (checking results too early), stopping early without correction, changing metrics mid-test, testing too many variants, running tests without enough traffic

Output template (from design doc — the full A/B Test results template):

```
# A/B Test: [Name] — [Date]

## Hypothesis
Changing [element] from [control] to [variant] will increase [metric] by [MDE]%
because [reasoning].

## Design
| Parameter | Value |
|-----------|-------|
| Metric | [metric] |
| Baseline | [rate] |
| MDE | [%] |
| Significance | 95% |
| Power | 80% |
| Sample needed | [n] per variant |
| Est. duration | [days] |

## Results
| Variant | Sessions | Conversions | Rate | vs Control |
|---------|----------|-------------|------|------------|

Statistical significance: [%] [✓/✗]
Practical significance: [pp] [✓/✗]

## Decision: [SHIP / ITERATE / DISCARD]
```

**Step 2: Commit**

```bash
git add packs/cro/skills/ab-testing/
git commit -m "feat(cro): add ab-testing workflow skill"
```

---

## Batch 3: Workflow Skills (parallelizable within sub-groups)

### Task 9: Rename seo-flow → seo-audit directory

**Files:**
- Rename: `packs/seo/skills/seo-flow/` → `packs/seo/skills/seo-audit/`

**Step 1: Rename the directory**

```bash
mv packs/seo/skills/seo-flow packs/seo/skills/seo-audit
```

**Step 2: Verify rename**

```bash
ls packs/seo/skills/seo-audit/SKILL.md
```

Expected: File exists.

**Step 3: Commit the rename**

```bash
git add packs/seo/skills/seo-flow packs/seo/skills/seo-audit
git commit -m "refactor(seo): rename seo-flow → seo-audit"
```

---

### Task 10: Rewrite seo-audit SKILL.md

**Files:**
- Modify: `packs/seo/skills/seo-audit/SKILL.md`

**Step 1: Read current seo-flow SKILL.md** (now at seo-audit path)

Read the full file to understand current structure.

**Step 2: Rewrite SKILL.md**

Update the SKILL.md with these changes from design doc:

- Update frontmatter: `name: seo-audit`, update description
- Rename title: "SEO Audit" (was "SEO Flow")
- Add Phase 2.5: **AI Citation Check** — invoke `ai-visibility` to check if LLMs are citing this site
- Add Phase 4.5: **Performance Deep Dive** — invoke `web-performance` when CWV fails Lighthouse threshold (instead of inline perf advice)
- Add Phase 5.5: **Structured Data** — invoke `schema-markup` for deep schema audit (instead of inline schema checks)
- Update Phase 6 report format: include CRO callouts section — "pages with high traffic but low conversion → suggest `cro-audit`"
- Add prerequisite: cross-reference `server-side-tracking` to verify analytics foundation before pulling data
- Update all cross-references to use new skill names
- Keep the 8-phase structure but insert the new sub-phases

**Step 3: Commit**

```bash
git add packs/seo/skills/seo-audit/SKILL.md
git commit -m "feat(seo): rewrite seo-audit — add AI, performance, schema cross-references"
```

---

### Task 11: Rewrite seo-pulse SKILL.md

**Files:**
- Modify: `packs/seo/skills/seo-pulse/SKILL.md`

**Step 1: Read current seo-pulse SKILL.md**

Read the full file.

**Step 2: Rewrite SKILL.md**

Changes from design doc:
- Add Phase 6: **AI Citation Pulse** — quick LLM citation check (shortened version of `ai-visibility`)
- Add Phase 7: **Conversion Health** — quick funnel check via GA4/PostHog data (conversion rate trend, form completion rate, phone click rate)
- Cross-reference `crux-api` for field data instead of inline PageSpeed calls
- Add tracking health check: "Are all platforms receiving events? Is CAPI healthy?" (reference `server-side-tracking` launch checklist)
- Update output template with new sections

**Step 3: Commit**

```bash
git add packs/seo/skills/seo-pulse/SKILL.md
git commit -m "feat(seo): rewrite seo-pulse — add AI pulse, conversion health, CrUX"
```

---

### Task 12: Rewrite local-seo-audit SKILL.md

**Files:**
- Modify: `packs/seo/skills/local-seo-audit/SKILL.md`

**Step 1: Read current local-seo-audit SKILL.md**

Read the full file.

**Step 2: Rewrite SKILL.md**

Changes from design doc:
- Add Section 8: **AI Citation Monitoring** — track ChatGPT/Claude/Gemini/Perplexity mentions for local queries. Reference Clarity's AI Chat Channel Groups for LLM referral traffic measurement.
- Add Section 9: **Review Management** — cross-reference `review-management` skill for review generation strategy and monitoring
- Add GBP post frequency tracking and recommendations (optimal: 1-2 posts/week with CTA)
- Update citation sources — add Apple Business Connect (replaced Apple Maps Connect in 2023), verify Bing Places still active
- Update schema recommendations to reference `schema-markup` skill
- Keep NAP audit core intact

**Step 3: Commit**

```bash
git add packs/seo/skills/local-seo-audit/SKILL.md
git commit -m "feat(seo): rewrite local-seo-audit — add AI monitoring, review management, Apple Business"
```

---

### Task 13: Rewrite site-report SKILL.md

**Files:**
- Modify: `packs/seo/skills/site-report/SKILL.md`

**Step 1: Read current site-report SKILL.md**

Read the full file.

**Step 2: Rewrite SKILL.md**

Changes from design doc:
- Add Section: **CRO Metrics** — conversion rate, form completion rate, phone clicks, chat engagement
- Add Section: **Tracking Health** — all platforms receiving events? CAPI health status? Event dedup working?
- Add Section: **AI Visibility** — LLM citation check results, AI referral traffic
- Add Section: **Performance Trends** — CrUX field data trends (not just lab Lighthouse scores), month-over-month p75 changes
- Add Section: **Review Health** — review count, average rating, recency, response rate, platform coverage
- Upgrade HTML template: add tabbed navigation for sections, sparkline charts via inline SVG for trends
- Keep the parallel subagent architecture (6 subagents) but expand to cover new sections

**Step 3: Commit**

```bash
git add packs/seo/skills/site-report/SKILL.md
git commit -m "feat(seo): rewrite site-report — add CRO, tracking, AI, performance, reviews"
```

---

### Task 14: Update search-rank SKILL.md

**Files:**
- Modify: `packs/seo/skills/search-rank/SKILL.md`

**Step 1: Read current search-rank SKILL.md**

Read the full file.

**Step 2: Update SKILL.md**

Additions from design doc (append to existing content, don't rewrite):
- Add section: **AI Search Intent Classification** — identify keywords where LLMs answer instead of SERP (zero-click AI queries). These keywords are losing click value — flag them for content adjustment.
- Add section: **Zero-Click Detection** — keywords dominated by featured snippets, AI Overviews, People Also Ask. Mark which keywords still drive clicks vs. which are "answered in SERP" — prioritize content for keywords with click potential.
- Cross-reference `ai-visibility` skill for deeper AI citation analysis

**Step 3: Commit**

```bash
git add packs/seo/skills/search-rank/SKILL.md
git commit -m "feat(seo): update search-rank — add AI intent classification, zero-click detection"
```

---

### Task 15: Update link-analysis SKILL.md

**Files:**
- Modify: `packs/seo/skills/link-analysis/SKILL.md`

**Step 1: Read current link-analysis SKILL.md**

Read the full file.

**Step 2: Update SKILL.md**

Additions from design doc:
- Add section: **AI Citation as Link Equivalent** — being cited by ChatGPT/Claude/Gemini is the new backlink. Track which competitor content gets AI citations. Structure content to be citable (clear facts, structured data, authoritative claims).
- Add section: **AI-Optimized Content Structure** — how to structure content for LLM citation: clear topic sentences, factual claims with sources, structured data, FAQ format, concise definitions
- Cross-reference `ai-visibility` for systematic citation monitoring

**Step 3: Commit**

```bash
git add packs/seo/skills/link-analysis/SKILL.md
git commit -m "feat(seo): update link-analysis — add AI citation, AI-optimized content"
```

---

### Task 16: Write schema-markup skill

**Files:**
- Create: `packs/seo/skills/schema-markup/SKILL.md`

**Step 1: Research latest schema.org and Google structured data docs**

Use WebSearch/WebFetch to verify from `https://developers.google.com/search/docs/appearance/structured-data` and `https://schema.org`. Check:
- Current supported rich result types
- Latest JSON-LD best practices
- Schema types relevant to service businesses

**Step 2: Create SKILL.md**

Create `packs/seo/skills/schema-markup/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: schema-markup
description: Use when auditing structured data, implementing JSON-LD schemas, checking rich result eligibility, or adding schema types for service businesses. Also use when fixing schema validation errors or optimizing for Google rich results.
---
```

6-section workflow skill from design doc:
1. Schema Inventory — scan all JSON-LD blocks in codebase
2. Completeness Audit — required vs recommended properties per type
3. Rich Result Eligibility — which pages qualify for enhanced SERP features
4. Schema Templates — complete JSON-LD for service business types (LocalBusiness + subtypes, Service, ServiceArea, FAQPage, HowTo, Article/BlogPosting, BreadcrumbList, WebSite+SearchAction, Review/AggregateRating, Event, VideoObject, Organization+ContactPoint)
5. Validation — automated validation against schema.org + Rich Results Test API
6. Implementation — atomic commits per schema addition, TDD approach

Include the output template from design doc.

**Step 3: Commit**

```bash
git add packs/seo/skills/schema-markup/
git commit -m "feat(seo): add schema-markup workflow skill"
```

---

### Task 17: Write review-management skill

**Files:**
- Create: `packs/seo/skills/review-management/SKILL.md`

**Step 1: Research latest review platform best practices**

Use WebSearch for:
- Google Business Profile review policies (2025-2026)
- Yelp solicitation policy
- Review schema (AggregateRating, Review)

**Step 2: Create SKILL.md**

Create `packs/seo/skills/review-management/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: review-management
description: Use when building a review generation strategy, monitoring reviews, creating response templates, or implementing review schema. Also use when auditing review health, setting up Google review links, or managing reputation.
---
```

6-section workflow from design doc:
1. Review Audit — count, rating, recency, platform coverage (Google, Yelp, Facebook, industry-specific), competitor comparison
2. Generation Strategy — ask flows (post-service email/SMS, timing — 24-48h after service), QR codes for in-person, Google review link shortcut, NPS-gated asking
3. Response Templates — positive review response (personalized, specific, brief), negative review response (acknowledge, apologize, take offline), fake review handling (flag process per platform)
4. Schema — Review + AggregateRating JSON-LD (live data from API, never hardcoded). Reference `schema-markup` for implementation.
5. Monitoring — Google Alerts for brand mentions, platform notification setup, weekly pulse check, alert on negative review (< 3 stars)
6. Platform-Specific — Google (reply within 24h, no incentivized reviews), Yelp (never solicit — Yelp filters solicited reviews), industry platforms (Houzz, Avvo, Healthgrades, etc.)

**Step 3: Commit**

```bash
git add packs/seo/skills/review-management/
git commit -m "feat(seo): add review-management workflow skill"
```

---

### Task 18: Write content-strategy skill

**Files:**
- Create: `packs/seo/skills/content-strategy/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/seo/skills/content-strategy/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: content-strategy
description: Use when building topic clusters, creating content briefs, planning editorial calendars, analyzing content gaps, or evaluating content quality. Also use when developing E-E-A-T signals or creating AI-aware content guidelines for service businesses.
---
```

7-section workflow from design doc:
1. Topic Cluster Architecture — pillar pages (service pages) + supporting content (blog posts), hub-and-spoke model, internal linking strategy
2. Content Gap Analysis — GSC data → missing keyword opportunities, competitor content audit, "content vs. no content" keyword coverage, intent mapping (informational vs. commercial vs. transactional)
3. Content Brief Template — target keyword, search intent, content outline with H2s/H3s, target word count, primary CTA, schema type to add, internal links to include, competitor URLs to outrank
4. Editorial Calendar — monthly cadence (4-8 pieces for active growth), content types (service pages, blog posts, FAQ pages, location pages, case studies), seasonal topics for service businesses
5. Content Quality Checklist — E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness), helpful content guidelines, originality checks, readability
6. AI Content Guidelines — human oversight requirements, fact-checking process, attribution for AI-assisted content, Google's stance on AI content (quality matters, not creation method)
7. Performance Tracking — GSC impressions + clicks per content piece, GA4 engagement metrics, conversion attribution, content ROI tracking

**Step 2: Commit**

```bash
git add packs/seo/skills/content-strategy/
git commit -m "feat(seo): add content-strategy workflow skill"
```

---

### Task 19: Write ai-visibility skill

**Files:**
- Create: `packs/seo/skills/ai-visibility/SKILL.md`

**Step 1: Research latest AI search optimization practices**

Use WebSearch for:
- llms.txt specification
- AI Overview optimization (Google SGE/AIO)
- ChatGPT/Claude/Perplexity citation patterns
- Answer Engine Optimization (AEO) best practices 2025-2026

**Step 2: Create SKILL.md**

Create `packs/seo/skills/ai-visibility/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: ai-visibility
description: Use when checking if a site is cited by AI assistants, optimizing content for LLM citation, implementing llms.txt, tracking AI referral traffic, or monitoring AI search visibility. Also use when adapting content strategy for the AI search era.
---
```

6-section workflow from design doc:
1. AI Citation Check — manual and automated checks for ChatGPT, Claude, Gemini, Perplexity citations. Query patterns: "[service] near [location]", "[how to topic]", "[brand name]". Document which competitors are cited.
2. AI-Optimized Content — structured, factual, citable patterns: clear topic sentences, specific statistics with sources, FAQ format, definition-style answers, structured data to make content machine-readable
3. llms.txt / llms-full.txt — specification and implementation: what to include (site purpose, key pages, contact info, service areas), placement (site root), format guidelines
4. AI Referral Tracking — Microsoft Clarity AI Chat Channel Groups configuration (tracks ChatGPT, Claude, Gemini, Copilot referrals), GA4 AI referrer detection (regex for known AI domains), PostHog custom property for AI source
5. Answer Engine Optimization — appearing in AI-generated answers: concise definitions, authoritative claims, structured data, topical authority signals, E-E-A-T alignment
6. Monitoring — regular citation checking cadence (monthly for active campaigns), referral trend tracking, competitive citation comparison

**Step 3: Commit**

```bash
git add packs/seo/skills/ai-visibility/
git commit -m "feat(seo): add ai-visibility workflow skill"
```

---

### Task 20: Write cro-audit skill

**Files:**
- Create: `packs/cro/skills/cro-audit/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/cro/skills/cro-audit/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: cro-audit
description: Use when running a conversion rate optimization audit, analyzing funnels, identifying conversion blockers, or creating a prioritized CRO action plan. Also use when analyzing behavior data from Clarity/PostHog or measuring conversion baselines.
---
```

8-phase pipeline from design doc:
1. **Conversion Baseline** — Pull data from GA4 + PostHog: page-level conversion rates, overall site conversion, goal completions. Benchmark against industry averages for service businesses.
2. **Behavior Analysis** — Reference `microsoft-clarity` for heatmaps + session replays. Identify: rage clicks, dead clicks, scroll abandonment points, confusing UI patterns.
3. **Funnel Analysis** — Map the conversion funnel (landing → engagement → intent → contact → confirmation). Identify drop-off points, form abandonment rate, friction mapping.
4. **Trust & Persuasion Audit** — Social proof inventory (reviews, testimonials, logos, certifications), CTA quality (clarity, contrast, placement, copy), objection handling presence, risk reversal signals.
5. **Technical Friction** — Page speed impact on conversion (reference `web-performance`), mobile UX audit, form UX (field count, validation, error messages, multi-step), third-party script blocking.
6. **Prioritized Recommendations** ─► APPROVAL GATE — Impact vs. effort matrix, priority: quick wins → high impact → long-term.
7. **Execution** (post-approval) — Reference `ab-testing` for testable changes, `landing-page-cro` for page-level implementation.
8. **Measurement** — A/B test design for each change, baseline → post-change comparison, statistical significance requirements.

Include the full output template from design doc (Conversion Baseline table, Behavior Insights table, Funnel Drop-off table, Trust Signals Checklist, Recommendations with severity markers).

**Step 2: Commit**

```bash
git add packs/cro/skills/cro-audit/
git commit -m "feat(cro): add cro-audit workflow skill"
```

---

### Task 21: Write web-performance skill

**Files:**
- Create: `packs/performance/skills/web-performance/SKILL.md`

**Step 1: Research latest CWV and performance best practices**

Use WebSearch for:
- Core Web Vitals thresholds 2025-2026 (LCP, INP, CLS)
- INP optimization patterns (replaced FID in March 2024)
- Latest image optimization (AVIF, fetchpriority)
- Speculation Rules API
- View Transitions API performance impact

**Step 2: Create SKILL.md**

Create `packs/performance/skills/web-performance/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: web-performance
description: Use when diagnosing or fixing Core Web Vitals issues, optimizing LCP/INP/CLS, auditing third-party scripts, or implementing performance budgets. Also use when correlating performance with search rankings or conversion rates.
---
```

6-section action-oriented workflow from design doc:
1. **Diagnosis** — CrUX (field) vs Lighthouse (lab) comparison, identify which metric fails. Reference `crux-api` for field data, `lighthouse-api` for lab data. Determine if issue is LCP, INP, or CLS.
2. **LCP Fixes** — Image optimization (AVIF/WebP, `fetchpriority="high"`, preload), font loading (`font-display: swap`, preload), TTFB reduction (CDN, edge functions, caching), render-blocking resources (async/defer, critical CSS inlining), preconnect hints
3. **INP Fixes** — Long tasks (break into smaller chunks, `scheduler.yield()`, `requestIdleCallback`), event handler optimization, yield to main thread patterns, Web Workers for heavy computation, avoid layout thrashing
4. **CLS Fixes** — Explicit dimensions on images/videos/ads, font fallback metrics (`size-adjust`, `ascent-override`), dynamic content placeholders, ad placeholder containers, animation with `transform` only
5. **Third-Party Scripts** — Script audit (count, size, blocking time), loading strategies (async, defer, `type="module"`, facades), GTM optimization (trigger timing, tag sequencing), consent-gated loading
6. **Verification** — Before/after CrUX comparison, performance budgets (LCP < 2.5s, INP < 200ms, CLS < 0.1), CI integration (Lighthouse CI), ongoing CrUX monitoring schedule

**Step 3: Commit**

```bash
git add packs/performance/skills/web-performance/
git commit -m "feat(performance): add web-performance workflow skill"
```

---

## Batch 4: Workflow Orchestrators (sequential — they reference skills from batch 2-3)

### Task 22: Write client-audit orchestrator

**Files:**
- Create: `packs/seo/skills/client-audit/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/seo/skills/client-audit/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: client-audit
description: Use when onboarding a new client site, running a comprehensive audit, or creating a full-scope deliverable covering tracking, SEO, performance, CRO, content, and authority. Also use when a client says "audit my site" or "what needs to be done".
---
```

6-phase orchestrator from design doc. Each phase invokes specific skills via `Skill` tool:

1. **Foundation Check** — invoke `server-side-tracking` (verify analytics stack health), invoke `google-tag-manager` reference (verify GTM config). If tracking is broken, fix it first — data quality before analysis.
2. **SEO Audit** — invoke `seo-audit` (full 8-phase pipeline), invoke `schema-markup` (structured data deep dive), conditionally invoke `local-seo-audit` (if local business — check if business.json exists or GBP is relevant)
3. **Performance** — invoke `web-performance` (CWV diagnosis + fix plan), reference `crux-api` (field data baseline for trends)
4. **CRO Baseline** — invoke `cro-audit` (conversion analysis), invoke `landing-page-cro` (key landing page audit)
5. **Content & Authority** — invoke `content-strategy` (content gap analysis), invoke `review-management` (review health baseline), invoke `link-analysis` (backlink landscape), invoke `ai-visibility` (LLM citation check)
6. **Deliverable** — invoke `site-report` (full HTML report combining all findings)

APPROVAL GATE after Phase 6.

Duration: 1 session (2-4 hours with parallel subagents in phases 2 and 5)
Deliverables: `reports/client-audit-[date].html`, prioritized action plan

**Step 2: Commit**

```bash
git add packs/seo/skills/client-audit/
git commit -m "feat(seo): add client-audit orchestrator"
```

---

### Task 23: Write monthly-pulse orchestrator

**Files:**
- Create: `packs/seo/skills/monthly-pulse/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/seo/skills/monthly-pulse/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: monthly-pulse
description: Use when running a monthly retainer health check, creating a monthly report, or checking SEO/CRO/performance/review health for an ongoing client. Also use when the user says "monthly check" or "retainer report".
---
```

7-phase orchestrator from design doc:
1. Health Signals — `seo-pulse` + `crux-api` (4-week trend)
2. Rankings — `search-rank` (position changes + opportunities)
3. Conversion Health — `cro-audit` (quick mode — conversion rate trend only)
4. Reputation — `review-management` (new reviews + response audit)
5. AI Visibility — `ai-visibility` (citation pulse check)
6. Active Experiments — `ab-testing` (review running test results)
7. Deliverable — `site-report` (month-over-month HTML comparison)

Duration: 1-2 hours
Deliverables: `reports/monthly-pulse-[YYYY-MM].html`, 5-bullet executive summary

**Step 2: Commit**

```bash
git add packs/seo/skills/monthly-pulse/
git commit -m "feat(seo): add monthly-pulse orchestrator"
```

---

### Task 24: Write cro-sprint orchestrator

**Files:**
- Create: `packs/seo/skills/cro-sprint/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/seo/skills/cro-sprint/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: cro-sprint
description: Use when running a CRO iteration cycle — diagnose top conversion bottleneck, design experiment, build variant, run A/B test, analyze results, ship or iterate. Also use when the user says "CRO sprint" or "conversion experiment".
---
```

4-week cycle from design doc:
- Week 1: Diagnose — `cro-audit` + `microsoft-clarity` + `landing-page-cro`
- Week 1-2: Design — `ab-testing` (hypothesis + sample size)
- Week 2: Build — `ab-testing` (implement) + `posthog` (experiment setup)
- Week 2-4: Run — `ab-testing` (monitor SRM, interim)
- Week 4: Decide — `ab-testing` (analyze + document)
- Loop: next bottleneck

Deliverables: `.claude/progress/experiments/[test-name]-[date].md`

**Step 2: Commit**

```bash
git add packs/seo/skills/cro-sprint/
git commit -m "feat(seo): add cro-sprint orchestrator"
```

---

### Task 25: Write local-growth orchestrator

**Files:**
- Create: `packs/seo/skills/local-growth/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/seo/skills/local-growth/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: local-growth
description: Use when running a local business growth pipeline — local SEO, reviews, content, links, AI presence, and conversion optimization. Also use when onboarding a local service business or planning a local growth strategy.
---
```

6-phase pipeline from design doc:
1. Local Foundation — `local-seo-audit` + `schema-markup` (LocalBusiness)
2. Reputation Engine — `review-management` (generation + response)
3. Local Content — `content-strategy` (local topics + clusters)
4. Local Authority — `link-analysis` (local link opportunities)
5. AI Presence — `ai-visibility` (local AI citation check)
6. Conversion — `landing-page-cro` + `cro-audit` (local conversion funnel)

Monthly maintenance: `review-management` + `seo-pulse`
Deliverables: NAP report, review playbook, 3-month content calendar, citation tracker

**Step 2: Commit**

```bash
git add packs/seo/skills/local-growth/
git commit -m "feat(seo): add local-growth orchestrator"
```

---

### Task 26: Write tracking-foundation orchestrator

**Files:**
- Create: `packs/seo/skills/tracking-foundation/SKILL.md`

**Step 1: Create SKILL.md**

Create `packs/seo/skills/tracking-foundation/SKILL.md` with:

```yaml
---
model: claude-sonnet-4-6
name: tracking-foundation
description: Use when setting up the analytics and tracking stack for a site — GTM, GA4, PostHog, Clarity, server-side tracking, CAPI fan-out, and attribution. Also use when the user says "set up tracking" or "analytics stack".
---
```

6-phase pipeline from design doc:
1. Audit Current State — `server-side-tracking` (what exists, what's broken, what's missing)
2. Tag Management — `google-tag-manager` (GTM container + data layer setup)
3. Analytics Layer — `ga4-api` (GA4 property + streams) + `posthog` (project + SDK) + `microsoft-clarity` (project + consent)
4. Conversion Pipeline — `server-side-tracking` (/api/track endpoint with platform fan-out: Meta CAPI, Pinterest CAPI, GA4 MP, PostHog server, Google Ads batch)
5. Attribution — `server-side-tracking` (identity resolution + attribution models)
6. Verification — `server-side-tracking` launch checklist (test events per platform, dedup verification, consent enforcement test, cron schedule confirmation)

Monthly: `seo-pulse` includes tracking health check
Deliverables: working /api/track, all platforms receiving events, CAPI health passing

**Step 2: Commit**

```bash
git add packs/seo/skills/tracking-foundation/
git commit -m "feat(seo): add tracking-foundation orchestrator"
```

---

## Batch 5: Integration

### Task 27: Update PostHog SKILL.md with CRO patterns

**Files:**
- Modify: `packs/monitoring/skills/posthog/SKILL.md`

**Step 1: Read current PostHog SKILL.md**

Read the full file.

**Step 2: Add CRO sections**

Append new sections to the existing SKILL.md (don't rewrite — preserve existing content):

- **Funnel Insights for CRO** — creating conversion funnels, identifying drop-off points, funnel visualization, breakdown by properties. Reference `cro-audit` for full analysis framework.
- **Session Replay for Friction** — filtering replays by conversion events, identifying UX friction points, replay alongside heatmaps. Reference `microsoft-clarity` for complementary behavior analysis.
- **Web Analytics Dashboard** — configuring PostHog as a GA4 alternative, key metrics for service businesses, custom dashboards
- **Heatmap Usage** — click heatmaps, scroll depth, area heatmaps, interpreting heatmap data for CRO
- **Experiment API for A/B Testing** — creating experiments, feature flags for variants, analyzing results, goal metrics. Reference `ab-testing` for full experiment lifecycle.

**Step 3: Commit**

```bash
git add packs/monitoring/skills/posthog/SKILL.md
git commit -m "feat(monitoring): update posthog with CRO patterns — funnels, replay, experiments"
```

---

### Task 28: Update shepherd routing table

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`

**Step 1: Read current shepherd SKILL.md**

Read the full routing table.

**Step 2: Update routing sections**

Make the following changes to the routing table:

1. **Rename** the existing `### SEO` section entry for `seo-flow` → `seo-audit`:
   - Change `| SEO audit pipeline, technical SEO, site health | \`seo-flow\` |` → `| Full SEO audit, technical SEO, site optimization | \`seo-audit\` |`

2. **Add new entries to existing SEO section** (or rename section to "SEO & Growth"):
   - `| Schema, structured data, JSON-LD, rich results | \`schema-markup\` |`
   - `| Reviews, reputation, review generation | \`review-management\` |`
   - `| Content strategy, topic clusters, content calendar | \`content-strategy\` |`
   - `| AI visibility, LLM citations, AI search, llms.txt | \`ai-visibility\` |`

3. **Add new `### CRO` section** after SEO:
   - `| CRO, conversion optimization, conversion rate | \`cro-audit\` |`
   - `| A/B test, experiment, split test | \`ab-testing\` |`
   - `| Landing page, hero, CTA, form optimization | \`landing-page-cro\` |`
   - `| Heatmaps, session recordings, rage clicks, Clarity | \`microsoft-clarity\` |`
   - `| Server-side tracking, CAPI, fan-out, event dedup | \`server-side-tracking\` |`

4. **Add new `### Performance` section**:
   - `| Fix performance, speed, CWV fix, LCP/INP/CLS | \`web-performance\` |`
   - `| CrUX, field data, Chrome UX Report | \`crux-api\` |`

5. **Add GTM to existing Google APIs section**:
   - `| GTM, Tag Manager, data layer, server-side tagging | \`google-tag-manager\` |`

6. **Add new `### Workflows` section**:
   - `| New client, full audit, onboard client site | \`client-audit\` |`
   - `| Monthly check, retainer deliverable, monthly report | \`monthly-pulse\` |`
   - `| CRO sprint, conversion experiment cycle | \`cro-sprint\` |`
   - `| Local growth, local business pipeline | \`local-growth\` |`
   - `| Set up tracking, analytics stack, CAPI setup | \`tracking-foundation\` |`

**Step 3: Commit**

```bash
git add .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat(shepherd): add routing for growth ecosystem — CRO, performance, workflows"
```

---

## Batch 6: Validation

### Task 29: Run sync-all.js validation

**Files:**
- None modified — validation only

**Step 1: Run sync-all.js**

```bash
node scripts/sync-all.js
```

Expected: All skills listed in armadillo.json have corresponding directories.

**Step 2: If validation fails, fix**

Any missing directory = create it. Any extra directory = verify intent.

**Step 3: Run build-claude-md.js**

```bash
node scripts/build-claude-md.js
```

Expected: `.claude/CLAUDE.md` regenerated with new packs and skill counts.

**Step 4: Verify CLAUDE.md has new packs**

```bash
grep -c "cro" .claude/CLAUDE.md
grep -c "performance" .claude/CLAUDE.md
```

Expected: Both appear in the packs table.

**Step 5: Commit regenerated CLAUDE.md**

```bash
git add .claude/CLAUDE.md
git commit -m "chore: regenerate CLAUDE.md with growth ecosystem packs"
```

---

### Task 30: Final verification

**Files:**
- None modified — verification only

**Step 1: Count all new skill directories**

```bash
echo "=== CRO Pack ===" && ls packs/cro/skills/
echo "=== Performance Pack ===" && ls packs/performance/skills/
echo "=== SEO Pack ===" && ls packs/seo/skills/
echo "=== Google APIs ===" && ls packs/google-apis/skills/
```

Expected:
- CRO: cro-audit, ab-testing, landing-page-cro, microsoft-clarity, server-side-tracking (5)
- Performance: web-performance, crux-api (2)
- SEO: seo-audit (was seo-flow), seo-pulse, local-seo-audit, search-rank, link-analysis, site-report, schema-markup, review-management, content-strategy, ai-visibility, client-audit, monthly-pulse, cro-sprint, local-growth, tracking-foundation (15)
- Google APIs: existing 7 + google-tag-manager (8)

**Step 2: Verify armadillo.json skill count**

```bash
node -e "const m = JSON.parse(require('fs').readFileSync('armadillo.json','utf8')); console.log('SEO:', m.packs.seo.skills.length); console.log('CRO:', m.packs.cro.skills.length); console.log('Perf:', m.packs.performance.skills.length); console.log('GAPI:', m.packs['google-apis'].skills.length)"
```

Expected: SEO: 15, CRO: 5, Perf: 2, GAPI: 8

**Step 3: Verify no broken cross-references**

```bash
grep -r "seo-flow" packs/ .claude/skills/ --include="*.md" | head -20
```

Expected: No results (all renamed to seo-audit).

**Step 4: Run full test suite if available**

```bash
npm test 2>/dev/null || echo "No test suite configured"
```

---

## Summary

| Batch | Tasks | Parallelizable | Description |
|-------|-------|----------------|-------------|
| 1 | 1-2 | No (sequential) | Infrastructure — dirs + manifest |
| 2 | 3-8 | Yes (all independent) | Reference skills + standalone workflows |
| 3 | 9-21 | Partially (rewrites sequential, new skills parallel) | SEO rewrites + new workflow skills |
| 4 | 22-26 | Yes (orchestrators independent) | 5 workflow orchestrators |
| 5 | 27-28 | Yes (independent) | PostHog update + shepherd routing |
| 6 | 29-30 | No (sequential) | Validation + verification |

**Total: 30 tasks, ~23 new/rewritten SKILL.md files, 4 reference.md files**

**Execution approach:** Subagent-driven development with parallel dispatch for independent tasks within each batch.
