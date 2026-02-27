---
model: claude-sonnet-4-6
name: seo-audit
description: Use when running a full SEO optimization pipeline — technical audit, content analysis, keyword research, on-page optimization, structured data, AI citation visibility, performance deep dives, or schema validation. Also use when a site needs a comprehensive SEO review with an approval-gated action plan before execution.
---

# SEO Audit

## Overview

Full SEO optimization pipeline — 11 phases, approval gate at phase 6. Reads every relevant file, pulls analytics data, audits technical health, checks AI citation visibility, evaluates content and schema, and produces a prioritized action plan. No execution happens without user sign-off.

```
Phase 1:   Codebase Inventory
Phase 2:   Analytics Data Pull (GSC + performance)
Phase 2.5: AI Citation Check (invoke ai-visibility)
Phase 3:   Technical SEO Audit
Phase 4:   Core Web Vitals / Lighthouse
Phase 4.5: Performance Deep Dive (invoke web-performance if CWV fails)
Phase 5:   Content & Keyword Analysis
Phase 5.5: Structured Data Audit (invoke schema-markup)
Phase 6:   Analysis Report ──► APPROVAL GATE
Phase 7:   Execution (post-approval, atomic tasks)
Phase 8:   Verification
```

---

## Quick Reference

| Phase | Focus | Output |
|-------|-------|--------|
| 1 | Codebase scan | Page inventory table |
| 2 | Analytics pull | GSC + CWV data |
| 2.5 | AI citation check | LLM visibility findings |
| 3 | Technical audit | Issue checklist |
| 4 | Lighthouse | Score table by page |
| 4.5 | Performance deep dive | Diagnosis + fix plan |
| 5 | Content + keywords | Gap analysis |
| 5.5 | Structured data | JSON-LD audit |
| 6 | Report | Approval gate |
| 7 | Execution | Atomic fixes, commits |
| 8 | Verification | Re-run failing checks |

---

## Phase 1: Codebase Inventory

Read the entire codebase. Do not sample — read every relevant file.

**What to scan:**

- All pages and templates
- All components (especially head/schema/meta)
- All content files (blog posts, landing pages)
- Layouts, config files
- robots.txt, sitemap generation
- Public assets (favicon, manifest)

**Catalog per page:**

| Property | What to capture |
|----------|----------------|
| URL path | Full path |
| Title tag | Text + character count |
| Meta description | Text + character count |
| H1 | Text + keyword presence |
| Heading hierarchy | H1 > H2 > H3 — any skips? |
| Schema markup | Type(s) present + completeness |
| Canonical URL | Present + correct target |
| Open Graph | og:title, og:description, og:image |
| Internal links | Count + targets |
| Images | Count + alt text coverage |
| Word count | Approximate |

---

## Phase 2: Analytics Data Pull

### Google Search Console

Use the `google-search-console-api` skill to pull:

- **Top 100 queries** by impressions (90-day window)
- **Page performance** — clicks, impressions, CTR, avg position per URL
- **Near-page-1 keywords** — positions 8–20 with impressions > 100
- **Index status** — coverage report, any excluded/errored URLs
- **Sitemap status** — submitted vs indexed counts

### Core Web Vitals

Use the `lighthouse-api` skill to get field data from the PageSpeed Insights API (CrUX):

- LCP, CLS, INP — P75 values for both mobile and desktop
- Compare against thresholds:
  - LCP: Good < 2500ms, NI < 4000ms
  - CLS: Good < 0.1, NI < 0.25
  - INP: Good < 200ms, NI < 500ms
- Note any metric in "Needs Improvement" or "Poor" category

### Google Search Central RSS

Fetch `https://developers.google.com/search/updates/search_docs_updates.rss` and flag any updates relevant to the site type (local SEO, Core Web Vitals, E-E-A-T, structured data).

### Tracking Foundation Check

Before treating analytics data as reliable, verify the tracking foundation is sound. Invoke `server-side-tracking` to confirm:

