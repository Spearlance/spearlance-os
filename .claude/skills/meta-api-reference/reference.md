# Meta Marketing API Reference

Comprehensive reference for the Meta Graph API and Marketing API. JavaScript/Node.js throughout.

Last verified: February 2026. Check [developers.facebook.com/docs/marketing-api](https://developers.facebook.com/docs/marketing-api) for changes.

---

## 1. Versioning & Base URL

### Current supported versions (February 2026)

| Version | Released | Min support until | Status |
|---------|----------|-------------------|--------|
| v23.0 | ~Oct 2025 | Early 2027 | Latest |
| v22.0 | ~Jun 2025 | Late 2026 | Stable |
| v21.0 and older | — | **Removed Sep 9, 2025** | Deprecated |

**Always pin an explicit version.** Unpinned calls default to the oldest supported version, which creates breaking change risk as old versions sunset.

```
https://graph.facebook.com/v22.0
```

### Release cadence

Meta releases new versions roughly **quarterly** and supports each version for **~2 years**.

### Breaking change: Attribution windows removed (January 2026)

`7d_view` and `28d_view` attribution windows removed from the Insights API. Use `1d_click` or `7d_click` instead.

### Breaking change: Advantage+ legacy APIs (v24.0+)

Creating or updating Advantage+ Shopping Campaigns (ASC) and Advantage+ App Campaigns (AAC) via legacy APIs is blocked as of v24.0 (Oct 2025). Full block across all API versions by May 2026. Use the unified Advantage+ campaign structure instead.

---

## 2. Authentication

### Token types

| Token Type | Lifespan | Use case |
|-----------|----------|----------|
| Short-lived user token | ~1 hour | Testing only |
| Long-lived user token | Up to 60 days | Dev/staging |
| System user token | Never expires (configurable) | Production |
| Page access token | Inherits from user token | Page management |

**Recommendation for production:** System user tokens. Generated via Business Manager, programmably renewable, no human login required.

### Required OAuth scopes

| Scope | Purpose |
|-------|---------|
| `ads_management` | Read + write access to ad accounts |
| `ads_read` | Read-only access |
| `business_management` | Business Manager operations |
| `pages_manage_ads` | Manage ads on behalf of Pages |

### System user token setup

1. Go to Business Manager → Business Settings → Users → System Users
2. Create a system user with `Admin` role
3. Assign the system user to your ad account
4. Generate a token with required permissions
5. Store as `META_ACCESS_TOKEN` in environment

### User access token flow (OAuth)

```javascript
// Step 1: Build authorization URL
const authUrl = new URL('https://www.facebook.com/v22.0/dialog/oauth');
authUrl.searchParams.set('client_id', process.env.META_APP_ID);
authUrl.searchParams.set('redirect_uri', 'https://your-app.com/oauth/callback');
authUrl.searchParams.set('scope', 'ads_management,ads_read');
authUrl.searchParams.set('response_type', 'code');

// Step 2: Exchange code for short-lived token
const tokenRes = await fetch(
  `https://graph.facebook.com/v22.0/oauth/access_token?` +
    new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: 'https://your-app.com/oauth/callback',
      code: authorizationCode,
    })
).then((r) => r.json());
// tokenRes.access_token is short-lived (~1 hour)

// Step 3: Exchange for long-lived token (60 days)
const longLivedRes = await fetch(
  `https://graph.facebook.com/v22.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: tokenRes.access_token,
    })
).then((r) => r.json());
// longLivedRes.access_token valid for 60 days
```

### Passing the token

Always pass the token as a query param or Authorization header — never hardcode:

```javascript
// As query param (simple)
const url = `https://graph.facebook.com/v22.0/me?access_token=${process.env.META_ACCESS_TOKEN}`;

// As Authorization header (recommended for security)
const headers = {
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};
```

---

## 3. Graph API Fundamentals

### Node → Edge → Field pattern

```
GET /{node-id}/{edge}?fields=field1,field2
```

Examples:
- `GET /me/adaccounts` — list ad accounts for current user
- `GET /act_123456789/campaigns?fields=name,status,objective`
- `GET /123456789?fields=name,impressions` — get a specific object

### Ad account ID format

Ad accounts always use the `act_` prefix:

```
act_123456789   ← correct
123456789       ← incorrect for ad account endpoints
```

### Pagination

Graph API returns paginated results with a `paging` object:

```javascript
async function fetchAll(url, token) {
  const results = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(`${nextUrl}&access_token=${token}`).then((r) => r.json());
    results.push(...(res.data ?? []));
    nextUrl = res.paging?.next ?? null;
  }

  return results;
}

