# Growth Ecosystem Design — SEO, CRO, Analytics, Performance, Tracking

**Date:** 2026-02-21
**Status:** Approved
**Scope:** 17 new skills, 3 rewrites, 3 updates, 5 workflow orchestrators

---

## Architecture Philosophy

One tracking endpoint → consent check → PII hash → parallel fan-out to all platforms. This pattern (proven in nirvana-pmu) gets codified as armadillo knowledge. The current SEO pack is solid but isolated — it doesn't connect to CRO, tracking, or performance. This design unifies them.

**Target audience:** Service-based businesses, mostly local but many not, mid-to-high ticket.

---

## Naming Convention

```
Workflow skills:   <context>-<action>   → what you're doing
Component skills:  <domain>-<noun>      → what domain of knowledge
Reference skills:  <tool-name>          → what tool/API
Orchestrators:     <outcome>            → what result you get
```

### Renames

| Old | New | Reason |
|-----|-----|--------|
| `seo-flow` | `seo-audit` | "Audit" describes the action. "Flow" is vague. |
| `tracking-setup` | `server-side-tracking` | Describes the pattern, not just "setup" |
| `performance-optimization` | `web-performance` | Shorter, cleaner |
| `landing-page-optimization` | `landing-page-cro` | Ties to CRO pack, shorter |

---

## Pack Structure

### SEO Pack — 10 skills

| Skill | Type | Status | Description |
|-------|------|--------|-------------|
| `seo-audit` | workflow | rewrite | Full 8-phase SEO pipeline (was `seo-flow`) |
| `seo-pulse` | workflow | rewrite | Quick health check — CWV, index, rankings |
| `local-seo-audit` | workflow | rewrite | NAP, GBP, citations, location pages |
| `search-rank` | workflow | update | Keyword ranking analysis from GSC |
| `link-analysis` | workflow | update | Backlinks + link building opportunities |
| `site-report` | workflow | rewrite | Self-contained HTML client deliverable |
| `schema-markup` | workflow | **new** | Deep structured data — JSON-LD templates, validation, rich results |
| `review-management` | workflow | **new** | Review generation, monitoring, response, schema |
| `content-strategy` | workflow | **new** | Topic clusters, content briefs, editorial calendar |
| `ai-visibility` | workflow | **new** | LLM citation check, AI-optimized content, llms.txt |

### CRO Pack — 5 skills

| Skill | Type | Status | Description |
|-------|------|--------|-------------|
| `cro-audit` | workflow | **new** | 8-phase conversion optimization pipeline |
| `ab-testing` | workflow | **new** | Experiment design → implementation → analysis |
| `landing-page-cro` | workflow | **new** | Service business landing page optimization |
| `microsoft-clarity` | reference | **new** | Heatmaps, session replay, smart events, Consent V2 |
| `server-side-tracking` | reference+workflow | **new** | Unified /api/track, consent, PII hash, CAPI fan-out |

### Performance Pack — 2 skills

| Skill | Type | Status | Description |
|-------|------|--------|-------------|
| `web-performance` | workflow | **new** | Diagnose + fix LCP, INP, CLS, third-party scripts |
| `crux-api` | reference | **new** | CrUX field data API, thresholds, history |

### Google APIs Pack — 8 skills (was 7)

| Skill | Status | Description |
|-------|--------|-------------|
| `ga4-api` | keep | GA4 reporting + Measurement Protocol |
| `google-business-profile-api` | keep | GBP management (federated APIs) |
| `google-search-console-api` | keep | Search analytics + URL inspection |
| `lighthouse-api` | keep | Lab data + PageSpeed Insights |
| `google-places-api` | keep | Place search + details |
| `google-ads-api` | keep | Campaign management + GAQL |
| `youtube-data-api` | keep | Video/channel management |
| `google-tag-manager` | **new** | GTM containers, data layer, server-side tagging, Consent Mode v2 |

### Monitoring Pack — 2 skills

| Skill | Status | Description |
|-------|--------|-------------|
| `posthog` | update | Add CRO patterns: funnels, session replay for friction, web analytics |
| `sentry` | keep | Error tracking |

### Workflow Orchestrators — 5 skills (in SEO pack)

