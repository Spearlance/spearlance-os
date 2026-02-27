---
model: claude-sonnet-4-6
name: cloudflare-dns
description: Use when managing DNS records, zones, or domain settings via Cloudflare API — record CRUD, batch operations, proxy toggle, SSL/TLS mode, DNSSEC, or zone management. Also use when migrating DNS to Cloudflare or debugging Cloudflare DNS issues.
---

# Cloudflare DNS

## Overview

Cloudflare API v4. DNS management is available on all plans including Free. Unlimited DNS queries, no per-query charges. Batch operations endpoint available — 850x faster than individual calls for bulk changes. DNS record type changes deprecated Jan 2026, EOL June 30, 2026.

## Quick Reference

| Item | Value |
|------|-------|
| **API Base** | `https://api.cloudflare.com/client/v4` |
| **Auth** | Bearer token (`Authorization: Bearer $CF_API_TOKEN`) |
| **Rate Limit** | 1,200 req / 5 min per user (global) |
| **Docs** | https://developers.cloudflare.com/dns/ |
| **API Ref** | https://developers.cloudflare.com/api/resources/dns/ |

## Authentication

Use an API Token — not the Global API Key. Scoped tokens follow least-privilege and can be restricted to specific zones.

**Minimum permissions for DNS management:**
- `Zone → DNS → Edit`
- `Zone → Zone → Read`

**For SSL/TLS settings:**
- `Zone → SSL and Certificates → Edit`

Create tokens at: https://dash.cloudflare.com/profile/api-tokens

```bash
export CF_API_TOKEN="your_token_here"
export ZONE_ID="your_zone_id_here"
```

## Common Operations

**List all DNS records:**
```bash
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Create an A record:**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"www","content":"192.0.2.1","ttl":3600,"proxied":true}'
```

**Batch create + delete (single request):**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/batch" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "posts": [{"type":"A","name":"api","content":"192.0.2.10","ttl":1,"proxied":false}],
    "deletes": [{"id":"OLD_RECORD_ID"}]
  }'
```

## Rate Limits

| Limit | Value |
|-------|-------|
| Global API rate limit | 1,200 req / 5 min per user |
| Applies to | Dashboard + API key + API token combined |
| Response on exceed | HTTP 429 |
| Retry header | `Retry-After` on 429 response |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using Global API Key instead of API Token | Create a scoped token at dash.cloudflare.com/profile/api-tokens |
| Changing DNS record type in-place | Deprecated Jan 2026, EOL June 30, 2026 — delete + create instead |
| Setting `proxied: true` on MX or TXT records | Proxy only works on A, AAAA, and CNAME records |
| Using old filter syntax `name=contains:value` | Use `name.contains=value` (new syntax, deprecated Feb 2025) |
| Forgetting zone ID | Get it from `GET /zones?name=yourdomain.com` or the dashboard Overview tab |
| PUT vs PATCH | PUT replaces the full record; PATCH updates only specified fields |

## Full Reference

See `reference.md` for complete documentation including all record types, batch operations, zone management, DNSSEC, SSL/TLS settings, pagination, error handling, redirect rules, and pricing details.
