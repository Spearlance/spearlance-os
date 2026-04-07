# SOS Tracker v3 — Universal Pixel + Server-Side Fan-Out

**Date:** 2026-03-26
**Status:** Approved
**Author:** Garrett + Claude

## Problem

SOS Tracker captures page views and CWV but misses conversion events (forms, phone clicks). Form submissions arrive via a separate Duda webhook with no link to the ad click that drove them. No bot filtering exists. Result: can't prove ROI to clients or feed conversion data back to ad platforms.

## Goals

1. One script tag = all tracking (page views, CWV, conversions, click IDs)
2. Server-side fan-out to GA4, Google Ads, and future platforms (Meta, LinkedIn, Pinterest)
3. Bot filtering at both client and server level
4. Lightweight — under 4KB total, async, zero CWV impact
5. Simple onboarding — admin enters credentials once, client installs one script

## Architecture

```
Client Website (single script tag)
│
├─ SOS Tracker v3 (client-side, ~3.5KB)
│   ├─ Page views + CWV + engagement (existing)
│   ├─ Click ID capture: gclid, fbclid, msclkid, li_fat_id → sessionStorage
│   ├─ Duda form detection via dmAPI.subscribeEvent(FORM_SUBMISSION)
│   ├─ MutationObserver on .dmformSuccess (fallback for custom widgets)
│   ├─ Native <form> submit listener (non-Duda sites)
│   ├─ Phone click detection: a[href^="tel:"] click listener
│   └─ Bot pre-filter: navigator.webdriver, UA sniff → early exit
│
└─ POST → analytics-collector (server-side)
    ├─ Bot scoring (IAB UA list, rate limit, velocity, CWV presence)
    ├─ INSERT → web_events / cwv_metrics (existing)
    ├─ INSERT → conversion_events (form/phone with click IDs)
    ├─ Fan-out (non-bot, engaged sessions only):
    │   ├─ GA4 Measurement Protocol (existing)
    │   ├─ Google Ads Offline Conversions API
    │   └─ FUTURE: Meta CAPI, LinkedIn, Pinterest
    └─ Enrichment: when duda-form-webhook fires, match to session
         via page_url + timestamp window to attach gclid retroactively
```

## SOS Tracker v3 Client-Side Changes

### Click ID Capture

On page load, extract `gclid`, `fbclid`, `msclkid`, `li_fat_id` from URL params. Store in `sessionStorage` alongside existing session ID. Include in all event payloads sent to the collector.

### Duda Form Detection

Duda forms use AJAX submission — no native `<form>` submit event fires reliably. Three-layer detection:

1. **Primary — Duda API:** Check `typeof dmAPI !== 'undefined'`, then:
   ```javascript
   dmAPI.runOnReady('sos-tracker', function() {
     dmAPI.subscribeEvent(dmAPI.EVENTS.FORM_SUBMISSION, function(data) {
       // data = flat key-value of field labels → values
       // Send {t:'lead', src:'form'} event with stored click IDs
     });
   });
   ```
   `runOnReady` is required because Duda uses AJAX-based page navigation.

2. **Fallback — DOM Observer:** `MutationObserver` watching `.dmformSuccess` elements for visibility/style changes. Catches custom widgets that bypass `dmAPI.EVENTS.FORM_SUBMISSION`.

3. **Generic — Native Forms:** `addEventListener('submit')` on document (event delegation) for non-Duda forms. Catches standard HTML forms on any platform.

### Phone Click Detection

Single delegated click listener on `document`. When a click target matches `a[href^="tel:"]`, extract the phone number from the href and send `{t:'lead', src:'phone'}` event with stored click IDs.

### Bot Pre-Filter

Before sending any data, check:
- `navigator.webdriver === true` → exit, don't send
- UA matches `bot|crawl|spider|headless` → exit, don't send

These are cheap checks (~0.1ms). If bot detected, the entire script exits immediately.

### Weight Budget

| Feature | Size |
|---------|------|
| Current tracker | ~2.4KB |
| Click ID capture | +200 bytes |
| Bot pre-filter | +150 bytes |
| Phone click detection | +200 bytes |
| Duda form detection (dmAPI + MutationObserver + native) | +600 bytes |
| **Total v3** | **~3.5KB** |

For comparison: gtag.js is ~80KB, Meta Pixel ~60KB, Clarity ~45KB.

## Server-Side Bot Filtering

New module in `analytics-collector`:

| Check | Action | Threshold |
|-------|--------|-----------|
| IAB bot list UA match | `is_bot: true`, skip fan-out | Match = bot |
| IP hash rate limit | `is_bot: true`, skip fan-out | >100 events/min |
| Session velocity | `is_bot: true`, skip fan-out | >20 pageviews/60s |
| Missing CWV data | Lower trust score | No CWV = suspicious |
| Zero engagement (scroll=0, time=0) | Don't forward conversions | Required for conversion fan-out |

Bot events are stored (with `is_bot: true` flag) for analysis but excluded from dashboards and never forwarded to ad platforms.

## Database Changes

### New table: `conversion_events`

```sql
CREATE TABLE conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  session_id text NOT NULL,
  event_type text NOT NULL, -- 'form_submit', 'phone_click'
  gclid text,
  fbclid text,
  msclkid text,
  li_fat_id text,
  page_url text,
  created_at timestamptz DEFAULT now(),
  form_name text,
  phone_number text,
  forwarded_to jsonb DEFAULT '{}'::jsonb,
  is_bot boolean DEFAULT false,
  engagement_score numeric -- scroll + time composite
);
```

### New table: `google_ads_configs`

```sql
CREATE TABLE google_ads_configs (
  client_id uuid PRIMARY KEY REFERENCES clients(id),
  customer_id text NOT NULL, -- Google Ads Customer ID (xxx-xxx-xxxx)
  conversion_action_id text NOT NULL, -- Conversion action resource name
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Column addition: `web_events`

```sql
ALTER TABLE web_events ADD COLUMN is_bot boolean DEFAULT false;
ALTER TABLE web_events ADD COLUMN gclid text;
ALTER TABLE web_events ADD COLUMN fbclid text;
ALTER TABLE web_events ADD COLUMN msclkid text;
```

## Google Ads Offline Conversions

### Auth Strategy

Service account with domain-wide delegation. Set up once for Spearlance's Google Ads MCC (Manager account). All client accounts under the MCC can receive conversions through the same service account. No per-client OAuth needed.

Required Supabase secrets:
- `GOOGLE_ADS_SERVICE_ACCOUNT_JSON` — service account credentials
- `GOOGLE_ADS_DEVELOPER_TOKEN` — from Google Ads API Center
- `GOOGLE_ADS_MCC_ID` — Manager account ID

### Fan-Out Logic

1. Conversion event arrives with `gclid`
2. Check `is_bot: false` AND engagement > threshold
3. Validate gclid format (`/^[a-zA-Z0-9_-]+$/`) and age (< 90 days)
4. Deduplicate: one conversion per gclid per event type
5. Call Google Ads API `UploadOfflineConversions` with gclid + timestamp
6. Record result in `forwarded_to` jsonb column

## Session-to-Form Webhook Bridge

When `duda-form-webhook` fires, it has `page_url` and `submitted_at` but no `gclid`.

**Primary path:** SOS tracker detects the form client-side via `dmAPI` and sends the `lead` event with gclid directly. No matching needed.

**Fallback:** If the tracker missed it (JS blocked, race condition), the webhook handler queries `web_events` for the most recent session on that page URL within a 5-minute window, pulls the gclid from that session, and creates the `conversion_events` record.

## Integrations Tab Changes

### Admin view
- GA4 config stays as-is (Measurement ID + API Secret)
- New "Google Ads" card: enter Customer ID + Conversion Action ID
- Google Ads auth uses shared service account (configured once in Supabase secrets)
- Future: Meta CAPI, LinkedIn, Pinterest cards (same pattern)

### Client view
- Connection status badges only (green/red)
- Never see or enter credentials
- One script tag is all they install

## Implementation Phases

### Phase 1 — SOS Tracker v3 + Bot Filtering
- Click ID capture (gclid/fbclid/msclkid/li_fat_id)
- Duda form detection (dmAPI + MutationObserver + native)
- Phone click detection
- Client-side bot pre-filter
- Server-side bot scoring in analytics-collector
- `conversion_events` table + RLS
- `is_bot` + click ID columns on `web_events`
- Update SOS tracker script served by edge function

### Phase 2 — Google Ads Offline Conversions
- `google_ads_configs` table + RLS
- Service account auth setup
- Fan-out from analytics-collector to Google Ads API
- Admin UI card for Google Ads config
- Session-to-form webhook bridge (fallback matching in duda-form-webhook)
- Deduplication logic

### Phase 3 — Meta CAPI + Others (Future)
- `meta_capi_configs` table (Pixel ID + Access Token)
- Forward PageView + Lead events to Meta CAPI
- Same pattern for LinkedIn Conversions API, Pinterest CAPI
