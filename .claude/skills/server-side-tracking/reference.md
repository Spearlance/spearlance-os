# Server-Side Tracking — Implementation Reference

Complete TypeScript implementation patterns for the unified `/api/track` pipeline.

---

## 1. Type Definitions

```typescript
// src/lib/tracking/types.ts

/** Events tracked server-side across all platforms */
export type TrackingEventName =
  | 'Lead'
  | 'Schedule'
  | 'Contact'
  | 'CompleteRegistration'
  | 'ViewContent'
  | 'Purchase';

/** Conversion event payload sent from client to /api/track */
export interface ConversionEvent {
  event_name: TrackingEventName | string;
  event_id: string;           // UUID generated client-side for dedup
  email?: string;             // raw — will be hashed server-side
  phone?: string;             // raw — will be hashed server-side
  value?: number | null;
  currency?: string;
  page_url?: string;
  custom_data?: Record<string, unknown>;
}

/** Server-side enrichment data extracted from the request */
export interface ServerEnrichment {
  ip: string | null;
  user_agent: string | null;
  fbp: string | null;         // Meta browser ID cookie
  fbc: string | null;         // Meta click ID cookie
  gclid: string | null;       // Google Ads click ID
  ga_client_id: string | null; // GA4 client ID
  ga_session_id: string | null; // GA4 session ID
  epik: string | null;        // Pinterest click ID
  pin_unauth: string | null;  // Pinterest partner ID
}

/** Consent status derived from request headers + cookies */
export interface ConsentStatus {
  gpc: boolean;       // Global Privacy Control signal present
  analytics: boolean; // Analytics tier (GA4, PostHog)
  marketing: boolean; // Marketing tier (Meta, Pinterest, Google Ads)
}

/** All tracking cookies extracted from Cookie header */
export interface TrackingCookies {
  fbp: string | null;
  fbc: string | null;
  ga: string | null;
  ga_session: string | null;
  gcl_aw: string | null;
  epik: string | null;
  pin_unauth: string | null;
  consent: string | null;
}

// Platform config interfaces
export interface MetaConfig {
  accessToken: string;
  pixelId: string;
}

export interface GA4Config {
  apiSecret: string;
  measurementId: string;
}

export interface PostHogConfig {
  apiKey: string;
  host: string;
}

export interface PinterestConfig {
  accessToken: string;
  adAccountId: string;
}

export interface GoogleAdsConfig {
  developerToken: string;
  customerId: string;
  loginCustomerId: string; // MCC account ID
}
```

---

## 2. Cookie Extraction

```typescript
// src/lib/tracking/cookies.ts
import type { TrackingCookies } from './types';

/** Parse all tracking cookies from Cookie header string */
export function extractCookies(cookieHeader: string | null): TrackingCookies {
  if (!cookieHeader) {
    return {
      fbp: null, fbc: null, ga: null, ga_session: null,
      gcl_aw: null, epik: null, pin_unauth: null, consent: null,
    };
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  // GA4 session cookie — find _ga_XXXXX key
  const gaSessionKey = Object.keys(cookies).find((k) => k.startsWith('_ga_'));
  let gaSessionId: string | null = null;
  if (gaSessionKey && cookies[gaSessionKey]) {
    const raw = cookies[gaSessionKey];
    if (raw.startsWith('GS2.')) {
      // GS2 format (May 2025+): GS2.1.s1234567890$o2$g1...
      const sMatch = raw.match(/s(\d+)/);
      if (sMatch) gaSessionId = sMatch[1];
    } else {
      // GS1 format: GS1.1.{session_id}.{session_count}.{...}
      const parts = raw.split('.');
      if (parts.length >= 3) gaSessionId = parts[2];
    }
  }

  // GCLID — handles two _gcl_aw formats:
  // 1. Custom capture: raw GCLID value
  // 2. gtag.js: "GCL.{version}.{timestamp}.{gclid}"
  const rawGcl = cookies['_gcl_aw'] || null;
  const gclid = rawGcl?.startsWith('GCL.') ? rawGcl.split('.').pop() || null : rawGcl;

  return {
    fbp: cookies['_fbp'] || null,
    fbc: cookies['_fbc'] || null,
    ga: cookies['_ga'] || null,
    ga_session: gaSessionId,
    gcl_aw: gclid,
    epik: cookies['_epik'] || null,
    pin_unauth: cookies['_pin_unauth'] || null,
    consent: cookies['_consent'] || null,
  };
}

/** Extract client IP — proxy-aware priority chain */
export function extractIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    null
  );
}

/** Extract user agent string */
export function extractUserAgent(request: Request): string | null {
  return request.headers.get('user-agent') || null;
}

/** Extract GA4 client_id from _ga cookie.
 *  Cookie format: GA1.1.{random}.{timestamp}
 *  client_id = "{random}.{timestamp}" (strip GA1.1. prefix) */
export function extractGAClientId(gaCookie: string | null): string | null {
  if (!gaCookie) return null;
  const parts = gaCookie.split('.');
  if (parts.length >= 4) return `${parts[2]}.${parts[3]}`;
  return null;
}
```

