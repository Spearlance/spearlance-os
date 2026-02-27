---
model: claude-sonnet-4-6
name: monthly-pulse
description: Use when running a monthly retainer health check, creating a monthly report, or checking SEO/CRO/performance/review health for an ongoing client. Also use when the user says "monthly check" or "retainer report".
---

# Monthly Pulse

## Overview

Recurring monthly health check for retainer clients. Lighter than `client-audit` — focuses on trends, changes, and ongoing health rather than deep analysis. Chains 7 skills into a single retainer deliverable. Run once a month, every month.

```
Phase 1: Health Signals     → seo-pulse + crux-api (CWV trend)
Phase 2: Rankings           → search-rank (position changes, new opportunities)
Phase 3: Conversion Health  → cro-audit quick mode (rate trend only)
Phase 4: Reputation         → review-management (new reviews, response audit)
Phase 5: AI Visibility      → ai-visibility citation pulse (abbreviated)
Phase 6: Active Experiments → ab-testing (running A/B results)
Phase 7: Deliverable        → site-report (MoM HTML report + exec summary)
──► reports/monthly-pulse-[YYYY-MM].html
```

**Duration:** 1–2 hours
**Cadence:** Monthly — same week every month for trend consistency

---

## Before You Start

Confirm these inputs before running any phase:

| Input | Source |
|-------|--------|
| Client name | User or business.json |
| Report month | User — e.g. "January 2026" |
| Prior pulse report | `reports/monthly-pulse-[prior-YYYY-MM].html` (for MoM comparison) |
| Active A/B tests | User or `ab-testing` state file |

If no prior report exists, note "baseline month" in the deliverable — no MoM comparison available.

---

## Phase 1: Health Signals

**Invoke:** `seo-pulse`
**Invoke:** `crux-api` — 4-week performance trend (month-over-month CWV comparison)

**What to collect:**

- GSC: clicks, impressions, avg position vs prior 28-day period
- CWV field data (CrUX p75): LCP, INP, CLS — current vs 4 weeks prior
- Index health: any new excluded or errored pages
- Algorithm updates: any new entries in Google Search Central RSS since last pulse

**Output format:**

```
Health Signals — [Month YYYY]
                      This Month    Last Month    Trend
GSC clicks            [N]           [N]           ↑/↓/→
GSC avg position      [N]           [N]           ↑/↓/→
LCP p75 (mobile)      [Nms]         [Nms]         ↑/↓/→
INP p75 (mobile)      [Nms]         [Nms]         ↑/↓/→
CLS p75 (mobile)      [N]           [N]           ↑/↓/→
Index coverage        [N indexed]   [N indexed]   ↑/↓/→
Algorithm updates     [N new]       —             —
```

**Flags:**
- ◆ Any CWV metric crossing Good → Needs Improvement
- ⚠ GSC clicks down > 15% MoM
- ⚠ New algorithm update rated HIGH relevance for this site type

**Time:** 15–20 min

---

## Phase 2: Rankings

**Invoke:** `search-rank` — position changes since last month, new keyword opportunities

**What to collect:**

- Top 50 keywords by impressions: current position vs last month
- Keywords with position delta > ±3
- Keywords entering top 20 (not tracked last month or previously beyond 20)
- Keyword entering or leaving positions 1–3 (high-impact zone)

**Output format:**

```
Rankings — [Month YYYY]
Keyword                  Position    Last Month    Delta
[keyword 1]              [N]         [N]           ↑N / ↓N / →
[keyword 2]              [N]         [N]           ...
...

Near-page-1 Opportunities (position 8–20, impressions > 100):
[keyword]   pos [N]   [N] impressions   → Target for content refresh
```

**Flags:**
- ◆ Any target keyword dropped 5+ positions → investigate (algorithm, competitor, page change)
- ● Any keyword entering top 20 → opportunity, flag for content or CRO attention

**Time:** 15–20 min

---

## Phase 3: Conversion Health

**Invoke:** `cro-audit` in quick mode — conversion rate trend only, skip full funnel analysis

**What to collect:**

- Overall site conversion rate: this month vs last month vs 3-month average
- Top 5 landing pages by traffic: conversion rate per page, MoM delta
- Form completion rate MoM
- Phone click rate (mobile) MoM

**Output format:**

