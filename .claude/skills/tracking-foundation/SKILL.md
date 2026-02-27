---
model: claude-sonnet-4-6
name: tracking-foundation
description: Use when setting up the analytics and tracking stack for a site — GTM, GA4, PostHog, Clarity, server-side tracking, CAPI fan-out, and attribution. Also use when the user says "set up tracking" or "analytics stack".
---

# Tracking Foundation

## Overview

Everything else depends on this. SEO audits, CRO analysis, performance monitoring — all of it is built on analytics data. If that data is wrong, every downstream decision is wrong.

This orchestrator builds the complete analytics and tracking foundation from scratch or repairs an existing broken one. Six sequential phases, each building on the previous. Don't skip phases. Don't run Phase 4 without Phase 2.

**Total time:** 3–4 hours for a clean install. 4–6 hours if repairing existing partial setup.

---

## Phase 1: Audit Current State

**Time:** 15–30 min

Invoke `server-side-tracking` in audit mode — what exists, what's broken, what's missing.

### Audit Checklist

| Item | Check | Status |
|------|-------|--------|
| GTM container | Present and loading on all pages? | ○ |
| GA4 property | Configured and receiving data in DebugView? | ○ |
| PostHog project | Set up with SDK installed? | ○ |
| Microsoft Clarity | Installed and consent-gated? | ○ |
| Server-side endpoint | `/api/track` or equivalent exists? | ○ |
| CAPI fan-out | Configured for each active ad platform? | ○ |
| Consent management | CMP or Consent Mode v2 in place? | ○ |

### Classify Each Item

```
Green   — Working correctly, no action needed
Yellow  — Partial / misconfigured, needs repair
Red     — Missing entirely or broken, needs build
```

### Audit Output

```
Tracking Audit — [Site] — [Date]

GTM                ●Green / ●Yellow / ●Red   [notes]
GA4                ●Green / ●Yellow / ●Red   [notes]
PostHog            ●Green / ●Yellow / ●Red   [notes]
Clarity            ●Green / ●Yellow / ●Red   [notes]
Server-side        ●Green / ●Yellow / ●Red   [notes]
CAPI fan-out       ●Green / ●Yellow / ●Red   [notes]
Consent            ●Green / ●Yellow / ●Red   [notes]

Recommended path: [Full install / Repair existing / Skip to Phase N]
```

If everything is Green, skip to Phase 6 (Verification) to confirm and document.

---

## Phase 2: Tag Management

**Time:** 30–45 min

Invoke `google-tag-manager` reference skill for GTM container and data layer setup.

### GTM Container Setup

- Web container: install snippet in `<head>` (async) + `<body>` (noscript)
- Server-side container: provision GTM server if running server-side tagging
- Publish to Production environment — never leave on Default/Staging

### Data Layer Events

Configure push events for every meaningful user action:

```javascript
// Standard data layer events — implement all of these
dataLayer.push({ event: 'page_view', page_path: window.location.pathname })
dataLayer.push({ event: 'form_submit', form_id: 'contact-form', form_name: 'Contact' })
dataLayer.push({ event: 'phone_click', phone_number: '+1...' })
dataLayer.push({ event: 'chat_open', chat_provider: 'provider-name' })
dataLayer.push({ event: 'scroll_depth', percent_scrolled: 90 })
dataLayer.push({ event: 'file_download', file_name: 'brochure.pdf', file_type: 'pdf' })
```

### Consent Mode v2

Configure before any marketing tags fire:

```javascript
// Default — analytics on, marketing blocked until consent
gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 2000,
})
```

### Tag Sequencing

Order matters — set tag firing priorities in GTM:

```
1. Consent Mode initialization (priority: 100)
2. GA4 Configuration tag (priority: 90)
3. PostHog initialization (priority: 80)
4. Marketing tags — Meta Pixel, Google Ads (priority: 50, consent-gated)
```

Marketing tags must have a consent trigger: fire only when `ad_storage = 'granted'`.

---

## Phase 3: Analytics Layer

**Time:** 30–45 min

All three platforms can be configured in parallel.

### GA4 — invoke `ga4-api`

- Property created, data stream configured
- Measurement ID matches GTM tag
- Enhanced measurement: page views, scrolls, outbound clicks, file downloads, video engagement
- Custom events registered as conversions: `form_submit`, `phone_click`, `generate_lead`
- Audiences: all visitors, converters, high-intent (scroll 90% + 2+ pages), remarketing
- Internal traffic filter: exclude developer IPs
- Bot filtering enabled in data stream settings

### PostHog — invoke `posthog`