| Skill | Description |
|-------|-------------|
| `client-audit` | New client full pipeline — tracking → SEO → perf → CRO → report |
| `monthly-pulse` | Monthly retainer check — pulse → rank → CRO → reviews → report |
| `cro-sprint` | CRO iteration cycle — audit → design → test → analyze → ship |
| `local-growth` | Local business pipeline — local SEO → reviews → content → links → AI |
| `tracking-foundation` | Analytics stack setup — GTM → GA4 → PostHog → Clarity → CAPI |

---

## Skill Designs

### SEO Pack Rewrites

#### `seo-audit` (rewrite of `seo-flow`)

Changes from current:
- Add Phase 2.5: AI Citation Check — are LLMs citing this site?
- Add Phase 4.5: invoke `web-performance` when CWV fails (instead of inline perf advice)
- Add Phase 5.5: invoke `schema-markup` (instead of inline schema checks)
- Update Phase 6 report: include CRO callouts ("page has traffic but low conversion → cro-audit")
- Add: cross-reference `server-side-tracking` to verify analytics foundation before pulling data
- Rename file from seo-flow to seo-audit

#### `seo-pulse` (rewrite)

Changes from current:
- Add Phase 6: AI Citation Pulse — quick LLM citation check
- Add Phase 7: Conversion Health — quick funnel check via GA4/PostHog
- Cross-reference `crux-api` for field data instead of inline PageSpeed calls
- Add tracking health check (are all platforms receiving events?)

#### `local-seo-audit` (rewrite)

Changes from current:
- Add Section 8: AI Citation Monitoring — track ChatGPT/Claude/Gemini/Perplexity mentions
- Reference Clarity's AI chat channel groups for LLM referral traffic
- Add Section 9: Review Management cross-reference (invoke `review-management`)
- Add GBP post frequency tracking and recommendations
- Update citation sources — add Apple Business Connect (replaced Apple Maps Connect)

#### `site-report` (rewrite)

Changes from current:
- Add Section: CRO Metrics (conversion rate, form completion, phone clicks)
- Add Section: Tracking Health (all platforms receiving events? CAPI health?)
- Add Section: AI Visibility (citation check results)
- Add Section: Performance Trends (CrUX field data trends, not just lab)
- Add Section: Review Health (count, rating, recency, response rate)
- Upgrade template: tabbed navigation, sparkline charts via inline SVG

### SEO Pack Updates

#### `search-rank` (update)

- Add AI search intent classification (keywords that LLMs answer instead of SERP)
- Add "zero-click" detection for keywords dominated by featured snippets/AI overviews

#### `link-analysis` (update)

- Add AI citation as "link equivalent" — being cited by ChatGPT/Claude is analogous to a backlink
- Add "AI-optimized content" section — how to structure content for LLM citation

### New SEO Skills

#### `schema-markup`

Deep structured data skill. 6 sections:

```
Section 1: Schema Inventory — scan all JSON-LD blocks in codebase
Section 2: Completeness Audit — required vs recommended properties per type
Section 3: Rich Result Eligibility — which pages qualify for enhanced SERP features
Section 4: Schema Templates — copy-paste JSON-LD for common service business types
Section 5: Validation — automated validation against schema.org + Rich Results Test
Section 6: Implementation — atomic commits per schema addition
```

Schema types: LocalBusiness (+ subtypes), Service, ServiceArea, FAQPage, HowTo, Article/BlogPosting, BreadcrumbList, WebSite+SearchAction, Review/AggregateRating, Event, VideoObject, Organization+ContactPoint.

Output template:

```
# Schema Markup Audit — [Site] — [Date]

## Inventory
| Page | Schema Types | Valid | Rich Result Eligible |
|------|-------------|-------|---------------------|

## Missing Schemas
| Page | Recommended Type | Why | Priority |
|------|-----------------|-----|----------|

## Validation Errors
| Page | Type | Error | Fix |
|------|------|-------|-----|

## Implementation Plan
1. [schema + page + priority]
```

#### `review-management`

