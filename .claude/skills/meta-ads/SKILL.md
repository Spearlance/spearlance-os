---
model: claude-sonnet-4-6
name: meta-ads
description: Use when creating, managing, or optimizing Meta (Facebook/Instagram) ad campaigns. Also use when reporting on campaign performance, adjusting budgets, or diagnosing ad account issues via the Marketing API.
---

# Meta Ads

## Overview

Meta Marketing API v21.0+ exposes a three-tier campaign hierarchy. Every action follows the same pattern: create at campaign level → configure at ad set level → attach creative at ad level. All campaigns should be created in PAUSED status and activated deliberately.

Marketing API version 21.0 deprecated legacy campaign objectives — always use `OUTCOME_*` objectives.

---

## Campaign Hierarchy

```
Ad Account (act_XXXXXXXXX)
└── Campaign          ← objective, spend cap, status
    └── Ad Set        ← audience, budget, schedule, bid, placement
        └── Ad        ← creative (image/video/copy/CTA), destination URL
```

| Level | Controls | Key Fields |
|-------|----------|------------|
| Campaign | Objective, spend cap | `objective`, `status`, `special_ad_categories` |
| Ad Set | Targeting, budget, bid | `targeting`, `daily_budget`, `bid_strategy`, `optimization_goal` |
| Ad | Creative, URL | `creative`, `tracking_specs` |

---

## Quick Reference

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List campaigns | `GET /act_{account_id}/campaigns` | Read |
| Create campaign | `POST /act_{account_id}/campaigns` | Write |
| Update campaign | `POST /{campaign_id}` | Write |
| List ad sets | `GET /act_{account_id}/adsets` | Read |
| Create ad set | `POST /act_{account_id}/adsets` | Write |
| Create ad | `POST /act_{account_id}/ads` | Write |
| Get insights | `GET /{object_id}/insights` | Read |
| Update status | `POST /{object_id}` with `status` field | Write |

Base URL: `https://graph.facebook.com/v21.0/`

Auth: `access_token` query param or `Authorization: Bearer {token}` header.

---

## Campaign Objectives (v21.0+)

| Objective | Use Case |
|-----------|----------|
| `OUTCOME_AWARENESS` | Brand reach, video views |
| `OUTCOME_TRAFFIC` | Website clicks, link clicks |
| `OUTCOME_ENGAGEMENT` | Post engagement, event responses |
| `OUTCOME_LEADS` | Lead gen forms, website conversions |
| `OUTCOME_APP_PROMOTION` | App installs, in-app events |
| `OUTCOME_SALES` | Purchase conversions, catalog sales |

Legacy objectives (`REACH`, `LINK_CLICKS`, etc.) are deprecated in v21.0+. Use the `OUTCOME_*` equivalents.

---

## Creating a Campaign

```bash
# Step 1: Create campaign (always PAUSED)
curl -X POST "https://graph.facebook.com/v21.0/act_{AD_ACCOUNT_ID}/campaigns" \
  -d "name=Campaign Name" \
  -d "objective=OUTCOME_LEADS" \
  -d "status=PAUSED" \
  -d "special_ad_categories=[]" \
  -d "access_token={ACCESS_TOKEN}"

# Step 2: Create ad set (targeting + budget)
curl -X POST "https://graph.facebook.com/v21.0/act_{AD_ACCOUNT_ID}/adsets" \
  -d "name=Ad Set Name" \
  -d "campaign_id={CAMPAIGN_ID}" \
  -d "daily_budget=5000" \
  -d "bid_strategy=LOWEST_COST_WITHOUT_CAP" \
  -d "billing_event=IMPRESSIONS" \
  -d "optimization_goal=LEAD_GENERATION" \
  -d "status=PAUSED" \
  -d "targeting={...}" \
  -d "access_token={ACCESS_TOKEN}"

# Step 3: Create ad (creative)
curl -X POST "https://graph.facebook.com/v21.0/act_{AD_ACCOUNT_ID}/ads" \
  -d "name=Ad Name" \
  -d "adset_id={ADSET_ID}" \
  -d "creative={\"creative_id\":\"{CREATIVE_ID}\"}" \
  -d "status=PAUSED" \
  -d "access_token={ACCESS_TOKEN}"
```

