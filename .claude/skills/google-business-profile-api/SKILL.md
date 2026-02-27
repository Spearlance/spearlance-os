---
model: claude-sonnet-4-6
name: google-business-profile-api
description: Use when working with Google Business Profile API - managing business listings, reviews, posts, photos, local business data, or performance metrics. Also use when working with GBP federated APIs for reviews, Q&A, or business information.
---

# Google Business Profile API

## Overview
Google Business Profile API has been federated into 8 specialized APIs (since 2024). The original monolithic `mybusinessbusinessinformation` API is deprecated. Use the new federated APIs for all operations.

## Quick Reference

| API | Purpose | Package |
|-----|---------|---------|
| **My Business Business Information** | Locations, attributes | `mybusinessbusinessinformation` |
| **My Business Verifications** | Verify listings | `mybusinessverifications` |
| **My Business Lodging** | Hotel-specific data | `mybusinesslodging` |
| **My Business Notifications** | Pub/Sub notifications | `mybusinessnotifications` |
| **My Business Account Management** | Accounts, admins | `mybusinessaccountmanagement` |
| **My Business Q&A** | Questions & answers | `mybusinessqanda` |
| **My Business Place Actions** | Links (menu, order, etc.) | `mybusinessplaceactions` |
| **Business Profile Performance** | Insights & metrics | `businessprofileperformance` |

**Auth:** OAuth 2.0 with scope `https://www.googleapis.com/auth/business.manage`

## Authentication

```python
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

creds = Credentials.from_authorized_user_file('token.json')
service = build('mybusinessbusinessinformation', 'v1', credentials=creds)
```

## Common Operations

### List Locations
```python
accounts = service.accounts().list().execute()
account_name = accounts['accounts'][0]['name']
locations = service.accounts().locations().list(parent=account_name).execute()
```

### Read Reviews (v4.9 API - not yet migrated to federated v1)
```python
# Reviews remain on the legacy v4.9 endpoint, NOT a federated v1 API
import requests

headers = {'Authorization': f'Bearer {creds.token}'}
url = f'https://mybusiness.googleapis.com/v4/accounts/{account_id}/locations/{location_id}/reviews'
response = requests.get(url, headers=headers, params={'pageSize': 50, 'orderBy': 'updateTime desc'})
reviews = response.json()
```

### Performance Metrics
```python
perf_service = build('businessprofileperformance', 'v1', credentials=creds)
metrics = perf_service.locations().fetchMultiDailyMetricsTimeSeries(
    location='locations/LOCATION_ID',
    body={'dailyMetrics': ['WEBSITE_CLICKS', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS']}
).execute()
```

## Key Notes

- **No service account support** - requires user OAuth consent
- **API access** requires approved Google Business Profile API access (apply via form)
- **Rate limits:** 300 QPM per project per API, 10 location edits/min per listing
- Reviews still on v4.9 endpoint (`mybusiness.googleapis.com/v4/`) - not yet migrated to a v1 API
- Q&A API discontinued November 2025 (replaced by Gemini-powered "Ask Maps")

## Full Reference

See `reference.md` in this skill directory for complete federated API documentation, field references, and advanced operations.
