---
model: claude-sonnet-4-6
name: meta-audiences
description: Use when creating or managing Meta custom audiences, lookalike audiences, or pixel-based retargeting segments. Also use when uploading customer lists, analyzing audience overlap, or checking audience population status.
---

# Meta Audiences

## Overview

Meta Custom Audiences let you target users based on first-party data you already own — customer lists, website pixel events, app activity, or engagement on Meta platforms. Lookalikes extend reach by finding users statistically similar to your best existing audiences.

**Note (2025):** Meta blocks audiences that suggest sensitive information (health conditions, financial status). Audiences flagged with error `471` cannot run ads — remove sensitive labels and recreate.

---

## Audience Types Quick Reference

| Type | Source | Time to Populate | Min Size for Ads |
|------|--------|-----------------|-----------------|
| Customer List | Hashed CRM data | 24–48 hours | 100 matched users |
| Website (Pixel) | Pixel events | Real-time | 1,000 matched users |
| App Activity | SDK events | Real-time | 1,000 matched users |
| Engagement | Page/IG interactions | Real-time | 100 matched users |
| Lookalike | Source audience | 6–24 hours | N/A (derived) |

---

## Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List audiences | `GET /act_{account_id}/customaudiences` | Read |
| Create audience | `POST /act_{account_id}/customaudiences` | Write |
| Add users to list | `POST /{audience_id}/users` | Write |
| Remove users | `DELETE /{audience_id}/users` | Write |
| Get audience size | `GET /{audience_id}?fields=approximate_count_lower_bound,approximate_count_upper_bound` | Read |
| Create lookalike | `POST /act_{account_id}/customaudiences` with `subtype=LOOKALIKE` | Write |

Base URL: `https://graph.facebook.com/v21.0/`

---

## 1. Customer List Audiences

Upload hashed first-party data (emails, phone numbers) for direct matching against Meta accounts.

### Hashing Requirements

All PII must be normalized then SHA-256 hashed before upload. Never send raw PII.

| Field | Normalization | Hash |
|-------|---------------|------|
| Email | Lowercase, trim whitespace | SHA-256 |
| Phone | E.164 format (`+12125551234`) | SHA-256 |
| First name | Lowercase, trim | SHA-256 |
| Last name | Lowercase, trim | SHA-256 |

### Create and Populate

```bash
# Step 1: Create the audience container
POST /act_{AD_ACCOUNT_ID}/customaudiences
  name=My Customer List
  description=Customers from CRM export
  subtype=CUSTOM

# Step 2: Upload hashed users (max 10,000 per batch)
POST /{AUDIENCE_ID}/users
{
  "schema": ["EMAIL", "PHONE"],
  "data": [
    ["<sha256_hashed_email>", "<sha256_hashed_phone>"],
    ["<sha256_hashed_email>", ""]
  ]
}
```

### Match Rate Expectations

| Data Provided | Typical Match Rate |
|---------------|-------------------|
| Email only | 40–60% |
| Phone only | 30–50% |
| Email + Phone | 60–80% |
| Email + Phone + Name | 70–85% |

Providing both email and phone significantly improves match rates. Source list must have at least 100 matched users for ad delivery.

---

## 2. Website Custom Audiences (Pixel-Based)

Retarget users who visited your site and triggered pixel events.

```bash
POST /act_{AD_ACCOUNT_ID}/customaudiences
{
  "name": "30-day Website Visitors",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{"id": "{PIXEL_ID}", "type": "pixel"}],
        "retention_seconds": 2592000,
        "filter": {
          "operator": "and",
          "filters": [{"field": "event", "operator": "eq", "value": "PageView"}]
        }
      }]
    }
  },
  "pixel_id": "{PIXEL_ID}"
}
```

`retention_seconds`: 1 day = 86400, 7 days = 604800, 30 days = 2592000, 180 days = 15552000.

**Useful segments:**
- All visitors (30 days) — broad retargeting
- Product/service page visitors (30 days) — high intent
- Form abandoners (7 days) — warm retargeting
- Converters (180 days) — exclusion list

---

## 3. Engagement Audiences

Target users who interacted with your Facebook Page or Instagram account.

```bash
POST /act_{AD_ACCOUNT_ID}/customaudiences
{
  "name": "90-day Page Engagers",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{"id": "{PAGE_ID}", "type": "page"}],
        "retention_seconds": 7776000,
        "filter": {
          "operator": "and",
          "filters": [{"field": "event", "operator": "eq", "value": "page_engaged"}]
        }
      }]
    }
  }
}
```

Engagement events: `page_engaged`, `page_liked`, `post_engagement`, `video_watched`.

Good uses: warm retargeting, exclusion from cold prospecting, source for lookalikes.

---

## 4. Lookalike Audiences

Find new users statistically similar to a source audience.

```bash
POST /act_{AD_ACCOUNT_ID}/customaudiences
{
  "name": "1% Lookalike - Customer List",
  "subtype": "LOOKALIKE",
  "origin_audience_id": "{SOURCE_AUDIENCE_ID}",
  "lookalike_spec": {
    "ratio": 0.01,
    "country": "US"
  }
}
```

### Ratio Guide

| Ratio | Quality | Reach | Best For |
|-------|---------|-------|----------|
| 1% (0.01) | Highest | Narrowest | Cold prospecting — quality |
| 2% (0.02) | High | Moderate | Scaling winning campaigns |
| 5% (0.05) | Moderate | Broad | Scale + discovery |
| 10% (0.10) | Lower | Widest | Max reach campaigns |

**Recommended:** Test 1%, 2%, and 5% simultaneously in separate ad sets to find the optimal quality/reach balance.

### Source Audience Requirements

| Requirement | Detail |
|-------------|--------|
| Minimum size | 100 people in one country |
| Recommended size | 1,000–50,000 for best results |
| Best sources | Converters, high-LTV customers, pixel events |
| Country match | Source country must match lookalike country |

---

## Audience Sizing

```bash
GET /{AUDIENCE_ID}?fields=approximate_count_lower_bound,approximate_count_upper_bound,delivery_status
  &access_token={ACCESS_TOKEN}
```

Meta returns a range rather than exact count to protect user privacy. `delivery_status` shows if the audience is ready for ad delivery.

---

## Audience Overlap

Use Audience Insights or the Audience Overlap tool in Ads Manager to check if two audiences overlap heavily. High overlap between ad sets causes internal auction competition — consolidate or exclude overlapping segments.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Uploading unhashed PII | SHA-256 hash all PII before upload — never send raw data |
| Not normalizing before hashing | Lowercase emails, E.164 phones — different formats = different hashes |
| Using audience before it populates | Wait 24–48h for customer lists, ~1h for pixel audiences |
| Source audience too small for lookalike | Need 100+ matched users; 1,000+ for quality results |
| Audience flagged with error 471 | Contains sensitive category signals — recreate without health/financial labels |
| Retargeting audience too small | Under 1,000 users = limited delivery; broaden window or expand event types |
| Not excluding converters from prospecting | Wastes budget showing ads to people who already converted |
| Lookalike ratio too high for niche products | Start at 1%, verify quality before scaling to 5%+ |

---

## Related Skills

- `meta-ads` — Campaign and ad set creation
- `meta-conversions` — Pixel event setup for pixel-based audiences
- `verify-meta-auth` — Token and permission verification
