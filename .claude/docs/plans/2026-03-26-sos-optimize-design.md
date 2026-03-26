# SOS Optimization Engine — Design Document

**Codename:** `sos-optimize`
**Date:** 2026-03-26
**Status:** Approved

## Overview

AI-driven continuous site optimization engine that analyzes data from SOS Tracker v3, CWV metrics, Microsoft Clarity, SEO reports, and DataforSEO to generate specific, doctrine-compliant recommendations for improving SEO and CRO across all client sites.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Multi-tenant, per client | Works for any site with SOS tracker installed |
| Action tier | Recommend + draft (B) | AI generates specific drafts; team copies. Blog auto-publish via Duda API is the exception |
| Cadence | Weekly cycle + threshold alerts (B) | Manageable volume, urgent issues caught in real-time |
| Learning loop | Change tracking with baselines (B) | Snapshots metrics at recommendation time, checks at 7/14/21 days, flags regressions |
| Keyword data | DataforSEO (primary), GSC (future optional) | Zero per-client setup, includes competitor data. GSC deferred due to per-property auth |
| Existing system | Evolve, not duplicate | Reuse `website_pages` + `crawl-website-page`. `page_content_analysis` superseded by `optimization_recommendations`. Avatar alignment becomes one signal in broader analysis |

## Data Sources

1. **SOS Tracker v3** — `web_events`, `conversion_events` (page views, engagement, conversions, click IDs, bot filtering)
2. **CWV Metrics** — `cwv_metrics` (LCP, CLS, INP, FCP, TTFB per page)
3. **Microsoft Clarity** — `clarity_daily_metrics`, `clarity_daily_pages`, `clarity_daily_sources` (rage clicks, dead clicks, quick-backs, per-page behavior)
4. **SEO Reports** — `seo_reports`, `seo_keywords` (keyword rankings, position tracking)
5. **DataforSEO** — `serp_snapshots` (NEW) (SERP data, keyword volumes, competitor analysis)
6. **Page Crawl** — `website_pages` (EXISTING) + `page_audits` (NEW) (H1/H2/links/word count/schema compliance)
7. **GSC** — future optional premium signal per client

## Architecture

```
DATA COLLECTION (existing + new)
  SOS Tracker v3 → web_events, cwv_metrics, conversion_events
  Clarity Sync   → clarity_daily_metrics/pages/sources
  DataforSEO     → serp_snapshots (NEW)
  Page Crawl     → website_pages (existing) + page_audits (NEW)
  SEO Reports    → seo_reports, seo_keywords
          │
          ▼
ANALYSIS LAYER
  Weekly:   optimization-analyze (edge function)
            Aggregates all sources per client per page.
            Runs SEO Doctrine rules as scored checks.
            Produces page_scores + gap_signals.

  Realtime: optimization-alerts (edge function)
            Fires on threshold breaches: conversion drops,
            CWV failures, rage spikes, ranking drops.
          │
          ▼
RECOMMENDATION ENGINE
  optimization-recommend (edge function)
  Takes gap_signals + page context + SEO Doctrine →
  generates specific, actionable recommendations via AI.
  Each recommendation includes:
    - category (seo/cro/content)
    - priority (critical/high/medium/low)
    - current value + proposed value (draft)
    - baseline metrics snapshot
    - doctrine rule reference
    - estimated impact
          │
          ▼
APPROVAL + EXECUTION
  optimization_recommendations table
  Status: pending → approved → applied → monitoring →
          succeeded | regressed | reverted

  Team reviews in dashboard. Marks "applied" when done.
  Blog posts: auto-publish via blog-publish-to-duda.

  optimization-monitor (scheduled)
  Checks applied recommendations at 7/14/21 day marks.
  Auto-flags regressions per doctrine rollback rules.
```

## New Database Schema

### `page_audits` — crawled page data for doctrine compliance

```sql
client_id uuid REFERENCES clients(id),
url text NOT NULL,
title text,
meta_description text,
h1_count integer,
h1_text text,
h2_count integer,
h2_texts text[],
internal_link_count integer,
external_link_count integer,
word_count integer,
has_faq_schema boolean DEFAULT false,
has_local_schema boolean DEFAULT false,
has_org_schema boolean DEFAULT false,
page_type text CHECK (page_type IN ('service', 'city', 'blog', 'pillar', 'homepage', 'other')),
crawled_at timestamptz DEFAULT now(),
raw_html_hash text
```

### `serp_snapshots` — DataforSEO SERP data per keyword

```sql
client_id uuid REFERENCES clients(id),
keyword text NOT NULL,
location text,
search_engine text DEFAULT 'google',
position integer,
url text,
serp_features text[],
competitor_urls jsonb,
search_volume integer,
keyword_difficulty numeric,
cpc numeric,
snapshot_date date NOT NULL
```

