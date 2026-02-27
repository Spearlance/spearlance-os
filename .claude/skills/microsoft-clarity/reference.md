# Microsoft Clarity Developer Reference

Full API reference for Microsoft Clarity — client-side API, Data Export API, consent management, smart events, and integration patterns.

Last verified: February 2026. Check [learn.microsoft.com/en-us/clarity](https://learn.microsoft.com/en-us/clarity/) for changes.

---

## 1. Client-Side API

All `window.clarity()` calls. Clarity must be initialized before calling these.

### Full method table

| Method | Syntax | Required params | Purpose |
|--------|--------|----------------|---------|
| `identify` | `clarity('identify', customId, sessionId?, pageId?, friendlyName?)` | `customId` | Link session to your user ID |
| `consentv2` | `clarity('consentv2', { ad_Storage, analytics_Storage })` | Both fields | Grant/deny consent (EEA/UK/CH required) |
| `consent` | `clarity('consent', false)` | `false` | Erase cookies, switch to no-consent mode |
| `set` | `clarity('set', key, value)` | Both | Custom tag (string or string array) |
| `event` | `clarity('event', eventName)` | `eventName` | Fire a custom smart event |
| `upgrade` | `clarity('upgrade', reason)` | `reason` | Prioritize session for recording |

---

## 2. Identify API

Links Clarity sessions to your internal user/session IDs. Enables filtering recordings by user.

```ts
// Full signature
window.clarity(
  'identify',
  customUserId,      // string — your internal user ID (required)
  customSessionId,   // string | null — your session ID (optional)
  customPageId,      // string | null — your page ID (optional)
  friendlyName       // string | null — display name in Clarity UI (optional)
)
```

### Call pattern

```js
// Minimal — user ID only
window.clarity('identify', user.id)

// Full — all fields
window.clarity('identify', user.id, sessionId, 'contact-page', user.name)

// On every page, even without session/page IDs
window.clarity('identify', user.id, null, null, null)
```

**Call on every page** — not just after login. Clarity uses this to correctly stitch multi-page sessions. Pass `null` for optional fields you don't need.

### Next.js pattern

```tsx
'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react' // or your auth provider

export function ClarityIdentify() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.id && typeof window.clarity === 'function') {
      window.clarity('identify', session.user.id, null, null, session.user.name ?? null)
    }
  }, [session])

  return null
}
```

---

## 3. Consent V2 API

Required for EEA, UK, and Switzerland since October 31, 2025.

### Syntax

```js
window.clarity('consentv2', {
  ad_Storage: 'granted' | 'denied',
  analytics_Storage: 'granted' | 'denied'
})
```

### All valid states

```js
// Full consent
window.clarity('consentv2', { ad_Storage: 'granted', analytics_Storage: 'granted' })

// Analytics only
window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })

// Ads only
window.clarity('consentv2', { ad_Storage: 'granted', analytics_Storage: 'denied' })

// Deny all
window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' })

// Erase cookies + restart in no-consent mode
window.clarity('consent', false)
```

### No-consent mode behavior

When `analytics_Storage` is `denied`, Clarity:
- Assigns unique ID **per page view** (no persistence)
- Sets no first-party or third-party cookies
- Disables session recordings, heatmaps, and funnels for that visitor
- Resumes full tracking if consent is later granted in the same session

### Consent banner integration pattern

```js
// Generic consent event listener
window.addEventListener('cookieConsentUpdated', (e) => {
  const { analytics, advertising } = e.detail
  window.clarity('consentv2', {
    ad_Storage: advertising ? 'granted' : 'denied',
    analytics_Storage: analytics ? 'granted' : 'denied'
  })
})

// CookieYes example
window.addEventListener('cookieyes_consent_update', (e) => {
  const detail = e.detail
  window.clarity('consentv2', {
    ad_Storage: detail.accepted.includes('advertisement') ? 'granted' : 'denied',
    analytics_Storage: detail.accepted.includes('analytics') ? 'granted' : 'denied'
  })
})
```

### GTM Consent Mode V2 integration

Clarity auto-detects GTM and reads Consent Mode signals. Enable in **Settings → Setup → Google Tag Manager**.

GTM mapping: `analytics_storage` → `analytics_Storage`, `ad_storage` → `ad_Storage`.

---

## 4. Custom Tags API

Arbitrary key-value metadata attached to sessions. Appears in Clarity Filters.

```js
// Single string value
window.clarity('set', 'userType', 'new-visitor')

// Multiple values (equivalent calls)
window.clarity('set', 'interests', ['hvac', 'plumbing', 'electrical'])
// same as:
window.clarity('set', 'interests', 'hvac')
window.clarity('set', 'interests', 'plumbing')
window.clarity('set', 'interests', 'electrical')
```

### Key/value constraints

- Key: string, any length
- Value: string or array of strings
- No limit on number of tags
- Last write wins per key (tags accumulate for arrays)

### Service business patterns

```js
// Segment by service interest
window.clarity('set', 'serviceCategory', 'roofing-repair')

// A/B test tracking
window.clarity('set', 'heroVariant', 'v2-social-proof')

// Lead quality signals
window.clarity('set', 'returningVisitor', 'true')
window.clarity('set', 'quotePageVisited', 'true')

// UTM source propagation
window.clarity('set', 'utmSource', new URLSearchParams(window.location.search).get('utm_source') ?? 'direct')
```

---

## 5. Custom Events API

Fire named events that appear alongside smart events in Filters, Dashboard, Settings, and Recordings.

```js
window.clarity('event', eventName)  // eventName: string
```

### Examples

```js
// Contact funnel tracking
window.clarity('event', 'contactFormViewed')
window.clarity('event', 'contactFormStarted')
window.clarity('event', 'contactFormAbandoned')
window.clarity('event', 'contactFormSubmitted')

// Engagement signals
window.clarity('event', 'phoneNumberClicked')
window.clarity('event', 'mapDirectionsClicked')
window.clarity('event', 'reviewsSectionViewed')
window.clarity('event', 'pricingPageScrolled50pct')

// CTA interactions
window.clarity('event', 'heroCtaClicked')
window.clarity('event', 'stickyBarCtaClicked')
window.clarity('event', 'exitIntentTriggered')
```

### React hook pattern

```tsx
import { useCallback } from 'react'

export function useClarityEvent() {
  return useCallback((eventName: string) => {
    if (typeof window !== 'undefined' && typeof window.clarity === 'function') {
      window.clarity('event', eventName)
    }
  }, [])
}

// Usage
const track = useClarityEvent()
<button onClick={() => track('ctaClicked')}>Get a Quote</button>
```

---

## 6. Upgrade API

Prioritizes specific sessions for recording when the daily 100K session limit is reached and Clarity starts sampling.

```js
window.clarity('upgrade', upgradeReason)  // upgradeReason: string
```

```js
// Prioritize sessions with specific behaviors
window.clarity('upgrade', 'rage-click-detected')
window.clarity('upgrade', 'form-abandoned')
window.clarity('upgrade', 'high-value-user')

// Trigger on rage click detection
document.addEventListener('click', (e) => {
  // Your rage click detection logic
  if (isRageClick(e)) {
    window.clarity('upgrade', 'rage-click')
  }
})
```

---

## 7. HTML Masking API

Control what content appears in session recordings.

```html
<!-- Mask entire element and all children -->
<form data-clarity-mask="true">
  <input type="text" name="phone" />   <!-- masked -->
  <input type="email" name="email" />  <!-- masked -->
</form>

<!-- Unmask specific element (overrides parent mask) -->
<div data-clarity-mask="true">
  <p data-clarity-unmask="true">This service page text is visible</p>
  <input type="text" name="ssn" />   <!-- still masked -->
</div>
```

**Default masking:** All input content, numbers, and email addresses. Setting `data-clarity-mask="false"` has no effect — use `data-clarity-unmask` to expose content.

---

## 8. Smart Events

### Auto event types

Clarity detects nine standard event types without code:

| Event | What Clarity detects |
|-------|---------------------|
| Purchase | Checkout completion — order confirmation signals |
| Add to Cart | Cart add interactions |
| Begin Checkout | Checkout flow initiation |
| Contact Us | Contact form views, contact button clicks |
| Submit Form | Any `<form>` submission |
| Request Quote | Quote request interactions |
| Sign Up | Registration form submissions |
| Login | Login form submissions |
| Download | File download link clicks |

Edit these in **Settings → Smart Events** — no code required. Edited events are labeled "Clarity defined, edited."

### Behavioral friction signals

Used as filter dimensions in session recordings and exported via Data Export API:

| Signal | Detection behavior |
|--------|-------------------|
| **Dead Click** | Click registered with no subsequent DOM change, navigation, or JS response |
| **Rage Click** | Multiple clicks in rapid succession in a clustered area |
| **Excessive Scroll** | Repeated up-down scroll without page progress — disorientation signal |
| **Quick Back** | User navigated to page then immediately pressed back — content mismatch |
| **Scripting Error** | Unhandled JS exception during session |
| **Error Click** | Click on or near an error state element |

### Custom smart events (no-code)

**Settings → Smart Events → New event**

- Max 20 user-defined events per project
- Sources: button clicks, API events, page visits
- Combine multiple sources into one named event

### API events vs. smart events

| Type | Defined via | Editable via settings | Max count |
|------|------------|----------------------|-----------|
| Auto events | Clarity ML | Yes (name + conditions) | 9 built-in |
| User-defined events | Settings UI | Yes | 20 custom |
| API events | `window.clarity('event', ...)` | No — edit in code | Unlimited |

---

## 9. Data Export API

### Base URL

```
https://www.clarity.ms/export-data/api/v1/project-live-insights
```

### Authentication

JWT bearer token — generated in **Settings → Data Export → Generate new API token**.

```
Authorization: Bearer YOUR_CLARITY_API_TOKEN
Content-Type: application/json
```

### Request parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `numOfDays` | integer | `1`, `2`, `3` | Last 24/48/72 hours |
| `dimension1` | string | See below | Primary breakdown |
| `dimension2` | string | See below | Secondary breakdown |
| `dimension3` | string | See below | Tertiary breakdown |

**Valid dimensions:** `Browser`, `Device`, `Country/Region`, `OS`, `Source`, `Medium`, `Campaign`, `Channel`, `URL`

### Example requests

```bash
# Traffic by Channel for last 24h
curl 'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=Channel' \
  -H 'Authorization: Bearer $CLARITY_API_TOKEN'

# Device x Channel breakdown
curl 'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3&dimension1=Device&dimension2=Channel' \
  -H 'Authorization: Bearer $CLARITY_API_TOKEN'
```

```python
import requests

response = requests.get(
    'https://www.clarity.ms/export-data/api/v1/project-live-insights',
    params={'numOfDays': '1', 'dimension1': 'Channel', 'dimension2': 'Device'},
    headers={
        'Authorization': f'Bearer {os.environ["CLARITY_API_TOKEN"]}',
        'Content-Type': 'application/json'
    }
)
data = response.json()
```

```ts
async function getClarityData(numOfDays: 1 | 2 | 3, dimension1: string) {
  const params = new URLSearchParams({ numOfDays: String(numOfDays), dimension1 })
  const res = await fetch(
    `https://www.clarity.ms/export-data/api/v1/project-live-insights?${params}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLARITY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!res.ok) throw new Error(`Clarity API error: ${res.status}`)
  return res.json()
}
```

### Response shape

```json
[
  {
    "metricName": "Traffic",
    "information": [
      {
        "totalSessionCount": "291942",
        "totalBotSessionCount": "31076",
        "distantUserCount": "212836",
        "PagesPerSessionPercentage": 2.2609,
        "Channel": "Organic Search"
      }
    ]
  },
  {
    "metricName": "Dead Click Count",
    "information": [
      {
        "deadClickCount": "4521",
        "Channel": "AIPlatform"
      }
    ]
  }
]
```

### Response metrics

| Metric name | What it contains |
|-------------|----------------|
| Traffic | totalSessionCount, totalBotSessionCount, distantUserCount, PagesPerSessionPercentage |
| Scroll Depth | Average scroll percentage per breakdown |
| Engagement Time | Average time on page per breakdown |
| Popular Pages | Top URLs by session count |
| Dead Click Count | Dead click frequency per breakdown |
| Rage Click Count | Rage click frequency per breakdown |
| Excessive Scroll | Excessive scroll session count per breakdown |
| Quickback Click | Quick back count per breakdown |
| Script Error Count | JS errors per breakdown |
| Error Click Count | Error click frequency per breakdown |

### Rate limits and constraints

| Limit | Value |
|-------|-------|
| Requests per project per day | 10 |
| Data recency | Last 1–3 days only |
| Max dimensions per request | 3 |
| Max rows in response | 1,000 (no pagination) |
| Response timezone | UTC |

### Error codes

| Code | Meaning |
|------|---------|
| 401 | Missing, invalid, or expired token |
| 403 | Token lacks permission for this operation |
| 400 | Invalid request parameters |
| 429 | Daily request limit exceeded |

---

## 10. AI Chat Channel Groups

No setup required — automatic classification.

### Channels

| Channel | Source |
|---------|--------|
| **AIPlatform** | Organic AI-generated response clicks (ChatGPT, Claude, Gemini, Copilot, Perplexity) |
| **PaidAIPlatform** | Paid ad clicks within AI platform UIs |

### Supported platforms

| Platform | Source domain |
|----------|--------------|
| OpenAI ChatGPT | chatgpt.com |
| Anthropic Claude | claude.ai |
| Google Gemini | gemini.google.com |
| Microsoft Copilot | copilot.microsoft.com |
| Perplexity AI | perplexity.ai |

### Access in dashboard

1. **Dashboard → Traffic (Referrer card) → Channels tab**
2. Select AIPlatform or PaidAIPlatform to filter entire dashboard
3. View filtered heatmaps, recordings, engagement metrics
4. Add to **Watchlist** for persistent monitoring

### Access via Data Export API

```bash
# AI platform traffic with device breakdown
curl 'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3&dimension1=Channel&dimension2=Device' \
  -H 'Authorization: Bearer $CLARITY_API_TOKEN'
