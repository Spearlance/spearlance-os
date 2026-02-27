---
model: claude-sonnet-4-6
name: server-side-tracking
description: Use when implementing server-side tracking, building a unified /api/track endpoint, setting up Conversions API fan-out to Meta/GA4/Pinterest/PostHog, configuring consent management, or implementing PII hashing. Also use when debugging event deduplication, attribution models, or CAPI health.
---

# Server-Side Tracking

your friendly armadillo is here to serve you

The crown jewel of the growth stack. A single `/api/track` endpoint receives every conversion event, enriches it with server-side data, enforces consent, hashes PII, and fans out to every platform in parallel. No ad blockers. No cookie drift. No scattered pixels. One source of truth.

---

## 1. Architecture

```
Client Event
    │
    ├── Browser pixel fires (Meta, Google Tag, Pinterest Tag, PostHog JS)
    │     event_id generated on client for deduplication
    │
    └── POST /api/track (sendBeacon or fetch)
          │
          ├── Parse body (text/plain for sendBeacon, application/json for fetch)
          ├── Extract enrichment (cookies.ts)
          │     fbp, fbc, _ga, _ga_session_*, _gcl_aw, _epik, _pin_unauth, IP, UA
          │
          ├── Check consent (consent.ts)
          │     Sec-GPC: 1 header → blocks marketing tier immediately
          │     _consent cookie → per-platform granularity
          │
          ├── Hash PII (hash.ts)
          │     email → SHA-256 (lowercase, trim, Gmail-normalized)
          │     phone → SHA-256 (E.164 digits only)
          │
          ├── Store event in DB (data integrity first)
          │
          └── Platform fan-out via Promise.allSettled()
                ├── GA4 Measurement Protocol  (analytics tier — always fires)
                ├── PostHog server SDK         (analytics tier — always fires)
                ├── Meta CAPI                  (marketing tier — GPC-gated)
                ├── Pinterest CAPI             (marketing tier — GPC-gated)
                └── Google Ads                 (marketing tier — daily cron batch)

→ Always returns HTTP 200. Tracking never breaks UX.
```

### Why server-side wins over pixels-only

| Factor | Browser Pixel | Server-Side CAPI |
|--------|--------------|-----------------|
| Ad blockers | Blocked ~40% of traffic | Never blocked |
| ITP / cookie restrictions | Degrades daily | First-party server context |
| PII control | Exposed in browser | Hashed before leaving server |
| Attribution reliability | Depends on cookie survival | GCLID/FBCLID stored server-side |
| Single source of truth | No — N pixel implementations | Yes — one endpoint, all platforms |
| Event deduplication | Hard | Trivial — shared `event_id` |

---

## 2. Tracking Pipeline

### Cookie Extraction

Every tracking platform drops a first-party cookie. Extract them all server-side from the `Cookie` header:

| Cookie | Platform | Purpose |
|--------|----------|---------|
| `_fbp` | Meta | Browser ID (persists across sessions) |
| `_fbc` | Meta | Click ID (set from `fbclid` URL param) |
| `_ga` | GA4 | Client ID (`GA1.1.{random}.{timestamp}`) |
| `_ga_XXXXX` | GA4 | Session cookie (GS1 or GS2 format) |
| `_gcl_aw` | Google Ads | GCLID click ID |
| `_epik` | Pinterest | Pinterest click ID |
| `_pin_unauth` | Pinterest | Partner ID for anonymous matching |
| `_consent` | Custom | Consent cookie (`analytics=1;marketing=1`) |

**GA session cookie format changed May 2025.** Parse both:
- **GS1** (pre-May 2025): `GS1.1.{session_id}.{count}...` → extract `parts[2]`
- **GS2** (May 2025+): `GS2.1.s{session_id}$o{count}...` → extract `sMatch[1]` from `/s(\d+)/`

