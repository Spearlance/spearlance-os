# Pinterest API v5 Reference

Comprehensive reference for Pinterest API v5. TypeScript/JavaScript throughout.

Last verified: February 2026. Check [developers.pinterest.com/docs/api/v5](https://developers.pinterest.com/docs/api/v5/) for changes.

---

## 1. Setup & Authentication

### Base URL

```
https://api.pinterest.com/v5
```

### Environment variables

```bash
PINTEREST_CLIENT_ID=your_app_id
PINTEREST_CLIENT_SECRET=your_app_secret
PINTEREST_ACCESS_TOKEN=your_access_token
PINTEREST_REFRESH_TOKEN=your_refresh_token
PINTEREST_AD_ACCOUNT_ID=your_ad_account_id
```

### OAuth 2.0 Flow

Pinterest uses OAuth 2.0 with standard authorization code flow.

**Step 1: Authorization URL**

```typescript
const authUrl = new URL('https://www.pinterest.com/oauth/');
authUrl.searchParams.set('client_id', process.env.PINTEREST_CLIENT_ID);
authUrl.searchParams.set('redirect_uri', 'https://your-app.com/oauth/callback');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', [
  'boards:read',
  'boards:write',
  'pins:read',
  'pins:write',
  'user_accounts:read',
  'ads:read',
  'ads:write',
].join(','));
authUrl.searchParams.set('state', generateCsrfToken());

// Redirect user to authUrl.toString()
```

**Required scopes by feature:**

| Feature | Required scopes |
|---------|----------------|
| Read pins/boards | `pins:read`, `boards:read` |
| Create/edit pins | `pins:write` |
| Create/edit boards | `boards:write` |
| Read user account | `user_accounts:read` |
| Read ads | `ads:read` |
| Manage campaigns | `ads:write` |
| Conversions API | `ads:write` |

**Step 2: Exchange code for tokens**

```typescript
const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(
      `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
    ).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'https://your-app.com/oauth/callback',
  }),
}).then((r) => r.json());

// tokenRes:
// {
//   access_token: 'pina_xxx',
//   refresh_token: 'pinr_xxx',
//   token_type: 'bearer',
//   expires_in: 5184000,        // 60 days in seconds
//   refresh_token_expires_in: 31536000  // 1 year
// }
```

### Token refresh (every 60 days)

Access tokens expire after **60 days**. Refresh tokens expire after **1 year**. Implement proactive refresh to avoid downtime.

```typescript
async function refreshPinterestToken(refreshToken: string) {
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  }).then((r) => r.json());

  // Store res.access_token and res.refresh_token securely
  return res;
}

// Best practice: refresh when token is within 10 days of expiry
function shouldRefresh(tokenCreatedAt: Date): boolean {
  const daysOld = (Date.now() - tokenCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysOld >= 50; // Refresh at 50 days
}
```

### Request helper

```typescript
async function pinterestFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`https://api.pinterest.com/v5${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Pinterest API error: ${error.message} (${error.code})`);
  }

  return res.json();
}
```

### Rate limits

| Limit type | Value |
|-----------|-------|
| Universal | 100 calls/s per user per app |
| Standard: ads_analytics | 300 calls/min per user per app |
| Standard: ads_conversions | 5,000 calls/min per ad account per app |
| MMM Report (beta) | 5 queries/min per advertiser |

---

## 2. Pins

### Create a pin (image URL)

```typescript
// POST /pins
const pin = await pinterestFetch('/pins', {
  method: 'POST',
  body: JSON.stringify({
    link: 'https://your-site.com/article',
    title: 'My Amazing Article',
    description: 'A detailed description of the pin content.',
    board_id: '987654321',
    board_section_id: '111222333',  // optional
    media_source: {
      source_type: 'image_url',
      url: 'https://your-site.com/image.jpg',
    },
    alt_text: 'Description for screen readers',
  }),
});
// pin.id = the new pin ID
```

### Create a pin (image base64)

```typescript
import fs from 'fs';

const imageBase64 = fs.readFileSync('./image.jpg').toString('base64');

const pin = await pinterestFetch('/pins', {
  method: 'POST',
  body: JSON.stringify({
    title: 'My Pin',
    board_id: '987654321',
    media_source: {
      source_type: 'image_base64',
      content_type: 'image/jpeg',
      data: imageBase64,
    },
  }),
});
```

### Create a video pin

Video pins require a two-step upload process.

```typescript
// Step 1: Register the media upload
const uploadReq = await pinterestFetch('/media', {
  method: 'POST',
  body: JSON.stringify({ media_type: 'video' }),
});

// uploadReq.media_id and uploadReq.upload_url and uploadReq.upload_parameters

