---
model: claude-sonnet-4-6
name: google-search-console-api
description: Use when working with Google Search Console API - search analytics, URL inspection, indexing requests, sitemap management, or SEO performance data. Also use when querying search impressions, clicks, CTR, or position data.
---

# Google Search Console API

## Overview
Search Console API for programmatic access to search performance data, URL inspection, and index management. Two main components: Search Analytics and URL Inspection.

## Quick Reference

| Item | Value |
|------|-------|
| **Base URL** | `https://searchconsole.googleapis.com` |
| **Auth** | OAuth 2.0 or Service Account |
| **Python** | `pip install google-api-python-client` |
| **Node.js** | `npm install googleapis` |
| **Scope** | `https://www.googleapis.com/auth/webmasters.readonly` |
| **Data Freshness** | 2-3 day delay |

## Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `searchAnalytics.query` | Search performance data (clicks, impressions, CTR, position) |
| `urlInspection.index.inspect` | Check URL indexing status |
| `sitemaps.list/submit` | Manage sitemaps |
| `sites.list/add` | Manage properties |

## Important: Service Name Distinction

- **Search Analytics / Sitemaps / Sites:** Use `build('webmasters', 'v3', credentials=credentials)`
- **URL Inspection:** Use `build('searchconsole', 'v1', credentials=credentials)`

## Search Analytics Query

```python
from googleapiclient.discovery import build

# NOTE: Use 'webmasters' v3 for Search Analytics (NOT 'searchconsole' v1)
service = build('webmasters', 'v3', credentials=credentials)
response = service.searchanalytics().query(
    siteUrl='https://example.com',
    body={
        'startDate': '2026-01-01',
        'endDate': '2026-02-01',
        'dimensions': ['query', 'page'],
        'rowLimit': 1000,
        'dimensionFilterGroups': [{
            'groupType': 'and',
            'filters': [{'dimension': 'country', 'operator': 'equals', 'expression': 'usa'}]  # lowercase Alpha-3
        }]
    }
).execute()
```

## Dimensions & Metrics

**Dimensions:** `query`, `page`, `country`, `device`, `date`, `searchAppearance`
**Metrics:** `clicks`, `impressions`, `ctr`, `position`

## Rate Limits

- 1,200 QPM per site per user; 40,000 QPM per project
- 16 months of historical data, 2-3 day delay
- Max 25,000 rows per request, **50,000 rows/day per search type** (paginate with `startRow`)
- URL Inspection: 2,000/day per property, 600/min

## BigQuery Export

Available since 2024 - bulk export for datasets >25K rows. Configure in Search Console UI under Settings > Bulk Data Export.

## Full Reference

See `reference.md` in this skill directory for complete documentation including URL inspection, bulk exports, and advanced filtering.
