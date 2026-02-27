---
model: claude-sonnet-4-6
name: posthog
description: Use when integrating PostHog for product analytics, feature flags, A/B testing, or session replay. Also use when choosing between analytics tools or implementing event tracking in a web application.
---

# PostHog

## Overview
PostHog is an all-in-one product platform: analytics, session replay, feature flags, A/B testing, surveys, error tracking, and a data warehouse. Usage-based pricing — most teams pay $0–$900/month.

## Quick Reference

| Item | Value |
|------|-------|
| **JS SDK** | `npm install posthog-js` |
| **Node SDK** | `npm install posthog-node` |
| **Cloud Host** | `https://us.i.posthog.com` or `https://eu.i.posthog.com` |
| **Free Tier** | 1M events, 5K recordings, 1M flag requests/mo |
| **Docs** | `https://posthog.com/docs` |

## PostHogProvider (Next.js App Router)

```tsx
// app/providers.tsx — "use client"
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false, // manual in Next.js
    })
  }, [])
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}

// app/layout.tsx — wrap children with PHProvider
```

## Event Capture & Identify

```ts
// Capture event
posthog.capture('button_clicked', { button_name: 'upgrade', plan: 'pro' })

// Identify user
posthog.identify(userId, { email, name, plan })

// Reset on logout
posthog.reset()
```

## Feature Flag Check

```ts
// Client-side
const enabled = posthog.isFeatureEnabled('my-flag')
const variant = posthog.getFeatureFlag('my-experiment') // 'control' | 'test'

// Server-side (posthog-node)
const client = new PostHog(process.env.POSTHOG_KEY!)
const flag = await client.isFeatureEnabled('my-flag', userId)
await client.shutdown()
```

## Pricing Snapshot (2026)

| Product | Free | Paid starts at |
|---------|------|---------------|
| Analytics | 1M events/mo | $0.00005/event |
| Session Replay | 5K recordings/mo | $0.005/recording |
| Feature Flags | 1M requests/mo | $0.0001/request |
| Surveys | 250 responses/mo | $0.20/response |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `capture_pageview: true` in Next.js App Router | Set to `false`; fire manually on route change |
| Calling `posthog.init()` on server component | Init only in `"use client"` component |
| Not calling `client.shutdown()` in Node | Always await shutdown to flush queue |
| Blocking SSR with flag checks | Use `posthog-node` server-side; never wait client-side |
| Skipping `identify` after login | Call immediately post-auth; pre-login events auto-alias |

## Funnel Insights for CRO

Build conversion funnels in PostHog: **Insights → + New Insight → Funnel**.

Typical service business funnel:
1. `page_viewed` (landing page)
2. `section_scrolled` or `cta_clicked` (engagement)
3. `pricing_viewed` or `form_started` (intent)
4. `contact_form_submitted` (contact)
5. `confirmation_page_viewed` (confirmation)

```ts
// Capture each funnel step
posthog.capture('page_viewed', { path: '/', source: 'google' })
posthog.capture('cta_clicked', { button: 'get-quote', section: 'hero' })
posthog.capture('form_started', { form: 'contact' })
posthog.capture('contact_form_submitted', { form: 'contact' })
posthog.capture('confirmation_page_viewed', { form: 'contact' })
```

**Drop-off analysis:** PostHog shows % conversion between each step and highlights the biggest drop. Use **Breakdown by** (device type, UTM source, page) to segment.

> See `cro-audit` for the full conversion analysis framework.

## Session Replay for Friction

**Filter replays by conversion outcome:**
- Insights → Session Recordings → Add filter → `Funnel step` or specific event
- Example: show sessions where `form_started` fired but `contact_form_submitted` did NOT

```ts
// posthog.init config — always mask inputs in recordings
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  capture_pageview: false,
  session_recording: {
    maskAllInputs: true, // masks form field values
  },
})
```

