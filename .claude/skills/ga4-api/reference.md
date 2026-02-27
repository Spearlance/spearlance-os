# Google Analytics 4 (GA4) API -- Comprehensive Developer Reference

> Last updated: February 2026. Covers GA4 Data API v1beta, Admin API v1beta/v1alpha, and Measurement Protocol.

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication Setup](#2-authentication-setup)
3. [GA4 Data API (Reporting)](#3-ga4-data-api-reporting)
4. [GA4 Admin API (Configuration)](#4-ga4-admin-api-configuration)
5. [GA4 Measurement Protocol (Server-Side)](#5-ga4-measurement-protocol-server-side)
6. [Dimensions and Metrics Reference](#6-dimensions-and-metrics-reference)
7. [Filter Expressions](#7-filter-expressions)
8. [Date Ranges](#8-date-ranges)
9. [Code Examples -- Python](#9-code-examples--python)
10. [Code Examples -- Node.js](#10-code-examples--nodejs)
11. [Rate Limits and Quotas](#11-rate-limits-and-quotas)
12. [BigQuery Export Integration](#12-bigquery-export-integration)
13. [Recent Changes (2025-2026)](#13-recent-changes-2025-2026)

---

## 1. API Overview

GA4 exposes three primary APIs:

| API | Purpose | Base URL | Stability |
|-----|---------|----------|-----------|
| **Data API v1** | Reporting and analytics queries | `https://analyticsdata.googleapis.com` | v1beta (production), v1alpha (preview) |
| **Admin API v1** | Property and configuration management | `https://analyticsadmin.googleapis.com` | v1beta (production), v1alpha (preview) |
| **Measurement Protocol** | Server-side event ingestion | `https://www.google-analytics.com/mp/collect` | Stable |

### Client Libraries

| Language | Data API Package | Admin API Package |
|----------|-----------------|-------------------|
| Python | `pip install google-analytics-data` | `pip install google-analytics-admin` |
| Node.js | `npm install @google-analytics/data` | `npm install @google-analytics/admin` |
| Java | `google-analytics-data` (Maven) | `google-analytics-admin` (Maven) |
| Go | `cloud.google.com/go/analytics/data/apiv1beta` | `cloud.google.com/go/analytics/admin/apiv1alpha` |
| PHP | `google/analytics-data` (Composer) | `google/analytics-admin` (Composer) |

### OAuth Scopes

| Scope | Access Level |
|-------|-------------|
| `https://www.googleapis.com/auth/analytics.readonly` | Read-only access to reporting and configuration |
| `https://www.googleapis.com/auth/analytics` | Full read/write access |
| `https://www.googleapis.com/auth/analytics.edit` | Edit configuration (Admin API) |

---

## 2. Authentication Setup

### Option A: Service Account (Server-to-Server, Recommended for Automation)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials
2. Create a Service Account and download the JSON key file
3. Enable the "Google Analytics Data API" and "Google Analytics Admin API" in the API Library
4. In Google Analytics Admin, add the service account email (e.g., `my-sa@project.iam.gserviceaccount.com`) as a user with "Viewer" or "Editor" role at the property level

**Python -- Service Account Authentication:**

```python
import os
from google.analytics.data_v1beta import BetaAnalyticsDataClient

# Option 1: Environment variable (recommended)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/service-account-key.json"
client = BetaAnalyticsDataClient()

# Option 2: Explicit credentials
from google.oauth2 import service_account

credentials = service_account.Credentials.from_service_account_file(
    "/path/to/service-account-key.json",
    scopes=["https://www.googleapis.com/auth/analytics.readonly"],
)
client = BetaAnalyticsDataClient(credentials=credentials)
```

**Node.js -- Service Account Authentication:**

```javascript
const {BetaAnalyticsDataClient} = require('@google-analytics/data');

// Option 1: Environment variable
// Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
const client = new BetaAnalyticsDataClient();

// Option 2: Explicit credentials
const client = new BetaAnalyticsDataClient({
  keyFilename: '/path/to/service-account-key.json',
});

// Option 3: Inline credentials
const client = new BetaAnalyticsDataClient({
  credentials: {
    client_email: 'sa@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
  },
});
```

### Option B: OAuth 2.0 (User-Based, Interactive Applications)

1. Create OAuth 2.0 Client ID credentials in Google Cloud Console
2. Configure consent screen and add authorized redirect URIs
3. Use the authorization flow to obtain access/refresh tokens

**Python -- OAuth 2.0 Flow:**

```python
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]

flow = InstalledAppFlow.from_client_secrets_file(
    "client_secret.json", scopes=SCOPES
)
credentials = flow.run_local_server(port=0)

client = BetaAnalyticsDataClient(credentials=credentials)
```

---

## 3. GA4 Data API (Reporting)

### Base URL

```
https://analyticsdata.googleapis.com
```

### v1beta Endpoints (Production)

| Method | HTTP | Endpoint | Description |
|--------|------|----------|-------------|
| `runReport` | POST | `/v1beta/{property=properties/*}:runReport` | Run a standard report |
| `batchRunReports` | POST | `/v1beta/{property=properties/*}:batchRunReports` | Run up to 5 reports in one call |
| `runPivotReport` | POST | `/v1beta/{property=properties/*}:runPivotReport` | Run a pivot table report |
| `batchRunPivotReports` | POST | `/v1beta/{property=properties/*}:batchRunPivotReports` | Batch pivot reports |
| `runRealtimeReport` | POST | `/v1beta/{property=properties/*}:runRealtimeReport` | Real-time data (last 30 min) |
| `getMetadata` | GET | `/v1beta/{name=properties/*/metadata}` | List available dimensions/metrics |
| `checkCompatibility` | POST | `/v1beta/{property=properties/*}:checkCompatibility` | Check dimension/metric compatibility |

### v1beta Audience Export Endpoints

| Method | HTTP | Endpoint |
|--------|------|----------|
| `create` | POST | `/v1beta/{parent=properties/*}/audienceExports` |
| `get` | GET | `/v1beta/{name=properties/*/audienceExports/*}` |
| `list` | GET | `/v1beta/{parent=properties/*}/audienceExports` |
| `query` | POST | `/v1beta/{name=properties/*/audienceExports/*}:query` |

### v1alpha Endpoints (Preview)

| Method | HTTP | Endpoint | Description |
|--------|------|----------|-------------|
| `runFunnelReport` | POST | `/v1alpha/{property=properties/*}:runFunnelReport` | Funnel analysis |
| `getPropertyQuotasSnapshot` | GET | `/v1alpha/{name=properties/*/propertyQuotasSnapshot}` | Current quota usage |

### runReport Request Body Structure

```json
{
  "property": "properties/123456789",
  "dimensions": [
    { "name": "city" },
    { "name": "defaultChannelGroup" }
  ],
  "metrics": [
    { "name": "activeUsers" },
    { "name": "sessions" }
  ],
  "dateRanges": [
    {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    }
  ],
  "dimensionFilter": {
    "filter": {
      "fieldName": "country",
      "stringFilter": {
        "matchType": "EXACT",
        "value": "United States"
      }
    }
  },
  "metricFilter": {
    "filter": {
      "fieldName": "sessions",
      "numericFilter": {
        "operation": "GREATER_THAN",
        "value": { "int64Value": "100" }
      }
    }
  },
  "orderBys": [
    {
      "metric": { "metricName": "activeUsers" },
      "desc": true
    }
  ],
  "offset": 0,
  "limit": 10000,
  "keepEmptyRows": false,
  "returnPropertyQuota": true,
  "currencyCode": "USD"
}
```

### runReport Response Structure

```json
{
  "dimensionHeaders": [
    { "name": "city" },
    { "name": "defaultChannelGroup" }
  ],
  "metricHeaders": [
    { "name": "activeUsers", "type": "TYPE_INTEGER" },
    { "name": "sessions", "type": "TYPE_INTEGER" }
  ],
  "rows": [
    {
      "dimensionValues": [
        { "value": "New York" },
        { "value": "Organic Search" }
      ],
      "metricValues": [
        { "value": "1234" },
        { "value": "5678" }
      ]
    }
  ],
  "rowCount": 150,
  "metadata": {
    "currencyCode": "USD",
    "timeZone": "America/New_York"
  },
  "propertyQuota": {
    "tokensPerDay": { "consumed": 15, "remaining": 199985 },
    "tokensPerHour": { "consumed": 15, "remaining": 39985 }
  }
}
```

### batchRunReports Request

```json
{
  "requests": [
    {
      "property": "properties/123456789",
      "dimensions": [{ "name": "country" }],
      "metrics": [{ "name": "activeUsers" }],
      "dateRanges": [{ "startDate": "30daysAgo", "endDate": "today" }]
    },
    {
      "property": "properties/123456789",
      "dimensions": [{ "name": "deviceCategory" }],
      "metrics": [{ "name": "sessions" }],
      "dateRanges": [{ "startDate": "30daysAgo", "endDate": "today" }]
    }
  ]
}
```

**Constraint:** Maximum 5 individual RunReportRequest objects per batch. All must target the same property.

### runRealtimeReport

Reports on events from the last 30 minutes (up to 60 minutes for some metrics). Supports a subset of dimensions and metrics.

**Key realtime dimensions:** `unifiedScreenName`, `city`, `country`, `deviceCategory`, `eventName`, `platform`

**Key realtime metrics:** `activeUsers`, `eventCount`, `screenPageViews`, `conversions`

```json
{
  "property": "properties/123456789",
  "dimensions": [{ "name": "country" }],
  "metrics": [{ "name": "activeUsers" }],
  "minuteRanges": [
    { "startMinutesAgo": 29, "endMinutesAgo": 0 }
  ]
}
```

---

## 4. GA4 Admin API (Configuration)

### Base URL

```
https://analyticsadmin.googleapis.com
```

### v1beta Resources (Production)

#### Account Management

| Method | HTTP | Endpoint |
|--------|------|----------|
| List account summaries | GET | `/v1beta/accountSummaries` |
| Get account | GET | `/v1beta/{name=accounts/*}` |
| List accounts | GET | `/v1beta/accounts` |
| Update account | PATCH | `/v1beta/{account.name=accounts/*}` |
| Delete account | DELETE | `/v1beta/{name=accounts/*}` |
| Search change history | POST | `/v1beta/{account=accounts/*}:searchChangeHistoryEvents` |
| Run access report | POST | `/v1beta/{entity=accounts/*}:runAccessReport` |

#### Property Management

| Method | HTTP | Endpoint |
|--------|------|----------|
| Create property | POST | `/v1beta/properties` |
| Get property | GET | `/v1beta/{name=properties/*}` |
| List properties | GET | `/v1beta/properties` |
| Update property | PATCH | `/v1beta/{property.name=properties/*}` |
| Delete property | DELETE | `/v1beta/{name=properties/*}` |
| Get data retention settings | GET | `/v1beta/{name=properties/*/dataRetentionSettings}` |
| Update data retention | PATCH | `/v1beta/{dataRetentionSettings.name=properties/*/dataRetentionSettings}` |

#### Data Streams

| Method | HTTP | Endpoint |
|--------|------|----------|
| Create stream | POST | `/v1beta/{parent=properties/*}/dataStreams` |
| Get stream | GET | `/v1beta/{name=properties/*/dataStreams/*}` |
| List streams | GET | `/v1beta/{parent=properties/*}/dataStreams` |
| Update stream | PATCH | `/v1beta/{dataStream.name=properties/*/dataStreams/*}` |
| Delete stream | DELETE | `/v1beta/{name=properties/*/dataStreams/*}` |

#### Measurement Protocol Secrets

| Method | HTTP | Endpoint |
|--------|------|----------|
| Create secret | POST | `/v1beta/{parent=properties/*/dataStreams/*}/measurementProtocolSecrets` |
| Get secret | GET | `/v1beta/{name=properties/*/dataStreams/*/measurementProtocolSecrets/*}` |
| List secrets | GET | `/v1beta/{parent=properties/*/dataStreams/*}/measurementProtocolSecrets` |
| Update secret | PATCH | `/v1beta/{measurementProtocolSecret.name=...}` |
| Delete secret | DELETE | `/v1beta/{name=properties/*/dataStreams/*/measurementProtocolSecrets/*}` |

#### Custom Dimensions and Metrics

| Method | HTTP | Endpoint |
|--------|------|----------|
| Create custom dimension | POST | `/v1beta/{parent=properties/*}/customDimensions` |
| List custom dimensions | GET | `/v1beta/{parent=properties/*}/customDimensions` |
| Update custom dimension | PATCH | `/v1beta/{customDimension.name=properties/*/customDimensions/*}` |
| Archive custom dimension | POST | `/v1beta/{name=properties/*/customDimensions/*}:archive` |
| Create custom metric | POST | `/v1beta/{parent=properties/*}/customMetrics` |
| List custom metrics | GET | `/v1beta/{parent=properties/*}/customMetrics` |
| Update custom metric | PATCH | `/v1beta/{customMetric.name=properties/*/customMetrics/*}` |
| Archive custom metric | POST | `/v1beta/{name=properties/*/customMetrics/*}:archive` |

#### Key Events (formerly Conversion Events)

| Method | HTTP | Endpoint |
|--------|------|----------|
| Create key event | POST | `/v1beta/{parent=properties/*}/keyEvents` |
| Get key event | GET | `/v1beta/{name=properties/*/keyEvents/*}` |
| List key events | GET | `/v1beta/{parent=properties/*}/keyEvents` |
| Update key event | PATCH | `/v1beta/{keyEvent.name=properties/*/keyEvents/*}` |
| Delete key event | DELETE | `/v1beta/{name=properties/*/keyEvents/*}` |

#### Service Links

| Method | HTTP | Endpoint |
|--------|------|----------|
| Create Firebase link | POST | `/v1beta/{parent=properties/*}/firebaseLinks` |
| List Firebase links | GET | `/v1beta/{parent=properties/*}/firebaseLinks` |
| Delete Firebase link | DELETE | `/v1beta/{name=properties/*/firebaseLinks/*}` |
| Create Google Ads link | POST | `/v1beta/{parent=properties/*}/googleAdsLinks` |
| List Google Ads links | GET | `/v1beta/{parent=properties/*}/googleAdsLinks` |
| Update Google Ads link | PATCH | `/v1beta/{googleAdsLink.name=properties/*/googleAdsLinks/*}` |
| Delete Google Ads link | DELETE | `/v1beta/{name=properties/*/googleAdsLinks/*}` |

### v1alpha Additional Resources (Preview)

The v1alpha API adds these additional resources not available in v1beta:

- **Access Bindings** -- Manage user access at account/property level (batch CRUD)
- **Audiences** -- Create, list, archive custom audiences
- **BigQuery Links** -- Manage BigQuery export connections
- **Calculated Metrics** -- Create computed metrics
- **Channel Groups** -- Custom channel grouping definitions
- **AdSense Links** -- Manage AdSense integration
- **Display & Video 360 Links** -- DV360 advertiser connections
- **Search Ads 360 Links** -- SA360 integration
- **Expanded Data Sets** -- Extended data set management
- **Event Create/Edit Rules** -- Server-side event manipulation rules
- **Reporting Data Annotations** -- Add annotations to reports
- **Rollup Property Source Links** -- Configure rollup properties
- **Subproperty Event Filters** -- Filter events for subproperties
- **Attribution Settings** -- Configure attribution models
- **Google Signals Settings** -- Manage Google Signals
- **Reporting Identity Settings** -- Configure identity resolution

---

## 5. GA4 Measurement Protocol (Server-Side)

### Endpoints

| Purpose | URL |
|---------|-----|
| **Production (Global)** | `POST https://www.google-analytics.com/mp/collect` |
| **Production (EU)** | `POST https://region1.google-analytics.com/mp/collect` |
| **Validation/Debug (Global)** | `POST https://www.google-analytics.com/debug/mp/collect` |
| **Validation/Debug (EU)** | `POST https://region1.google-analytics.com/debug/mp/collect` |

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `measurement_id` | Yes (web) | The Measurement ID for web streams (format: `G-XXXXXXXX`) |
| `firebase_app_id` | Yes (app) | Firebase App ID for mobile app streams |
| `api_secret` | Yes | API secret generated in GA4 Admin > Data Streams > Measurement Protocol API Secrets |

### Request Body Structure

```json
{
  "client_id": "client_id_from_ga_cookie",
  "user_id": "optional_user_identifier",
  "timestamp_micros": 1700000000000000,
  "user_properties": {
    "membership_tier": { "value": "premium" }
  },
  "consent": {
    "ad_user_data": "GRANTED",
    "ad_personalization": "GRANTED"
  },
  "user_location": {
    "city": "San Francisco",
    "region_id": "US-CA",
    "country_id": "US"
  },
  "device": {
    "category": "desktop",
    "browser": "Chrome",
    "browser_version": "120.0",
    "operating_system": "MacOS",
    "operating_system_version": "14",
    "language": "en-US",
    "screen_resolution": "1920x1080"
  },
  "ip_override": "203.0.113.50",
  "events": [
    {
      "name": "purchase",
      "params": {
        "session_id": "1234567890",
        "engagement_time_msec": 5000,
        "currency": "USD",
        "value": 49.99,
        "transaction_id": "T-12345",
        "items": [
          {
            "item_id": "SKU_123",
            "item_name": "Widget Pro",
            "price": 49.99,
            "quantity": 1
          }
        ]
      }
    }
  ]
}
```

### Limits and Constraints

| Constraint | Limit |
|------------|-------|
| Events per request | 25 max |
| POST body size | 130 KB max |
| Event name length | 40 characters |
| Event parameters per event | 25 max |
| User properties per request | 25 max |
| User property name length | 24 characters |
| User property value length | 36 characters |
| Timestamp backdating | 72 hours max |

### Critical Requirements

- You **must** include `session_id` and `engagement_time_msec` in event params for data to appear in Realtime reports
- The Measurement Protocol is designed to **augment** existing collection (gtag/GTM/Firebase), not replace it
- The `client_id` for web streams should match the `_ga` cookie value (the portion after `GA1.1.` or similar prefix)
- Production endpoint returns `2xx` regardless of payload validity -- use the debug endpoint for validation

### Validation Response Format

```json
{
  "validationMessages": [
    {
      "fieldPath": "events",
      "description": "Event at index: [0] has invalid name [_badEventName]. Names must start with an alphabetic character.",
      "validationCode": "NAME_INVALID"
    }
  ]
}
```

**Validation error codes:** `VALUE_INVALID`, `VALUE_REQUIRED`, `NAME_INVALID`, `NAME_RESERVED`, `VALUE_OUT_OF_BOUNDS`, `EXCEEDED_MAX_ENTITIES`, `NAME_DUPLICATED`

### Reserved Event/Parameter Names

- **Event name prefixes to avoid:** `ad_`, `firebase_`, `google_`, `ga_`
- **Automatically collected events (do not redefine):** `session_start`, `user_engagement`, `first_visit`, `first_open`, `in_app_purchase`, `app_remove`, `os_update`, `screen_view` (app only)
- **Parameter name prefixes to avoid:** `_`, `firebase_`, `ga_`, `google_`, `gtag.`

---

## 6. Dimensions and Metrics Reference

### Most Commonly Used Dimensions

#### Geographic

| API Name | Description |
|----------|-------------|
| `country` | User's country |
| `countryId` | ISO country code |
| `region` | Geographic region/state |
| `city` | City name |
| `cityId` | City identifier |
| `continent` | Continent name |
| `continentId` | Continent identifier |

#### User and Device

| API Name | Description |
|----------|-------------|
| `deviceCategory` | Desktop, Mobile, or Tablet |
| `deviceModel` | Device model name |
| `mobileDeviceBranding` | Device manufacturer |
| `operatingSystem` | OS name (Windows, Android, iOS, etc.) |
| `operatingSystemVersion` | OS version |
| `browser` | Browser name |
| `screenResolution` | Screen resolution |
| `platform` | Web, iOS, or Android |
| `newVsReturning` | New or returning user |
| `userAgeBracket` | Age range (thresholded) |
| `userGender` | Gender (thresholded) |

#### Time

| API Name | Description |
|----------|-------------|
| `date` | Date (YYYYMMDD format) |
| `dateHour` | Date + hour |
| `dateHourMinute` | Date + hour + minute |
| `hour` | Hour of day (0-23) |
| `dayOfWeek` | Day number (0=Sunday) |
| `dayOfWeekName` | Day name |
| `month` | Month (01-12) |
| `year` | Year |
| `isoWeek` | ISO week number |
| `isoYear` | ISO year |
| `nthDay` | Days since start of date range |

#### Traffic Source

| API Name | Description |
|----------|-------------|
| `source` | Traffic source |
| `medium` | Traffic medium |
| `sourceMedium` | Combined source/medium |
| `campaignName` | Campaign name |
| `campaignId` | Campaign ID |
| `defaultChannelGroup` | Default channel grouping |
| `sessionSource` | Session-level source |
| `sessionMedium` | Session-level medium |
| `sessionCampaignName` | Session-level campaign |
| `sessionDefaultChannelGroup` | Session-level channel group |
| `firstUserSource` | First-touch source |
| `firstUserMedium` | First-touch medium |
| `firstUserCampaignName` | First-touch campaign |
| `firstUserDefaultChannelGroup` | First-touch channel group |
| `googleAdsAdGroupName` | Google Ads ad group |
| `googleAdsCampaignName` | Google Ads campaign |

#### Event and Content

| API Name | Description |
|----------|-------------|
| `eventName` | Event name |
| `pageTitle` | Page title |
| `pagePath` | Page path (without query string) |
| `pageLocation` | Full URL including query string |
| `pagePathPlusQueryString` | Path with query string |
| `pageTitleAndScreenClass` | Page title / screen class |
| `landingPage` | Session landing page path |
| `contentGroup` | Content group |
| `contentType` | Content type |
| `hostname` | Hostname |

#### E-commerce

| API Name | Description |
|----------|-------------|
| `itemName` | Product name |
| `itemId` | Product ID |
| `itemBrand` | Product brand |
| `itemCategory` | Product category (level 1) |
| `itemCategory2` through `itemCategory5` | Subcategory levels |
| `itemListName` | Product list name |
| `itemPromotionName` | Promotion name |
| `transactionId` | Transaction ID |
| `orderCoupon` | Order-level coupon |

### Most Commonly Used Metrics

#### User Metrics

| API Name | Description | Type |
|----------|-------------|------|
| `activeUsers` | Active users in date range | INTEGER |
| `newUsers` | First-time users | INTEGER |
| `totalUsers` | Total unique users | INTEGER |
| `dauPerMau` | Daily active / monthly active ratio | FLOAT |
| `dauPerWau` | Daily active / weekly active ratio | FLOAT |
| `wauPerMau` | Weekly active / monthly active ratio | FLOAT |

#### Session Metrics

| API Name | Description | Type |
|----------|-------------|------|
| `sessions` | Total sessions | INTEGER |
| `sessionsPerUser` | Average sessions per user | FLOAT |
| `engagedSessions` | Sessions with engagement | INTEGER |
| `engagementRate` | Engaged sessions / total sessions | FLOAT |
| `bounceRate` | Non-engaged sessions / total sessions | FLOAT |
| `averageSessionDuration` | Avg session duration (seconds) | FLOAT |
| `userEngagementDuration` | Total engagement duration (seconds) | FLOAT |

#### Event Metrics

| API Name | Description | Type |
|----------|-------------|------|
| `eventCount` | Total event count | INTEGER |
| `eventCountPerUser` | Events per user | FLOAT |
| `eventValue` | Sum of event value parameter | FLOAT |
| `screenPageViews` | Total page/screen views | INTEGER |
| `screenPageViewsPerSession` | Views per session | FLOAT |
| `screenPageViewsPerUser` | Views per user | FLOAT |

#### Conversion / Key Event Metrics

| API Name | Description | Type |
|----------|-------------|------|
| `conversions` | Total conversions (deprecated, use keyEvents) | INTEGER |
| `keyEvents` | Total key events | INTEGER |
| `sessionKeyEventRate` | Key events per session | FLOAT |
| `userKeyEventRate` | Key events per user | FLOAT |

#### Revenue / E-commerce Metrics

| API Name | Description | Type |
|----------|-------------|------|
| `totalRevenue` | Total revenue | CURRENCY |
| `purchaseRevenue` | Purchase revenue | CURRENCY |
| `ecommercePurchases` | Number of purchases | INTEGER |
| `purchaserConversionRate` | Purchasers / active users | FLOAT |
| `totalPurchasers` | Unique purchasers | INTEGER |
| `transactionsPerPurchaser` | Transactions per purchaser | FLOAT |
| `itemsViewed` | Items viewed | INTEGER |
| `itemsAddedToCart` | Items added to cart | INTEGER |
| `itemsCheckedOut` | Items checked out | INTEGER |
| `itemsPurchased` | Items purchased | INTEGER |
| `itemRevenue` | Revenue from items | CURRENCY |
| `cartToViewRate` | Add-to-cart / view rate | FLOAT |
| `purchaseToViewRate` | Purchase / view rate | FLOAT |

#### Advertising Metrics

| API Name | Description | Type |
|----------|-------------|------|
| `advertiserAdCost` | Ad spend | CURRENCY |
| `advertiserAdCostPerConversion` | Cost per conversion | CURRENCY |
| `returnOnAdSpend` | Revenue / ad cost | FLOAT |
| `advertiserAdClicks` | Ad clicks | INTEGER |
| `advertiserAdImpressions` | Ad impressions | INTEGER |

---

## 7. Filter Expressions

### FilterExpression Structure

FilterExpression is a recursive structure with four mutually exclusive fields:

```
FilterExpression
  |-- andGroup: FilterExpressionList    (AND of multiple FilterExpressions)
  |-- orGroup: FilterExpressionList     (OR of multiple FilterExpressions)
  |-- notExpression: FilterExpression   (NOT of a single FilterExpression)
  |-- filter: Filter                    (a primitive filter)
```

### Filter Object

```
Filter
  |-- fieldName: string                 (dimension or metric API name)
  |-- stringFilter: StringFilter
  |-- inListFilter: InListFilter
  |-- numericFilter: NumericFilter
  |-- betweenFilter: BetweenFilter
  |-- emptyFilter: EmptyFilter          (matches empty/unset values)
```

### StringFilter Match Types

| Match Type | Description |
|------------|-------------|
| `EXACT` | Exact string match |
| `BEGINS_WITH` | Prefix match |
| `ENDS_WITH` | Suffix match |
| `CONTAINS` | Substring match |
| `FULL_REGEXP` | Full regular expression match |
| `PARTIAL_REGEXP` | Partial regular expression match |

All string filters support `caseSensitive` (boolean, default false).

### Filter Examples (JSON)

**Simple string filter:**
```json
{
  "dimensionFilter": {
    "filter": {
      "fieldName": "country",
      "stringFilter": {
        "matchType": "EXACT",
        "value": "United States",
        "caseSensitive": false
      }
    }
  }
}
```

**In-list filter:**
```json
{
  "dimensionFilter": {
    "filter": {
      "fieldName": "deviceCategory",
      "inListFilter": {
        "values": ["desktop", "mobile"],
        "caseSensitive": false
      }
    }
  }
}
```

**Numeric filter (metric):**
```json
{
  "metricFilter": {
    "filter": {
      "fieldName": "sessions",
      "numericFilter": {
        "operation": "GREATER_THAN",
        "value": { "int64Value": "100" }
      }
    }
  }
}
```

NumericFilter operations: `EQUAL`, `LESS_THAN`, `LESS_THAN_OR_EQUAL`, `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`

**Between filter:**
```json
{
  "metricFilter": {
    "filter": {
      "fieldName": "sessions",
      "betweenFilter": {
        "fromValue": { "int64Value": "10" },
        "toValue": { "int64Value": "100" }
      }
    }
  }
}
```

**NOT expression (exclude):**
```json
{
  "dimensionFilter": {
    "notExpression": {
      "filter": {
        "fieldName": "pageTitle",
        "stringFilter": {
          "value": "My Homepage"
        }
      }
    }
  }
}
```

**AND + OR compound filter:**
```json
{
  "dimensionFilter": {
    "orGroup": {
      "expressions": [
        {
          "andGroup": {
            "expressions": [
              {
                "filter": {
                  "fieldName": "deviceCategory",
                  "stringFilter": { "matchType": "EXACT", "value": "Mobile" }
                }
              },
              {
                "filter": {
                  "fieldName": "pagePath",
                  "stringFilter": { "matchType": "EXACT", "value": "/mobile-landing" }
                }
              }
            ]
          }
        },
        {
          "andGroup": {
            "expressions": [
              {
                "filter": {
                  "fieldName": "deviceCategory",
                  "stringFilter": { "matchType": "EXACT", "value": "Tablet" }
                }
              },
              {
                "filter": {
                  "fieldName": "pagePath",
                  "stringFilter": { "matchType": "EXACT", "value": "/tablet-landing" }
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

**Important:** `dimensionFilter` cannot reference metrics. `metricFilter` cannot reference dimensions. Metric filters are applied post-aggregation (like SQL HAVING).

---

## 8. Date Ranges

### Format

Date ranges use `startDate` and `endDate` in `YYYY-MM-DD` format or relative keywords.

### Relative Date Keywords

| Keyword | Meaning |
|---------|---------|
| `today` | Current date |
| `yesterday` | Previous date |
| `NdaysAgo` | N days before today (e.g., `7daysAgo`, `30daysAgo`, `365daysAgo`) |

### Multiple Date Ranges (Comparison)

You can specify up to 4 date ranges. Each range gets a zero-based index referenced in the response via `dateRange` dimension.

```json
{
  "dateRanges": [
    {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31",
      "name": "january"
    },
    {
      "startDate": "2025-02-01",
      "endDate": "2025-02-28",
      "name": "february"
    }
  ],
  "dimensions": [
    { "name": "country" },
    { "name": "dateRange" }
  ]
}
```

### Realtime Minute Ranges

For `runRealtimeReport`, use `minuteRanges` instead of `dateRanges`:

```json
{
  "minuteRanges": [
    { "startMinutesAgo": 29, "endMinutesAgo": 0, "name": "last30min" }
  ]
}
```

---

## 9. Code Examples -- Python

### Installation

```bash
pip install google-analytics-data google-analytics-admin
```

### Basic Report (runReport)

```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)

def run_basic_report(property_id: str):
    """Run a simple GA4 report."""
    client = BetaAnalyticsDataClient()

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[
            Dimension(name="city"),
            Dimension(name="defaultChannelGroup"),
        ],
        metrics=[
            Metric(name="activeUsers"),
            Metric(name="sessions"),
        ],
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    )

    response = client.run_report(request)

    print(f"Row count: {response.row_count}")
    for row in response.rows:
        city = row.dimension_values[0].value
        channel = row.dimension_values[1].value
        users = row.metric_values[0].value
        sessions = row.metric_values[1].value
        print(f"{city} | {channel} | Users: {users} | Sessions: {sessions}")
```

### Report with Filters

```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Filter,
    FilterExpression,
    FilterExpressionList,
    Metric,
    RunReportRequest,
)

def run_filtered_report(property_id: str):
    """Run a report with dimension and metric filters."""
    client = BetaAnalyticsDataClient()

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="pagePath")],
        metrics=[
            Metric(name="screenPageViews"),
            Metric(name="activeUsers"),
        ],
        date_ranges=[DateRange(start_date="7daysAgo", end_date="yesterday")],
        # Only include pages starting with /blog/
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="pagePath",
                string_filter=Filter.StringFilter(
                    match_type=Filter.StringFilter.MatchType.BEGINS_WITH,
                    value="/blog/",
                ),
            )
        ),
        # Only rows with more than 50 page views
        metric_filter=FilterExpression(
            filter=Filter(
                field_name="screenPageViews",
                numeric_filter=Filter.NumericFilter(
                    operation=Filter.NumericFilter.Operation.GREATER_THAN,
                    value=Filter.NumericFilter.NumericValue(int64_value=50),
                ),
            )
        ),
        order_bys=[
            {
                "metric": {"metric_name": "screenPageViews"},
                "desc": True,
            }
        ],
        limit=100,
    )

    response = client.run_report(request)

    for row in response.rows:
        path = row.dimension_values[0].value
        views = row.metric_values[0].value
        users = row.metric_values[1].value
        print(f"{path}: {views} views, {users} users")
```

### Compound Filters (AND/OR)

```python
def run_compound_filter_report(property_id: str):
    """Run a report with compound AND/OR filters."""
    client = BetaAnalyticsDataClient()

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="pagePath"), Dimension(name="deviceCategory")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        # (country = "US" OR country = "CA") AND deviceCategory = "mobile"
        dimension_filter=FilterExpression(
            and_group=FilterExpressionList(
                expressions=[
                    FilterExpression(
                        or_group=FilterExpressionList(
                            expressions=[
                                FilterExpression(
                                    filter=Filter(
                                        field_name="country",
                                        string_filter=Filter.StringFilter(value="United States"),
                                    )
                                ),
                                FilterExpression(
                                    filter=Filter(
                                        field_name="country",
                                        string_filter=Filter.StringFilter(value="Canada"),
                                    )
                                ),
                            ]
                        )
                    ),
                    FilterExpression(
                        filter=Filter(
                            field_name="deviceCategory",
                            string_filter=Filter.StringFilter(value="mobile"),
                        )
                    ),
                ]
            )
        ),
    )

    response = client.run_report(request)
    for row in response.rows:
        print(row.dimension_values[0].value, row.dimension_values[1].value, row.metric_values[0].value)
```

### Batch Reports

```python
from google.analytics.data_v1beta.types import (
    BatchRunReportsRequest,
    RunReportRequest,
    DateRange,
    Dimension,
    Metric,
)

def run_batch_reports(property_id: str):
    """Run multiple reports in a single API call (max 5)."""
    client = BetaAnalyticsDataClient()

    date_range = DateRange(start_date="30daysAgo", end_date="today")

    request = BatchRunReportsRequest(
        property=f"properties/{property_id}",
        requests=[
            RunReportRequest(
                dimensions=[Dimension(name="country")],
                metrics=[Metric(name="activeUsers")],
                date_ranges=[date_range],
            ),
            RunReportRequest(
                dimensions=[Dimension(name="deviceCategory")],
                metrics=[Metric(name="sessions"), Metric(name="bounceRate")],
                date_ranges=[date_range],
            ),
            RunReportRequest(
                dimensions=[Dimension(name="defaultChannelGroup")],
                metrics=[Metric(name="totalRevenue"), Metric(name="ecommercePurchases")],
                date_ranges=[date_range],
            ),
        ],
    )

    response = client.batch_run_reports(request)

    for i, report in enumerate(response.reports):
        print(f"\n--- Report {i + 1} ---")
        for row in report.rows:
            dims = " | ".join(dv.value for dv in row.dimension_values)
            mets = " | ".join(mv.value for mv in row.metric_values)
            print(f"  {dims} => {mets}")
```

### Realtime Report

```python
from google.analytics.data_v1beta.types import (
    Dimension,
    Metric,
    MinuteRange,
    RunRealtimeReportRequest,
)

def run_realtime_report(property_id: str):
    """Get real-time data (last 30 minutes)."""
    client = BetaAnalyticsDataClient()

    request = RunRealtimeReportRequest(
        property=f"properties/{property_id}",
        dimensions=[
            Dimension(name="country"),
            Dimension(name="city"),
        ],
        metrics=[
            Metric(name="activeUsers"),
            Metric(name="eventCount"),
        ],
        minute_ranges=[
            MinuteRange(start_minutes_ago=29, end_minutes_ago=0),
        ],
    )

    response = client.run_realtime_report(request)

    for row in response.rows:
        country = row.dimension_values[0].value
        city = row.dimension_values[1].value
        users = row.metric_values[0].value
        events = row.metric_values[1].value
        print(f"{city}, {country}: {users} active users, {events} events")
```

### Convert to Pandas DataFrame

```python
import pandas as pd

def report_to_dataframe(response) -> pd.DataFrame:
    """Convert a GA4 RunReportResponse to a Pandas DataFrame."""
    dim_names = [header.name for header in response.dimension_headers]
    met_names = [header.name for header in response.metric_headers]

    rows = []
    for row in response.rows:
        row_data = {}
        for i, dim_value in enumerate(row.dimension_values):
            row_data[dim_names[i]] = dim_value.value
        for i, met_value in enumerate(row.metric_values):
            row_data[met_names[i]] = met_value.value
        rows.append(row_data)

    df = pd.DataFrame(rows)
    # Convert metric columns to numeric
    for col in met_names:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df
```

### Get Available Metadata

```python
from google.analytics.data_v1beta.types import GetMetadataRequest

def get_metadata(property_id: str):
    """List all available dimensions and metrics for a property."""
    client = BetaAnalyticsDataClient()

    request = GetMetadataRequest(name=f"properties/{property_id}/metadata")
    response = client.get_metadata(request)

    print("--- Dimensions ---")
    for dim in response.dimensions:
        print(f"  {dim.api_name}: {dim.ui_name} [{dim.category}]")

    print("\n--- Metrics ---")
    for met in response.metrics:
        print(f"  {met.api_name}: {met.ui_name} [{met.category}]")
```

### Measurement Protocol -- Python

```python
import requests
import json
import time

MEASUREMENT_ID = "G-XXXXXXXXXX"
API_SECRET = "your_api_secret"

def send_event(client_id: str, event_name: str, event_params: dict = None):
    """Send a single event via GA4 Measurement Protocol."""
    url = f"https://www.google-analytics.com/mp/collect?measurement_id={MEASUREMENT_ID}&api_secret={API_SECRET}"

    payload = {
        "client_id": client_id,
        "events": [
            {
                "name": event_name,
                "params": {
                    "session_id": str(int(time.time())),
                    "engagement_time_msec": 1000,
                    **(event_params or {}),
                },
            }
        ],
    }

    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    return response


def send_purchase_event(client_id: str, transaction_id: str, value: float, items: list):
    """Send a purchase event with e-commerce data."""
    return send_event(
        client_id=client_id,
        event_name="purchase",
        event_params={
            "currency": "USD",
            "value": value,
            "transaction_id": transaction_id,
            "items": items,
        },
    )


def validate_event(client_id: str, event_name: str, event_params: dict = None):
    """Validate an event using the debug endpoint (does not record data)."""
    url = f"https://www.google-analytics.com/debug/mp/collect?measurement_id={MEASUREMENT_ID}&api_secret={API_SECRET}"

    payload = {
        "client_id": client_id,
        "validation_behavior": "ENFORCE_RECOMMENDATIONS",
        "events": [
            {
                "name": event_name,
                "params": {
                    "session_id": str(int(time.time())),
                    "engagement_time_msec": 1000,
                    **(event_params or {}),
                },
            }
        ],
    }

    response = requests.post(url, json=payload)
    result = response.json()

    if result.get("validationMessages"):
        for msg in result["validationMessages"]:
            print(f"  ERROR [{msg['validationCode']}]: {msg['description']}")
    else:
        print("  Valid -- no issues found")

    return result


# Example usage
if __name__ == "__main__":
    # Validate before sending
    validate_event("12345.67890", "custom_signup", {"method": "google"})

    # Send event
    send_event("12345.67890", "custom_signup", {"method": "google"})

    # Send purchase
    send_purchase_event(
        client_id="12345.67890",
        transaction_id="T-001",
        value=99.99,
        items=[
            {"item_id": "SKU_1", "item_name": "Widget", "price": 99.99, "quantity": 1}
        ],
    )
```

### Admin API -- Python

```python
from google.analytics.admin_v1beta import AnalyticsAdminServiceClient
from google.analytics.admin_v1beta.types import (
    ListPropertiesRequest,
    ListDataStreamsRequest,
    ListCustomDimensionsRequest,
)

def list_properties(account_id: str):
    """List all GA4 properties for an account."""
    client = AnalyticsAdminServiceClient()

    request = ListPropertiesRequest(
        filter=f'parent:accounts/{account_id}',
        show_deleted=False,
    )

    results = client.list_properties(request=request)

    for prop in results:
        print(f"Property: {prop.name}")
        print(f"  Display Name: {prop.display_name}")
        print(f"  Industry: {prop.industry_category}")
        print(f"  Time Zone: {prop.time_zone}")
        print(f"  Currency: {prop.currency_code}")
        print()


def list_data_streams(property_id: str):
    """List all data streams for a property."""
    client = AnalyticsAdminServiceClient()

    request = ListDataStreamsRequest(parent=f"properties/{property_id}")
    results = client.list_data_streams(request=request)

    for stream in results:
        print(f"Stream: {stream.name}")
        print(f"  Display Name: {stream.display_name}")
        print(f"  Type: {stream.type_}")
        if stream.web_stream_data:
            print(f"  Measurement ID: {stream.web_stream_data.measurement_id}")
            print(f"  Default URI: {stream.web_stream_data.default_uri}")
        print()


def list_custom_dimensions(property_id: str):
    """List all custom dimensions for a property."""
    client = AnalyticsAdminServiceClient()

    request = ListCustomDimensionsRequest(parent=f"properties/{property_id}")
    results = client.list_custom_dimensions(request=request)

    for dim in results:
        print(f"  {dim.parameter_name} ({dim.display_name}) - Scope: {dim.scope}")
```

---

## 10. Code Examples -- Node.js

### Installation

```bash
npm install @google-analytics/data @google-analytics/admin
```

### Basic Report

```javascript
const {BetaAnalyticsDataClient} = require('@google-analytics/data');

const analyticsDataClient = new BetaAnalyticsDataClient();

async function runBasicReport(propertyId) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: '30daysAgo', endDate: 'today' },
    ],
    dimensions: [
      { name: 'city' },
      { name: 'defaultChannelGroup' },
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
    ],
  });

  console.log(`Row count: ${response.rowCount}`);
  response.rows.forEach(row => {
    const city = row.dimensionValues[0].value;
    const channel = row.dimensionValues[1].value;
    const users = row.metricValues[0].value;
    const sessions = row.metricValues[1].value;
    console.log(`${city} | ${channel} | Users: ${users} | Sessions: ${sessions}`);
  });

  return response;
}
```

### Report with Filters

```javascript
async function runFilteredReport(propertyId) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: '7daysAgo', endDate: 'yesterday' },
    ],
    dimensions: [
      { name: 'pagePath' },
    ],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'BEGINS_WITH',
                value: '/blog/',
              },
            },
          },
          {
            notExpression: {
              filter: {
                fieldName: 'pagePath',
                stringFilter: {
                  matchType: 'EXACT',
                  value: '/blog/drafts',
                },
              },
            },
          },
        ],
      },
    },
    metricFilter: {
      filter: {
        fieldName: 'screenPageViews',
        numericFilter: {
          operation: 'GREATER_THAN',
          value: { int64Value: 10 },
        },
      },
    },
    orderBys: [
      { metric: { metricName: 'screenPageViews' }, desc: true },
    ],
    limit: 50,
  });

  response.rows.forEach(row => {
    console.log(
      `${row.dimensionValues[0].value}: ` +
      `${row.metricValues[0].value} views, ` +
      `${row.metricValues[1].value} users`
    );
  });

  return response;
}
```

### Batch Reports

```javascript
async function runBatchReports(propertyId) {
  const dateRange = { startDate: '30daysAgo', endDate: 'today' };

  const [response] = await analyticsDataClient.batchRunReports({
    property: `properties/${propertyId}`,
    requests: [
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
      },
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
      },
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'defaultChannelGroup' }],
        metrics: [{ name: 'totalRevenue' }],
      },
    ],
  });

  response.reports.forEach((report, i) => {
    console.log(`\n--- Report ${i + 1} ---`);
    report.rows.forEach(row => {
      const dims = row.dimensionValues.map(d => d.value).join(' | ');
      const mets = row.metricValues.map(m => m.value).join(' | ');
      console.log(`  ${dims} => ${mets}`);
    });
  });

  return response;
}
```

### Realtime Report

```javascript
async function runRealtimeReport(propertyId) {
  const [response] = await analyticsDataClient.runRealtimeReport({
    property: `properties/${propertyId}`,
    dimensions: [
      { name: 'country' },
      { name: 'city' },
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'eventCount' },
    ],
    minuteRanges: [
      { startMinutesAgo: 29, endMinutesAgo: 0 },
    ],
  });

  console.log('Real-time active users by location:');
  response.rows.forEach(row => {
    console.log(
      `  ${row.dimensionValues[1].value}, ${row.dimensionValues[0].value}: ` +
      `${row.metricValues[0].value} users, ${row.metricValues[1].value} events`
    );
  });

  return response;
}
```

### Measurement Protocol -- Node.js

```javascript
const fetch = require('node-fetch'); // or use built-in fetch in Node 18+

