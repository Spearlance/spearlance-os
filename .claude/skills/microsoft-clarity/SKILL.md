---
model: claude-sonnet-4-6
name: microsoft-clarity
description: Use when implementing Microsoft Clarity for heatmaps, session recordings, smart events, AI insights, or consent management. Also use when analyzing user behavior, identifying UX friction, or setting up LLM referral tracking.
---

# Microsoft Clarity

## Overview

Microsoft Clarity is a free, unlimited behavior analytics platform — heatmaps, session recordings, smart events, and AI-powered insights. No session caps, no data sampling, no paywalls. Every session is recorded.

| Item | Value |
|------|-------|
| **Pricing** | Free, unlimited sessions |
| **Script tag** | Auto-generated in Settings → Setup |
| **NPM package** | `npm install @microsoft/clarity` |
| **Consent required** | EEA/UK/CH since Oct 31, 2025 |
| **Docs** | https://learn.microsoft.com/en-us/clarity/ |
| **Dashboard** | https://clarity.microsoft.com/ |

**When to use Clarity vs PostHog/GA4:** Clarity is behavior-layer — you see *how* users interact with pages. PostHog and GA4 are event/funnel-layer — you track *what* users do across sessions. Run all three. Clarity is always analytics-tier (fires unconditionally), not consent-gated for marketing purposes.

---

## Setup

### Script tag (any site)

Get your tracking code from **Settings → Setup → Get tracking code**. Paste into `<head>`.

```html
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "YOUR_PROJECT_ID");
</script>
```

Replace `YOUR_PROJECT_ID` — find it at **Settings → Overview**.

### NPM package

```bash
npm install @microsoft/clarity
```

```ts
import Clarity from '@microsoft/clarity'

Clarity.init(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID!)
```

### Next.js App Router

```tsx
// app/clarity-provider.tsx
'use client'
import Script from 'next/script'

export function ClarityProvider() {
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

// app/layout.tsx — add <ClarityProvider /> inside <body>
```

**Never use `id="clarity"` for your Script element** — conflicts with Clarity's internal elements.

### Astro

```astro
---
// src/layouts/Layout.astro
const clarityId = import.meta.env.PUBLIC_CLARITY_PROJECT_ID
---
<script is:inline define:vars={{ clarityId }}>
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", clarityId);
</script>
```

### Verify installation

Check for POST requests to `https://www.clarity.ms/collect` in Network tab. Or open the dashboard — real-time session count appears immediately.

---

## Consent V2 (Required for EEA/UK/CH)

Since October 31, 2025, Clarity enforces consent for EEA, UK, and Switzerland visitors. Without a valid consent signal, session recordings, heatmaps, and funnels are disabled for those users.

Use `consentv2` — the old `window.clarity('consent')` is deprecated.

### Syntax

```js
window.clarity('consentv2', {
  ad_Storage: 'granted | denied',
  analytics_Storage: 'granted | denied'
})
```

### Grant full consent

```js
window.clarity('consentv2', {
  ad_Storage: 'granted',
  analytics_Storage: 'granted'
})
```

### Grant analytics only (no ads)

```js
window.clarity('consentv2', {
  ad_Storage: 'denied',
  analytics_Storage: 'granted'
})
```

### Deny all (erase cookies, restart session in no-consent mode)

```js
window.clarity('consent', false)
```

This clears existing Clarity cookies and halts tracking until consent is re-granted.

### No-consent mode behavior

When consent is denied, Clarity assigns a **unique ID per page view** — no cross-session persistence, no cookies. Limited tracking only.

### Integration with consent banner

```js
// Fire after user accepts cookies
window.addEventListener('consentGranted', () => {
  window.clarity('consentv2', {
    ad_Storage: 'granted',
    analytics_Storage: 'granted'
  })
})
```

### GTM Consent Mode integration

Enable via **Settings → Setup** — Clarity auto-detects GTM and waits for Consent Mode v2 signals. Clarity maps `analytics_storage` → `analytics_Storage` and `ad_storage` → `ad_Storage`.

**If your Clarity project doesn't serve EEA/UK/CH traffic:** consent enforcement is inactive by default. Enable it explicitly in **Settings → Consent**.