**Friction signals to look for:**
- Rage clicks (rapid clicks on non-interactive elements)
- Dead clicks (clicks with no response)
- U-turns (immediate back navigation)
- Long pauses before form submission

Pair replay with heatmaps: open a recording, then check the Heatmap tab for that page.

> See `microsoft-clarity` for complementary heatmap and behavior analysis.

## Web Analytics Dashboard

PostHog replaces GA4 for most service business use cases — no sampling, no data retention limits, no consent mode complexity.

**Key metrics available out of the box:**
- Unique visitors, pageviews, sessions
- Bounce rate, session duration
- Top pages, top referrers, top countries
- UTM campaign breakdown

**Web Analytics view:** PostHog app → Web Analytics (sidebar). Requires `capture_pageview` events flowing in.

**Custom dashboards:**
1. Dashboards → + New Dashboard
2. Add insight tiles (funnels, trends, retention, etc.)
3. Share: copy link or embed — no login required for shared dashboards
4. Schedule: set email digest (daily/weekly) from dashboard settings

```ts
// Manual pageview for Next.js App Router
// app/components/PostHogPageview.tsx
'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

export function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (pathname && posthog) {
      posthog.capture('$pageview', { $current_url: window.location.href })
    }
  }, [pathname, searchParams, posthog])

  return null
}
```

## Heatmap Usage

**Enable heatmaps:** PostHog Toolbar → launch on any page → click the Heatmaps icon.

**Click heatmaps** — shows where users click most. High-value reads:
- Clicks on non-linked elements = navigation confusion
- Ignored CTAs = copy or placement issue
- High clicks below the fold = users engaging deeper than expected

**Scroll depth** — shows how far users scroll on a page. Useful for:
- Placing CTAs at the right scroll depth
- Identifying content that gets skipped
- Validating above-the-fold priority

**PostHog heatmaps vs Clarity heatmaps:**

| | PostHog | Microsoft Clarity |
|---|---------|------------------|
| Best for | Funnels + heatmaps in one tool | Deep session-level behavior |
| Scroll depth | ✓ | ✓ |
| Click heatmaps | ✓ | ✓ |
| Rage/dead click detection | Via replay filters | Native, auto-surfaced |
| Funnel correlation | Native | Manual cross-reference |
| Cost | Free tier included | Free |

Use PostHog when you want heatmap data correlated with funnel steps. Use Clarity when you need richer automatic behavior signals (rage clicks, dead clicks, JS errors) without manual setup.

## Experiment API for A/B Testing

**Create an experiment:**
1. Feature Flags → Experiments → + New Experiment
2. Set control variant (`control`) and test variant(s) (`test`)
3. Define goal metric (e.g. `contact_form_submitted` conversion rate)
4. Set minimum detectable effect (typically 10–20%) and confidence threshold (95%)

```ts
// Check variant and capture experiment exposure
const variant = posthog.getFeatureFlag('homepage-cta-experiment')

// Capture exposure (PostHog needs this to count participants)
posthog.capture('$feature_flag_called', {
  $feature_flag: 'homepage-cta-experiment',
  $feature_flag_response: variant,
})

// Render based on variant
if (variant === 'test') {
  return <CTAButton text="Get Your Free Quote" />
} else {
  return <CTAButton text="Contact Us" />
}
```

**Analyze results:**
- Experiments dashboard shows conversion rate per variant, statistical significance, and confidence interval
- PostHog uses Bayesian statistics — "probability to be best" not p-value
- Minimum sample size calculator built into experiment setup
- Check for **SRM (Sample Ratio Mismatch)** — if traffic split deviates >5% from expected, the result is unreliable

> See `ab-testing` for the full experiment lifecycle including hypothesis design, SRM checks, and guardrail metrics.

## Full Reference

See `reference.md` for complete docs: setup, event tracking, user identification, feature flags, A/B testing, session recording, web analytics, surveys, data warehouse, self-hosted vs cloud, and pricing details.
