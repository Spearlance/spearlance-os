# Google Search Console API -- Developer Reference

> **API Version:** v1 (current as of February 2026)
> **Base URLs:**
> - Search Analytics, Sitemaps, Sites: `https://www.googleapis.com/webmasters/v3`
> - URL Inspection: `https://searchconsole.googleapis.com/v1`
> **Official Docs:** https://developers.google.com/webmaster-tools

---

## Table of Contents

1. [Overview and API Services](#1-overview-and-api-services)
2. [Authentication](#2-authentication)
3. [Search Analytics API](#3-search-analytics-api)
4. [URL Inspection API](#4-url-inspection-api)
5. [Sitemaps API](#5-sitemaps-api)
6. [Sites API](#6-sites-api)
7. [Indexing API (Separate)](#7-indexing-api-separate)
8. [Bulk Data Export to BigQuery](#8-bulk-data-export-to-bigquery)
9. [Rate Limits and Quotas](#9-rate-limits-and-quotas)
10. [Python Code Examples](#10-python-code-examples)
11. [Node.js Code Examples](#11-nodejs-code-examples)
12. [Recent Changes and Updates](#12-recent-changes-and-updates-20242025)

---

## 1. Overview and API Services

The Google Search Console API (formerly Webmaster Tools API) provides programmatic access to Search Console data. It exposes four core services:

| Service | Description |
|---------|-------------|
| **Search Analytics** | Query search traffic data with filters, dimensions, and date ranges |
| **Sitemaps** | List, retrieve, submit, and delete sitemaps |
| **Sites** | Add, remove, retrieve, and list verified properties |
| **URL Inspection** | Get index status, mobile usability, rich results, and AMP data for a URL |

### Complete Endpoint Reference

| Method | HTTP Verb | Endpoint | Base URL |
|--------|-----------|----------|----------|
| `searchanalytics.query` | POST | `/sites/{siteUrl}/searchAnalytics/query` | `googleapis.com/webmasters/v3` |
| `sitemaps.delete` | DELETE | `/sites/{siteUrl}/sitemaps/{feedpath}` | `googleapis.com/webmasters/v3` |
| `sitemaps.get` | GET | `/sites/{siteUrl}/sitemaps/{feedpath}` | `googleapis.com/webmasters/v3` |
| `sitemaps.list` | GET | `/sites/{siteUrl}/sitemaps` | `googleapis.com/webmasters/v3` |
| `sitemaps.submit` | PUT | `/sites/{siteUrl}/sitemaps/{feedpath}` | `googleapis.com/webmasters/v3` |
| `sites.add` | PUT | `/sites/{siteUrl}` | `googleapis.com/webmasters/v3` |
| `sites.delete` | DELETE | `/sites/{siteUrl}` | `googleapis.com/webmasters/v3` |
| `sites.get` | GET | `/sites/{siteUrl}` | `googleapis.com/webmasters/v3` |
| `sites.list` | GET | `/sites` | `googleapis.com/webmasters/v3` |
| `urlInspection.index.inspect` | POST | `/urlInspection/index:inspect` | `searchconsole.googleapis.com/v1` |

**Note:** The `siteUrl` parameter must be URL-encoded (e.g., `https%3A%2F%2Fwww.example.com%2F`). Domain properties use the `sc-domain:` prefix (e.g., `sc-domain:example.com`).

---

## 2. Authentication

All applications **must** use OAuth 2.0 for authorization. API keys alone are not sufficient (except for the Search Console Testing Tools API for public data).

### OAuth 2.0 Scopes

| Scope | Access Level |
|-------|-------------|
| `https://www.googleapis.com/auth/webmasters` | Full read/write access |
| `https://www.googleapis.com/auth/webmasters.readonly` | Read-only access |

### Setup Steps

1. **Create a Google Cloud project** at https://console.cloud.google.com
2. **Enable the Search Console API** in the API Library
3. **Create credentials:**
   - **OAuth 2.0 Client ID** -- for applications acting on behalf of users
   - **Service Account** -- for server-to-server automation (no user interaction)
4. **Grant access** to the service account email in Search Console (Settings > Users and permissions)
5. **Download the credentials JSON file**

### Service Account Authentication (Recommended for Automation)

Service accounts are the preferred method for backend/automated applications. The service account email must be added as a user in Search Console with appropriate permissions.

**Key steps:**
1. Create a service account in Google Cloud Console
2. Generate and download a JSON key file
3. Add the service account email (e.g., `my-sa@project-id.iam.gserviceaccount.com`) as a user in Search Console Settings > Users and permissions
4. Use the JSON key file in your code to authenticate

### OAuth 2.0 Web Application Flow

For interactive applications where users grant consent:

1. Register your app to get a Client ID and Client Secret
2. Redirect users to Google's authorization endpoint with requested scopes
3. User grants consent; Google returns an authorization code
4. Exchange the code for an access token and refresh token
5. Use the access token in API requests
6. Refresh the token when it expires

---

## 3. Search Analytics API

The Search Analytics API is the primary way to programmatically access performance data from Google Search Console.

### Endpoint

```
POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | **Yes** | Start date in `YYYY-MM-DD` format (Pacific Time) |
| `endDate` | string | **Yes** | End date in `YYYY-MM-DD` format (Pacific Time) |
| `dimensions[]` | list of strings | No | Group results by: `country`, `device`, `page`, `query`, `date`, `searchAppearance` |
| `type` | string | No | Search type: `web` (default), `image`, `video`, `news`, `discover`, `googleNews` |
| `dimensionFilterGroups[]` | list of objects | No | Filter results by dimension values |
| `aggregationType` | string | No | `auto` (default), `byPage`, `byProperty`, `byNewsShowcasePanel` |
| `rowLimit` | integer | No | Max rows to return: 1-25,000 (default: 1,000) |
| `startRow` | integer | No | Zero-based row offset for pagination (default: 0) |
| `dataState` | string | No | `final` (default), `all` (includes fresh/unfinished data) |

### Dimensions

| Dimension | Description | Example Values |
|-----------|-------------|----------------|
| `country` | Country of the searcher | ISO 3166-1 Alpha-3 codes: `usa`, `gbr`, `ind`, `deu` |
| `device` | Device type | `DESKTOP`, `MOBILE`, `TABLET` |
| `page` | The URL of the page in results | Full URL string |
| `query` | The search query text | Any search string |
| `date` | The date of the impression | `YYYY-MM-DD` format |
| `searchAppearance` | Type of search result | See below |

### searchAppearance Values

| API Value | Description |
|-----------|-------------|
| `AMP_BLUE_LINK` | AMP non-rich result (plain blue link) |
| `AMP_TOP_STORIES` | AMP in Top Stories carousel |
| `RECIPE_RICH_SNIPPET` | Recipe rich result with images/ratings |
| `REVIEW_SNIPPET` | Review stars in search results |
| `TPF_QA` | Q&A rich result |
| `SUBSCRIBED_CONTENT` | Subscribed content |
| `VIDEO` | Video results |
| `WEBLITE` | Web Light results |
| `MERCHANT_LISTINGS` | Product merchant listings |
| `EDUCATION_Q_AND_A` | Education Q&A |

**Important:** When using `searchAppearance`, it must be the **only** dimension in the query.

### Metrics (Response Fields)

| Metric | Type | Description |
|--------|------|-------------|
| `clicks` | double | Number of clicks from search results |
| `impressions` | double | Number of times URLs appeared in results |
| `ctr` | double | Click-through rate (0.0 to 1.0) |
| `position` | double | Average position in search results |

### Filter Structure

```json
{
  "dimensionFilterGroups": [
    {
      "groupType": "and",
      "filters": [
        {
          "dimension": "country",
          "operator": "equals",
          "expression": "usa"
        },
        {
          "dimension": "device",
          "operator": "equals",
          "expression": "MOBILE"
        }
      ]
    }
  ]
}
```

### Filter Operators

| Operator | Description |
|----------|-------------|
| `equals` | Exact match (default) |
| `contains` | Substring match |
| `notEquals` | Does not equal |
| `notContains` | Does not contain substring |
| `includingRegex` | Matches RE2 regular expression |
| `excludingRegex` | Does not match RE2 regular expression |

### Response Body

```json
{
  "rows": [
    {
      "keys": ["usa", "MOBILE"],
      "clicks": 1234.0,
      "impressions": 56789.0,
      "ctr": 0.0217,
      "position": 8.3
    }
  ],
  "responseAggregationType": "byProperty"
}
```

**Metadata fields (when `dataState` is `all`):**
- `first_incomplete_date` -- The first date where data may be incomplete (`YYYY-MM-DD`)
- `first_incomplete_hour` -- The first hour where hourly data may be incomplete (ISO 8601)

### Pagination Strategy

The API returns a maximum of 25,000 rows per request, with a daily maximum of 50,000 rows per search type.

```
Page 1: startRow=0, rowLimit=25000
Page 2: startRow=25000, rowLimit=25000
Page 3: startRow=50000, rowLimit=25000
...continue until response has 0 rows
```

### Data Freshness

- Data is typically available **2-3 days** after the event
- Fresh/hourly data is available sooner when using `dataState: "all"`
- Always verify data availability by querying by `date` dimension first
- Some queries may be anonymized for privacy (rare/low-volume queries)

---

## 4. URL Inspection API

The URL Inspection API provides detailed information about how Google sees a specific URL, including index status, mobile usability, rich results, and AMP validation.

### Endpoint

```
POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inspectionUrl` | string | **Yes** | Fully-qualified URL to inspect (must be under `siteUrl`) |
| `siteUrl` | string | **Yes** | Property URL as defined in Search Console (trailing `/` for URL-prefix properties) |
| `languageCode` | string | No | IETF BCP-47 language code for translated issue messages |

### Request Example

```json
{
  "inspectionUrl": "https://www.example.com/blog/my-post",
  "siteUrl": "https://www.example.com/",
  "languageCode": "en-US"
}
```

### Response Schema: `UrlInspectionResult`

The response contains a deeply nested `inspectionResult` object with the following top-level components:

| Field | Type | Description |
|-------|------|-------------|
| `inspectionResultLink` | string | Link to Search Console URL inspection UI |
| `indexStatusResult` | object | Index status findings |
| `ampResult` | object | AMP validation (absent if not an AMP page) |
| `mobileUsabilityResult` | object | Mobile usability assessment |
| `richResultsResult` | object | Structured data analysis (absent if no rich results detected) |

#### `indexStatusResult` Fields

| Field | Type | Description |
|-------|------|-------------|
| `verdict` | enum | `PASS`, `PARTIAL`, `FAIL`, `NEUTRAL`, `VERDICT_UNSPECIFIED` |
| `coverageState` | string | Human-readable status (e.g., "Indexed, not submitted in sitemap") |
| `robotsTxtState` | enum | `ALLOWED`, `DISALLOWED` |
| `indexingState` | enum | `INDEXING_ALLOWED`, `BLOCKED_BY_META_TAG`, `BLOCKED_BY_HTTP_HEADER` |
| `lastCrawlTime` | timestamp | Last time Google crawled the URL |
| `pageFetchState` | enum | `SUCCESSFUL`, `SOFT_404`, `BLOCKED_ROBOTS_TXT`, `NOT_FOUND`, `ACCESS_DENIED`, `SERVER_ERROR`, `REDIRECT_ERROR`, `ACCESS_FORBIDDEN`, `BLOCKED_4XX`, `INTERNAL_CRAWL_ERROR`, `INVALID_URL` |
| `googleCanonical` | string | Google's selected canonical URL |
| `userCanonical` | string | Publisher-declared canonical URL |
| `crawledAs` | enum | `DESKTOP`, `MOBILE` |
| `sitemap[]` | string[] | Sitemaps that list this URL |
| `referringUrls[]` | string[] | URLs linking to this page |

#### `richResultsResult` Fields

| Field | Type | Description |
|-------|------|-------------|
| `verdict` | enum | Overall rich results status |
| `detectedItems[]` | array | Grouped detected rich result types |
| `detectedItems[].richResultType` | string | Schema type (e.g., `Article`, `Product`, `Recipe`) |
| `detectedItems[].items[]` | array | Individual items with `name` and `issues[]` |

#### `ampResult` Fields

| Field | Type | Description |
|-------|------|-------------|
| `verdict` | enum | AMP validation status |
| `ampUrl` | string | AMP URL inspected |
| `robotsTxtState` | enum | `ALLOWED`, `DISALLOWED` |
| `indexingState` | enum | `AMP_INDEXING_ALLOWED`, `BLOCKED_DUE_TO_NOINDEX`, `BLOCKED_DUE_TO_EXPIRED_UNAVAILABLE_AFTER` |
| `ampIndexStatusVerdict` | enum | AMP index status |
| `lastCrawlTime` | timestamp | Last AMP crawl |
| `pageFetchState` | enum | AMP page fetch status |
| `issues[]` | array | Each with `issueMessage` (string) and `severity` (`WARNING` or `ERROR`) |

#### `mobileUsabilityResult` Fields

| Field | Type | Description |
|-------|------|-------------|
| `verdict` | enum | Mobile usability status |
| `issues[]` | array | Issues with `issueType`, `severity`, and `message` |

**`issueType` values:** `USES_INCOMPATIBLE_PLUGINS`, `CONFIGURE_VIEWPORT`, `FIXED_WIDTH_VIEWPORT`, `SIZE_CONTENT_TO_VIEWPORT`, `USE_LEGIBLE_FONT_SIZES`, `TAP_TARGETS_TOO_CLOSE`

### Limitations

- Returns data for the **indexed version** only (cannot test live URL indexability)
- Limited to **2,000 requests per day per property**
- The URL must belong to the specified property

---

## 5. Sitemaps API

### Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List sitemaps | GET | `/sites/{siteUrl}/sitemaps` |
| Get sitemap | GET | `/sites/{siteUrl}/sitemaps/{feedpath}` |
| Submit sitemap | PUT | `/sites/{siteUrl}/sitemaps/{feedpath}` |
| Delete sitemap | DELETE | `/sites/{siteUrl}/sitemaps/{feedpath}` |

### List Sitemaps Response

```json
{
  "sitemap": [
    {
      "path": "https://www.example.com/sitemap.xml",
      "lastSubmitted": "2025-01-15T10:30:00.000Z",
      "isPending": false,
      "isSitemapsIndex": true,
      "lastDownloaded": "2025-01-15T12:00:00.000Z",
      "warnings": "0",
      "errors": "0",
      "contents": [
        {
          "type": "web",
          "submitted": "1500",
          "indexed": "1450"
        }
      ]
    }
  ]
}
```

### Submit Sitemap

```
PUT https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.example.com/sitemaps/https%3A%2F%2Fwww.example.com%2Fsitemap.xml
```

No request body needed. Returns `204 No Content` on success.

---

## 6. Sites API

### Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List sites | GET | `/sites` |
| Get site | GET | `/sites/{siteUrl}` |
| Add site | PUT | `/sites/{siteUrl}` |
| Delete site | DELETE | `/sites/{siteUrl}` |

### List Sites Response

```json
{
  "siteEntry": [
    {
      "siteUrl": "https://www.example.com/",
      "permissionLevel": "siteOwner"
    },
    {
      "siteUrl": "sc-domain:example.com",
      "permissionLevel": "siteFullUser"
    }
  ]
}
```

**Permission levels:** `siteOwner`, `siteFullUser`, `siteRestrictedUser`, `siteUnverifiedUser`

---

## 7. Indexing API (Separate)

The Indexing API is a **separate Google API** (not part of Search Console API) for notifying Google about URL changes. It is designed for specific content types.

### Supported Content Types (Only)

- **JobPosting** structured data pages
- **BroadcastEvent** embedded in VideoObject (livestream videos)

### Key Details

- **Endpoint:** `https://indexing.googleapis.com/v3/urlNotifications:publish`
- **Authentication:** Service account with Indexing API enabled
- **Default quota:** 200 requests/day (must request increase)
- **Batch support:** Up to 100 calls in a single HTTP connection
- **Actions:** `URL_UPDATED` (new or updated URL), `URL_DELETED` (removed URL)

### Request Format

```json
{
  "url": "https://www.example.com/jobs/software-engineer",
  "type": "URL_UPDATED"
}
```

**Note:** While some SEOs use this API for non-JobPosting/BroadcastEvent pages, Google officially only supports it for the two content types listed above.

---

## 8. Bulk Data Export to BigQuery

Bulk Data Export allows daily automated export of Search Console data to Google BigQuery, bypassing the API's row limits.

### Key Benefits

- **No row limits** -- all data is exported (unlike the API's 50K row daily cap)
- **Historical data** preserved and accumulated daily
- **SQL queryable** via BigQuery
- **Ideal for** high-traffic sites, long-tail keyword analysis, and cross-property analysis

### Setup

1. **Enable BigQuery API** for your Google Cloud project
2. **Grant permission** to the Search Console service account
3. In Search Console: Settings > Bulk Data Export
4. Enter your **Google Cloud project ID**
5. Enter a **dataset name** (default: `searchconsole`)
6. Data begins exporting daily (exact time varies)

### Tables Created

| Table | Description |
|-------|-------------|
| `ExportLog` | Tracks export status and metadata |
| `searchdata_site_impression` | Data aggregated by property (site-level) |
| `searchdata_url_impression` | Data aggregated by URL (page-level, more granular) |

Both impression tables are **partitioned by `data_date`**.

### `searchdata_site_impression` Schema

| Column | Type | Description |
|--------|------|-------------|
| `data_date` | DATE | Date of data (Pacific Time, ~2 day delay) |
| `site_url` | STRING | Property URL (domain or URL-prefix format) |
| `query` | STRING | Search term (null when anonymized) |
| `is_anonymized_query` | BOOLEAN | True if query is anonymized for privacy |
| `country` | STRING | Search origin country (ISO 3166-1 Alpha-3) |
| `search_type` | STRING | `WEB`, `IMAGE`, `VIDEO`, `NEWS`, `DISCOVER`, `GOOGLENEWS` |
| `device` | STRING | `DESKTOP`, `MOBILE`, `TABLET` |
| `impressions` | INTEGER | Number of search result appearances |
| `clicks` | INTEGER | Number of clicks to site |
| `sum_top_position` | INTEGER | Sum of result positions (0-indexed) |

### `searchdata_url_impression` Schema

Contains all columns from `searchdata_site_impression` plus:

| Column | Type | Description |
|--------|------|-------------|
| `url` | STRING | Fully-qualified landing page URL |
| `is_amp_top_stories` | BOOLEAN | AMP Top Stories appearance |
| `is_amp_blue_link` | BOOLEAN | AMP blue link appearance |
| `is_job_listing` | BOOLEAN | Job listing rich result |
| `is_job_details` | BOOLEAN | Job details rich result |
| `is_tpf_qa` | BOOLEAN | Q&A rich result |
| `is_richcard` | BOOLEAN | Rich card appearance |
| `is_page_experience` | BOOLEAN | Page experience signals |
| `is_practice_problems` | BOOLEAN | Practice problems appearance |
| `is_math_solvers` | BOOLEAN | Math solver appearance |
| `is_translated_result` | BOOLEAN | Translated result appearance |
| `is_edu_q_and_a` | BOOLEAN | Education Q&A appearance |
| Additional `is_*` fields | BOOLEAN | ~37 total search appearance dimensions |

### Example BigQuery SQL

```sql
-- Top queries by clicks for a date range
SELECT
  query,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  ROUND(SUM(clicks) / SUM(impressions), 4) AS ctr,
  ROUND(SUM(sum_top_position) / SUM(impressions) + 1.0, 1) AS avg_position
FROM `my-project.searchconsole.searchdata_site_impression`
WHERE data_date BETWEEN '2025-01-01' AND '2025-01-31'
  AND is_anonymized_query = FALSE
GROUP BY query
ORDER BY clicks DESC
LIMIT 100;
```

```sql
-- Top pages with rich result appearances
SELECT
  url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  MAX(is_tpf_qa) AS has_qa,
  MAX(is_job_listing) AS has_jobs,
  MAX(is_richcard) AS has_richcard
FROM `my-project.searchconsole.searchdata_url_impression`
WHERE data_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY url
ORDER BY clicks DESC
LIMIT 50;
```

---

## 9. Rate Limits and Quotas

### Search Analytics

| Scope | Limit |
|-------|-------|
| Per-site, per-user | 1,200 QPM (queries per minute) |
| Per-project QPD | 30,000,000 QPD (queries per day) |
| Per-project QPM | 40,000 QPM |
| Load quota (short-term) | Measured per 10-minute window |
| Load quota (long-term) | Measured per 1-day window |
| Max rows per request | 25,000 |
| Max rows per day per search type | 50,000 |

**If you exceed load quota:** Wait 15 minutes, reduce grouping/filtering by page or query, shorten date ranges.

### URL Inspection

| Scope | Limit |
|-------|-------|
| Per-site QPD | 2,000 QPD |
| Per-site QPM | 600 QPM |
| Per-project QPD | 10,000,000 QPD |
| Per-project QPM | 15,000 QPM |

### All Other Resources (Sitemaps, Sites)

| Scope | Limit |
|-------|-------|
| Per-user QPS | 20 QPS |
| Per-user QPM | 200 QPM |
| Per-project QPD | 100,000,000 QPD |

### Monitoring Usage

View current API usage in the **Quota tab** of your Google Cloud Console project:
https://console.cloud.google.com/apis/api/searchconsole.googleapis.com/quotas

---

## 10. Python Code Examples

### Installation

```bash
pip install google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2
```

### Service Account Authentication

```python
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
KEY_FILE = './service-account-key.json'

credentials = service_account.Credentials.from_service_account_file(
    KEY_FILE, scopes=SCOPES
)

# For Search Analytics, Sitemaps, Sites (webmasters v3)
webmasters_service = build('webmasters', 'v3', credentials=credentials)

# For URL Inspection (searchconsole v1)
searchconsole_service = build('searchconsole', 'v1', credentials=credentials)
```

### Service Account Impersonation (More Secure -- No Key File)

```python
import google.auth
from google.auth import impersonated_credentials
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
SERVICE_ACCOUNT_EMAIL = 'my-sa@my-project.iam.gserviceaccount.com'

source_credentials, _ = google.auth.default(scopes=SCOPES)

target_credentials = impersonated_credentials.Credentials(
    source_credentials=source_credentials,
    target_principal=SERVICE_ACCOUNT_EMAIL,
    target_scopes=SCOPES,
    lifetime=3600,
)

service = build('webmasters', 'v3', credentials=target_credentials)
```

### OAuth 2.0 Flow (Interactive / Web Applications)

```python
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
CLIENT_SECRETS_FILE = './client_secret.json'

flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
credentials = flow.run_local_server(port=8080)

service = build('webmasters', 'v3', credentials=credentials)
```

### List Verified Sites

```python
site_list = service.sites().list().execute()

for site in site_list.get('siteEntry', []):
    print(f"  {site['siteUrl']} -- {site['permissionLevel']}")
```

### Basic Search Analytics Query

```python
SITE_URL = 'https://www.example.com/'

response = service.searchanalytics().query(
    siteUrl=SITE_URL,
    body={
        'startDate': '2025-01-01',
        'endDate': '2025-01-31',
        'dimensions': ['query'],
        'rowLimit': 10,
    }
).execute()

for row in response.get('rows', []):
    query = row['keys'][0]
    clicks = row['clicks']
    impressions = row['impressions']
    ctr = row['ctr']
    position = row['position']
    print(f"  {query}: {clicks} clicks, {impressions} imp, CTR={ctr:.2%}, pos={position:.1f}")
```

### Filtered Query -- Mobile Traffic from the US

```python
response = service.searchanalytics().query(
    siteUrl=SITE_URL,
    body={
        'startDate': '2025-01-01',
        'endDate': '2025-01-31',
        'dimensions': ['query', 'page'],
        'dimensionFilterGroups': [
            {
                'groupType': 'and',
                'filters': [
                    {
                        'dimension': 'country',
                        'operator': 'equals',
                        'expression': 'usa'
                    },
                    {
                        'dimension': 'device',
                        'operator': 'equals',
                        'expression': 'MOBILE'
                    }
                ]
            }
        ],
        'rowLimit': 25,
    }
).execute()

for row in response.get('rows', []):
    query, page = row['keys']
    print(f"  [{row['clicks']}] {query} -> {page}")
```

### Regex Filter -- Brand vs. Non-Brand Queries

```python
# Get non-brand queries using excludingRegex
response = service.searchanalytics().query(
    siteUrl=SITE_URL,
    body={
        'startDate': '2025-01-01',
        'endDate': '2025-01-31',
        'dimensions': ['query'],
        'dimensionFilterGroups': [
            {
                'filters': [
                    {
                        'dimension': 'query',
                        'operator': 'excludingRegex',
                        'expression': '(mybrand|my brand|my-brand)'
                    }
                ]
            }
        ],
        'rowLimit': 100,
    }
).execute()
```

### Paginate Through All Data

```python
import time

def get_all_search_analytics(service, site_url, start_date, end_date, dimensions):
    """Retrieve all search analytics data with pagination."""
    all_rows = []
    start_row = 0
    max_rows = 25_000

    while True:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': dimensions,
                'rowLimit': max_rows,
                'startRow': start_row,
            }
        ).execute()

        rows = response.get('rows', [])
        if not rows:
            break

        all_rows.extend(rows)
        start_row += max_rows
        print(f"  Fetched {len(all_rows)} rows so far...")

        # Respect rate limits
        time.sleep(0.1)

    return all_rows


# Usage
all_data = get_all_search_analytics(
    service,
    SITE_URL,
    '2025-01-01',
    '2025-01-31',
    ['query', 'page', 'date']
)
print(f"Total rows retrieved: {len(all_data)}")
```

### Convert to Pandas DataFrame

```python
import pandas as pd

def to_dataframe(rows, dimensions):
    """Convert Search Console API rows to a Pandas DataFrame."""
    data = []
    for row in rows:
        record = dict(zip(dimensions, row['keys']))
        record['clicks'] = row['clicks']
        record['impressions'] = row['impressions']
        record['ctr'] = row['ctr']
        record['position'] = row['position']
        data.append(record)

    df = pd.DataFrame(data)

    if 'date' in dimensions:
        df['date'] = pd.to_datetime(df['date'])

    return df


# Usage
df = to_dataframe(all_data, ['query', 'page', 'date'])
print(df.head(10))
print(f"\nTop queries by clicks:")
print(df.groupby('query')['clicks'].sum().sort_values(ascending=False).head(20))
```

### URL Inspection

```python
searchconsole_service = build('searchconsole', 'v1', credentials=credentials)

result = searchconsole_service.urlInspection().index().inspect(
    body={
        'inspectionUrl': 'https://www.example.com/blog/my-post',
        'siteUrl': 'https://www.example.com/',
        'languageCode': 'en-US'
    }
).execute()

inspection = result['inspectionResult']
index_status = inspection.get('indexStatusResult', {})

print(f"Verdict: {index_status.get('verdict')}")
print(f"Coverage: {index_status.get('coverageState')}")
print(f"Robots.txt: {index_status.get('robotsTxtState')}")
print(f"Indexing: {index_status.get('indexingState')}")
print(f"Last crawl: {index_status.get('lastCrawlTime')}")
print(f"Fetch state: {index_status.get('pageFetchState')}")
print(f"Google canonical: {index_status.get('googleCanonical')}")
print(f"User canonical: {index_status.get('userCanonical')}")
print(f"Crawled as: {index_status.get('crawledAs')}")

# Check rich results
rich = inspection.get('richResultsResult', {})
if rich:
    print(f"\nRich Results Verdict: {rich.get('verdict')}")
    for item_group in rich.get('detectedItems', []):
        print(f"  Type: {item_group.get('richResultType')}")
        for item in item_group.get('items', []):
            print(f"    Name: {item.get('name')}")
            for issue in item.get('issues', []):
                print(f"    Issue: {issue.get('issueMessage')} ({issue.get('severity')})")
```

### Batch URL Inspection

```python
import time

def inspect_urls(service, site_url, urls, delay=0.5):
    """Inspect multiple URLs. Respects rate limits (2000/day, 600/min)."""
    results = []

    for url in urls:
        try:
            result = service.urlInspection().index().inspect(
                body={
                    'inspectionUrl': url,
                    'siteUrl': site_url,
                }
            ).execute()

            index_status = result['inspectionResult'].get('indexStatusResult', {})
            results.append({
                'url': url,
                'verdict': index_status.get('verdict'),
                'coverage': index_status.get('coverageState'),
                'last_crawl': index_status.get('lastCrawlTime'),
                'fetch_state': index_status.get('pageFetchState'),
                'crawled_as': index_status.get('crawledAs'),
            })
        except Exception as e:
            results.append({
                'url': url,
                'error': str(e),
            })

        time.sleep(delay)  # Rate limiting

    return results


# Usage
urls_to_check = [
    'https://www.example.com/page-1',
    'https://www.example.com/page-2',
    'https://www.example.com/page-3',
]
results = inspect_urls(searchconsole_service, 'https://www.example.com/', urls_to_check)

for r in results:
    print(f"  {r['url']}: {r.get('verdict', r.get('error'))}")
```

### Sitemaps Management

```python
# List sitemaps
sitemaps = service.sitemaps().list(siteUrl=SITE_URL).execute()
for sitemap in sitemaps.get('sitemap', []):
    print(f"  {sitemap['path']}")
    print(f"    Last submitted: {sitemap.get('lastSubmitted')}")
    print(f"    Errors: {sitemap.get('errors')}, Warnings: {sitemap.get('warnings')}")

# Submit a new sitemap
service.sitemaps().submit(
    siteUrl=SITE_URL,
    feedpath='https://www.example.com/sitemap.xml'
).execute()

# Delete a sitemap
service.sitemaps().delete(
    siteUrl=SITE_URL,
    feedpath='https://www.example.com/old-sitemap.xml'
).execute()
```

---

## 11. Node.js Code Examples

### Installation

```bash
npm install @googleapis/searchconsole googleapis google-auth-library dotenv
```

### Service Account Authentication

```javascript
const { searchconsole } = require('@googleapis/searchconsole');
const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  keyFile: './service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const client = searchconsole({
  version: 'v1',
  auth,
});
```

### Alternative: Using Environment Variables

```javascript
require('dotenv').config();
const { searchconsole } = require('@googleapis/searchconsole');

const auth = new searchconsole.auth.GoogleAuth({
  credentials: {
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const client = searchconsole({
  version: 'v1',
  auth,
});
```

### List Sites

```javascript
async function listSites() {
  const res = await client.sites.list();
  const sites = res.data.siteEntry || [];

  sites.forEach(site => {
    console.log(`  ${site.siteUrl} -- ${site.permissionLevel}`);
  });

  return sites;
}
```

### Search Analytics Query

```javascript
async function querySearchAnalytics(siteUrl, startDate, endDate, dimensions = ['query']) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit: 1000,
    },
  });

  const rows = res.data.rows || [];
  rows.forEach(row => {
    console.log(`  ${row.keys.join(', ')}: ${row.clicks} clicks, ${row.impressions} imp`);
  });

  return rows;
}

// Usage
querySearchAnalytics('https://www.example.com/', '2025-01-01', '2025-01-31', ['query', 'page']);
```

### Filtered Query

```javascript
async function queryMobileTraffic(siteUrl, startDate, endDate) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      dimensionFilterGroups: [
        {
          groupType: 'and',
          filters: [
            { dimension: 'device', operator: 'equals', expression: 'MOBILE' },
            { dimension: 'country', operator: 'equals', expression: 'usa' },
          ],
        },
      ],
      rowLimit: 25,
    },
  });

  return res.data.rows || [];
}
```

### Paginate All Data

```javascript
async function getAllSearchData(siteUrl, startDate, endDate, dimensions) {
  const allRows = [];
  const maxRows = 25000;
  let startRow = 0;

  while (true) {
    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit: maxRows,
        startRow,
      },
    });

    const rows = res.data.rows || [];
    if (rows.length === 0) break;

    allRows.push(...rows);
    startRow += maxRows;
    console.log(`  Fetched ${allRows.length} rows...`);

    // Small delay for rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allRows;
}

// Usage
const data = await getAllSearchData(
  'https://www.example.com/',
  '2025-01-01',
  '2025-01-31',
  ['query', 'page', 'date']
);
console.log(`Total: ${data.length} rows`);
```

### URL Inspection

```javascript
const { google } = require('googleapis');

async function inspectUrl(inspectionUrl, siteUrl) {
  const authClient = new google.auth.GoogleAuth({
    keyFile: './service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsoleClient = google.searchconsole({ version: 'v1', auth: authClient });

  const res = await searchconsoleClient.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl,
      siteUrl,
      languageCode: 'en-US',
    },
  });

  const result = res.data.inspectionResult;
  const indexStatus = result.indexStatusResult || {};

  console.log(`Verdict: ${indexStatus.verdict}`);
  console.log(`Coverage: ${indexStatus.coverageState}`);
  console.log(`Last crawl: ${indexStatus.lastCrawlTime}`);
  console.log(`Crawled as: ${indexStatus.crawledAs}`);
  console.log(`Fetch state: ${indexStatus.pageFetchState}`);

  return result;
}

// Usage
inspectUrl('https://www.example.com/blog/my-post', 'https://www.example.com/');
```

### Sitemaps Management

```javascript
async function manageSitemaps(siteUrl) {
  // List sitemaps
  const listRes = await client.sitemaps.list({ siteUrl });
  const sitemaps = listRes.data.sitemap || [];
  sitemaps.forEach(sm => {
    console.log(`  ${sm.path} -- errors: ${sm.errors}, warnings: ${sm.warnings}`);
  });

  // Submit a sitemap
  await client.sitemaps.submit({
    siteUrl,
    feedpath: 'https://www.example.com/sitemap.xml',
  });
  console.log('Sitemap submitted.');

  // Delete a sitemap
  await client.sitemaps.delete({
    siteUrl,
    feedpath: 'https://www.example.com/old-sitemap.xml',
  });
  console.log('Sitemap deleted.');
}
```

### Complete Express.js Integration Example

```javascript
const express = require('express');
const { searchconsole } = require('@googleapis/searchconsole');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(express.json());

const auth = new GoogleAuth({
  keyFile: './service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/webmasters'],
});

const client = searchconsole({ version: 'v1', auth });

// GET /api/sites -- list all verified properties
app.get('/api/sites', async (req, res) => {
  try {
    const result = await client.sites.list();
    res.json(result.data.siteEntry || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics -- query search analytics
app.post('/api/analytics', async (req, res) => {
  try {
    const { siteUrl, startDate, endDate, dimensions, filters, rowLimit } = req.body;

    const result = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: dimensions || ['query'],
        dimensionFilterGroups: filters ? [{ filters }] : undefined,
        rowLimit: rowLimit || 1000,
      },
    });

    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inspect -- inspect a URL
app.post('/api/inspect', async (req, res) => {
  try {
    const { inspectionUrl, siteUrl } = req.body;

    const result = await client.urlInspection.index.inspect({
      requestBody: { inspectionUrl, siteUrl },
    });

    res.json(result.data.inspectionResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## 12. Recent Changes and Updates (2024/2025)

### Hourly Data Support
The Search Analytics API now supports **hourly data** in performance reports. Use `dataState: "all"` to include fresh/hourly data. The response includes `first_incomplete_hour` metadata indicating when hourly data begins.

### Incomplete Data Indicators
The API now explicitly reports when data is incomplete, returning metadata fields `first_incomplete_date` and `first_incomplete_hour` so integrations can distinguish between final and preliminary data.

### Discover and Google News Search Types
The `type` parameter now supports `discover` and `googleNews` in addition to `web`, `image`, `video`, and `news`, allowing you to query Discover and Google News performance data.

### News Showcase Panel Aggregation
A new `aggregationType` value `byNewsShowcasePanel` was added for publishers using Google News Showcase.

### Regex Filter Support
The filter operators `includingRegex` and `excludingRegex` were added, enabling RE2 regular expression matching on dimensions.

### Structured Data Deprecations (January 2026)
Several structured data types are being phased out from Search Console and its API:
- Book Actions
- Course Info
- Estimated Salary
- ClaimReview
- Learning Video
- Special Announcement
- Vehicle Listing

These removals align with Google's simplification of search results features.

### Custom Annotations
Google updated Search Console to support custom annotations for current and future dates (not just past dates), allowing scheduled annotations before data is available.

### Query Groups (Search Console Insights)
A new **Query Groups** feature organizes similar search queries together, making it easier to analyze variations of the same search intent.

### Bulk Data Export Improvements
The BigQuery bulk data export continues to be the recommended approach for comprehensive data access, with no row limits applied to exported data.

---

## Quick Reference Card

### Authentication Checklist
- [ ] Create Google Cloud project
- [ ] Enable Search Console API
- [ ] Create service account (or OAuth client)
- [ ] Download credentials JSON
- [ ] Add service account email to Search Console property (Settings > Users)
- [ ] Use `webmasters.readonly` scope for read-only, `webmasters` for read/write

### Common Patterns

| Task | Service | Endpoint |
|------|---------|----------|
| Get top queries | Search Analytics | `searchanalytics.query` with `dimensions: ['query']` |
| Get top pages | Search Analytics | `searchanalytics.query` with `dimensions: ['page']` |
| Daily trend | Search Analytics | `searchanalytics.query` with `dimensions: ['date']` |
| Country breakdown | Search Analytics | `searchanalytics.query` with `dimensions: ['country']` |
| Check if URL is indexed | URL Inspection | `urlInspection.index.inspect` |
| Submit sitemap | Sitemaps | `sitemaps.submit` |
| List properties | Sites | `sites.list` |

### Date Format
All dates use `YYYY-MM-DD` format in **Pacific Time** (UTC-7 during PDT, UTC-8 during PST).

### URL Encoding
Site URLs must be URL-encoded in path parameters:
- `https://www.example.com/` becomes `https%3A%2F%2Fwww.example.com%2F`
- `sc-domain:example.com` becomes `sc-domain%3Aexample.com`

### Error Handling Best Practices
1. Implement exponential backoff for rate limit errors (HTTP 429)
2. Check for empty `rows` array to detect end of pagination
3. Handle `403 Forbidden` for properties without access
4. URL Inspection: budget 2,000 inspections/day per property
5. Always verify data availability before querying a date range