---

## Heatmaps

Three heatmap types available at **Dashboard → Heatmaps**:

| Type | What it shows | Best for |
|------|--------------|---------|
| **Click** | All clicks — dead, rage, first, last | Finding broken elements, CTAs, navigation confusion |
| **Scroll** | How far users scroll on average | Fold placement, CTA positioning, content prioritization |
| **Area** | Total clicks per defined area with CTR | Comparing sections — hero vs. nav vs. footer |

### Color interpretation

Red = highest engagement. Blue = lowest. Dark red clusters on a non-clickable element = dead click problem.

### Service business interpretation guide

| Signal | What it means | Action |
|--------|--------------|--------|
| High scroll depth, low contact form clicks | Users read but don't act — CTA too far down or unclear | Move CTA above the fold or add inline CTA mid-page |
| Dead click cluster on phone number image | Phone number is an image, not a link | Make it an `<a href="tel:...">` |
| Low scroll on services page | Users leave before seeing pricing/benefits | Lead with the most compelling offer |
| Rage clicks on "Submit" button | Form submission failing silently | Fix validation errors, show inline feedback |
| High first-click on nav item that's empty | User expectation mismatch | That nav item needs content |
| Heat concentrated on hero, cold footer | Normal pattern — make hero do the conversion work | |

### Filtering heatmaps

Filter by device (desktop/tablet/mobile), date range, segment (e.g., AIPlatform traffic only). Device-specific heatmaps matter — mobile users behave differently on service pages.

---

## Session Recordings

Every session recorded by default. Access at **Dashboard → Recordings**.

### Filtering for CRO

Filter recordings by:
- **Smart events** — rage clicks, dead clicks, form submissions
- **Pages visited** — contact page, service pages
- **Session duration** — short sessions = quick bounces; long sessions = engaged or confused
- **Device type** — mobile users who abandon checkout
- **Traffic source** — AI platform referrals vs. organic search

### Timeline analysis

The playback timeline highlights smart event markers. Jump directly to:
- Rage click moments
- Form interaction starts/abandons
- Page navigation jumps (quick backs)

### What to look for on contact form sessions

1. Did they scroll to the form?
2. Did they click into any field?
3. Where did they stop (first field that caused abandonment)?
4. Did they submit or rage-click the submit button?
5. Did they quick-back after submission (confusion about confirmation)?

### Prioritizing recordings with `upgrade`

```js
// Force a session into the recording pool (useful if daily 100K limit is hit)
window.clarity('upgrade', 'rage-click-on-cta')
```

Call this when you detect specific user behavior worth recording at high volume.

---

## Smart Events

Clarity auto-detects nine event types and surfaces them code-free:

| Auto Event | Trigger |
|-----------|---------|
| Purchase | Checkout completion signals |
| Add to Cart | Cart interaction signals |
| Begin Checkout | Checkout flow start |
| Contact Us | Contact form/button interactions |
| Submit Form | Any form submission |
| Request Quote | Quote request interactions |
| Sign Up | Registration flow |
| Login | Auth form interactions |
| Download | File download clicks |

These appear in **Settings → Smart Events** as "Defined by Clarity" — edit or extend without writing code.

### Friction-signal events (built-in behavior tracking)

Beyond auto events, Clarity tracks these behavioral signals used in session filters and the Data Export API:

| Signal | What it means |
|--------|--------------|
| **Dead Click** | Click with no detectable page response — broken element or misleading UI |
| **Rage Click** | Rapid repeated clicks in same area — user frustration |
| **Excessive Scroll** | Unusual up-down scroll behavior — user disorientation or searching for content |
| **Quick Back** | User navigated to page then immediately hit back — content expectation mismatch |
| **Scripting Error** | JS error occurred during session — something broke |
| **Error Click** | Click near or on an error element |

### Custom smart events (no-code)

**Settings → Smart Events → New event** — combine button clicks, API events, and page visits into named events. Max 20 custom events per project.

### Custom events via API

```js
// Track specific interactions manually
window.clarity('event', 'contactFormStarted')
window.clarity('event', 'phoneNumberClicked')
window.clarity('event', 'servicePageScrolled50pct')
```

