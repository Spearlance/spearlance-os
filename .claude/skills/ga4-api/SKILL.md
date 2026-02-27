---
model: claude-sonnet-4-6
name: ga4-api
description: Use when working with Google Analytics 4 API - GA4 reporting, analytics data queries, property management, Measurement Protocol, or event tracking. Also use when querying GA4 dimensions, metrics, or setting up server-side analytics.
---

# GA4 API

## Overview
GA4 exposes three APIs: Data API (reporting), Admin API (configuration), and Measurement Protocol (server-side event ingestion). Data API v1beta is production-stable.

## Quick Reference

| API | Base URL | Package (Python) |
|-----|----------|-------------------|
| **Data API** | `analyticsdata.googleapis.com` | `google-analytics-data` |
| **Admin API** | `analyticsadmin.googleapis.com` | `google-analytics-admin` |
| **Measurement Protocol** | `google-analytics.com/mp/collect` | HTTP POST (no SDK) |

**Node.js:** `@google-analytics/data` and `@google-analytics/admin`

## Authentication

Service account recommended for automation. Add service account email as Viewer/Editor in GA4 Admin.

```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/key.json"
client = BetaAnalyticsDataClient()
```

## Reporting Query

```python
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric

request = RunReportRequest(
    property=f"properties/{PROPERTY_ID}",
    dimensions=[Dimension(name="date"), Dimension(name="sessionSource")],
    metrics=[Metric(name="sessions"), Metric(name="conversions")],
    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
)
response = client.run_report(request)
```

## Key Methods

| Method | Use For |
|--------|---------|
| `runReport` | Standard reporting queries |
| `batchRunReports` | Up to 5 reports in one call |
| `runRealtimeReport` | Last 30 min of data |
| `runFunnelReport` | Funnel analysis |
| `getMetadata` | List available dimensions/metrics |

## Measurement Protocol

```bash
curl -X POST "https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXX&api_secret=SECRET" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"123","events":[{"name":"purchase","params":{"value":99.99}}]}'
```

## Rate Limits

- 10 concurrent requests per property (Data API)
- 10,000 tokens per request (dimension/metric complexity)
- Unlimited daily core quota
- 200 requests/min per property (Admin API)

## Full Reference

See `reference.md` in this skill directory for complete dimensions/metrics catalog, filter expressions, BigQuery export setup, and advanced examples.