```
Section 1: Review Audit — count, rating, recency, platform coverage
Section 2: Generation Strategy — ask flows, QR codes, email/SMS timing
Section 3: Response Templates — positive, negative, fake review handling
Section 4: Schema — Review + AggregateRating (live data, never hardcoded)
Section 5: Monitoring — Google Alerts, platform notifications, weekly pulse
Section 6: Platform-Specific — Google (reply 24h), Yelp (no solicitation), industry
```

#### `content-strategy`

```
Section 1: Topic Cluster Architecture — pillar pages + supporting content
Section 2: Content Gap Analysis — GSC data → missing opportunities
Section 3: Content Brief Template — keyword, intent, outline, word count, CTA, schema
Section 4: Editorial Calendar — monthly cadence, content types, seasonal topics
Section 5: Content Quality Checklist — E-E-A-T, helpful content, originality
Section 6: AI Content Guidelines — human oversight, fact-checking, attribution
Section 7: Performance Tracking — GSC + GA4 per content piece
```

#### `ai-visibility`

```
Section 1: AI Citation Check — is the site cited by ChatGPT, Claude, Gemini, Perplexity?
Section 2: AI-Optimized Content — structured, factual, citable patterns
Section 3: llms.txt / llms-full.txt — site-level AI instruction files
Section 4: AI Referral Tracking — Clarity AI channel groups, GA4 AI referrer detection
Section 5: Answer Engine Optimization — appearing in AI-generated answers
Section 6: Monitoring — automated citation checking, referral trend tracking
```

---

### CRO Pack Skills

#### `cro-audit`

8-phase pipeline, approval gate at phase 6:

```
Phase 1: Conversion Baseline — GA4 + PostHog data, current rates
Phase 2: Behavior Analysis — Clarity heatmaps, session replays, scroll depth
Phase 3: Funnel Analysis — drop-off points, form abandonment, friction mapping
Phase 4: Trust & Persuasion Audit — social proof, CTAs, objection handling
Phase 5: Technical Friction — page speed impact on conversion, mobile UX, form UX
Phase 6: Prioritized Recommendations ──► APPROVAL GATE
Phase 7: Execution (post-approval)
Phase 8: Measurement (A/B test design for changes)
```

Output template:

```
# CRO Audit — [Site] — [Date]

## Conversion Baseline
| Page | Sessions | Conversions | Rate | Benchmark |
|------|----------|-------------|------|-----------|

## Behavior Insights (Clarity / PostHog)
| Finding | Evidence | Impact | Fix |
|---------|----------|--------|-----|

## Funnel Drop-off
| Step | Users | Drop-off % | Cause |
|------|-------|------------|-------|

## Trust Signals Checklist
| Signal | Present | Location | Recommendation |
|--------|---------|----------|----------------|

## Recommendations (priority order)
◆ CRITICAL [specific action]
◇ HIGH [specific action]
⚠ MEDIUM [specific action]
```

#### `ab-testing`

Full A/B testing lifecycle using PostHog experiments:

```
Phase 1: Hypothesis — "Changing X will increase Y by Z% because [reason]"
Phase 2: Sample Size — MDE, baseline rate, significance level, duration calc
Phase 3: Implementation — PostHog feature flag + variant code
Phase 4: Monitoring — SRM check, early stopping rules
Phase 5: Analysis — statistical + practical significance, decision
Phase 6: Documentation — archive results
```

Includes inline sample size formula, MDE guidelines, anti-patterns (peeking, early stopping).

Output template:

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

#### `landing-page-cro`

Service business specific — opinionated best practices:

```
Section 1: Above-the-Fold — hero, sub-headline, primary CTA, trust badges, imagery
Section 2: Social Proof Architecture — reviews, testimonials, before/after, logos
Section 3: Objection Handling — FAQ, pricing transparency, risk reversal, process
Section 4: CTA Strategy — repeat cadence, secondary CTAs, mobile sticky, forms
Section 5: Mobile CRO — thumb zone, click-to-call, input types, speed
```

#### `microsoft-clarity`

Reference skill — API docs + CRO usage patterns:

```
Setup: npm @microsoft/clarity, consent API v2, privacy
Client API: custom identifiers, tags, event tracking
Data Export API: JWT auth, dashboard data export
Heatmaps: click, scroll, area — interpretation guide
Session Recordings: filtering, timeline, AI summaries
Smart Events: dead clicks, rage clicks, excessive scroll, quick backs
Copilot AI: natural language insight queries
Integration: GA4, PostHog alongside patterns
Consent V2: EEA/UK compliance (required since Oct 2025)
AI Chat Channel Groups: ChatGPT/Claude/Gemini/Copilot referral tracking
```