Events appear alongside auto events in Filters, Dashboard, Settings, and Recordings.

---

## Copilot AI

Copilot is Clarity's built-in AI — powered by the same LLMs as ChatGPT. Access via the Copilot tab in your dashboard.

### Features

| Feature | What it does |
|---------|-------------|
| **Chat** | Ask natural language questions about your project data |
| **Session Insights** | AI summary of a single recording — saves watching the whole thing |
| **Grouped Session Insights** | AI summary across multiple recordings at once |
| **Heatmaps Insights** | AI summary across all heatmap types for a page, across devices |
| **Ad Campaign Insights** | Combines campaign performance + behavior data for narrative summaries |

### Enable Copilot

**Settings → Copilot → Copilot features** — toggle features on/off. Complete the onboarding checklist for faster access.

### Useful Chat prompts

```
Which pages have the highest rage click rate?

Show me sessions where users visited the contact page but didn't submit the form

What device has the worst engagement time on the homepage?

Which traffic source has the most dead clicks?

Summarize the last 50 sessions on the services page

What pages are users leaving most quickly?

Compare scroll depth on mobile vs desktop for the contact page
```

### Copilot limitations

Generative AI can misinterpret data. Cross-verify significant findings against raw recordings and heatmap data before acting. Use the thumbs-down feedback button to flag bad outputs.

---

## AI Chat Channel Groups

Clarity auto-classifies sessions from LLM platforms into two channels — no setup required. Available in **Dashboard → Traffic → Channels tab**.

| Channel | What it captures |
|---------|----------------|
| **AIPlatform** | Sessions from organic AI responses (ChatGPT, Claude, Gemini, Copilot, Perplexity) |
| **PaidAIPlatform** | Sessions from paid ads within AI platforms (e.g., sponsored results in Copilot) |

### Supported AI sources

ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com), Microsoft Copilot (copilot.microsoft.com), Perplexity AI

Only direct visits from standalone AI platforms count. AI features embedded in search engines or office tools are excluded.

### Why this matters

AI-referred traffic converts at roughly 3x the rate of organic search. If your site gets mentioned in AI responses, these visitors are already pre-qualified. Clarity lets you:

- Measure AI referral volume over time
- Compare engagement metrics vs. search/social/direct
- Identify which pages get AI-referred visitors
- Attribute contact form submissions to AI sources

### How to use

1. Go to **Dashboard → Traffic (Referrer card) → Channels tab**
2. Select **AIPlatform** or **PaidAIPlatform** to filter all data to that traffic segment
3. View heatmaps and recordings for AI-referred sessions specifically
4. Add to **Watchlist** for persistent monitoring

### Limitation

If the AI platform hides referral info (some privacy-enhanced modes), traffic appears as **Direct**. Numbers represent floor estimates, not exact counts.

Cross-reference: `ai-visibility` — Clarity's AI channel groups show whether your content is generating AI-referred traffic, validating AI visibility efforts.

---

## Data Export API

Export dashboard data programmatically for external analysis. Requires admin access.

### Authentication

JWT tokens — generated per project, no OAuth flow.

1. **Settings → Data Export → Generate new API token**
2. Token name: 4–32 chars, alphanumeric + hyphens/underscores/periods, no spaces
3. Store token in environment variable — it's shown once

```bash
CLARITY_API_TOKEN=your_jwt_token_here
```

### Endpoint

```
GET https://www.clarity.ms/export-data/api/v1/project-live-insights
Authorization: Bearer YOUR_TOKEN
```

### Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `numOfDays` | `1`, `2`, `3` | Last 24/48/72 hours |
| `dimension1` | See dimensions | First breakdown |
| `dimension2` | See dimensions | Second breakdown |
| `dimension3` | See dimensions | Third breakdown |

**Available dimensions:** Browser, Device, Country/Region, OS, Source, Medium, Campaign, Channel, URL

**Available metrics in response:** Scroll Depth, Engagement Time, Traffic, Popular Pages, Dead Click Count, Excessive Scroll, Rage Click Count, Quickback Click, Script Error Count, Error Click Count

### Example request

