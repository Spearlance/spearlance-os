---
paths:
  - "**/tracking/**"
  - "**/capi/**"
  - "**/pixel/**"
  - "**/meta/**"
  - "**/facebook/**"
---

# Facebook/Meta CAPI Rules

## Event Deduplication

- Every conversion event MUST have a matching `event_id` in both browser Pixel AND server CAPI
- Generate `event_id` BEFORE the browser Pixel fires, pass the same value to the server
- Deduplication window: 48 hours — Meta matches `(event_name + event_id)` pairs
- If `event_id` is missing or mismatched, the same conversion counts twice

## EMQ Optimization

Target Event Match Quality (EMQ) score of ≥ 6.0. Tiers:

| Tier | Score | Parameters Required |
|------|-------|--------------------|
| Minimum viable | ≥ 4.0 | `em`, `client_ip_address`, `client_user_agent` |
| Good | ≥ 6.0 | + `ph`, `fbp`, `fbc` |
| Excellent | ≥ 8.0 | + `fn`, `ln`, `external_id`, `ct`, `st`, `zp` |

## PII Hashing Standards

All user data fields MUST be SHA-256 hashed before sending:

| Field | Normalization | Then |
|-------|--------------|------|
| Email | lowercase, trim | SHA-256 |
| Phone | E.164 digits only (no +, -, spaces) | SHA-256 |
| First name | lowercase, trim | SHA-256 |
| Last name | lowercase, trim | SHA-256 |
| City | lowercase, trim, remove spaces | SHA-256 |
| State | 2-letter code, lowercase | SHA-256 |
| Zip | trim | SHA-256 |

Never send raw PII. Different normalization = different hash = failed match.

## Server Enrichment

For every CAPI event, forward from the HTTP request:
- `client_ip_address` — from `X-Forwarded-For` or `req.ip`
- `client_user_agent` — from `User-Agent` header
- `fbp` — read `_fbp` cookie value
- `fbc` — read `_fbc` cookie (set from `fbclid` URL parameter on landing)

Missing these fields degrades EMQ significantly.

## Event Time

- `event_time` MUST be Unix timestamp in **seconds** (not milliseconds)
- `Math.floor(Date.now() / 1000)` in JavaScript
- `int(time.time())` in Python

## API Version

- Use a supported Graph API version (v21.0–v24.0 as of 2026)
- Versions expire after 2 years — check quarterly
- Pin version in environment variable for easy updates

## Test Events

- Use `test_event_code` during development (from Events Manager > Test Events)
- REMOVE `test_event_code` before production deploy — test events don't count toward attribution
- Verify events appear in Events Manager within 20 seconds of sending

## Batch Limits

- Maximum 1,000 events per CAPI request
- Events older than 7 days are rejected
- Rate limit: respect Meta's 200 calls/hour guideline with exponential backoff
