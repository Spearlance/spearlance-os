---
model: claude-sonnet-4-6
name: search-rank
description: Use when analyzing keyword rankings, identifying page-1 opportunities, tracking position changes, detecting SERP features, or classifying search intent from GSC data. Also use when you need a data-driven ranking report with actionable recommendations.
---

# Search Rank

## Overview

Deep keyword ranking analysis using Google Search Console data. Identifies page-1 opportunities (positions 8–20 with real volume), tracks position changes over time, correlates ranking shifts with optimization actions, and classifies search intent for smarter targeting.

This is the data-driven complement to `seo-audit`. Use it when you need to understand ranking performance before deciding what to fix.

---

## Quick Reference

| Analysis | What It Finds |
|----------|--------------|
| Page-1 opportunities | Keywords at position 8–20, high impressions |
| CTR anomalies | Keywords where actual CTR ≠ expected for position |
| Position trends | Week-over-week movement for tracked keywords |
| SERP feature detection | Featured snippets, local pack, PAA affecting CTR |
| Intent classification | Informational vs navigational vs transactional |
| Content gap | High-volume keywords with no ranking page |

---

## Data Sources

### Primary: Google Search Console

Use the `google-search-console-api` skill to query:

```
searchAnalytics.query
  - dimensions: [query, page, date]
  - dateRange: last 90 days
  - rowLimit: 1000
  - orderBy: impressions DESC
```

Returns: `query`, `page`, `clicks`, `impressions`, `ctr`, `position`

**Key limitation:** GSC data has a 2–3 day lag. Do not diagnose daily fluctuations — analyze weekly averages.

### Secondary: Optimization Log

Check `.claude/progress/optimization-log/changes.jsonl` if it exists. Format:

```json
{
  "date": "2026-01-15",
  "action": "Updated title tag",
  "target": "/services/plumbing",
  "keyword": "emergency plumber near me"
}
```

Used to correlate ranking changes with specific actions.

---

## Analysis Pipeline

### Step 1: Pull All Data

Query GSC for the last 90 days with all three dimensions:

```
Queries (90-day aggregate):
  Top 1000 by impressions
  Columns: query, clicks, impressions, ctr, position

Pages (90-day aggregate):
  All pages
  Columns: page, clicks, impressions, ctr, position

Weekly trend (for top 25 keywords):
  Group by week
  Track position week-over-week
```

### Step 2: Identify Page-1 Opportunities

The highest-ROI optimization target: keywords at positions 8–20 with meaningful volume.

**Selection criteria:**

- Average position: 8.0–20.0
- Impressions (90-day): > 100
- Sort by impressions descending

**Why this matters — CTR at different positions:**

| Position | Expected CTR | Clicks gained moving to P1 |
|----------|-------------|---------------------------|
| 1 | 28–35% | Baseline |
| 2–3 | 10–18% | — |
| 4–7 | 4–8% | — |
| 8–10 | 2–4% | 7–15x CTR increase from pos 10 → 1 |
| 11–20 | 0.5–2% | 15–70x CTR increase from pos 15 → 1 |

A keyword at position 11 with 5,000 monthly impressions and 1% CTR = 50 clicks. At position 5 (3% CTR) = 150 clicks. Same page, different optimization.

### Step 3: CTR Anomaly Detection

Compare actual CTR against expected CTR for each position band:

**Above expected CTR:** Title and description are compelling — preserve them.

**Below expected CTR (by > 30%):** The meta title/description is underperforming. Causes:
- Weak or generic title
- SERP feature competition (featured snippet, local pack stealing clicks)
- Mismatch between search intent and title

Flag all keywords where `actual_ctr < expected_lower_bound × 0.7`.

### Step 4: SERP Feature Detection

Low CTR at good positions often means a SERP feature is absorbing clicks. Check for:

| Feature | How to detect |
|---------|--------------|
| Featured snippet | Search the query — is there a box above organic results? |
| Local pack | Map results appearing for local queries |
| People Also Ask | PAA box appearing between organic results |
| Knowledge panel | Entity results for brand/product queries |
| Shopping ads | Product listing ads above organic |
| Image pack | Image results inserted in organic SERP |

For queries with SERP features, note this in recommendations — standard on-page optimization may not move the needle. Featured snippet optimization (question format, clear answers, tables) can win that box instead.

### Step 5: Search Intent Classification

Classify each keyword by intent:

| Intent | Signals | Best Content Type |
|--------|---------|------------------|
| Informational | "how", "what", "why", "guide", "tips" | Blog post, guide, FAQ |
| Navigational | Brand name, specific site | Homepage, brand page |
| Commercial | "best", "top", "review", "compare", "vs" | Comparison page, review |
| Transactional | "buy", "price", "near me", "service" | Service/product page, local page |

Pages ranking for the wrong intent are not optimally matched. Example: a blog post ranking for "near me" queries needs a location page instead.

### Step 6: Content Gap Analysis

Keywords with high impressions but no strong ranking page:

- Position > 20 for a keyword with > 500 monthly impressions = content gap
- Position 20–50 means Google is trying to rank something but nothing fits
- These are new content creation opportunities, not optimization opportunities

Compare keyword list against page inventory to find unmatched high-volume queries.