#### `server-side-tracking`

Crown jewel. Codifies the nirvana-pmu pattern:

```
Section 1: Architecture — unified /api/track, 7-layer diagram, why server-side
Section 2: Tracking Pipeline — cookie extraction, PII hashing, server enrichment
Section 3: Consent Framework — two-tier (analytics/marketing), GPC, shouldTrack()
Section 4: Platform Fan-Out — Meta CAPI, GA4 MP, Pinterest CAPI, PostHog, Google Ads
Section 5: Event Taxonomy — standard events, platform mapping, custom data, value fallback
Section 6: Attribution — 4 models, identity resolution, touchpoint storage
Section 7: Cron Infrastructure — daily sync schedule, CAPI health checks, batch uploads
Section 8: Launch Checklist — per-platform verification
Section 9: Safety Gates — PAUSED campaigns, budget ceilings, PII protection, 200 always
```

---

### Performance Pack Skills

#### `web-performance`

Action-oriented — diagnose AND fix:

```
Section 1: Diagnosis — CrUX vs Lighthouse, identify LCP/INP/CLS sources
Section 2: LCP Fixes — images, fonts, TTFB, render-blocking resources, preconnect
Section 3: INP Fixes — long tasks, event handlers, yield to main thread, workers
Section 4: CLS Fixes — dimensions, font fallbacks, dynamic content, ad placeholders
Section 5: Third-Party Scripts — audit, loading strategies, GTM optimization, facades
Section 6: Verification — before/after, CrUX monitoring, performance budgets, CI
```

#### `crux-api`

Reference skill:

```
API: endpoint, auth, rate limits (150 QPM free)
Queries: origin-level, URL-level, form factor filtering
Metrics: LCP, CLS, INP — p75, histogram data
Thresholds: Good/NI/Poor per metric
Data freshness: 28-day rolling, daily ~04:00 UTC
BigQuery: CrUX dataset for historical
History API: monthly snapshots for trends
Integration: correlate with GSC ranking changes
```

---

### Google APIs Addition

#### `google-tag-manager`

Reference skill:

```
Setup: web container, server-side container, Tag Manager API
Data Layer: dataLayer.push() patterns, custom events, ecommerce
Tags: GA4, Meta Pixel, Pinterest Tag, Clarity, custom HTML
Triggers: custom events, form submit, scroll, element visibility
Variables: data layer, URL, cookie, constant, JavaScript
Server-Side Tagging: sGTM, client proxy, first-party domain
Consent Mode v2: defaults, updates, per-tag consent
Debug: Preview mode, Tag Assistant
API: container management, workspace, version publishing
```

---

### Monitoring Pack Update

#### `posthog` (update)

Add CRO-specific sections:
- Funnel insights for conversion analysis
- Session replay for friction identification
- Web analytics dashboard configuration
- Heatmap usage patterns
- Experiment API integration (used by `ab-testing`)

---

## Workflow Orchestrators

### `client-audit`

```
Phase 1: Foundation Check
  ├─ server-side-tracking  →  verify analytics stack
  └─ google-tag-manager    →  verify GTM config

Phase 2: SEO Audit
  ├─ seo-audit             →  full 8-phase pipeline
  ├─ schema-markup         →  structured data deep dive
  └─ local-seo-audit       →  if local business

Phase 3: Performance
  ├─ web-performance       →  CWV diagnosis + fix plan
  └─ crux-api              →  field data baseline

Phase 4: CRO Baseline
  ├─ cro-audit             →  conversion analysis
  └─ landing-page-cro      →  key page audit

Phase 5: Content & Authority
  ├─ content-strategy      →  content gap analysis
  ├─ review-management     →  review health baseline
  ├─ link-analysis         →  backlink landscape
  └─ ai-visibility         →  LLM citation check

Phase 6: Deliverable
  └─ site-report           →  full HTML report

──► APPROVAL GATE
```