- GA4 / GTM firing correctly on all key pages
- No duplicate events or missed conversions
- Server-side events (if any) matching client-side data
- Conversion tracking intact for forms, calls, bookings

If tracking is broken, note it prominently in the Phase 6 report — analytics data pulled in this phase may be unreliable.

---

## Phase 2.5: AI Citation Check

The new frontier of visibility — being cited by AI assistants (ChatGPT, Claude, Perplexity, Gemini) when users ask about services, locations, or topics.

Invoke the `ai-visibility` skill to run a structured check:

**Manual spot check (quick):**

Query each major LLM with "[primary service] near [city]" and "[business name] [service]":

```
"best [service] in [city]"
"[business name] reviews"
"[service] [city] — who should I call?"
```

**What to capture:**

| LLM | Query | Cited? | Position | Competitor citations |
|-----|-------|--------|----------|---------------------|
| ChatGPT | [service] near [city] | ✓/✗ | 1st/2nd/not found | List competitors cited |
| Claude | [service] near [city] | ✓/✗ | — | — |
| Perplexity | [service] near [city] | ✓/✗ | — | — |
| Gemini | [service] near [city] | ✓/✗ | — | — |

**What drives AI citations:**

- Reviews quantity + recency (Google, Yelp, industry-specific)
- Schema markup with accurate NAP data
- E-E-A-T signals — author pages, credentials, first-person expertise
- Being referenced by authoritative sites (news, directories, associations)
- FAQ content that directly answers natural-language questions

Document findings. Include AI visibility section in Phase 6 report.

---

## Phase 3: Technical SEO Audit

### Core Checks

| Check | Target |
|-------|--------|
| Title tags | Present, 50–60 chars, unique per page |
| Meta descriptions | Present, 150–160 chars, unique, includes CTA |
| H1 | One per page, contains target keyword |
| Heading hierarchy | Logical order, no levels skipped |
| Canonical URLs | Present and self-referencing (or correct target) |
| robots.txt | Not blocking CSS/JS/images; sitemap referenced |
| XML sitemap | Exists, submitted, includes all indexable pages |
| Schema markup | Appropriate type per page, valid JSON-LD |
| Open Graph / Twitter | og:title, og:description, og:image on all pages |
| Internal links | No broken links, no orphan pages |
| HTTPS | All URLs HTTPS, no mixed content |
| Mobile viewport | Viewport meta tag present |
| Structured data | Validates at schema.org/validator |

### E-E-A-T Signals

Google's Experience, Expertise, Authoritativeness, Trustworthiness:

| Signal | What to check |
|--------|--------------|
| Experience | First-person voice where appropriate, specific data/counts, dates |
| Expertise | Author bylines on articles, credentials mentioned |
| Authoritativeness | Organization schema with `knowsAbout`, real `AggregateRating` (not hardcoded) |
| Trustworthiness | Contact info on every page, privacy/terms linked, HTTPS enforced |
| Content freshness | `dateModified` present and recent, no stale dates > 12 months |

### Mobile-First Indexing

Google indexes the mobile version. Verify:

- Desktop content is NOT hidden on mobile via CSS (hidden blocks = not indexed)
- Structured data identical on mobile and desktop
- Images load on mobile (not blocked by viewport lazy loading)
- Touch targets 44×44px minimum

### Crawl Budget Hygiene

- No duplicate URL variants (trailing slash, www/non-www must canonicalize)
- Admin/utility pages excluded from sitemap
- No redirect chains — all 301s are direct
- No soft 404s (200 status but error/empty content)

---

## Phase 4: Core Web Vitals / Lighthouse

Use the `lighthouse-api` skill. Run against key pages:

- Homepage
- Primary service/product pages (2–3)
- About page
- Contact page
- Location pages if applicable (2)
- Blog posts (2–3)

Run both mobile and desktop. Capture:

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| TTFB | < 800ms |
| Performance score | ≥ 80 mobile |
| SEO score | ≥ 90 |
| Accessibility | ≥ 90 |

Flag any page scoring below threshold. Note LCP element (usually hero image or heading).

---

## Phase 4.5: Performance Deep Dive