```

Filter the response by `"Channel": "AIPlatform"` to isolate AI referral metrics.

### Limitation

Referral data hidden by privacy-enhanced AI modes appears as Direct traffic. Treat numbers as floor estimates.

---

## 11. Copilot AI

### Access

**Dashboard → Copilot tab** — or via the Copilot icon in recordings/heatmaps views.

Enable/disable features: **Settings → Copilot → Copilot features**

### Feature availability

| Feature | Where to access | Input |
|---------|----------------|-------|
| Chat | Copilot tab | Natural language question |
| Session Insights | Individual recording view | None — auto-generates |
| Grouped Session Insights | Recording list (multi-select) | None — auto-generates |
| Heatmaps Insights | Heatmaps view | None — auto-generates |
| Ad Campaign Insights | Campaign view | None — auto-generates |

### High-signal Copilot prompts

**Traffic analysis:**
```
Which pages have the highest dead click rate this week?
What are the top 5 pages by rage click count?
Which traffic source has the longest average engagement time?
Compare behavior between mobile and desktop users on the contact page
```

**Friction identification:**
```
Show me sessions where users visited the contact page but didn't submit the form
Which form fields cause the most abandonment?
What percentage of sessions have at least one rage click?
Find sessions with excessive scroll on the services page
```

**AI traffic analysis:**
```
How does engagement from AIPlatform compare to organic search?
What pages do AI-referred users visit most?
What's the conversion rate for sessions from AI platforms?
```

**Session review:**
```
Summarize the last 50 sessions on the homepage
What are users doing in sessions that end with a quick back?
Describe the behavior of users who rage clicked on the contact form
```

### Copilot limitations

- Generative AI can hallucinate — verify findings in raw data before acting
- Session Insights may miss context not visible in recording metadata
- Chat is limited to data within your Clarity project scope (no external comparison)

---

## 12. Installation Patterns

### React (Vite)

```tsx
// src/main.tsx
import Clarity from '@microsoft/clarity'