**GCLID extraction** handles two `_gcl_aw` formats:
- Raw GCLID (custom capture): use value directly
- gtag.js format `GCL.{version}.{timestamp}.{gclid}`: extract last segment

**IP extraction priority chain:**
```
x-forwarded-for (first IP in comma-separated list)
  → cf-connecting-ip (Cloudflare)
  → x-real-ip
  → null
```

### PII Hashing

SHA-256 before anything leaves the server. Non-negotiable.

**Email normalization** (critical for match rate):
1. `toLowerCase().trim()`
2. Gmail-specific: strip dots from local part, strip `+alias`
   - `John.Doe+work@gmail.com` → `johndoe@gmail.com`
3. Hash the normalized form

**Gmail EMQ trick for Meta:** Send both the dot-stripped hash AND the raw-lowercase hash. Meta's pixel JS doesn't strip dots, so sending both maximizes match rate. Store as array: `userData.em = [hashRaw(withDots), hashRaw(withoutDots)]`.

**Phone normalization:**
1. Strip all non-digits
2. If 10 digits → prepend `1` (US default)
3. If 11 digits starting with `1` → use as-is
4. Hash the E.164 digit string (no `+` prefix)

**GA4 synthetic client_id:** When `_ga` cookie is absent (new user, cookie blocked), generate a deterministic synthetic ID: SHA-256 of `{ip}.{ua}`, formatted as `{uint32}.{unix_timestamp}`. Matches GA4's `{random}.{timestamp}` format.

---

## 3. Consent Framework

Two-tier model. Consent is checked **before** any platform call.

### Tiers

| Platform | Tier | GPC Blocks? | Legal Basis |
|----------|------|-------------|-------------|
| GA4 (basic events) | analytics | No | Legitimate interest |
| PostHog | analytics | No | Legitimate interest |
| GA4 (Enhanced Conversions user_data) | marketing | Yes | Consent required |
| Meta CAPI | marketing | Yes | Consent required |
| Pinterest CAPI | marketing | Yes | Consent required |
| Google Ads | marketing | Yes | Consent required |

### GPC Signal

`Sec-GPC: 1` header → `marketing = false`. Required in 12 US states (CA, CO, CT, MT, OR, TX, UT, VA, DE, IA, NB, NH). Honor it globally — it's the right call and doesn't hurt analytics.

```typescript
const gpc = request.headers.get('Sec-GPC') === '1';
if (gpc) marketing = false;
```

### Consent Cookie Format

```
_consent=analytics=1;marketing=1
```

Parse with:
```typescript
const parts = Object.fromEntries(
  consentCookie.split(';').map(p => {
    const [k, v] = p.trim().split('=');
    return [k, v];
  })
);
analytics = parts['analytics'] !== '0';
marketing = parts['marketing'] !== '0';
```

### GA4 Split

GA4 is special — basic events always fire (analytics tier), but Enhanced Conversions `user_data` (email/phone hashes) only sends with marketing consent:

```typescript
const ga4Event = consent.marketing
  ? enrichedEvent
  : { ...enrichedEvent, email: undefined, phone: undefined };
```

---

## 4. Platform Fan-Out

All platforms fired via `Promise.allSettled()`. One platform going down never blocks the response or breaks other platforms.

```typescript
await Promise.allSettled(platformPromises);
// Always return 200 after — even if all platforms failed
```

### Meta CAPI

**Endpoint:** `POST https://graph.facebook.com/{api_version}/{pixel_id}/events?access_token={token}`

**Key requirements:**
- `event_id` matches client-side Pixel event for dedup (48-hour window)
- `action_source: 'website'`
- `event_time`: Unix timestamp (seconds)
- `user_data.em`: array of SHA-256 hashes — send both Gmail variants
- `user_data.ph`: array with single hash
- `user_data.fbp` / `user_data.fbc`: raw cookie values (not hashed)
- EMQ target ≥ 6.0 requires: `em`, `ph`, `ip`, `ua`, `fbp`, `fbc`