const MEASUREMENT_ID = 'G-XXXXXXXXXX';
const API_SECRET = 'your_api_secret';

async function sendEvent(clientId, eventName, eventParams = {}) {
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

  const payload = {
    client_id: clientId,
    events: [
      {
        name: eventName,
        params: {
          session_id: String(Math.floor(Date.now() / 1000)),
          engagement_time_msec: 1000,
          ...eventParams,
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log(`Status: ${response.status}`);
  return response;
}

async function validateEvent(clientId, eventName, eventParams = {}) {
  const url = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

  const payload = {
    client_id: clientId,
    validation_behavior: 'ENFORCE_RECOMMENDATIONS',
    events: [
      {
        name: eventName,
        params: {
          session_id: String(Math.floor(Date.now() / 1000)),
          engagement_time_msec: 1000,
          ...eventParams,
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.validationMessages?.length) {
    result.validationMessages.forEach(msg => {
      console.error(`  ERROR [${msg.validationCode}]: ${msg.description}`);
    });
  } else {
    console.log('  Valid -- no issues found');
  }

  return result;
}

async function sendPurchaseEvent(clientId, transactionId, value, currency, items) {
  return sendEvent(clientId, 'purchase', {
    currency,
    value,
    transaction_id: transactionId,
    items,
  });
}

// Example usage
(async () => {
  // Validate first
  await validateEvent('12345.67890', 'custom_signup', { method: 'google' });

  // Send event
  await sendEvent('12345.67890', 'custom_signup', { method: 'google' });

  // Send purchase
  await sendPurchaseEvent('12345.67890', 'T-001', 99.99, 'USD', [
    { item_id: 'SKU_1', item_name: 'Widget', price: 99.99, quantity: 1 },
  ]);
})();
```

### Admin API -- Node.js

```javascript
const {AnalyticsAdminServiceClient} = require('@google-analytics/admin');

const adminClient = new AnalyticsAdminServiceClient();

async function listProperties(accountId) {
  const [properties] = await adminClient.listProperties({
    filter: `parent:accounts/${accountId}`,
    showDeleted: false,
  });

  properties.forEach(prop => {
    console.log(`Property: ${prop.name}`);
    console.log(`  Display Name: ${prop.displayName}`);
    console.log(`  Time Zone: ${prop.timeZone}`);
    console.log(`  Currency: ${prop.currencyCode}`);
    console.log();
  });

  return properties;
}

async function listDataStreams(propertyId) {
  const [streams] = await adminClient.listDataStreams({
    parent: `properties/${propertyId}`,
  });

  streams.forEach(stream => {
    console.log(`Stream: ${stream.name}`);
    console.log(`  Display Name: ${stream.displayName}`);
    console.log(`  Type: ${stream.type}`);
    if (stream.webStreamData) {
      console.log(`  Measurement ID: ${stream.webStreamData.measurementId}`);
      console.log(`  Default URI: ${stream.webStreamData.defaultUri}`);
    }
    console.log();
  });

  return streams;
}

async function listCustomDimensions(propertyId) {
  const [dimensions] = await adminClient.listCustomDimensions({
    parent: `properties/${propertyId}`,
  });

  dimensions.forEach(dim => {
    console.log(`  ${dim.parameterName} (${dim.displayName}) - Scope: ${dim.scope}`);
  });

  return dimensions;
}
```

---

## 11. Rate Limits and Quotas

### Token Quotas

| Quota | Standard Properties | Analytics 360 Properties |
|-------|-------------------|------------------------|
| Tokens Per Day | 200,000 | 2,000,000 |
| Tokens Per Hour | 40,000 | 400,000 |
| Tokens Per Project Per Hour | 14,000 | 140,000 |
| Concurrent Requests Per Property | 10 | 50 |
| Server Errors Per Project Per Property Per Hour | 10 | 50 |
| Potentially Thresholded Requests Per Hour | 120 | 120 |

### How Tokens Are Consumed

Most API requests consume **10 or fewer tokens**. Token consumption increases based on:

- **Number of rows** returned in the response
- **Number of dimensions and metrics** requested
- **Filter complexity** (regex filters cost more)
- **Date range length** (longer ranges cost more)

### Monitoring Quota Usage

Add `"returnPropertyQuota": true` to any report request body. The response will include:

```json
{
  "propertyQuota": {
    "tokensPerDay": { "consumed": 15, "remaining": 199985 },
    "tokensPerHour": { "consumed": 15, "remaining": 39985 },
    "tokensPerProjectPerHour": { "consumed": 15, "remaining": 13985 },
    "concurrentRequests": { "consumed": 1, "remaining": 9 },
    "serverErrorsPerProjectPerHour": { "consumed": 0, "remaining": 10 },
    "potentiallyThresholdedRequestsPerHour": { "consumed": 0, "remaining": 120 }
  }
}
```

### Quota Refresh

- **Daily quotas** refresh at midnight Pacific Standard Time (PST)
- **Hourly quotas** refresh within one hour of consumption

### Thresholded Requests

When using demographic dimensions (`userAgeBracket`, `userGender`, `brandingInterest`, `audienceId`, `audienceName`), you are limited to **120 potentially thresholded requests per hour**. Data may be withheld (thresholded) if the result set is too small to protect user privacy.

### Best Practices for Quota Management

1. Use `batchRunReports` to combine up to 5 reports into one API call
2. Request only the dimensions and metrics you need
3. Use reasonable date ranges
4. Cache responses when possible
5. Use `checkCompatibility` before running reports to avoid wasted calls
6. Monitor quota with `returnPropertyQuota: true`

---

## 12. BigQuery Export Integration

### Overview

GA4 offers native BigQuery export -- a feature that was previously exclusive to Analytics 360 ($150K+/year) but is now **free for all GA4 properties**.

### Setup Steps

1. Navigate to GA4 Admin > Product Links > BigQuery Links
2. Click "Link" and select your BigQuery project
3. Choose export frequency:
   - **Daily export**: Batch export once per day (limit: 1M events/day for standard properties)
   - **Streaming export**: Near real-time (no event limit, additional BigQuery costs apply)
4. Select which data streams to include
5. Confirm the link

### Requirements

- Google Analytics property: Editor or higher role
- BigQuery project: Owner permission on the email used for linking
- Both must be in the same Google Cloud organization (recommended)

### BigQuery Table Schema

Data is exported to tables named:

- **Daily**: `analytics_<PROPERTY_ID>.events_YYYYMMDD`
- **Streaming (intraday)**: `analytics_<PROPERTY_ID>.events_intraday_YYYYMMDD`

Key columns in the export:

| Column | Type | Description |
|--------|------|-------------|
| `event_date` | STRING | Event date (YYYYMMDD) |
| `event_timestamp` | INTEGER | Event timestamp (microseconds) |
| `event_name` | STRING | Name of the event |
| `event_params` | RECORD (REPEATED) | Array of event parameters |
| `user_id` | STRING | User ID (if set) |
| `user_pseudo_id` | STRING | Client ID |
| `user_properties` | RECORD (REPEATED) | Array of user properties |
| `user_first_touch_timestamp` | INTEGER | First touch timestamp |
| `device` | RECORD | Device information |
| `geo` | RECORD | Geographic information |
| `traffic_source` | RECORD | First-touch traffic source |
| `ecommerce` | RECORD | E-commerce transaction data |
| `items` | RECORD (REPEATED) | E-commerce item data |

### Example BigQuery Queries

**Active users by day:**
```sql
SELECT
  event_date,
  COUNT(DISTINCT user_pseudo_id) AS active_users
FROM
  `project.analytics_123456789.events_*`
WHERE
  _TABLE_SUFFIX BETWEEN '20250101' AND '20250131'
GROUP BY
  event_date
ORDER BY
  event_date;
```

**Top pages by pageviews:**
```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page,
  COUNT(*) AS pageviews
FROM
  `project.analytics_123456789.events_*`
WHERE
  event_name = 'page_view'
  AND _TABLE_SUFFIX BETWEEN '20250101' AND '20250131'
GROUP BY
  page
ORDER BY
  pageviews DESC
LIMIT 50;
```

**Purchase funnel:**
```sql
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'view_item' THEN user_pseudo_id END) AS viewers,
  COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN user_pseudo_id END) AS adders,
  COUNT(DISTINCT CASE WHEN event_name = 'begin_checkout' THEN user_pseudo_id END) AS checkers,
  COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN user_pseudo_id END) AS purchasers
FROM
  `project.analytics_123456789.events_*`
WHERE
  _TABLE_SUFFIX BETWEEN '20250101' AND '20250131';
```

### Important Notes

- BigQuery export does **not** backfill historical data; it only includes data from the moment you enable it
- The export does **not** include Google Ads cost data (use the Data API for ad metrics like `adCost`)
- Daily export tables are typically available within 24 hours
- Streaming export tables (`events_intraday_*`) are replaced by the final daily table

---

## 13. Recent Changes (2025-2026)

### 2025 Updates

- **AI-Powered Generated Insights**: GA4 introduced AI-driven insights directly within detailed reports, automatically surfacing data anomalies and trends
- **Cross-Property Report Copying**: As of March 2025, GA4 supports copying reports and explorations from one property to another
- **Expanded Predictive ML**: Enhanced machine learning models for purchase probability, churn prediction, and revenue forecasting with improved accuracy
- **Key Events (replacing Conversions)**: The terminology shift from "conversions" to "key events" was completed, with `properties.conversionEvents` marked as deprecated in the Admin API in favor of `properties.keyEvents`
- **Measurement Protocol Update**: Validation endpoint updated to support `in_app_purchase` events for App streams

### 2026 Updates (January-February)

- **Cross-Channel Budgeting (Beta)**: New feature for managing budgets across channels directly within GA4
- **Improved Web Conversion Management**: Enhanced conversion reporting for Google Ads customers with better alignment between GA4 and Google Ads attribution
- **Conversion Attribution Analysis Report (Beta)**: New report for analyzing conversion attribution across channels
- **Independent Conversion Attribution Settings**: Attribution settings can now be adjusted independently for each conversion/key event
- **gtag.js `get()` API Enhancement**: Now supports retrieving `session_number` from the session cookie, in addition to `client_id`, `session_id`, and `gclid`
- **Consent Mode v2**: Continued rollout of enhanced consent signals with `ad_user_data` and `ad_personalization` fields in the Measurement Protocol

### API Stability Notes

- **v1beta**: Considered production-ready. No breaking changes expected. Use this for production applications.
- **v1alpha**: Preview channel. May contain breaking changes. Use for early access to new features (funnel reports, quota snapshots, audience management, BigQuery link management, etc.)
- The Data API is still technically labeled "beta" but has been stable for production use since 2022.

---

## Quick Reference Card

### Common API Calls

| Task | API | Method |
|------|-----|--------|
| Get page views by page | Data API | `runReport` with `pagePath` + `screenPageViews` |
| Get active users by country | Data API | `runReport` with `country` + `activeUsers` |
| Get traffic sources | Data API | `runReport` with `sessionSource` + `sessions` |
| Get real-time visitors | Data API | `runRealtimeReport` with `activeUsers` |
| Send server-side event | Measurement Protocol | `POST /mp/collect` |
| Validate server-side event | Measurement Protocol | `POST /debug/mp/collect` |
| List properties | Admin API | `GET /v1beta/properties` |
| List data streams | Admin API | `GET /v1beta/properties/*/dataStreams` |
| Create custom dimension | Admin API | `POST /v1beta/properties/*/customDimensions` |
| Get quota usage | Data API | `getPropertyQuotasSnapshot` (v1alpha) |

### Environment Variables

```bash
# Service account credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Or individual values for Measurement Protocol
export GA4_MEASUREMENT_ID="G-XXXXXXXXXX"
export GA4_API_SECRET="your_api_secret"
export GA4_PROPERTY_ID="123456789"
```

---

## Sources

- [Google Analytics Data API Overview](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Analytics Data API REST Reference](https://developers.google.com/analytics/devguides/reporting/data/v1/rest)
- [runReport Method Reference](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)
- [FilterExpression Reference](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/FilterExpression)
- [API Dimensions & Metrics Schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)
- [GA4 Dimensions & Metrics Explorer](https://ga-dev-tools.google/ga4/dimensions-metrics-explorer/)
- [Data API Limits and Quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)
- [Google Analytics Admin API Overview](https://developers.google.com/analytics/devguides/config/admin/v1)
- [Google Analytics Admin API REST Reference](https://developers.google.com/analytics/devguides/config/admin/v1/rest)
- [GA4 Measurement Protocol Overview](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Measurement Protocol Reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference)
- [Validating Measurement Protocol Events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
- [Sending Events via Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events)
- [Set up BigQuery Export](https://support.google.com/analytics/answer/9823238)
- [Measurement Protocol Changelog](https://developers.google.com/analytics/devguides/collection/protocol/ga4/changelog)
- [What's New in Google Analytics](https://support.google.com/analytics/answer/9164320)
- [2025 Updates to Google Analytics 4](https://www.analyticsmates.com/post/2025-updates-to-google-analytics-4---heres-what-you-may-have-missed)
- [Google Analytics Python Quickstart Samples](https://github.com/googleanalytics/python-docs-samples/blob/main/google-analytics-data/quickstart.py)
- [Node.js Analytics Data Client](https://www.npmjs.com/package/@google-analytics/data)
- [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)
