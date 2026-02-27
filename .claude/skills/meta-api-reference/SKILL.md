---
model: claude-sonnet-4-6
name: meta-api-reference
description: Use when working with Meta Marketing API or Graph API — creating campaigns, ad sets, ads, pulling insights, building custom audiences, handling conversions, or setting up system user authentication. Also use when choosing between Meta API versions or debugging rate limit errors.
---

# meta-api-reference

your friendly armadillo is here to serve you

## current versions (February 2026)

| Version | Status | Min support until |
|---------|--------|-------------------|
| v22.0 | Current stable | Late 2026 |
| v23.0 | Latest | Early 2027 |
| v21.0 and older | Deprecated — rejected after Sep 9, 2025 | — |

Pin to an explicit version: `https://graph.facebook.com/v22.0/...`

## base URL

```
https://graph.facebook.com/v22.0
```

## quick auth

```bash
# System user token (recommended for production — never expires)
ACCESS_TOKEN=EAAxxxxxx...

# All requests
curl "https://graph.facebook.com/v22.0/act_123456789/campaigns" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## create a campaign

```javascript
const res = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My Campaign',
      objective: 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: [],
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
const { id } = await res.json();
```

## pull insights

```javascript
const insights = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/insights?` +
    new URLSearchParams({
      fields: 'campaign_name,impressions,clicks,spend,cpm,cpc,ctr,conversions',
      date_preset: 'last_30d',
      level: 'campaign',
      access_token: process.env.META_ACCESS_TOKEN,
    })
).then((r) => r.json());
```

## rate limits

Meta uses a **score-based system** (rolling 1-hour window):

| Tier | Score cap | Read call cost | Write call cost |
|------|-----------|---------------|-----------------|
| Development | 60 pts | 1 pt | 3 pts |
| Standard | 9,000 pts | 1 pt | 3 pts |

On `X-Business-Use-Case-Usage` header: when `call_count` hits 100, you're rate limited.

## common mistakes

| Mistake | Fix |
|---------|-----|
| Using a short-lived user token in production | Use system user tokens — they don't expire |
| Not pinning API version | Always pin (e.g., `v22.0`) — unpinned calls route to oldest supported |
| Using removed v7d_view/28d_view attribution windows | Removed Jan 2026; use `1d_click` or `7d_click` |
| Creating ASC/AAC campaigns via legacy API after v24.0 | Use Advantage+ unified structure or v23.0 or lower |

See reference.md for full API coverage.