- Project created, API key in environment variables
- SDK installed via GTM or direct script tag
- Autocapture enabled (captures clicks, form changes, pageviews automatically)
- Custom events: call `posthog.capture('form_submit', { form_id: '...' })` on conversion events
- Session replay: enabled with PII masking (mask inputs, blur sensitive fields)
- Feature flags: set up for A/B testing infrastructure even if no active experiments

### Microsoft Clarity — invoke `microsoft-clarity`

- Project created in Clarity dashboard
- Consent Mode v2 integration configured (Clarity respects `analytics_storage`)
- Smart Events: auto-configured for rage clicks, dead clicks, excessive scrolling
- Session recordings: confirm PII masking is active before enabling
- Project ID in environment variables, never hardcoded

### Verify All Three

After setup, trigger test events and confirm in each platform's real-time view:

```
GA4 DebugView     → page_view firing?     ✓/✗
PostHog Live      → $pageview firing?      ✓/✗
Clarity dashboard → sessions recording?   ✓/✗
```

---

## Phase 4: Conversion Pipeline

**Time:** 60–90 min

This is the most critical and complex phase. Build the `/api/track` endpoint that receives client events and fans them out to all active ad platforms server-side.

Invoke `server-side-tracking` for implementation guidance.

### Architecture

```
Client event
    │
    ▼
/api/track endpoint
    │
    ├─ Parse event payload
    ├─ Check consent (analytics vs marketing tier)
    ├─ SHA-256 hash PII (email, phone, name)
    │
    ▼
Parallel fan-out:
    ├─ GA4 Measurement Protocol      (always — analytics tier)
    ├─ PostHog server SDK             (always — analytics tier)
    ├─ Meta CAPI                      (if Meta ads active + marketing consent)
    ├─ Pinterest CAPI                 (if Pinterest ads active + marketing consent)
    └─ Google Ads                     (batch cron — not real-time)
```

### Endpoint Implementation

```typescript
// /api/track — skeleton
export async function POST(req: Request) {
  const { event, properties, consent, user } = await req.json()

  // Two-tier consent check
  const analyticsConsent = consent?.analytics !== false   // default: true
  const marketingConsent = consent?.marketing === true    // default: false

  // Hash PII before any platform sends
  const hashedEmail = user?.email ? sha256(user.email.trim().toLowerCase()) : undefined
  const hashedPhone = user?.phone ? sha256(normalizePhone(user.phone)) : undefined

  // Generate shared event_id for deduplication
  const eventId = `${event}_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const results = await Promise.allSettled([
    // Analytics tier — always fires with consent
    analyticsConsent && sendGA4(event, properties, eventId),
    analyticsConsent && sendPostHog(event, properties, eventId),

    // Marketing tier — requires explicit consent
    marketingConsent && isMetaActive() && sendMetaCAPI(event, hashedEmail, hashedPhone, eventId),
    marketingConsent && isPinterestActive() && sendPinterestCAPI(event, hashedEmail, hashedPhone, eventId),
  ])

  // Log failures — one platform failing must not break others
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Fan-out[${i}] failed:`, r.reason)
  })

  return Response.json({ ok: true, eventId })
}
```

### Two-Tier Consent

```
Analytics tier (analytics_storage = granted OR default):
  → GA4, PostHog, Clarity

Marketing tier (ad_storage = granted, explicit opt-in):
  → Meta CAPI, Pinterest CAPI, Google Ads
```

Never send to marketing platforms without explicit `ad_storage: granted`.

### Event Deduplication

Every event must carry the same `event_id` on both client and server sides:

```javascript
// Client — fire with event_id
fbq('track', 'Lead', {}, { eventID: eventId })          // Meta Pixel
dataLayer.push({ event: 'form_submit', eventId })        // GA4 via GTM

// Server — send same event_id
await sendMetaCAPI({ event_id: eventId, ... })           // Meta CAPI
await sendGA4Measurement({ client_id, event_id: eventId }) // GA4 MP
```

Same `event_id` on client + server = platform deduplicates automatically = no double-counting.

### PII Handling

Before sending to any ad platform:

```typescript
import { createHash } from 'crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// Normalize before hashing
const email = user.email.trim().toLowerCase()
const phone = user.phone.replace(/\D/g, '')  // digits only, then E.164

// Always hash — never send raw PII to ad platforms
const em = sha256(email)
const ph = sha256(`+1${phone}`)  // E.164 format
```

### Google Ads — Batch Cron

Google Ads Enhanced Conversions uses offline conversion upload, not real-time. Set up a cron job:

```typescript
// cron: every 4 hours
// Read conversion events from DB, batch upload to Google Ads API
await googleAdsClient.uploadClickConversions(conversions)
```

