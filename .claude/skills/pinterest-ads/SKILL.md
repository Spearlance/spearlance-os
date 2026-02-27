---
model: claude-sonnet-4-6
name: pinterest-ads
description: Use when creating, managing, or reporting on Pinterest ad campaigns. Also use when setting up Pinterest Conversions API (CAPI), managing audiences, monitoring click attribution via the _epik cookie, or diagnosing Pinterest Ads API issues.
---

# Pinterest Ads

## Overview

Pinterest Ads API v5 gives programmatic control over the full Pinterest campaign stack: campaigns → ad groups → ads (promoted pins). Pinterest's user behavior skews toward discovery and planning, making it effective for high-consideration purchases, lifestyle products, and services with strong visual identity.

**Auth note:** Pinterest access tokens expire every 60 days. Build token refresh into your workflow — stale tokens are the most common cause of API failures.

---

## Campaign Hierarchy

```
Ad Account
└── Campaign          ← objective, status, budget (optional)
    └── Ad Group      ← targeting, bid, schedule, budget
        └── Ad        ← pin creative, destination URL
```

| Level | Controls | Key Fields |
|-------|----------|------------|
| Campaign | Objective, lifetime/daily budget | `objective_type`, `status`, `budget_in_micro_currency` |
| Ad Group | Targeting, bid, schedule | `targeting_spec`, `bid_in_micro_currency`, `start_time`, `end_time` |
| Ad | Creative (pin), URL | `pin_id`, `destination_url`, `status` |

---

## Quick Reference

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List campaigns | `GET /v5/ad_accounts/{ad_account_id}/campaigns` | Read |
| Create campaign | `POST /v5/ad_accounts/{ad_account_id}/campaigns` | Write |
| List ad groups | `GET /v5/ad_accounts/{ad_account_id}/ad_groups` | Read |
| Create ad group | `POST /v5/ad_accounts/{ad_account_id}/ad_groups` | Write |
| Create ad | `POST /v5/ad_accounts/{ad_account_id}/ads` | Write |
| Get campaign analytics | `GET /v5/ad_accounts/{ad_account_id}/campaigns/analytics` | Read |
| Get ad group analytics | `GET /v5/ad_accounts/{ad_account_id}/ad_groups/analytics` | Read |
| List audiences | `GET /v5/ad_accounts/{ad_account_id}/audiences` | Read |
| Create audience | `POST /v5/ad_accounts/{ad_account_id}/audiences` | Write |

Base URL: `https://api.pinterest.com`

Auth: `Authorization: Bearer {ACCESS_TOKEN}` header.

---

## Campaign Objectives

| Objective | Use Case |
|-----------|----------|
| `AWARENESS` | Brand reach, impressions |
| `CONSIDERATION` | Traffic, video views, app installs |
| `CONVERSIONS` | Website conversions, catalog sales |
| `VIDEO_VIEW` | Video awareness campaigns |
| `CATALOG_SALES` | Shopping / product catalog |

---

## Creating a Campaign

```bash
# Step 1: Create campaign
POST /v5/ad_accounts/{AD_ACCOUNT_ID}/campaigns
{
  "name": "Campaign Name",
  "objective_type": "CONVERSIONS",
  "status": "PAUSED",
  "daily_spend_cap": 5000000
}

# Step 2: Create ad group
POST /v5/ad_accounts/{AD_ACCOUNT_ID}/ad_groups
{
  "name": "Ad Group Name",
  "campaign_id": "{CAMPAIGN_ID}",
  "bid_in_micro_currency": 500000,
  "budget_in_micro_currency": 10000000,
  "budget_type": "DAILY",
  "status": "PAUSED",
  "targeting_spec": {
    "geo": ["US"],
    "age_bucket": ["35-44", "45-49"],
    "gender": ["female"],
    "interest": ["{INTEREST_ID}"]
  }
}

# Step 3: Create ad (promoted pin)
POST /v5/ad_accounts/{AD_ACCOUNT_ID}/ads
{
  "name": "Ad Name",
  "ad_group_id": "{AD_GROUP_ID}",
  "pin_id": "{PIN_ID}",
  "status": "PAUSED",
  "destination_url": "https://example.com/landing-page",
  "tracking_urls": {
    "impression": ["{IMPRESSION_TRACKING_URL}"],
    "click": ["{CLICK_TRACKING_URL}"]
  }
}
```

