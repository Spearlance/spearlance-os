---
model: claude-sonnet-4-6
name: meta-conversions
description: Use when setting up Meta Conversions API (CAPI), implementing server-side event tracking, debugging event deduplication, monitoring EMQ scores, or creating custom conversion events. Also use when the Meta Pixel alone is insufficient due to browser restrictions or privacy settings.
---

# Meta Conversions

## Overview

Meta Conversions API (CAPI) sends events server-to-server, bypassing browser-based limitations (ad blockers, ITP, cookie restrictions) that degrade Pixel-only tracking. Running CAPI alongside the browser Pixel gives Meta the most complete signal for optimization and attribution.

**Key principle:** CAPI supplements the Pixel — it doesn't replace it. The combination maximizes Event Match Quality (EMQ) and gives Meta's algorithm the data it needs to find the right users.

---

## CAPI vs Pixel

| Aspect | Browser Pixel | Conversions API |
|--------|---------------|-----------------|
| Where it runs | User's browser | Your server |
| Ad blocker impact | Blocked frequently | Not blocked |
| Cookie dependency | High (ITP, SameSite) | None |
| Data richness | Client-side only | Server + client data |
| Setup complexity | Simple (snippet) | Requires server code |
| Latency | Immediate | Small server-side delay |

**Recommendation:** Use both. CAPI fills the gaps the Pixel misses.

---

## Event Flow

```
User Action (browser)
    ├── Browser Pixel fires → Meta (with event_id)
    └── Server receives form/API call
            └── CAPI sends event → Meta (with same event_id)
                        ↓
              Meta deduplicates by (event_name + event_id)
```

Deduplication window: 48 hours. Events with matching `event_name` + `event_id` within 48h are treated as one.

---

## Quick Reference

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Send CAPI event | `POST /{PIXEL_ID}/events` | Write |
| List custom conversions | `GET /act_{account_id}/customconversions` | Read |
| Create custom conversion | `POST /act_{account_id}/customconversions` | Write |
| Get pixel analytics | `GET /{PIXEL_ID}/stats` | Read |

Base URL: `https://graph.facebook.com/v21.0/`

---

## Sending a CAPI Event

```bash
POST https://graph.facebook.com/v21.0/{PIXEL_ID}/events
  ?access_token={ACCESS_TOKEN}

{
  "data": [{
    "event_name": "Lead",
    "event_time": 1700000000,
    "event_id": "unique-event-id-123",
    "action_source": "website",
    "event_source_url": "https://example.com/contact",
    "user_data": {
      "em": ["<sha256_hashed_email>"],
      "ph": ["<sha256_hashed_phone>"],
      "client_ip_address": "192.168.1.1",
      "client_user_agent": "Mozilla/5.0...",
      "fbp": "_fbp_cookie_value",
      "fbc": "_fbc_cookie_value"
    },
    "custom_data": {
      "value": 50.00,
      "currency": "USD"
    }
  }],
  "test_event_code": "TEST12345"
}
```

Remove `test_event_code` in production.

---

## Event Deduplication

The browser Pixel and CAPI must send the **same `event_id`** for the same user action.

### Browser Pixel (fbq)

```javascript
fbq('track', 'Lead', {}, { eventID: 'unique-event-id-123' });
```

### Server CAPI

```javascript
const payload = {
  event_name: 'Lead',
  event_id: 'unique-event-id-123', // Must match browser eventID exactly
  event_time: Math.floor(Date.now() / 1000),
  // ...
};
```

**Rules:**
- Generate `event_id` before the browser fires and pass it through
- Format: UUID or any unique string — must be the same value in both places
- 48-hour deduplication window — don't reuse IDs across different user sessions

---

## Event Match Quality (EMQ)

EMQ (0–10) measures how well Meta can match your events to real Facebook users. Higher EMQ = better optimization signal.

| Score | Rating | Impact |
|-------|--------|--------|
| 0–3 | Poor | Weak attribution, poor optimization |
| 4–6 | Okay | Acceptable — room to improve |
| 7–8 | Good | Strong matching |
| 9–10 | Great | Maximum signal quality |

### EMQ Parameters (by impact)