**Test events:** Set `test_event_code` in payload during development. View in Events Manager → Test Events tab.

**Event name mapping:**

| Internal | Meta Standard |
|----------|--------------|
| `Lead` | `Lead` |
| `Schedule` | `Schedule` |
| `Contact` | `Contact` |
| `CompleteRegistration` | `CompleteRegistration` |
| `ViewContent` | `ViewContent` |
| `Purchase` | `Purchase` |

### GA4 Measurement Protocol

**Endpoint:** `POST https://www.google-analytics.com/mp/collect?measurement_id={id}&api_secret={secret}`

**Non-negotiable required fields** (events invisible in reports without them):
- `client_id`: from `_ga` cookie or synthetic fallback
- `engagement_time_msec`: must be `> 0` (use `100`)
- `session_id`: from `_ga_session_*` cookie or `Date.now().toString()`

**Enhanced Conversions user_data** (only with marketing consent):
```typescript
payload.user_data = {
  sha256_email_address: [hashEmail(email)],
  sha256_phone_number: [hashPhone(phone)],
};
```

**Event name mapping:**

| Internal | GA4 |
|----------|-----|
| `Lead` | `generate_lead` |
| `Schedule` | `book_appointment` |
| `Contact` | `contact_form_submit` |
| `CompleteRegistration` | `sign_up` |
| `ViewContent` | `page_view` |
| `Purchase` | `purchase` |

### Pinterest CAPI v5

**Endpoint:** `POST https://api.pinterest.com/v5/ad_accounts/{ad_account_id}/events`
**Auth:** `Authorization: Bearer {access_token}`

**Key requirements:**
- Event names use **underscore format**: `lead`, `page_visit`, `signup` — NOT `Lead`, `PageView`
- `_epik` cookie → `user_data.click_id` (click attribution)
- `_pin_unauth` cookie → `user_data.partner_id` (anonymous matching)
- **Skip the API call entirely if no user identifiers** — saves quota and avoids empty-user errors
- Tokens are 60-day continuous refresh (May 2025+) — monitor expiry

**Event name mapping:**

| Internal | Pinterest |
|----------|-----------|
| `Lead` | `lead` |
| `Schedule` | `lead` |
| `Contact` | `lead` |
| `CompleteRegistration` | `signup` |
| `ViewContent` | `page_visit` |
| `Purchase` | `checkout` |

### PostHog Server SDK

**Package:** `posthog-node`

**Serverless config** — critical for Vercel/edge functions:
```typescript
new PostHog(apiKey, {
  host: 'https://us.i.posthog.com',
  flushAt: 1,        // flush after every event
  flushInterval: 0,  // don't wait for interval
  disableGeoip: true // privacy — don't resolve IP to location
});
```

Call `await ph.flush()` after every capture. Serverless functions terminate after response — unflushed events are lost.

**distinctId:** Use `hashEmail(email)` when email present, else `event_id`. Never use `'anonymous'` — it merges all unknown users into one person in PostHog.

**Event name mapping:**

| Internal | PostHog |
|----------|---------|
| `Lead` | `contact_form_submitted` |
| `Schedule` | `appointment_booked` |
| `Contact` | `phone_clicked` |
| `CompleteRegistration` | `newsletter_signup_completed` |
| `ViewContent` | `page_viewed` |
| `Purchase` | `purchase_completed` |

### Google Ads

Google Ads conversions upload via **daily batch cron** — not real-time. Reason: avoids double-counting and matches Google's recommendation for offline conversion imports.

Pattern:
1. `/api/track` stores `gclid` in `ConversionEvents` table with `uploaded_to_ads: false`
2. `/api/cron/ads-conversion-upload` runs daily at 4 AM UTC
3. Cron queries unuploaded events, uploads via `UploadClickConversions` REST API
4. Marks rows `uploaded_to_ads: true`

---

## 5. Event Taxonomy