// Step 2: Upload video to S3 using the upload_parameters
const formData = new FormData();
Object.entries(uploadReq.upload_parameters).forEach(([key, val]) => {
  formData.append(key, val as string);
});
formData.append('file', videoBlob);

await fetch(uploadReq.upload_url, { method: 'POST', body: formData });

// Step 3: Poll upload status until ready
let status;
do {
  await new Promise((r) => setTimeout(r, 5000));
  status = await pinterestFetch(`/media/${uploadReq.media_id}`);
} while (status.status !== 'succeeded');

// Step 4: Create the pin with media_id
const pin = await pinterestFetch('/pins', {
  method: 'POST',
  body: JSON.stringify({
    title: 'My Video Pin',
    board_id: '987654321',
    media_source: {
      source_type: 'video_id',
      media_id: uploadReq.media_id,
      cover_image_url: 'https://your-site.com/thumbnail.jpg',
    },
  }),
});
```

### Get a pin

```typescript
// GET /pins/{pin_id}
const pin = await pinterestFetch(`/pins/${pinId}`);
```

### List user's pins

```typescript
// GET /pins
const { items, bookmark } = await pinterestFetch('/pins?page_size=25');

// Pagination — pass bookmark to get next page
const nextPage = await pinterestFetch(`/pins?page_size=25&bookmark=${bookmark}`);
```

### Update a pin

```typescript
// PATCH /pins/{pin_id}
await pinterestFetch(`/pins/${pinId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    title: 'Updated Title',
    description: 'Updated description',
    board_id: '987654321',
  }),
});
```

### Delete a pin

```typescript
// DELETE /pins/{pin_id}
await fetch(`https://api.pinterest.com/v5/pins/${pinId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}` },
});
// Returns 204 No Content on success
```

### Pin analytics

```typescript
// GET /pins/{pin_id}/analytics
const analytics = await pinterestFetch(
  `/pins/${pinId}/analytics?` +
    new URLSearchParams({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      metric_types: 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK',
    })
);
// analytics.all.daily_metrics = [{ date, data_status, metrics: { IMPRESSION: 1234, ... } }]
```

---

## 3. Boards

### Create a board

```typescript
// POST /boards
const board = await pinterestFetch('/boards', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Inspiration Board',
    description: 'A collection of inspiring content.',
    privacy: 'PUBLIC',  // PUBLIC | PROTECTED | SECRET
  }),
});
```

### List boards

```typescript
// GET /boards
const { items, bookmark } = await pinterestFetch('/boards?page_size=25');
```

### Get a board

```typescript
// GET /boards/{board_id}
const board = await pinterestFetch(`/boards/${boardId}`);
```

### Update a board

```typescript
// PATCH /boards/{board_id}
await pinterestFetch(`/boards/${boardId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    name: 'Updated Board Name',
    description: 'Updated description.',
    privacy: 'SECRET',
  }),
});
```

### Delete a board

```typescript
// DELETE /boards/{board_id}
await fetch(`https://api.pinterest.com/v5/boards/${boardId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}` },
});
```

### List pins on a board

```typescript
// GET /boards/{board_id}/pins
const { items } = await pinterestFetch(`/boards/${boardId}/pins?page_size=25`);
```

### Board Sections

```typescript
// Create section
const section = await pinterestFetch(`/boards/${boardId}/sections`, {
  method: 'POST',
  body: JSON.stringify({ name: 'Summer 2026' }),
});

// List sections
const { items: sections } = await pinterestFetch(`/boards/${boardId}/sections`);

// Update section
await pinterestFetch(`/boards/${boardId}/sections/${sectionId}`, {
  method: 'PATCH',
  body: JSON.stringify({ name: 'Updated Section Name' }),
});

// Delete section
await fetch(`https://api.pinterest.com/v5/boards/${boardId}/sections/${sectionId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}` },
});

// List pins in a section
const { items: sectionPins } = await pinterestFetch(
  `/boards/${boardId}/sections/${sectionId}/pins`
);
```

---

## 4. Ads — Campaigns

### List ad accounts

```typescript
// GET /ad_accounts
const { items } = await pinterestFetch('/ad_accounts');
```

### Create a campaign

```typescript
// POST /ad_accounts/{ad_account_id}/campaigns
const campaign = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/campaigns`,
  {
    method: 'POST',
    body: JSON.stringify({
      name: 'Brand Awareness Q1',
      objective_type: 'BRAND_AWARENESS',  // see objectives below
      status: 'PAUSED',
      lifetime_spend_cap: 10000000,  // in microcurrency ($10,000 in USD = 10,000,000)
      daily_spend_cap: 500000,        // $500/day
    }),
  }
);
```

### Campaign objectives