// Usage
const campaigns = await fetchAll(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns?fields=id,name,status`,
  process.env.META_ACCESS_TOKEN
);
```

---

## 4. Campaigns

### Create campaign

```javascript
// POST /act_{ad_account_id}/campaigns
const res = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Brand Awareness Campaign',
      objective: 'OUTCOME_AWARENESS',     // see objectives below
      status: 'PAUSED',                   // ACTIVE | PAUSED
      special_ad_categories: [],          // [] or ['EMPLOYMENT', 'HOUSING', 'CREDIT']
      daily_budget: 5000,                 // in cents ($50/day)
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
const { id } = await res.json();
```

### Campaign objectives (v22.0+)

| Objective | Use case |
|-----------|---------|
| `OUTCOME_AWARENESS` | Brand awareness, reach |
| `OUTCOME_TRAFFIC` | Link clicks, landing page views |
| `OUTCOME_ENGAGEMENT` | Post engagement, page likes, event responses |
| `OUTCOME_LEADS` | Lead forms, messenger leads |
| `OUTCOME_APP_PROMOTION` | App installs, in-app events |
| `OUTCOME_SALES` | Conversions, catalog sales, store traffic |

### Read campaigns

```javascript
// GET /act_{ad_account_id}/campaigns
const res = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns?` +
    new URLSearchParams({
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
      limit: '25',
      access_token: process.env.META_ACCESS_TOKEN,
    })
);
const { data } = await res.json();
```

### Update campaign

```javascript
// POST /{campaign_id}
await fetch(
  `https://graph.facebook.com/v22.0/${campaignId}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ACTIVE',
      daily_budget: 10000,  // $100/day
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
```

### Delete campaign

```javascript
// DELETE /{campaign_id}
await fetch(
  `https://graph.facebook.com/v22.0/${campaignId}`,
  {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: process.env.META_ACCESS_TOKEN }),
  }
);
```

---

## 5. Ad Sets

### Create ad set

```javascript
// POST /act_{ad_account_id}/adsets
const res = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/adsets`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My Ad Set',
      campaign_id: campaignId,
      daily_budget: 2000,             // cents ($20/day)
      billing_event: 'IMPRESSIONS',   // IMPRESSIONS | LINK_CLICKS | APP_INSTALLS
      optimization_goal: 'REACH',     // see goals below
      bid_amount: 200,                // cents ($2.00) — manual bidding only
      status: 'PAUSED',
      start_time: '2026-03-01T00:00:00+0000',
      end_time: '2026-03-31T23:59:59+0000',
      targeting: {
        geo_locations: {
          countries: ['US'],
          regions: [{ key: '4081' }],  // optional — specific regions
        },
        age_min: 25,
        age_max: 54,
        genders: [1, 2],              // 1=male, 2=female, omit for all
        interests: [
          { id: '6003107902433', name: 'Running' },
        ],
        device_platforms: ['mobile', 'desktop'],
        publisher_platforms: ['facebook', 'instagram'],
      },
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
const { id: adSetId } = await res.json();
```

### Optimization goals by objective

| Campaign objective | Common optimization goals |
|-------------------|--------------------------|
| OUTCOME_AWARENESS | `REACH`, `IMPRESSIONS`, `BRAND_AWARENESS` |
| OUTCOME_TRAFFIC | `LINK_CLICKS`, `LANDING_PAGE_VIEWS` |
| OUTCOME_ENGAGEMENT | `POST_ENGAGEMENT`, `PAGE_LIKES` |
| OUTCOME_LEADS | `LEAD_GENERATION`, `QUALITY_LEAD` |
| OUTCOME_SALES | `OFFSITE_CONVERSIONS`, `VALUE` |

---

## 6. Ads

### Create ad creative

```javascript
// POST /act_{ad_account_id}/adcreatives
const creativeRes = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/adcreatives`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My Creative',
      object_story_spec: {
        page_id: pageId,
        link_data: {
          image_hash: imageHash,    // from /adimages upload
          link: 'https://your-site.com/landing',
          message: 'Primary ad text goes here.',
          name: 'Headline text',
          description: 'Description text',
          call_to_action: {
            type: 'SHOP_NOW',
            value: { link: 'https://your-site.com/landing' },
          },
        },
      },
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
const { id: creativeId } = await creativeRes.json();
```

### Create ad

```javascript
// POST /act_{ad_account_id}/ads
const adRes = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/ads`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My Ad',
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED',
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
const { id: adId } = await adRes.json();
```

### Upload an image

```javascript
// POST /act_{ad_account_id}/adimages
const formData = new FormData();
formData.append('filename', imageBlob, 'image.jpg');
formData.append('access_token', process.env.META_ACCESS_TOKEN);

const imgRes = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/adimages`,
  { method: 'POST', body: formData }
).then((r) => r.json());