Deliverables: `reports/client-audit-[date].html`, prioritized action plan
Duration: 1 session (2-4 hours with parallel subagents)

### `monthly-pulse`

```
Phase 1: Health Signals
  ├─ seo-pulse             →  CWV + index + algorithm
  └─ crux-api              →  field data trend (4-week)

Phase 2: Rankings
  └─ search-rank           →  position changes + opps

Phase 3: Conversion Health
  └─ cro-audit (quick)     →  conversion rate trend

Phase 4: Reputation
  └─ review-management     →  new reviews + response

Phase 5: AI Visibility
  └─ ai-visibility         →  citation pulse

Phase 6: Active Experiments
  └─ ab-testing (review)   →  running test results

Phase 7: Deliverable
  └─ site-report           →  month-over-month HTML
```

Deliverables: `reports/monthly-pulse-[YYYY-MM].html`, 5-bullet executive summary
Duration: 1 session (1-2 hours)

### `cro-sprint`

```
Week 1: Diagnose
  ├─ cro-audit             →  identify #1 drop-off
  ├─ microsoft-clarity     →  heatmaps + session replay
  └─ landing-page-cro      →  audit target page

Week 1-2: Design
  └─ ab-testing (design)   →  hypothesis + sample size

Week 2: Build
  ├─ ab-testing (implement)→  PostHog flag + variant
  └─ posthog               →  experiment setup

Week 2-4: Run
  └─ ab-testing (monitor)  →  SRM check, interim results

Week 4: Decide
  ├─ ab-testing (analyze)  →  significance + decision
  └─ ab-testing (document) →  archive results

──► Loop: next bottleneck
```

Deliverables: `.claude/progress/experiments/[test-name]-[date].md`
Duration: 2-4 weeks per cycle

### `local-growth`

```
Phase 1: Local Foundation
  ├─ local-seo-audit       →  NAP + GBP + citations
  └─ schema-markup         →  LocalBusiness + subtypes

Phase 2: Reputation Engine
  └─ review-management     →  generation + response

Phase 3: Local Content
  └─ content-strategy      →  local topics + clusters

Phase 4: Local Authority
  └─ link-analysis         →  local link opportunities

Phase 5: AI Presence
  └─ ai-visibility         →  local AI citation check

Phase 6: Conversion
  ├─ landing-page-cro      →  location page CRO
  └─ cro-audit (local)     →  local conversion funnel

──► Monthly: review-management + seo-pulse
```

Deliverables: NAP report, review playbook, 3-month content calendar, citation tracker
Duration: Phase 1-2 first session, 3-6 over first month, then monthly

### `tracking-foundation`

```
Phase 1: Audit Current State
  └─ server-side-tracking  →  what exists, what's broken

Phase 2: Tag Management
  └─ google-tag-manager    →  GTM container + data layer

Phase 3: Analytics Layer
  ├─ ga4-api               →  GA4 property + streams
  ├─ posthog               →  PostHog project + SDK
  └─ microsoft-clarity     →  Clarity project + consent

Phase 4: Conversion Pipeline
  └─ server-side-tracking  →  /api/track endpoint
      ├─ Meta CAPI         →  consent-gated
      ├─ Pinterest CAPI    →  consent-gated
      ├─ GA4 MP            →  analytics tier
      ├─ PostHog server    →  analytics tier
      └─ Google Ads        →  batch cron upload

Phase 5: Attribution
  └─ server-side-tracking  →  identity resolution + models

Phase 6: Verification
  └─ server-side-tracking  →  launch checklist
      ├─ Test events per platform
      ├─ Dedup verification
      ├─ Consent enforcement test
      └─ Cron schedule confirmation

──► Monthly: seo-pulse includes tracking health
```

Deliverables: working /api/track, all platforms receiving, CAPI health passing
Duration: 1-2 sessions setup, monthly verification

---

## Shepherd Routing Table Additions

### SEO & Growth