---

## 3. PII Hashing

```typescript
// src/lib/tracking/hash.ts
import { createHash } from 'node:crypto';

/** Normalize email: lowercase, trim, strip Gmail dots and plus aliases.
 *  john.doe+work@gmail.com → johndoe@gmail.com */
export function normalizeEmail(email: string): string {
  let normalized = email.toLowerCase().trim();
  const [localPart, domain] = normalized.split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleanLocal = localPart.replace(/\./g, '').split('+')[0];
    normalized = `${cleanLocal}@${domain}`;
  }
  return normalized;
}

/** Normalize phone to E.164 digit string (no + prefix).
 *  (555) 867-5309 → 15558675309 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;       // US 10-digit → add country code
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
}

/** SHA-256 hash a normalized email */
export function hashEmail(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

/** SHA-256 hash a normalized phone */
export function hashPhone(phone: string): string {
  return createHash('sha256').update(normalizePhone(phone)).digest('hex');
}

/** SHA-256 hash a pre-normalized string (no additional normalization) */
export function hashRaw(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Generate synthetic GA4 client_id when _ga cookie is absent.
 *  Deterministic per IP+UA pair. Format: {uint32}.{unix_timestamp} */
export function generateSyntheticGAClientId(ip: string | null, ua: string | null): string {
  const input = `${ip || 'unknown'}.${ua || 'unknown'}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return `${parseInt(hash.substring(0, 8), 16)}.${Math.floor(Date.now() / 1000)}`;
}
```

---

## 4. Consent Implementation

```typescript
// src/lib/tracking/consent.ts
import type { ConsentStatus } from './types';

/** Check consent status from GPC header and _consent cookie */
export function getConsentStatus(request: Request, consentCookie: string | null): ConsentStatus {
  const gpc = request.headers.get('Sec-GPC') === '1';

  let analytics = true;
  let marketing = true;

  if (consentCookie) {
    // Cookie format: "analytics=1;marketing=1"
    const parts = Object.fromEntries(
      consentCookie.split(';').map((p) => {
        const [k, v] = p.trim().split('=');
        return [k, v];
      })
    );
    analytics = parts['analytics'] !== '0';
    marketing = parts['marketing'] !== '0';
  }

  // GPC blocks marketing tier. Analytics (GA4 basic, PostHog) still fires —
  // GPC targets sale/sharing of data, not first-party analytics.
  if (gpc) marketing = false;

  return { gpc, analytics, marketing };
}