const imageHash = imgRes.images['image.jpg'].hash;
```

---

## 7. Insights / Reporting

### Basic insights call

```javascript
// GET /act_{ad_account_id}/insights
const res = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/insights?` +
    new URLSearchParams({
      fields: [
        'campaign_name',
        'impressions',
        'clicks',
        'spend',
        'cpm',
        'cpc',
        'ctr',
        'reach',
        'frequency',
        'actions',         // conversions by type
        'cost_per_action_type',
        'roas',
      ].join(','),
      level: 'campaign',                // account | campaign | adset | ad
      date_preset: 'last_30d',          // see date presets below
      time_increment: 1,                // 1 = daily breakdown
      breakdowns: 'age,gender',         // optional — capped to 13 months
      action_attribution_windows: '["1d_click","7d_click"]',
      access_token: process.env.META_ACCESS_TOKEN,
    })
);
const { data, paging } = await res.json();
```

### Date presets

```
today, yesterday, this_week_sun_today, this_week_mon_today,
last_week_sun_sat, last_week_mon_sun, last_7d, last_14d,
last_28d, last_30d, last_90d, this_month, last_month,
this_quarter, last_quarter, this_year, last_year
```

### Custom date range

```javascript
new URLSearchParams({
  time_range: JSON.stringify({ since: '2026-01-01', until: '2026-01-31' }),
})
```

### Async insights (large reports)

For large date ranges or many objects, use async jobs:

```javascript
// Step 1: Create the job
const jobRes = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/insights`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: 'campaign_name,impressions,clicks,spend',
      level: 'campaign',
      date_preset: 'last_year',
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
).then((r) => r.json());

const jobId = jobRes.report_run_id;

// Step 2: Poll until complete
let job;
do {
  await new Promise((r) => setTimeout(r, 5000)); // 5s interval
  job = await fetch(
    `https://graph.facebook.com/v22.0/${jobId}?access_token=${process.env.META_ACCESS_TOKEN}`
  ).then((r) => r.json());
} while (job.async_status !== 'Job Completed');

// Step 3: Fetch results
const results = await fetch(
  `https://graph.facebook.com/v22.0/${jobId}/insights?access_token=${process.env.META_ACCESS_TOKEN}`
).then((r) => r.json());
```

### Attribution windows (2026)

Removed: `7d_view`, `28d_view` (removed January 12, 2026).

Available: `1d_click`, `7d_click`, `1d_view` (limited).

---

## 8. Custom Audiences

### Create a customer list audience

```javascript
// POST /act_{ad_account_id}/customaudiences
const audienceRes = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/customaudiences`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Email Subscribers',
      subtype: 'CUSTOM',
      description: 'All email subscribers',
      customer_file_source: 'USER_PROVIDED_ONLY',
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
).then((r) => r.json());

const audienceId = audienceRes.id;
```

### Add users to audience

SHA-256 hash all PII before sending.

```javascript
import crypto from 'crypto';

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

const users = [
  { email: '[email protected]' },
  { email: '[email protected]' },
];

await fetch(
  `https://graph.facebook.com/v22.0/${audienceId}/users`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        schema: ['EMAIL'],
        data: users.map(({ email }) => [hashEmail(email)]),
      },
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
```

### Create a lookalike audience

```javascript
await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/customaudiences`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Email Lookalike 1%',
      subtype: 'LOOKALIKE',
      origin_audience_id: audienceId,
      lookalike_spec: {
        ratio: 0.01,         // 1% of country population
        country: 'US',
        type: 'similarity',  // similarity | reach
      },
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
);
```

---

## 9. Custom Conversions

### Create a custom conversion

```javascript
// POST /act_{ad_account_id}/customconversions
const convRes = await fetch(
  `https://graph.facebook.com/v22.0/act_${adAccountId}/customconversions`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Checkout Completion',
      custom_event_type: 'PURCHASE',
      pixel_id: pixelId,
      rule: JSON.stringify({
        and: [
          { url: { i_contains: '/checkout/complete' } },
          { event: { eq: 'Purchase' } },
        ],
      }),
      access_token: process.env.META_ACCESS_TOKEN,
    }),
  }
).then((r) => r.json());
```

### Conversions API (server-side events)

Send conversion events directly from your server — bypasses ad blockers and iOS 14.5+ restrictions.

```javascript
import crypto from 'crypto';