Clarity.init(import.meta.env.VITE_CLARITY_PROJECT_ID)
```

### Next.js App Router with consent

```tsx
// app/analytics/clarity.tsx
'use client'
import Script from 'next/script'
import { useEffect } from 'react'

interface ClarityProps {
  consentGranted?: boolean
}

export function ClarityScript({ consentGranted }: ClarityProps) {
  useEffect(() => {
    if (!consentGranted || typeof window.clarity !== 'function') return
    window.clarity('consentv2', {
      ad_Storage: 'granted',
      analytics_Storage: 'granted',
    })
  }, [consentGranted])

  return (
    <Script
      id="clarity-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
        `,
      }}
    />
  )
}
```

### TypeScript type augmentation

Clarity doesn't ship types for `window.clarity`. Add this to your project:

```ts
// types/clarity.d.ts
interface Window {
  clarity: (
    method:
      | 'identify'
      | 'consentv2'
      | 'consent'
      | 'set'
      | 'event'
      | 'upgrade',
    ...args: unknown[]
  ) => void
}
```

### Safe call wrapper

```ts
// lib/clarity.ts
export const clarity = {
  identify: (userId: string, sessionId?: string, pageId?: string, name?: string) => {
    if (typeof window?.clarity === 'function') {
      window.clarity('identify', userId, sessionId ?? null, pageId ?? null, name ?? null)
    }
  },
  event: (eventName: string) => {
    if (typeof window?.clarity === 'function') {
      window.clarity('event', eventName)
    }
  },
  set: (key: string, value: string | string[]) => {
    if (typeof window?.clarity === 'function') {
      window.clarity('set', key, value)
    }
  },
  consent: (ad: 'granted' | 'denied', analytics: 'granted' | 'denied') => {
    if (typeof window?.clarity === 'function') {
      window.clarity('consentv2', {
        ad_Storage: ad,
        analytics_Storage: analytics,
      })
    }
  },
}
```

---

## 13. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `window.clarity('consent')` (deprecated) | Use `window.clarity('consentv2', { ... })` |
| Not calling `identify` on every page | Call on every page load, not just post-login |
| Script `id="clarity"` in Next.js | Use any other ID — `id="clarity-init"` |
| Treating Consent V2 as optional for EEA traffic | Required since Oct 31, 2025 — features disabled without it |
| Relying on AI platform data as exact counts | Hidden referrers appear as Direct — treat as floor estimates |
| Using Data Export API for real-time data | API max is 3 days lag and 10 req/day — use dashboard for real-time |
| Setting `data-clarity-mask="false"` to unmask | Use `data-clarity-unmask="true"` instead |
| Not upgrading important sessions | Call `clarity('upgrade', reason)` proactively for high-value segments |
