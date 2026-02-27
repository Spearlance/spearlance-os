# Google Places API (New) -- Developer Reference

> **Last Updated:** February 2026
> **API Version:** Places API (New) v1
> **Base URL:** `https://places.googleapis.com`

---

## Table of Contents

1. [Overview & Migration Status](#1-overview--migration-status)
2. [Authentication & Setup](#2-authentication--setup)
3. [Core Concepts](#3-core-concepts)
4. [API Operations](#4-api-operations)
   - [Text Search](#41-text-search-new)
   - [Nearby Search](#42-nearby-search-new)
   - [Place Details](#43-place-details-new)
   - [Autocomplete](#44-autocomplete-new)
   - [Place Photos](#45-place-photos-new)
5. [Advanced Features](#5-advanced-features)
6. [Maps JavaScript API Integration](#6-maps-javascript-api-integration)
7. [Pricing & Billing](#7-pricing--billing)
8. [Rate Limits & Quotas](#8-rate-limits--quotas)
9. [Error Handling](#9-error-handling)
10. [Place Types Reference](#10-place-types-reference)
11. [Release History](#11-release-history)
12. [Client Libraries](#12-client-libraries)

---

## 1. Overview & Migration Status

### Places API (New) vs Legacy

**Places API (New)** is the current, actively-developed version. The legacy Places API can no longer be enabled for new projects as of March 1, 2025.

| Aspect | Legacy | New |
|--------|--------|-----|
| Status | Deprecated, maintenance only | Active, receiving new features |
| New project enrollment | Closed | Open |
| Response format | JSON and XML | JSON only |
| Field selection | Optional `fields` parameter | **Required** field masks |
| Endpoint pattern | `maps.googleapis.com/maps/api/place/...` | `places.googleapis.com/v1/places...` |
| HTTP methods | GET (most endpoints) | POST (search/autocomplete), GET (details/photos) |
| Authentication | API key in query string | API key via header or query string |
| Volume discounts | Up to 100K tier | Up to 5M+ tier |
| AI features | None | Generative summaries, routing summaries |
| Place types | ~100 types | 300+ types (180 added Feb 2026) |

### Migration Timeline

- **October 2023:** Places API (New) reached General Availability
- **March 1, 2025:** Legacy Places API designated as legacy; $200 monthly credit replaced with per-SKU free tiers
- **March 1, 2025:** Newly created API keys default to Places API (New)
- **Ongoing:** Legacy endpoints remain functional but receive no new features or expanded discounts

### Key Differences from Legacy

1. **Field masks are mandatory** -- you must specify which fields you want returned
2. **POST requests** for search and autocomplete (legacy used GET)
3. **New endpoint structure** using `places.googleapis.com` instead of `maps.googleapis.com`
4. **Headers for authentication** -- API key passed via `X-Goog-Api-Key` header (query string also supported)
5. **Resource-name-based** identifiers (e.g., `places/PLACE_ID`) instead of bare Place IDs
6. **camelCase** field names instead of snake_case
7. **No XML support** -- JSON only

---

## 2. Authentication & Setup

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing on the project

### Step 2: Enable the Places API (New)

1. Navigate to **APIs & Services > Library**
2. Search for "Places API (New)"
3. Click **Enable**

### Step 3: Create an API Key

1. Go to **APIs & Services > Credentials**
2. Click **Create credentials > API key**
3. Copy and secure the key

### Step 4: Restrict Your API Key

1. On the Credentials page, click the API key name
2. Under **Application restrictions**, set IP addresses, HTTP referrers, or app restrictions
3. Under **API restrictions**, select "Restrict key" and choose "Places API (New)"
4. Click **Save**

### Authentication Methods

#### API Key (recommended for most use cases)

Pass via HTTP header (preferred):
```
X-Goog-Api-Key: YOUR_API_KEY
```

Or via query parameter:
```
?key=YOUR_API_KEY
```

#### OAuth 2.0 Token

For server-to-server authentication using service accounts:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Application Default Credentials (ADC)

Used by official client libraries. Set up via:
```bash
gcloud auth application-default login
```

Or set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

---

## 3. Core Concepts

### 3.1 Field Masks

Field masks are **required** for Place Details, Nearby Search, and Text Search. They control which fields are returned and directly affect billing.

**How to specify:**
- HTTP header: `X-Goog-FieldMask: field1,field2,field3`
- URL parameter: `?fields=field1,field2,field3` or `?$fields=field1,field2,field3`

**Syntax rules:**
- No spaces in comma-separated paths
- Use dot notation for nested fields: `places.displayName.text`
- For search endpoints, prefix with `places.`: `places.displayName,places.formattedAddress`
- For Place Details, no prefix: `displayName,formattedAddress`
- Wildcard `*` returns all fields (development only -- avoid in production)

**Field categories by billing SKU:**

| SKU Tier | Example Fields |
|----------|---------------|
| **Essentials (IDs Only)** | `id`, `name`, `photos`, `attributions` |
| **Essentials** | `addressComponents`, `formattedAddress`, `location`, `plusCode`, `types`, `viewport` |
| **Pro** | `displayName`, `businessStatus`, `googleMapsUri`, `primaryType`, `timeZone` |
| **Enterprise** | `rating`, `userRatingCount`, `websiteUri`, `nationalPhoneNumber`, `priceLevel`, `currentOpeningHours` |
| **Enterprise + Atmosphere** | `reviews`, `parkingOptions`, `reservable`, `dineIn`, `takeout`, `delivery`, `outdoorSeating` |

**Billing rule:** You are billed at the **highest** SKU tier among all fields requested.

### 3.2 Session Tokens

Session tokens group Autocomplete requests with a subsequent Place Details request into a single billing session.

**Requirements:**
- Must be URL-safe and filename-safe base64 strings
- Google recommends **UUID v4** format
- One token per session; tokens become invalid after use
- All requests in a session must use the same Google Cloud project's API key
- Cannot be shared between legacy and new API endpoints

**Lifecycle:**
1. Generate a UUID v4 token
2. Include it in all Autocomplete (New) requests for the session
3. Include the same token in the final Place Details (New) or Address Validation request
4. Token is now consumed; generate a new one for the next session

**If omitted:** Each Autocomplete request is billed individually under the Autocomplete Requests SKU.

### 3.3 Place IDs

- Textual identifiers that uniquely identify a place
- Format: alphanumeric string (e.g., `ChIJj61dQgK6j4AR4GeTYWZsKWw`)
- Resource name format in API (New): `places/ChIJj61dQgK6j4AR4GeTYWZsKWw`
- Place IDs can change over time; do not cache indefinitely
- Obsolete Place IDs return `INVALID_REQUEST` as of January 13, 2025

---

## 4. API Operations

### 4.1 Text Search (New)

Search for places using a text query string.

**Endpoint:** `POST https://places.googleapis.com/v1/places:searchText`

**Use cases:** "pizza in New York", "dentist near me", "123 Main Street", ambiguous address queries

#### REST Example

```bash
curl -X POST \
  'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel' \
  -d '{
    "textQuery": "Spicy Vegetarian Food in Sydney, Australia",
    "pageSize": 10,
    "languageCode": "en",
    "rankPreference": "RELEVANCE"
  }'
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `textQuery` | string | **Yes** | The search string |
| `pageSize` | integer | No | Results per page (1-20, default 20) |
| `pageToken` | string | No | Token for next page of results |
| `languageCode` | string | No | Language for results (e.g., "en") |
| `regionCode` | string | No | CLDR country code (e.g., "US") |
| `includedType` | string | No | Restrict to a single place type |
| `locationBias` | object | No | Bias results toward an area (circle or rectangle) |
| `locationRestriction` | object | No | Restrict results strictly to an area (rectangle only) |
| `minRating` | float | No | Minimum rating filter (0.0-5.0 in 0.5 increments) |
| `priceLevels` | array | No | Filter by price level |
| `openNow` | boolean | No | Only return currently open places |
| `rankPreference` | string | No | `RELEVANCE` (default) or `DISTANCE` |
| `strictTypeFiltering` | boolean | No | Force strict type matching |

#### Location Bias (Circle)

```json
{
  "locationBias": {
    "circle": {
      "center": { "latitude": 37.7749, "longitude": -122.4194 },
      "radius": 5000.0
    }
  }
}
```

#### Location Restriction (Rectangle)

```json
{
  "locationRestriction": {
    "rectangle": {
      "low": { "latitude": 37.7, "longitude": -122.5 },
      "high": { "latitude": 37.9, "longitude": -122.3 }
    }
  }
}
```

#### Response

```json
{
  "places": [
    {
      "displayName": { "text": "Green Gourmet", "languageCode": "en" },
      "formattedAddress": "115 King St, Newtown NSW 2042, Australia",
      "location": { "latitude": -33.8976, "longitude": 151.1784 },
      "rating": 4.2,
      "priceLevel": "PRICE_LEVEL_MODERATE"
    }
  ],
  "nextPageToken": "..."
}
```

**Maximum results:** 60 across all pages (3 pages of 20).

#### Python Example

```python
from google.maps import places_v1
from google.type import latlng_pb2

async def text_search():
    client = places_v1.PlacesAsyncClient()

    center = latlng_pb2.LatLng(latitude=37.7749, longitude=-122.4194)
    circle = places_v1.types.Circle(center=center, radius=5000.0)
    location_bias = places_v1.SearchTextRequest.LocationBias(circle=circle)

    request = places_v1.SearchTextRequest(
        text_query="restaurants with outdoor seating",
        location_bias=location_bias,
        min_rating=4.0,
        open_now=True,
        price_levels=[
            places_v1.types.PriceLevel.PRICE_LEVEL_MODERATE,
            places_v1.types.PriceLevel.PRICE_LEVEL_EXPENSIVE,
        ],
    )

    field_mask = "places.formattedAddress,places.displayName,places.rating"
    response = await client.search_text(
        request=request,
        metadata=[("x-goog-fieldmask", field_mask)],
    )
    return response
```

#### Node.js Example

```javascript
const { PlacesClient } = require("@googlemaps/places").v1;
const { google } = require("@googlemaps/places/build/protos/protos");
const PriceLevel = google.maps.places.v1.PriceLevel;

async function searchPlacesByText() {
  const placesClient = new PlacesClient();

  const request = {
    textQuery: "restaurants with outdoor seating",
    locationBias: {
      circle: {
        center: { latitude: 37.7749, longitude: -122.4194 },
        radius: 5000.0,
      },
    },
    minRating: 4.0,
    openNow: true,
    priceLevels: [
      PriceLevel.PRICE_LEVEL_MODERATE,
      PriceLevel.PRICE_LEVEL_EXPENSIVE,
    ],
  };

  const callOptions = {
    otherArgs: {
      headers: {
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating",
      },
    },
  };

  const [response] = await placesClient.searchText(request, callOptions);
  console.log(response);
}

searchPlacesByText();
```

---

### 4.2 Nearby Search (New)

Search for places within a defined geographic area by type.

**Endpoint:** `POST https://places.googleapis.com/v1/places:searchNearby`

**Key difference from Text Search:** Nearby Search requires a geographic area and uses place types instead of a free-text query.

#### REST Example

```bash
curl -X POST \
  'https://places.googleapis.com/v1/places:searchNearby' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: places.displayName,places.formattedAddress,places.location,places.rating' \
  -d '{
    "includedTypes": ["restaurant"],
    "maxResultCount": 10,
    "locationRestriction": {
      "circle": {
        "center": { "latitude": 37.7937, "longitude": -122.3965 },
        "radius": 500.0
      }
    },
    "rankPreference": "DISTANCE"
  }'
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locationRestriction` | object | **Yes** | Circle with center + radius (0-50,000m) |
| `includedTypes` | array | No | Place types to include (Table A, up to 50) |
| `excludedTypes` | array | No | Place types to exclude (Table A) |
| `includedPrimaryTypes` | array | No | Primary types to include (Table A) |
| `excludedPrimaryTypes` | array | No | Primary types to exclude (Table A) |
| `maxResultCount` | integer | No | Number of results (1-20, default 20) |
| `rankPreference` | string | No | `POPULARITY` (default) or `DISTANCE` |
| `languageCode` | string | No | Language for results |
| `regionCode` | string | No | CLDR country code |

#### Python Example

```python
from google.maps import places_v1
from google.type import latlng_pb2

async def nearby_search():
    client = places_v1.PlacesAsyncClient()

    center = latlng_pb2.LatLng(latitude=37.7937, longitude=-122.3965)
    circle = places_v1.types.Circle(center=center, radius=1000.0)
    location_restriction = places_v1.SearchNearbyRequest.LocationRestriction(
        circle=circle
    )

    request = places_v1.SearchNearbyRequest(
        location_restriction=location_restriction,
        included_types=["restaurant"],
        max_result_count=10,
    )

    field_mask = "places.displayName,places.formattedAddress,places.rating"
    response = await client.search_nearby(
        request=request,
        metadata=[("x-goog-fieldmask", field_mask)],
    )
    return response
```

#### Node.js Example

```javascript
const { PlacesClient } = require("@googlemaps/places").v1;

async function searchNearbyPlaces() {
  const placesClient = new PlacesClient();

  const request = {
    locationRestriction: {
      circle: {
        center: { latitude: 37.7937, longitude: -122.3965 },
        radius: 1000.0,
      },
    },
    includedTypes: ["restaurant"],
    maxResultCount: 10,
  };

  const callOptions = {
    otherArgs: {
      headers: {
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating",
      },
    },
  };

  const [response] = await placesClient.searchNearby(request, callOptions);
  console.log(response);
}

searchNearbyPlaces();
```

---

### 4.3 Place Details (New)

Retrieve detailed information about a specific place by its Place ID.

**Endpoint:** `GET https://places.googleapis.com/v1/places/PLACE_ID`

#### REST Example

```bash
curl -X GET \
  'https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: id,displayName,formattedAddress,location,rating,websiteUri,currentOpeningHours,reviews'
```

Or using URL parameter for field mask:
```
https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw?fields=id,displayName&key=YOUR_API_KEY
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `placeId` (in URL) | string | **Yes** | The Place ID |
| Field mask | string | **Yes** | Via header or `fields` param |
| `languageCode` | string | No | Language for results |
| `regionCode` | string | No | CLDR country code |
| `sessionToken` | string | No | For linking with Autocomplete session |

#### Field Mask (no `places.` prefix for Details)

```
id,displayName,formattedAddress,location,rating,userRatingCount,
websiteUri,nationalPhoneNumber,currentOpeningHours,reviews,photos,
priceLevel,businessStatus,googleMapsUri
```

#### Response

```json
{
  "name": "places/ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "displayName": {
    "text": "Googleplex",
    "languageCode": "en"
  },
  "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
  "location": {
    "latitude": 37.4220656,
    "longitude": -122.0862784
  },
  "rating": 4.3,
  "userRatingCount": 5421,
  "websiteUri": "https://about.google/",
  "googleMapsUri": "https://maps.google.com/?cid=..."
}
```

#### Python Example

```python
from google.maps import places_v1

async def get_place_details():
    client = places_v1.PlacesAsyncClient()

    request = places_v1.GetPlaceRequest(
        name="places/ChIJj61dQgK6j4AR4GeTYWZsKWw",
    )

    field_mask = "id,displayName,formattedAddress,rating,websiteUri,reviews"
    response = await client.get_place(
        request=request,
        metadata=[("x-goog-fieldmask", field_mask)],
    )
    return response
```

#### Node.js Example

```javascript
const { PlacesClient } = require("@googlemaps/places").v1;

async function getPlaceDetails() {
  const placesClient = new PlacesClient();

  const request = {
    name: "places/ChIJj61dQgK6j4AR4GeTYWZsKWw",
  };

  const callOptions = {
    otherArgs: {
      headers: {
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,rating,websiteUri,reviews",
      },
    },
  };

  const [response] = await placesClient.getPlace(request, callOptions);
  console.log(response);
}

getPlaceDetails();
```

---

### 4.4 Autocomplete (New)

Return place and query predictions as users type.

**Endpoint:** `POST https://places.googleapis.com/v1/places:autocomplete`

#### REST Example

```bash
curl -X POST \
  'https://places.googleapis.com/v1/places:autocomplete' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -d '{
    "input": "pizza near Times Sq",
    "locationBias": {
      "circle": {
        "center": { "latitude": 40.758, "longitude": -73.9855 },
        "radius": 5000.0
      }
    },
    "includedPrimaryTypes": ["restaurant"],
    "languageCode": "en",
    "regionCode": "US",
    "sessionToken": "YOUR_UUID_V4_SESSION_TOKEN"
  }'
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | string | **Yes** | User's search text |
| `locationBias` | object | No | Bias results toward an area |
| `locationRestriction` | object | No | Restrict results to an area |
| `includedPrimaryTypes` | array | No | Filter by primary types (up to 5, Tables A & B) |
| `includedRegionCodes` | array | No | Limit to countries (up to 15 CLDR codes) |
| `languageCode` | string | No | Language for results |
| `regionCode` | string | No | CLDR country code |
| `sessionToken` | string | No | UUID v4 for session billing |
| `origin` | object | No | LatLng for distance calculation |
| `includeQueryPredictions` | boolean | No | Include query suggestions |

#### Response

```json
{
  "suggestions": [
    {
      "placePrediction": {
        "place": "places/ChIJsU7_oMBYwokRLR4GnV0rWl0",
        "placeId": "ChIJsU7_oMBYwokRLR4GnV0rWl0",
        "text": {
          "text": "Joe's Pizza, Broadway, New York, NY, USA",
          "matches": [
            { "startOffset": 0, "endOffset": 5 }
          ]
        },
        "structuredFormat": {
          "mainText": { "text": "Joe's Pizza" },
          "secondaryText": { "text": "Broadway, New York, NY, USA" }
        },
        "types": ["restaurant", "food", "point_of_interest", "establishment"],
        "distanceMeters": 450
      }
    },
    {
      "queryPrediction": {
        "text": { "text": "pizza restaurants near Times Square" }
      }
    }
  ]
}
```

#### Python Example

```python
import uuid
from google.maps import places_v1
from google.type import latlng_pb2

async def autocomplete():
    client = places_v1.PlacesAsyncClient()

    center = latlng_pb2.LatLng(latitude=40.758, longitude=-73.9855)
    circle = places_v1.types.Circle(center=center, radius=5000.0)
    location_bias = places_v1.types.AutocompletePlacesRequest.LocationBias(
        circle=circle
    )

    session_token = str(uuid.uuid4())

    request = places_v1.AutocompletePlacesRequest(
        input="pizza near Times Sq",
        location_bias=location_bias,
        language_code="en",
        region_code="US",
        session_token=session_token,
    )

    response = await client.autocomplete_places(request=request)
    return response
```

#### Node.js Example

```javascript
const { PlacesClient } = require("@googlemaps/places").v1;
const crypto = require("crypto");

async function autocomplete() {
  const placesClient = new PlacesClient();

  const sessionToken = crypto.randomUUID();

  const request = {
    input: "pizza near Times Sq",
    locationBias: {
      circle: {
        center: { latitude: 40.758, longitude: -73.9855 },
        radius: 5000.0,
      },
    },
    languageCode: "en",
    regionCode: "US",
    sessionToken: sessionToken,
  };

  const [response] = await placesClient.autocompletePlaces(request);
  console.log(JSON.stringify(response, null, 2));
}

autocomplete();
```

#### Full Session Flow (REST)

```bash
# Step 1: Generate a session token
SESSION_TOKEN=$(uuidgen)

# Step 2: Autocomplete requests (all use the same token)
curl -X POST \
  'https://places.googleapis.com/v1/places:autocomplete' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -d "{
    \"input\": \"star\",
    \"sessionToken\": \"$SESSION_TOKEN\"
  }"

# Step 3: User selects a place, fetch details with the same token
curl -X GET \
  'https://places.googleapis.com/v1/places/SELECTED_PLACE_ID?sessionToken='"$SESSION_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: id,displayName,formattedAddress,location'
```

---

### 4.5 Place Photos (New)

Retrieve photos for a place. This is a two-step process: first get photo references, then fetch the media.

**Endpoint:** `GET https://places.googleapis.com/v1/{name}/media`

Where `{name}` is `places/PLACE_ID/photos/PHOTO_RESOURCE`

#### Step 1: Get Photo References

Include `photos` (Place Details) or `places.photos` (search endpoints) in your field mask.

```bash
curl -X GET \
  'https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: photos'
```

Response includes up to 10 photo references:

```json
{
  "photos": [
    {
      "name": "places/ChIJj61dQgK6j4AR4GeTYWZsKWw/photos/AUy1YQ3Rbwqx...",
      "widthPx": 4032,
      "heightPx": 3024,
      "authorAttributions": [
        {
          "displayName": "John Doe",
          "uri": "https://maps.google.com/maps/contrib/...",
          "photoUri": "https://lh3.googleusercontent.com/..."
        }
      ]
    }
  ]
}
```

#### Step 2: Fetch the Photo

```bash
# Direct image redirect (default)
curl -L \
  'https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw/photos/AUy1YQ3Rbwqx.../media?maxWidthPx=800&key=YOUR_API_KEY'

# Get photo URI instead of redirect
curl \
  'https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw/photos/AUy1YQ3Rbwqx.../media?maxWidthPx=800&skipHttpRedirect=true&key=YOUR_API_KEY'
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `maxWidthPx` | integer | One required | Max width (1-4800) |
| `maxHeightPx` | integer | One required | Max height (1-4800) |
| `skipHttpRedirect` | boolean | No | Return JSON with `photoUri` instead of redirect |

At least one of `maxWidthPx` or `maxHeightPx` must be specified.

#### JSON Response (with `skipHttpRedirect=true`)

```json
{
  "name": "places/PLACE_ID/photos/PHOTO_RESOURCE/media",
  "photoUri": "https://lh3.googleusercontent.com/places/..."
}
```

#### Python Example

```python
from google.maps import places_v1

async def get_place_photo():
    client = places_v1.PlacesAsyncClient()

    # Step 1: Get photo references
    detail_request = places_v1.GetPlaceRequest(
        name="places/ChIJj61dQgK6j4AR4GeTYWZsKWw",
    )
    detail_response = await client.get_place(
        request=detail_request,
        metadata=[("x-goog-fieldmask", "photos")],
    )

    if not detail_response.photos:
        return "No photos found"

    # Step 2: Fetch the photo media
    photo_name = detail_response.photos[0].name + "/media"
    photo_request = places_v1.GetPhotoMediaRequest(
        name=photo_name,
        max_width_px=800,
    )
    photo_response = await client.get_photo_media(request=photo_request)
    return photo_response
```

#### Node.js Example

```javascript
const { PlacesClient } = require("@googlemaps/places").v1;

async function getPlacePhoto() {
  const placesClient = new PlacesClient();

  // Step 1: Get photo references
  const [placeResponse] = await placesClient.getPlace(
    { name: "places/ChIJj61dQgK6j4AR4GeTYWZsKWw" },
    {
      otherArgs: {
        headers: { "X-Goog-FieldMask": "photos" },
      },
    }
  );

  if (!placeResponse.photos || placeResponse.photos.length === 0) {
    console.log("No photos found");
    return;
  }

  // Step 2: Fetch the photo media
  const photoMediaName = `${placeResponse.photos[0].name}/media`;
  const [photoResponse] = await placesClient.getPhotoMedia({
    name: photoMediaName,
    maxWidthPx: 800,
  });

  console.log(photoResponse);
}

getPlacePhoto();
```

**Important notes:**
- Photo resource names expire; do not cache them long-term
- Author attributions must be displayed when present
- Load photos on demand; simultaneous bulk requests may trigger HTTP 429
- Maximum supported dimension: 4800 x 4800 pixels

---

## 5. Advanced Features

### 5.1 AI-Powered Generative Summaries

Available since May 2025 (GA). AI-generated descriptions powered by Gemini.

**Three types:**
1. **Place summaries** -- Brief overviews (~100 chars) of a location
2. **Review summaries** -- Aggregated insights from user reviews
3. **Area summaries** -- Neighborhood and surrounding area descriptions

**Availability:** English (US, India); Japanese (Japan for review summaries)

**Categories supported:** Culture, Entertainment & Recreation, Food & Drink, Shopping, Services, Sports

#### Request (REST)

```bash
# Place Details with generative summary
curl -X GET \
  'https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: displayName,generativeSummary'

# Text Search with generative summary
curl -X POST \
  'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: places.displayName,places.generativeSummary' \
  -d '{ "textQuery": "casual restaurants in SoHo" }'
```

#### Response

```json
{
  "generativeSummary": {
    "overview": {
      "text": "Casual eatery offering healthy, made-to-order salads, plates, and grain bowls with vegan options."
    },
    "disclosureText": {
      "text": "Summarized with Gemini"
    },
    "overviewFlagContentUri": "https://..."
  }
}
```

**Attribution requirement:** You must display the `disclosureText` ("Summarized with Gemini") alongside any displayed summary.

### 5.2 Routing Summaries

Calculate travel duration and distance from an origin to places in search results.

**Supported in:** Text Search (New), Nearby Search (New)

#### Request

```bash
curl -X POST \
  'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: places.displayName,places.formattedAddress,routingSummaries' \
  -d '{
    "textQuery": "coffee shops",
    "locationBias": {
      "circle": {
        "center": { "latitude": 37.7749, "longitude": -122.4194 },
        "radius": 2000.0
      }
    },
    "routingParameters": {
      "origin": { "latitude": 37.7749, "longitude": -122.4194 },
      "travelMode": "DRIVE",
      "routeModifiers": { "avoidTolls": true }
    }
  }'
```

#### Response

```json
{
  "places": [ ... ],
  "routingSummaries": [
    {
      "legs": [
        {
          "duration": "285s",
          "distanceMeters": 1616
        }
      ],
      "directionsUri": "https://www.google.com/maps/dir/..."
    }
  ]
}
```

**Important:** Including `routingSummaries` in the field mask without `routingParameters.origin` or `searchAlongRouteParameters.polyline.encodedPolyline` causes an error.

### 5.3 Search Along Route

Combine with the Routes API to find places along a driving route:

```bash
curl -X POST \
  'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: places.displayName,routingSummaries' \
  -d '{
    "textQuery": "gas station",
    "searchAlongRouteParameters": {
      "polyline": {
        "encodedPolyline": "YOUR_ENCODED_POLYLINE_FROM_ROUTES_API"
      }
    }
  }'
```

### 5.4 Relocated Place Detection

Since October 2025, the API can indicate when a business has moved:

```
X-Goog-FieldMask: displayName,movedPlace,movedPlaceId
```

### 5.5 Google Maps Links

Since August 2025 (GA), get deep links into Google Maps:

```
X-Goog-FieldMask: displayName,googleMapsLinks
```

Returns URLs for: viewing the place, getting directions, viewing photos, reading reviews, writing a review.

### 5.6 Address Descriptors

Since April 2025, get relational location information:

```
X-Goog-FieldMask: displayName,addressDescriptor
```

Returns landmarks and containing areas relative to the place. Generally available in India; experimental elsewhere.

### 5.7 New Fields (November 2024+)

| Field | Description |
|-------|-------------|
| `containingPlaces` | Parent locations for the place |
| `priceRange` | Price range information |
| `pureServiceAreaBusiness` | True for service-only businesses without physical addresses |
| `nextOpenTime` / `nextCloseTime` | When the place will next open/close |
| `evChargeOptions` | EV charger count and types |
| `fuelOptions` | Recent fuel price data |
| `parkingOptions` | Available parking types |
| `googleMapsTypeLabel` | Localized type label (added Feb 2026) |

---

## 6. Maps JavaScript API Integration

### Loading the Places Library

#### Dynamic Import (recommended)

```javascript
const { Place } = await google.maps.importLibrary("places");
```

#### Script Tag

```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&v=weekly"
  async
  defer
></script>
```

### New Class Mapping (Legacy to New)

| Legacy | New |
|--------|-----|
| `google.maps.places.PlacesService` | `google.maps.places.Place` |
| `PlacesService.findPlaceFromQuery()` | `Place.searchByText()` |
| `PlacesService.nearbySearch()` | `Place.searchNearby()` |
| `PlacesService.getDetails()` | `place.fetchFields()` |
| `google.maps.places.Autocomplete` | `google.maps.places.PlaceAutocompleteElement` |

### Text Search

```javascript
const { Place } = await google.maps.importLibrary("places");

const request = {
  textQuery: "restaurants in downtown Seattle",
  fields: ["displayName", "location", "formattedAddress", "rating"],
  locationBias: {
    center: { lat: 47.6062, lng: -122.3321 },
    radius: 5000,
  },
  maxResultCount: 10,
};

const { places } = await Place.searchByText(request);

places.forEach((place) => {
  console.log(place.displayName, place.formattedAddress, place.rating);
});
```

### Nearby Search

```javascript
const { Place } = await google.maps.importLibrary("places");

const request = {
  fields: ["displayName", "location", "rating"],
  locationRestriction: {
    center: { lat: 47.6062, lng: -122.3321 },
    radius: 2000,
  },
  includedPrimaryTypes: ["restaurant"],
  maxResultCount: 10,
};

const { places } = await Place.searchNearby(request);
```

### Place Details

```javascript
const { Place } = await google.maps.importLibrary("places");

const place = new Place({ id: "ChIJj61dQgK6j4AR4GeTYWZsKWw" });

await place.fetchFields({
  fields: [
    "displayName",
    "formattedAddress",
    "location",
    "rating",
    "websiteURI",
    "reviews",
    "photos",
  ],
});

console.log(place.displayName);
console.log(place.formattedAddress);
console.log(place.rating);
```

### Place Autocomplete Widget

```html
<gmp-map center="40.749933,-73.98633" zoom="13" map-id="DEMO_MAP_ID">
  <div slot="control-inline-start-block-start">
    <gmp-place-autocomplete
      placeholder="Search for a place..."
    ></gmp-place-autocomplete>
  </div>
</gmp-map>
```

#### Programmatic Autocomplete Element

```javascript
const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
  componentRestrictions: { country: "us" },
  locationBias: {
    center: { lat: 40.749933, lng: -73.98633 },
    radius: 5000,
  },
});

document.getElementById("autocomplete-container").appendChild(placeAutocomplete);

placeAutocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
  const place = placePrediction.toPlace();
  await place.fetchFields({
    fields: ["displayName", "formattedAddress", "location"],
  });

  console.log("Selected:", place.displayName);
  console.log("Address:", place.formattedAddress);
  console.log("Location:", place.location.lat(), place.location.lng());
});
```

### Key Differences in JavaScript API

- Uses `camelCase` field names (not snake_case)
- Promise-based (no callbacks)
- Standard error handling (no `PlacesServiceStatus` checks)
- `PlaceAutocompleteElement` replaces the legacy `Autocomplete` widget
- Place objects include `googleMapsLinks` for deep linking

---

## 7. Pricing & Billing

### Pricing Model (effective March 1, 2025)

All pricing is per 1,000 requests (CPM). Each SKU has a free monthly threshold, after which volume-based pricing applies.

### Essentials Tier

| SKU | Free/Month | 0-100K CPM | 100K-500K CPM | 500K-1M CPM | 1M-5M CPM | 5M+ CPM |
|-----|-----------|------------|---------------|-------------|-----------|---------|
| Autocomplete Requests | 10,000 | $2.83 | $2.27 | $1.70 | $0.85 | $0.21 |
| Autocomplete Session Usage | Unlimited | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 |
| Place Details (IDs Only) | Unlimited | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 |
| Place Details Essentials | 10,000 | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |
| Text Search (IDs Only) | Unlimited | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 |

### Pro Tier

| SKU | Free/Month | 0-100K CPM | 100K-500K CPM | 500K-1M CPM | 1M-5M CPM | 5M+ CPM |
|-----|-----------|------------|---------------|-------------|-----------|---------|
| Nearby Search Pro | 5,000 | $32.00 | $25.60 | $19.20 | $9.60 | $2.40 |
| Place Details Pro | 5,000 | $17.00 | $13.60 | $10.20 | $5.10 | $1.28 |
| Text Search Pro | 5,000 | $32.00 | $25.60 | $19.20 | $9.60 | $2.40 |
| Place Details Photos | 5,000 | $7.00 | $5.60 | $4.20 | $2.10 | $0.53 |

### Enterprise Tier

| SKU | Free/Month | 0-100K CPM |
|-----|-----------|------------|
| Nearby Search Enterprise | 5,000 | $35.00 |
| Nearby Search Enterprise + Atmosphere | 5,000 | $40.00 |
| Place Details Enterprise | 5,000 | $20.00 |
| Place Details Enterprise + Atmosphere | 5,000 | $25.00 |
| Text Search Enterprise | 5,000 | $35.00 |
| Text Search Enterprise + Atmosphere | 5,000 | $40.00 |

Enterprise tier also has volume discounts at higher tiers.

### Subscription Plans (enrollment: Nov 2025 - March 2026)

| Plan | Monthly Cost | Included Calls |
|------|-------------|----------------|
| Essentials | ~$275/month | 100,000 combined calls |
| Pro | ~$1,200/month | 250,000 combined calls |

### Billing Rules

1. **Highest SKU wins:** If you request fields from multiple tiers, you are billed at the highest tier
2. **Field masks control cost:** Only request fields you need
3. **Session tokens save money:** Autocomplete sessions bundle multiple requests
4. **IDs Only is free:** Requesting only `id`, `name`, `attributions`, and `photos` incurs no charge
5. **Photos are separate:** Each photo media fetch is a separate billable event

### Autocomplete Session Pricing

| Scenario | Billing |
|----------|---------|
| Session ends with Place Details Essentials | First 12 autocomplete requests billed individually; 13+ free; Place Details at Essentials rate |
| Session ends with Place Details (Pro/Enterprise/Enterprise+) | All autocomplete requests free; Place Details at appropriate rate |
| Session ends with Address Validation | All autocomplete requests free; Address Validation at Enterprise rate |
| Abandoned session | Each autocomplete request billed individually |
| No session token | Each request billed at Autocomplete Requests SKU |

### Cost Optimization Tips

1. Use field masks to select only needed fields (stay at lowest SKU tier)
2. Use session tokens for autocomplete flows
3. Use `Place Details (IDs Only)` or `Text Search (IDs Only)` when you only need Place IDs
4. For autocomplete + geocoding only: skip sessions and use Autocomplete Requests + Geocoding API if users typically select within 4 or fewer requests
5. Monitor usage in Google Cloud Console

---

## 8. Rate Limits & Quotas

### Default Quotas

- Rate limits are applied **per API method per project** (not combined across methods)
- Default limits are managed per-minute
- Newly created API keys have suggested free-tier limits:
  - 300 Autocomplete requests per day
  - 300 GetPlace requests per day

### Managing Quotas

1. Navigate to **Google Maps Platform > Quotas** in the Cloud Console
2. Select the API method to view/modify
3. Adjust quota limits as needed

### Quota Exceeded Behavior

- When quota is exceeded, the API returns HTTP 429 (Too Many Requests)
- Implement exponential backoff in your retry logic
- Set daily spending caps in the Cloud Console to prevent unexpected charges

### Best Practices

- Implement client-side caching of results where appropriate
- Use debouncing for autocomplete (wait 300ms+ after user stops typing)
- Load photos on demand rather than in bulk
- Monitor usage dashboards in the Cloud Console

---

## 9. Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request -- invalid parameters, missing field mask, expired photo name |
| 401 | Unauthorized -- missing or invalid API key |
| 403 | Forbidden -- API not enabled, quota exceeded, or key restrictions violated |
| 404 | Not Found -- invalid Place ID |
| 429 | Too Many Requests -- rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Common Error Responses

#### Missing Field Mask

```json
{
  "error": {
    "code": 400,
    "message": "Request must set field mask.",
    "status": "INVALID_ARGUMENT"
  }
}
```

#### Invalid API Key

```json
{
  "error": {
    "code": 403,
    "message": "The provided API key is invalid.",
    "status": "PERMISSION_DENIED"
  }
}
```

#### Obsolete Place ID

```json
{
  "error": {
    "code": 400,
    "message": "Request contains an invalid argument.",
    "status": "INVALID_REQUEST"
  }
}
```

### Retry Strategy

```python
import time
import random

def make_request_with_retry(request_func, max_retries=5):
    for attempt in range(max_retries):
        try:
            return request_func()
        except Exception as e:
            if hasattr(e, 'code') and e.code in (429, 500, 503):
                wait = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(wait)
                continue
            raise
    raise Exception("Max retries exceeded")
```

```javascript
async function makeRequestWithRetry(requestFunc, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFunc();
    } catch (error) {
      if ([429, 500, 503].includes(error.code) && attempt < maxRetries - 1) {
        const wait = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      throw error;
    }
  }
}
```

---

## 10. Place Types Reference

### Table A -- Filterable Types (used in search requests)

These types can be used with `includedTypes`, `excludedTypes`, `includedPrimaryTypes`, and `excludedPrimaryTypes` in Nearby Search and Text Search.

**Key categories with example types:**

| Category | Example Types |
|----------|--------------|
| Automotive | `car_dealer`, `car_rental`, `car_repair`, `car_wash`, `electric_vehicle_charging_station`, `gas_station`, `parking` |
| Business | `corporate_office`, `coworking_space`\*, `farm` |
| Culture | `art_gallery`, `museum`, `performing_arts_theater`, `historical_place` |
| Education | `library`, `school`, `university`, `preschool` |
| Entertainment | `amusement_park`, `aquarium`, `bowling_alley`, `casino`, `movie_theater`, `night_club`, `zoo` |
| Finance | `atm`, `bank`, `accounting` |
| Food & Drink | `restaurant`, `cafe`, `bar`, `bakery`, `coffee_shop`, `pizza_restaurant`, `sushi_restaurant`, `ice_cream_shop` (140+ cuisine-specific types) |
| Government | `city_hall`, `courthouse`, `fire_station`, `police`, `post_office` |
| Health | `dentist`, `doctor`, `hospital`, `pharmacy`, `spa`, `gym` |
| Lodging | `hotel`, `motel`, `campground`, `hostel`, `resort_hotel` |
| Natural Features | `beach`, `mountain_peak`\*, `lake`\*, `river`\*, `nature_preserve`\* |
| Places of Worship | `church`, `mosque`, `synagogue`, `hindu_temple` |
| Services | `beauty_salon`, `laundry`, `locksmith`, `plumber`, `real_estate_agency`, `travel_agency` |
| Shopping | `book_store`, `clothing_store`, `convenience_store`, `grocery_store`, `shopping_mall`, `supermarket` |
| Sports | `fitness_center`, `golf_course`, `stadium`, `swimming_pool`\* |
| Transportation | `airport`, `bus_station`, `subway_station`, `train_station`, `taxi_stand` |

\* = Added February 12, 2026

### Table B -- Additional Response Types

These types appear in responses but cannot be used as search filters (except `includedPrimaryTypes` in Autocomplete).

Examples: `establishment`, `food`, `health`, `point_of_interest`, `political`, `neighborhood`, `route`, `street_address`, `sublocality`, `town_square`

### Type Usage Rules

- **Nearby Search:** `includedTypes` and `excludedTypes` accept Table A types only
- **Text Search:** `includedType` accepts a single Table A type
- **Autocomplete:** `includedPrimaryTypes` accepts both Table A and Table B types (up to 5)
- A place has one primary type and can have multiple secondary types

---

## 11. Release History

### February 12, 2026
- 180 new place types added (e.g., cuisine-specific restaurants, natural features, transportation)
- New field: `googleMapsTypeLabel` -- localized type label from Google Maps

### October 20, 2025
- New fields: `movedPlace` and `movedPlaceId` for relocated business detection

### August 21, 2025
- `googleMapsLinks` field moved from Preview to GA
- AI summaries expanded to English (India, US) and Japanese (Japan)

### May 8, 2025
- AI-powered summaries (place, review, area) reached GA
- Powered by Gemini

### April 8, 2025
- `addressDescriptor` field added (landmarks and containing areas)
- GA in India, experimental elsewhere

### March 11, 2025
- `postalAddress` field added for postal service information

### March 1, 2025
- Legacy Places API designated as legacy status
- $200 monthly credit replaced with per-SKU free thresholds
- Volume discounts expanded to 5M+ tier
- New API keys default to Places API (New)

### November 7, 2024
- 104 new place types added
- New fields: `containingPlaces`, `priceRange`, `pureServiceAreaBusiness`, `nextOpenTime`, `nextCloseTime`
- EV charging, fuel, and parking option fields added
- Text Search EV filtering parameters added

### October 29, 2024
- Content reporting via `flagContentUri`
- Routing summary direction links (`directionsUri`)
- `googleMapsLinks` preview

### October 26, 2023
- Places API (New) reached General Availability
- Launched: Nearby Search, Text Search, Place Details, Place Photos, Autocomplete

---

## 12. Client Libraries

### Official Google Cloud Client Libraries

| Language | Package | Install Command |
|----------|---------|----------------|
| Python | `google-maps-places` | `pip install --upgrade google-maps-places` |
| Node.js | `@googlemaps/places` | `npm install @googlemaps/places` |
| Java | `google-cloud-maps-places` | Maven/Gradle (see GitHub) |
| Go | `cloud.google.com/go/maps` | `go get cloud.google.com/go/maps` |
| .NET | `Google.Maps.Places.V1` | `Install-Package Google.Maps.Places.V1 -Pre` |

### Authentication with Client Libraries

All official client libraries use Application Default Credentials (ADC):

```bash
# Option 1: User credentials (development)
gcloud auth application-default login

# Option 2: Service account (production)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### Direct REST with API Key

For simple use cases or languages without a client library, use direct HTTP requests:

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://places.googleapis.com/v1"

def text_search(query, fields="places.displayName,places.formattedAddress"):
    response = requests.post(
        f"{BASE_URL}/places:searchText",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": fields,
        },
        json={"textQuery": query},
    )
    response.raise_for_status()
    return response.json()

results = text_search("coffee shops in Portland")
for place in results.get("places", []):
    print(place["displayName"]["text"], "-", place["formattedAddress"])
```

```javascript
const fetch = require("node-fetch");

const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://places.googleapis.com/v1";

async function textSearch(query, fields = "places.displayName,places.formattedAddress") {
  const response = await fetch(`${BASE_URL}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fields,
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

textSearch("coffee shops in Portland").then((data) => {
  data.places?.forEach((place) => {
    console.log(place.displayName.text, "-", place.formattedAddress);
  });
});
```

---

## Quick Reference: All Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Text Search | POST | `https://places.googleapis.com/v1/places:searchText` |
| Nearby Search | POST | `https://places.googleapis.com/v1/places:searchNearby` |
| Place Details | GET | `https://places.googleapis.com/v1/places/{placeId}` |
| Autocomplete | POST | `https://places.googleapis.com/v1/places:autocomplete` |
| Place Photos | GET | `https://places.googleapis.com/v1/{photoName}/media` |

## Required Headers

| Header | Purpose |
|--------|---------|
| `X-Goog-Api-Key` | API key authentication |
| `X-Goog-FieldMask` | Specify response fields (required for search/details) |
| `Content-Type: application/json` | Required for POST requests |

---

## Sources

- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [Choose Fields (Field Masks)](https://developers.google.com/maps/documentation/places/web-service/choose-fields)
- [Session Tokens](https://developers.google.com/maps/documentation/places/web-service/place-session-tokens)
- [Session Pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing)
- [Usage and Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Core Services Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [March 2025 Pricing Changes](https://developers.google.com/maps/billing-and-pricing/march-2025)
- [Place Types (New)](https://developers.google.com/maps/documentation/places/web-service/place-types)
- [Client Library Examples](https://developers.google.com/maps/documentation/places/web-service/client-library-examples)
- [Client Libraries Setup](https://developers.google.com/maps/documentation/places/web-service/client-libraries)
- [REST API Reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest)
- [AI-Powered Summaries](https://developers.google.com/maps/documentation/places/web-service/place-summaries)
- [Routing Summaries](https://developers.google.com/maps/documentation/places/web-service/routing-summary-sar)
- [Release Notes](https://developers.google.com/maps/documentation/places/web-service/release-notes)
- [Maps JavaScript API Migration](https://developers.google.com/maps/documentation/javascript/legacy/places-migration-overview)
- [Place Autocomplete Widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Deprecations](https://developers.google.com/maps/deprecations)
- [API Key Setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key)
- [Operations Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview)