/** Gate platform calls by consent tier */
export function shouldTrack(
  consent: ConsentStatus,
  platform: 'meta' | 'ga4' | 'posthog' | 'pinterest' | 'google_ads'
): boolean {
  switch (platform) {
    case 'meta':
    case 'pinterest':
    case 'google_ads':
      return consent.marketing;
    case 'ga4':
    case 'posthog':
      return consent.analytics;
    default:
      return false;
  }
}
```

---

## 5. Platform API Calls

### 5a. Unified /api/track Endpoint

```typescript
// src/pages/api/track.ts
import type { APIRoute } from 'astro'; // swap for Next.js NextRequest/NextResponse as needed
import { extractCookies, extractIp, extractUserAgent, extractGAClientId } from '~/lib/tracking/cookies';
import { getConsentStatus, shouldTrack } from '~/lib/tracking/consent';
import { hashEmail, hashPhone } from '~/lib/tracking/hash';
import type { ConversionEvent, ServerEnrichment } from '~/lib/tracking/types';
import { sendMetaEvent } from '~/lib/platforms/meta/capi';
import { sendGA4Event } from '~/lib/platforms/google/ga4';
import { sendPinterestEvent } from '~/lib/platforms/pinterest/capi';
import { sendPostHogEvent } from '~/lib/platforms/posthog/client';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse body — sendBeacon sends text/plain, fetch sends application/json
    const contentType = request.headers.get('content-type') || '';
    let body: ConversionEvent;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = JSON.parse(text);
    }

    const { event_name, event_id, email, phone, value, currency, page_url, custom_data } = body;

    // Validate — always return 200, even on validation failure
    if (!event_name || !event_id) {
      return json({ success: false, reason: 'missing_fields' });
    }

    // Extract enrichment
    const cookieHeader = request.headers.get('cookie');
    const cookies = extractCookies(cookieHeader);
    const ip = extractIp(request);
    const userAgent = extractUserAgent(request);
    const gaClientId = extractGAClientId(cookies.ga);

    const enrichment: ServerEnrichment = {
      ip,
      user_agent: userAgent,
      fbp: cookies.fbp,
      fbc: cookies.fbc,
      gclid: cookies.gcl_aw,
      ga_client_id: gaClientId,
      ga_session_id: cookies.ga_session,
      epik: cookies.epik,
      pin_unauth: cookies.pin_unauth,
    };

    // Consent check
    const consent = getConsentStatus(request, cookies.consent);

    // Hash PII — never store or transmit raw
    const emailHash = email ? hashEmail(email) : null;
    const phoneHash = phone ? hashPhone(phone) : null;

    // Store in DB (data integrity first — before platform fan-out)
    try {
      await db.insert(ConversionEvents).values({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        event_type: event_name,
        event_id,
        email_hash: emailHash,
        phone_hash: phoneHash,
        gclid: enrichment.gclid,
        fbp: enrichment.fbp,
        fbc: enrichment.fbc,
        ga_client_id: enrichment.ga_client_id,
        ip,
        user_agent: userAgent,
        page_url: page_url || null,
        value: value ?? null,
        currency: currency ?? null,
        consent_status: JSON.stringify(consent),
        uploaded_to_ads: false,
      });
    } catch (e) {
      console.error('Failed to store conversion event:', e);
      // Continue to platform fan-out even if DB write fails
    }

    // Build enriched event for platforms
    const enrichedEvent: ConversionEvent = {
      event_name, event_id, email, phone, value, currency, page_url, custom_data,
    };

    // Fan-out — consent-gated, resilient
    const platformPromises: Promise<void>[] = [];

    if (shouldTrack(consent, 'meta')) {
      platformPromises.push(sendMetaEvent(enrichedEvent, enrichment));
    }
    if (shouldTrack(consent, 'ga4')) {
      // GA4 basic always fires; Enhanced Conversions user_data needs marketing consent
      const ga4Event = consent.marketing
        ? enrichedEvent
        : { ...enrichedEvent, email: undefined, phone: undefined };
      platformPromises.push(sendGA4Event(ga4Event, enrichment));
    }
    if (shouldTrack(consent, 'pinterest')) {
      platformPromises.push(sendPinterestEvent(enrichedEvent, enrichment));
    }
    if (shouldTrack(consent, 'posthog')) {
      platformPromises.push(sendPostHogEvent(enrichedEvent, enrichment));
    }
    // Google Ads: uploaded via daily cron from DB — not real-time

    // Await before returning — serverless freezes after response
    if (platformPromises.length > 0) {
      await Promise.allSettled(platformPromises);
    }

    return json({ success: true });
  } catch (error) {
    console.error('Track endpoint error:', error);
    return json({ success: false, reason: 'internal_error' });
  }
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 5b. Meta CAPI

