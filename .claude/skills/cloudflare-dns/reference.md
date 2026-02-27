# Cloudflare DNS API Reference

> **Last Verified:** February 2026
> **API Version:** v4
> **Documentation:** https://developers.cloudflare.com/dns/
> **API Reference:** https://developers.cloudflare.com/api/resources/dns/

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Zone Management](#2-zone-management)
3. [DNS Record CRUD](#3-dns-record-crud)
4. [Batch Operations](#4-batch-operations)
5. [Record Types Reference](#5-record-types-reference)
6. [Proxy Toggle](#6-proxy-toggle)
7. [SSL/TLS Mode](#7-ssltls-mode)
8. [DNSSEC](#8-dnssec)
9. [Page Rules / Redirect Rules](#9-page-rules--redirect-rules)
10. [Filtering and Search](#10-filtering-and-search)
11. [Pagination](#11-pagination)
12. [Error Handling](#12-error-handling)
13. [Deprecations](#13-deprecations)
14. [Pricing](#14-pricing)
15. [Common Mistakes](#15-common-mistakes)

---

## 1. Authentication

### API Token (Recommended)

Scoped tokens are the best practice. They can be limited to specific zones, permissions, IP allowlists, and TTLs.

```bash
curl "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Create a token:** https://dash.cloudflare.com/profile/api-tokens

**Minimum scopes for DNS management:**

| Permission | Level | Purpose |
|------------|-------|---------|
| `Zone → DNS → Edit` | Zone | CRUD on DNS records |
| `Zone → Zone → Read` | Zone | Read zone details, get zone ID |
| `Zone → SSL and Certificates → Edit` | Zone | Change SSL/TLS mode |
| `Zone → Zone Settings → Edit` | Zone | Modify zone settings (e.g. DNSSEC) |

**Token limits:**
- Max 50 tokens per user account
- Max 500 tokens per organization account
- Tokens support IP allowlist restrictions and expiry TTL

**Verify token works:**
```bash
curl "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### Global API Key (Legacy — Avoid)

The Global API Key grants full access to the entire account. Avoid for automation. Use only when a third-party tool explicitly requires it.

```bash
curl "https://api.cloudflare.com/client/v4/zones" \
  -H "X-Auth-Email: user@example.com" \
  -H "X-Auth-Key: $CF_API_KEY"
```

---

## 2. Zone Management

### List Zones

```bash
# All zones
curl "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CF_API_TOKEN"

# Filter by domain name
curl "https://api.cloudflare.com/client/v4/zones?name=example.com" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

Response includes `result[0].id` — that's your `ZONE_ID`.

### Get Zone Details

```bash
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### Zone ID Lookup by Domain Name

```bash
ZONE_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=example.com" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | jq -r '.result[0].id')
echo $ZONE_ID
```

### Create a Zone

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "example.com",
    "account": {"id": "$ACCOUNT_ID"},
    "jump_start": true
  }'
```

`jump_start: true` auto-fetches existing DNS records from the current nameserver.

### Delete a Zone

```bash
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### Zone Activation (Change Nameservers)

After creating a zone, update the nameservers at your registrar to the values in `result.name_servers`. Zone status transitions: `pending` → `active`.

```bash
# Check zone activation status
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | jq '.result.status'
```

---

## 3. DNS Record CRUD

Base URL for all record operations: `https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records`

### List DNS Records

```bash
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Filter parameters:**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `type` | `?type=A` | Filter by record type |
| `name` | `?name=www.example.com` | Exact name match |
| `name.contains` | `?name.contains=staging` | Name contains string |
| `name.startswith` | `?name.startswith=api` | Name starts with string |
| `name.endswith` | `?name.endswith=.example.com` | Name ends with string |
| `content` | `?content=192.0.2.1` | Exact content match |
| `content.contains` | `?content.contains=192.0` | Content contains string |
| `proxied` | `?proxied=true` | Filter by proxy status |
| `search` | `?search=blog` | Full-text search across name + content |
| `per_page` | `?per_page=100` | Results per page (default 100, max 5,000,000) |

```bash
# List only A records
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A" \
  -H "Authorization: Bearer $CF_API_TOKEN"

# Search by name containing "staging"
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name.contains=staging" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### Get Single Record

```bash
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### Create a Record

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "www",
    "content": "192.0.2.1",
    "ttl": 3600,
    "proxied": true,
    "comment": "Main web server"
  }'
```

**Common fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Record type: A, AAAA, CNAME, MX, TXT, etc. |
| `name` | Yes | Subdomain or `@` for apex |
| `content` | Yes | Record value (IP, hostname, text, etc.) |
| `ttl` | No | TTL in seconds; `1` = auto (300s when proxied) |
| `proxied` | No | `true` for orange cloud (A, AAAA, CNAME only) |
| `comment` | No | Internal note, not visible in DNS |
| `tags` | No | Array of strings for labeling records |

### Update a Record (Full Replace)

`PUT` replaces the entire record. All fields must be included.

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "www",
    "content": "192.0.2.50",
    "ttl": 3600,
    "proxied": true
  }'
```

### Partial Update a Record

`PATCH` updates only the fields provided.

```bash
# Just update the IP
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"content": "192.0.2.50"}'

# Toggle proxy status only
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"proxied": false}'
```

### Delete a Record

```bash
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

---

## 4. Batch Operations

Single API call to perform deletes, patches, puts, and posts — in that execution order. Cloudflare reports batch operations as **850x faster** than equivalent individual calls for bulk zone changes.

**Endpoint:** `POST /zones/$ZONE_ID/dns_records/batch`

**Execution order within a batch request:**
1. `deletes` — delete by record ID
2. `patches` — partial update by record ID
3. `puts` — full replace by record ID
4. `posts` — create new records

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/batch" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "deletes": [
      {"id": "OLD_RECORD_ID_1"},
      {"id": "OLD_RECORD_ID_2"}
    ],
    "patches": [
      {"id": "RECORD_ID_3", "content": "192.0.2.99"}
    ],
    "puts": [
      {
        "id": "RECORD_ID_4",
        "type": "A",
        "name": "api",
        "content": "192.0.2.10",
        "ttl": 3600,
        "proxied": false
      }
    ],
    "posts": [
      {"type": "A", "name": "staging", "content": "192.0.2.20", "ttl": 3600, "proxied": false},
      {"type": "TXT", "name": "@", "content": "v=spf1 include:_spf.example.com ~all", "ttl": 3600}
    ]
  }'
```

**Batch for DNS record type change (delete + recreate):**

```bash
# Get old record ID first, then:
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/batch" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "deletes": [{"id": "OLD_A_RECORD_ID"}],
    "posts": [{"type": "CNAME", "name": "api", "content": "lb.example.com", "ttl": 3600, "proxied": true}]
  }'
```

Response contains separate `deletes`, `patches`, `puts`, `posts` arrays with results for each operation.

---

## 5. Record Types Reference

| Type | Content Format | Proxiable | Example |
|------|---------------|-----------|---------|
| `A` | IPv4 address | Yes | `192.0.2.1` |
| `AAAA` | IPv6 address | Yes | `2001:db8::1` |
| `CNAME` | Hostname | Yes | `lb.example.com` |
| `MX` | Hostname | No | `mail.example.com` (+ `priority`) |
| `TXT` | Quoted string | No | `"v=spf1 ~all"` |
| `NS` | Nameserver hostname | No | `ns1.example.com` |
| `SRV` | `priority weight port target` | No | `10 20 443 sip.example.com` |
| `CAA` | `flags tag value` | No | `0 issue "letsencrypt.org"` |
| `HTTPS` | SVCB-compatible | No | `1 . alpn=h3` |
| `LOC` | Geographic location | No | `51 30 0.000 N 0 7 32.000 W 0m` |
| `PTR` | Reverse DNS hostname | No | `host.example.com` |
| `NAPTR` | Naming authority pointer | No | For SIP, ENUM |
| `CERT` | Certificate record | No | For PKI |
| `DNSKEY` | DNSSEC key | No | Auto-managed by Cloudflare |
| `DS` | Delegation signer | No | Auto-managed by Cloudflare |

### MX Record Example

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "MX",
    "name": "@",
    "content": "mail.example.com",
    "priority": 10,
    "ttl": 3600
  }'
```

### TXT Record Example (SPF)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "TXT",
    "name": "@",
    "content": "v=spf1 include:_spf.google.com ~all",
    "ttl": 3600
  }'
```

### SRV Record Example

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "SRV",
    "name": "_sip._tcp.example.com",
    "data": {
      "priority": 10,
      "weight": 20,
      "port": 5060,
      "target": "sip.example.com"
    },
    "ttl": 3600
  }'
```

### CAA Record Example

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CAA",
    "name": "@",
    "data": {
      "flags": 0,
      "tag": "issue",
      "value": "letsencrypt.org"
    },
    "ttl": 3600
  }'
```

---

## 6. Proxy Toggle

The Cloudflare proxy (orange cloud) routes traffic through Cloudflare's network, enabling DDoS protection, WAF, caching, and performance features.

**Proxy is only available for A, AAAA, and CNAME records.** Setting `proxied: true` on MX, TXT, NS, or SRV records will return an error.

| `proxied` value | Effect | TTL |
|-----------------|--------|-----|
| `true` (orange cloud) | Traffic routed through Cloudflare | Auto (300s) — `ttl` field ignored |
| `false` (grey cloud) | DNS-only, direct to origin | Custom TTL honored |

```bash
# Enable proxy on an existing record
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"proxied": true}'

# Disable proxy (grey cloud)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"proxied": false}'
```

**When to use each:**

| Use Case | Setting |
|----------|---------|
| Web traffic (HTTP/HTTPS) | `proxied: true` — get DDoS + caching |
| Mail records (MX) | `proxied: false` — required, no proxy support |
| Subdomains used for non-HTTP services | `proxied: false` — avoids traffic routing issues |
| Origin validation / Let's Encrypt DNS challenge | `proxied: false` |

---

## 7. SSL/TLS Mode

Controls how Cloudflare connects to your origin server.

**Endpoint:** `PATCH /zones/$ZONE_ID/settings/ssl`

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value": "full"}'
```

**SSL/TLS modes:**

| Mode | Value | Description |
|------|-------|-------------|
| Off | `"off"` | HTTP only — no HTTPS |
| Flexible | `"flexible"` | HTTPS to visitor, HTTP to origin — no origin cert needed |
| Full | `"full"` | HTTPS to origin — self-signed cert accepted |
| Full (Strict) | `"strict"` | HTTPS to origin — valid cert required |

**Recommendation:** Use `"strict"` in production. `"flexible"` creates a mixed-security setup and is a common misconfiguration.

**Get current SSL setting:**
```bash
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Always Use HTTPS (redirect HTTP → HTTPS):**
```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value": "on"}'
```

---

## 8. DNSSEC

DNSSEC adds cryptographic authentication to DNS responses, preventing cache poisoning and spoofing attacks. Cloudflare signs the zone and publishes public signing keys automatically once enabled.

### Get DNSSEC Status

```bash
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dnssec" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

Response includes DS record values needed at your registrar.

### Enable DNSSEC

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dnssec" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"status": "active"}'
```

### Disable DNSSEC

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dnssec" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"status": "disabled"}'
```

### DNSSEC Status Values

| Status | Meaning |
|--------|---------|
| `active` | DNSSEC enabled and signing |
| `disabled` | DNSSEC off |
| `pending` | Activation in progress |
| `pending-disabled` | Deactivation in progress |
| `error` | Configuration error — check DS records at registrar |

### After Enabling

1. Get DS record from `GET /zones/$ZONE_ID/dnssec` response fields: `ds`, `digest`, `digest_type`, `key_tag`, `algorithm`
2. Add DS record at your domain registrar
3. Status transitions to `active` once DS propagates

**Note:** DNSSEC with Cloudflare Registrar domains enables automatically — no manual DS record step needed.

---

## 9. Page Rules / Redirect Rules

Cloudflare recommends **Redirect Rules** (via Ruleset Engine) over the legacy Page Rules. Both can forward traffic via URL redirects.

### Redirect Rules (Recommended)

```bash
# Create a redirect rule (301 forwarding)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_redirect/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "rules": [
      {
        "expression": "(http.request.uri.path matches \"^/old-path\")",
        "action": "redirect",
        "action_parameters": {
          "from_value": {
            "status_code": 301,
            "target_url": {"value": "https://example.com/new-path"}
          }
        }
      }
    ]
  }'
```

### Bulk Redirect Lists

For large-scale redirects (e.g., domain migration):

```bash
# Create a redirect list
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/rules/lists" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name": "my_redirects", "kind": "redirect", "description": "Migration redirects"}'

# Add redirect entries to the list
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/rules/lists/$LIST_ID/items" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '[{"redirect": {"source_url": "example.com/old", "target_url": "https://example.com/new", "status_code": 301}}]'
```

### Legacy Page Rules (Deprecated Path — Avoid for New Work)

Page Rules are not officially deprecated yet but Cloudflare actively recommends migrating to Redirect Rules for URL forwarding.

---

## 10. Filtering and Search

### Current Filter Syntax (Post-Feb 2025)

```bash
# Name contains
?name.contains=staging

# Name starts with
?name.startswith=api

# Name ends with
?name.endswith=.example.com

# Content contains
?content.contains=192.0

# Multiple values for same param (match any)
?name=www.example.com&name=api.example.com&match=any

# Combined filters
?type=A&proxied=true&name.contains=prod
```

### Full-Text Search

```bash
# Search across name and content fields
?search=blog
```

### Old Syntax (Deprecated Feb 21, 2025)

These still work but are removed. Do not use:

| Old | New |
|-----|-----|
| `name=contains:value` | `name.contains=value` |
| `name=starts_with:value` | `name.startswith=value` |
| `name=ends_with:value` | `name.endswith=value` |
| `content=contains:value` | `content.contains=value` |
| `content=starts_with:value` | `content.startswith=value` |
| `content=ends_with:value` | `content.endswith=value` |
| `name=one,two,three` (comma-separated multi) | `?match=any&name=one&name=two&name=three` |

---

## 11. Pagination

### Page-Based Pagination (Default)

```bash
# Page 1, 100 records
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?per_page=100&page=1" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

Response includes `result_info`:

```json
{
  "result_info": {
    "page": 1,
    "per_page": 100,
    "count": 100,
    "total_count": 350,
    "total_pages": 4
  }
}
```

**Limits:**

| Parameter | Default | Maximum |
|-----------|---------|---------|
| `per_page` | 100 | 5,000,000 |
| `page` | 1 | — |

For complete zone exports, use `per_page=5000000` to get all records in one call. Practical limit depends on zone size.

### Cursor-Based Pagination

Some newer endpoints support cursor-based pagination via `cursor` parameter in `result_info`. Check the response for a `cursor` field and pass it as `?cursor=VALUE` in the next request.

---

## 12. Error Handling

All API responses follow a standard envelope:

```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": { ... },
  "result_info": { ... }
}
```

On failure:

```json
{
  "success": false,
  "errors": [
    {
      "code": 1003,
      "message": "Invalid or missing zone id."
    }
  ],
  "messages": [],
  "result": null
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| 1000 | 400 | Invalid request |
| 1003 | 400 | Invalid or missing zone ID |
| 7003 | 400 | DNS record does not exist |
| 9001 | 400 | Record with same name and type already exists |
| 9103 | 400 | Proxied record cannot use this TTL |
| 9108 | 400 | Invalid record type for proxy |
| 10000 | 401 | Authentication error |
| 10001 | 403 | Token lacks required permission |
| — | 429 | Rate limit exceeded |

**Handling 429 (Rate Limit):**

```bash
# Check Retry-After header on 429
curl -I "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN"
# → Retry-After: 60
```

Implement exponential backoff: start at 1s, double on each retry, max 5 retries.

---

## 13. Deprecations

### DNS Record Type Change — EOL June 30, 2026

**Deprecated:** January 2026
**EOL:** June 30, 2026

Changing a DNS record's `type` field via PUT or PATCH is no longer supported after June 30, 2026. Delete and recreate instead:

```bash
# WRONG — type change via PATCH (deprecated, breaks June 2026)
curl -X PATCH ".../dns_records/$ID" --data '{"type": "CNAME"}'

# CORRECT — delete old + create new (use batch for atomicity)
curl -X POST ".../dns_records/batch" --data '{
  "deletes": [{"id": "OLD_ID"}],
  "posts": [{"type": "CNAME", "name": "api", "content": "lb.example.com", "ttl": 3600}]
}'
```

### DNS Record Filter Syntax — Deprecated Feb 21, 2025

Old `field=operator:value` format replaced by `field.operator=value`. See [Filtering and Search](#10-filtering-and-search) for the full migration table.

### `match=any` with Comma-Separated Names — EOL May 23, 2025

`name=one,two,three` multi-value syntax deprecated. Use `?match=any&name=one&name=two&name=three`.

### `cloudflared proxy-dns` Command — Removed Feb 2, 2026

The `cloudflared proxy-dns` command was removed starting Feb 2, 2026. Use a dedicated DNS-over-HTTPS client instead.

---

## 14. Pricing

DNS is included in all Cloudflare plans with no per-query charges.

| Feature | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| DNS hosting | Yes | Yes | Yes | Yes |
| DNS queries | Unlimited | Unlimited | Unlimited | Unlimited |
| Anycast DNS | Yes | Yes | Yes | Yes |
| DNSSEC | Yes | Yes | Yes | Yes |
| DNS query logs | No | No | Yes | Yes |
| Secondary DNS | No | No | No | Yes |
| Custom TTL minimum | 1s (auto) | 1s | 1s | 1s |
| Number of DNS records | 1,000 | 3,500 | 3,500 | Unlimited |
| Rate limit (API) | 1,200 / 5 min | 1,200 / 5 min | 1,200 / 5 min | 1,200 / 5 min |

DNS queries are answered from Cloudflare's Anycast network (~330+ PoPs). Typical response: < 11ms globally (per Cloudflare's own benchmarks).

---

## 15. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Using Global API Key for automation | Full account exposure if key leaks | Create a scoped API Token |
| Changing record type in-place | Will break June 30, 2026 | Delete + create (or use batch) |
| Setting `proxied: true` on MX/TXT | API error 9108 | Only A, AAAA, CNAME support proxy |
| Hardcoding zone ID | Breaks when zone changes | Resolve dynamically via `GET /zones?name=` |
| Not using batch for bulk changes | 850x slower, more 429 risk | Use `POST /dns_records/batch` |
| Old filter syntax `name=contains:foo` | 400 error after deprecation | Use `name.contains=foo` |
| Using `ttl: 3600` with `proxied: true` | TTL ignored, may cause confusion | Use `ttl: 1` (auto) when proxied |
| PUT without all required fields | Record partially overwritten | Use PATCH for partial updates |
| Wrong record for apex domain | CNAME on `@` not allowed by DNS spec | Use A/AAAA for apex, or Cloudflare CNAME flattening (enabled by default) |
| Expecting immediate propagation | DNS TTL caching | TTL determines propagation — use short TTL (60s) before planned changes |