```
Conversion Health — [Month YYYY]
                      This Month    Last Month    3-Mo Avg    Trend
Site conversion rate  [N%]          [N%]          [N%]        ↑/↓/→
Form completion       [N%]          [N%]          [N%]        ↑/↓/→
Phone click (mobile)  [N%]          [N%]          [N%]        ↑/↓/→

Landing Page Breakdown:
Page                  Conv Rate     Last Month    Delta
[/page-1]             [N%]          [N%]          ↑/↓/→
[/page-2]             [N%]          [N%]          ↑/↓/→
```

**Flags:**
- ◆ Any conversion rate drop > 10% MoM → investigate (cross-reference Phase 2 rankings drops)
- ⚠ Form completion < 50% → flag for `cro-audit` deep dive next month
- ℹ If conversion drop correlates with ranking drop on same page: likely traffic quality issue, not UX

**Time:** 10–15 min

---

## Phase 4: Reputation

**Invoke:** `review-management` — new reviews since last pulse, response audit

**What to collect:**

- New reviews since last pulse: count per platform (Google, Yelp, Facebook)
- Average rating this month vs prior month
- Response rate: % of all reviews with owner response
- Response time: median hours to first response
- Unresponded reviews: list any reviews > 48h without a response

**Output format:**

```
Reputation — [Month YYYY]
                      This Month    Last Month    Trend
New reviews           [N]           [N]           ↑/↓/→
Google avg rating     [N.N★]        [N.N★]        ↑/↓/→
Response rate         [N%]          [N%]          ↑/↓/→
Median response time  [Nh]          [Nh]          ↑/↓/→

Unresponded reviews (> 48h):
Platform    Reviewer    Rating    Date    Age
[Google]    [Name]      [N★]      [Date]  [Nh ago]
```

**Flags:**
- ◆ Any unresponded reviews > 48h old → urgent, draft response immediately
- ⚠ Average rating dropped 0.2+ stars → investigate negative review content
- ⚠ Response rate below 80% → flag pattern, not just individual review

**Time:** 10–15 min

---

## Phase 5: AI Visibility

**Invoke:** `ai-visibility` — abbreviated citation pulse check, not full analysis

**What to collect:**

- 3–5 core service queries: are we being cited by ChatGPT and Perplexity?
- Any new citations vs prior month
- Any competitor citations that appeared or disappeared
- AI referral traffic from GA4 (chatgpt.com, perplexity.ai, claude.ai) — MoM

**Output format:**

```
AI Visibility — [Month YYYY]
Query                          ChatGPT    Perplexity    vs Last Month
[best service in city]         ✓/✗        ✓/✗           ↑/↓/→
[related query]                ✓/✗        ✓/✗           ↑/↓/→

AI Referral Traffic
Source                This Month    Last Month    Trend
chatgpt.com           [N]           [N]           ↑/↓/→
perplexity.ai         [N]           [N]           ↑/↓/→
Total AI referral     [N]           [N]           ↑/↓/→
```

**Flags:**
- ◆ Competitor newly cited where we previously were → escalate to full `ai-visibility` next month
- ⚠ Dropped from citation on either platform vs last month → investigate content changes
- ✓ Cited consistently → monitor, no action needed

**Time:** 10–15 min

---

## Phase 6: Active Experiments

**Invoke:** `ab-testing` — review any running A/B test results

**What to collect:**

- Status of each running test: running / concluded / needs-more-data
- If concluded: winning variant, lift percentage, statistical confidence
- If needs-more-data: estimated time to significance at current traffic rate
- Implementation status of previously concluded winners

**Output format:**

```
A/B Tests — [Month YYYY]
Test                   Status              Confidence    Lift     Action
[Hero CTA copy]        concluded           97%           +14%     Implement winner
[Contact form layout]  running             62%           +3%      Wait — est. 3 more weeks
[Service page header]  needs-more-data     —             —        Continue running
```

**Flags:**
- ● Concluded test with > 95% confidence → implement winner this week, document result
- ⚠ Test running > 6 weeks with < 70% confidence → consider stopping (insufficient traffic)
- ℹ If no active tests: recommend 1–2 hypotheses for next month's test plan

**Skip this phase if no active experiments.** Note "no active experiments" in deliverable.

**Time:** 5–10 min (or skip)

---

## Phase 7: Deliverable

