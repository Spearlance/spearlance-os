---
model: claude-sonnet-4-6
name: seo-pulse
description: Use when doing a quick SEO health check — Core Web Vitals status, index health, ranking changes, search analytics summary, AI citation status, conversion health, or tracking health. Also use when you need a fast diagnostic without a full audit, or when checking if recent changes improved performance.
---

# SEO Pulse

## Overview

Single-command SEO diagnostic. Checks all key health signals — Core Web Vitals (field + lab), index status, ranking changes, algorithm updates, AI citation status, conversion health, and tracking integrity — in one pass. This is the quick daily/weekly health check. For a full audit with execution, use `seo-audit`.

```
Phase 1: Google Search Central RSS (algorithm updates)
Phase 2: Core Web Vitals — CrUX field data + Lighthouse lab comparison
Phase 3: Rankings check (GSC — position changes, opportunities)
Phase 4: Index health (coverage, sitemap, manual actions)
Phase 5: Performance trends (week-over-week CWV direction)
Phase 6: AI Citation Pulse (ChatGPT/Perplexity citation check)
Phase 7: Conversion Health (GA4/PostHog funnel summary)
Phase 8: Tracking Health (analytics stack event verification)
──► Structured status report
```

---

## Quick Reference

| Signal | Data Source | Target |
|--------|------------|--------|
| LCP p75 (mobile) | CrUX field data | < 2500ms |
| CLS p75 (mobile) | CrUX field data | < 0.1 |
| INP p75 (mobile) | CrUX field data | < 200ms |
| LCP (lab) | Lighthouse | < 2500ms |
| Indexed pages | GSC Coverage API | No excluded pages |
| Top keyword position | GSC Search Analytics | Track trend direction |
| Near-page-1 keywords | GSC position 8–20 | Identify, flag |
| Sitemap indexed | GSC Sitemaps API | Submitted = indexed |
| AI citations | ChatGPT / Perplexity | Cited for core services |
| Site conversion rate | GA4 / PostHog | Positive MoM trend |
| Tracking health | All platforms | Events flowing, no errors |

---

## Invocation Options

```
seo-pulse              # Full check (all 8 phases)
seo-pulse vitals       # Phase 2 + 5 only (CWV current + trend)
seo-pulse rankings     # Phase 3 only
seo-pulse index        # Phase 4 only
seo-pulse rss          # Phase 1 only
seo-pulse ai           # Phase 6 only (AI citation pulse)
seo-pulse conversion   # Phase 7 only
seo-pulse tracking     # Phase 8 only
```

---

## Phase 1: Algorithm & Documentation Updates

### Data Source

Fetch Google Search Central RSS:

```
https://developers.google.com/search/updates/search_docs_updates.rss
```

### Process

1. Fetch the RSS feed via WebFetch
2. Parse entries (`<title>`, `<pubDate>`, `<description>`, `<guid>`)
3. Compare against cached GUIDs at `.claude/agent-memory/seo-pulse/rss-cache.json`
4. For each new entry, score relevance to the site:
   - HIGH — directly affects indexing, ranking factors, or structured data
   - MEDIUM — general best practice update
   - LOW — not relevant to this site type
5. Update the cache with new GUIDs and current timestamp

### Output

List new updates with relevance score and required action. If none, note "No new updates since [date]."

---

## Phase 2: Core Web Vitals (Field + Lab)

### Data Sources

**Primary — CrUX field data** via `crux-api` skill or PageSpeed Insights API:

```
GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
  ?url={origin}&strategy=mobile&key={API_KEY}
```

Extract `loadingExperience.metrics` for p75 field values.

**Secondary — Lighthouse lab data** from `lighthouseResult.audits` in the same API response.

### Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2500ms | 2500–4000ms | > 4000ms |
| CLS | < 0.1 | 0.1–0.25 | > 0.25 |
| INP | < 200ms | 200–500ms | > 500ms |

### Process

1. Query CrUX field data for origin (mobile + desktop)
2. Query Lighthouse lab scores from the same endpoint
3. Check each metric against thresholds for both field and lab
4. Compare field p75 vs lab scores:
   - Gap > 20% = caching/CDN issue or real-world conditions diverging from lab
   - Flag field-vs-lab divergence as a diagnostic signal