**Trigger:** Any CWV metric fails Lighthouse threshold from Phase 4.

Invoke `web-performance` for diagnosis and a prioritized fix plan. Do not attempt to diagnose performance issues inline — the skill has systematic tooling for this.

**Also use `crux-api`** to pull Chrome User Experience Report field data:

- Field data = real user measurements (not lab data from Lighthouse)
- Compare lab scores vs field P75 values — large gaps indicate real-world variance
- Field data takes 28-day rolling average — track before/after execution

**What to pass to `web-performance`:**

- Which pages are failing and which metrics
- Lighthouse opportunity list (what Lighthouse flagged)
- CrUX P75 field values
- Tech stack (framework, CDN, image handling)

Document findings and planned fixes. Track in Phase 6 report under "Performance Issues".

---

## Phase 5: Content & Keyword Analysis

### Per-Page Content Checklist

- Target keyword in title, H1, and first 100 words
- Unique, compelling meta description
- 2+ internal links per page
- Adequate word count (pillar: 1,500+, FAQ/support: 800+, landing: 500+)
- All images have descriptive alt text
- Logical heading hierarchy

### Google's Helpful Content Criteria

Evaluate every content page against these people-first signals:

| Criterion | Pass condition |
|-----------|---------------|
| Written for people | Answers a real question; keyword density < 2% |
| First-hand experience | Specific, credible detail; not generic |
| Primary purpose helps | Actionable content, not a thin CTA wrapper |
| Satisfying experience | Reader finds answer without needing to search again |
| No misleading claims | Consistent with facts, data, and other site content |
| Adds substantial value | Original insight or data competitors lack |

Mark each PASS or FAIL. Flag any page failing 2+ criteria for rewrite.

### Keyword Gap Analysis

Using GSC + keyword research:

1. Keywords with impressions > 100 at positions 8–20 (near-page-1 opportunities)
2. Topics ranking well for competitors but not covered on this site
3. "People Also Ask" questions unanswered by current content
4. Existing posts that could be expanded or updated

If content gaps are significant, invoke `content-strategy` for a full editorial plan.

### Review Health

Check review presence — quantity, recency, and response rate across Google, Yelp, and relevant industry directories. Strong review health directly impacts both traditional rankings and AI citation frequency.

If review volume is low or responses are missing, invoke `review-management` for a systematic approach.

### Content Opportunities

Identify 5–10 new content topics ranked by:
- Search volume (estimated)
- Position gap opportunity
- Conversion relevance
- Content effort required

---

## Phase 5.5: Structured Data Audit

Do not audit schema inline — invoke `schema-markup` for a systematic JSON-LD audit.

**Service businesses need at minimum:**

| Schema Type | Pages |
|-------------|-------|
| `LocalBusiness` | Homepage, location pages |
| `Service` | Each service page |
| `FAQPage` | Any FAQ sections |
| `Review` / `AggregateRating` | Homepage, service pages (only if pulled from real data) |
| `BreadcrumbList` | All inner pages |
| `Organization` | Homepage |

**Pass to `schema-markup`:**

- Full page inventory from Phase 1
- Current schema found during codebase scan
- Business type (service, retail, restaurant, etc.)
- Any existing review data sources

Document schema audit findings. Include structured data health in Phase 6 report.

---

## Phase 6: Analysis Report — APPROVAL GATE

Compile all findings into a structured report:

```
## Executive Summary
- 3–5 highest-impact bullets

## Critical Issues
- Blockers that hurt rankings now

## Tracking Health
- Analytics foundation status (from server-side-tracking check)
- Any data reliability warnings

## AI Visibility Findings
- Which LLMs cite the site (from ai-visibility check)
- Competitor citation gaps
- Actions to improve AI presence

## Prioritized Action Plan
- HIGH: Fix this week
- MEDIUM: Fix this month
- LOW: Backlog

## Performance Issues
- CWV failures and web-performance diagnosis (if Phase 4.5 ran)
- CrUX field data vs lab score comparison

## Structured Data Gaps
- Schema types missing or invalid (from schema-markup audit)

## Content Opportunities
- 5–10 topics with estimated volume and rationale
- Content gaps → consider invoking content-strategy for full editorial plan

## CRO Callouts
- Pages with high traffic but low conversion → invoke cro-audit
- Specific pages: [URL] — [traffic volume] — [estimated conversion gap]

## Metrics Snapshot
- GSC: clicks, impressions, avg position (90-day)
- CWV: LCP/CLS/INP pass/fail (lab + field)
- Lighthouse scores: top pages

## Local SEO Status
- If local business: invoke local-seo-audit for location-specific audit
```

