---
model: claude-sonnet-4-6
name: web-performance
description: Use when diagnosing or fixing Core Web Vitals issues, optimizing LCP/INP/CLS, auditing third-party scripts, or implementing performance budgets. Also use when correlating performance with search rankings or conversion rates.
---

# Web Performance

## Overview

Systematic CWV diagnosis and fix workflow. Not a checklist run-through — a root cause investigation. Pull field data first, compare against lab, identify the failing metric and specific element, then apply targeted fixes in priority order.

**INP replaced FID as a Core Web Vital in March 2024.** Do not reference FID for CWV assessment.

**Called by:** `seo-audit` Phase 4.5 when CWV thresholds fail.

---

## Section 1 — Diagnosis

### CrUX (Field) vs Lighthouse (Lab)

Pull both before touching anything. The gap between lab and field reveals where to focus.

| Source | What it measures | Use for |
|--------|-----------------|---------|
| CrUX (field) | Real users, real devices, real networks — 28-day P75 | CWV pass/fail, Google ranking signal |
| Lighthouse (lab) | Simulated throttled Moto G4 on 4G | Reproducible regression detection in CI |

Use `crux-api` to pull field data. Use `lighthouse-api` for lab data. Always check mobile (`PHONE` form factor) — Google evaluates CWV using mobile data for most sites.

```
## Lab vs Field Snapshot
| Metric | Field P75 (mobile) | Lab (mobile) | Gap |
|--------|--------------------|--------------|-----|
| LCP    |                    |              |     |
| INP    |                    |              |     |
| CLS    |                    |              |     |
```

**Large field > lab gap** means: third-party scripts loading post-measurement, geographic distribution (distant users = high TTFB), real device variance (low-end Android), or cache behavior differences (first vs returning visitors).

### CWV Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|--------------------|------|
| LCP | < 2.5s | 2.5s – 4s | > 4s |
| INP | < 200ms | 200ms – 500ms | > 500ms |
| CLS | < 0.1 | 0.1 – 0.25 | > 0.25 |

Pass/fail is assessed at the P75 of real user data — 75% of page visits must meet the "good" threshold.

### Decision Tree — Which Section to Use

```
Field data fails?
├── LCP > 2.5s   → Section 2 (LCP Fixes)
├── INP > 200ms  → Section 3 (INP Fixes)
├── CLS > 0.1    → Section 4 (CLS Fixes)
└── All good in field but poor lab → Section 5 (Third-Party Scripts)

Large lab/field gap with no clear metric failure?
└── Section 5 (Third-Party Scripts) — scripts invisible to lab

All metrics borderline?
└── All sections apply — prioritize LCP → CLS → INP
```

---

## Section 2 — LCP Fixes

LCP = Largest Contentful Paint. Usually the hero image, main heading, or above-the-fold background image.

### Identify the LCP Element

```
Chrome DevTools → Performance panel → Record page load
→ Find "LCP candidate" in Timings row
→ Click → inspect which element (image URL or text node)
```

Alternatively, run in console after page load:

```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LCP element:', entry.element, 'time:', entry.startTime);
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

### LCP Sub-Phase Breakdown

| Sub-phase | Target | Common Root Cause |
|-----------|--------|------------------|
| TTFB | < 800ms | No CDN, cold server, slow DB on first render |
| Load delay | < 200ms | LCP image not in initial HTML (injected by JS) |
| Load duration | < 1200ms | Oversized image, wrong format, no preload |
| Render delay | < 500ms | Render-blocking scripts/CSS, font blocking |

### Fix Priority (most impactful first)

**1. fetchpriority="high" on the LCP image**

Supported in Chrome 102+, Safari 17.2+, Firefox 132+. One of the highest-ROI fixes with zero downside for unsupported browsers (it's a hint, not a directive).

```html
<!-- LCP hero image — always fetchpriority="high" -->
<img
  src="/hero.avif"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
  decoding="async"