| Parameter | Field | Notes |
|-----------|-------|-------|
| Email | `em` | Highest impact — always include |
| Phone | `ph` | High impact — include when available |
| Client IP | `client_ip_address` | Forward from request headers |
| User Agent | `client_user_agent` | Forward from request headers |
| FBP cookie | `fbp` | `_fbp` cookie — identifies browser |
| FBC cookie | `fbc` | `_fbc` cookie — set from `fbclid` URL param |
| First name | `fn` | SHA-256 hashed, lowercase |
| Last name | `ln` | SHA-256 hashed, lowercase |
| External ID | `external_id` | Your internal user/lead ID |
| City | `ct` | SHA-256 hashed |
| State | `st` | 2-letter code, SHA-256 hashed |
| Zip | `zp` | SHA-256 hashed |

**To improve EMQ:** Add `fn`/`ln`, extract `_fbc` from URL params, forward IP and user agent from request context.

---

## PII Hashing

All user data fields must be SHA-256 hashed before sending. Never send raw PII to Meta.

```javascript
import crypto from 'crypto';

function hashValue(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

// Email: lowercase + trim
const hashedEmail = hashValue('User@Example.com'); // → hash of "user@example.com"

// Phone: E.164 format, digits only (no +, -, spaces)
const hashedPhone = hashValue('12125551234'); // E.164 without leading +
```

---

## Standard Events

| Event Name | Trigger | Common Fields |
|------------|---------|---------------|
| `PageView` | Every page load | — |
| `ViewContent` | Product/service page | `content_ids`, `content_type` |
| `Lead` | Form submission, inquiry | `value`, `currency` |
| `CompleteRegistration` | Account signup | — |
| `Purchase` | Payment completed | `value`, `currency`, `order_id` |
| `AddToCart` | Cart action | `value`, `currency`, `content_ids` |
| `InitiateCheckout` | Checkout start | `value`, `currency` |
| `Search` | Site search | `search_string` |

---

## Custom Conversions

Custom conversions let you define conversion rules based on URL patterns or standard events.

```bash
POST /act_{AD_ACCOUNT_ID}/customconversions
  name=Schedule Consultation
  event_source_id={PIXEL_ID}
  rule={"and":[{"event":{"eq":"Lead"}},{"url":{"contains":"thank-you"}}]}
  custom_event_type=LEAD
  value_settings={"default_value": 50}
  access_token={ACCESS_TOKEN}
```

Use custom conversions when you need to split a single standard event (e.g., `Lead`) into more specific campaign goals.

---

## Testing Events

1. Get a test event code from Events Manager > Test Events
2. Add `"test_event_code": "TEST12345"` to CAPI payload
3. Send the event
4. Check Events Manager > Diagnostics > Test Events — should appear within 20 seconds
5. Verify: event name, parameters, EMQ score, match quality indicators

Remove `test_event_code` before deploying to production.

---

## Monitoring & Diagnostics

```bash
# Check pixel stats (event volume)
GET /{PIXEL_ID}/stats
  ?start_time=1700000000
  &end_time=1700086400
  &aggregation=event_name
  &access_token={ACCESS_TOKEN}

# Check custom conversions
GET /act_{AD_ACCOUNT_ID}/customconversions
  ?fields=name,id,event_source_id,rule,creation_time,last_fired_time,stats
  &access_token={ACCESS_TOKEN}
```

Watch for: event volume dropping, EMQ score degradation, deduplication rate (indicates both Pixel + CAPI are firing for same events — that's correct).

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Sending raw PII (email, phone) | SHA-256 hash all PII — normalize first |
| Different `event_id` in Pixel vs CAPI | Generate ID before Pixel fires, pass same value to server |
| Missing `client_ip_address` / `client_user_agent` | Forward from HTTP request headers on every event |
| Not extracting `_fbc` cookie | Set from `fbclid` URL param on landing; read from cookie on form submit |
| Using `test_event_code` in production | Remove it — test events don't count toward attribution |
| `event_time` in milliseconds | Must be Unix timestamp in **seconds** |
| Ignoring EMQ below 6.0 | Add more user data fields to lift score |
| CAPI without Pixel | Run both — CAPI supplements, not replaces |
| Phone in wrong format | Use E.164 digits only: `12125551234` not `+1 (212) 555-1234` |

---

## Related Skills

- `meta-ads` — Campaign setup using conversion events as optimization goals
- `meta-audiences` — Pixel-based retargeting audiences
- `verify-meta-auth` — Token and pixel access verification