**STOP. Present the report. Ask: "Approved to execute the action items above? (yes/no)"**

Do NOT proceed to Phase 7 without explicit approval.

---

## Phase 7: Execution

After approval:

1. Create execution plan at `.claude/progress/plans/seo-optimization-[date].md`
2. Execute each item as an atomic task — one change at a time
3. Checkpoint after each major change (meta tags, schema, content rewrites)
4. Run site build/type check after code changes
5. Submit changed URLs for reindexing via GSC Indexing API after content changes
6. Track progress in the plan file with checkboxes

### Execution Order (recommended)

1. Critical technical fixes (broken canonicals, missing schema, robots errors)
2. Title/meta optimization for near-page-1 keywords
3. Schema markup additions/corrections (coordinate with `schema-markup`)
4. Internal link improvements
5. Content rewrites/expansions
6. New content creation

### Delegated Execution

For items that cross into other skill domains:

| Finding | Delegate to |
|---------|-------------|
| CWV failures | `web-performance` |
| Schema gaps | `schema-markup` |
| Content calendar | `content-strategy` |
| Review gaps | `review-management` |
| Low-converting pages | `cro-audit` |
| Local citations | `local-seo-audit` |

---

## Phase 8: Verification

After execution:

1. Re-run all checks that were failing in Phase 3
2. Re-run Lighthouse on changed pages
3. Validate schema at `https://validator.schema.org`
4. Verify rich results at `https://search.google.com/test/rich-results`
5. Confirm site build succeeds with no regressions
6. Re-run AI citation spot check from Phase 2.5 — note any changes
7. Generate HTML deliverable via `site-report` for client handoff
8. Document what changed and expected ranking impact

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Skipping the approval gate | Always stop at Phase 6, always |
| Optimizing for keywords with no GSC data | Pull real data first — opinions are not rankings |
| Hardcoding aggregate ratings | Pull from actual review data or omit |
| Hiding content on mobile | Everything indexable must be visible on mobile |
| Title tags > 60 chars | Google truncates — keep tight |
| Duplicate meta descriptions | Every page needs a unique description |
| Skipping schema validation | Always validate — invalid schema does nothing |
| Committing all changes at once | Atomic commits — one fix per commit |
| Treating lab CWV as truth | Always compare against CrUX field data |
| Ignoring AI citation gap | LLM visibility is a real traffic channel now |
| Inline schema auditing | Delegate to `schema-markup` — it has the full spec |

---

## Official References

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Validator](https://validator.schema.org)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev)
- [CrUX Dashboard](https://developer.chrome.com/docs/crux)
- [Helpful Content System](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [E-E-A-T Guidelines](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#expertise)

---

## Related Skills

- `google-search-console-api` — GSC data pull
- `lighthouse-api` — performance audits
- `crux-api` — field data comparison
- `ga4-api` — user behavior data
- `search-rank` — deep keyword analysis
- `ai-visibility` — LLM citation check (Phase 2.5)
- `web-performance` — CWV diagnosis + fix plan (Phase 4.5)
- `schema-markup` — JSON-LD audit (Phase 5.5)
- `server-side-tracking` — analytics foundation verification
- `local-seo-audit` — location-specific SEO
- `content-strategy` — editorial planning from content gaps
- `review-management` — review volume and response strategy
- `cro-audit` — high-traffic low-conversion pages
- `site-report` — HTML deliverable generation
- `link-analysis` — backlink opportunities
