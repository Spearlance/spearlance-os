---
model: claude-sonnet-4-6
name: google-ads-api
description: Use when working with Google Ads API - campaign management, GAQL queries, reporting, bidding strategies, or ad group operations. Also use when setting up Google Ads API authentication or troubleshooting quota issues.
---

# Google Ads API

## Overview
Google Ads API (v23, Jan 2026) for programmatic campaign management, reporting, and optimization. Uses Google Ads Query Language (GAQL) for data retrieval.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | v23 (Jan 28, 2026) |
| **Base URL** | `https://googleads.googleapis.com` |
| **Auth** | OAuth 2.0 + Developer Token |
| **Query Language** | GAQL (Google Ads Query Language) |
| **Python** | `pip install google-ads` |
| **Node.js** | `npm install google-ads-api` |

## Authentication Setup

1. Google Ads Manager account with Developer Token
2. Google Cloud project with Google Ads API enabled
3. OAuth 2.0 credentials (client ID + secret)
4. Refresh token via `google-ads` library auth tool

**Python:**
```python
from google.ads.googleads.client import GoogleAdsClient
client = GoogleAdsClient.load_from_storage("google-ads.yaml")
```

## GAQL Basics

```sql
SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.impressions DESC
LIMIT 50
```

**Key rules:** No `SELECT *`, no JOINs, use resource-specific `FROM`, `metrics.cost_micros` is in millionths (divide by 1,000,000).

## Rate Limits

| Level | Daily Operations |
|-------|-----------------|
| Test Account | 15,000 |
| Basic Access | 15,000 |
| Standard Access | Unlimited |

## Common Patterns

- **Reporting:** `GoogleAdsService.SearchStream` for large datasets
- **Mutations:** Use `mutate()` on resource-specific services
- **Batch:** Up to 10,000 operations per `mutate()` call

## Full Reference

See `reference.md` in this skill directory for complete API documentation including all resource types, GAQL grammar, bidding strategies, and code examples.
