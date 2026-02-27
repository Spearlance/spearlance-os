---
model: claude-sonnet-4-6
name: crux-api
description: Use when querying Chrome UX Report field data, comparing lab vs field metrics, tracking Core Web Vitals trends, or correlating performance with search rankings. Also use when verifying CWV pass rates or checking p75 thresholds.
---

# CrUX API

## Overview

Chrome UX Report (CrUX) is real user performance data collected from Chrome browsers worldwide. Unlike Lighthouse lab data, CrUX reflects actual user experiences — network conditions, device capabilities, and geographic distribution all factored in. Google uses CrUX field data (not lab data) as the signal for Core Web Vitals ranking.

| Property | Value |
|----------|-------|
| Endpoint | `https://chromeuxreport.googleapis.com/v1/records:queryRecord` |
| History endpoint | `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord` |
| Auth | API key via `?key=API_KEY` query param |
| Rate limit | 150 QPM per Google Cloud project |
| Data window | 28-day rolling average |
| Update frequency | Daily ~04:00 UTC (queryRecord) / Weekly Monday (History API) |
| Data lag | ~2 days behind current date |

---

## Querying

### Origin-Level (Whole Site)

Aggregates data across all pages on the origin. Use this for a site-wide CWV status check.

```javascript
const response = await fetch(
  `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${process.env.CRUX_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: 'https://example.com',
      metrics: [
        'largest_contentful_paint',
        'cumulative_layout_shift',
        'interaction_to_next_paint',
      ],
    }),
  }
);
const data = await response.json();
```

### URL-Level (Specific Page)

Returns data for a single URL only. Useful for diagnosing a specific landing page or product page.

```javascript
body: JSON.stringify({
  url: 'https://example.com/services/plumbing',
  metrics: ['largest_contentful_paint', 'interaction_to_next_paint'],
})
```

URL normalization strips query params (`?utm_*`) and fragments (`#anchor`) automatically. The response includes `urlNormalizationDetails` showing what was changed.

### Form Factor Filtering

Filter by device type to isolate mobile vs desktop performance. Omitting `formFactor` aggregates across all devices.

```javascript
body: JSON.stringify({
  origin: 'https://example.com',
  formFactor: 'PHONE',  // 'DESKTOP' | 'PHONE' | 'TABLET'
  metrics: ['largest_contentful_paint'],
})
```

**Rule of thumb:** Always check `PHONE` separately. Mobile field data frequently differs dramatically from desktop, and Google evaluates CWV using mobile data for most sites.

---

## Metrics

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor | API Key |
|--------|------|--------------------|------|---------|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s | `largest_contentful_paint` |
| INP | ≤ 200ms | ≤ 500ms | > 500ms | `interaction_to_next_paint` |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 | `cumulative_layout_shift` |

### Additional Metrics Available

| Metric | API Key |
|--------|---------|
| First Contentful Paint | `first_contentful_paint` |
| Time to First Byte | `experimental_time_to_first_byte` |
| Round Trip Time | `round_trip_time` |
| Navigation Types | `navigation_types` |
| LCP Breakdown (TTFB, load delay, load duration, render delay) | `largest_contentful_paint_image_time_to_first_byte`, `largest_contentful_paint_image_resource_load_delay`, `largest_contentful_paint_image_resource_load_duration`, `largest_contentful_paint_image_element_render_delay` |

**Note:** FID (First Input Delay) was replaced by INP as a Core Web Vital in March 2024. Do not use FID for CWV pass/fail assessment.

---

## Response Parsing

### Histogram Buckets

Each metric returns a 3-bin histogram mapping to good/NI/poor density values. Densities sum to ~1.0 and represent the proportion of page loads in each bucket.

```javascript
const lcp = data.record.metrics.largest_contentful_paint;

// Histogram: [good_bin, ni_bin, poor_bin]
const [goodBin, niBin, poorBin] = lcp.histogram;

// goodBin = { start: 0, end: 2500, density: 0.7214 }
// niBin   = { start: 2500, end: 4000, density: 0.1823 }
// poorBin = { start: 4000, density: 0.0963 }

const goodPercent = (goodBin.density * 100).toFixed(1);  // "72.1%"
```

### p75 Extraction

The `percentiles.p75` value is the 75th percentile — the threshold Google evaluates for CWV pass/fail. A page passes CWV when its p75 falls in the "good" range.

```javascript
const p75 = lcp.percentiles.p75;  // milliseconds for LCP/INP, score for CLS

const passes = p75 <= 2500;  // LCP good threshold
```

### Full Response Parsing Example