```typescript
// src/lib/platforms/meta/capi.ts
import { hashPhone, hashRaw, normalizeEmail } from '~/lib/tracking/hash';
import type { ConversionEvent, ServerEnrichment } from '~/lib/tracking/types';

const EVENT_MAP: Record<string, string> = {
  Lead: 'Lead',
  Schedule: 'Schedule',
  Contact: 'Contact',
  CompleteRegistration: 'CompleteRegistration',
  ViewContent: 'ViewContent',
  Purchase: 'Purchase',
};

export async function sendMetaEvent(event: ConversionEvent, enrichment: ServerEnrichment): Promise<void> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;
  const apiVersion = process.env.META_API_VERSION || 'v22.0';

  if (!accessToken || !pixelId) return;

  const userData: Record<string, unknown> = {
    client_ip_address: enrichment.ip || '',
    client_user_agent: enrichment.user_agent || '',
  };

  // Gmail EMQ trick: send both dot-stripped and raw-lowercase hashes
  if (event.email) {
    const withDots = event.email.toLowerCase().trim();
    const withoutDots = normalizeEmail(event.email); // strips dots/aliases
    const hashes = [...new Set([hashRaw(withDots), hashRaw(withoutDots)])];
    userData.em = hashes;
  }
  if (event.phone) {
    userData.ph = [hashPhone(event.phone)];
  }
  if (enrichment.fbp) userData.fbp = enrichment.fbp;
  if (enrichment.fbc) userData.fbc = enrichment.fbc;

  const payload: Record<string, unknown> = {
    data: [{
      event_name: EVENT_MAP[event.event_name] || event.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event.event_id,
      event_source_url: event.page_url || process.env.SITE_URL,
      action_source: 'website',
      user_data: userData,
      ...(event.value != null && {
        custom_data: {
          value: event.value,
          currency: event.currency || 'USD',
          ...event.custom_data,
        },
      }),
    }],
  };

  // Add test_event_code in non-production environments
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.text();
      console.error('Meta CAPI error:', response.status, error);
    }
  } catch (error) {
    console.error('Meta CAPI request failed:', error);
  }
}
```

### 5c. GA4 Measurement Protocol

```typescript
// src/lib/platforms/google/ga4.ts
import { hashEmail, hashPhone, generateSyntheticGAClientId } from '~/lib/tracking/hash';
import type { ConversionEvent, ServerEnrichment } from '~/lib/tracking/types';

const GA4_MP_URL = 'https://www.google-analytics.com/mp/collect';

const EVENT_MAP: Record<string, string> = {
  Lead: 'generate_lead',
  Schedule: 'book_appointment',
  Contact: 'contact_form_submit',
  CompleteRegistration: 'sign_up',
  ViewContent: 'page_view',
  Purchase: 'purchase',
};

export async function sendGA4Event(event: ConversionEvent, enrichment: ServerEnrichment): Promise<void> {
  const apiSecret = process.env.GA4_API_SECRET;
  const measurementId = process.env.GA4_MEASUREMENT_ID;

  if (!apiSecret || !measurementId) return;

  // client_id REQUIRED — use cookie or synthetic fallback
  const clientId =
    enrichment.ga_client_id ||
    generateSyntheticGAClientId(enrichment.ip, enrichment.user_agent);

  const eventParams: Record<string, unknown> = {
    engagement_time_msec: 100,            // REQUIRED: must be > 0 or events are invisible
    session_id: enrichment.ga_session_id || `${Date.now()}`, // REQUIRED for reports
    event_id: event.event_id,
    page_location: event.page_url,
  };

  if (event.value != null) {
    eventParams.value = event.value;
    eventParams.currency = event.currency || 'USD';
  }

  if (event.custom_data) {
    for (const [key, val] of Object.entries(event.custom_data)) {
      // Skip platform cookie fields that don't belong in GA4 params
      if (!['fbp', 'fbc', 'gcl_aw'].includes(key)) {
        eventParams[key] = val;
      }
    }
  }

  const payload: Record<string, unknown> = {
    client_id: clientId,
    events: [{
      name: EVENT_MAP[event.event_name] || event.event_name.toLowerCase(),
      params: eventParams,
    }],
  };

  // Enhanced Conversions: hashed user_data (only sent when email/phone present)
  if (event.email || event.phone) {
    payload.user_data = {
      ...(event.email && { sha256_email_address: [hashEmail(event.email)] }),
      ...(event.phone && { sha256_phone_number: [hashPhone(event.phone)] }),
    };
  }

  try {
    const url = `${GA4_MP_URL}?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('GA4 MP error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('GA4 MP request failed:', error);
  }
}
```

### 5d. Pinterest CAPI v5

```typescript
// src/lib/platforms/pinterest/capi.ts
import { hashEmail, hashPhone } from '~/lib/tracking/hash';
import type { ConversionEvent, ServerEnrichment } from '~/lib/tracking/types';