async function sendConversionEvent({
  pixelId,
  eventName,
  eventTime,
  email,
  phone,
  orderId,
  value,
  currency,
}) {
  const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  const hashedPhone = crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex');

  await fetch(
    `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${process.env.META_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: eventName,   // 'Purchase' | 'Lead' | 'ViewContent' | etc.
            event_time: eventTime,   // Unix timestamp
            event_source_url: 'https://your-site.com/checkout/complete',
            action_source: 'website',
            user_data: {
              em: [hashedEmail],
              ph: [hashedPhone],
              client_ip_address: userIp,
              client_user_agent: userAgent,
              fbc: fbclid,           // from _fbc cookie
              fbp: fbp,              // from _fbp cookie
            },
            custom_data: {
              value,
              currency,
              order_id: orderId,
            },
          },
        ],
        test_event_code: process.env.NODE_ENV === 'development' ? 'TEST12345' : undefined,
      }),
    }
  );
}
```

---

## 10. Rate Limits

### Score-based rate limiting

Meta uses a **score-based rolling 1-hour window** per app per ad account.

| Tier | Score cap | Read call | Write call |
|------|-----------|-----------|-----------|
| Development | 60 pts | 1 pt | 3 pts |
| Standard | 9,000 pts | 1 pt | 3 pts |

When `X-Business-Use-Case-Usage` response header shows `call_count: 100`, you're at the limit.

### Reading rate limit headers

```javascript
const res = await fetch(url);
const usage = res.headers.get('x-business-use-case-usage');
// JSON: { "123456789": [{ "type": "ads_management", "call_count": 42, "total_cput_time": 10, "total_time": 10, "estimated_time_to_regain_access": 0 }] }

const adAccountUsage = JSON.parse(usage ?? '{}');
```

### Retry with backoff

```javascript
async function fetchWithRetry(url, options, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    const body = await res.json();

    if (body.error?.code === 17 || body.error?.code === 32 || body.error?.code === 613) {
      // Rate limit errors
      const wait = Math.min(Math.pow(2, i) * 1000, 60000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    return body;
  }
  throw new Error('Max retries exceeded');
}
```

### Error codes

| Code | Meaning |
|------|---------|
| 17 | User request limit reached |
| 32 | Page-level throttling |
| 80000 | Ad account request limit |
| 613 | Calls to this API have exceeded the rate limit |

---

## 11. Batch Requests

Bundle up to **50 API calls** into a single HTTP request. Each sub-call still counts against rate limits.

```javascript
const batchRes = await fetch(
  `https://graph.facebook.com/v22.0?access_token=${process.env.META_ACCESS_TOKEN}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch: [
        {
          method: 'GET',
          relative_url: `act_${adAccountId}/campaigns?fields=id,name,status&limit=10`,
        },
        {
          method: 'GET',
          relative_url: `act_${adAccountId}/adsets?fields=id,name,daily_budget&limit=10`,
        },
        {
          method: 'POST',
          relative_url: `act_${adAccountId}/campaigns`,
          body: `name=New+Campaign&objective=OUTCOME_TRAFFIC&status=PAUSED&special_ad_categories=[]`,
        },
      ],
    }),
  }
).then((r) => r.json());

// Response is an array matching the batch order
for (const result of batchRes) {
  const data = JSON.parse(result.body);
  console.log(result.code, data); // HTTP status + response body
}
```

### Batch with dependencies

Reference earlier results using `{result=0}` syntax:

```javascript
batch: [
  {
    method: 'POST',
    name: 'create-campaign',
    relative_url: `act_${adAccountId}/campaigns`,
    body: `name=New+Campaign&objective=OUTCOME_SALES&status=PAUSED&special_ad_categories=[]`,
  },
  {
    method: 'POST',
    relative_url: `act_${adAccountId}/adsets`,
    // References the campaign_id from the first batch result
    body: `campaign_id={result=create-campaign:$.id}&name=My+Ad+Set&daily_budget=1000&billing_event=IMPRESSIONS&optimization_goal=REACH&status=PAUSED`,
    depends_on: 'create-campaign',
  },
]
```

---

## 12. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using short-lived tokens in production | Generate a system user token in Business Manager — it doesn't expire |
| Not pinning an API version | Always use `v22.0` or later explicitly — unpinned requests use oldest supported version |
| Using `7d_view` or `28d_view` attribution windows | Removed January 12, 2026 — use `1d_click` or `7d_click` |
| Creating ASC/AAC via legacy endpoints after v24.0 | Use Advantage+ unified campaign structure on v24.0+, or pin to v23.0 |
| Not hashing PII before sending to custom audiences | SHA-256 hash all emails and phone numbers before upload |
| Fetching insights without level parameter | `level` defaults to `ad` — set explicitly to `campaign`, `adset`, etc. |
| Ignoring `X-Business-Use-Case-Usage` header | Monitor this header proactively — don't wait for a 429 |
| Creating an ad before its creative is approved | Creatives go through review — check `review_feedback` status before creating dependent ads |
| Batch requests exceeding 50 items | Meta rejects batches larger than 50 — chunk your requests |
| Missing `special_ad_categories` on campaign creation | Required field — pass `[]` for non-special categories, or your campaign POST will error |
