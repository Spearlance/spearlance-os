# GoDaddy Domains API v1 — Reference

> **Last Verified:** February 2026

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Access Tiers](#access-tiers)
4. [DNS Record Endpoints](#dns-record-endpoints)
5. [Record Types](#record-types)
6. [Domain Management](#domain-management)
7. [Domain Forwarding](#domain-forwarding)
8. [WHOIS Contacts](#whois-contacts)
9. [Domain Transfers](#domain-transfers)
10. [Reseller Support](#reseller-support)
11. [Rate Limits](#rate-limits)
12. [Error Handling](#error-handling)
13. [Pricing & Access Tiers](#pricing--access-tiers)
14. [Common Mistakes](#common-mistakes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Authentication

GoDaddy uses a custom `sso-key` scheme — **not** Bearer tokens.

### Header Format

```
Authorization: sso-key {KEY}:{SECRET}
```

- No space between `sso-key` and the key value
- No space between the key and the colon
- No space between the colon and the secret
- Exact format: `sso-key YOURAPIKEY:YOURAPISECRET`

### Example

```bash
curl -X GET "https://api.godaddy.com/v1/domains" \
  -H "Authorization: sso-key 3mM44Uh5Taabc:GoDaddy123Secret456"
```

### Key Generation

1. Go to https://developer.godaddy.com/keys
2. Click **Create New API Key**
3. Select environment: **Test** (OTE) or **Production**
4. Save both the Key and Secret — secret is only shown once

### OTE vs Production Keys

| | OTE (Test) | Production |
|-|-----------|-----------|
| **Base URL** | `https://api.ote-godaddy.com` | `https://api.godaddy.com` |
| **Key type** | OTE key | Production key |
| **Data** | Sandbox data only | Real domains |
| **Interchangeable** | No — OTE keys rejected by production | No |

OTE keys **do not work** against `api.godaddy.com`. Production keys **do not work** against `api.ote-godaddy.com`. Always create separate key pairs per environment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.godaddy.com` |
| **OTE (Sandbox)** | `https://api.ote-godaddy.com` |

All endpoints are under `/v1/`. Full example: `https://api.godaddy.com/v1/domains`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Access Tiers

API access is gated — not available to all GoDaddy accounts.

### Free Access Requirements (any one of):

| Requirement | APIs Unlocked |
|-------------|---------------|
| 10+ active domains in account | Domains API, DNS API — 20,000 calls/month |
| 50+ active domains in account | Availability API (bulk checks) |
| Monthly spend of $20+ USD | Domains API, DNS API — 20,000 calls/month |

### Paid Plans

| Plan | Monthly Calls | Daily Valuations |
|------|---------------|------------------|
| Domain Pro (free tier) | 20,000 | 150 |
| Basic | 100,000 | 1,000 |
| Professional | 250,000 | 5,000 |

If your account doesn't meet the access requirements, DNS and domain management API calls return `403 Forbidden`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DNS Record Endpoints

All 8 path variants. Base: `https://api.godaddy.com/v1/domains/{domain}/records`

### 1. GET all records

```
GET /v1/domains/{domain}/records
```

Returns all DNS records for the domain.

**Query params:** `type` (optional), `name` (optional), `offset`, `limit`

```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET"
```

**Response:**
```json
[
  {
    "type": "A",
    "name": "@",
    "data": "1.2.3.4",
    "ttl": 3600
  },
  {
    "type": "MX",
    "name": "@",
    "data": "mail.example.com",
    "priority": 10,
    "ttl": 3600
  }
]
```

---

### 2. GET records by type

```
GET /v1/domains/{domain}/records/{type}
```

Returns all records matching the given type (A, CNAME, MX, etc.).

```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com/records/A" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### 3. GET records by type and name

```
GET /v1/domains/{domain}/records/{type}/{name}
```

Returns records matching both type and name. Use `@` for the apex/root.

```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com/records/A/www" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### 4. PUT — replace ALL records (DANGEROUS)

```
PUT /v1/domains/{domain}/records
```

**Replaces every DNS record on the domain.** Anything not in the request body is deleted. Use with extreme care — this is the nuclear option.

```bash
curl -X PUT "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '[
    {"type":"A","name":"@","data":"1.2.3.4","ttl":3600},
    {"type":"A","name":"www","data":"1.2.3.4","ttl":3600},
    {"type":"MX","name":"@","data":"mail.example.com","priority":10,"ttl":3600}
  ]'
```

---

### 5. PUT — replace all records of a type

```
PUT /v1/domains/{domain}/records/{type}
```

Replaces ALL records of the given type. Other record types are untouched. Still destructive for that type.

```bash
curl -X PUT "https://api.godaddy.com/v1/domains/example.com/records/A" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '[
    {"type":"A","name":"@","data":"5.6.7.8","ttl":3600},
    {"type":"A","name":"www","data":"5.6.7.8","ttl":3600}
  ]'
```

---

### 6. PUT — replace specific records by type and name

```
PUT /v1/domains/{domain}/records/{type}/{name}
```

Replaces all records matching the exact type + name combination. Safest PUT variant.

```bash
curl -X PUT "https://api.godaddy.com/v1/domains/example.com/records/A/www" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"type":"A","name":"www","data":"5.6.7.8","ttl":3600}]'
```

---

### 7. PATCH — add records (non-destructive, PREFERRED)

```
PATCH /v1/domains/{domain}/records
```

Adds records to the zone without removing existing ones. This is the preferred method for adding new records. Existing records are preserved.

```bash
# Add a TXT record for domain verification
curl -X PATCH "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"type":"TXT","name":"_acme-challenge","data":"abc123verifytoken","ttl":600}]'
```

```bash
# Add multiple records at once
curl -X PATCH "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '[
    {"type":"A","name":"api","data":"1.2.3.4","ttl":3600},
    {"type":"CNAME","name":"blog","data":"myblog.example.com","ttl":3600}
  ]'
```

---

### 8. DELETE — delete specific records

```
DELETE /v1/domains/{domain}/records/{type}/{name}
```

Deletes all records matching the given type and name.

```bash
curl -X DELETE "https://api.godaddy.com/v1/domains/example.com/records/TXT/_acme-challenge" \
  -H "Authorization: sso-key KEY:SECRET"
```

### DNS Record Object Schema

```json
{
  "type": "A",       // required — record type (see Record Types)
  "name": "www",     // required — subdomain or @ for apex
  "data": "1.2.3.4", // required — record value
  "ttl": 3600,       // optional — seconds, default 3600, min 600
  "priority": 10,    // MX and SRV only
  "service": "_sip", // SRV only
  "protocol": "_tcp",// SRV only
  "port": 5060,      // SRV only
  "weight": 10       // SRV only
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Record Types

| Type | Purpose | `data` field |
|------|---------|-------------|
| `A` | IPv4 address | IPv4 (e.g. `1.2.3.4`) |
| `AAAA` | IPv6 address | IPv6 (e.g. `2001:db8::1`) |
| `CNAME` | Canonical name alias | Hostname (e.g. `alias.example.com`) |
| `MX` | Mail exchange | Hostname — also set `priority` |
| `TXT` | Text (SPF, DKIM, verification) | Quoted string |
| `SRV` | Service record | Target hostname — also set `service`, `protocol`, `port`, `weight`, `priority` |
| `CAA` | Certificate authority authorization | `0 issue "letsencrypt.org"` |
| `NS` | Name server | Name server hostname |

**Note:** `NS` records at the apex (`@`) are managed by GoDaddy and typically cannot be replaced via API.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Domain Management

### List domains

```
GET /v1/domains
```

```bash
curl -X GET "https://api.godaddy.com/v1/domains?limit=100" \
  -H "Authorization: sso-key KEY:SECRET"
```

**Query params:**
- `statuses` — filter by status (e.g. `ACTIVE`, `EXPIRED`)
- `limit` — max records returned (default 25, max 1000)
- `marker` — pagination cursor (value from previous response)
- `includes` — additional fields (e.g. `contacts`, `nameServers`)
- `modifiedDate` — filter by modification date

---

### Get domain details

```
GET /v1/domains/{domain}
```

```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### Check domain availability (single)

```
GET /v1/domains/available?domain={domain}
```

Requires 50+ domains for production use.

```bash
curl -X GET "https://api.godaddy.com/v1/domains/available?domain=example.com" \
  -H "Authorization: sso-key KEY:SECRET"
```

**Response:**
```json
{
  "available": false,
  "domain": "example.com",
  "definitive": true,
  "price": 1199,
  "currency": "USD",
  "period": 1
}
```

---

### Bulk domain availability check

```
POST /v1/domains/available
```

Requires 50+ domains in account.

```bash
curl -X POST "https://api.godaddy.com/v1/domains/available" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '["example.io", "example.co", "example.net"]'
```

---

### Purchase a domain

```
POST /v1/domains/purchase
```

Get the required schema for a TLD first:

```bash
# 1. Get purchase schema for the TLD
curl -X GET "https://api.godaddy.com/v1/domains/purchase/schema/com" \
  -H "Authorization: sso-key KEY:SECRET"

# 2. Validate before purchasing
curl -X POST "https://api.godaddy.com/v1/domains/purchase/validate" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{ ... purchase payload ... }'

# 3. Purchase
curl -X POST "https://api.godaddy.com/v1/domains/purchase" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{ ... purchase payload ... }'
```

---

### Renew a domain

```
POST /v1/domains/{domain}/renew
```

```bash
curl -X POST "https://api.godaddy.com/v1/domains/example.com/renew" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{"period": 1}'
```

---

### Cancel / delete a domain

```
DELETE /v1/domains/{domain}
```

```bash
curl -X DELETE "https://api.godaddy.com/v1/domains/example.com" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### List available TLDs

```
GET /v1/domains/tlds
```

```bash
curl -X GET "https://api.godaddy.com/v1/domains/tlds" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### Update domain settings

```
PATCH /v1/domains/{domain}
```

Used to update nameservers, auto-renew, locked status, etc.

```bash
# Update nameservers
curl -X PATCH "https://api.godaddy.com/v1/domains/example.com" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{"nameServers": ["ns1.example.com", "ns2.example.com"]}'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Domain Forwarding

Manage URL forwarding for a domain.

### Get forwarding configuration

```
GET /v1/domains/{domain}/forwarding
```

```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com/forwarding" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### Set forwarding

```
PUT /v1/domains/{domain}/forwarding
```

```bash
curl -X PUT "https://api.godaddy.com/v1/domains/example.com/forwarding" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "REDIRECT_PERMANENT",
    "url": "https://www.newsite.com"
  }'
```

**Forwarding types:**

| Type | Description |
|------|-------------|
| `REDIRECT_PERMANENT` | 301 — permanent redirect |
| `REDIRECT_TEMPORARY` | 302 — temporary redirect |
| `FORWARD_MASKED` | Mask URL (shows original domain in browser) |

---

### Delete forwarding

```
DELETE /v1/domains/{domain}/forwarding
```

```bash
curl -X DELETE "https://api.godaddy.com/v1/domains/example.com/forwarding" \
  -H "Authorization: sso-key KEY:SECRET"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## WHOIS Contacts

Manage registrant, admin, tech, and billing contact info for a domain.

### Get contacts

```
GET /v1/domains/{domain}/contacts
```

Not directly available as a standalone GET on all accounts — use `GET /v1/domains/{domain}?includes=contacts` instead.

```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com?includes=contacts" \
  -H "Authorization: sso-key KEY:SECRET"
```

---

### Update contacts

```
PATCH /v1/domains/{domain}/contacts
```

```bash
curl -X PATCH "https://api.godaddy.com/v1/domains/example.com/contacts" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "registrant": {
      "nameFirst": "Jane",
      "nameLast": "Smith",
      "email": "jane@example.com",
      "phone": "+1.5555555555",
      "addressMailing": {
        "address1": "123 Main St",
        "city": "Scottsdale",
        "state": "AZ",
        "postalCode": "85251",
        "country": "US"
      }
    }
  }'
```

---

### Validate contacts (bulk)

```
POST /v1/domains/contacts/validate
```

Validates contact data against TLD requirements before purchase or update.

```bash
curl -X POST "https://api.godaddy.com/v1/domains/contacts/validate" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "tlds": ["com", "net"],
    "contacts": { ... }
  }'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Domain Transfers

### Initiate incoming transfer

```
POST /v1/domains/{domain}/transfer
```

Transfer a domain from another registrar into GoDaddy. Requires the EPP/auth code from the losing registrar.

```bash
curl -X POST "https://api.godaddy.com/v1/domains/example.com/transfer" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "authCode": "EPP_CODE_FROM_LOSING_REGISTRAR",
    "period": 1,
    "consent": {
      "agreedAt": "2026-02-01T12:00:00.000Z",
      "agreedBy": "127.0.0.1",
      "agreementKeys": ["TRANSFER_IN_AUTH_CODE"]
    }
  }'
```

**Response:**
```json
{
  "orderId": 123456789,
  "itemCount": 1,
  "total": 899,
  "currency": "USD"
}
```

---

### Check transfer status

Transfer status is reflected in the domain's `status` field. Poll `GET /v1/domains/{domain}` and check for status transitions.

**Transfer status values:**

| Status | Meaning |
|--------|---------|
| `TRANSFER_IN_PENDING_CUSTOMER` | Awaiting customer action |
| `TRANSFER_IN_PENDING_ADMIN` | Under review |
| `TRANSFER_IN_PENDING_REGISTRY` | Awaiting registry confirmation |
| `TRANSFER_IN_PENDING_FOA` | Awaiting Form of Authorization email response |
| `ACTIVE` | Transfer complete |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Reseller Support

Resellers managing domains on behalf of customers use the `X-Shopper-Id` header to operate against a subaccount.

### X-Shopper-Id header

```
X-Shopper-Id: {shopperId}
```

When included, the API operates in the context of the specified shopper (subaccount), not the authenticated reseller account.

### List customer domains

```bash
curl -X GET "https://api.godaddy.com/v1/domains" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "X-Shopper-Id: 1234567"
```

### Manage customer DNS records

```bash
curl -X PATCH "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "X-Shopper-Id: 1234567" \
  -H "Content-Type: application/json" \
  -d '[{"type":"A","name":"www","data":"1.2.3.4","ttl":3600}]'
```

### Rules

- The API key must belong to a reseller/API Reseller account
- `X-Shopper-Id` is supported on all domain and DNS endpoints
- Omitting `X-Shopper-Id` defaults to the authenticated reseller's own account

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute | 60 per endpoint |
| Monthly API calls | 20,000 (standard / Domain Pro tier) |
| Monthly API calls | 100,000 (Basic plan) |
| Monthly API calls | 250,000 (Professional plan) |
| HTTP status on exceed | `429 Too Many Requests` |

When you receive a `429`, the response body includes a `retryAfterSec` field indicating when to retry. Implement exponential backoff for automated tooling.

```bash
# 429 response body example
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded, retry after 30 seconds",
  "retryAfterSec": 30
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Error Handling

### Error response format

```json
{
  "code": "UNABLE_TO_AUTHENTICATE",
  "message": "Unable to authenticate",
  "fields": [
    {
      "code": "MISSING",
      "message": "is required",
      "path": "body.authCode",
      "pathRelated": ""
    }
  ]
}
```

### Common HTTP status codes

| Status | Code | Cause |
|--------|------|-------|
| `400` | `INVALID_BODY` | Request body fails schema validation |
| `401` | `UNABLE_TO_AUTHENTICATE` | Invalid or missing `sso-key` credentials |
| `403` | `UNABLE_TO_AUTHENTICATE_SHOPPER` | Shopper not found or not authorized |
| `403` | `UNKNOWN_CUSTOMER` | Account doesn't meet access requirements (10 domains) |
| `404` | `NOT_FOUND` | Domain not found in account |
| `409` | `DUPLICATE_FOUND` | Domain already exists |
| `422` | `UNABLE_TO_VALIDATE` | Contact or purchase data failed TLD validation |
| `429` | `RATE_LIMIT_EXCEEDED` | 60 req/min or monthly quota exceeded |
| `500` | `INTERNAL_SERVER_ERROR` | GoDaddy-side error — retry with backoff |

### Handling validation errors

The `fields` array in 400/422 responses identifies exactly which fields failed and why. Always inspect `fields` when debugging validation failures.

```json
{
  "code": "INVALID_BODY",
  "message": "Request body doesn't fulfill schema, see details in fields",
  "fields": [
    {
      "code": "INVALID",
      "message": "Value must be a valid IPv4 address",
      "path": "body[0].data",
      "pathRelated": ""
    }
  ]
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Pricing & Access Tiers

All GoDaddy APIs are free to access subject to qualifying conditions.

### Free Tier Qualification (any one of)

| Condition | Result |
|-----------|--------|
| 10+ active domains | Domains API + DNS API unlocked |
| 10+ active domains | 20,000 calls/month |
| 50+ active domains | Availability API (bulk) also unlocked |
| $20+/month average spend | Domains API + DNS API unlocked |

### Paid Plans

| Plan | Monthly Calls | Valuation API Daily |
|------|---------------|---------------------|
| Domain Pro (free tier) | 20,000 | 150 |
| Basic | 100,000 | 1,000 |
| Professional | 250,000 | 5,000 |

Contact GoDaddy sales for plan pricing. Basic and Professional plans are available through the GoDaddy API Reseller program.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | What happens | Fix |
|---------|-------------|-----|
| `Authorization: Bearer KEY:SECRET` | `401 UNABLE_TO_AUTHENTICATE` | Use `sso-key` scheme: `Authorization: sso-key KEY:SECRET` |
| `PUT /v1/domains/{domain}/records` with partial records | Deletes every unlisted record | Use `PATCH` to add records non-destructively |
| `PUT /v1/domains/{domain}/records/{type}` with subset | Deletes all records of that type not in payload | Include all records of that type, or use PATCH |
| OTE key against `api.godaddy.com` | `401` or `403` | Create a separate production API key |
| Production key against OTE URL | Auth failure | Use matching key per environment |
| Fewer than 10 domains in account | `403 UNKNOWN_CUSTOMER` | Meet the 10-domain threshold or the $20/mo spend requirement |
| Space in `sso-key` header | `401` | Exact format: `sso-key KEY:SECRET` — no extra spaces |
| Trying to update apex NS records | `422` or ignored | Apex NS records are GoDaddy-managed and not API-editable |
| Not paginating domain list | Misses domains past first page | Use `marker` cursor from response for next page |
| TTL below 600 seconds | `400 INVALID_BODY` | Minimum TTL is 600 seconds |