// Use sandbox for testing: process.env.PINTEREST_USE_SANDBOX === 'true'
const BASE_URL = process.env.PINTEREST_USE_SANDBOX === 'true'
  ? 'https://api-sandbox.pinterest.com/v5/ad_accounts'
  : 'https://api.pinterest.com/v5/ad_accounts';

// Pinterest uses underscore format — NOT PascalCase
const EVENT_MAP: Record<string, string> = {
  Lead: 'lead',
  Schedule: 'lead',
  Contact: 'lead',
  CompleteRegistration: 'signup',
  ViewContent: 'page_visit',
  Purchase: 'checkout',
};

export async function sendPinterestEvent(event: ConversionEvent, enrichment: ServerEnrichment): Promise<void> {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) return;

  const userData: Record<string, unknown> = {};

  if (enrichment.ip) userData.client_ip_address = enrichment.ip;
  if (enrichment.user_agent) userData.client_user_agent = enrichment.user_agent;
  if (event.email) userData.em = [hashEmail(event.email)];
  if (event.phone) userData.ph = [hashPhone(event.phone)];

  // Pinterest click attribution cookies
  if (enrichment.epik) userData.click_id = enrichment.epik;        // _epik cookie
  if (enrichment.pin_unauth) userData.partner_id = enrichment.pin_unauth; // _pin_unauth cookie

  // Skip entirely if no identifiers — API errors on empty user_data
  if (Object.keys(userData).length === 0) return;

  const payload = {
    data: [{
      event_name: EVENT_MAP[event.event_name] || 'custom',
      action_source: 'web' as const,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event.event_id,
      event_source_url: event.page_url || process.env.SITE_URL,
      user_data: userData,
      ...(event.custom_data && { custom_data: event.custom_data }),
    }],
  };

  try {
    const response = await fetch(`${BASE_URL}/${adAccountId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('Pinterest CAPI error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Pinterest CAPI request failed:', error);
  }
}
```

### 5e. PostHog Server SDK

```typescript
// src/lib/platforms/posthog/client.ts
import { PostHog } from 'posthog-node';
import { hashEmail } from '~/lib/tracking/hash';
import type { ConversionEvent, ServerEnrichment } from '~/lib/tracking/types';

let client: PostHog | null = null;

const EVENT_MAP: Record<string, string> = {
  Lead: 'contact_form_submitted',
  Schedule: 'appointment_booked',
  Contact: 'phone_clicked',
  CompleteRegistration: 'newsletter_signup_completed',
  ViewContent: 'page_viewed',
  Purchase: 'purchase_completed',
};

/** Singleton — serverless functions reuse across warm invocations */
function getClient(): PostHog | null {
  if (client) return client;

  const apiKey = process.env.PUBLIC_POSTHOG_KEY || process.env.POSTHOG_API_KEY;
  const host = process.env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) return null;

  client = new PostHog(apiKey, {
    host,
    flushAt: 1,            // flush immediately after each event
    flushInterval: 0,      // don't buffer — serverless terminates after response
    disableGeoip: true,    // privacy — don't resolve IP to geo location
  });

  return client;
}

export async function sendPostHogEvent(
  event: ConversionEvent,
  _enrichment: ServerEnrichment
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  // Use hashed email as distinctId for identity consistency.
  // Fall back to event_id (unique per event) — never 'anonymous' (merges all unknowns)
  const distinctId = event.email ? hashEmail(event.email) : event.event_id;

  ph.capture({
    distinctId,
    event: EVENT_MAP[event.event_name] || event.event_name,
    properties: {
      event_id: event.event_id,
      value: event.value,
      currency: event.currency,
      page_url: event.page_url,
      source: 'server',
      ...event.custom_data,
    },
  });

  // Critical: flush before function terminates
  await ph.flush();
}

/** Track operational server events (cron jobs, syncs, etc.) */
export async function trackServerEvent(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  ph.capture({
    distinctId: 'server',
    event,
    properties: properties ?? {},
  });

  await ph.flush();
}
```

---

## 6. Error Handling

```typescript
// Pattern: try/catch per platform, never throw up the chain

async function sendWithErrorBoundary(
  platformName: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    // Log context — never log tokens, raw PII, or API secrets
    console.error(`[${platformName}] event send failed:`, {
      error: error instanceof Error ? error.message : String(error),
      // Do NOT include: accessToken, email, phone, raw headers
    });
    // Swallow — one platform failure never breaks others or the response
  }
}

// Usage in fan-out
await Promise.allSettled([
  sendWithErrorBoundary('meta', () => sendMetaEvent(event, enrichment)),
  sendWithErrorBoundary('ga4', () => sendGA4Event(event, enrichment)),
  sendWithErrorBoundary('pinterest', () => sendPinterestEvent(event, enrichment)),
  sendWithErrorBoundary('posthog', () => sendPostHogEvent(event, enrichment)),
]);
```

**Retry pattern** (for platforms with transient failures):

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}
```

---

## 7. Environment Variables

Complete list by platform. All required unless marked optional.

### Meta

| Variable | Purpose | Example |
|----------|---------|---------|
| `META_ACCESS_TOKEN` | System User token (long-lived) | `EAA...` |
| `META_PIXEL_ID` | Facebook Pixel ID | `1641780569777488` |
| `META_AD_ACCOUNT_ID` | Ad account ID | `24527373416904072` |
| `META_API_VERSION` | Graph API version (optional, default `v22.0`) | `v22.0` |
| `META_TEST_EVENT_CODE` | Test mode code (optional — dev only) | `TEST12345` |

### GA4

| Variable | Purpose | Example |
|----------|---------|---------|
| `GA4_MEASUREMENT_ID` | GA4 property stream ID | `G-YK4Z7HHJ94` |
| `GA4_API_SECRET` | Measurement Protocol secret | `aBcDeFgHiJ` |
| `GA4_PROPERTY_ID` | GA4 property ID (for Admin API) | `482608729` |

### Pinterest

| Variable | Purpose | Example |
|----------|---------|---------|
| `PINTEREST_ACCESS_TOKEN` | Bearer token (60-day refresh) | `pina_...` |
| `PINTEREST_AD_ACCOUNT_ID` | Ad account ID | `...` |
| `PINTEREST_USE_SANDBOX` | Use sandbox API (optional, dev only) | `true` |

### PostHog

| Variable | Purpose | Example |
|----------|---------|---------|
| `PUBLIC_POSTHOG_KEY` | Project API key (client + server share this) | `phc_...` |
| `PUBLIC_POSTHOG_HOST` | PostHog instance URL (optional) | `https://us.i.posthog.com` |

### Google Ads

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_ADS_SA_KEY_JSON` | Service account JSON (full JSON string) | `{"type":"service_account",...}` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | API developer token | `ABcDeFgHiJkLmNoPqR` |
| `GOOGLE_ADS_CUSTOMER_ID` | Child customer account ID | `201-040-4743` |
| `GOOGLE_ADS_MCC_ID` | Manager account (login-customer-id) | `514-152-2652` |

### Shared

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Bearer token for cron endpoint auth |
| `SITE_URL` | Base URL for event_source_url fallback |

---

## 8. Client-Side Integration

Send events from the browser with `sendBeacon` (fire-and-forget, survives page unload):

```typescript
// src/lib/tracking/client.ts

/** Generate a unique event_id for deduplication between pixel and server */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export interface TrackPayload {
  event_name: string;
  event_id: string;
  email?: string;
  phone?: string;
  value?: number;
  currency?: string;
  page_url?: string;
  custom_data?: Record<string, unknown>;
}

/** Send conversion event to /api/track.
 *  Uses sendBeacon for reliability on page unload.
 *  Falls back to fetch for environments that don't support sendBeacon. */
export function trackConversion(payload: TrackPayload): void {
  const body = JSON.stringify(payload);
  const url = '/api/track';

  // sendBeacon is ideal — survives page unload, non-blocking
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    // sendBeacon with Blob sends text/plain content-type
    const blob = new Blob([body], { type: 'text/plain' });
    navigator.sendBeacon(url, blob);
  } else {
    // Fallback: fetch with keepalive
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Silently ignore — tracking never breaks UX
    });
  }
}