/>
```

Never set `loading="lazy"` on the LCP image. Lazy loading defers the request — the opposite of what you want.

**2. Preload the LCP image**

If the LCP image is not discoverable in the initial HTML (e.g., it's a CSS background or injected by JS), add a preload hint in `<head>`:

```html
<link
  rel="preload"
  as="image"
  href="/hero.avif"
  fetchpriority="high"
  imagesrcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero.avif 1200w"
  imagesizes="100vw"
/>
```

**3. Convert LCP image to AVIF/WebP**

AVIF is 40-50% smaller than JPEG at equivalent quality. WebP is 25-35% smaller.

```html
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" width="1200" height="600" fetchpriority="high" />
</picture>
```

**4. Reduce TTFB**

- Move static assets to a CDN (Cloudflare, Vercel Edge, Fastly)
- Add `Cache-Control: stale-while-revalidate=86400` on API responses used at render time
- Use edge functions for server-side rendering — reduce origin round-trip
- Preconnect to critical origins: `<link rel="preconnect" href="https://fonts.gstatic.com">`

**5. Eliminate render-blocking resources**

```html
<!-- Scripts: always async or defer unless critical -->
<script src="/analytics.js" async></script>
<script src="/non-critical.js" defer></script>

<!-- CSS: inline critical CSS, defer the rest -->
<style>/* critical CSS here */</style>
<link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'" />
```

**6. Fix font loading**

Fonts blocking render are a common hidden LCP killer:

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap; /* or 'optional' to eliminate FOUT entirely */
}
```

Preload the primary font weight in `<head>`:

```html
<link rel="preload" as="font" href="/fonts/myfont.woff2" type="font/woff2" crossorigin />
```

**7. Speculation Rules API (Chrome/Edge/Opera)**

For instant page navigations — the next page renders before the user clicks:

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/product/*" },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "where": { "selector_matches": "a[href]" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

Eagerness settings:
- `immediate` — prerender/prefetch now
- `moderate` — on hover for 200ms
- `conservative` — on pointer-down (safest, lowest resource cost)

Note: Speculation Rules API is Chromium-only (Chrome, Edge, Opera). Other browsers ignore it gracefully. Safari support is in development.

---

## Section 3 — INP Fixes

INP = Interaction to Next Paint. Measures the worst interaction delay in a user session. **Replaced FID in March 2024.**

INP > 200ms means users experience sluggish interactions — clicks, taps, key presses that don't respond instantly.

### Identify Bad Interactions

```
Chrome DevTools → Performance Insights panel
→ "INP" section shows worst interaction
→ Breakdown: input delay + processing time + presentation delay
```

Or use the web-vitals library:

```javascript
import { onINP } from 'web-vitals/attribution';

onINP(({ value, attribution }) => {
  const { eventType, eventTarget, eventTime, processingStart, processingEnd, longAnimationFrameEntries } = attribution;
  console.log(`INP: ${value}ms — ${eventType} on ${eventTarget}`);
  console.log(`Input delay: ${processingStart - eventTime}ms`);
  console.log(`Processing time: ${processingEnd - processingStart}ms`);
});
```

### Fix Priority

**1. Break long tasks with scheduler.yield()**

Tasks > 50ms block the main thread and cause input delay. Yield every ~50ms to let interactions through.

`scheduler.yield()` is available in Chrome 129+ and Chromium-based browsers. Always feature-detect and provide a fallback:

```javascript
// Feature-detect scheduler.yield with fallback
async function yieldToMain() {
  if ('scheduler' in globalThis && 'yield' in scheduler) {
    return scheduler.yield();
  }
  // Fallback: setTimeout(0) yields but loses queue priority
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Break a long loop into chunks
async function processItems(items) {
  let deadline = performance.now() + 50;

  for (const item of items) {
    processItem(item);

    if (performance.now() >= deadline) {
      await yieldToMain();
      deadline = performance.now() + 50;
    }
  }
}
```

Key advantage of `scheduler.yield()` over `setTimeout(0)`: continuation goes to the front of the task queue, so resumed work isn't delayed by other queued tasks.

**2. Move heavy computation to Web Workers**

Long-running CPU work (data processing, image manipulation, encryption) should never run on the main thread:

```javascript
// worker.js
self.onmessage = ({ data }) => {
  const result = heavyComputation(data);
  self.postMessage(result);
};

// main.js
const worker = new Worker('/worker.js');
worker.postMessage(inputData);
worker.onmessage = ({ data }) => updateUI(data);
```

**3. Debounce and throttle event handlers**

```javascript
// Debounce — fire once after activity stops
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Use passive listeners for scroll/touch — never blocks rendering
document.addEventListener('scroll', handleScroll, { passive: true });
document.addEventListener('touchstart', handleTouch, { passive: true });
```

**4. Batch DOM reads and writes (avoid layout thrashing)**

Alternating reads and writes forces repeated synchronous layouts — each pair can add 10-50ms:

```javascript
// BAD: read-write-read-write causes multiple layouts
elements.forEach(el => {
  const height = el.offsetHeight; // read (triggers layout)
  el.style.height = height * 2 + 'px'; // write
});

// GOOD: batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // all reads
elements.forEach((el, i) => el.style.height = heights[i] * 2 + 'px'); // all writes
```

**5. content-visibility: auto for off-screen content**

Skips rendering of off-screen sections until they scroll into view:

```css
.content-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* reserve estimated height */
}
```

**6. Reduce event listener overhead**

Use event delegation instead of per-element listeners for large lists:

```javascript
// BAD: 1000 event listeners
items.forEach(item => item.addEventListener('click', handler));