```javascript
async function parseCruxResponse(origin, formFactor = null) {
  const body = {
    origin,
    metrics: [
      'largest_contentful_paint',
      'cumulative_layout_shift',
      'interaction_to_next_paint',
    ],
  };
  if (formFactor) body.formFactor = formFactor;

  const res = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${process.env.CRUX_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (res.status === 404) return null;  // No CrUX data for this origin/URL
  if (!res.ok) throw new Error(`CrUX API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const metrics = data.record.metrics;

  return {
    collectionPeriod: data.record.collectionPeriod,
    lcp: {
      p75: metrics.largest_contentful_paint?.percentiles?.p75,
      good: metrics.largest_contentful_paint?.histogram?.[0]?.density,
    },
    cls: {
      p75: metrics.cumulative_layout_shift?.percentiles?.p75,
      good: metrics.cumulative_layout_shift?.histogram?.[0]?.density,
    },
    inp: {
      p75: metrics.interaction_to_next_paint?.percentiles?.p75,
      good: metrics.interaction_to_next_paint?.histogram?.[0]?.density,
    },
  };
}

// Check CWV pass/fail
function passesCWV({ lcp, cls, inp }) {
  return lcp.p75 <= 2500 && cls.p75 <= 0.1 && inp.p75 <= 200;
}
```

### CLS Precision

CLS values are rounded to 2 decimal places (not 4). A CLS of `0.09` rounds to `0.09` — not `0.0900`. When comparing CLS against the 0.1 threshold, always use `<=` not `<`.

---

## History API

The History API returns a time series of weekly 28-day collection periods instead of a single snapshot. Use it for trend analysis, detecting regressions after deploys, and tracking CWV improvement over months.

**Key differences from queryRecord:**

| Property | queryRecord | queryHistoryRecord |
|----------|-------------|---------------------|
| Response type | Single period | Array of periods |
| `histogram` | Object | `histogramTimeseries` (array of densities) |
| `percentiles` | `{ p75 }` | `percentilesTimeseries` with `p75s` array |
| `collectionPeriod` | Single object | `collectionPeriods` array |
| Update frequency | Daily | Weekly (Mondays) |
| Max history | N/A | 40 periods (~10 months) |

```javascript
async function getLcpTrend(origin) {
  const res = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${process.env.CRUX_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        metrics: ['largest_contentful_paint'],
        formFactor: 'PHONE',
        collectionPeriodCount: 12,  // last 12 weeks (~3 months)
      }),
    }
  );

  const data = await res.json();
  const lcp = data.record.metrics.largest_contentful_paint;
  const periods = data.record.collectionPeriods;

  // Each index maps to the corresponding period
  return periods.map((period, i) => ({
    endDate: `${period.lastDate.year}-${String(period.lastDate.month).padStart(2, '0')}-${String(period.lastDate.day).padStart(2, '0')}`,
    p75: lcp.percentilesTimeseries.p75s[i],
    goodDensity: lcp.histogramTimeseries[0].densities[i],  // bin 0 = good
  }));
}
```

### Detecting Regressions

```javascript
const trend = await getLcpTrend('https://example.com');
const latest = trend[trend.length - 1];
const fourWeeksAgo = trend[trend.length - 5];

const delta = latest.p75 - fourWeeksAgo.p75;
if (delta > 200) {
  console.log(`LCP regressed: +${delta}ms in the past 4 weeks`);
}
```

---

## BigQuery

The CrUX BigQuery dataset (`chrome-ux-report`) provides historical data going back to 2017 — far beyond what the API's 40-period limit allows. Use BigQuery for:

- Comparing year-over-year performance
- Industry benchmarking across many origins
- Country/device breakdown at scale

### Dataset Structure

| Table | Description |
|-------|-------------|
| `chrome-ux-report.all.YYYYMM` | Global monthly data by origin |
| `chrome-ux-report.country_CC.YYYYMM` | Country-specific data (CC = ISO country code) |
| `chrome-ux-report.materialized.metrics_summary` | Pre-aggregated p75 by origin + month |
| `chrome-ux-report.materialized.device_summary` | Adds device type dimension |
| `chrome-ux-report.materialized.country_summary` | Origin + month + country + device |

### Sample Query: LCP p75 Trend for an Origin

```sql
SELECT
  yyyymm,
  fast_lcp,
  avg_lcp
FROM
  `chrome-ux-report.materialized.metrics_summary`
WHERE
  origin = 'https://example.com'
ORDER BY
  yyyymm DESC
LIMIT 12
```

### Sample Query: Compare Desktop vs Mobile LCP

```sql
SELECT
  device,
  p75_lcp,
  pct_fast_lcp
FROM
  `chrome-ux-report.materialized.device_summary`
WHERE
  origin = 'https://example.com'
  AND yyyymm = 202501
ORDER BY
  device