| Objective | Description |
|-----------|------------|
| `AWARENESS` | Maximize reach |
| `CONSIDERATION` | Drive traffic and engagement |
| `VIDEO_VIEW` | Maximize video views |
| `WEB_CONVERSION` | Drive website conversions |
| `CATALOG_SALES` | Promote product catalog |
| `APP_INSTALL` | Drive app installs |

### Update a campaign

```typescript
// PATCH /ad_accounts/{ad_account_id}/campaigns
await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/campaigns`,
  {
    method: 'PATCH',
    body: JSON.stringify([
      {
        id: campaignId,
        status: 'ACTIVE',
        daily_spend_cap: 1000000,  // $1,000/day
      },
    ]),
  }
);
```

---

## 5. Ads — Ad Groups

### Create an ad group

```typescript
// POST /ad_accounts/{ad_account_id}/ad_groups
const adGroup = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/ad_groups`,
  {
    method: 'POST',
    body: JSON.stringify({
      name: 'My Ad Group',
      campaign_id: campaignId,
      billable_event: 'IMPRESSION',    // IMPRESSION | CLICKTHROUGH | VIDEO_V_50_MRC
      bid_in_micro_currency: 1000000,  // $1.00 bid
      budget_in_micro_currency: 50000000, // $50/day budget
      budget_type: 'DAILY',            // DAILY | LIFETIME
      status: 'PAUSED',
      start_time: Math.floor(Date.now() / 1000),
      end_time: Math.floor(new Date('2026-03-31').getTime() / 1000),
      targeting_spec: {
        country: ['US'],
        locale: ['en-US'],
        age_bucket: ['35-44', '45-49', '50-54'],
        gender: ['female'],
        interest: ['1058'],  // Pinterest interest IDs
        location: ['501'],   // DMA codes
        keyword: ['running shoes', 'athletic wear'],
      },
      placement_group: 'ALL_PLACEMENTS',  // ALL_PLACEMENTS | SEARCH | BROWSE | OTHER
    }),
  }
);
```

---

## 6. Ads — Ads (Promoted Pins)

### Create an ad

```typescript
// POST /ad_accounts/{ad_account_id}/ads
const ad = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/ads`,
  {
    method: 'POST',
    body: JSON.stringify({
      ad_group_id: adGroupId,
      creative_type: 'REGULAR',   // REGULAR | VIDEO | SHOPPING | CAROUSEL | MAX_VIDEO
      pin_id: pinId,              // the organic pin to promote
      name: 'My Promoted Pin',
      status: 'PAUSED',
      is_pin_deleted: false,
      is_removable: true,
    }),
  }
);
```

### Get ad performance

```typescript
// GET /ad_accounts/{ad_account_id}/ads/{ad_id}
const adDetails = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/ads/${adId}`
);
```

---

## 7. Audiences

### Create a customer list audience

```typescript
// POST /ad_accounts/{ad_account_id}/audiences
const audience = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/audiences`,
  {
    method: 'POST',
    body: JSON.stringify({
      name: 'Email Subscribers',
      rule: {
        country: 'US',
        customer_list_id: customerListId,  // from /customer_lists endpoint
        engagement_domain: [],
        engagement_type: '',
      },
      description: 'Email subscribers from CRM',
      audience_type: 'CUSTOMER_LIST',  // CUSTOMER_LIST | VISITOR | ENGAGEMENT | ACTALIKE
    }),
  }
);
```

### Create a customer list

Upload hashed emails to build a customer list.

```typescript
import crypto from 'crypto';

// POST /ad_accounts/{ad_account_id}/customer_lists
const list = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/customer_lists`,
  {
    method: 'POST',
    body: JSON.stringify({
      name: 'CRM Email List',
      records: emails.map((email) =>
        crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
      ).join('\n'),
      list_type: 'EMAIL',
      exceptions: {},
    }),
  }
);
```

### Create an Actalike (Lookalike) audience

```typescript
const actalikeAudience = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/audiences`,
  {
    method: 'POST',
    body: JSON.stringify({
      name: 'CRM Lookalike 1%',
      rule: {
        country: 'US',
        seed_id: [sourceAudienceId],
        audience_size: '1',  // '1' to '10' — percentage of country
      },
      description: '1% lookalike of email subscribers',
      audience_type: 'ACTALIKE',
    }),
  }
);
```

### List audiences

```typescript
// GET /ad_accounts/{ad_account_id}/audiences
const { items } = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/audiences`
);
```

---

## 8. Conversions API

Send conversion events directly from your server. Bypasses browser tracking limitations.

### Send a conversion event

