# Chrome UX Report (CrUX) API -- Developer Reference

> **API Version:** v1 (current as of February 2026)
> **Base URL:** `https://chromeuxreport.googleapis.com/v1`
> **Official Docs:** https://developer.chrome.com/docs/crux/api

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [queryRecord Endpoint](#2-queryrecord-endpoint)
3. [queryHistoryRecord Endpoint](#3-queryhistoryrecord-endpoint)
4. [Request Body Schema](#4-request-body-schema)
5. [Response Schema](#5-response-schema)
6. [Metric Reference](#6-metric-reference)
7. [Rate Limits and Errors](#7-rate-limits-and-errors)
8. [Node.js Code Examples](#8-nodejs-code-examples)
9. [Desktop vs Mobile Comparison](#9-desktop-vs-mobile-comparison)

---

## 1. Authentication

CrUX API uses an API key (not OAuth). The key is passed as a query parameter on every request.

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Chrome UX Report API** in the API Library
4. Create an API key under Credentials
5. Restrict the key to the Chrome UX Report API (recommended)

### Usage

```
?key=YOUR_API_KEY
```

Append to every request URL:

```
https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=YOUR_API_KEY
```

Store the key in an environment variable — never hardcode it:

```bash
CRUX_API_KEY=your_key_here
```

---

## 2. queryRecord Endpoint

Returns a single 28-day aggregated snapshot of field data for an origin or URL.

```
POST https://chromeuxreport.googleapis.com/v1/records:queryRecord?key={API_KEY}
Content-Type: application/json
```

### cURL Example

```bash
curl -X POST \
  "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "https://example.com",
    "formFactor": "PHONE",
    "metrics": [
      "largest_contentful_paint",
      "cumulative_layout_shift",
      "interaction_to_next_paint"
    ]
  }'
```

---

## 3. queryHistoryRecord Endpoint

Returns a time series of weekly collection periods — up to 40 periods (~10 months) of history.

```
POST https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key={API_KEY}
Content-Type: application/json
```

### Differences from queryRecord

| Property | queryRecord | queryHistoryRecord |
|----------|-------------|---------------------|
| Data shape | Single snapshot | Time series array |
| `histogram` | `{ start, end, density }` | `histogramTimeseries[bin].densities[]` |
| `percentiles` | `{ p75: number }` | `percentilesTimeseries.p75s[]` |
| `collectionPeriod` | Single object | `collectionPeriods[]` (array) |
| Update cadence | Daily ~04:00 UTC | Weekly on Mondays |
| Max data range | 28-day rolling window | 40 periods (~10 months) |
| Extra request param | — | `collectionPeriodCount` (default 25, max 40) |

### cURL Example

```bash
curl -X POST \
  "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=$CRUX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "https://example.com",
    "formFactor": "PHONE",
    "metrics": ["largest_contentful_paint"],
    "collectionPeriodCount": 12
  }'
```

---

## 4. Request Body Schema

Both endpoints accept the same base schema. `queryHistoryRecord` adds `collectionPeriodCount`.

```jsonc
{
  // Required: one of origin OR url (not both)
  "origin": "https://example.com",   // Aggregates all pages on the origin
  "url": "https://example.com/page", // Data for a single URL only

  // Optional: filter by form factor
  // Omit to aggregate across all form factors
  "formFactor": "PHONE",             // "PHONE" | "DESKTOP" | "TABLET"

  // Optional: specify which metrics to return
  // Omit to return all available metrics
  "metrics": [
    "largest_contentful_paint",
    "cumulative_layout_shift",
    "interaction_to_next_paint",
    "first_contentful_paint",
    "experimental_time_to_first_byte",
    "round_trip_time",
    "navigation_types"
  ],

  // queryHistoryRecord only
  "collectionPeriodCount": 25        // Number of weekly periods to return (max 40)
}
```

### Notes

- `origin` and `url` are mutually exclusive. Use one or the other.
- `origin` must include the scheme (`https://`) and no trailing path.
- `url` query strings (`?utm_*`) and fragments (`#anchor`) are stripped via normalization.
- Omitting `metrics` returns all available metrics — larger payload, useful for exploration.

---

## 5. Response Schema

### queryRecord Response

```jsonc
{
  "record": {
    "key": {
      "origin": "https://example.com",  // or "url" if URL-level query
      "formFactor": "PHONE"             // present only if formFactor was specified
    },
    "metrics": {
      "largest_contentful_paint": {
        "histogram": [
          { "start": 0,    "end": 2500,  "density": 0.7214 }, // good
          { "start": 2500, "end": 4000,  "density": 0.1823 }, // needs improvement
          { "start": 4000,               "density": 0.0963 }  // poor (no "end")
        ],
        "percentiles": {
          "p75": 1840  // milliseconds
        }
      },
      "cumulative_layout_shift": {
        "histogram": [
          { "start": "0.00",  "end": "0.10",  "density": 0.8932 },
          { "start": "0.10",  "end": "0.25",  "density": 0.0712 },
          { "start": "0.25",                  "density": 0.0356 }
        ],
        "percentiles": {
          "p75": 0.04  // unitless score, rounded to 2 decimal places
        }
      },
      "interaction_to_next_paint": {
        "histogram": [
          { "start": 0,   "end": 200,  "density": 0.9120 },
          { "start": 200, "end": 500,  "density": 0.0621 },
          { "start": 500,              "density": 0.0259 }
        ],
        "percentiles": {
          "p75": 104  // milliseconds
        }
      }
    },
    "collectionPeriod": {
      "firstDate": { "year": 2026, "month": 1, "day": 19 },
      "lastDate":  { "year": 2026, "month": 2, "day": 15 }
    }
  },
  // Present only when the URL was normalized (query strings stripped, etc.)
  "urlNormalizationDetails": {
    "originalUrl": "https://example.com/page?utm_source=email",
    "normalizedUrl": "https://example.com/page"
  }
}
```

### queryHistoryRecord Response

```jsonc
{
  "record": {
    "key": {
      "origin": "https://example.com",
      "formFactor": "PHONE"
    },
    "metrics": {
      "largest_contentful_paint": {
        // histogramTimeseries: array of bins, each bin has densities[] matching collectionPeriods[]
        "histogramTimeseries": [
          {
            "start": 0, "end": 2500,
            "densities": [0.69, 0.71, 0.72, 0.73, 0.72]  // one per period
          },
          {
            "start": 2500, "end": 4000,
            "densities": [0.20, 0.18, 0.18, 0.17, 0.18]
          },
          {
            "start": 4000,
            "densities": [0.11, 0.11, 0.10, 0.10, 0.10]
          }
        ],
        "percentilesTimeseries": {
          "p75s": [1980, 1920, 1860, 1840, 1840]  // one per period, ms
        }
      }
    },
    // collectionPeriods[i] maps to densities[i] and p75s[i]
    "collectionPeriods": [
      {
        "firstDate": { "year": 2025, "month": 10, "day": 6  },
        "lastDate":  { "year": 2025, "month": 11, "day": 2  }
      },
      // ... more periods
      {
        "firstDate": { "year": 2026, "month": 1, "day": 19 },
        "lastDate":  { "year": 2026, "month": 2, "day": 15 }
      }
    ]
  }
}
```

---

## 6. Metric Reference

### Core Web Vitals

| Metric | API Key | Unit | Good | NI | Poor |
|--------|---------|------|------|----|------|
| Largest Contentful Paint | `largest_contentful_paint` | ms | ≤ 2500 | ≤ 4000 | > 4000 |
| Interaction to Next Paint | `interaction_to_next_paint` | ms | ≤ 200 | ≤ 500 | > 500 |
| Cumulative Layout Shift | `cumulative_layout_shift` | score | ≤ 0.1 | ≤ 0.25 | > 0.25 |

### Supporting Metrics

| Metric | API Key | Unit | Notes |
|--------|---------|------|-------|
| First Contentful Paint | `first_contentful_paint` | ms | Good ≤ 1800ms |
| Time to First Byte | `experimental_time_to_first_byte` | ms | Experimental. Good ≤ 800ms |
| Round Trip Time | `round_trip_time` | ms | Network latency context |
| Navigation Types | `navigation_types` | fractions | Distribution of navigate/reload/back_forward/etc. |

### LCP Breakdown Metrics

Diagnose which LCP phase is slowest.

| Metric | API Key |
|--------|---------|
| LCP Image TTFB | `largest_contentful_paint_image_time_to_first_byte` |
| LCP Image Resource Load Delay | `largest_contentful_paint_image_resource_load_delay` |
| LCP Image Resource Load Duration | `largest_contentful_paint_image_resource_load_duration` |
| LCP Image Element Render Delay | `largest_contentful_paint_image_element_render_delay` |

### Histogram Interpretation

```
density values:
  histogram[0].density = fraction of users in the "good" bucket
  histogram[1].density = fraction of users in the "needs improvement" bucket
  histogram[2].density = fraction of users in the "poor" bucket

All three densities should sum to ~1.0 (floating point rounding may make it 0.9999).

For CWV pass/fail: use percentiles.p75, not density.
For "what percentage of users have a good experience": use histogram[0].density * 100.
```

### Data Precision

- Most values rounded to 4 decimal places
- CLS rounded to 2 decimal places
- p75 values: integers for time-based metrics (ms), 2 decimal floats for CLS

---

## 7. Rate Limits and Errors

### Rate Limits

| Limit | Value |
|-------|-------|
| Queries per minute | 150 QPM per Google Cloud project |
| Cost | Free — quota cannot be increased |

For batch queries across many origins/URLs, implement a rate limiter: 150 QPM = 2.5 per second. Use a 500ms delay between requests to stay well under the cap.

### Error Codes

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| `200` | Success | Parse normally |
| `400` | Bad request — malformed body, invalid metric name, or both `origin` and `url` specified | Fix request body |
| `404` | No CrUX data for the origin/URL — insufficient traffic or not publicly discoverable | Handle gracefully — not every URL has data |
| `429` | Rate limit exceeded | Back off and retry with exponential delay |

### 404 Handling

A 404 does not mean the URL is broken — it means CrUX has no data. This is common for:

- Low-traffic pages (not enough users for statistical significance)
- Newly launched pages (not yet indexed with enough traffic)
- Pages behind authentication or with `noindex`

```javascript
if (res.status === 404) {
  return null;  // Caller handles "no data" case
}
```

### Retry with Backoff

```javascript
async function queryWithRetry(body, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${process.env.CRUX_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (res.status === 429) {
      const delay = Math.pow(2, attempt) * 1000;  // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`CrUX ${res.status}: ${await res.text()}`);

    return res.json();
  }
  throw new Error('Max retries exceeded');
}
```

---

## 8. Node.js Code Examples

### Basic Origin Query

```javascript
const API_KEY = process.env.CRUX_API_KEY;
const BASE_URL = 'https://chromeuxreport.googleapis.com/v1/records';

async function queryOrigin(origin, formFactor = null) {
  const body = {
    origin,
    metrics: [
      'largest_contentful_paint',
      'cumulative_layout_shift',
      'interaction_to_next_paint',
    ],
  };
  if (formFactor) body.formFactor = formFactor;

  const res = await fetch(`${BASE_URL}:queryRecord?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CrUX API error ${res.status}: ${await res.text()}`);

  return res.json();
}

// Usage
const data = await queryOrigin('https://example.com', 'PHONE');
if (data) {
  const lcp = data.record.metrics.largest_contentful_paint.percentiles.p75;
  const cls = data.record.metrics.cumulative_layout_shift.percentiles.p75;
  const inp = data.record.metrics.interaction_to_next_paint.percentiles.p75;

  const passes = lcp <= 2500 && cls <= 0.1 && inp <= 200;
  console.log(`CWV: ${passes ? 'PASS' : 'FAIL'} | LCP: ${lcp}ms | CLS: ${cls} | INP: ${inp}ms`);
}
```

### URL-Level Query

```javascript
async function queryUrl(url, formFactor = 'PHONE') {
  const res = await fetch(`${BASE_URL}:queryRecord?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      formFactor,
      metrics: ['largest_contentful_paint', 'cumulative_layout_shift', 'interaction_to_next_paint'],
    }),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CrUX API error ${res.status}`);

  const data = await res.json();

  // Log if URL was normalized
  if (data.urlNormalizationDetails) {
    console.log(`URL normalized: ${data.urlNormalizationDetails.originalUrl} → ${data.urlNormalizationDetails.normalizedUrl}`);
  }

  return data;
}
```

### History Trend Query

```javascript
async function queryHistory(origin, formFactor = 'PHONE', periodCount = 12) {
  const res = await fetch(`${BASE_URL}:queryHistoryRecord?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      formFactor,
      metrics: ['largest_contentful_paint', 'cumulative_layout_shift', 'interaction_to_next_paint'],
      collectionPeriodCount: periodCount,
    }),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CrUX History API error ${res.status}`);

  const data = await res.json();
  const { metrics, collectionPeriods } = data.record;

  // Zip periods with metric values
  return collectionPeriods.map((period, i) => {
    const endDate = `${period.lastDate.year}-${String(period.lastDate.month).padStart(2, '0')}-${String(period.lastDate.day).padStart(2, '0')}`;
    return {
      endDate,
      lcp:  metrics.largest_contentful_paint?.percentilesTimeseries?.p75s?.[i] ?? null,
      cls:  metrics.cumulative_layout_shift?.percentilesTimeseries?.p75s?.[i] ?? null,
      inp:  metrics.interaction_to_next_paint?.percentilesTimeseries?.p75s?.[i] ?? null,
      lcpGoodDensity: metrics.largest_contentful_paint?.histogramTimeseries?.[0]?.densities?.[i] ?? null,
    };
  });
}

// Usage
const trend = await queryHistory('https://example.com');
if (trend) {
  trend.forEach(({ endDate, lcp, cls, inp }) => {
    console.log(`${endDate}: LCP ${lcp}ms | CLS ${cls} | INP ${inp}ms`);
  });
}
```

### Batch Origins Query

```javascript
async function batchQueryOrigins(origins, formFactor = 'PHONE', delayMs = 500) {
  const results = [];

  for (const origin of origins) {
    try {
      const data = await queryOrigin(origin, formFactor);
      if (!data) {
        results.push({ origin, error: 'no_data' });
      } else {
        const m = data.record.metrics;
        results.push({
          origin,
          lcp: m.largest_contentful_paint?.percentiles?.p75,
          cls: m.cumulative_layout_shift?.percentiles?.p75,
          inp: m.interaction_to_next_paint?.percentiles?.p75,
          period: data.record.collectionPeriod,
        });
      }
    } catch (err) {
      results.push({ origin, error: err.message });
    }

    // Respect 150 QPM rate limit
    await new Promise(r => setTimeout(r, delayMs));
  }

  return results;
}

// Usage
const origins = [
  'https://example.com',
  'https://another-site.com',
  'https://third-site.com',
];
const results = await batchQueryOrigins(origins);
results.forEach(r => {
  if (r.error) {
    console.log(`${r.origin}: ${r.error}`);
  } else {
    const pass = r.lcp <= 2500 && r.cls <= 0.1 && r.inp <= 200;
    console.log(`${r.origin}: ${pass ? '✓' : '✗'} LCP ${r.lcp}ms CLS ${r.cls} INP ${r.inp}ms`);
  }
});
```

---

## 9. Desktop vs Mobile Comparison

Real-world CWV often differs significantly between form factors. Always check both.

```javascript
async function compareFormFactors(origin) {
  const [mobile, desktop] = await Promise.all([
    queryOrigin(origin, 'PHONE'),
    queryOrigin(origin, 'DESKTOP'),
  ]);

  const extract = (data) => {
    if (!data) return null;
    const m = data.record.metrics;
    return {
      lcp: m.largest_contentful_paint?.percentiles?.p75,
      cls: m.cumulative_layout_shift?.percentiles?.p75,
      inp: m.interaction_to_next_paint?.percentiles?.p75,
    };
  };

  const mobileMetrics  = extract(mobile);
  const desktopMetrics = extract(desktop);

  console.log('Metric     Mobile   Desktop');
  console.log('─────────────────────────────');
  console.log(`LCP        ${mobileMetrics?.lcp ?? 'N/A'}ms   ${desktopMetrics?.lcp ?? 'N/A'}ms`);
  console.log(`CLS        ${mobileMetrics?.cls ?? 'N/A'}     ${desktopMetrics?.cls ?? 'N/A'}`);
  console.log(`INP        ${mobileMetrics?.inp ?? 'N/A'}ms   ${desktopMetrics?.inp ?? 'N/A'}ms`);

  return { mobile: mobileMetrics, desktop: desktopMetrics };
}

// Example output:
// Metric     Mobile   Desktop
// ─────────────────────────────
// LCP        1840ms   980ms
// CLS        0.04     0.02
// INP        104ms    62ms
```

### When Form Factors Diverge

| Gap | Likely Cause |
|-----|-------------|
| Mobile LCP >> Desktop LCP | Images not optimized for mobile viewports; missing `srcset`; render-blocking resources affecting slow CPUs |
| Mobile INP >> Desktop INP | Heavy JavaScript on lower-end Android hardware; long tasks blocking main thread |
| Mobile CLS >> Desktop CLS | Elements without explicit dimensions reflow differently at narrow viewport widths |

---

## Sources

- [CrUX API Reference](https://developer.chrome.com/docs/crux/api)
- [CrUX History API Guide](https://developer.chrome.com/docs/crux/guides/history-api)
- [CrUX Methodology](https://developer.chrome.com/docs/crux/methodology)
- [CrUX BigQuery Dataset](https://developer.chrome.com/docs/crux/bigquery)
- [Core Web Vitals Thresholds](https://web.dev/articles/vitals)
- [Web Vitals — Google Search Central](https://developers.google.com/search/docs/appearance/core-web-vitals)