5. Flag any metric in NI or Poor category

### Output

```
Core Web Vitals
              Field (p75)    Lab       Status
LCP           1840ms         1620ms    ✓ Good
CLS           0.04           0.02      ✓ Good
INP           120ms          90ms      ✓ Good

Field/lab gap: within normal range
```

---

## Phase 3: Rankings Check

Use the `google-search-console-api` skill.

### Queries to Run

```
searchAnalytics.query — last 28 days vs prior 28 days
  dimensions: [query]
  rowLimit: 50
  orderBy: impressions DESC
```

### Process

1. Pull top 50 keywords by impressions for the last 28 days
2. Pull same keywords for the prior 28-day period (date offset)
3. Calculate position delta: `current_position - prior_position`
4. Identify:
   - **Drops**: position increased by > 3 (moved down)
   - **Gains**: position decreased by > 3 (moved up)
   - **Near-page-1**: avg position 8–20 with impressions > 100
5. Check actual CTR vs expected CTR for each position band

### CTR Benchmarks

| Position | Expected CTR |
|----------|-------------|
| 1 | 25–35% |
| 2–3 | 8–18% |
| 4–7 | 3–8% |
| 8–10 | 2–4% |
| 11–20 | 0.5–2% |

Keywords where actual CTR is below the lower bound for their position = title/description needs work.

### Output

Top 10 keywords table + position change column. Near-page-1 opportunity list. Alerts for drops > 5 positions.

### GSC Monitoring Triggers (Doctrine S12.1)

Flag pages meeting any of these criteria during the weekly review:

| Condition | Action |
|-----------|--------|
| Impressions > 500/month AND CTR < 2% | Title/description rewrite needed |
| Impressions > 1,000/month AND CTR < 3% | HIGH-PRIORITY title rewrite |
| Position 8-20 AND impressions rising | Content expansion opportunity |
| Queries triggering a page that don't match page intent | Evaluate for new page creation — see `seo-doctrine` rule (Page Context Protection) |

Process: Pull pages with high impressions (top 20 by impressions). For each, calculate CTR. Flag any page matching the triggers above.

### Title/Description Rewrite Protocol (Doctrine S12.2)

**Trigger:** Page flagged per GSC Monitoring Triggers above.

1. Record current title and description
2. Write new title following meta title rules (see `seo-doctrine` rule)
3. Write new description following meta description rules (see `seo-doctrine` rule)
4. Deploy change
5. Monitor for 14 days

**Rollback Rule:**

```
If CTR drops > 20% within 14 days of change
  → Revert to previous title/description
  → Flag for manual review by Garrett
  → Document what was tried and the result
```

### Keyword Expansion from Query Data (Doctrine S12.3)

**Trigger:** Weekly Search Console review.

```
If a query is generating impressions but no dedicated page exists
  AND the query has commercial or informational intent
  AND estimated monthly volume > 50
  → Recommend new page creation
  → Add to content calendar

If a query is generating impressions on a page with mismatched intent
  → Recommend creating a new, properly targeted page
  → Do NOT modify the existing page's intent
```

---

## Phase 4: Index Health

Use the `google-search-console-api` skill.

### Checks

1. **Coverage report** — query for excluded/errored URLs
   - Redirect errors
   - Crawl anomalies
   - 404/soft 404 pages
   - Noindexed pages (check if any should be indexed)

2. **Sitemap status** — compare submitted vs indexed counts
   - Flag if indexed < submitted (Google skipping pages)
   - Flag if sitemap has errors

3. **Manual actions** — check for any active manual penalties

4. **URL inspection** — spot-check 3–5 key pages for index status

### Output

```
Index Health
Indexed       142 pages
Excluded      8 pages  (4 noindex, 3 redirect, 1 soft-404)
Sitemap       submitted: 148 | indexed: 142
Manual actions  none
```

---

## Phase 5: Performance Trends

### Process