// GOOD: one listener on the parent
list.addEventListener('click', (e) => {
  const item = e.target.closest('[data-item]');
  if (item) handler(item);
});
```

---

## Section 4 — CLS Fixes

CLS = Cumulative Layout Shift. Measures visual instability — elements moving after the page loads.

### Common Causes and Fixes

| Cause | Fix |
|-------|-----|
| Images without dimensions | Always set `width` + `height` attributes |
| Videos/iframes without reserved space | Use `aspect-ratio` CSS |
| Ads without reserved space | Fixed-height container before ad loads |
| Dynamic content injected above existing | Insert below fold or reserve space |
| Late-loading consent banners | Reserve banner height in layout |
| Web fonts causing FOUT | `font-display: swap` or preload font |
| CSS animations using position properties | `transform` only — never `top/left/width/height` |

### Fix: Explicit Dimensions on Images

Always set both `width` and `height` attributes. The browser uses these to calculate aspect ratio before the image loads.

```html
<img src="/product.jpg" alt="Product" width="800" height="600" />
```

CSS to maintain responsiveness with explicit dimensions:

```css
img {
  max-width: 100%;
  height: auto; /* preserves aspect-ratio from HTML attributes */
}
```

### Fix: aspect-ratio for Embeds

```css
.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
}

.video-container iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
```

### Fix: Font Fallback Metrics

Eliminate font FOUT (Flash of Unstyled Text) by matching system font metrics to the web font:

```css
@font-face {
  font-family: 'MyFont-fallback';
  src: local('Arial');
  /* Size-adjust, ascent-override, descent-override values —
     calculate with https://screenspan.net/fallback */
  size-adjust: 103%;
  ascent-override: 89%;
  descent-override: 21%;
  line-gap-override: 0%;
}

body {
  font-family: 'MyFont', 'MyFont-fallback', Arial, sans-serif;
}
```

### Fix: Animations Using transform Only

```css
/* BAD — triggers layout recalculation, causes CLS */
.element {
  transition: top 0.3s, left 0.3s, width 0.3s;
}

/* GOOD — compositor-only, zero layout impact */
.element {
  transition: transform 0.3s, opacity 0.3s;
  will-change: transform; /* sparingly — only when actively animating */
}
```

### Fix: Ad Placeholder Containers

Reserve space before ads load to prevent content jumping down:

```html
<div class="ad-container" style="min-height: 250px; width: 300px;">
  <!-- Ad loads here — container height pre-reserved -->
