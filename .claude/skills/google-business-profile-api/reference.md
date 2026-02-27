# Google Business Profile API -- Developer Reference

> **Last Updated:** February 2026
> **API Status:** Active (Federated Model)
> **Migration:** Google My Business API v4.9 coexists with newer specialized v1 APIs

---

## Table of Contents

1. [API Architecture Overview](#api-architecture-overview)
2. [Available APIs and Endpoints](#available-apis-and-endpoints)
3. [Authentication (OAuth 2.0)](#authentication-oauth-20)
4. [Business Information API](#business-information-api)
5. [Reviews Management](#reviews-management)
6. [Posts (Local Posts)](#posts-local-posts)
7. [Business Profile Performance API](#business-profile-performance-api)
8. [Notifications API (Review Alerts)](#notifications-api-review-alerts)
9. [Account Management API](#account-management-api)
10. [Rate Limits and Quotas](#rate-limits-and-quotas)
11. [Deprecations and Migration Guide](#deprecations-and-migration-guide)
12. [Python Code Examples](#python-code-examples)
13. [Node.js Code Examples](#nodejs-code-examples)
14. [Error Handling](#error-handling)
15. [Sources](#sources)

---

## API Architecture Overview

Google Business Profile APIs use a **federated model** with separate endpoints for different functionality. Each API has its own base URL, version, and resource hierarchy. This replaced the monolithic Google My Business API approach and provides greater flexibility.

### Current State (February 2026)

| Component | Status |
|-----------|--------|
| Google My Business API v4.9 | Active (handles Reviews, Posts, Media, and remaining functionality) |
| Business Information API v1 | Active (location management) |
| Account Management API v1.1 | Active |
| Business Profile Performance API v1 | Active (replaces v4 reportInsights) |
| Notifications API v1.2 | Active |
| Verifications API v1 | Active |
| Place Actions API v1 | Active |
| Lodging API v1.2 | Active |
| Q&A API v1 | **DISCONTINUED** (November 3, 2025) |
| Business Calls API v1 | **DEPRECATED** (May 30, 2023) |

### Base URLs

| API | Base URL |
|-----|----------|
| Google My Business API v4.9 | `https://mybusiness.googleapis.com/v4/` |
| Business Information API v1 | `https://mybusinessbusinessinformation.googleapis.com/v1/` |
| Account Management API v1.1 | `https://mybusinessaccountmanagement.googleapis.com/v1/` |
| Performance API v1 | `https://businessprofileperformance.googleapis.com/v1/` |
| Notifications API v1.2 | `https://mybusinessnotifications.googleapis.com/v1/` |
| Verifications API v1 | `https://mybusinessverifications.googleapis.com/v1/` |
| Place Actions API v1 | `https://mybusinessplaceactions.googleapis.com/v1/` |
| Lodging API v1.2 | `https://mybusinesslodging.googleapis.com/v1/` |

---

## Available APIs and Endpoints

### 1. Account Management API (v1.1)

Manages business accounts and user access.

| Resource | Methods |
|----------|---------|
| `accounts` | create, get, list, patch |
| `accounts.admins` | create, delete, list, patch |
| `accounts.invitations` | accept, decline, list |
| `locations` | transfer |
| `locations.admins` | create, delete, list, patch |

### 2. Business Information API (v1)

Manages location data, categories, and attributes.

| Resource | Methods |
|----------|---------|
| `accounts.locations` | create, list |
| `attributes` | list |
| `categories` | batchGet, list |
| `chains` | get, search |
| `googleLocations` | search |
| `locations` | delete, get, getAttributes, patch, updateAttributes |

### 3. Google My Business API (v4.9)

Handles Reviews, Posts, Media, and remaining functionality not yet migrated to specialized APIs.

| Resource | Methods |
|----------|---------|
| `accounts.locations.reviews` | get, list, updateReply, deleteReply |
| `accounts.locations.localPosts` | create, get, list, patch, delete, reportInsights |
| `accounts.locations.media` | create, get, list, patch, delete, startUpload |
| `accounts.locations.media.customers` | get, list |
| `accounts.locations` | get, list, patch, delete, batchGet, batchGetReviews, reportInsights |
| `accounts.locations.followers` | getMetadata |
| `accounts.locations.verifications` | list, complete |

### 4. Business Profile Performance API (v1)

Performance metrics and search keyword insights.

| Resource | Methods |
|----------|---------|
| `locations` | fetchMultiDailyMetricsTimeSeries, getDailyMetricsTimeSeries |
| `locations.searchkeywords.impressions.monthly` | list |

### 5. Notifications API (v1.2)

Pub/Sub notification configuration.

| Resource | Methods |
|----------|---------|
| `accounts` | getNotificationSetting, updateNotificationSetting |

### 6. Verifications API (v1)

Location verification management.

| Resource | Methods |
|----------|---------|
| `locations` | fetchVerificationOptions, getVoiceOfMerchantState, verify |
| `locations.verifications` | complete, list |

### 7. Place Actions API (v1)

Manages action links (book, order, reserve).

| Resource | Methods |
|----------|---------|
| `locations.placeActionLinks` | create, delete, get, list, patch |
| `placeActionTypeMetadata` | list |

### 8. Lodging API (v1.2)

Hotel/lodging-specific data management.

| Resource | Methods |
|----------|---------|
| `locations` | getLodging, updateLodging |
| `locations.lodging` | getGoogleUpdated |

---

## Authentication (OAuth 2.0)

All Business Profile APIs require OAuth 2.0 authorization. Service accounts are **not supported** -- you must use user-based OAuth consent flows.

### Required OAuth Scope

```
https://www.googleapis.com/auth/business.manage
```

> **Deprecated scope** (still functional for backward compatibility):
> `https://www.googleapis.com/auth/plus.business.manage`

### Prerequisites

1. **Google Cloud Project** with billing enabled
2. **API Access Approval** -- submit application via the [GBP API request form](https://developers.google.com/my-business/content/basic-setup). The API is only visible in the API Console after approval.
3. **Enable all 8 APIs** in the Google API Console:
   - Google My Business API
   - My Business Account Management API
   - My Business Lodging API
   - My Business Place Actions API
   - My Business Notifications API
   - My Business Verifications API
   - My Business Business Information API
   - Business Profile Performance API
4. **OAuth 2.0 Client ID** created in the Credentials section

### OAuth Flow

```
1. User clicks "Sign in with Google"
2. Consent screen requests business.manage scope
3. Authorization code returned to redirect_uri
4. Exchange code for access_token + refresh_token
5. Use access_token in Authorization header
6. Use refresh_token when access_token expires
```

### Token Exchange

```
POST https://www.googleapis.com/oauth2/v4/token

Parameters:
  code=AUTHORIZATION_CODE
  client_id=YOUR_CLIENT_ID
  client_secret=YOUR_CLIENT_SECRET
  redirect_uri=YOUR_REDIRECT_URI
  grant_type=authorization_code
```

### API Request Header

```
Authorization: Bearer ACCESS_TOKEN
```

### Enabling Detailed Error Messages

Add this header to requests for verbose error responses:

```
X-GOOG-API-FORMAT-VERSION: 2
```

---

## Business Information API

**Base URL:** `https://mybusinessbusinessinformation.googleapis.com/v1/`

### Get a Location

```
GET /v1/locations/{locationId}?readMask=name,title,storefrontAddress,phoneNumbers
```

The `readMask` parameter specifies which fields to return. Key field names (v1 naming):

| v4.9 Field | v1 Field |
|------------|----------|
| `locationName` | `title` |
| `address` | `storefrontAddress` |
| `primaryPhone` | `phoneNumbers.primaryPhone` |
| `additionalPhones` | `phoneNumbers.additionalPhones` |
| `primaryCategory` | `categories.primaryCategory` |

### List Locations for an Account

```
GET /v1/accounts/{accountId}/locations?readMask=name,title&pageSize=100
```

Use `accounts/-/locations` as a wildcard to include indirectly owned listings.

### Update a Location

```
PATCH /v1/locations/{locationId}?updateMask=title,phoneNumbers
Content-Type: application/json

{
  "title": "Updated Business Name",
  "phoneNumbers": {
    "primaryPhone": "+1-555-123-4567"
  }
}
```

The `updateMask` is **required** -- only include fields that need updating.

### Create a Location

```
POST /v1/accounts/{accountId}/locations

{
  "title": "My New Business",
  "storefrontAddress": {
    "addressLines": ["123 Main Street"],
    "locality": "San Francisco",
    "administrativeArea": "CA",
    "postalCode": "94105",
    "regionCode": "US"
  },
  "phoneNumbers": {
    "primaryPhone": "+1-555-123-4567"
  },
  "websiteUri": "https://example.com",
  "languageCode": "en",
  "categories": {
    "primaryCategory": {
      "name": "categories/gcid:restaurant"
    }
  }
}
```

### Get/Update Attributes

```
GET /v1/locations/{locationId}/attributes
```

```
PATCH /v1/locations/{locationId}/attributes?attributeMask=has_wheelchair_accessible_entrance

{
  "attributes": [
    {
      "name": "locations/{locationId}/attributes/has_wheelchair_accessible_entrance",
      "values": [true]
    }
  ]
}
```

### Filter and Search Locations

Supported filter fields: `title`, `categories`, `phone_numbers`, `address`, `labels`, `store_codes`, `place_id`.

```
GET /v1/accounts/{accountId}/locations?filter=title="Coffee Shop"&orderBy=title
```

---

## Reviews Management

**Base URL:** `https://mybusiness.googleapis.com/v4/`

Reviews remain on the v4.9 API and have not been migrated to a standalone v1 API.

### Review Resource Schema

```json
{
  "name": "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}",
  "reviewId": "string",
  "reviewer": {
    "profilePhotoUrl": "string",
    "displayName": "string",
    "isAnonymous": boolean
  },
  "starRating": "ONE | TWO | THREE | FOUR | FIVE",
  "comment": "string",
  "createTime": "timestamp",
  "updateTime": "timestamp",
  "reviewReply": {
    "comment": "string (max 4096 bytes)",
    "updateTime": "timestamp"
  }
}
```

### StarRating Enum

| Value | Description |
|-------|-------------|
| `STAR_RATING_UNSPECIFIED` | Not specified |
| `ONE` | 1 star |
| `TWO` | 2 stars |
| `THREE` | 3 stars |
| `FOUR` | 4 stars |
| `FIVE` | 5 stars |

### List Reviews for a Location

```
GET /v4/accounts/{accountId}/locations/{locationId}/reviews
    ?pageSize=50
    &orderBy=updateTime desc
```

### Get a Single Review

```
GET /v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
```

### Batch Get Reviews (Multiple Locations)

```
POST /v4/accounts/{accountId}/locations:batchGetReviews

{
  "locationNames": [
    "accounts/{accountId}/locations/{locationId1}",
    "accounts/{accountId}/locations/{locationId2}"
  ],
  "pageSize": 50,
  "orderBy": "updateTime desc",
  "ignoreRatingOnlyReviews": false
}
```

### Reply to a Review

```
PUT /v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply

{
  "comment": "Thank you for your feedback! We appreciate your business."
}
```

### Delete a Review Reply

```
DELETE /v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
```

---

## Posts (Local Posts)

**Base URL:** `https://mybusiness.googleapis.com/v4/`

Posts remain on the v4.9 API.

### Post Types

| Topic Type | Description | Key Fields |
|------------|-------------|------------|
| `STANDARD` | General update | summary, media |
| `EVENT` | Event announcement | event.title, event.schedule |
| `OFFER` | Promotional offer | offer.couponCode, offer.redeemOnlineUrl, offer.termsConditions |

> **Note:** Product Posts cannot be created via the API.

### Call-to-Action Types

`BOOK`, `ORDER`, `SHOP`, `LEARN_MORE`, `SIGN_UP`, `CALL`

### Create a Post

```
POST /v4/accounts/{accountId}/locations/{locationId}/localPosts

{
  "languageCode": "en-US",
  "summary": "Check out our new spring menu!",
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "https://example.com/photo.jpg"
    }
  ],
  "topicType": "STANDARD",
  "callToAction": {
    "actionType": "LEARN_MORE",
    "url": "https://example.com/spring-menu"
  }
}
```

### Create an Event Post

```json
{
  "languageCode": "en-US",
  "summary": "Join us for our grand opening celebration!",
  "event": {
    "title": "Grand Opening",
    "schedule": {
      "startDate": { "year": 2026, "month": 3, "day": 15 },
      "startTime": { "hours": 10, "minutes": 0 },
      "endDate": { "year": 2026, "month": 3, "day": 15 },
      "endTime": { "hours": 18, "minutes": 0 }
    }
  },
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "https://example.com/event-banner.jpg"
    }
  ],
  "topicType": "EVENT"
}
```

### Create an Offer Post

```json
{
  "languageCode": "en-US",
  "summary": "20% off all services this week!",
  "offer": {
    "couponCode": "SPRING20",
    "redeemOnlineUrl": "https://example.com/redeem",
    "termsConditions": "Valid through March 31, 2026. Cannot be combined with other offers."
  },
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "https://example.com/offer-image.jpg"
    }
  ],
  "topicType": "OFFER"
}
```

### List Posts

```
GET /v4/accounts/{accountId}/locations/{locationId}/localPosts?pageSize=100
```

### Update a Post

```
PATCH /v4/accounts/{accountId}/locations/{locationId}/localPosts/{postId}?updateMask=summary

{
  "summary": "Updated post content here."
}
```

### Delete a Post

```
DELETE /v4/accounts/{accountId}/locations/{locationId}/localPosts/{postId}
```

---

## Business Profile Performance API

**Base URL:** `https://businessprofileperformance.googleapis.com/v1/`

This API replaced the deprecated `accounts.locations.reportInsights` method from v4.

### Available Daily Metrics

| Metric | Description |
|--------|-------------|
| `BUSINESS_IMPRESSIONS_DESKTOP_MAPS` | Views on Google Maps (desktop) |
| `BUSINESS_IMPRESSIONS_DESKTOP_SEARCH` | Views on Google Search (desktop) |
| `BUSINESS_IMPRESSIONS_MOBILE_MAPS` | Views on Google Maps (mobile) |
| `BUSINESS_IMPRESSIONS_MOBILE_SEARCH` | Views on Google Search (mobile) |
| `BUSINESS_CONVERSATIONS` | Message conversations received |
| `BUSINESS_DIRECTION_REQUESTS` | Direction requests to location |
| `CALL_CLICKS` | Call button clicks |
| `WEBSITE_CLICKS` | Website link clicks |
| `BUSINESS_BOOKINGS` | Bookings via Reserve with Google |
| `BUSINESS_FOOD_ORDERS` | Food orders received |
| `BUSINESS_FOOD_MENU_CLICKS` | Menu interaction clicks |

### Fetch Multiple Daily Metrics (Recommended)

```
GET /v1/locations/{locationId}:fetchMultiDailyMetricsTimeSeries
    ?dailyMetrics=WEBSITE_CLICKS
    &dailyMetrics=CALL_CLICKS
    &dailyMetrics=BUSINESS_DIRECTION_REQUESTS
    &dailyRange.startDate.year=2026
    &dailyRange.startDate.month=1
    &dailyRange.startDate.day=1
    &dailyRange.endDate.year=2026
    &dailyRange.endDate.month=1
    &dailyRange.endDate.day=31
```

**Response Structure:**

```json
{
  "multiDailyMetricTimeSeries": [
    {
      "dailyMetricTimeSeries": [
        {
          "dailyMetric": "WEBSITE_CLICKS",
          "timeSeries": {
            "datedValues": [
              {
                "date": { "year": 2026, "month": 1, "day": 1 },
                "value": "42"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Get Single Daily Metric Time Series

```
GET /v1/locations/{locationId}:getDailyMetricsTimeSeries
    ?dailyMetric=WEBSITE_CLICKS
    &dailyRange.startDate.year=2026
    &dailyRange.startDate.month=1
    &dailyRange.startDate.day=1
    &dailyRange.endDate.year=2026
    &dailyRange.endDate.month=1
    &dailyRange.endDate.day=31
```

### Search Keywords Impressions (Monthly)

Returns the search terms customers used to discover your business.

```
GET /v1/locations/{locationId}/searchkeywords/impressions/monthly
    ?monthlyRange.startMonth.year=2025
    &monthlyRange.startMonth.month=10
    &monthlyRange.endMonth.year=2026
    &monthlyRange.endMonth.month=1
    &pageSize=100
```

**Response:**

```json
{
  "searchKeywordsCounts": [
    {
      "searchKeyword": "coffee shop near me",
      "insightsValue": {
        "value": "1250"
      }
    },
    {
      "searchKeyword": "best espresso downtown",
      "insightsValue": {
        "threshold": "ELEVEN_TO_TWENTY_FIVE"
      }
    }
  ],
  "nextPageToken": "..."
}
```

> **Note (2025 change):** Google redesigned reporting in Business Profile after June 25, 2025. Reports now only show top queries; low-volume keywords no longer appear.

---

## Notifications API (Review Alerts)

**Base URL:** `https://mybusinessnotifications.googleapis.com/v1/`

Uses Google Cloud Pub/Sub to deliver real-time notifications about business events.

### NotificationType Enum

| Value | Description |
|-------|-------------|
| `NEW_REVIEW` | New review added |
| `UPDATED_REVIEW` | Existing review modified |
| `NEW_CUSTOMER_MEDIA` | Customer uploaded photo/video |
| `GOOGLE_UPDATE` | Location has Google-suggested updates to review |
| `DUPLICATE_LOCATION` | Duplicate location status change |
| `VOICE_OF_MERCHANT_UPDATED` | Voice of Merchant status change |
| ~~`NEW_QUESTION`~~ | **Deprecated** (Q&A discontinued 11/3/2025) |
| ~~`UPDATED_QUESTION`~~ | **Deprecated** |
| ~~`NEW_ANSWER`~~ | **Deprecated** |
| ~~`UPDATED_ANSWER`~~ | **Deprecated** |
| ~~`LOSS_OF_VOICE_OF_MERCHANT`~~ | **Deprecated** (use VOICE_OF_MERCHANT_UPDATED) |

### Setup Steps

1. **Create a Pub/Sub topic** in your Google Cloud project
2. **Grant publish permission** to `mybusiness-api-pubsub@system.gserviceaccount.com` on the topic
3. **Create a subscription** (push or pull) on the topic
4. **Link your Business Profile account** to the topic via the API

### Get Current Notification Settings

```
GET /v1/accounts/{accountId}/notificationSetting
```

### Configure Notifications

```
PATCH /v1/accounts/{accountId}/notificationSetting?updateMask=pubsubTopic,notificationTypes

{
  "name": "accounts/{accountId}/notificationSetting",
  "pubsubTopic": "projects/{projectId}/topics/{topicName}",
  "notificationTypes": [
    "NEW_REVIEW",
    "UPDATED_REVIEW",
    "GOOGLE_UPDATE",
    "NEW_CUSTOMER_MEDIA",
    "VOICE_OF_MERCHANT_UPDATED"
  ]
}
```

### Disable Notifications

```
PATCH /v1/accounts/{accountId}/notificationSetting?updateMask=pubsubTopic

{
  "pubsubTopic": ""
}
```

---

## Account Management API

**Base URL:** `https://mybusinessaccountmanagement.googleapis.com/v1/`

### List Accounts

```
GET /v1/accounts
```

### Get Account Details

```
GET /v1/accounts/{accountId}
```

### Manage Account Admins

```
# List admins
GET /v1/accounts/{accountId}/admins

# Add admin
POST /v1/accounts/{accountId}/admins
{
  "admin": "email@example.com",
  "role": "MANAGER"
}

# Remove admin
DELETE /v1/accounts/{accountId}/admins/{adminId}
```

---

## Rate Limits and Quotas

### Default Limits (All APIs)

| Limit Type | Value |
|-----------|-------|
| Default requests per minute | **300 QPM** (per project) |
| User rate limit | **2,400 QPM** (per user per project) |
| Location edits per minute | **10 per GBP listing** (cannot be increased) |
| Create location per day | **100** |
| Update location per day | **10,000** |

The 300 QPM default applies to each of these APIs individually:

- My Business Business Information API
- My Business Account Management API
- Business Profile Performance API
- My Business Verifications API
- My Business Lodging API
- My Business Place Actions API
- My Business Notifications API

### Requesting Quota Increases

Submit requests via the [GBP API contact form](https://developers.google.com/my-business/content/limits), selecting "Quota Increase Request." Requests are typically denied if average usage is below 50% of current limits.

### Best Practices

- Implement **exponential backoff** for retries
- **Distribute load** evenly over time (avoid burst patterns)
- **Cache** frequently accessed data (categories, attributes)
- Use `batchGet` and `fetchMultiDailyMetricsTimeSeries` to reduce request count
- Use `readMask` to request only needed fields

---

## Deprecations and Migration Guide

### Discontinued (No Longer Available)

| API/Feature | Discontinued Date | Notes |
|-------------|------------------|-------|
| Q&A API (v1) | November 3, 2025 | Replaced by Google's AI-powered "Ask Maps" (Gemini). No direct API replacement. |
| Business Calls API (v1) | May 30, 2023 | Use GBP UI for call history |
| `locations.associate` / `clearLocationAssociation` | May 30, 2023 | Removed from Business Information API |
| `accounts.locations.reportInsights` (v4) | March 30, 2023 | Use Performance API `fetchMultiDailyMetricsTimeSeries` |
| Health Provider Attributes / Insurance Networks | July 1, 2024 | Removed |

### Migration: v4 reportInsights to Performance API

**Before (deprecated):**
```
POST /v4/accounts/{accountId}/locations:reportInsights
```

**After (current):**
```
GET https://businessprofileperformance.googleapis.com/v1/locations/{locationId}:fetchMultiDailyMetricsTimeSeries
```

### Migration: v4 Account Management to v1.1

**Before (deprecated in v4.9):**
```
GET /v4/accounts
GET /v4/accounts/{accountId}/admins
```

**After (current):**
```
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts/{accountId}/admins
```

### What Still Lives on v4.9

As of February 2026, the following functionality has **not** been migrated to standalone v1 APIs and remains on the v4.9 endpoint:

- **Reviews** (`accounts.locations.reviews`)
- **Posts** (`accounts.locations.localPosts`)
- **Media** (`accounts.locations.media`)
- **Food Menus** (`accounts.locations.foodMenus`)
- **Service Lists** (`accounts.locations.serviceList`)

---

## Python Code Examples

### Installation

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### OAuth 2.0 Setup and Token Management

```python
import json
import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/business.manage']
TOKEN_FILE = 'token.json'
CLIENT_SECRETS_FILE = 'client_secret.json'


def get_credentials():
    """Get valid OAuth2 credentials, refreshing or re-authenticating as needed."""
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRETS_FILE, SCOPES
            )
            creds = flow.run_local_server(port=8080)

        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    return creds
```

### List Accounts and Locations

```python
from googleapiclient.discovery import build

creds = get_credentials()

# Account Management API
account_mgmt = build('mybusinessaccountmanagement', 'v1', credentials=creds)

# List all accounts
accounts = account_mgmt.accounts().list().execute()
for account in accounts.get('accounts', []):
    print(f"Account: {account['name']} - {account.get('accountName', 'N/A')}")

# Business Information API -- List locations
biz_info = build('mybusinessbusinessinformation', 'v1', credentials=creds)

account_name = accounts['accounts'][0]['name']
locations = biz_info.accounts().locations().list(
    parent=account_name,
    readMask='name,title,storefrontAddress'
).execute()

for loc in locations.get('locations', []):
    print(f"Location: {loc['title']} ({loc['name']})")
```

### Get and Update Location Details

```python
biz_info = build('mybusinessbusinessinformation', 'v1', credentials=creds)

# Get a location with specific fields
location = biz_info.locations().get(
    name='locations/LOCATION_ID',
    readMask='name,title,phoneNumbers,websiteUri,regularHours'
).execute()

print(f"Title: {location['title']}")
print(f"Phone: {location.get('phoneNumbers', {}).get('primaryPhone')}")

# Update location
updated = biz_info.locations().patch(
    name='locations/LOCATION_ID',
    updateMask='title,phoneNumbers',
    body={
        'title': 'Updated Business Name',
        'phoneNumbers': {
            'primaryPhone': '+1-555-987-6543'
        }
    }
).execute()

print(f"Updated: {updated['title']}")
```

### List and Reply to Reviews

```python
# Reviews use the v4 API (discovery-based)
# Note: v4 requires using the discovery document URL directly
import requests

ACCESS_TOKEN = creds.token
BASE_URL = 'https://mybusiness.googleapis.com/v4'
HEADERS = {'Authorization': f'Bearer {ACCESS_TOKEN}'}

ACCOUNT_ID = 'YOUR_ACCOUNT_ID'
LOCATION_ID = 'YOUR_LOCATION_ID'

# List reviews
response = requests.get(
    f'{BASE_URL}/accounts/{ACCOUNT_ID}/locations/{LOCATION_ID}/reviews',
    headers=HEADERS,
    params={'pageSize': 50, 'orderBy': 'updateTime desc'}
)
reviews_data = response.json()

for review in reviews_data.get('reviews', []):
    print(f"Rating: {review['starRating']}")
    print(f"Comment: {review.get('comment', 'No comment')}")
    print(f"Reviewer: {review['reviewer'].get('displayName', 'Anonymous')}")
    print(f"Date: {review['createTime']}")
    print(f"Reply: {review.get('reviewReply', {}).get('comment', 'No reply yet')}")
    print('---')

# Reply to a review
review_name = reviews_data['reviews'][0]['name']
reply_response = requests.put(
    f'{BASE_URL}/{review_name}/reply',
    headers=HEADERS,
    json={'comment': 'Thank you for your feedback! We appreciate your support.'}
)
print(f"Reply status: {reply_response.status_code}")


# Batch get reviews across multiple locations
batch_response = requests.post(
    f'{BASE_URL}/accounts/{ACCOUNT_ID}/locations:batchGetReviews',
    headers=HEADERS,
    json={
        'locationNames': [
            f'accounts/{ACCOUNT_ID}/locations/{LOCATION_ID}',
            # Add more location names as needed
        ],
        'pageSize': 50,
        'orderBy': 'updateTime desc',
        'ignoreRatingOnlyReviews': False
    }
)
batch_reviews = batch_response.json()
```

### Create Posts

```python
# Create a standard post with call-to-action
post_response = requests.post(
    f'{BASE_URL}/accounts/{ACCOUNT_ID}/locations/{LOCATION_ID}/localPosts',
    headers=HEADERS,
    json={
        'languageCode': 'en-US',
        'summary': 'Exciting news! We have just launched our new spring collection.',
        'media': [
            {
                'mediaFormat': 'PHOTO',
                'sourceUrl': 'https://example.com/spring-collection.jpg'
            }
        ],
        'topicType': 'STANDARD',
        'callToAction': {
            'actionType': 'LEARN_MORE',
            'url': 'https://example.com/spring'
        }
    }
)
print(f"Post created: {post_response.json().get('name')}")


# Create an offer post
offer_response = requests.post(
    f'{BASE_URL}/accounts/{ACCOUNT_ID}/locations/{LOCATION_ID}/localPosts',
    headers=HEADERS,
    json={
        'languageCode': 'en-US',
        'summary': '20% off all services this month!',
        'offer': {
            'couponCode': 'SAVE20',
            'redeemOnlineUrl': 'https://example.com/redeem',
            'termsConditions': 'Valid through March 31, 2026.'
        },
        'media': [
            {
                'mediaFormat': 'PHOTO',
                'sourceUrl': 'https://example.com/offer-banner.jpg'
            }
        ],
        'topicType': 'OFFER'
    }
)


# Create an event post
event_response = requests.post(
    f'{BASE_URL}/accounts/{ACCOUNT_ID}/locations/{LOCATION_ID}/localPosts',
    headers=HEADERS,
    json={
        'languageCode': 'en-US',
        'summary': 'Join us for our grand opening celebration!',
        'event': {
            'title': 'Grand Opening',
            'schedule': {
                'startDate': {'year': 2026, 'month': 3, 'day': 15},
                'startTime': {'hours': 10, 'minutes': 0},
                'endDate': {'year': 2026, 'month': 3, 'day': 15},
                'endTime': {'hours': 18, 'minutes': 0}
            }
        },
        'media': [
            {
                'mediaFormat': 'PHOTO',
                'sourceUrl': 'https://example.com/event.jpg'
            }
        ],
        'topicType': 'EVENT'
    }
)
```

### Performance Metrics

```python
perf_api = build('businessprofileperformance', 'v1', credentials=creds)

# Fetch multiple daily metrics in a single request
metrics = perf_api.locations().fetchMultiDailyMetricsTimeSeries(
    location='locations/LOCATION_ID',
    dailyMetrics=['WEBSITE_CLICKS', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'],
    dailyRange_startDate_year=2026,
    dailyRange_startDate_month=1,
    dailyRange_startDate_day=1,
    dailyRange_endDate_year=2026,
    dailyRange_endDate_month=1,
    dailyRange_endDate_day=31
).execute()

for series_group in metrics.get('multiDailyMetricTimeSeries', []):
    for series in series_group.get('dailyMetricTimeSeries', []):
        metric_name = series['dailyMetric']
        values = series.get('timeSeries', {}).get('datedValues', [])
        total = sum(int(v.get('value', 0)) for v in values)
        print(f"{metric_name}: {total} total for period")


# Search keyword impressions
keywords = perf_api.locations().searchkeywords().impressions().monthly().list(
    parent='locations/LOCATION_ID',
    monthlyRange_startMonth_year=2025,
    monthlyRange_startMonth_month=10,
    monthlyRange_endMonth_year=2026,
    monthlyRange_endMonth_month=1,
    pageSize=100
).execute()

for kw in keywords.get('searchKeywordsCounts', []):
    keyword = kw.get('searchKeyword', 'N/A')
    value = kw.get('insightsValue', {})
    count = value.get('value', value.get('threshold', 'below threshold'))
    print(f"'{keyword}': {count} impressions")
```

### Set Up Pub/Sub Notifications

```python
notifications_api = build('mybusinessnotifications', 'v1', credentials=creds)

# Configure notification settings
result = notifications_api.accounts().updateNotificationSetting(
    name=f'accounts/{ACCOUNT_ID}/notificationSetting',
    updateMask='pubsubTopic,notificationTypes',
    body={
        'name': f'accounts/{ACCOUNT_ID}/notificationSetting',
        'pubsubTopic': f'projects/{PROJECT_ID}/topics/{TOPIC_NAME}',
        'notificationTypes': [
            'NEW_REVIEW',
            'UPDATED_REVIEW',
            'GOOGLE_UPDATE',
            'NEW_CUSTOMER_MEDIA',
            'VOICE_OF_MERCHANT_UPDATED'
        ]
    }
).execute()

print(f"Notifications configured: {result}")


# Read current notification settings
current = notifications_api.accounts().getNotificationSetting(
    name=f'accounts/{ACCOUNT_ID}/notificationSetting'
).execute()
print(f"Current topic: {current.get('pubsubTopic')}")
print(f"Types: {current.get('notificationTypes')}")
```

### Handle Pub/Sub Messages (Cloud Function)

```python
import base64
import json

def handle_gbp_notification(event, context):
    """Cloud Function triggered by Pub/Sub message from GBP."""
    message = base64.b64decode(event['data']).decode('utf-8')
    data = json.loads(message)

    notification_type = data.get('notificationType')
    location = data.get('location')
    review = data.get('review')

    if notification_type == 'NEW_REVIEW':
        print(f"New review at {location}: {review}")
        # Trigger your review response workflow here

    elif notification_type == 'UPDATED_REVIEW':
        print(f"Updated review at {location}: {review}")

    elif notification_type == 'GOOGLE_UPDATE':
        print(f"Google update pending for {location}")
        # Trigger review of suggested changes

    return 'OK'
```

---

## Node.js Code Examples

### Installation

```bash
npm install googleapis @googleapis/mybusinessaccountmanagement @googleapis/mybusinessbusinessinformation @googleapis/businessprofileperformance
```

### OAuth 2.0 Setup

```javascript
const { google } = require('googleapis');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

function getOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Load saved tokens if available
  if (fs.existsSync('token.json')) {
    const tokens = JSON.parse(fs.readFileSync('token.json'));
    oauth2Client.setCredentials(tokens);
  }

  return oauth2Client;
}

// Generate auth URL for first-time consent
function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

// Exchange authorization code for tokens
async function exchangeCode(oauth2Client, code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync('token.json', JSON.stringify(tokens));
  return tokens;
}
```

### List Accounts and Locations

```javascript
const { google } = require('googleapis');

async function listAccountsAndLocations() {
  const auth = getOAuth2Client();

  // Account Management API
  const accountMgmt = google.mybusinessaccountmanagement({ version: 'v1', auth });
  const accountsRes = await accountMgmt.accounts.list();
  const accounts = accountsRes.data.accounts || [];

  for (const account of accounts) {
    console.log(`Account: ${account.name} - ${account.accountName}`);
  }

  // Business Information API
  const bizInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
  const locationsRes = await bizInfo.accounts.locations.list({
    parent: accounts[0].name,
    readMask: 'name,title,storefrontAddress,phoneNumbers',
  });

  for (const loc of locationsRes.data.locations || []) {
    console.log(`Location: ${loc.title} (${loc.name})`);
  }
}
```

### Get and Update Location

```javascript
async function updateLocation(auth, locationName) {
  const bizInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });

  // Get location
  const location = await bizInfo.locations.get({
    name: locationName,
    readMask: 'name,title,phoneNumbers,websiteUri',
  });
  console.log(`Current title: ${location.data.title}`);

  // Update location
  const updated = await bizInfo.locations.patch({
    name: locationName,
    updateMask: 'title,phoneNumbers',
    requestBody: {
      title: 'Updated Business Name',
      phoneNumbers: {
        primaryPhone: '+1-555-987-6543',
      },
    },
  });
  console.log(`Updated: ${updated.data.title}`);
}
```

### Manage Reviews

```javascript
const axios = require('axios');

const BASE_URL = 'https://mybusiness.googleapis.com/v4';

async function listReviews(accessToken, accountId, locationId) {
  const response = await axios.get(
    `${BASE_URL}/accounts/${accountId}/locations/${locationId}/reviews`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { pageSize: 50, orderBy: 'updateTime desc' },
    }
  );

  const reviews = response.data.reviews || [];
  for (const review of reviews) {
    console.log(`Rating: ${review.starRating}`);
    console.log(`Comment: ${review.comment || 'No comment'}`);
    console.log(`By: ${review.reviewer.displayName || 'Anonymous'}`);
    console.log(`Reply: ${review.reviewReply?.comment || 'No reply'}`);
    console.log('---');
  }

  return reviews;
}

async function replyToReview(accessToken, reviewName, replyText) {
  const response = await axios.put(
    `${BASE_URL}/${reviewName}/reply`,
    { comment: replyText },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log(`Reply posted: ${response.status}`);
  return response.data;
}

async function batchGetReviews(accessToken, accountId, locationNames) {
  const response = await axios.post(
    `${BASE_URL}/accounts/${accountId}/locations:batchGetReviews`,
    {
      locationNames,
      pageSize: 50,
      orderBy: 'updateTime desc',
      ignoreRatingOnlyReviews: false,
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}
```

### Create Posts

```javascript
async function createPost(accessToken, accountId, locationId, postData) {
  const response = await axios.post(
    `${BASE_URL}/accounts/${accountId}/locations/${locationId}/localPosts`,
    postData,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

// Standard post with CTA
await createPost(accessToken, accountId, locationId, {
  languageCode: 'en-US',
  summary: 'Check out our new spring menu!',
  media: [{ mediaFormat: 'PHOTO', sourceUrl: 'https://example.com/photo.jpg' }],
  topicType: 'STANDARD',
  callToAction: { actionType: 'LEARN_MORE', url: 'https://example.com/spring' },
});

// Offer post
await createPost(accessToken, accountId, locationId, {
  languageCode: 'en-US',
  summary: '20% off all services!',
  offer: {
    couponCode: 'SAVE20',
    redeemOnlineUrl: 'https://example.com/redeem',
    termsConditions: 'Valid through March 31, 2026.',
  },
  media: [{ mediaFormat: 'PHOTO', sourceUrl: 'https://example.com/offer.jpg' }],
  topicType: 'OFFER',
});

// Event post
await createPost(accessToken, accountId, locationId, {
  languageCode: 'en-US',
  summary: 'Join our grand opening!',
  event: {
    title: 'Grand Opening',
    schedule: {
      startDate: { year: 2026, month: 3, day: 15 },
      startTime: { hours: 10, minutes: 0 },
      endDate: { year: 2026, month: 3, day: 15 },
      endTime: { hours: 18, minutes: 0 },
    },
  },
  media: [{ mediaFormat: 'PHOTO', sourceUrl: 'https://example.com/event.jpg' }],
  topicType: 'EVENT',
});
```

### Performance Metrics

```javascript
async function getPerformanceMetrics(auth, locationId) {
  const perfApi = google.businessprofileperformance({ version: 'v1', auth });

  // Fetch multiple metrics
  const metrics = await perfApi.locations.fetchMultiDailyMetricsTimeSeries({
    location: `locations/${locationId}`,
    dailyMetrics: ['WEBSITE_CLICKS', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'],
    'dailyRange.startDate.year': 2026,
    'dailyRange.startDate.month': 1,
    'dailyRange.startDate.day': 1,
    'dailyRange.endDate.year': 2026,
    'dailyRange.endDate.month': 1,
    'dailyRange.endDate.day': 31,
  });

  for (const group of metrics.data.multiDailyMetricTimeSeries || []) {
    for (const series of group.dailyMetricTimeSeries || []) {
      const total = (series.timeSeries?.datedValues || [])
        .reduce((sum, v) => sum + parseInt(v.value || '0', 10), 0);
      console.log(`${series.dailyMetric}: ${total}`);
    }
  }

  // Search keywords
  const keywords = await perfApi.locations.searchkeywords.impressions.monthly.list({
    parent: `locations/${locationId}`,
    'monthlyRange.startMonth.year': 2025,
    'monthlyRange.startMonth.month': 10,
    'monthlyRange.endMonth.year': 2026,
    'monthlyRange.endMonth.month': 1,
    pageSize: 100,
  });

  for (const kw of keywords.data.searchKeywordsCounts || []) {
    const count = kw.insightsValue?.value || kw.insightsValue?.threshold || 'N/A';
    console.log(`"${kw.searchKeyword}": ${count}`);
  }
}
```

### Configure Notifications

```javascript
async function setupNotifications(auth, accountId, projectId, topicName) {
  const notificationsApi = google.mybusinessnotifications({ version: 'v1', auth });

  const result = await notificationsApi.accounts.updateNotificationSetting({
    name: `accounts/${accountId}/notificationSetting`,
    updateMask: 'pubsubTopic,notificationTypes',
    requestBody: {
      name: `accounts/${accountId}/notificationSetting`,
      pubsubTopic: `projects/${projectId}/topics/${topicName}`,
      notificationTypes: [
        'NEW_REVIEW',
        'UPDATED_REVIEW',
        'GOOGLE_UPDATE',
        'NEW_CUSTOMER_MEDIA',
        'VOICE_OF_MERCHANT_UPDATED',
      ],
    },
  });

  console.log('Notifications configured:', result.data);
}
```

### Handle Pub/Sub Notifications (Express Endpoint)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/gbp-notifications', (req, res) => {
  const message = req.body.message;
  if (!message || !message.data) {
    return res.status(400).send('Invalid message');
  }

  const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
  const { notificationType, location, review } = data;

  switch (notificationType) {
    case 'NEW_REVIEW':
      console.log(`New review at ${location}:`, review);
      // Trigger review response workflow
      break;
    case 'UPDATED_REVIEW':
      console.log(`Updated review at ${location}:`, review);
      break;
    case 'GOOGLE_UPDATE':
      console.log(`Google update for ${location}`);
      break;
    default:
      console.log(`Notification: ${notificationType} for ${location}`);
  }

  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request body and parameters |
| 401 | Unauthorized | Refresh access token |
| 403 | Forbidden | Check API enablement and permissions |
| 404 | Not Found | Verify resource name/ID |
| 429 | Too Many Requests | Implement exponential backoff |
| 500 | Internal Server Error | Retry with backoff |

### Exponential Backoff Pattern (Python)

```python
import time
import requests

def api_request_with_backoff(url, headers, max_retries=5):
    """Make an API request with exponential backoff on rate limit errors."""
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            wait_time = (2 ** attempt) + (random.random() * 0.5)
            print(f"Rate limited. Retrying in {wait_time:.1f}s...")
            time.sleep(wait_time)
        elif response.status_code == 401:
            # Refresh token and retry
            raise AuthenticationError("Token expired, refresh needed")
        else:
            response.raise_for_status()

    raise Exception(f"Max retries ({max_retries}) exceeded")
```

### Exponential Backoff Pattern (Node.js)

```javascript
async function apiRequestWithBackoff(url, headers, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = Math.pow(2, attempt) + Math.random() * 0.5;
        console.log(`Rate limited. Retrying in ${waitTime.toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      } else if (error.response?.status === 401) {
        throw new Error('Token expired, refresh needed');
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Max retries (${maxRetries}) exceeded`);
}
```

### Using validateOnly for Safe Testing

Some API calls support a `validateOnly` parameter to validate requests without modifying data:

```python
# Test a location update without applying it
response = biz_info.locations().patch(
    name='locations/LOCATION_ID',
    updateMask='title',
    validateOnly=True,
    body={'title': 'New Name'}
).execute()
```

> **Important:** There is no sandbox environment. Use `validateOnly` where supported for safe testing.

---

## Sources

- [Google Business Profile APIs Overview](https://developers.google.com/my-business/content/overview)
- [API Reference Overview (All APIs)](https://developers.google.com/my-business/ref_overview)
- [Google My Business API v4.9 REST Reference](https://developers.google.com/my-business/reference/rest)
- [Business Information API](https://developers.google.com/my-business/content/location-data)
- [Work with Review Data](https://developers.google.com/my-business/content/review-data)
- [Reviews REST Resource](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews)
- [Create Posts on Google](https://developers.google.com/my-business/content/posts-data)
- [Business Profile Performance API](https://developers.google.com/my-business/reference/performance/rest)
- [fetchMultiDailyMetricsTimeSeries](https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries)
- [DailyMetric Enum](https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric)
- [Search Keywords Impressions](https://developers.google.com/my-business/reference/performance/rest/v1/locations.searchkeywords.impressions.monthly/list)
- [Manage Real-Time Notifications](https://developers.google.com/my-business/content/notification-setup)
- [NotificationSetting Resource](https://developers.google.com/my-business/reference/notifications/rest/v1/NotificationSetting)
- [Basic Setup Guide](https://developers.google.com/my-business/content/basic-setup)
- [Implement OAuth](https://developers.google.com/my-business/content/implement-oauth)
- [OAuth Setup](https://developers.google.com/my-business/content/oauth-setup)
- [Rate Limits and Quotas](https://developers.google.com/my-business/content/limits)
- [Deprecation Schedule](https://developers.google.com/my-business/content/sunset-dates)
- [Change Log](https://developers.google.com/my-business/content/change-log)
- [Client Libraries and Samples](https://developers.google.com/my-business/samples)
- [google-my-business-samples (GitHub)](https://github.com/google/google-my-business-samples)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [google-api-python-client](https://github.com/googleapis/google-api-python-client)
- [@googleapis/mybusinessbusinessinformation (npm)](https://www.npmjs.com/package/@googleapis/mybusinessbusinessinformation)
- [@googleapis/mybusinessaccountmanagement (npm)](https://www.npmjs.com/package/@googleapis/mybusinessaccountmanagement)
- [@googleapis/businessprofileperformance (npm)](https://www.npmjs.com/package/@googleapis/businessprofileperformance)
- [Q&A API Discontinuation Notice](https://ppc.land/google-discontinues-business-profile-q-a-api-effective-november-3/)
- [Google Q&A API Deprecation Action Plan (Birdeye)](https://birdeye.com/blog/google-business-profile-qa-api-discontinued/)