Standard events across all platforms:

| Event | Meta | GA4 | Pinterest | PostHog |
|-------|------|-----|-----------|---------|
| PageView | `ViewContent` | `page_view` | `page_visit` | `page_viewed` |
| Lead | `Lead` | `generate_lead` | `lead` | `contact_form_submitted` |
| Contact | `Contact` | `contact_form_submit` | `lead` | `phone_clicked` |
| Schedule | `Schedule` | `book_appointment` | `lead` | `appointment_booked` |
| Registration | `CompleteRegistration` | `sign_up` | `signup` | `newsletter_signup_completed` |
| Purchase | `Purchase` | `purchase` | `checkout` | `purchase_completed` |

**Custom data fields** (passed through to all platforms):
- `value`: numeric conversion value
- `currency`: ISO 4217 code (default `USD`)
- `appointment_type`: service/product identifier
- `order_id`: purchase order reference
- `utm_source`, `utm_medium`, `utm_campaign`: attribution params

**Service value fallback:** When client doesn't send `value`, look up from a `serviceValues` map keyed by `appointment_type`. Normalize the key: `toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`.

---

## 6. Attribution

Four models in `src/lib/attribution/engine.ts`:

| Model | Credit | Use Case |
|-------|--------|----------|
| First Click | 100% to first touchpoint | Top-of-funnel acquisition |
| Last Click | 100% to last touchpoint | Bottom-of-funnel conversion |
| Scientific | ≤7d window → first click; >7d window → last click | Adapts to conversion journey length |
| Linear | Equal split across all touchpoints | Full journey visibility |

### Identity Resolution

Anonymous → identified stitching when a user provides their email:

1. Visitor arrives → assigned anonymous ID via cookie
2. Touchpoints recorded under anonymous ID
3. User submits form with email
4. `stitchByEmail()` merges all prior touchpoints to hashed email identity
5. Attribution computed across the full joined journey

**Attributable events:** `ad_click`, `form_submit`, `phone_click`, `email_click`, `booking`
**Non-attributable:** `page_view` — collected but excluded from credit allocation

### Touchpoint DB Schema

```sql
touchpoints (
  id           TEXT PRIMARY KEY,
  session_id   TEXT,
  email_hash   TEXT,                    -- null until identity resolution
  event_type   TEXT,                    -- 'ad_click' | 'form_submit' | etc.
  source       TEXT,                    -- utm_source
  medium       TEXT,                    -- utm_medium
  campaign     TEXT,                    -- utm_campaign
  gclid        TEXT,
  fbclid       TEXT,
  timestamp    INTEGER,                 -- unix ms
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
)
```

---

## 7. Cron Infrastructure

| Cron | Schedule | Purpose |
|------|----------|---------|
| `compute-attribution` | Daily 3 AM UTC | Multi-touch attribution across all models |
| `ads-conversion-upload` | Daily 4 AM UTC | Batch upload GCLIDs to Google Ads |
| `meta-performance-sync` | Daily 6:30 AM UTC | Pull Meta ad performance metrics |
| `meta-capi-health` | Daily 7:30 AM UTC | Verify CAPI events reaching Meta |
| `pinterest-performance-sync` | Daily 7:15 AM UTC | Pull Pinterest ad performance metrics |
| `pinterest-capi-health` | Daily 8:30 AM UTC | Verify CAPI events reaching Pinterest |
| `data-retention` | Weekly Sun 2 AM UTC | Purge raw events >90 days, keep aggregates |

**Cron auth:** All cron endpoints require `Authorization: Bearer ${CRON_SECRET}`. Reject with 401 if missing.

**Data retention pattern:** Raw `ConversionEvents` rows → delete after 90 days. Attribution aggregates → keep indefinitely. Never delete `Touchpoints` used for active attribution windows.

---

## 8. Launch Checklist

