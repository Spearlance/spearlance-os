---
model: claude-sonnet-4-6
name: site-report
description: Use when generating a comprehensive site health report — Lighthouse scores, Core Web Vitals, SEO audit, content quality, schema validation, broken links, CRO metrics, tracking health, AI visibility, performance trends, or review health. Also use when a client-ready deliverable is needed summarizing all site health metrics in a single self-contained HTML file with tabbed navigation.
---

# Site Report

## Overview

Generates a comprehensive, self-contained HTML site health report. Covers performance, SEO, content, links, schema, rankings, CRO, tracking health, AI visibility, CrUX trend data, and review health — in a single file with tabbed navigation. No external dependencies, no login required to view. Suitable as a client deliverable or internal audit record.

Uses parallel subagents to gather data efficiently. Final output is a polished HTML file saved to `reports/`.

---

## Quick Reference

| Tab | Section | Data Source | Key Metrics |
|-----|---------|------------|-------------|
| SEO | Executive Summary | All sources | Traffic light scores |
| SEO | Lighthouse Scores | `lighthouse-api` | Performance, SEO, A11y per page |
| SEO | SEO Audit | Codebase scan | Meta tags, schema, canonicals |
| SEO | Content Quality | Codebase scan | Word count, freshness, uniqueness |
| SEO | Schema Validation | Schema.org validator | Errors, missing properties |
| SEO | Link Health | Link crawl | Broken, orphan, redirect chains |
| SEO | Rankings Snapshot | `google-search-console-api` | Top keywords, page-1 opps |
| SEO | Index Health | `google-search-console-api` | Coverage, sitemap, manual actions |
| Performance | Core Web Vitals | CrUX field data | LCP, INP, CLS — field + lab |
| Performance | Performance Trends | `crux-api` (CrUX History API) | p75 values last 6 months, MoM delta |
| CRO | CRO Metrics | `cro-audit`, GA4, PostHog | Conversion rate, form completion, funnel |
| AI | AI Visibility | `ai-visibility` | LLM citations, AI referral traffic |
| Reviews | Review Health | `review-management` | Rating, recency, response rate |
| Tracking | Tracking Health | `server-side-tracking` | Platform status, event counts, error rate |
| All | Recommendations | All sections | Prioritized action list |

---

## Output

```
reports/site-report-[YYYY-MM-DD].html
```

Single self-contained HTML file:

- Inline CSS only (no external stylesheets)
- Pure CSS tabbed navigation — SEO | Performance | CRO | AI | Reviews | Tracking
- Inline SVG sparklines for trend data (CrUX metrics over time, conversion rate over time)
- Responsive layout
- Color-coded severity (green/yellow/red)
- Sortable data tables
- Dark mode toggle (CSS-only, `prefers-color-scheme` + checkbox hack)
- No JavaScript dependencies (static HTML — report works fully without JS)

---

## Multi-Agent Data Collection

Dispatch 10 specialized subagents in parallel to gather data:

### Agent 1: Performance Analyst

Uses `lighthouse-api` skill.

**Pages to test:** homepage, 2–3 primary service/product pages, about, contact, 2 location pages (if applicable), 2–3 blog posts.

**Run both mobile and desktop for each page.**

Collect per page:
- Performance, SEO, Accessibility, Best Practices scores
- LCP element and timing (ms)
- INP timing (ms)
- CLS score
- TTFB
- Largest image file size and format
- Total page weight (KB)
- Render-blocking resources

### Agent 2: SEO Auditor

Scans the codebase. Uses `seo-audit` skill for deep findings.

Collect:
- Title tag: text, length, presence per page
- Meta description: text, length, presence per page
- H1: text, count per page (flag if missing or multiple)
- Heading hierarchy: flag any level skips
- Canonical URL: presence and correctness
- robots.txt: rules, sitemap reference, blocking check
- Sitemap: exists, submitted, all pages included
- Open Graph: og:title, og:description, og:image per page
- Schema types per page
- Mobile viewport tag

### Agent 3: Content Analyst

Scans all content files.

Collect:
- Word count per page (flag < 300 as thin)
- Last modified date (flag > 12 months as stale)
- Keyword density on primary keyword (flag > 3% as stuffed)
- Duplicate content: identify pages with > 70% shared text
- Images without alt text (count)
- Blog posts without author attribution

### Agent 4: Link Checker

Crawls all internal and external links found in source files.