| Request | Skill |
|---------|-------|
| Full SEO audit, technical SEO, site optimization | `seo-audit` |
| Quick SEO check, weekly health, pulse check | `seo-pulse` |
| Local SEO, NAP, GBP, citations, location pages | `local-seo-audit` |
| Keywords, rankings, position tracking, SERP | `search-rank` |
| Backlinks, link building, domain authority | `link-analysis` |
| Site report, client deliverable, HTML report | `site-report` |
| Schema, structured data, JSON-LD, rich results | `schema-markup` |
| Reviews, reputation, review generation | `review-management` |
| Content strategy, topic clusters, content calendar | `content-strategy` |
| AI visibility, LLM citations, AI search, llms.txt | `ai-visibility` |

### CRO

| Request | Skill |
|---------|-------|
| CRO, conversion optimization, conversion rate | `cro-audit` |
| A/B test, experiment, split test | `ab-testing` |
| Landing page, hero, CTA, form optimization | `landing-page-cro` |
| Heatmaps, session recordings, rage clicks, Clarity | `microsoft-clarity` |
| Server-side tracking, CAPI, fan-out, event dedup | `server-side-tracking` |

### Performance

| Request | Skill |
|---------|-------|
| Fix performance, speed, CWV fix, LCP/INP/CLS | `web-performance` |
| CrUX, field data, Chrome UX Report | `crux-api` |

### Google APIs

| Request | Skill |
|---------|-------|
| GTM, Tag Manager, data layer, server-side tagging | `google-tag-manager` |

### Workflows

| Request | Skill |
|---------|-------|
| New client, full audit, onboard client site | `client-audit` |
| Monthly check, retainer deliverable, monthly report | `monthly-pulse` |
| CRO sprint, conversion experiment cycle | `cro-sprint` |
| Local growth, local business pipeline | `local-growth` |
| Set up tracking, analytics stack, CAPI setup | `tracking-foundation` |

---

## Cross-Reference Graph

```
client-audit ──► seo-audit ──► schema-markup
             ──► local-seo-audit ──► review-management
             ──► web-performance ──► crux-api
             ──► cro-audit ──► landing-page-cro
             ──► content-strategy
             ──► link-analysis
             ──► ai-visibility
             ──► site-report
             ──► server-side-tracking

monthly-pulse ──► seo-pulse ──► crux-api
              ──► search-rank
              ──► cro-audit (quick)
              ──► review-management (pulse)
              ──► ai-visibility (pulse)
              ──► ab-testing (review)
              ──► site-report

cro-sprint ──► cro-audit
           ──► microsoft-clarity
           ──► landing-page-cro
           ──► ab-testing ──► posthog

local-growth ──► local-seo-audit ──► google-business-profile-api
             ──► review-management
             ──► content-strategy
             ──► link-analysis
             ──► ai-visibility
             ──► landing-page-cro

tracking-foundation ──► server-side-tracking ──► google-tag-manager
                    ──► ga4-api
                    ──► posthog
                    ──► microsoft-clarity
                    ──► meta-conversions (ads pack)
                    ──► pinterest-ads (ads pack)
```

---

## Implementation Summary

| Category | New | Rewrite | Update | Keep | Total |
|----------|-----|---------|--------|------|-------|
| SEO Pack | 4 | 3 | 2 | 1 | 10 |
| CRO Pack | 5 | — | — | — | 5 |
| Performance Pack | 2 | — | — | — | 2 |
| Workflows | 5 | — | — | — | 5 |
| Google APIs | 1 | — | — | 7 | 8 |
| Monitoring | — | — | 1 | 1 | 2 |
| **Total** | **17** | **3** | **3** | **9** | **32** |

23 skills to write/rewrite.

---

## Research Sources

- [Microsoft Clarity Docs](https://learn.microsoft.com/en-us/clarity/)
- [Microsoft Clarity Consent V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api)
- [CrUX API](https://developer.chrome.com/docs/crux/api)
- [CrUX Overview](https://developer.chrome.com/docs/crux/)
- [GTM Server-Side Tagging](https://developers.google.com/tag-platform/tag-manager/server-side)
- [GTM Server-Side APIs](https://developers.google.com/tag-platform/tag-manager/server-side/api)
- [PostHog Docs](https://posthog.com/docs)
- [PostHog Heatmaps](https://github.com/PostHog/posthog/issues/20426)
- [Google Search Central](https://developers.google.com/search)
- nirvana-pmu repo: `/Users/zachwieder/Documents/AGENCY/SARAH/nirvana-pmu/` (tracking architecture reference)