1. Compare current CWV field data (Phase 2) against data from 4 weeks ago
2. Calculate direction for each metric:
   - LCP: `old_value - new_value` → positive = improving
   - CLS: same
   - INP: same
3. Check `.claude/progress/optimization-log/changes.jsonl` if it exists — correlate recent changes with metric direction
4. Note if a specific optimization correlated with improvement

### Trend Labels

| Direction | Threshold |
|-----------|-----------|
| Improving | > 5% better than 4 weeks ago |
| Stable | Within 5% either direction |
| Degrading | > 5% worse than 4 weeks ago |

### Output

```
Performance Trends (4-week)
LCP    1840ms → 1720ms   ↗ Improving
CLS    0.04  → 0.04      → Stable
INP    120ms → 130ms     → Stable
```

---

## Phase 6: AI Citation Pulse

5-minute LLM citation check. Surfaces whether the business is being recommended by AI assistants for its core services — one of the fastest-growing traffic channels.

### Process

1. Identify 2–3 core service queries from the site's content or GSC top keywords
   - Format: `"best [service] in [city]"` or `"who does [service] near me"`
2. Query each in ChatGPT (web browsing mode) and Perplexity
3. Check if the client's business name or domain appears in the response
4. Note any competitors that ARE cited in the same response
5. Compare against cached results at `.claude/agent-memory/seo-pulse/ai-citations.json`
   - Update with current date and citation status
   - Track month-over-month changes

### Citation Cache Schema

```json
{
  "last_checked": "YYYY-MM-DD",
  "queries": [
    {
      "query": "best plumber in Austin",
      "chatgpt": { "cited": false, "competitors_cited": ["ABC Plumbing"] },
      "perplexity": { "cited": true, "competitors_cited": [] }
    }
  ]
}
```

### Flags

- ◆ Competitor cited, client not — highest priority gap
- ⚠ Client not cited on either platform — growing visibility risk
- ✓ Client cited on both — monitor for consistency

### Output

```
## AI Citation Status
| Query | ChatGPT | Perplexity | Competitors Cited |
|-------|---------|------------|-------------------|
| best plumber in Austin | ✗ | ✓ | ABC Plumbing (ChatGPT) |
| Austin emergency plumber | ✗ | ✗ | XYZ Plumbing, FastFlow |
| water heater repair Austin | ✓ | ✓ | none |
```

▸ If competitor is cited but client isn't, reference `ai-visibility` for deep analysis and citation-building playbook.

---

## Phase 7: Conversion Health

Quick funnel check against GA4 or PostHog data. Surfaces conversion rate changes before they become revenue problems.

### Data Sources

- **GA4** via `ga4-api` skill — goals/conversions, session data, landing page reports
- **PostHog** via PostHog API — funnel analysis, form completion events, phone click events

### Metrics to Pull

1. **Overall conversion rate** — sessions → goal completions, current month vs last month
2. **Top 5 landing pages** by sessions — conversion rate per page, MoM trend
3. **Form completion rate** — if form submit events exist: `form_submit / form_start`
4. **Phone click rate (mobile)** — `phone_click / mobile_sessions` — key for local/service businesses
5. **CTA click rate** — primary CTA events if tagged

### Process

1. Query GA4 for conversion events over the last 30 days and prior 30 days
2. Calculate MoM change for each metric
3. Flag any metric with > 15% MoM decline
4. Cross-reference landing page conversion drops against ranking changes (Phase 3) — declining rank → less qualified traffic → conversion drop

### Output

```
## Conversion Health
| Metric | This Month | Last Month | Trend |
|--------|-----------|------------|-------|
| Site conversion rate | 3.2% | 3.8% | ↘ -0.6% |
| /services/plumbing | 4.1% | 4.0% | → Stable |
| /contact | 8.3% | 9.1% | ↘ -0.8% |
| Form completion rate | 61% | 68% | ↘ -7% |
| Phone click rate (mobile) | 5.4% | 5.3% | → Stable |
```

▸ If overall conversion rate is declining > 15% MoM, reference `cro-audit` for root cause analysis and fix playbook.

---

## Phase 8: Tracking Health

Verify the entire analytics stack is receiving events correctly. Tracking breaks silently — this catches it before it distorts decision-making.

