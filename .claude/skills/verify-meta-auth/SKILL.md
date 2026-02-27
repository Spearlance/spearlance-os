---
model: claude-sonnet-4-6
name: verify-meta-auth
description: Use when verifying Meta API authentication, checking access token validity, inspecting permission scopes, exchanging short-lived tokens for long-lived tokens, or diagnosing "Invalid OAuth token" errors. Also use before starting Meta API work to confirm credentials are correctly configured.
---

# Verify Meta Auth

## Overview

Meta API authentication failures are the top cause of blocked ad operations. This skill covers the full token verification workflow: checking env vars, validating token validity via `debug_token`, confirming required permission scopes, verifying ad account and pixel access, and exchanging short-lived tokens for long-lived ones.

Always run auth verification before starting any Meta API work on a new environment.

---

## Token Types

| Token Type | Expires | Use Case |
|------------|---------|----------|
| User Token (short-lived) | 1–2 hours | Dev/testing only |
| User Token (long-lived) | 60 days | User-authorized actions |
| Page Token | Never (if from System User) | Page-level operations |
| System User Token | Never | Server-side automation (recommended for production) |
| App Token | Never | App-level operations only |

**Production recommendation:** Use System User tokens. They never expire, are scoped to your Business Manager, and don't depend on any individual user account.

---

## Required Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `META_ACCESS_TOKEN` | System User or long-lived user token | Business Manager > System Users |
| `META_AD_ACCOUNT_ID` | Ad account ID (without `act_` prefix) | Ads Manager URL or Business Manager |
| `META_PIXEL_ID` | Pixel ID | Events Manager |

---

## Verification Checklist

Run in order — each check depends on the previous passing.

```
[ ] 1. ENV VARS — META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PIXEL_ID are set
[ ] 2. TOKEN VALID — /me endpoint returns valid response
[ ] 3. PERMISSIONS — debug_token confirms required scopes
[ ] 4. AD ACCOUNT — Account is ACTIVE with correct currency/timezone
[ ] 5. PIXEL ACCESS — Pixel is ACTIVE and accessible
[ ] 6. API VERSION — Code targets v21.0 or later
```

---

## Step 1: Check Token Validity

```bash
curl "https://graph.facebook.com/v21.0/me?access_token={ACCESS_TOKEN}"
```

Success response:
```json
{
  "id": "123456789",
  "name": "System User Name"
}
```

Failure:
```json
{
  "error": {
    "code": 190,
    "message": "Invalid OAuth 2.0 Access Token"
  }
}
```

---

## Step 2: Debug Token (Permissions + Expiry)

The `debug_token` endpoint is a special case — pass the token as a query param, not in the Authorization header.

```bash
curl "https://graph.facebook.com/v21.0/debug_token?input_token={TOKEN}&access_token={TOKEN}"
```

Response fields to check:

```json
{
  "data": {
    "is_valid": true,
    "expires_at": 0,
    "scopes": [
      "ads_management",
      "ads_read",
      "business_management",
      "pages_read_engagement",
      "pages_manage_ads",
      "instagram_basic",
      "instagram_manage_insights"
    ],
    "type": "SYSTEM_USER",
    "user_id": "123456789"
  }
}
```

`expires_at: 0` = never expires (System User token). Any other value = expiry timestamp.

---

## Required Permission Scopes

| Scope | Required For |
|-------|-------------|
| `ads_management` | Create/edit campaigns, ad sets, ads |
| `ads_read` | Read campaign data, insights |
| `business_management` | Business Manager access, audiences |
| `pages_read_engagement` | Read Page engagement metrics |
| `pages_manage_ads` | Run ads for Pages |
| `instagram_basic` | Instagram account access |
| `instagram_manage_insights` | Instagram analytics |

If any required scope is missing, the token must be regenerated with the correct permissions — you cannot add scopes to an existing token.

---

## Step 3: Verify Ad Account Access

```bash
curl "https://graph.facebook.com/v21.0/act_{AD_ACCOUNT_ID}?fields=id,name,account_status,currency,timezone_name&access_token={ACCESS_TOKEN}"
```

Expected response:
```json
{
  "id": "act_XXXXXXXXX",
  "name": "Your Ad Account",
  "account_status": 1,
  "currency": "USD",
  "timezone_name": "America/New_York"
}
```

`account_status` codes:

| Code | Status |
|------|--------|
| 1 | ACTIVE |
| 2 | DISABLED |
| 3 | UNSETTLED (billing issue) |
| 7 | PENDING_REVIEW |
| 9 | IN_GRACE_PERIOD |
| 100 | PENDING_CLOSURE |
| 101 | CLOSED |

Status 1 required for ad delivery. Any other status = investigate in Business Manager.

---

## Step 4: Verify Pixel Access

```bash
curl "https://graph.facebook.com/v21.0/{PIXEL_ID}?fields=id,name,is_unavailable&access_token={ACCESS_TOKEN}"
```

If `is_unavailable: true`, the token doesn't have access to this pixel. Add the System User to the Pixel in Events Manager > Settings.

---

## Token Exchange: Short-Lived → Long-Lived

Short-lived user tokens (from OAuth) expire in 1-2 hours. Exchange for 60-day long-lived tokens server-side.

```bash
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

Response:
```json
{
  "access_token": "EAAG...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

For production, prefer System User tokens (never expire) over the exchange flow.

---

## System User Token Setup

System Users are service accounts in Business Manager — not tied to any individual's personal Facebook account.

1. Business Manager > Business Settings > System Users
2. Create System User with "Admin" role
3. Add System User to Ad Account with appropriate role
4. Generate token → select app → select scopes
5. Copy token (shown once — save immediately)

System User tokens: no expiry, stable, ideal for automated server-side operations.

---

## Error Reference

| Error Code | Message | Fix |
|------------|---------|-----|
| 190 | Invalid OAuth 2.0 Access Token | Token expired or revoked — regenerate |
| 102 | Session key invalid or no longer valid | Token revoked — regenerate |
| 200 | Permission error | Token missing required scope — regenerate with correct scopes |
| 17 | User request limit reached | Rate limited — back off and retry |
| 100 | Invalid parameter | Bad request format — check API version and params |
| 803 | Object not found | Wrong ID or token doesn't have access to this resource |

---

## API Version Check

Meta deprecates API versions on an 18-month cycle. Always target the latest stable version.

```bash
# Check what versions are available
curl "https://graph.facebook.com/v21.0/?access_token={ACCESS_TOKEN}"
```

Search your codebase for old version strings:

```bash
grep -r "graph.facebook.com/v" src/
```

Current minimum: v21.0. Versions v19.0 and below are deprecated.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using personal user token in production | Switch to System User token — never expires, not tied to a person |
| `debug_token` with Authorization header | This endpoint requires token as query param: `?input_token=...&access_token=...` |
| Ad account ID without `act_` prefix | Most ad account endpoints need `act_{ID}` — code should prepend it |
| Token has all scopes but wrong Business Manager | System User must be added to the ad account explicitly |
| Sharing one token across environments | Use separate System Users for dev/staging/prod |
| Not saving System User token | Shown only once — copy immediately, store in secrets manager |
| Old API version in code | Search for `graph.facebook.com/v` — update anything below v21.0 |
| Ignoring `expires_at` in debug_token response | Set up expiry alerts for non-System-User tokens |

---

## Related Skills

- `meta-ads` — Campaign management after auth is confirmed
- `meta-audiences` — Audience operations requiring `business_management` scope
- `meta-conversions` — CAPI setup requiring pixel access
