---
model: claude-sonnet-4-6
name: google-places-api
description: Use when working with Google Places API - place search, place details, autocomplete, place photos, or location-based queries. Also use when integrating Google Maps place data, nearby search, or address validation.
---

# Google Places API (New)

## Overview
Places API (New) v1 is the current actively-developed version. Legacy Places API is deprecated (no new project enrollment since March 2025). Key difference: **field masks are mandatory** on all requests.

## Quick Reference

| Item | Value |
|------|-------|
| **Base URL** | `https://places.googleapis.com` |
| **Auth** | API Key via `X-Goog-Api-Key` header |
| **Python** | `pip install googlemaps` or REST |
| **Node.js** | `@googlemaps/google-maps-services-js` |
| **Field Masks** | Required on every request |

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/places:searchText` | POST | Text-based place search |
| `/v1/places:searchNearby` | POST | Location-based search |
| `/v1/places/{id}` | GET | Place details |
| `/v1/places:autocomplete` | POST | Address/place autocomplete |
| `/v1/places/{id}/photos/{photo}/media` | GET | Place photos |

## Text Search

```bash
curl -X POST "https://places.googleapis.com/v1/places:searchText" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: API_KEY" \
  -H "X-Goog-FieldMask: places.displayName,places.formattedAddress,places.rating" \
  -d '{"textQuery": "pizza near Times Square"}'
```

```python
import requests

response = requests.post(
    "https://places.googleapis.com/v1/places:searchText",
    headers={
        "X-Goog-Api-Key": "API_KEY",
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.id"
    },
    json={"textQuery": "coffee shops in Austin TX"}
)
```

## Field Masks (Required)

Pass via `X-Goog-FieldMask` header. Common fields:
- `places.displayName`, `places.formattedAddress`, `places.id`
- `places.rating`, `places.userRatingCount`, `places.priceLevel`
- `places.types`, `places.websiteUri`, `places.nationalPhoneNumber`
- `places.location` (lat/lng), `places.photos`
- `places.reviews`, `places.generativeSummary` (AI-powered)

**Billing tip:** Only request fields you need - billed at the **highest** SKU tier among all requested fields.
**Note:** Search endpoints use `places.` prefix (`places.displayName`); Place Details uses NO prefix (`displayName`).

## Session Tokens

Use for autocomplete + details workflows to reduce billing:
```python
import uuid
session_token = str(uuid.uuid4())
# Pass session_token in autocomplete request, then in subsequent place details request
# Billed as single session instead of per-request
```

## Pricing Tiers (5 SKUs, effective March 2025)

| SKU Tier | Example Fields | Free/Month |
|----------|---------------|------------|
| **Essentials (IDs Only)** | `id`, `name`, `photos` (refs only) | Unlimited |
| **Essentials** | `formattedAddress`, `location`, `types` | 10,000 |
| **Pro** | `displayName`, `businessStatus`, `googleMapsUri` | 5,000 |
| **Enterprise** | `rating`, `websiteUri`, `phoneNumber`, `priceLevel` | 5,000 |
| **Enterprise + Atmosphere** | `reviews`, `dineIn`, `outdoorSeating`, `generativeSummary` | 5,000 |

## Full Reference

See `reference.md` in this skill directory for all field types, place type categories (300+), error handling, Maps JS integration, and migration guide from legacy API.