**Invoke:** `site-report` — month-over-month HTML comparison report

**What to produce:**

- `reports/monthly-pulse-[YYYY-MM].html` — self-contained HTML report
- 5-bullet executive summary for client communication (see template below)
- Comparison against prior pulse report where available

**Report structure:**

Simpler than the full `site-report` — monthly pulse focuses on MoM trends, not full audit depth. Sections:

1. Executive Summary (5-bullet)
2. Rankings table with MoM delta
3. CWV health table with MoM trend
4. Conversion rate table with MoM delta
5. Review health summary
6. AI visibility citation status
7. A/B test results
8. Action items (prioritized)

**HTML output requirements:**
- Self-contained — inline CSS, no external dependencies
- Color-coded status: green (improving/stable) / yellow (watch) / red (decline/urgent)
- MoM delta column on every metric table
- Trend arrows: ↑ green, ↓ red, → neutral

---

## Executive Summary Template

```
## Monthly Pulse — [Client Name] — [Month YYYY]

### Executive Summary
1. [Top win this month — e.g., "Rankings improved for 12 target keywords, 3 entering top 10"]
2. [Top concern — e.g., "Conversion rate dipped 8% on /services page — investigating"]
3. [Review health — e.g., "7 new Google reviews (avg 4.8★), all responded within 24h"]
4. [Performance — e.g., "LCP improved from 3.2s to 2.4s after image optimization"]
5. [Next month focus — e.g., "Launch A/B test on hero CTA, publish 4 content pieces"]

### Action Items
- [ ] [Priority action 1 — specific page/metric/owner]
- [ ] [Priority action 2 — specific page/metric/owner]
- [ ] [Priority action 3 — specific page/metric/owner]
```

**Rules for executive summary:**
- Bullet 1 = always the month's clearest win — clients need to feel progress
- Bullet 2 = be direct about concerns — never bury bad news
- Bullet 5 = always forward-looking — next month focus keeps momentum
- Action items = max 5, specific enough to assign and complete, not "improve SEO"

---

## Output

```
reports/monthly-pulse-[YYYY-MM].html    ← MoM comparison HTML report
```

Plus: 5-bullet executive summary pasted directly in chat for immediate client communication.

---

## Trend Notation

Use consistently across all output:

| Symbol | Meaning |
|--------|---------|
| ↑ | Improved vs last month (positive direction) |
| ↓ | Declined vs last month (negative direction) |
| → | Stable — within ±5% of last month |
| ↗ | Improving trend over multiple months |
| ↘ | Declining trend over multiple months |

For rankings: ↑ = position number went down (better). Note this explicitly in the report to avoid client confusion.

---

## Monthly Maintenance Pairs

This skill works best alongside:

- `review-management` — run ongoing between pulses, not just monthly
- `content-strategy` — execute editorial calendar between pulses, pulse validates impact

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Running pulse without prior report | Note "baseline month" — no MoM comparison, all metrics are baselines |
| Treating all metrics equally | Rankings and conversion rate > technical signals for client communication |
| Writing vague exec summary bullets | "Rankings improved for 12 keywords" not "rankings improved this month" |
| Skipping A/B test review | Concluded tests need to be implemented — check every month |
| Ignoring unresponded reviews | > 48h unresponded = ◆ urgent, not ⚠ warning |
| Not flagging correlation across phases | Ranking drop + conversion drop on same page = same root cause |
| Generating report without reading prior | Always read `reports/monthly-pulse-[prior-YYYY-MM].html` before writing MoM |
| Reporting AI citations without traffic data | Citations without GA4 referral data is incomplete — always pull both |

---

## Related Skills

- `seo-pulse` — Phase 1: quick SEO health check
- `crux-api` — Phase 1: 4-week CWV trend data
- `search-rank` — Phase 2: keyword position changes and opportunities
- `cro-audit` — Phase 3: conversion rate trend (quick mode) and deep dive
- `review-management` — Phase 4: new reviews, response audit, reputation health
- `ai-visibility` — Phase 5: LLM citation pulse check
- `ab-testing` — Phase 6: running experiment status and winner implementation
- `site-report` — Phase 7: MoM HTML deliverable generation
- `client-audit` — Full onboarding audit (run once — monthly-pulse is the follow-up)
- `content-strategy` — Editorial calendar execution between pulses