```

**Cost note:** BigQuery charges per bytes scanned. Use `materialized` tables — they're pre-aggregated and dramatically cheaper than querying raw monthly tables directly.

---

## Integration Patterns

### Lab vs Field Comparison

CrUX field data and Lighthouse lab data frequently diverge. A Lighthouse LCP of 1.8s on mobile does not mean field LCP is 1.8s.

| Source | What it measures | Use for |
|--------|-----------------|---------|
| CrUX API | Real users, real devices, real networks | CWV pass/fail, ranking signal |
| Lighthouse / PSI lab | Simulated throttled device | Finding regressions in CI |

When field p75 >> lab value, suspect:
- Third-party scripts loading after lab measurement cutoff
- Geographic distribution of users (distant users = high TTFB)
- Real device variance (lower-end Android hardware)
- Cache behavior differences (first vs returning visitors)

### GSC Ranking Correlation

CWV is a ranking signal. Use CrUX data alongside GSC Search Analytics to correlate performance changes with ranking shifts.

```javascript
// After running a performance optimization, compare:
// 1. CrUX History API — p75 before/after deploy date
// 2. GSC searchAnalytics.query — position changes for target keywords over same window
// Lag: CrUX data has ~2 day lag; GSC has ~3 day lag. Allow 2 weeks post-deploy.
```

### Before/After Optimization Tracking

```javascript
async function comparePerformance(origin, baselineDate, currentDate) {
  const trend = await getLcpTrend(origin);

  // Find the period that contains the baseline date
  const baseline = trend.find(p => p.endDate <= baselineDate);
  const current = trend[trend.length - 1];

  return {
    lcp: {
      baseline: baseline.p75,
      current: current.p75,
      delta: current.p75 - baseline.p75,
      improved: current.p75 < baseline.p75,
    },
  };
}
```

### Performance Budgets from Field Data

Set your CI lab budgets based on field p75 values, not arbitrary numbers.

```javascript
// Pull current field p75 for the origin
const field = await parseCruxResponse('https://example.com', 'PHONE');

// Set lab budget at 80% of field value
// (lab should be better than field in most cases)
const budget = {
  lcp: field.lcp.p75 * 0.8,
  cls: field.cls.p75,
};

console.log(`LCP budget: ${budget.lcp}ms`);
```

---

## Practical Patterns

### Daily CWV Status Check

```javascript
async function dailyCWVCheck(origins) {
  const results = await Promise.all(
    origins.map(async origin => {
      const mobile = await parseCruxResponse(origin, 'PHONE');
      const desktop = await parseCruxResponse(origin, 'DESKTOP');
      return { origin, mobile, desktop };
    })
  );

  for (const { origin, mobile } of results) {
    const pass = mobile && passesCWV(mobile);
    console.log(`${origin}: ${pass ? '✓ PASS' : '✗ FAIL'}`);
    if (mobile) {
      console.log(`  LCP: ${mobile.lcp.p75}ms  CLS: ${mobile.cls.p75}  INP: ${mobile.inp.p75}ms`);
    }
  }
}
```

### Alerting on Regression

```javascript
async function checkForRegression(origin) {
  const trend = await getLcpTrend(origin);
  const recent = trend.slice(-4);  // last 4 weeks

  const firstP75 = recent[0].p75;
  const lastP75 = recent[recent.length - 1].p75;
  const degraded = lastP75 > firstP75 * 1.1;  // >10% worse

  if (degraded) {
    // Fire alert — Slack webhook, PagerDuty, email, etc.
    return { alert: true, metric: 'LCP', from: firstP75, to: lastP75 };
  }
  return { alert: false };
}
```

### CI Performance Gate

```javascript
// Run in CI after deployment to staging
async function ciPerformanceGate(stagingUrl) {
  // Use PSI API which supports arbitrary URLs and returns CrUX for origin
  const psiRes = await fetch(
    `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${stagingUrl}&strategy=mobile&key=${process.env.PSI_API_KEY}`
  );
  const psi = await psiRes.json();

  // Origin field data (if available)
  const origin = psi.originLoadingExperience?.metrics;

  if (!origin) {
    console.log('No CrUX field data — not enough traffic. Using lab scores only.');
    return;
  }

  const lcpP75 = origin.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  if (lcpP75 > 2500) {
    process.exit(1);  // Fail CI
  }
}
```

---

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| Treating lab LCP as CWV pass/fail | Always use CrUX field p75 — that's what Google uses |
| Checking only desktop CrUX | Mobile (`PHONE`) is usually Google's primary signal |
| Assuming a URL has CrUX data | Always handle 404 — low-traffic pages have no data |
| Ignoring `urlNormalizationDetails` | If URL was redirected/normalized, data is for the canonical |
| Comparing CrUX daily for small sites | Data updates daily but is a 28-day rolling average — weekly comparison is more signal than noise |
| Using FID instead of INP | FID was retired March 2024; INP is the current responsiveness CWV |

---

## Related Skills

- `lighthouse-api` — Lab data counterpart to CrUX field data; use together for full picture
- `seo-pulse` — Monthly CrUX trend as part of regular SEO health checks
- `seo-audit` — Full SEO audit that correlates CWV with GSC ranking data
- `google-search-console-api` — Pair CrUX with GSC ranking data to correlate CWV improvements with position changes