Note: Currency values are in **micro-currency** (1 USD = 1,000,000). $5/day = `5000000`.

---

## Targeting Options

| Targeting Type | Field | Example Values |
|---------------|-------|----------------|
| Countries | `geo` | `["US", "CA", "GB"]` |
| Age | `age_bucket` | `["25-34", "35-44", "45-49"]` |
| Gender | `gender` | `["female"]`, `["male"]`, `["unknown"]` |
| Interests | `interest` | Interest category IDs |
| Keywords | `keywords` | Keyword strings for search |
| Audience | `audience` | Custom audience IDs |
| Location | `location` | DMA or metro area IDs |

---

## Performance Metrics (Analytics API)

```bash
GET /v5/ad_accounts/{AD_ACCOUNT_ID}/campaigns/analytics
  ?campaign_ids={CAMPAIGN_ID}
  &start_date=2025-01-01
  &end_date=2025-01-31
  &columns=SPEND_IN_DOLLAR,IMPRESSION_1,CLICKTHROUGH_1,PIN_CLICK_RATE,SAVE,SAVE_RATE,ECPC_IN_DOLLAR
  &granularity=DAY
```

### Key Metrics

| Metric | Column Name | Notes |
|--------|-------------|-------|
| Spend | `SPEND_IN_DOLLAR` | USD |
| Impressions | `IMPRESSION_1` | On-screen impressions |
| Clicks | `CLICKTHROUGH_1` | Outbound (to website) |
| CTR | `PIN_CLICK_RATE` | % clicks / impressions |
| Saves | `SAVE` | Repins — indicates organic reach potential |
| Save rate | `SAVE_RATE` | Saves / impressions |
| CPC | `ECPC_IN_DOLLAR` | Effective cost per click |
| Conversions | `CONVERSION_1` | Requires conversion tag |
| ROAS | Calculate | conversion_value / spend |

---

## Performance Benchmarks

| Metric | Strong | Acceptable | Investigate |
|--------|--------|------------|-------------|
| CTR | >0.5% | 0.2–0.5% | <0.2% → refresh creative |
| Save rate | >0.3% | 0.1–0.3% | <0.1% → content relevance |
| CPC | <$1.50 | $1.50–$3 | >$3 → targeting too broad/narrow |
| Engagement rate | >1% | 0.5–1% | <0.5% → audience mismatch |

Pinterest benchmarks run lower than Meta — the platform favors organic discovery, so even modest CTR can drive strong intent traffic.

---

## Conversions API (CAPI)

Pinterest CAPI sends server-side conversion events for more accurate attribution.

```bash
POST /v5/ad_accounts/{AD_ACCOUNT_ID}/events
{
  "data": [{
    "event_name": "lead",
    "action_source": "web",
    "event_time": 1700000000,
    "event_id": "unique-event-id-123",
    "user_data": {
      "em": "<sha256_hashed_email>",
      "ph": "<sha256_hashed_phone>",
      "client_ip_address": "192.168.1.1",
      "client_user_agent": "Mozilla/5.0...",
      "click_id": "_epik_cookie_value"
    },
    "custom_data": {
      "currency": "USD",
      "value": "50.00"
    }
  }]
}
```

Standard event names: `page_visit`, `checkout`, `add_to_cart`, `lead`, `signup`, `view_category`, `search`, `watch_video`, `custom`.

---

## Click Attribution (_epik Cookie)

The `_epik` cookie is Pinterest's click identifier — equivalent to Meta's `_fbc`. It's set when a user clicks a Pinterest ad and lands on your site.

### Capture and Forward