</div>
```

---

## Section 5 — Third-Party Scripts

Third-party scripts are the #1 cause of real-world CWV failures that don't appear in lab data (Lighthouse uses no third-party scripts by default).

### Script Audit

For each third-party script, capture:

| Script | Size | Main Thread Time | Load Strategy | Blocks LCP? | Blocks INP? |
|--------|------|-----------------|---------------|-------------|-------------|
| Google Tag Manager | | | | | |
| Chat widget | | | | | |
| Facebook Pixel | | | | | |
| Hotjar | | | | | |
| Intercom | | | | | |

Use Chrome DevTools → Network tab → filter by third-party domains. Use Coverage tab to identify unused JavaScript.

### Loading Strategies by Script Type

**async** — Fetches in parallel, executes immediately when downloaded. Use for scripts that don't depend on DOM order:

```html
<script src="https://analytics.example.com/script.js" async></script>
```

**defer** — Fetches in parallel, executes after HTML parsing. Use for scripts that need the DOM but aren't critical:

```html
<script src="https://widget.example.com/embed.js" defer></script>
```

**Dynamic import** — Load on user interaction or after LCP:

```javascript
// Load chat widget only after user interaction
document.addEventListener('click', () => {
  import('https://chat.example.com/widget.js').then(module => module.init());
}, { once: true });