// Example usage on form submit:
// const eventId = generateEventId();
// fbq('track', 'Lead', {}, { eventID: eventId }); // client pixel with same ID
// trackConversion({ event_name: 'Lead', event_id: eventId, email, phone });
```

---

## 9. Test Event Verification

Verify each platform independently before going live.

### Meta — Test Events

```bash
# Send test event via curl
curl -X POST \
  "https://graph.facebook.com/v22.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "event_name": "Lead",
      "event_time": '"$(date +%s)"',
      "event_id": "test-event-001",
      "action_source": "website",
      "event_source_url": "https://yoursite.com/contact",
      "user_data": {
        "client_ip_address": "127.0.0.1",
        "client_user_agent": "Mozilla/5.0 Test"
      }
    }],
    "test_event_code": "TEST12345"
  }'
```

View results: Meta Events Manager → Data Sources → your Pixel → Test Events tab.

### GA4 — Debug Validation

```bash
# Validate event payload (returns validation messages, does not record event)
curl -X POST \
  "https://www.google-analytics.com/debug/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "123456789.1234567890",
    "events": [{
      "name": "generate_lead",
      "params": {
        "engagement_time_msec": 100,
        "session_id": "1234567890",
        "event_id": "test-event-001"
      }
    }]
  }'

# Send real event (records in GA4)
# Replace /debug/ with /mp/ in the URL above
```

View results: GA4 → Reports → Realtime, or DebugView in GA4 Admin.

### Pinterest — Event Test

```bash
# Send test event
curl -X POST \
  "https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/events" \
  -H "Authorization: Bearer ${PINTEREST_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "event_name": "lead",
      "action_source": "web",
      "event_time": '"$(date +%s)"',
      "event_id": "test-event-001",
      "event_source_url": "https://yoursite.com/contact",
      "user_data": {
        "client_ip_address": "127.0.0.1",
        "client_user_agent": "Mozilla/5.0 Test"
      }
    }]
  }'