### Platforms to Check

- GA4
- PostHog
- Meta CAPI (if configured)
- Pinterest CAPI (if configured)

### Process

1. **Event count trend** — Pull total event count for the last 7 days vs prior 7 days
   - Drop > 20% = tracking likely broke on a specific date
   - Check against deployment log if available

2. **CAPI error rate** — For Meta and Pinterest CAPI:
   - Pull Events Manager error log for the last 7 days
   - Flag any `invalid_event`, `deduplication_failed`, or `no_match` errors > 5%

3. **Last event timestamp** — Confirm each platform received an event within the last 24 hours
   - No recent events = platform not receiving data

4. **Key event coverage** — Verify core events are firing:
   - `page_view`, `session_start` (GA4)
   - `purchase` / `lead` conversion events (GA4 + CAPI)
   - Form submit events (all platforms)

### Output

```
## Tracking Health
| Platform | Receiving Events | Error Rate | Last Event |
|----------|-----------------|------------|------------|
| GA4 | ✓ | 0% | < 1h ago |
| PostHog | ✓ | 0% | < 1h ago |
| Meta CAPI | ✓ | 2.1% | < 1h ago |
| Pinterest CAPI | ✗ | — | 3 days ago |
```

▸ If any platform shows ✗ or error rate > 5%, reference `server-side-tracking` launch checklist for diagnosis and repair steps.

---

## Final Report Format

```
# SEO Pulse — [Date]

## Status Overview
Algorithm updates     [✓ No new | ⚠ N new (H/M/L)]
Core Web Vitals       [✓ All Good | ⚠ LCP NI | ✗ Poor]
Field vs Lab          [✓ Aligned | ⚠ >20% gap detected]
Rankings              [✓ Stable | ⚠ N drops | ● N opportunities]
Index health          [✓ Clean | ⚠ N excluded | ✗ errors]
Performance trend     [↗ Improving | → Stable | ↘ Degrading]
AI citations          [✓ Cited | ⚠ Partial | ✗ Not cited]
Conversion health     [✓ Stable | ⚠ Declining | ✗ Drop >15%]
Tracking health       [✓ All platforms | ⚠ Errors | ✗ Platform down]

## AI Citation Status
| Query | ChatGPT | Perplexity | Competitors Cited |
|-------|---------|------------|-------------------|

## Conversion Health
| Metric | This Month | Last Month | Trend |
|--------|-----------|------------|-------|

## Tracking Health
| Platform | Receiving Events | Error Rate | Last Event |
|----------|-----------------|------------|------------|

## Action Items
HIGH    [specific action]
MEDIUM  [specific action]
LOW     [specific action]
```

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Using only lab data for CWV | Google ranks on field data — always show CrUX p75 first |
| Ignoring field/lab divergence | >20% gap signals real-world conditions lab can't capture |
| Treating any position drop as a crisis | Check trend over 4+ weeks — daily fluctuation is noise |
| Ignoring low-CTR pages at good positions | CTR below expected = meta optimization opportunity |
| Skipping the RSS check | Algorithm updates can explain ranking shifts |
| Not updating the RSS cache | Without cache, every entry looks "new" |
| Checking rankings hourly | GSC data has a 2–3 day lag — weekly cadence is right |
| Skipping AI citation check | Competitors getting cited while client isn't = growing gap |
| Treating conversion drops as traffic problems | Check funnel completion — traffic quality vs page conversion |
| Assuming tracking is working | Tracking breaks silently — always verify event flow |

---

## Related Skills

- `google-search-console-api` — GSC data queries
- `lighthouse-api` — Lighthouse and PageSpeed Insights
- `crux-api` — CrUX field data for CWV p75 values
- `ai-visibility` — deep AI citation analysis and citation-building playbook
- `cro-audit` — full conversion rate optimization when conversion is declining
- `server-side-tracking` — tracking health fixes and CAPI repair
- `search-rank` — deep keyword analysis and position tracking
- `review-management` — review health quick check
- `seo-audit` — full audit when pulse shows problems
- `site-report` — comprehensive HTML deliverable
