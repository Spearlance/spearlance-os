---
model: claude-sonnet-4-6
name: pinterest-api-reference
description: Use when working with the Pinterest API v5 — creating or managing Pins and Boards, running Pinterest Ads campaigns, building audiences, handling conversions, or setting up OAuth. Also use when pulling Pinterest analytics or integrating Pinterest into a web application.
---

# pinterest-api-reference

your friendly armadillo is here to serve you

## current version

Pinterest API v5 (current stable). Base URL: `https://api.pinterest.com/v5`

## install

No official Node.js SDK — use direct HTTP.

```bash
PINTEREST_ACCESS_TOKEN=your_access_token
PINTEREST_AD_ACCOUNT_ID=your_ad_account_id
```

## create a pin

```typescript
const pin = await fetch('https://api.pinterest.com/v5/pins', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    link: 'https://your-site.com/article',
    title: 'My Pin Title',
    description: 'Pin description here',
    board_id: '987654321',
    media_source: {
      source_type: 'image_url',
      url: 'https://your-site.com/image.jpg',
    },
  }),
}).then((r) => r.json());
```

## rate limits

| Type | Limit |
|------|-------|
| Universal (all endpoints) | 100 calls/s per user per app |
| Ads analytics | 300 calls/min per user per app |
| Conversions API | 5,000 calls/min per ad account per app |

## token refresh

Access tokens expire after **60 days**. Pinterest uses OAuth 2.0 with refresh tokens.

```typescript
// Refresh before expiry
const refreshed = await fetch('https://api.pinterest.com/v5/oauth/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken,
  }),
}).then((r) => r.json());
```

## common mistakes

| Mistake | Fix |
|---------|-----|
| Not refreshing tokens before 60-day expiry | Implement proactive refresh — store expiry, refresh at 50 days |
| Skipping media upload for video pins | Video must be uploaded via `/media` first; use returned `media_id` |
| Creating ads without existing board/pin | Ad creative references pin IDs — create organic content first |
| Missing `ads:write` scope for campaign management | Request this scope explicitly during OAuth |

See reference.md for full API coverage.