Store conversion data in your DB at event time. Upload in batches via cron.

---

## Phase 5: Attribution

**Time:** 30–45 min

Invoke `server-side-tracking` for identity resolution and attribution implementation.

### First-Party Identity

Set a first-party cookie on first visit for cross-session identity. This survives ITP/ETP where third-party cookies don't:

```typescript
// Set on first visit — httpOnly, 1-year expiry, SameSite=Lax
const visitorId = req.cookies.get('vid')?.value ?? generateId()
res.cookies.set('vid', visitorId, { maxAge: 31536000, httpOnly: true, sameSite: 'lax' })
```

Pass `visitorId` as `client_id` to GA4 Measurement Protocol for cross-session joining.

### UTM Capture

Capture and store UTM parameters on landing. Persist across the session:

```javascript
// On page load — capture and store in sessionStorage
const params = new URLSearchParams(window.location.search)
const utm = {
  source: params.get('utm_source'),
  medium: params.get('utm_medium'),
  campaign: params.get('utm_campaign'),
  term: params.get('utm_term'),
  content: params.get('utm_content'),
}
if (utm.source) sessionStorage.setItem('utm', JSON.stringify(utm))

// On conversion — attach stored UTM to event payload
const storedUtm = JSON.parse(sessionStorage.getItem('utm') ?? '{}')
await fetch('/api/track', { body: JSON.stringify({ event: 'form_submit', utm: storedUtm }) })
```

### Click ID Capture

Ad platform click IDs enable server-side attribution:

```javascript
const fbclid = params.get('fbclid')   // Meta — expires 7 days
const gclid  = params.get('gclid')    // Google Ads — expires 90 days
const epik   = params.get('epik')     // Pinterest — expires 180 days

// Store in cookie — platform-specific expiry
if (fbclid) res.cookies.set('_fbc', `fb.1.${Date.now()}.${fbclid}`, { maxAge: 604800 })
if (gclid)  res.cookies.set('_gcl_aw', gclid, { maxAge: 7776000 })
```

Send `_fbc` and `_fbp` cookies to Meta CAPI. Send `gclid` with Google Ads conversions.

### Attribution Model

```
First-touch    — credit the channel that brought the user first (awareness campaigns)
Last-touch     — credit the channel present at conversion (direct response campaigns)
```

Default: capture both. Store first-touch UTM in a cookie (long-lived), last-touch in sessionStorage. Report both to analytics for model comparison.

### Server-Side Attribution Events

When `/api/track` receives a conversion event, augment with attribution data before sending:

```typescript
const attribution = {
  utm_source: req.cookies.get('utm_source')?.value,
  utm_medium: req.cookies.get('utm_medium')?.value,
  utm_campaign: req.cookies.get('utm_campaign')?.value,
  fbclid: req.cookies.get('_fbc')?.value,
  gclid: req.cookies.get('_gcl_aw')?.value,
}
// Attach attribution to all platform sends
await sendGA4({ ...event, ...attribution })
await sendMetaCAPI({ ...event, fbc: attribution.fbclid })
```

---

## Phase 6: Verification

**Time:** 30–45 min

Invoke `server-side-tracking` launch checklist. Run every check before declaring the foundation live.

### Platform Verification

| Check | Method | Expected |
|-------|--------|----------|
| GA4 receiving events | GA4 DebugView | page_view, form_submit visible |
| PostHog receiving events | PostHog Live Events | $pageview visible |
| Meta CAPI sending | Meta Events Manager → Test Events | Events appear within 60s |
| Pinterest CAPI sending | Pinterest Tag Helper | Server events matching client |
| Clarity recording | Clarity dashboard | Sessions appearing |
| Google Ads cron | Check cron logs | No errors in upload job |

### Deduplication Verification

Fire a test event with a known `event_id`. Check each platform:

```
Meta Events Manager → Event deduplication log → Same event_id = 1 event counted
GA4 → Debug mode → event_count = 1 per session
```

If you see 2x counts, dedup is broken — `event_id` mismatch between client and server.

### Consent Enforcement Verification

Test all three consent states:

| Scenario | Analytics fires? | Marketing fires? | Pass? |
|----------|----------------|-----------------|-------|
| No consent given | ✓ (default granted) | ✗ blocked | ○ |
| Analytics only | ✓ | ✗ blocked | ○ |
| Full consent granted | ✓ | ✓ | ○ |

Test by manipulating `ad_storage` consent state in GTM Preview mode.

### PII Hash Verification

Confirm hash format per platform before going live:

```
Meta CAPI    → SHA-256, lowercase hex, no salt
Pinterest    → SHA-256, lowercase hex, no salt
GA4 MP       → SHA-256 optional — GA4 uses unhashed client_id, not email
```

Test with a known email. Hash it manually and confirm the value matches what the endpoint sends.

### Cron Schedule Confirmation

```bash
# Verify cron is scheduled
crontab -l | grep google-ads

# Verify last run
cat /var/log/google-ads-upload.log | tail -20
```

### Error Handling Test

Simulate a platform failure. Confirm:
- `/api/track` returns `{ ok: true }` — not an error
- Other platforms still receive the event
- Failure is logged but doesn't block the response

### End-to-End Data Flow

Trace one complete event from browser to dashboard:

```
1. Browser fires form_submit event
2. GTM tag fires → GA4 client-side event
3. GTM tag fires → fetch('/api/track', { event: 'form_submit', ... })
4. /api/track fans out to all platforms
5. Wait 2 min
6. GA4 DebugView → form_submit appears ✓
7. PostHog Live → form_submit appears ✓
8. Meta Events Manager → Lead event appears ✓
9. Pinterest → Checkout/Lead event appears ✓
```

---

## Deliverables

After all 6 phases complete:

```
/api/track endpoint        ✓  built and deployed
GTM container              ✓  published to Production
GA4 property               ✓  receiving events, conversions configured
PostHog project            ✓  SDK installed, session replay active
Microsoft Clarity          ✓  consent-gated, Smart Events on
Meta CAPI                  ✓  (if Meta ads active)
Pinterest CAPI             ✓  (if Pinterest ads active)
Google Ads cron            ✓  (if Google Ads active)
Attribution pipeline       ✓  UTMs, click IDs, first-party cookie
```

CAPI health passing:
- Meta: Events Manager shows green status, match quality ≥ 6.0
- Pinterest: Tag Helper shows server events, EMQ score reported
- GA4: DebugView clean, no duplicate events

---

## Tracking Health Dashboard

Document the live state after Phase 6. Update monthly.

```markdown
## Tracking Foundation — [Site Name] — [Date]

### Platform Status
| Platform       | Status | Events/day | Last Event | Health |
|----------------|--------|-----------|-----------|--------|
| GA4            | live   | ...       | ...       | ✓      |
| PostHog        | live   | ...       | ...       | ✓      |
| Clarity        | live   | ...       | ...       | ✓      |
| Meta CAPI      | live   | ...       | ...       | ✓      |
| Pinterest CAPI | live   | ...       | ...       | ✓      |
| Google Ads     | cron   | ...       | ...       | ✓      |

### Consent Health
| Scenario         | Analytics | Marketing  | Status |
|------------------|-----------|------------|--------|
| No consent       | ✓ fires   | ✗ blocked  | ✓      |
| Analytics only   | ✓ fires   | ✗ blocked  | ✓      |
| Full consent     | ✓ fires   | ✓ fires    | ✓      |

### Event Dedup
| Event       | Client event_id | Server event_id | Match? |
|-------------|-----------------|-----------------|--------|
| page_view   | ...             | ...             | ✓      |
| form_submit | ...             | ...             | ✓      |
| phone_click | ...             | ...             | ✓      |
```

---

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Double-counted conversions | `event_id` mismatch client/server | Ensure same ID sent to client pixel and server fan-out |
| Marketing events firing without consent | Consent check missing in `/api/track` | Add tier check before platform send |
| Meta match quality < 6.0 | Missing or unhashed PII | Add email + phone, normalize before SHA-256 |
| GA4 missing server events | Measurement Protocol secret wrong | Verify `MEASUREMENT_PROTOCOL_API_SECRET` env var |
| Google Ads cron not uploading | Conversion action ID wrong | Re-check conversion action ID in Google Ads UI |
| Clarity not recording | Consent mode blocking | Confirm `analytics_storage: granted` default |
| fbclid not captured | Cookie set after redirect | Set `_fbc` cookie server-side on first request |
| UTMs lost after checkout redirect | sessionStorage cleared | Store UTMs in first-party cookie instead |

---

## Related Skills

- `server-side-tracking` — `/api/track` implementation, CAPI fan-out, Measurement Protocol
- `google-tag-manager` — GTM container, data layer, Consent Mode v2
- `ga4-api` — GA4 property setup, custom events, Data API
- `posthog` — PostHog SDK, session replay, feature flags
- `microsoft-clarity` — Clarity project, Smart Events, consent integration
- `meta-conversions` — Meta CAPI implementation, match quality, test events
- `pinterest-ads` — Pinterest CAPI, EMQ score, OAuth refresh