```

View results: Pinterest Ads Manager → Conversions → Events.

### PostHog — Live Events

```bash
# Direct capture via PostHog API
curl -X POST \
  "${PUBLIC_POSTHOG_HOST}/capture/" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "'"${PUBLIC_POSTHOG_KEY}"'",
    "event": "contact_form_submitted",
    "distinct_id": "test-user-hash",
    "properties": {
      "event_id": "test-event-001",
      "source": "server"
    }
  }'
```

View results: PostHog → Activity → Live Events.

### Full Pipeline Test

```bash
# POST to your /api/track endpoint directly
curl -X POST \
  "https://yoursite.com/api/track" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Lead",
    "event_id": "test-'"$(date +%s)"'",
    "email": "test@example.com",
    "phone": "+15551234567",
    "page_url": "https://yoursite.com/contact",
    "custom_data": { "appointment_type": "consultation" }
  }'

# Verify: check each platform's dashboard for the event
# Meta: Events Manager → Test Events (if META_TEST_EVENT_CODE set)
# GA4: Realtime report or DebugView
# Pinterest: Conversions dashboard
# PostHog: Live Events stream
```

### GPC Consent Test

```bash
# Verify GPC blocks marketing platforms
curl -X POST \
  "https://yoursite.com/api/track" \
  -H "Content-Type: application/json" \
  -H "Sec-GPC: 1" \
  -d '{
    "event_name": "Lead",
    "event_id": "gpc-test-'"$(date +%s)"'",
    "page_url": "https://yoursite.com/contact"
  }'

# Expected: GA4 and PostHog receive event, Meta and Pinterest do NOT
```
