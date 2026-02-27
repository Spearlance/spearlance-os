---
paths:
  - "**/pinterest/**"
  - "**/tracking/pinterest*"
---

# Pinterest API Rules

## Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| API Version | v5 | Stable — use `https://api.pinterest.com/v5/` |
| Auth | Bearer token | `Authorization: Bearer {TOKEN}` |
| Token expiry | 60 days | Must implement automatic refresh |
| Currency | Micro-currency | 1 USD = 1,000,000 |

## Authentication

- Access token expires every 60 days — build refresh into your workflow
- Use `PINTEREST_ACCESS_TOKEN` environment variable
- Refresh via `POST /v5/oauth/token` with `grant_type=refresh_token`
- Monitor for `401` errors as expiry signal
- Never hardcode tokens in source code

## CAPI Event Format

- Endpoint: `POST /v5/ad_accounts/{ad_account_id}/events`
- Event names use **underscore format**: `page_visit`, `lead`, `checkout`
- NOT PascalCase (that's Meta format): `PageVisit` will fail
- `action_source` is required: `web`, `app`, `phone_call`, `crm`, etc.
- `event_time` in Unix seconds (not milliseconds)

## Click Attribution (_epik)

The `_epik` cookie is Pinterest's click identifier:
1. User clicks Pinterest ad → lands with `epik` URL parameter
2. Extract from URL and set as `_epik` cookie on landing page
3. Read cookie on conversion, include as `user_data.click_id` in CAPI
4. Without `_epik`, Pinterest cannot attribute conversions to ad clicks

Always capture `_epik` on every landing page that receives Pinterest ad traffic.

## PII Hashing

Same as Meta — SHA-256 hash all user data before sending:
- Email: lowercase, trim, then hash
- Phone: E.164 digits only, then hash
- Names: lowercase, trim, then hash

## Deduplication

Use `event_id` to deduplicate between browser conversion tag and server CAPI events. Same logic as Meta deduplication — match `event_name + event_id`.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 error | Token expired | Refresh token (60-day cycle) |
| Event rejected | Wrong event name format | Use `page_visit` not `PageVisit` |
| No attribution | Missing `_epik` | Capture from URL on landing |
| Budget wrong | Dollar amount, not micro | Multiply by 1,000,000 |