### Meta CAPI
- [ ] `META_ACCESS_TOKEN` — System User token (long-lived, not user token)
- [ ] `META_PIXEL_ID` matches Events Manager
- [ ] Events Manager → Test Events tab shows test events (use `META_TEST_EVENT_CODE`)
- [ ] "Pixel + Server" icon appears in Events Manager (dedup working)
- [ ] EMQ score ≥ 6.0 in Events Manager → Event Match Quality
- [ ] `meta-capi-health` cron at 7:30 AM UTC ✓

### GA4 Measurement Protocol
- [ ] `GA4_API_SECRET` and `GA4_MEASUREMENT_ID` configured
- [ ] DebugView in GA4 shows server-side events in real time
- [ ] Enhanced Conversions only fires with marketing consent
- [ ] `client_id` present on every event (never null)

### Pinterest CAPI
- [ ] `PINTEREST_ACCESS_TOKEN` — 60-day token, monitor expiry date
- [ ] `PINTEREST_AD_ACCOUNT_ID` configured
- [ ] `_epik` cookie captured on landing (Pinterest tag required on site)
- [ ] Event names use underscore format (`lead`, `page_visit`, NOT `Lead`)
- [ ] Conversions API Events dashboard in Pinterest Ads shows events
- [ ] `pinterest-capi-health` cron at 8:30 AM UTC ✓

### PostHog
- [ ] `PUBLIC_POSTHOG_KEY` — same key for client and server SDK
- [ ] `flushAt: 1`, `flushInterval: 0`, `disableGeoip: true` set
- [ ] Live Events stream shows server-sourced events (`source: 'server'`)
- [ ] No raw email/phone in event properties

### Google Ads
- [ ] `GOOGLE_ADS_SA_KEY_JSON` service account JSON in env
- [ ] `GOOGLE_ADS_DEVELOPER_TOKEN` configured
- [ ] `ads-conversion-upload` cron at 4 AM UTC ✓
- [ ] Test conversion with a known GCLID
- [ ] Confirm `uploaded_to_ads: true` after cron run

### Cross-Platform
- [ ] GPC enforcement tested: `Sec-GPC: 1` header → Meta/Pinterest/Google Ads NOT called
- [ ] PII never appears in logs, Sentry, or error messages
- [ ] Dedup: same `event_id` on client + server → single conversion in each platform
- [ ] `sendBeacon` body parses correctly (text/plain → `JSON.parse(text)`)
- [ ] Always returns HTTP 200 — verified via error simulation
- [ ] All platform calls use `Promise.allSettled()` — verified one failure doesn't block others

---

## 9. Safety Gates

**Non-negotiable. Every implementation must enforce these.**

| Gate | Rule |
|------|------|
| Always 200 | `/api/track` returns HTTP 200 even on total failure. Tracking never breaks UX. |
| PII isolation | SHA-256 hash before any platform call. Raw email/phone never in logs, Sentry, or DB. |
| GPC enforcement | `Sec-GPC: 1` blocks all marketing-tier platforms. No exceptions. |
| `Promise.allSettled` | Platform fan-out must use `allSettled`, never `Promise.all`. One down = others still run. |
| `sendBeacon` parsing | Always check `content-type`. `sendBeacon` with `Blob` sends `text/plain` — must `JSON.parse(text)`. |
| Pinterest skip-empty | Skip Pinterest CAPI entirely when no user identifiers. Saves quota, avoids API errors. |
| Campaign PAUSED | All campaigns created in PAUSED status. Never auto-activate. |
| Budget ceiling | Daily spend cap enforced server-side before optimizer mutations. |
| Cron auth | `Authorization: Bearer ${CRON_SECRET}` required on all cron endpoints. |
| Token expiry | Pinterest 60-day tokens — set calendar reminder or automate refresh. |
| Meta event time | Events must be within 7 days. Meta rejects older events silently. |
| Google Ads batch | Upload via daily cron from DB — never real-time to avoid double-counting. |