```typescript
import crypto from 'crypto';

async function sendPinterestConversion({
  adAccountId,
  eventName,
  eventTime,
  email,
  orderId,
  value,
  currency,
  userAgent,
  ipAddress,
}: {
  adAccountId: string;
  eventName: string;
  eventTime: number;
  email: string;
  orderId: string;
  value: number;
  currency: string;
  userAgent: string;
  ipAddress: string;
}) {
  const hashedEmail = crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');

  await pinterestFetch(
    `/ad_accounts/${adAccountId}/events`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: [
          {
            event_name: eventName,   // 'checkout' | 'add_to_cart' | 'page_visit' | 'signup' | 'lead' | 'custom'
            action_source: 'web',
            event_time: eventTime,   // Unix timestamp
            event_id: orderId,       // deduplication key
            user_data: {
              em: [hashedEmail],
              client_ip_address: ipAddress,
              client_user_agent: userAgent,
            },
            custom_data: {
              currency,
              value: String(value),
              order_id: orderId,
              content_ids: ['product_123'],
              contents: [{ id: 'product_123', item_price: String(value), quantity: 1 }],
              num_items: 1,
            },
          },
        ],
        test: process.env.NODE_ENV === 'development',
      }),
    }
  );
}

// Usage
await sendPinterestConversion({
  adAccountId: process.env.PINTEREST_AD_ACCOUNT_ID,
  eventName: 'checkout',
  eventTime: Math.floor(Date.now() / 1000),
  email: '[email protected]',
  orderId: 'order_xyz_123',
  value: 49.99,
  currency: 'USD',
  userAgent: req.headers['user-agent'] ?? '',
  ipAddress: req.ip ?? '',
});
```

### Conversion event names

| Event name | When to fire |
|-----------|-------------|
| `page_visit` | User views a page |
| `signup` | User creates account |
| `add_to_cart` | User adds item to cart |
| `checkout` | Purchase completed |
| `lead` | Lead form submitted |
| `search` | Search performed |
| `watch_video` | Video watched |
| `custom` | Custom event |

---

## 9. Analytics

### Account-level analytics

```typescript
// GET /user_account/analytics
const analytics = await pinterestFetch(
  `/user_account/analytics?` +
    new URLSearchParams({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      metric_types: 'IMPRESSION,SAVE,PIN_CLICK,PROFILE_VISIT,FOLLOW,OUTBOUND_CLICK',
    })
);
```

### Ad account analytics

```typescript
// GET /ad_accounts/{ad_account_id}/analytics
const adAnalytics = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/analytics?` +
    new URLSearchParams({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      columns: 'SPEND_IN_DOLLAR,IMPRESSION,CLICK,INAPP_CHECKOUT_COST_PER_ACTION,ROAS',
      granularity: 'DAY',
      click_window_days: '7',
      view_window_days: '1',
      conversion_report_time: 'TIME_OF_CONVERSION',
    })
);
```

### Create async analytics report

For large date ranges, create an async report:

```typescript
// POST /ad_accounts/{ad_account_id}/reports
const reportJob = await pinterestFetch(
  `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/reports`,
  {
    method: 'POST',
    body: JSON.stringify({
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      level: 'CAMPAIGN',
      columns: ['SPEND_IN_DOLLAR', 'IMPRESSION', 'CLICK', 'TOTAL_CHECKOUT'],
      granularity: 'MONTH',
    }),
  }
);

// Poll for completion
let report;
do {
  await new Promise((r) => setTimeout(r, 10000));
  report = await pinterestFetch(
    `/ad_accounts/${process.env.PINTEREST_AD_ACCOUNT_ID}/reports?` +
      new URLSearchParams({ token: reportJob.token })
  );
} while (report.report_status !== 'FINISHED');

// Download from report.url
```

---

## 10. Media Upload

```typescript
// GET /media — list pending uploads
const { items } = await pinterestFetch('/media');

// GET /media/{media_id} — get upload status
const status = await pinterestFetch(`/media/${mediaId}`);
// status.status: 'pending' | 'processing' | 'succeeded' | 'failed'
```

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not proactively refreshing tokens | Tokens expire at 60 days — refresh at day 50, store new refresh token |
| Spending `value` as a number | `custom_data.value` must be a **string** in the Conversions API |
| Creating ad without a promoted pin | Ad must reference an existing pin — create organic pin first |
| Missing `ads:write` OAuth scope | Required for all campaign management endpoints — re-authorize if missing |
| Not deduplicating conversion events | Use `event_id` for deduplication — same ID on both browser pixel and server CAPI events |
| Sending unhashed PII to customer lists | Always SHA-256 hash emails before upload |
| Ignoring 429 on analytics endpoints | Ads analytics limited to 300/min — queue requests and respect retry-after header |
| Using wrong budget units | Budget and bids use **micro-currency** (1 USD = 1,000,000 micro-currency units) |
| Not setting `test: true` in development | Without test flag, dev events pollute production reporting |
| Skipping video upload polling | Video pins require polling `/media/{id}` until `status === 'succeeded'` before creating the pin |
