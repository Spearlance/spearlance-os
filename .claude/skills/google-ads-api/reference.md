# Google Ads API Developer Reference

> **Last Updated:** February 2026
> **Current Stable Version:** v23 (released January 28, 2026)
> **Supported Versions:** v20, v21, v22, v23
> **Base Endpoint:** `https://googleads.googleapis.com`

---

## Table of Contents

1. [API Versions and Release Schedule](#api-versions-and-release-schedule)
2. [Authentication and Setup](#authentication-and-setup)
3. [Client Libraries](#client-libraries)
4. [REST API Usage](#rest-api-usage)
5. [Google Ads Query Language (GAQL)](#google-ads-query-language-gaql)
6. [Core Resources and Operations](#core-resources-and-operations)
7. [Reporting](#reporting)
8. [Bidding Strategies](#bidding-strategies)
9. [Rate Limits and Quotas](#rate-limits-and-quotas)
10. [Recent Changes and Deprecations](#recent-changes-and-deprecations)

---

## API Versions and Release Schedule

### Current Versions (as of February 2026)

| Version | Release Date    | Sunset Date          | Status      |
|---------|-----------------|----------------------|-------------|
| v23     | Jan 28, 2026    | TBD (~late 2026)     | **Latest**  |
| v22     | Oct 15, 2025    | TBD (~mid 2026)      | Supported   |
| v21     | Aug 6, 2025     | TBD (~mid 2026)      | Supported   |
| v20     | Jun 4, 2025     | TBD (~early 2026)    | Supported   |
| v19     | **Feb 11, 2026** | **SUNSET**           | Deprecated  |

### New Monthly Release Cadence

Starting January 2026, Google shifted from 3 major releases per year to **4 major + monthly minor** releases:

- **Major versions** contain breaking changes (4 per year).
- **Minor versions** contain non-breaking feature additions (monthly).
- Version support is extended to **one year** from release.

### Access Levels

| Level                | Production Access | Daily Operations Limit |
|----------------------|-------------------|------------------------|
| Test Account Access  | No (test only)    | 15,000                 |
| Basic Access         | Yes               | 15,000                 |
| Standard Access      | Yes               | **Unlimited**          |

**Developer Token:** Required for all API calls. Obtained from the Google Ads API Center in your manager account. Initially granted at Test Account Access; apply for Basic or Standard.

**Cloud-Managed Access (Pilot):** Organizations can manage API access through Google Cloud organizations, eliminating the need to send a developer token header with each request. Requires an approved developer token and a Google Cloud organization.

---

## Authentication and Setup

### Prerequisites

1. A Google Ads Manager account
2. A developer token (from API Center in Google Ads)
3. A Google Cloud project with the Google Ads API enabled
4. OAuth 2.0 credentials (client ID + client secret)

### Authentication Methods

#### 1. OAuth 2.0 (Recommended for most use cases)

**For managing your own accounts (single-user flow):**

```bash
# Step 1: Create OAuth 2.0 credentials in Google Cloud Console
# Go to APIs & Services > Credentials > Create Credentials > OAuth client ID
# Application type: Desktop app (or Web application)

# Step 2: Generate a refresh token using the client library's built-in tool
# Python example:
google-ads-create-oauth2-refresh-token \
  --client_id YOUR_CLIENT_ID \
  --client_secret YOUR_CLIENT_SECRET
```

**For managing other users' accounts (multi-user/web app flow):**

```python
# OAuth2 web flow - redirect user to Google's consent screen
from google_auth_oauthlib.flow import Flow

flow = Flow.from_client_secrets_file(
    "client_secret.json",
    scopes=["https://www.googleapis.com/auth/adwords"],
    redirect_uri="https://your-app.com/oauth/callback"
)

# Generate authorization URL
authorization_url, state = flow.authorization_url(
    access_type="offline",       # Required for refresh token
    include_granted_scopes="true",
    prompt="consent"             # Force consent to get refresh token
)

# After user authorizes, exchange code for tokens
flow.fetch_token(code=authorization_response_code)
credentials = flow.credentials
refresh_token = credentials.refresh_token  # Store this securely
```

#### 2. Service Account (For server-to-server, no user interaction)

**Prerequisites:**
- Google Workspace account (for domain-wide delegation) OR direct account access
- Service account created in Google Cloud Console
- JSON key file downloaded
- Service account email added as a user in Google Ads (Admin > Access and security)

**Limitations:**
- Max 20 Google Ads accounts per service account email
- For more accounts, add the service account to a manager account

#### 3. Application Default Credentials (ADC)

For applications running on Google Cloud infrastructure (GCE, Cloud Run, etc.).

### Configuration File: `google-ads.yaml`

```yaml
# --- OAuth 2.0 Configuration (choose ONE auth method) ---

# Option A: OAuth2 Client Credentials (most common)
client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com"
client_secret: "YOUR_CLIENT_SECRET"
refresh_token: "YOUR_REFRESH_TOKEN"

# Option B: Service Account
# json_key_file_path: "/path/to/service-account-key.json"
# impersonated_email: "user@yourdomain.com"  # Optional for direct access

# Option C: Application Default Credentials
# use_application_default_credentials: true

# --- Required for all methods ---
developer_token: "YOUR_DEVELOPER_TOKEN"

# --- Optional ---
# login_customer_id: "1234567890"  # Required for manager account access (no dashes)

# --- Proto format (Python only) ---
use_proto_plus: true  # true = proto-plus messages, false = protobuf messages

# --- Logging (optional) ---
# logging:
#   version: 1
#   disable_existing_loggers: false
#   formatters:
#     default_fmt:
#       format: "[%(asctime)s - %(levelname)s] %(message)s"
#   handlers:
#     default_handler:
#       class: logging.StreamHandler
#       formatter: default_fmt
#   loggers:
#     "":
#       handlers: [default_handler]
#       level: WARNING
```

### Required HTTP Headers (REST API)

```
Authorization: Bearer {access_token}
developer-token: {developer_token}
login-customer-id: {manager_account_id}  # If using manager account
```

---

## Client Libraries

### Python (Official)

**Installation:**

```bash
pip install google-ads
# Requires Python 3.9+
```

**Initialization:**

```python
from google.ads.googleads.client import GoogleAdsClient

# From YAML file (recommended)
client = GoogleAdsClient.load_from_storage("google-ads.yaml")

# From dict
client = GoogleAdsClient.load_from_dict({
    "developer_token": "YOUR_DEV_TOKEN",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "use_proto_plus": True,
    "login_customer_id": "1234567890",  # optional
})

# From environment variables
# Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, etc.
client = GoogleAdsClient.load_from_env()
```

**Basic Query (Search):**

```python
ga_service = client.get_service("GoogleAdsService")

query = """
    SELECT
        campaign.id,
        campaign.name,
        campaign.status
    FROM campaign
    ORDER BY campaign.id
"""

# Paginated search (returns pages)
response = ga_service.search(customer_id="1234567890", query=query)
for row in response:
    print(f"Campaign: {row.campaign.name} (ID: {row.campaign.id}), Status: {row.campaign.status.name}")
```

**Streaming Query (SearchStream - recommended for large datasets):**

```python
ga_service = client.get_service("GoogleAdsService")

query = """
    SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
"""

# Single persistent connection - more efficient for large results
stream = ga_service.search_stream(customer_id="1234567890", query=query)

for batch in stream:
    for row in batch.results:
        cost = row.metrics.cost_micros / 1_000_000
        print(f"{row.campaign.name}: {row.metrics.clicks} clicks, ${cost:.2f}")
```

**Mutate Operations:**

```python
# Get services and types
campaign_service = client.get_service("CampaignService")
campaign_operation = client.get_type("CampaignOperation")

# Update a campaign
campaign = campaign_operation.update
campaign.resource_name = client.get_service("CampaignService").campaign_path(
    "1234567890", "CAMPAIGN_ID"
)
campaign.status = client.enums.CampaignStatusEnum.PAUSED

# Set field mask (specifies which fields to update)
client.copy_from(
    campaign_operation.update_mask,
    protobuf_helpers.field_mask(None, campaign)
)

response = campaign_service.mutate_campaigns(
    customer_id="1234567890",
    operations=[campaign_operation]
)
print(f"Updated: {response.results[0].resource_name}")
```

### Node.js (Unofficial - Opteo/google-ads-api)

**Installation:**

```bash
npm install google-ads-api
# Latest version: 23.0.0 (supports API v23)
```

**Initialization:**

```typescript
import { GoogleAdsApi, enums, resources, ResourceNames, toMicros, MutateOperation } from "google-ads-api";

const client = new GoogleAdsApi({
    client_id: "<CLIENT-ID>",
    client_secret: "<CLIENT-SECRET>",
    developer_token: "<DEVELOPER-TOKEN>",
});

const customer = client.Customer({
    customer_id: "1234567890",
    refresh_token: "<REFRESH-TOKEN>",
    // login_customer_id: "<MANAGER-ID>",   // optional
    // linked_customer_id: "<LINKED-ID>",   // optional
});
```

**Querying with GAQL:**

```typescript
const campaigns = await customer.query(`
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
    FROM campaign
    WHERE campaign.status = "ENABLED"
    AND segments.date DURING LAST_30_DAYS
    ORDER BY metrics.impressions DESC
    LIMIT 20
`);

for (const row of campaigns) {
    console.log(`${row.campaign.name}: ${row.metrics.clicks} clicks`);
}
```

**Querying with Report Builder:**

```typescript
const campaigns = await customer.report({
    entity: "campaign",
    attributes: [
        "campaign.id",
        "campaign.name",
        "campaign.bidding_strategy_type",
        "campaign_budget.amount_micros",
    ],
    metrics: [
        "metrics.cost_micros",
        "metrics.clicks",
        "metrics.impressions",
        "metrics.all_conversions",
    ],
    constraints: {
        "campaign.status": enums.CampaignStatus.ENABLED,
    },
    segments: ["segments.date"],
    from_date: "2025-01-01",
    to_date: "2025-01-31",
    limit: 20,
});
```

**Streaming (Async Iterator):**

```typescript
const stream = customer.reportStream({
    entity: "ad_group_criterion",
    attributes: [
        "ad_group_criterion.keyword.text",
        "ad_group_criterion.status",
    ],
    constraints: {
        "ad_group_criterion.type": enums.CriterionType.KEYWORD,
    },
});

for await (const row of stream) {
    console.log(row.ad_group_criterion.keyword.text);
}
```

### Other Official Client Libraries

| Language | Package                            | Notes                   |
|----------|------------------------------------|-------------------------|
| Java     | `com.google.ads:google-ads`        | gRPC-based              |
| PHP      | `googleads/google-ads-php`         | gRPC-based              |
| Ruby     | `google-ads-googleads`             | gRPC-based              |
| .NET     | `Google.Ads.GoogleAds`             | gRPC-based              |
| Perl     | `Google::Ads::GoogleAds::Client`   | **REST-based** (only)   |

---

## REST API Usage

### Base URL

```
https://googleads.googleapis.com/v23
```

### Endpoint Pattern

```
https://googleads.googleapis.com/v{version}/customers/{customerId}/{resource}:{method}
```

### Common Endpoints

**Search / Reporting:**

```bash
# SearchStream (single connection, full results)
POST https://googleads.googleapis.com/v23/customers/{customerId}/googleAds:searchStream

# Search (paginated)
POST https://googleads.googleapis.com/v23/customers/{customerId}/googleAds:search
```

**Mutate Operations:**

```bash
# Unified mutate (multiple resource types in one call)
POST https://googleads.googleapis.com/v23/customers/{customerId}/googleAds:mutate

# Resource-specific mutate
POST https://googleads.googleapis.com/v23/customers/{customerId}/campaigns:mutate
POST https://googleads.googleapis.com/v23/customers/{customerId}/adGroups:mutate
POST https://googleads.googleapis.com/v23/customers/{customerId}/adGroupAds:mutate
POST https://googleads.googleapis.com/v23/customers/{customerId}/adGroupCriteria:mutate
POST https://googleads.googleapis.com/v23/customers/{customerId}/campaignBudgets:mutate
```

### REST Search Example (cURL)

```bash
curl -X POST \
  "https://googleads.googleapis.com/v23/customers/1234567890/googleAds:searchStream" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "developer-token: ${DEVELOPER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT campaign.id, campaign.name, metrics.impressions FROM campaign WHERE segments.date DURING LAST_7_DAYS"
  }'
```

### REST Mutate Example (cURL)

```bash
curl -X POST \
  "https://googleads.googleapis.com/v23/customers/1234567890/campaignBudgets:mutate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "developer-token: ${DEVELOPER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [{
      "create": {
        "name": "My Campaign Budget",
        "amountMicros": "50000000",
        "deliveryMethod": "STANDARD"
      }
    }]
  }'
```

### gRPC vs REST

| Aspect         | gRPC                        | REST                           |
|----------------|-----------------------------|--------------------------------|
| Performance    | Faster (binary protocol)    | Slower (JSON serialization)    |
| Streaming      | Native bidirectional        | Server-sent events             |
| Client libs    | All official libs (except Perl) | Perl lib, custom HTTP clients |
| Recommendation | **Preferred**               | Use if gRPC not feasible       |

> **Google's recommendation:** Use official client libraries (gRPC-based) unless you have a specific reason to use REST directly.

---

## Google Ads Query Language (GAQL)

### Syntax

```sql
SELECT field1, field2, ...
FROM resource
WHERE condition1 AND condition2
ORDER BY field [ASC|DESC]
LIMIT count
PARAMETERS key=value
```

### Grammar Rules

- **SELECT** (required): Comma-separated list of fields (attributes, metrics, segments)
- **FROM** (required): Single resource name
- **WHERE** (optional): Conditions joined by `AND` only (no `OR`)
- **ORDER BY** (optional): Sort fields, default ASC
- **LIMIT** (optional): Max rows to return
- **PARAMETERS** (optional): Query-level parameters

### Field Types

| Type        | Description                              | Example                        |
|-------------|------------------------------------------|--------------------------------|
| Attributes  | Properties of the resource               | `campaign.id`, `campaign.name` |
| Metrics     | Performance measurements                 | `metrics.clicks`, `metrics.ctr`|
| Segments    | Dimensions that split metrics            | `segments.date`, `segments.device` |
| Related     | Fields from related resources            | `bidding_strategy.name`        |

### Operators

| Operator            | Description                            | Example                                       |
|---------------------|----------------------------------------|-----------------------------------------------|
| `=`                 | Equal                                  | `campaign.status = 'ENABLED'`                 |
| `!=`                | Not equal                              | `campaign.status != 'REMOVED'`                |
| `>`, `>=`, `<`, `<=`| Comparison                            | `metrics.impressions > 1000`                  |
| `IN`                | In list                                | `campaign.status IN ('ENABLED', 'PAUSED')`    |
| `NOT IN`            | Not in list                            | `campaign.status NOT IN ('REMOVED')`          |
| `LIKE`              | Pattern match (% and _)               | `campaign.name LIKE '%Brand%'`                |
| `NOT LIKE`          | Negated pattern match                  | `campaign.name NOT LIKE '%Test%'`             |
| `CONTAINS ANY`      | Array contains any value               | `ad_group.labels CONTAINS ANY ('abc')`        |
| `CONTAINS ALL`      | Array contains all values              | -                                              |
| `CONTAINS NONE`     | Array contains none of the values      | -                                              |
| `IS NULL`           | Field is null                          | `campaign.end_date IS NULL`                   |
| `IS NOT NULL`       | Field is not null                      | -                                              |
| `DURING`            | Date range literal                     | `segments.date DURING LAST_30_DAYS`           |
| `BETWEEN`           | Date range                             | `segments.date BETWEEN '2025-01-01' AND '2025-01-31'` |
| `REGEXP_MATCH`      | Regular expression (RE2 syntax)        | `campaign.name REGEXP_MATCH '.*Brand.*'`      |
| `NOT REGEXP_MATCH`  | Negated regex                          | -                                              |

### Date Range Literals (for DURING)

```
TODAY, YESTERDAY, LAST_7_DAYS, LAST_14_DAYS, LAST_30_DAYS,
LAST_BUSINESS_WEEK, LAST_MONTH, LAST_WEEK_MON_SUN,
LAST_WEEK_SUN_SAT, THIS_MONTH, THIS_WEEK_MON_TODAY,
THIS_WEEK_SUN_TODAY
```

### Common GAQL Queries

**Campaign Performance (Last 30 Days):**

```sql
SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    campaign.advertising_channel_type,
    campaign_budget.amount_micros,
    metrics.impressions,
    metrics.clicks,
    metrics.ctr,
    metrics.average_cpc,
    metrics.cost_micros,
    metrics.conversions,
    metrics.cost_per_conversion
FROM campaign
WHERE campaign.status != 'REMOVED'
    AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```

**Ad Group Performance:**

```sql
SELECT
    ad_group.id,
    ad_group.name,
    ad_group.status,
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions,
    metrics.cost_micros
FROM ad_group
WHERE ad_group.status = 'ENABLED'
    AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.impressions DESC
```

**Keyword Performance:**

```sql
SELECT
    ad_group.name,
    ad_group_criterion.criterion_id,
    ad_group_criterion.keyword.text,
    ad_group_criterion.keyword.match_type,
    ad_group_criterion.status,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.average_cpc
FROM keyword_view
WHERE segments.date DURING LAST_30_DAYS
    AND ad_group_criterion.status != 'REMOVED'
ORDER BY metrics.impressions DESC
LIMIT 100
```

**Search Terms Report:**

```sql
SELECT
    search_term_view.search_term,
    search_term_view.status,
    campaign.name,
    ad_group.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.impressions DESC
LIMIT 200
```

**Daily Performance by Campaign:**

```sql
SELECT
    segments.date,
    campaign.name,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions
FROM campaign
WHERE segments.date BETWEEN '2025-01-01' AND '2025-01-31'
    AND campaign.status = 'ENABLED'
ORDER BY segments.date DESC, campaign.name ASC
```

**Ad Performance (Responsive Search Ads):**

```sql
SELECT
    ad_group_ad.ad.id,
    ad_group_ad.ad.responsive_search_ad.headlines,
    ad_group_ad.ad.responsive_search_ad.descriptions,
    ad_group_ad.ad.final_urls,
    ad_group_ad.status,
    campaign.name,
    ad_group.name,
    metrics.impressions,
    metrics.clicks,
    metrics.conversions
FROM ad_group_ad
WHERE ad_group_ad.status != 'REMOVED'
    AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.impressions DESC
```

**Account-Level Summary:**

```sql
SELECT
    customer.descriptive_name,
    customer.id,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value
FROM customer
WHERE segments.date DURING LAST_30_DAYS
```

**Performance Max Campaign Reporting:**

```sql
SELECT
    campaign.id,
    campaign.name,
    campaign.advertising_channel_type,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value
FROM campaign
WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    AND segments.date DURING LAST_30_DAYS
```

### IN Clause Limit

The `IN` clause supports a maximum of **20,000** items.

---

## Core Resources and Operations

### Creating a Complete Campaign (Python)

```python
import uuid
from google.ads.googleads.client import GoogleAdsClient

client = GoogleAdsClient.load_from_storage("google-ads.yaml")
customer_id = "1234567890"


# ── Step 1: Create a Campaign Budget ──────────────────────────────────────

def create_campaign_budget(client, customer_id):
    budget_service = client.get_service("CampaignBudgetService")
    budget_operation = client.get_type("CampaignBudgetOperation")

    budget = budget_operation.create
    budget.name = f"API Budget #{uuid.uuid4()}"
    budget.delivery_method = client.enums.BudgetDeliveryMethodEnum.STANDARD
    budget.amount_micros = 50_000_000  # $50/day (micros = dollars * 1,000,000)

    response = budget_service.mutate_campaign_budgets(
        customer_id=customer_id, operations=[budget_operation]
    )
    return response.results[0].resource_name


# ── Step 2: Create a Campaign ─────────────────────────────────────────────

def create_campaign(client, customer_id, budget_resource_name):
    campaign_service = client.get_service("CampaignService")
    campaign_operation = client.get_type("CampaignOperation")

    campaign = campaign_operation.create
    campaign.name = f"API Campaign #{uuid.uuid4()}"
    campaign.advertising_channel_type = client.enums.AdvertisingChannelTypeEnum.SEARCH
    campaign.status = client.enums.CampaignStatusEnum.PAUSED  # Start paused
    campaign.campaign_budget = budget_resource_name

    # Bidding strategy: Maximize Conversions
    campaign.maximize_conversions.target_cpa_micros = 0  # No target CPA cap

    # Network settings
    campaign.network_settings.target_google_search = True
    campaign.network_settings.target_search_network = True
    campaign.network_settings.target_content_network = False

    # Start/end dates (optional)
    campaign.start_date = "2026-03-01"
    campaign.end_date = "2026-12-31"

    response = campaign_service.mutate_campaigns(
        customer_id=customer_id, operations=[campaign_operation]
    )
    return response.results[0].resource_name


# ── Step 3: Create an Ad Group ────────────────────────────────────────────

def create_ad_group(client, customer_id, campaign_resource_name):
    ad_group_service = client.get_service("AdGroupService")
    ad_group_operation = client.get_type("AdGroupOperation")

    ad_group = ad_group_operation.create
    ad_group.name = f"API Ad Group #{uuid.uuid4()}"
    ad_group.campaign = campaign_resource_name
    ad_group.status = client.enums.AdGroupStatusEnum.ENABLED
    ad_group.type_ = client.enums.AdGroupTypeEnum.SEARCH_STANDARD

    response = ad_group_service.mutate_ad_groups(
        customer_id=customer_id, operations=[ad_group_operation]
    )
    return response.results[0].resource_name


# ── Step 4: Add Keywords to Ad Group ──────────────────────────────────────

def add_keywords(client, customer_id, ad_group_resource_name):
    criterion_service = client.get_service("AdGroupCriterionService")

    keywords = [
        ("buy running shoes", "PHRASE"),
        ("best running shoes", "BROAD"),
        ("running shoes online store", "PHRASE"),
    ]

    operations = []
    for text, match_type in keywords:
        operation = client.get_type("AdGroupCriterionOperation")
        criterion = operation.create
        criterion.ad_group = ad_group_resource_name
        criterion.status = client.enums.AdGroupCriterionStatusEnum.ENABLED
        criterion.keyword.text = text
        criterion.keyword.match_type = getattr(
            client.enums.KeywordMatchTypeEnum, match_type
        )
        operations.append(operation)

    response = criterion_service.mutate_ad_group_criteria(
        customer_id=customer_id, operations=operations
    )
    return [result.resource_name for result in response.results]


# ── Step 5: Create a Responsive Search Ad ─────────────────────────────────

def create_responsive_search_ad(client, customer_id, ad_group_resource_name):
    ad_group_ad_service = client.get_service("AdGroupAdService")
    ad_group_ad_operation = client.get_type("AdGroupAdOperation")

    ad_group_ad = ad_group_ad_operation.create
    ad_group_ad.ad_group = ad_group_resource_name
    ad_group_ad.status = client.enums.AdGroupAdStatusEnum.PAUSED

    ad = ad_group_ad.ad
    ad.final_urls.append("https://www.example.com/running-shoes")

    # Headlines (min 3, max 15)
    for headline_text in [
        "Buy Running Shoes",
        "Best Running Shoes Online",
        "Free Shipping on Shoes",
    ]:
        headline = client.get_type("AdTextAsset")
        headline.text = headline_text
        ad.responsive_search_ad.headlines.append(headline)

    # Descriptions (min 2, max 4)
    for description_text in [
        "Shop our wide selection of running shoes. Top brands available.",
        "Free shipping on orders over $50. Shop now!",
    ]:
        description = client.get_type("AdTextAsset")
        description.text = description_text
        ad.responsive_search_ad.descriptions.append(description)

    response = ad_group_ad_service.mutate_ad_group_ads(
        customer_id=customer_id, operations=[ad_group_ad_operation]
    )
    return response.results[0].resource_name


# ── Run it all ────────────────────────────────────────────────────────────

budget_rn = create_campaign_budget(client, customer_id)
campaign_rn = create_campaign(client, customer_id, budget_rn)
ad_group_rn = create_ad_group(client, customer_id, campaign_rn)
keyword_rns = add_keywords(client, customer_id, ad_group_rn)
ad_rn = create_responsive_search_ad(client, customer_id, ad_group_rn)
```

### Creating a Complete Campaign (Node.js - Atomic with Temporary IDs)

```typescript
import {
    GoogleAdsApi, enums, resources, ResourceNames,
    toMicros, MutateOperation
} from "google-ads-api";

const client = new GoogleAdsApi({
    client_id: "YOUR_CLIENT_ID",
    client_secret: "YOUR_CLIENT_SECRET",
    developer_token: "YOUR_DEVELOPER_TOKEN",
});

const customer = client.Customer({
    customer_id: "1234567890",
    refresh_token: "YOUR_REFRESH_TOKEN",
});

// Temporary resource names (negative IDs) allow atomic creation
const customerId = "1234567890";
const budgetResourceName = ResourceNames.campaignBudget(customerId, "-1");
const campaignResourceName = ResourceNames.campaign(customerId, "-2");
const adGroupResourceName = ResourceNames.adGroup(customerId, "-3");

const operations: MutateOperation[] = [
    // 1. Budget
    {
        entity: "campaign_budget",
        operation: "create",
        resource: {
            resource_name: budgetResourceName,
            name: "API Budget",
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
            amount_micros: toMicros(50), // $50/day
        },
    },
    // 2. Campaign
    {
        entity: "campaign",
        operation: "create",
        resource: {
            name: "API Campaign",
            advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
            status: enums.CampaignStatus.PAUSED,
            maximize_conversions: { target_cpa_micros: 0 },
            campaign_budget: budgetResourceName, // references temp ID
            network_settings: {
                target_google_search: true,
                target_search_network: true,
            },
        },
    },
    // 3. Ad Group
    {
        entity: "ad_group",
        operation: "create",
        resource: {
            resource_name: adGroupResourceName,
            name: "API Ad Group",
            campaign: campaignResourceName, // references temp ID
            status: enums.AdGroupStatus.ENABLED,
            type: enums.AdGroupType.SEARCH_STANDARD,
        },
    },
    // 4. Keywords
    {
        entity: "ad_group_criterion",
        operation: "create",
        resource: {
            ad_group: adGroupResourceName,
            keyword: {
                text: "buy running shoes",
                match_type: enums.KeywordMatchType.PHRASE,
            },
            status: enums.AdGroupCriterionStatus.ENABLED,
        },
    },
    {
        entity: "ad_group_criterion",
        operation: "create",
        resource: {
            ad_group: adGroupResourceName,
            keyword: {
                text: "best running shoes",
                match_type: enums.KeywordMatchType.BROAD,
            },
            status: enums.AdGroupCriterionStatus.ENABLED,
        },
    },
];

const result = await customer.mutateResources(operations);
console.log("Created resources:", result);
```

### Updating a Campaign Budget (Python)

```python
from google.api_core import protobuf_helpers

def update_campaign_budget(client, customer_id, budget_id, new_amount_micros):
    budget_service = client.get_service("CampaignBudgetService")
    budget_operation = client.get_type("CampaignBudgetOperation")

    budget = budget_operation.update
    budget.resource_name = budget_service.campaign_budget_path(
        customer_id, budget_id
    )
    budget.amount_micros = new_amount_micros  # e.g., 75_000_000 for $75/day

    # Field mask tells the API which fields to update
    client.copy_from(
        budget_operation.update_mask,
        protobuf_helpers.field_mask(None, budget)
    )

    response = budget_service.mutate_campaign_budgets(
        customer_id=customer_id, operations=[budget_operation]
    )
    print(f"Updated budget: {response.results[0].resource_name}")
```

### Managing Negative Keywords (Python)

```python
def add_negative_keywords(client, customer_id, campaign_resource_name):
    """Add campaign-level negative keywords."""
    criterion_service = client.get_service("CampaignCriterionService")

    negative_keywords = ["free", "cheap", "discount", "coupon"]
    operations = []

    for keyword_text in negative_keywords:
        operation = client.get_type("CampaignCriterionOperation")
        criterion = operation.create
        criterion.campaign = campaign_resource_name
        criterion.negative = True
        criterion.keyword.text = keyword_text
        criterion.keyword.match_type = client.enums.KeywordMatchTypeEnum.BROAD
        operations.append(operation)

    response = criterion_service.mutate_campaign_criteria(
        customer_id=customer_id, operations=operations
    )
    print(f"Added {len(response.results)} negative keywords.")
```

### Removing / Pausing Keywords (Python)

```python
def pause_keyword(client, customer_id, ad_group_id, criterion_id):
    """Pause a specific keyword."""
    criterion_service = client.get_service("AdGroupCriterionService")
    criterion_operation = client.get_type("AdGroupCriterionOperation")

    criterion = criterion_operation.update
    criterion.resource_name = criterion_service.ad_group_criterion_path(
        customer_id, ad_group_id, criterion_id
    )
    criterion.status = client.enums.AdGroupCriterionStatusEnum.PAUSED

    client.copy_from(
        criterion_operation.update_mask,
        protobuf_helpers.field_mask(None, criterion)
    )

    response = criterion_service.mutate_ad_group_criteria(
        customer_id=customer_id, operations=[criterion_operation]
    )
    print(f"Paused keyword: {response.results[0].resource_name}")


def remove_keyword(client, customer_id, ad_group_id, criterion_id):
    """Remove a keyword entirely."""
    criterion_service = client.get_service("AdGroupCriterionService")
    criterion_operation = client.get_type("AdGroupCriterionOperation")

    criterion_operation.remove = criterion_service.ad_group_criterion_path(
        customer_id, ad_group_id, criterion_id
    )

    response = criterion_service.mutate_ad_group_criteria(
        customer_id=customer_id, operations=[criterion_operation]
    )
    print(f"Removed keyword: {response.results[0].resource_name}")
```

### Listing Accessible Customer Accounts (Python)

```python
def list_accessible_customers(client):
    """List all accounts the authenticated user can access."""
    customer_service = client.get_service("CustomerService")
    response = customer_service.list_accessible_customers()

    print("Accessible customer IDs:")
    for resource_name in response.resource_names:
        print(f"  {resource_name}")
    return response.resource_names
```

---

## Reporting

### Search vs SearchStream

| Feature           | Search                     | SearchStream                   |
|-------------------|----------------------------|--------------------------------|
| Connection        | Multiple requests (paged)  | Single persistent connection   |
| Page size         | Up to 10,000 rows/page     | Full result in one stream      |
| API operations    | 1 per call (regardless of pages) | 1 per call              |
| Best for          | Small/medium datasets      | Large datasets (>10K rows)     |
| Recommendation    | Either works for small     | **Preferred for production**   |

### Full Reporting Example (Python)

```python
def get_campaign_performance_report(client, customer_id, date_range="LAST_30_DAYS"):
    """Pull a comprehensive campaign performance report."""
    ga_service = client.get_service("GoogleAdsService")

    query = f"""
        SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign_budget.amount_micros,
            campaign.bidding_strategy_type,
            segments.date,
            segments.device,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_per_conversion,
            metrics.all_conversions,
            metrics.view_through_conversions
        FROM campaign
        WHERE campaign.status != 'REMOVED'
            AND segments.date DURING {date_range}
        ORDER BY metrics.cost_micros DESC
    """

    rows = []
    stream = ga_service.search_stream(customer_id=customer_id, query=query)

    for batch in stream:
        for row in batch.results:
            rows.append({
                "campaign_id": row.campaign.id,
                "campaign_name": row.campaign.name,
                "status": row.campaign.status.name,
                "channel_type": row.campaign.advertising_channel_type.name,
                "budget": row.campaign_budget.amount_micros / 1_000_000,
                "bidding_strategy": row.campaign.bidding_strategy_type.name,
                "date": row.segments.date,
                "device": row.segments.device.name,
                "impressions": row.metrics.impressions,
                "clicks": row.metrics.clicks,
                "ctr": row.metrics.ctr,
                "avg_cpc": row.metrics.average_cpc / 1_000_000,
                "cost": row.metrics.cost_micros / 1_000_000,
                "conversions": row.metrics.conversions,
                "conv_value": row.metrics.conversions_value,
                "cost_per_conv": row.metrics.cost_per_conversion / 1_000_000,
            })

    return rows
```

### Reporting with Pandas (Python)

```python
import pandas as pd

def campaign_report_to_dataframe(client, customer_id):
    """Pull campaign data directly into a Pandas DataFrame."""
    ga_service = client.get_service("GoogleAdsService")

    query = """
        SELECT
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions
        FROM campaign
        WHERE campaign.status = 'ENABLED'
            AND segments.date DURING LAST_30_DAYS
    """

    stream = ga_service.search_stream(customer_id=customer_id, query=query)

    data = []
    for batch in stream:
        for row in batch.results:
            data.append({
                "campaign": row.campaign.name,
                "impressions": row.metrics.impressions,
                "clicks": row.metrics.clicks,
                "cost": row.metrics.cost_micros / 1_000_000,
                "conversions": row.metrics.conversions,
            })

    df = pd.DataFrame(data)
    if not df.empty:
        df["ctr"] = df["clicks"] / df["impressions"]
        df["cpc"] = df["cost"] / df["clicks"].replace(0, float("nan"))
        df["cpa"] = df["cost"] / df["conversions"].replace(0, float("nan"))
    return df
```

---

## Bidding Strategies

### Available Strategy Types

| Strategy                         | API Enum / Field                    | Description                                       |
|----------------------------------|-------------------------------------|---------------------------------------------------|
| Maximize Conversions             | `maximize_conversions`              | Max conversions within budget                      |
| Maximize Conversions + Target CPA| `maximize_conversions.target_cpa_micros` | Max conversions at target cost per conversion |
| Maximize Conversion Value        | `maximize_conversion_value`         | Max total conversion value within budget           |
| Maximize Conv Value + Target ROAS| `maximize_conversion_value.target_roas` | Max value at target ROAS (e.g., 4.0 = 400%) |
| Manual CPC                       | `manual_cpc`                        | Set bids manually per keyword                      |
| Enhanced CPC                     | `manual_cpc.enhanced_cpc_enabled`   | Manual with smart adjustments                      |
| Maximize Clicks                  | `maximize_clicks`                   | Max clicks within budget                           |
| Target Impression Share          | `target_impression_share`           | Target % of impressions at a position              |

### Setting Bidding Strategy (Python)

```python
# Maximize Conversions with optional Target CPA
campaign.maximize_conversions.target_cpa_micros = 10_000_000  # $10 target CPA

# Maximize Conversion Value with Target ROAS
campaign.maximize_conversion_value.target_roas = 4.0  # 400% ROAS

# Manual CPC with Enhanced CPC
campaign.manual_cpc.enhanced_cpc_enabled = True

# Target Impression Share
campaign.target_impression_share.location = (
    client.enums.TargetImpressionShareLocationEnum.ANYWHERE_ON_PAGE
)
campaign.target_impression_share.location_fraction_micros = 650_000  # 65%
campaign.target_impression_share.cpc_bid_ceiling_micros = 5_000_000  # $5 max CPC
```

### Setting Bidding Strategy (Node.js)

```typescript
// Maximize Conversions
const operations: MutateOperation[] = [{
    entity: "campaign",
    operation: "create",
    resource: {
        name: "Smart Bidding Campaign",
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        status: enums.CampaignStatus.PAUSED,
        maximize_conversions: {
            target_cpa_micros: toMicros(10), // $10 target CPA
        },
        campaign_budget: budgetResourceName,
    },
}];
```

---

## Rate Limits and Quotas

### Daily Operation Limits

| Access Level     | Production  | Test Accounts |
|------------------|-------------|---------------|
| Explorer         | 2,880/day   | 15,000/day    |
| Basic            | 15,000/day  | 15,000/day    |
| Standard         | **Unlimited**| **Unlimited** |

**Note:** A single `Search` or `SearchStream` call counts as **one** operation regardless of result size or pagination.

### Per-Request Limits

| Limit                               | Value          |
|--------------------------------------|---------------|
| Mutate operations per request        | 10,000        |
| Conversion uploads per request       | 2,000         |
| Conversion adjustments per request   | 2,000         |
| gRPC response message size           | 64 MB         |
| IN clause filter values              | 20,000        |
| Conversion value rules per account   | 100,000       |
| Keyword Plan objects per account     | 10,000        |
| Pending invitations per account      | 70            |

### Rate Limiting (QPS)

- Uses a **Token Bucket algorithm** metered by both **customer ID (CID)** and **developer token**.
- Exact QPS limit varies based on server load -- there is no fixed published number.
- When rate limited, you receive `RESOURCE_EXHAUSTED` error.
- **Best practice:** Implement exponential backoff with jitter.

### Service-Specific Limits

| Service                              | Limit                                  |
|--------------------------------------|----------------------------------------|
| KeywordPlanService (GenerateKeywordIdeas, etc.) | 1 QPS per customer ID        |
| KeywordPlanService (GenerateAdGroupTheme) | 2 QPS per customer ID             |
| AudienceInsightsService              | ~200 requests/day per customer ID      |
| TargetingSuggestionMetrics           | 2 QPS per developer token              |
| BillingSetup / AccountBudget mutate  | 1 operation per request, 12-hr cooldown|

### Handling Rate Limits

```python
import time
from google.api_core.exceptions import ResourceExhausted

def api_call_with_retry(func, *args, max_retries=5, **kwargs):
    """Execute an API call with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except ResourceExhausted:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + (random.random() * 0.5)
            print(f"Rate limited. Retrying in {wait_time:.1f}s...")
            time.sleep(wait_time)
```

---

## Recent Changes and Deprecations

### v23 (January 2026) - Key Changes

**New Features:**
- Performance Max ad network type breakdown
- `InvoiceService.ListInvoices` now returns campaign-level cost breakdown and regulatory fees
- `Campaign.start_date_time` and `Campaign.end_date_time` fields (datetime replaces date-only)
- `AudienceInsightsService.GenerateAudienceDefinition` -- accepts natural language text, returns structured audience definitions using generative AI
- `LIFE_EVENT_USER_INTEREST` dimension for audience building
- Facebook Messenger and Zalo support for business message assets
- `YOUTUBE_FOLLOW_ON_VIEWS` conversion category
- New `IncentiveService` for "Choose Your Own" incentive programs
- `BenchmarksService` for YouTube ad benchmarking
- Ad network sub-type segmentation in reports

**Breaking Changes:**
- `CallAd` and `CallAdInfo` support **removed**
- `AD_SHARING_NOT_ALLOWED` error when sharing ads across ad groups (no longer allowed)

### v22 (October 2025) - Key Changes

**New Features:**
- `AssetGenerationService` (beta) -- AI-powered text and image asset generation
- Fixed share of voice bidding strategy
- Demand Gen `TargetCPC` bidding strategy
- Demand Gen asset automation: `GENERATE_DESIGN_VERSIONS_FOR_IMAGES`, `GENERATE_VIDEOS_FROM_OTHER_ASSETS`
- `TargetingExpansionView` for AI Max expansion reporting
- Performance Max new automation types for image enhancement
- Video metrics renamed with `trueview_` prefix

**Breaking Changes:**
- Batch job operations limited to 10,000 per request
- `page_size` defaults to 1,000; errors if exceeding 1,000
- `AssetPerformanceLabel` removed from Performance Max

### v21 (August 2025) - Key Changes

**New Features:**
- AI Max for Search: `enable_ai_max` field, ad group-level targeting
- Promotion assets: terms/conditions and barcode/QR code fields
- `AutomaticallyCreatedAssetRemovalService` for removing auto-generated assets
- Performance Max brand guidelines enabled by default
- `campaign_search_term_view` for PMax campaigns

**Deprecations:**
- Enhanced conversions for leads: `debug_enabled` mode discontinued
- EU Political Advertising: `contains_eu_political_advertising` field required for new campaigns in v23+

### Version Sunset Schedule

| Version | Sunset Date       | Action Required                |
|---------|-------------------|--------------------------------|
| v19     | Feb 11, 2026      | **URGENT - migrate now**       |
| v20     | TBD (~mid 2026)   | Plan migration to v22+         |
| v21     | TBD (~mid 2026)   | Plan migration to v22+         |
| v22     | TBD (~late 2026)  | Current recommended stable     |
| v23     | TBD (~early 2027) | Latest with newest features    |

> **Migration tip:** Organizations still on v19 can jump directly to v22 or v23 without migrating through intermediate versions, but must review all cumulative breaking changes.

### Monthly Release Cadence (New in 2026)

Starting January 2026:
- **4 major versions per year** (with potential breaking changes)
- **Monthly minor versions** (non-breaking feature additions)
- **Support window extended to 1 year** per version

---

## Conversion Tracking

### Create a conversion action (Python)

```python
def create_conversion_action(client, customer_id):
    conversion_action_service = client.get_service("ConversionActionService")
    conversion_action_operation = client.get_type("ConversionActionOperation")

    conversion_action = conversion_action_operation.create
    conversion_action.name = f"Purchase Conversion {uuid.uuid4()}"
    conversion_action.type_ = client.enums.ConversionActionTypeEnum.WEBPAGE
    conversion_action.category = client.enums.ConversionActionCategoryEnum.PURCHASE
    conversion_action.status = client.enums.ConversionActionStatusEnum.ENABLED
    conversion_action.view_through_lookback_window_days = 1
    conversion_action.value_settings.default_value = 15.0
    conversion_action.value_settings.always_use_default_value = False

    # Tag tracking settings
    conversion_action.tag_snippets  # read-only — generated by Google Ads

    response = conversion_action_service.mutate_conversion_actions(
        customer_id=customer_id, operations=[conversion_action_operation]
    )
    return response.results[0].resource_name
```

### Upload offline conversions (enhanced conversions)

Upload first-party data to match offline conversions back to ad clicks.

```python
def upload_click_conversion(client, customer_id, gclid, conversion_action_name, conversion_value):
    """Upload a click-based offline conversion."""
    conversion_upload_service = client.get_service("ConversionUploadService")
    click_conversion = client.get_type("ClickConversion")

    click_conversion.conversion_action = client.get_service(
        "ConversionActionService"
    ).conversion_action_path(customer_id, conversion_action_id)
    click_conversion.gclid = gclid                        # from URL parameter
    click_conversion.conversion_value = conversion_value  # float
    click_conversion.currency_code = "USD"
    click_conversion.conversion_date_time = "2026-01-15 14:30:00+00:00"

    # Enhanced conversion: hashed user data
    import hashlib
    user_identifier = client.get_type("UserIdentifier")
    user_identifier.hashed_email = hashlib.sha256("[email protected]".encode()).hexdigest()
    click_conversion.user_identifiers.append(user_identifier)

    request = client.get_type("UploadClickConversionsRequest")
    request.customer_id = customer_id
    request.conversions.append(click_conversion)
    request.partial_failure = True  # don't fail entire batch on single error

    response = conversion_upload_service.upload_click_conversions(request=request)

    if response.partial_failure_error:
        print(f"Partial failure: {response.partial_failure_error.message}")

    for result in response.results:
        print(f"Uploaded: gclid={result.gclid}, action={result.conversion_action}")
```

### Query conversion actions via GAQL

```sql
SELECT
    conversion_action.id,
    conversion_action.name,
    conversion_action.type,
    conversion_action.category,
    conversion_action.status,
    conversion_action.counting_type,
    conversion_action.value_settings.default_value
FROM conversion_action
WHERE conversion_action.status = 'ENABLED'
ORDER BY conversion_action.name
```

### Conversion reporting

```sql
SELECT
    campaign.name,
    conversion_action.name,
    segments.conversion_action_name,
    metrics.conversions,
    metrics.conversions_value,
    metrics.cost_per_conversion,
    metrics.all_conversions,
    metrics.view_through_conversions
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.conversions DESC
```

### Conversion action categories

| Category | Description |
|----------|------------|
| `PURCHASE` | Product purchase |
| `SIGNUP` | User registration |
| `LEAD` | Lead form submission |
| `CONTACT` | Phone/contact form |
| `SUBMIT_LEAD_FORM` | Lead form ad submission |
| `BOOK_APPOINTMENT` | Appointment booking |
| `DOWNLOAD` | App or file download |
| `PAGE_VIEW` | Important page visit |
| `DEFAULT` | Generic conversion |

---

## Change History API

Query a detailed audit trail of all changes made to an account.

### GAQL: Change history

```sql
SELECT
    change_event.change_date_time,
    change_event.change_resource_type,
    change_event.change_resource_name,
    change_event.changed_fields,
    change_event.client_type,
    change_event.user_email,
    change_event.resource_change_operation,
    change_event.old_resource,
    change_event.new_resource
FROM change_event
WHERE change_event.change_date_time DURING LAST_14_DAYS
ORDER BY change_event.change_date_time DESC
LIMIT 100
```

### Filter by resource type

```sql
-- Only campaign changes
SELECT
    change_event.change_date_time,
    change_event.change_resource_name,
    change_event.changed_fields,
    change_event.resource_change_operation
FROM change_event
WHERE change_event.change_resource_type = 'CAMPAIGN'
    AND change_event.change_date_time DURING LAST_30_DAYS
ORDER BY change_event.change_date_time DESC
```

### Resource change operations

| Operation | Description |
|-----------|------------|
| `CREATE` | Resource was created |
| `UPDATE` | Resource was modified |
| `REMOVE` | Resource was deleted |
| `UNKNOWN` | Operation type unknown |

### Change event resource types

`CAMPAIGN`, `AD_GROUP`, `AD`, `AD_GROUP_CRITERION`, `CAMPAIGN_CRITERION`, `CAMPAIGN_BUDGET`, `AD_GROUP_BID_MODIFIER`, `CAMPAIGN_BIDDING_STRATEGY`, `FEED`, `FEED_ITEM`

### Python example: Audit trail

```python
def get_change_history(client, customer_id, days=7):
    ga_service = client.get_service("GoogleAdsService")

    query = f"""
        SELECT
            change_event.change_date_time,
            change_event.change_resource_type,
            change_event.change_resource_name,
            change_event.resource_change_operation,
            change_event.user_email,
            change_event.client_type
        FROM change_event
        WHERE change_event.change_date_time DURING LAST_{days}_DAYS
        ORDER BY change_event.change_date_time DESC
        LIMIT 500
    """

    changes = []
    stream = ga_service.search_stream(customer_id=customer_id, query=query)
    for batch in stream:
        for row in batch.results:
            changes.append({
                "datetime": row.change_event.change_date_time,
                "type": row.change_event.change_resource_type.name,
                "resource": row.change_event.change_resource_name,
                "operation": row.change_event.resource_change_operation.name,
                "user": row.change_event.user_email,
                "client": row.change_event.client_type.name,
            })
    return changes
```

---

## Recommendations API

Google Ads surfaces optimization recommendations via the API. Read, apply, or dismiss them programmatically.

### List recommendations

```sql
SELECT
    recommendation.type,
    recommendation.impact.base_metrics.impressions,
    recommendation.impact.potential_metrics.impressions,
    recommendation.campaign_budget_recommendation,
    recommendation.keyword_recommendation,
    recommendation.target_cpa_opt_in_recommendation,
    recommendation.resource_name
FROM recommendation
WHERE recommendation.type = 'KEYWORD'
```

### Common recommendation types

| Type | Description |
|------|------------|
| `KEYWORD` | Add new keywords |
| `REMOVE_REDUNDANT_KEYWORDS` | Remove duplicate/overlapping keywords |
| `ENHANCED_CPC_OPT_IN` | Enable Enhanced CPC bidding |
| `TARGET_CPA_OPT_IN` | Switch to Target CPA smart bidding |
| `MAXIMIZE_CONVERSIONS_OPT_IN` | Switch to Maximize Conversions |
| `CAMPAIGN_BUDGET` | Increase budget for limited campaigns |
| `SITELINK_EXTENSION` | Add sitelink ad extensions |
| `CALL_EXTENSION` | Add call extension |
| `IMPROVE_PERFORMANCE_MAX_AD_STRENGTH` | Improve Performance Max asset group rating |
| `UPGRADE_SMART_SHOPPING_CAMPAIGN_TO_PERFORMANCE_MAX` | Upgrade legacy Shopping to PMax |

### Apply a recommendation (Python)

```python
def apply_recommendation(client, customer_id, recommendation_resource_name):
    """Apply a single recommendation."""
    recommendation_service = client.get_service("RecommendationService")

    apply_operation = client.get_type("ApplyRecommendationOperation")
    apply_operation.resource_name = recommendation_resource_name

    response = recommendation_service.apply_recommendation(
        customer_id=customer_id,
        operations=[apply_operation]
    )
    print(f"Applied: {response.results[0].resource_name}")
```

### Apply a keyword recommendation with override (Python)

```python
def apply_keyword_recommendation(client, customer_id, recommendation_resource_name, custom_match_type=None):
    recommendation_service = client.get_service("RecommendationService")

    apply_operation = client.get_type("ApplyRecommendationOperation")
    apply_operation.resource_name = recommendation_resource_name

    if custom_match_type:
        # Override the recommended match type
        apply_operation.keyword.match_type = getattr(
            client.enums.KeywordMatchTypeEnum, custom_match_type
        )

    response = recommendation_service.apply_recommendation(
        customer_id=customer_id,
        operations=[apply_operation]
    )
```

### Dismiss a recommendation (Python)

```python
def dismiss_recommendation(client, customer_id, recommendation_resource_name):
    recommendation_service = client.get_service("RecommendationService")

    dismiss_operation = client.get_type("DismissRecommendationRequest").operations.add()
    dismiss_operation.resource_name = recommendation_resource_name

    recommendation_service.dismiss_recommendation(
        customer_id=customer_id,
        operations=[dismiss_operation]
    )
```

### Batch apply recommendations

```python
def apply_all_keyword_recommendations(client, customer_id):
    """Apply all pending keyword recommendations."""
    ga_service = client.get_service("GoogleAdsService")
    recommendation_service = client.get_service("RecommendationService")

    # Fetch recommendations
    query = """
        SELECT recommendation.resource_name, recommendation.type
        FROM recommendation
        WHERE recommendation.type = 'KEYWORD'
    """

    stream = ga_service.search_stream(customer_id=customer_id, query=query)
    operations = []
    for batch in stream:
        for row in batch.results:
            op = client.get_type("ApplyRecommendationOperation")
            op.resource_name = row.recommendation.resource_name
            operations.append(op)

    if not operations:
        print("No keyword recommendations found.")
        return

    # Apply in batches of 100
    for i in range(0, len(operations), 100):
        chunk = operations[i:i+100]
        response = recommendation_service.apply_recommendation(
            customer_id=customer_id, operations=chunk
        )
        print(f"Applied {len(response.results)} recommendations")
```

---

## Appendix: Key Resource Names

Resource names follow a hierarchical pattern:

```
customers/{customer_id}/campaigns/{campaign_id}
customers/{customer_id}/adGroups/{ad_group_id}
customers/{customer_id}/adGroupAds/{ad_group_id}~{ad_id}
customers/{customer_id}/adGroupCriteria/{ad_group_id}~{criterion_id}
customers/{customer_id}/campaignBudgets/{budget_id}
customers/{customer_id}/biddingStrategies/{bidding_strategy_id}
customers/{customer_id}/campaignCriteria/{campaign_id}~{criterion_id}
```

## Appendix: Micros Conversion

All monetary values in the API use **micros** (1 dollar = 1,000,000 micros):

```python
# Conversion helpers
def to_micros(dollars: float) -> int:
    return int(dollars * 1_000_000)

def from_micros(micros: int) -> float:
    return micros / 1_000_000
```

```typescript
// Node.js - built-in helper
import { toMicros } from "google-ads-api";
const budget = toMicros(50); // 50_000_000
```

## Appendix: Useful Links

- [API Reference (v23)](https://developers.google.com/google-ads/api/reference/rpc/v23/overview)
- [Interactive GAQL Query Builder](https://developers.google.com/google-ads/api/docs/developer-toolkit/gaa-query-builder)
- [GAQL Query Validator](https://developers.google.com/google-ads/api/docs/developer-toolkit/gaa-query-validator)
- [Python Client Library (GitHub)](https://github.com/googleads/google-ads-python)
- [Node.js Client Library (GitHub)](https://github.com/Opteo/google-ads-api)
- [Release Notes](https://developers.google.com/google-ads/api/docs/release-notes)
- [Sunset Dates](https://developers.google.com/google-ads/api/docs/sunset-dates)
- [Error Reference](https://developers.google.com/google-ads/api/reference/rpc/v23/overview)