Note: `daily_budget` is in cents (5000 = $50.00).

---

## Targeting Parameters

```json
{
  "targeting": {
    "geo_locations": {
      "countries": ["US"],
      "cities": [{"key": "2418779", "radius": 25, "distance_unit": "mile"}]
    },
    "age_min": 25,
    "age_max": 54,
    "genders": [2],
    "publisher_platforms": ["facebook", "instagram"],
    "facebook_positions": ["feed", "story"],
    "instagram_positions": ["stream", "story"]
  }
}
```

---

## Performance Metrics (Insights API)

```bash
GET /act_{AD_ACCOUNT_ID}/insights
  ?fields=spend,impressions,clicks,ctr,cpc,cpm,actions,action_values,reach
  &date_preset=last_7d
  &level=adset
  &access_token={ACCESS_TOKEN}
```

| Metric | Field Name | Notes |
|--------|------------|-------|
| Spend | `spend` | USD string |
| Impressions | `impressions` | Total |
| Clicks | `clicks` | All clicks |
| CTR | `ctr` | % as string |
| CPC | `cpc` | USD |
| CPM | `cpm` | Per 1k impressions |
| Leads | `actions` filtered by `lead` | Action type |
| CPL | Calculate: `spend / lead_count` | Not a native field |
| ROAS | `action_values` / `spend` | For purchase objectives |

---

## Performance Benchmarks

| Metric | Strong | Acceptable | Action Needed |
|--------|--------|------------|---------------|
| CTR | >2% | 1–2% | <1% → refresh creative |
| CPC | <$1.50 | $1.50–$3 | >$3 → review targeting |
| CPM | <$10 | $10–$20 | >$25 → narrow audience |
| ROAS | >3:1 | 2–3:1 | <2:1 → optimize funnel |

---

## Budget Management

```bash
# Update campaign daily budget
POST /{CAMPAIGN_ID}
  daily_budget=10000  # $100/day in cents

# Pause underperforming ad set
POST /{ADSET_ID}
  status=PAUSED

# Enable winning ad set
POST /{ADSET_ID}
  status=ACTIVE
```

Budget lives at ad set level (unless using Campaign Budget Optimization). CBO moves budget to campaign level and auto-distributes across ad sets.

---

## Ad Creative Specs

| Format | Aspect Ratio | Max File Size | Notes |
|--------|-------------|---------------|-------|
| Single image | 1:1, 1.91:1, 4:5 | 30MB | Feed: 1080x1080 recommended |
| Single video | 1:1, 4:5, 9:16 | 4GB | Stories: 9:16 (1080x1920) |
| Carousel | 1:1 per card | 30MB per card | 2–10 cards |
| Collection | 1.91:1 cover + 1:1 | — | Requires catalog |

Primary text: 125 chars. Headline: 40 chars. Both may be truncated on small screens.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `META_ACCESS_TOKEN` | System User or Page access token |
| `META_AD_ACCOUNT_ID` | Ad account ID — omit `act_` prefix (code adds it) |
| `META_PIXEL_ID` | Pixel ID for conversion tracking |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using legacy objectives (`REACH`, `LINK_CLICKS`) | Switch to `OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, etc. |
| Activating campaigns before creative review | Always create as `PAUSED`, activate manually |
| Forgetting `act_` prefix on account ID | Most endpoints need `act_{ID}` — code should add this |
| `daily_budget` in dollars | API expects cents — multiply by 100 |
| Omitting `special_ad_categories` | Required field — use `[]` for non-restricted ads |
| Querying insights without `date_preset` | Default window is undefined — always specify |
| Not awaiting ad review | Ads go through a review period before delivering |

---

## Related Skills

- `meta-audiences` — Custom audience and lookalike setup
- `meta-conversions` — Conversions API and event tracking
- `verify-meta-auth` — Token validation and permission verification
- `meta-api-reference` — Full endpoint reference for Marketing API v21.0+