### `optimization_recommendations` — core recommendations table

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
client_id uuid NOT NULL REFERENCES clients(id),
page_url text,
category text NOT NULL CHECK (category IN ('seo', 'cro', 'content', 'alert')),
subcategory text NOT NULL CHECK (subcategory IN (
  'meta_title', 'meta_desc', 'h1_fix', 'internal_links',
  'new_page', 'content_expand', 'schema', 'city_expansion',
  'headline_cta', 'ux_friction', 'cwv_fix', 'blog_topic'
)),
priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
doctrine_rule text,
current_value text,
proposed_value text,
ai_reasoning text,
baseline_metrics jsonb,
status text NOT NULL DEFAULT 'pending' CHECK (status IN (
  'pending', 'approved', 'rejected', 'applied', 'monitoring',
  'succeeded', 'regressed', 'reverted'
)),
applied_at timestamptz,
applied_by uuid REFERENCES profiles(id),
check_7d_at timestamptz,
check_14d_at timestamptz,
check_21d_at timestamptz,
outcome_metrics jsonb,
created_at timestamptz DEFAULT now(),
expires_at timestamptz,
cycle_id uuid REFERENCES optimization_cycles(id)
```

### `optimization_cycles` — tracks each weekly analysis run

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
client_id uuid NOT NULL REFERENCES clients(id),
cycle_date date NOT NULL,
pages_analyzed integer DEFAULT 0,
recommendations_generated integer DEFAULT 0,
data_sources_used text[],
doctrine_version text,
status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
summary jsonb,
created_at timestamptz DEFAULT now()
```

## Edge Functions (New)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `optimization-crawl` | Weekly cron per client | Crawls all client pages. Extracts H1/H2/links/word count/schema. Stores in `page_audits`. Reuses `website_pages` for raw content. |
| `optimization-analyze` | Weekly cron, after crawl | Aggregates SOS data + Clarity + CWV + page_audits + serp_snapshots. Scores each page against doctrine rules. Produces gap signals. |
| `optimization-recommend` | Weekly, after analyze | Takes gap signals + page context. Calls AI with doctrine rules + historical outcomes. Generates specific recommendations with draft content. |
| `optimization-monitor` | Daily cron | Checks recommendations with status=`applied`. At 7/14/21 day marks, snapshots current metrics. Flags regressions per doctrine rules (Section 12.2, 14.2). |
| `optimization-alerts` | Triggered by data inserts or scheduled hourly | Real-time threshold checks: conversion drops, CWV failures, rage click spikes, ranking drops. Creates `critical` priority recommendations. |
| `dataforseo-sync` | Weekly cron per client | Pulls SERP rankings for tracked keywords + competitor data. Stores in `serp_snapshots`. |

## AI Analysis Pipeline

Each page gets a structured context packet:

```
Page Context:
  URL, page_type, current title, meta_desc, H1, H2s, word count,
  internal links, schema present

Performance Data (last 30 days from SOS Tracker):
  Sessions, engaged time, scroll depth, conversion rate, entry rate

CWV Data:
  LCP, CLS, INP (with pass/fail thresholds)

Behavioral Data (Clarity):
  Rage clicks, dead clicks, quick-backs on this page

Search Data (DataforSEO):
  Current rank for target keywords, competitor positions,
  search volume, keyword difficulty

Doctrine Rules (relevant subset based on page_type):
  Title rules, description rules, heading rules, link rules,
  content thresholds, schema requirements

Historical Context:
  Previous recommendations for this page and their outcomes
  (learning loop — AI sees what worked and what didn't)

Avatar Context (from existing system):
  Target avatar demographics, pain points, tone preferences
```

## Recommendation Categories

### SEO
- Meta title rewrites (Section 1 — keyword stacking, city embedding, CTR modifiers)
- Meta description rewrites (Section 2)
- H1/H2 heading fixes (Section 3 — exactly one H1, billboard test for H2)
- Internal link additions (Section 7 — flag pages below 5 links, suggest specific links)
- New page creation (Section 12.3 — query generating impressions with no dedicated page)
- Content expansion (Section 6 — pages below word count thresholds)
- Schema additions (Section 8 — missing required schema by page type)
- City page expansion (Section 5/15 — next target cities)

### CRO
- Headline/CTA rewrites for high-traffic low-conversion pages
- UX friction fixes (pages with high rage clicks or dead clicks)
- Quick-back page fixes (high bounce — content mismatch or slow load)
- CWV fixes (pages failing LCP/CLS/INP thresholds)

### Content
- Blog topics based on keyword gaps (DataforSEO)
- Blog auto-publish via existing Duda API

### Alerts (threshold triggers)
- Conversion rate drop >30% on a key page
- CWV failure on a URL previously passing
- Keyword ranking drop >5 positions
- Spike in rage clicks or JS errors (Clarity)

## Dashboard Integration

New tab in client dashboard: **"Optimization"**

- Recommendation queue — filterable by category/priority/status
- Applied changes timeline — shows what was applied, when, with metrics overlay
- Optimization score — per-page doctrine compliance score
- Weekly summary — auto-generated report

## Evolution from Existing System

- `website_pages` + `crawl-website-page` → reused by `optimization-crawl`
- `page_content_analysis` → superseded by `optimization_recommendations` (avatar alignment becomes one signal in broader analysis)
- `PagePerformanceTable` + `PageAnalysisDrawer` UI → evolves into new Optimization tab
- Existing manual "Analyze Page" can coexist during transition

## Not Included (YAGNI)

- No auto-execution on Duda pages (except blog publishing)
- No GSC integration in v1 (future upgrade path)
- No A/B testing framework (traffic too low for most clients)
- No competitor content scraping (just SERP position data)
- No real-time recommendation generation (weekly cycle sufficient)