### Step 7: Correlate with Optimization Log

For every entry in `changes.jsonl`:

1. What keyword was targeted?
2. What was position before the change date?
3. What is position 4+ weeks after?
4. Did impressions change? CTR change?

Note: ranking changes typically lag 2–6 weeks after on-page changes.

---

## Output Format

Generate a markdown report:

```markdown
# Search Rank Analysis — [Date]

## Key Metrics (90-day)
Total clicks:       [N]
Total impressions:  [N]
Average CTR:        [N%]
Average position:   [N]

## Top 10 Keywords
| Keyword | Position | Impressions | Clicks | CTR | Trend |
|---------|----------|-------------|--------|-----|-------|
| ...     |          |             |        |     | ↗/→/↘ |

## Page-1 Opportunities (positions 8–20)
| Keyword | Position | Impressions | Current CTR | Potential Clicks @ P3 | Action |
|---------|----------|-------------|-------------|----------------------|--------|

## CTR Optimization Targets
| Keyword | Position | Expected CTR | Actual CTR | Gap | SERP Feature? |
|---------|----------|-------------|------------|-----|---------------|

## Position Trends (Top 10 keywords, weekly)
[table showing position per week]

## Content Gaps (high impressions, low position)
| Keyword | Impressions | Current Position | Recommended Action |
|---------|-------------|------------------|--------------------|

## Intent Mismatches
| Keyword | Intent | Current Page Type | Correct Page Type |
|---------|--------|------------------|------------------|

## Optimization Correlations
| Change Date | Action | Keyword | Before | After | Result |
|-------------|--------|---------|--------|-------|--------|

## Recommendations (priority order)
1. [highest impact action — specific]
2. ...
```

Save to `.claude/progress/search-rank-[YYYY-MM-DD].md`

---

## Prioritization Framework

After analysis, rank recommendations by:

1. **Opportunity size** — impressions × CTR gap
2. **Effort required** — meta update (low) vs content rewrite (high) vs new page (highest)
3. **Strategic value** — does this keyword convert?

**Decision matrix:**

| Scenario | Action |
|----------|--------|
| Position 8–12, high impressions, low CTR | Optimize title/description first |
| Position 8–12, high impressions, normal CTR | Content depth and E-E-A-T |
| Position 13–20, high impressions | Both: content depth + on-page |
| Position > 20, high impressions | New content or dedicated landing page |
| Good position, low CTR, SERP feature present | Target featured snippet format |
| Transactional keyword ranking on blog post | Create service/product page |

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Obsessing over daily positions | Weekly averages over 4+ weeks — daily data is noise |
| Targeting position 1 for every keyword | Position 3 on a high-volume term > position 1 on a low-volume term |
| Ignoring CTR at good positions | Position 4 with 0.5% CTR = broken title/description |
| Treating all "near me" as one keyword | GSC aggregates — actual queries may vary widely |
| Optimizing pages without matching intent | Wrong page type will never rank for transactional intent |
| Confusing impressions with traffic | Impressions = shown, clicks = actual traffic — both matter |
| Forgetting the 2–6 week ranking lag | Don't judge optimization results too quickly |

---

## Related Skills

- `google-search-console-api` — data queries and URL inspection
- `ga4-api` — user behavior data on landing pages
- `seo-audit` — full optimization pipeline
- `seo-pulse` — quick weekly health check
- `site-report` — comprehensive HTML deliverable
- `link-analysis` — authority building to support rankings

---

## AI Search Intent Classification

Identify keywords where LLMs answer instead of traditional SERP results. These keywords are losing click value as users get answers from ChatGPT, Claude, Perplexity, and Google AI Overviews without visiting the site.

**Process:**
1. Pull top 50 keywords from GSC by impressions
2. For each keyword, check:
   - Does Google show an AI Overview? (search manually or use SERP API)
   - Does ChatGPT/Perplexity answer this query directly?
   - Is the click-through rate unusually low for its position?
3. Classify each keyword:
   | Classification | CTR Signal | AI Answer? | Action |
   |---------------|------------|------------|--------|
   | Traditional | Normal CTR | No | Maintain position |
   | AI-Threatened | Declining CTR | Yes, but links to sources | Optimize for citation |
   | Zero-Click | Very low CTR | Yes, complete answer | Deprioritize or pivot to commercial intent |
   | AI-Opportunity | N/A | Cites competitors | Create content to get cited |

4. Cross-reference `ai-visibility` for deeper AI citation analysis

---

## Zero-Click Detection

Keywords dominated by featured snippets, AI Overviews, People Also Ask, and knowledge panels. These queries are "answered in SERP" — users get what they need without clicking.

**Detection signals:**
- Position 1-3 with CTR < 5% = likely zero-click
- Featured snippet present = 50%+ clicks captured by snippet
- AI Overview present = significant click reduction
- PAA (People Also Ask) expanded = click distribution fragmented

**Prioritization:**
- Focus content investment on keywords with actual click potential
- For zero-click keywords: aim for the featured snippet/AI citation instead of organic position
- For service businesses: commercial intent keywords ("hire [service] [city]") rarely have zero-click — prioritize these

Cross-reference: `ai-visibility` for AI citation strategy on zero-click keywords.