// Or after LCP fires
new PerformanceObserver(() => {
  const script = document.createElement('script');
  script.src = 'https://widget.example.com/embed.js';
  document.head.appendChild(script);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

**Facade pattern** — Show a static placeholder; load the real embed only on user click. Eliminates the script from initial load entirely:

```html
<!-- YouTube facade — lite-youtube-embed library -->
<lite-youtube videoid="dQw4w9WgXcQ" playlabel="Play video"></lite-youtube>

<!-- Or custom facade -->
<div class="embed-facade" data-src="https://player.vimeo.com/video/123456">
  <img src="/video-thumbnail.jpg" alt="Video thumbnail" />
  <button class="play-btn">▶ Play</button>
</div>

<script>
document.querySelectorAll('.embed-facade').forEach(facade => {
  facade.querySelector('.play-btn').addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = facade.dataset.src + '?autoplay=1';
    iframe.allow = 'autoplay; fullscreen';
    facade.replaceWith(iframe);
  });
});
</script>
```

### GTM Optimization

Reference `google-tag-manager` for full GTM audit. Key patterns:

- Move GTM snippet to end of `<body>` if it's currently blocking `<head>` render
- Audit active tags — remove/disable tags not firing in the last 90 days
- Use trigger sequencing — fire marketing pixels only after DOM Interactive, not on All Pages immediately
- Consent-gated loading: wrap marketing pixels in consent check — only fire after user accepts:

```javascript
// In GTM Custom HTML tag — consent-gated pattern
(function() {
  if (typeof gtag !== 'undefined') {
    // Only fire if marketing consent granted
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_check',
      marketing_consent: window.consentGranted ? 'granted' : 'denied'
    });
  }
})();
```

Reference `server-side-tracking` for moving pixel tracking server-side — eliminates client-side script weight entirely for conversion events.

### Preconnect Hints for Critical Third Parties

Add to `<head>` for origins that will definitely be used:

```html
<!-- Connect early to reduce TTFB for third-party resources -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preconnect" href="https://www.googletagmanager.com" />

<!-- dns-prefetch as fallback for older browsers -->
<link rel="dns-prefetch" href="https://www.google-analytics.com" />
```

Only preconnect to origins that load in the critical path. Unnecessary preconnects waste browser resources.

### View Transitions API — Performance Note

The View Transitions API adds ~70ms to LCP on repeat mobile pageviews (based on real-user monitoring data). The correlation is stronger on slower CPUs. If implementing View Transitions, monitor CrUX field data for LCP regression after rollout. As of 2025, View Transitions is Baseline Newly Available across Chrome, Edge, Safari, and Firefox 144+.

```javascript
// Check support before using
if (document.startViewTransition) {
  document.startViewTransition(() => updateDOM());
} else {
  updateDOM(); // instant fallback — no visual regression
}
```

---

## Section 6 — Verification

### Before/After Comparison

Field data (CrUX) is a 28-day rolling average. Changes deploy → visible in field data **after 28 days**. Don't declare victory based on lab data alone.

```
Timeline after deploying a fix:
Day 0   → Deploy fix
Day 2   → CrUX data starts including new sessions
Day 14  → ~50% of CrUX window is post-fix
Day 28  → Full CrUX window reflects the fix
Day 28+ → Compare field P75 vs pre-deploy baseline
```

Use `crux-api` History API to pull weekly trend and measure the delta:

```javascript
// Pull 12-week trend to see pre/post deploy
const trend = await getLcpTrend('https://example.com');
const preDeploy = trend[trend.length - 5].p75;  // ~4 weeks ago
const postDeploy = trend[trend.length - 1].p75; // current
console.log(`LCP delta: ${postDeploy - preDeploy}ms`);
```

### Performance Budgets

Set hard budgets anchored to CWV thresholds. Enforce in CI so regressions never reach production:

| Metric | Budget (Lab) | Threshold (Field) |
|--------|-------------|------------------|
| LCP | < 2.5s | < 2.5s P75 |
| INP | < 200ms | < 200ms P75 |
| CLS | < 0.1 | < 0.1 P75 |
| TBT (proxy for INP in lab) | < 200ms | — |
| Total Blocking Time | < 200ms | — |

### Lighthouse CI Integration

```yaml
# .github/workflows/perf.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      https://staging.example.com/
      https://staging.example.com/products/
    budgetPath: ./budget.json
    uploadArtifacts: true

# budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "total-blocking-time", "budget": 200 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 }
    ]
  }
]
```

### Ongoing Monitoring Schedule

| Cadence | Action | Tool |
|---------|--------|------|
| Weekly | Run Lighthouse on key pages (lab) | `lighthouse-api` |
| Monthly | Pull CrUX P75 trend for mobile | `crux-api` History API |
| After every deploy | Run Lighthouse CI gate on staging | Lighthouse CI |
| Monthly | Correlation check — CWV vs GSC position | `crux-api` + GSC |

---

## Output Template

```
## Performance Audit — [Site Name]

### CWV Status
| Metric | Field (P75) | Lab | Threshold | Status |
|--------|------------|-----|-----------|--------|
| LCP    | ...        | ... | < 2.5s    | ✓/✗    |
| INP    | ...        | ... | < 200ms   | ✓/✗    |
| CLS    | ...        | ... | < 0.1     | ✓/✗    |

### Third-Party Impact
| Script | Size | Blocking Time | Load Strategy | Action |
|--------|------|--------------|---------------|--------|
| ...    | ...  | ...          | sync/async/defer | ... |

### Fix Priority
| # | Fix | Metric | Expected Impact | Effort |
|---|-----|--------|----------------|--------|
| 1 | fetchpriority="high" on LCP image | LCP | -300ms | Low |
| 2 | Convert hero to AVIF | LCP | -200ms | Low |
| 3 | Defer chat widget | LCP + INP | -150ms LCP, -80ms INP | Low |
| 4 | Add explicit image dimensions | CLS | -0.08 CLS | Low |
| 5 | ... | ... | ... | ... |
```

---

## Related Skills

- `crux-api` — Field data (28-day P75, History API for trend analysis)
- `lighthouse-api` — Lab data counterpart to CrUX
- `google-tag-manager` — GTM audit and tag optimization
- `server-side-tracking` — Consent-gated script loading, move pixels server-side
- `cro-audit` — Performance-to-conversion correlation analysis
- `seo-audit` — Triggers this skill in Phase 4.5 when CWV thresholds fail
- `seo-pulse` — Monthly CWV check as part of SEO health