Collect:
- Total internal links
- Broken internal links (404) — list each
- Redirect chains (3+ hops) — list each
- Orphan pages (no internal links pointing to them)
- External broken links — list each
- External links without `rel="nofollow"` or `rel="noopener"` where appropriate

### Agent 5: Schema Validator

Extracts all JSON-LD blocks from source and validates.

For each schema block:
- Type declared
- Required properties present
- Validation result (valid / errors)
- Rich result eligibility (check via [Rich Results Test API](https://search.google.com/test/rich-results))

Common schema types to check:
- `LocalBusiness`
- `Service`
- `Article` / `BlogPosting`
- `BreadcrumbList`
- `FAQPage`
- `Product`

### Agent 6: Rankings Reporter

Uses `google-search-console-api` skill.

Collect:
- Top 20 keywords (impressions, clicks, CTR, position) — last 28 days
- Page-1 opportunity keywords (position 8–20, impressions > 100)
- Index coverage: indexed, excluded, errored URL counts
- Sitemap: submitted vs indexed counts
- Manual actions: any active penalties

### Agent 7: CrUX Trend Analyst

Uses `crux-api` skill. Pulls CrUX History API data.

Collect **p75 field data for last 6 months** (monthly snapshots):
- LCP p75 (mobile + desktop) — month by month
- INP p75 (mobile + desktop) — month by month
- CLS p75 (mobile + desktop) — month by month

Calculate:
- Month-over-month delta for each metric
- Trend direction: improving / stable / degrading
- Lab vs field comparison (Lighthouse lab score vs CrUX p75)

```bash
# CrUX History API
curl -X POST \
  "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=$CRUX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin":"https://example.com","metrics":["largest_contentful_paint","interaction_to_next_paint","cumulative_layout_shift"]}'
```

### Agent 8: CRO Analyst

Uses `cro-audit` skill. Pulls from GA4 + PostHog where connected.

Collect:
- Overall conversion rate (goal completions / sessions) — last 30 days
- Conversion rate per landing page (top 10 by traffic)
- Form completion rate (submissions / form views) per form
- Phone click rate on mobile (click-to-call events / mobile sessions)
- Chat engagement rate (chat opens / sessions) if chat widget present
- Funnel drop-off: stage-by-stage completion rates for primary funnel
- Month-over-month conversion rate trend (last 6 months)

```bash
# GA4 Reporting API — conversion events
curl -X POST \
  "https://analyticsdata.googleapis.com/v1beta/properties/$GA4_PROPERTY_ID:runReport" \
  -H "Authorization: Bearer $GA4_ACCESS_TOKEN" \
  -d '{"metrics":[{"name":"conversions"},{"name":"sessions"}],"dimensions":[{"name":"landingPage"}],"dateRanges":[{"startDate":"30daysAgo","endDate":"today"}]}'
```

### Agent 9: AI Visibility Scout

Uses `ai-visibility` skill.

Collect:
- LLM citation check: for 5–10 target queries, which LLMs (ChatGPT, Perplexity, Claude, Gemini) cite this site vs competitors
- Queries where site appears in AI answers
- Queries where competitors appear instead
- AI referral traffic from GA4 or Clarity AI Channel Groups (last 30 days)
- Month-over-month AI referral traffic trend

AI referral traffic sources to track:
- `chatgpt.com`
- `perplexity.ai`
- `claude.ai`
- `gemini.google.com`
- `copilot.microsoft.com`

### Agent 10: Review Health Analyst

Uses `review-management` skill.

Collect per platform (Google, Yelp, Facebook, industry-specific):
- Total review count
- Average rating (1–5)
- Review recency: date of most recent review, days since last review
- Response rate (% of reviews with owner response)
- Volume trend: reviews per month last 6 months

Competitor comparison:
- 2–3 direct competitors: review count, average rating, recency

---

## Report Sections

### Section 1: Executive Summary

Traffic-light scorecard (shown on all tabs):

```
Performance      [Score /100]  [●Green / ●Yellow / ●Red]
SEO              [Score /100]  [●Green / ●Yellow / ●Red]
Content          [Score /100]  [●Green / ●Yellow / ●Red]
Accessibility    [Score /100]  [●Green / ●Yellow / ●Red]
Link Health      [Score /100]  [●Green / ●Yellow / ●Red]
CRO              [Score /100]  [●Green / ●Yellow / ●Red]
Tracking         [Score /100]  [●Green / ●Yellow / ●Red]
AI Visibility    [Score /100]  [●Green / ●Yellow / ●Red]
Reviews          [Score /100]  [●Green / ●Yellow / ●Red]
```

Key findings: 3–5 most important items from across all sections.

Score calculation:
- Green: no critical issues, < 3 important issues
- Yellow: 1 critical OR 3+ important issues
- Red: 2+ critical issues

### Section 2: Lighthouse Scores

Tab: **SEO**

Table per page:

| Page | Perf | SEO | A11y | Best Practices | LCP | INP | CLS | TTFB |
|------|------|-----|------|----------------|-----|-----|-----|------|

Color code each score: ≥ 90 green, 50–89 yellow, < 50 red.

Include delta from previous report if one exists in `reports/`.

### Section 3: Core Web Vitals

Tab: **Performance**

**Field Data (CrUX — what Google uses for ranking):**

| Metric | Mobile P75 | Desktop P75 | Status |
|--------|-----------|-------------|--------|
| LCP | | | Good / NI / Poor |
| CLS | | | Good / NI / Poor |
| INP | | | Good / NI / Poor |

**Lab Data (Lighthouse — controllable, for diagnosis):**

Aggregated across tested pages.

**Field vs Lab Comparison:**

> If field data is significantly worse than lab data (> 20% gap), the site may have caching, CDN, or third-party script issues that Lighthouse doesn't simulate.

### Section 4: Performance Trends

Tab: **Performance**

**CrUX History — p75 Field Data Over 6 Months:**

Render as inline SVG sparklines (see HTML template requirements). One sparkline per metric per device class.

| Month | LCP Mobile | LCP Desktop | INP Mobile | INP Desktop | CLS Mobile | CLS Desktop |
|-------|-----------|-------------|-----------|-------------|-----------|-------------|
| 6 mo ago | | | | | | |
| 5 mo ago | | | | | | |
| 4 mo ago | | | | | | |
| 3 mo ago | | | | | | |
| 2 mo ago | | | | | | |
| Last month | | | | | | |

**Month-over-Month Changes:**

| Metric | Previous | Current | Delta | Trend |
|--------|----------|---------|-------|-------|
| LCP Mobile p75 | | | | ↗ improving / → stable / ↘ degrading |
| INP Mobile p75 | | | | |
| CLS Mobile p75 | | | | |

**Lab vs Field Gap:**

| Metric | Lab (Lighthouse) | Field (CrUX p75) | Gap | Flag |
|--------|-----------------|-----------------|-----|------|
| LCP | | | | > 20% → investigate |
| INP | | | | |
| CLS | | | | |

CrUX Good thresholds: LCP ≤ 2500ms, INP ≤ 200ms, CLS ≤ 0.1. Poor: LCP > 4000ms, INP > 500ms, CLS > 0.25.

### Section 5: SEO Audit

Tab: **SEO**

Meta tag completeness table (one row per page):

| Page | Title | Title Len | Description | Desc Len | H1 | Canonical | OG |
|------|-------|-----------|-------------|----------|----|-----------|-----|

Flag:
- Title > 60 chars or < 30 chars
- Description > 160 chars or < 100 chars
- Missing H1 or multiple H1s
- Missing canonical
- Missing OG tags

### Section 6: Content Quality

Tab: **SEO**

| Page | Words | Last Modified | Keyword Density | Alt Text Coverage | Issues |
|------|-------|--------------|----------------|-------------------|--------|

Flag:
- < 300 words: thin content
- > 12 months old: stale
- Keyword density > 3%: over-optimized
- Alt text coverage < 80%

### Section 7: Schema Validation

Tab: **SEO**

| Page | Schema Type | Valid | Errors | Rich Result Eligible |
|------|------------|-------|--------|---------------------|

List each validation error with property name and fix.

### Section 8: Link Health

Tab: **SEO**

```
Internal links       [N total]
Broken internal      [N] — [list of URLs]
Redirect chains      [N] — [list]
Orphan pages         [N] — [list]
External links       [N total]
Broken external      [N] — [list]
```

### Section 9: Rankings Snapshot

Tab: **SEO**

**Top 20 Keywords:**

| Keyword | Position | Impressions | Clicks | CTR | Trend |
|---------|----------|-------------|--------|-----|-------|

**Page-1 Opportunity Keywords:**

| Keyword | Position | Impressions | Potential Clicks @ P5 | Action |
|---------|----------|-------------|----------------------|--------|

### Section 10: Index Health

Tab: **SEO**

```
Coverage
  Indexed      [N]
  Excluded     [N]  (noindex, redirect, crawl anomaly)
  Errors       [N]

Sitemap
  Submitted    [N]
  Indexed      [N]
  Delta        [N] — pages submitted but not indexed

Manual Actions
  Active       [none / list]
```

### Section 11: CRO Metrics

Tab: **CRO**

**Overall Conversion Rate:**

| Metric | Value | MoM Change | Status |
|--------|-------|-----------|--------|
| Overall conversion rate | | | |
| Form completion rate | | | |
| Phone click rate (mobile) | | | |
| Chat engagement rate | | | |

**Conversion Rate by Landing Page (Top 10):**

| Page | Sessions | Conversions | Conv Rate | MoM Delta |
|------|----------|-------------|-----------|-----------|

Render inline SVG sparkline showing conversion rate trend over last 6 months.

**Funnel Drop-Off Analysis:**

| Funnel Stage | Users Entering | Users Completing | Drop-Off Rate |
|-------------|---------------|-----------------|---------------|
| Landing | | | — |
| Engagement | | | |
| Intent | | | |
| Conversion | | | |

Flag stages with > 60% drop-off as critical. Flag > 40% as warning.

**Conversion Rate Optimization Opportunities:**

Auto-generate from data:
- Pages with high traffic but low conversion (> 500 sessions, < 1% CVR)
- Forms with high abandonment (< 30% completion)
- Mobile vs desktop CVR gap (flag if mobile CVR is < 50% of desktop CVR)

### Section 12: AI Visibility

Tab: **AI**

**LLM Citation Status:**

| Query | ChatGPT | Perplexity | Claude | Gemini | Copilot |
|-------|---------|-----------|--------|--------|---------|
| [query 1] | ✓ cited / ✗ competitor / — | | | | |
| [query 2] | | | | | |

✓ = site cited, ✗ = competitor cited instead, — = neither

**AI Referral Traffic (Last 30 Days):**

| Source | Sessions | MoM Change |
|--------|----------|-----------|
| chatgpt.com | | |
| perplexity.ai | | |
| claude.ai | | |
| gemini.google.com | | |
| copilot.microsoft.com | | |
| **Total AI referral** | | |

Render inline SVG sparkline for AI referral traffic trend over last 6 months.

**Competitive AI Visibility:**

| Competitor | Queries Where They Appear | Queries Where Site Appears |
|-----------|--------------------------|---------------------------|

### Section 13: Review Health

Tab: **Reviews**

**Review Summary by Platform:**

| Platform | Total Reviews | Avg Rating | Last Review | Days Since | Response Rate |
|----------|--------------|-----------|-------------|------------|---------------|
| Google | | | | | |
| Yelp | | | | | |
| Facebook | | | | | |
| [Industry] | | | | | |

Color code:
- Avg Rating: ≥ 4.5 green, 4.0–4.4 yellow, < 4.0 red
- Days Since: ≤ 30 green, 31–90 yellow, > 90 red
- Response Rate: ≥ 80% green, 50–79% yellow, < 50% red

Render inline SVG sparkline for review volume per month (last 6 months).

**Competitor Comparison:**

| | This Site | Competitor 1 | Competitor 2 |
|--|-----------|-------------|-------------|
| Google reviews | | | |
| Google avg rating | | | |
| Days since last review | | | |

### Section 14: Tracking Health

Tab: **Tracking**

**Platform Status:**

| Platform | Receiving Events | Error Rate | Last Event | 30-Day Count | 7-Day Trend |
|----------|-----------------|-----------|------------|-------------|-------------|
| GA4 | ✓ / ✗ | | | | ↗ / → / ↘ |
| PostHog | ✓ / ✗ | | | | |
| Meta CAPI | ✓ / ✗ | | | | |
| Pinterest CAPI | ✓ / ✗ | | | | |
| Google Ads | ✓ / ✗ | | | | |

**CAPI Health Summary:**

| Check | Meta CAPI | Pinterest CAPI |
|-------|-----------|---------------|
| Server-side events firing | ✓ / ✗ | ✓ / ✗ |
| Event deduplication active | ✓ / ✗ | ✓ / ✗ |
| Match quality score | | — |
| EMQ score | — | |
| Test events passing | ✓ / ✗ | ✓ / ✗ |

**Event Coverage:**

| Event | GA4 | PostHog | Meta CAPI | Pinterest CAPI | GA4 Ads |
|-------|-----|---------|-----------|---------------|---------|
| Page view | | | | | |
| Lead / form submit | | | | | |
| Phone click | | | | | |
| Purchase | | | | | |

Flag missing events as critical if they are conversion events.

### Section 15: Recommendations

Tab: all (shown on every tab filtered to that tab's domain, and as a full list)

Prioritized:

```
◆ CRITICAL — Fix immediately
  1. [specific action with page/metric/current value]

◇ HIGH — Fix this week
  1. [specific action]

⚠ MEDIUM — Fix this month
  1. [specific action]

ℹ LOW — Backlog
  1. [specific action]
```

---

## HTML Template Requirements

The HTML file must be:

- **Self-contained** — all CSS inlined, no `<link>` to external stylesheets
- **No JavaScript required** — pure HTML/CSS (JS optional for sorting, but report readable without it)
- **Responsive** — works on mobile and desktop
- **Color-coded** — use CSS classes: `.status-good`, `.status-warning`, `.status-critical`
- **Professional** — suitable for sharing with a client

### Tabbed Navigation (Pure CSS)

Use the CSS checkbox/radio hack for tab switching — no JavaScript.

```html
<!-- Tab structure -->
<div class="tabs">
  <input type="radio" name="tab" id="tab-seo" checked>
  <input type="radio" name="tab" id="tab-performance">
  <input type="radio" name="tab" id="tab-cro">
  <input type="radio" name="tab" id="tab-ai">
  <input type="radio" name="tab" id="tab-reviews">
  <input type="radio" name="tab" id="tab-tracking">

  <nav class="tab-nav">
    <label for="tab-seo">SEO</label>
    <label for="tab-performance">Performance</label>
    <label for="tab-cro">CRO</label>
    <label for="tab-ai">AI</label>
    <label for="tab-reviews">Reviews</label>
    <label for="tab-tracking">Tracking</label>
  </nav>

  <div class="tab-content" id="content-seo"><!-- SEO sections --></div>
  <div class="tab-content" id="content-performance"><!-- Performance sections --></div>
  <div class="tab-content" id="content-cro"><!-- CRO sections --></div>
  <div class="tab-content" id="content-ai"><!-- AI sections --></div>
  <div class="tab-content" id="content-reviews"><!-- Reviews sections --></div>
  <div class="tab-content" id="content-tracking"><!-- Tracking sections --></div>
</div>
```

```css
/* CSS tab switching — no JS */
.tab-content { display: none; }
#tab-seo:checked ~ .tab-content#content-seo { display: block; }
#tab-performance:checked ~ .tab-content#content-performance { display: block; }
#tab-cro:checked ~ .tab-content#content-cro { display: block; }
#tab-ai:checked ~ .tab-content#content-ai { display: block; }
#tab-reviews:checked ~ .tab-content#content-reviews { display: block; }
#tab-tracking:checked ~ .tab-content#content-tracking { display: block; }

input[type="radio"] { display: none; }
.tab-nav label { cursor: pointer; padding: 8px 16px; border-bottom: 2px solid transparent; }
#tab-seo:checked ~ .tab-nav label[for="tab-seo"],
#tab-performance:checked ~ .tab-nav label[for="tab-performance"] { border-bottom-color: #2563eb; font-weight: 600; }
```

### Sparkline SVG

Generate inline SVG sparklines for trend data. Use a 100×30 viewBox with polyline.

```html
<!-- Sparkline template -->
<svg viewBox="0 0 100 30" class="sparkline" aria-hidden="true">
  <!-- Normalize values to 0–30 range, map to 100px width -->
  <polyline
    points="0,25 16,22 33,18 50,20 66,15 83,12 100,10"
    fill="none"
    stroke="#2563eb"
    stroke-width="2"
    stroke-linejoin="round"
  />
</svg>
```

Sparklines to include:
- CrUX LCP p75 — 6 months (one per device class)
- CrUX INP p75 — 6 months
- CrUX CLS p75 — 6 months
- Conversion rate — 6 months
- AI referral traffic — 6 months
- Review volume — 6 months

Calculate sparkline points from real data: normalize to 0–28 y-range, distribute x evenly across 0–100.

### Status Color System

```css
.status-good     { color: #16a34a; background: #f0fdf4; }
.status-warning  { color: #ca8a04; background: #fefce8; }
.status-critical { color: #dc2626; background: #fef2f2; }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .status-good     { color: #4ade80; background: #052e16; }
  .status-warning  { color: #fbbf24; background: #1c1200; }
  .status-critical { color: #f87171; background: #1c0000; }
}
```

### Dark Mode Toggle

```html
<input type="checkbox" id="dark-toggle" class="dark-toggle-input">
<label for="dark-toggle" class="dark-toggle-label">Dark mode</label>
```

```css
.dark-toggle-input { display: none; }
.dark-toggle-input:checked ~ * { /* dark mode overrides */ }
```

Use project brand colors if defined in codebase config. Otherwise use neutral defaults.

---

## Data Collection Commands

```bash
# Lighthouse (CLI)
npx lighthouse https://example.com --output=json --output-path=tmp/lh-home.json --preset=desktop
npx lighthouse https://example.com --output=json --output-path=tmp/lh-home-mobile.json

# PageSpeed Insights API (CrUX field data — current)
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&key=$PSI_API_KEY"

# CrUX History API (6-month trends)
curl -X POST \
  "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=$CRUX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin":"https://example.com","metrics":["largest_contentful_paint","interaction_to_next_paint","cumulative_layout_shift"]}'

# GA4 — conversion data
curl -X POST \
  "https://analyticsdata.googleapis.com/v1beta/properties/$GA4_PROPERTY_ID:runReport" \
  -H "Authorization: Bearer $GA4_ACCESS_TOKEN" \
  -d '{"metrics":[{"name":"conversions"},{"name":"sessions"}],"dimensions":[{"name":"landingPage"}],"dateRanges":[{"startDate":"30daysAgo","endDate":"today"}]}'

# Schema validation
# Use WebFetch to post to https://validator.schema.org/validate
```

---

## Quality Checklist

Before saving the report:

- [ ] All sections populated with real data — no placeholder text
- [ ] All 6 tabs render correctly without JavaScript
- [ ] Sparklines built from real data — not hardcoded sample points
- [ ] Color coding consistent and meaningful across all tables
- [ ] Recommendations are specific ("Update title tag on /services to include 'Chicago'" not "Improve titles")
- [ ] HTML validates — no unclosed tags, no broken markup
- [ ] Responsive on mobile — tables scroll horizontally, not overflow
- [ ] Self-contained — open in browser with no network connection, all content visible
- [ ] Delta column present where previous report exists
- [ ] Dark mode renders correctly
- [ ] CrUX trends from CrUX History API — not just current snapshot
- [ ] Tracking health shows real event counts and timestamps — not assumptions

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Using placeholder data | All sections must use real data from actual runs |
| Lab-only CWV (no field data) | Always fetch CrUX field data — that's what Google uses for ranking |
| Vague recommendations | "Fix title tag on /about (currently 73 chars)" not "fix titles" |
| No comparison to previous report | Read existing reports in `reports/` — show delta |
| External CSS in the HTML file | Inline everything — report must be portable |
| Running Lighthouse on localhost | Always run against production URL |
| Skipping mobile Lighthouse | Google uses mobile-first indexing — mobile scores matter more |
| Sparklines with fake points | Calculate from real CrUX History API data — normalize properly |
| Tracking section showing assumptions | Pull real event timestamps and counts from each platform's API |
| CRO section without funnel data | Identify the primary conversion path and build the funnel from GA4 events |
| Missing AI referral sources | Check all 5 AI sources: ChatGPT, Perplexity, Claude, Gemini, Copilot |

---

## Related Skills

- `lighthouse-api` — performance audits and lab CWV data
- `google-search-console-api` — GSC rankings and index data
- `ga4-api` — user behavior and conversion data
- `crux-api` — CrUX History API, 6-month field data trends
- `cro-audit` — CRO metrics, funnel analysis, form completion
- `server-side-tracking` — tracking platform health, CAPI status
- `ai-visibility` — LLM citation checks, AI referral traffic
- `review-management` — review counts, ratings, recency, response rates
- `seo-audit` — deep SEO findings
- `web-performance` — performance diagnosis details
- `seo-audit` — full optimization pipeline
- `search-rank` — deep keyword analysis
- `seo-pulse` — quick health check (lighter weight)