```javascript
// On landing: extract from URL
const urlParams = new URLSearchParams(window.location.search);
const epik = urlParams.get('epik');
if (epik) {
  document.cookie = `_epik=${epik}; max-age=86400; path=/`;
}

// On conversion: read and send via CAPI
const epikCookie = getCookie('_epik');
// Include in user_data.click_id
```

Without `_epik`, Pinterest cannot attribute conversions back to specific ad clicks. Always capture it on the landing page.

---

## Audience Management

### Customer List Audience

```bash
POST /v5/ad_accounts/{AD_ACCOUNT_ID}/audiences
{
  "name": "Customer Email List",
  "rule": {
    "country": "US",
    "customer_list_id": "{LIST_ID}"
  },
  "description": "Uploaded customer emails",
  "type": "CUSTOMER_LIST"
}
```

Upload customer lists via the Customer Lists API endpoint with SHA-256 hashed emails.

### Actalike Audiences (Pinterest Lookalikes)

```bash
POST /v5/ad_accounts/{AD_ACCOUNT_ID}/audiences
{
  "name": "Actalike - Customers 1%",
  "rule": {
    "seed_id": ["{SOURCE_AUDIENCE_ID}"],
    "country": "US",
    "percentage": 1
  },
  "type": "ACTALIKE"
}
```

`percentage`: 1–10 — lower = higher quality, smaller reach.

---

## Environment Variables

| Variable | Description | Notes |
|----------|-------------|-------|
| `PINTEREST_ACCESS_TOKEN` | OAuth bearer token | Expires every 60 days — refresh required |
| `PINTEREST_AD_ACCOUNT_ID` | Ad account ID | Without prefix |
| `PINTEREST_CONVERSION_TOKEN` | CAPI token | May differ from access token |

---

## Token Refresh (60-Day Cycle)

Pinterest access tokens expire in 60 days. Set up refresh before expiry or monitor for `401` errors.

```bash
POST https://api.pinterest.com/v5/oauth/token
  grant_type=refresh_token
  refresh_token={REFRESH_TOKEN}
  client_id={APP_ID}
  client_secret={APP_SECRET}
```

Build a monitoring cron or alert for token expiry — stale tokens silently break all API calls.

---

## CAPI Health Checks

```bash
# Check recent event count
GET /v5/ad_accounts/{AD_ACCOUNT_ID}/events?start_date=2025-01-01&end_date=2025-01-07

# Validate conversion tags
GET /v5/ad_accounts/{AD_ACCOUNT_ID}/conversion_tags
```

Monitor for: event volume dropping, `_epik` not being captured (check landing page code), conversion tag firing but CAPI not receiving (server-side code issue).

---

## Creative Specs

| Format | Size | Max File Size | Notes |
|--------|------|---------------|-------|
| Standard Pin | 1000×1500 (2:3) | 32MB | Recommended — fills feed |
| Square Pin | 1000×1000 (1:1) | 32MB | Works across placements |
| Video Pin | Up to 1920×1080 | 2GB | H.264, 15s–15min |
| Carousel | 1000×1500 each | 32MB each | 2–5 cards |
| Collections | 1000×1500 hero + 1:1 | 10MB each | Requires catalog |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting token expiry | Set up 60-day refresh reminder or automated token renewal |
| Currency in dollars not micro-currency | Multiply by 1,000,000: $5 = `5000000` |
| Not capturing `_epik` cookie | Add landing page code to extract from URL and set cookie |
| No CAPI deduplication | Use `event_id` matching the conversion tag's `np` parameter |
| Using `click_id` field for wrong value | `click_id` = `_epik` cookie value, not the pin ID |
| Missing `action_source` in CAPI | Required field: `web`, `app`, `phone_call`, `crm`, etc. |
| Activating ads before creative review | Create as `PAUSED`, review pin quality before activating |
| Not excluding converted audiences | Wastes spend on users who already converted |

---

## Related Skills

- `meta-ads` — Meta campaign management (parallel channel)
- `meta-conversions` — Meta CAPI patterns applicable to Pinterest
- `verify-meta-auth` — Token validation patterns (apply same logic to Pinterest tokens)