```bash
curl 'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=Channel' \
  -H 'Authorization: Bearer $CLARITY_API_TOKEN' \
  -H 'Content-Type: application/json'
```

### JavaScript/TypeScript

```ts
const response = await fetch(
  'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=Channel',
  {
    headers: {
      Authorization: `Bearer ${process.env.CLARITY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }
)
const data = await response.json()
```

### Limits

- 10 API requests per project per day
- Data for previous 1–3 days only
- Max 3 dimensions per request
- Response capped at 1,000 rows, no pagination

---

## Custom Identifiers & Tags

### Identify users

Link Clarity sessions to your own user IDs — enables filtering recordings by specific users or sessions.

```js
// Call on every page — only custom-id is required
window.clarity('identify',
  'user-123',           // custom-id (required) — your internal user ID
  'session-abc',        // custom-session-id (optional)
  'page-contact',       // custom-page-id (optional)
  'John Smith'          // friendly-name (optional)
)
```

Call this on every page load, even if only passing `custom-id`. Clarity uses it to stitch sessions together correctly.

### Custom tags

Segment sessions by arbitrary metadata — appears in Clarity Filters.

```js
// Single value
window.clarity('set', 'userType', 'returning-customer')
window.clarity('set', 'serviceInterest', 'hvac-repair')

// Multiple values
window.clarity('set', 'pagesVisited', ['services', 'contact', 'pricing'])

// A/B test variant
window.clarity('set', 'experiment', 'hero-cta-v2')
```

No limit on number of custom tags. Useful for filtering recordings by business-relevant segments.

---

## Integration Patterns

### Running alongside GA4 and PostHog

All three tools coexist. No conflicts. Clarity fires its own script independently.

```
GA4           → event tracking, conversions, acquisition funnels
PostHog       → product analytics, feature flags, A/B tests
Clarity       → behavior layer — heatmaps, recordings, friction signals
```

Clarity complements but doesn't replace GA4. For service businesses: use GA4 for call/form conversion tracking, Clarity to diagnose *why* users aren't converting.

### Consent management across tools

```js
// Single consent handler — grant all three when user accepts
function grantAnalyticsConsent() {
  // GA4 / GTM Consent Mode
  window.gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted'
  })

  // Clarity Consent V2
  window.clarity('consentv2', {
    ad_Storage: 'granted',
    analytics_Storage: 'granted'
  })

  // PostHog (if using opt-in mode)
  window.posthog?.opt_in_capturing()
}
```

### Data layer coordination

```js
// Push Clarity session data to dataLayer for GTM access
window.clarity('set', 'pageType', 'service-landing')
window.dataLayer?.push({
  event: 'claritySessionTagged',
  claritySessionId: window.clarity?.('s') ?? null,
  pageType: 'service-landing'
})
```

### Masking sensitive content

```html
<!-- Mask entire form -->
<form data-clarity-mask="true">
  <input type="text" name="ssn" />
</form>

<!-- Unmask specific element inside masked parent -->
<div data-clarity-mask="true">
  <p data-clarity-unmask="true">This text is visible in recordings</p>
  <input type="password" /> <!-- stays masked -->
</div>
```

Clarity masks all input content, numbers, and email addresses by default. Use `data-clarity-unmask` only for non-sensitive content you need to see in recordings.

---

## Cross-References

| Skill | Connection |
|-------|-----------|
| `cro-audit` | Clarity provides the behavior data (heatmaps + recordings) that a CRO audit analyzes |
| `ab-testing` | Use session recordings filtered by experiment variant to validate hypotheses |
| `server-side-tracking` | Clarity is analytics-tier — fire unconditionally, no consent gate for non-EEA traffic |
| `ai-visibility` | AI Chat Channel Groups validate whether AI visibility efforts are driving actual referral traffic |
| `posthog` | PostHog handles events/flags; Clarity handles behavior visualization — complementary, not competing |
| `ga4-api` | GA4 tracks conversions; Clarity diagnoses why conversions aren't happening |

## Full Reference

See `reference.md` for complete API: all `window.clarity()` methods, Data Export API endpoints, Smart Event types, Copilot prompt patterns, and integration code.
