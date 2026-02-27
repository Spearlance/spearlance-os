# Name.com API v4 — Complete Reference

> **Last Verified:** February 2026

## Table of Contents

1. [Authentication](#1-authentication)
2. [Base URLs](#2-base-urls)
3. [DNS Record Endpoints](#3-dns-record-endpoints)
4. [Record Types](#4-record-types)
5. [Domain Management](#5-domain-management)
6. [URL Forwarding](#6-url-forwarding)
7. [Email Forwarding](#7-email-forwarding)
8. [DNSSEC](#8-dnssec)
9. [Domain Transfers](#9-domain-transfers)
10. [WHOIS Contacts](#10-whois-contacts)
11. [CORE API Note](#11-core-api-note)
12. [Rate Limits](#12-rate-limits)
13. [Error Handling](#13-error-handling)
14. [Common Mistakes](#14-common-mistakes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Authentication

Name.com API v4 uses **HTTP Basic Authentication** with your account username and API token.

### Generating an API Token

1. Log in to name.com
2. Go to **Account → Settings → Security**
3. Under **API Token**, click **Create API Token**
4. Copy the token — it is shown once

### Making Authenticated Requests

```bash
curl -u 'USERNAME:API_TOKEN' 'https://api.name.com/v4/domains'
```

Or using the Authorization header directly:

```bash
curl -H 'Authorization: Basic BASE64_ENCODED_USERNAME_TOKEN' 'https://api.name.com/v4/domains'
```

### Two-Factor Authentication (2FA) Bypass

If your account has Two-Step Verification (2FA) enabled, all API calls will fail with:

```json
{
  "message": "Permission Denied",
  "details": "Authentication Error - Account Has Two-Step Verification Enabled"
}
```

**Fix:** Go to **Account → Settings → Security → Name.com API** and toggle the switch to green to allow API access while 2FA is enabled. This is required — there is no token-based 2FA bypass.

### IP Whitelisting (Optional)

You can restrict API access to specific IP addresses in the same Security settings page. Optional but recommended for production use.

### Sandbox Credentials

Sandbox uses the **same API token** as production, but your username must have `-test` appended:

```
Production username: myuser
Sandbox username:    myuser-test
```

```bash
# Sandbox authentication
curl -u 'myuser-test:my-api-token' 'https://api.dev.name.com/v4/domains'
```

Domains registered in production do not exist in the sandbox. You must register them separately in the dev environment before performing DNS or other operations.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.name.com/v4` |
| **Sandbox** | `https://api.dev.name.com/v4` |

All endpoints are prefixed with `/v4/`. HTTPS only, port 443. Default values are omitted from responses.

**Important:** Do NOT include a trailing slash. `https://api.name.com/v4/domains/` returns HTTP 401 `Unauthenticated`.

**Content-Type:** All `POST` and `PUT` requests must include:
```
Content-Type: application/json
```
Missing this header returns HTTP 403 Forbidden.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. DNS Record Endpoints

Base path: `/v4/domains/{domainName}/records`

### Record Model

| Field | Type | Access | Description |
|-------|------|--------|-------------|
| `id` | int32 | read-only | Server-assigned record identifier |
| `domainName` | string | read-only | Zone name |
| `host` | string | read/write | Hostname relative to zone (e.g., `www`, `@`, `_service._proto.host`) |
| `fqdn` | string | read-only | Fully qualified domain name — always ends in `.` |
| `type` | string | read/write | Record type — see [Record Types](#4-record-types) |
| `answer` | string | read/write | IP address, target, or text value |
| `ttl` | uint32 | read/write | Time-to-live in seconds (minimum 300) |
| `priority` | uint32 | read/write | Required for MX and SRV records only; ignored for all others |

---

### GET /v4/domains/{domainName}/records — List Records

Returns all DNS records for a domain.

**Query Parameters:**
- `perPage` (int32): Records per page, defaults to 1000
- `page` (int32): Page number for pagination

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records'
```

**Response:**
```json
{
  "records": [
    {
      "id": 12345,
      "domainName": "example.org",
      "host": "www",
      "fqdn": "www.example.org.",
      "type": "A",
      "answer": "203.0.113.10",
      "ttl": 300
    },
    {
      "id": 12346,
      "domainName": "example.org",
      "host": "@",
      "fqdn": "example.org.",
      "type": "MX",
      "answer": "mail.example.org",
      "ttl": 300,
      "priority": 10
    }
  ],
  "nextPage": 2,
  "lastPage": 3
}
```

---

### GET /v4/domains/{domainName}/records/{id} — Get Record

Returns a single DNS record by ID.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records/12345'
```

**Response:**
```json
{
  "id": 12345,
  "domainName": "example.org",
  "host": "www",
  "fqdn": "www.example.org.",
  "type": "A",
  "answer": "203.0.113.10",
  "ttl": 300
}
```

---

### POST /v4/domains/{domainName}/records — Create Record

Creates a new DNS record.

**Request Body:**
- `host` (string, required): Hostname relative to zone
- `type` (string, required): Record type
- `answer` (string, required): IP address, target, or text
- `ttl` (uint32): Cache duration in seconds, minimum 300
- `priority` (uint32): Required for MX and SRV only

**Create an A record:**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"www","type":"A","answer":"203.0.113.10","ttl":300}'
```

**Create an AAAA record:**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"www","type":"AAAA","answer":"2001:db8::1","ttl":300}'
```

**Create a CNAME record:**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"blog","type":"CNAME","answer":"example.net","ttl":300}'
```

**Create an MX record:**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"@","type":"MX","answer":"mail.example.org","ttl":300,"priority":10}'
```

**Create a TXT record (SPF):**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"@","type":"TXT","answer":"v=spf1 include:example.com ~all","ttl":300}'
```

**Create an SRV record:**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"_sip._tcp","type":"SRV","answer":"1 5061 sip.example.org","ttl":300,"priority":10}'
```

**Response:**
```json
{
  "id": 12347,
  "domainName": "example.org",
  "host": "www",
  "fqdn": "www.example.org.",
  "type": "A",
  "answer": "203.0.113.10",
  "ttl": 300
}
```

---

### PUT /v4/domains/{domainName}/records/{id} — Update Record

Replaces an existing DNS record. All fields from CreateRecord apply.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records/12345' \
  -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"host":"www","type":"A","answer":"203.0.113.20","ttl":300}'
```

**Response:** Updated record object (same structure as CreateRecord response).

---

### DELETE /v4/domains/{domainName}/records/{id} — Delete Record

Permanently removes a DNS record.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records/12345' \
  -X DELETE
```

**Response:** `{}`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Record Types

| Type | `answer` Format | `priority` |
|------|-----------------|-----------|
| `A` | IPv4 address, e.g. `203.0.113.10` | Not used |
| `AAAA` | IPv6 address, e.g. `2001:db8::1` | Not used |
| `ANAME` | Target domain, e.g. `example.net` | Not used |
| `CNAME` | Target domain, e.g. `example.net` | Not used |
| `MX` | Mail server hostname, e.g. `mail.example.org` | Required |
| `NS` | Nameserver hostname, e.g. `ns1.example.org` | Not used |
| `SRV` | `{weight} {port} {target}`, e.g. `1 5061 sip.example.org` | Required |
| `TXT` | Arbitrary text string | Not used |

**Notes:**
- `host` value `@` represents the domain apex (e.g., `example.org` itself)
- `fqdn` is always read-only and always ends with a period
- Minimum TTL is `300` (5 minutes)
- ANAME is Name.com's ALIAS record implementation for apex CNAMEs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Domain Management

Base path: `/v4/domains`

---

### GET /v4/domains — List Domains

Returns all domains in the authenticated account.

```bash
curl -u 'username:token' 'https://api.name.com/v4/domains'
```

**Response:**
```json
{
  "domains": [
    {
      "domainName": "example.org",
      "locked": true,
      "autorenewEnabled": true,
      "expireDate": "2027-01-15T00:00:00Z",
      "nameservers": ["ns1.name.com", "ns2.name.com"]
    }
  ],
  "nextPage": 2,
  "lastPage": 3
}
```

---

### GET /v4/domains/{domainName} — Get Domain

Returns details for a specific domain including nameservers, contacts, privacy status, and renewal pricing.

```bash
curl -u 'username:token' 'https://api.name.com/v4/domains/example.org'
```

---

### POST /v4/domains:checkAvailability — Check Availability

Checks up to 50 domains for purchasability in one request.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains:checkAvailability' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"domainNames":["example.org","example.net","example.com"]}'
```

**Response:**
```json
{
  "results": [
    {"domainName": "example.org", "purchasable": false},
    {"domainName": "example.net", "purchasable": true, "purchasePrice": 12.99},
    {"domainName": "example.com", "purchasable": false}
  ]
}
```

---

### POST /v4/domains:search — Search Domains

Keyword-based domain search with optional TLD filtering. Takes 500–5000ms. Use `searchStream` for incremental results.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains:search' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"keyword":"example","tldFilter":["org","net","com"]}'
```

---

### POST /v4/domains — Register Domain

Registers a new domain.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"domain":{"domainName":"example.org"},"purchasePrice":12.99}'
```

**Request Body:**
- `domain.domainName` (string, required): Domain to register
- `purchasePrice` (float64): Required for premium domains
- `purchaseYears` (int32): Registration length, max 10
- `privacyEnabled` (boolean): Add WHOIS privacy

**Response:** Includes domain object, order ID, and totalPaid.

---

### POST /v4/domains/{domainName}:renew — Renew Domain

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:renew' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"purchaseYears":1}'
```

---

### POST /v4/domains/{domainName}:enableAutorenew — Enable Auto-Renew

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:enableAutorenew' \
  -X POST \
  -H 'Content-Type: application/json'
```

---

### POST /v4/domains/{domainName}:disableAutorenew — Disable Auto-Renew

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:disableAutorenew' \
  -X POST \
  -H 'Content-Type: application/json'
```

---

### POST /v4/domains/{domainName}:lock — Lock Domain

Prevents unauthorized transfers to other registrars.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:lock' \
  -X POST \
  -H 'Content-Type: application/json'
```

---

### POST /v4/domains/{domainName}:unlock — Unlock Domain

Enables outbound transfers. Must unlock before initiating a transfer away.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:unlock' \
  -X POST \
  -H 'Content-Type: application/json'
```

---

### POST /v4/domains/{domainName}:setNameservers — Set Nameservers

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:setNameservers' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"nameservers":["ns1.example.org","ns2.example.org"]}'
```

---

### GET /v4/domains/{domainName}:getAuthCode — Get Auth Code

Returns the authorization (EPP) code required to transfer the domain to another registrar.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:getAuthCode'
```

**Response:**
```json
{
  "authCode": "Authc0de"
}
```

---

### GET /v4/domains/{domainName}:getPricing — Get Domain Pricing

Returns registration, renewal, and transfer pricing.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:getPricing'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. URL Forwarding

Base path: `/v4/domains/{domainName}/url/forwarding`

URL forwarding redirects visitors from a hostname to a target URL. Supports transparent ("Masked") and standard ("Redirect") modes.

### URLForwarding Model

| Field | Type | Description |
|-------|------|-------------|
| `domainName` | string | Domain portion |
| `host` | string | Full hostname (e.g., `www.example.org`) |
| `forwardsTo` | string | Destination URL |
| `type` | string | `"Masked"` or `"Redirect"` |
| `title` | string | Page title for masked forwarding |
| `meta` | string | Meta tags for masked forwarding |

---

### GET /v4/domains/{domainName}/url/forwarding — List URL Forwardings

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/url/forwarding'
```

**Response:**
```json
{
  "urlForwarding": [
    {
      "domainName": "example.org",
      "host": "www.example.org",
      "forwardsTo": "https://www.example.net",
      "type": "Redirect"
    }
  ],
  "nextPage": 2,
  "lastPage": 2
}
```

---

### GET /v4/domains/{domainName}/url/forwarding/{host} — Get URL Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/url/forwarding/www'
```

**Response:**
```json
{
  "domainName": "example.org",
  "host": "www.example.org",
  "forwardsTo": "https://www.example.net",
  "type": "Redirect"
}
```

---

### POST /v4/domains/{domainName}/url/forwarding — Create URL Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/url/forwarding' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"www.example.org","forwardsTo":"https://www.example.net","type":"redirect"}'
```

**Masked forwarding (transparent redirect with custom title):**
```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/url/forwarding' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"host":"www.example.org","forwardsTo":"https://www.example.net","type":"Masked","title":"My Page","meta":"description=My Page"}'
```

---

### PUT /v4/domains/{domainName}/url/forwarding/{host} — Update URL Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/url/forwarding/www.example.org' \
  -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"forwardsTo":"https://www.example.com","type":"Redirect"}'
```

---

### DELETE /v4/domains/{domainName}/url/forwarding/{host} — Delete URL Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/url/forwarding/www' \
  -X DELETE
```

**Response:** `{}`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Email Forwarding

Base path: `/v4/domains/{domainName}/email/forwarding`

Email forwarding routes incoming email from an address at your domain to an external email address.

### EmailForwarding Model

| Field | Type | Description |
|-------|------|-------------|
| `domainName` | string | Domain name |
| `emailBox` | string | Local part of the forwarding address (e.g., `admin` in `admin@example.org`) |
| `emailTo` | string | Full destination email address |

---

### GET /v4/domains/{domainName}/email/forwarding — List Email Forwardings

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/email/forwarding'
```

**Response:**
```json
{
  "emailForwarding": [
    {
      "domainName": "example.org",
      "emailBox": "admin",
      "emailTo": "webmaster@example.net"
    }
  ],
  "nextPage": 2,
  "lastPage": 5
}
```

---

### GET /v4/domains/{domainName}/email/forwarding/{emailBox} — Get Email Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/email/forwarding/admin'
```

**Response:**
```json
{
  "domainName": "example.org",
  "emailBox": "admin",
  "emailTo": "webmaster@example.net"
}
```

---

### POST /v4/domains/{domainName}/email/forwarding — Create Email Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/email/forwarding' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"emailBox":"admin","emailTo":"webmaster@example.net"}'
```

**Response:** Same as Get response.

---

### PUT /v4/domains/{domainName}/email/forwarding/{emailBox} — Update Email Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/email/forwarding/admin' \
  -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"emailTo":"newdest@example.com"}'
```

**Response:** Same as Get response.

---

### DELETE /v4/domains/{domainName}/email/forwarding/{emailBox} — Delete Email Forwarding

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/email/forwarding/admin' \
  -X DELETE
```

**Response:** `{}`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. DNSSEC

Base path: `/v4/domains/{domainName}/dnssec`

DNSSEC registers cryptographic keys with the domain registry to allow DNS response validation. The keys registered here are DS records submitted to the registry — separate from the DNSKEY records in your zone.

### DNSSEC Model

| Field | Type | Description |
|-------|------|-------------|
| `domainName` | string | Domain name (read-only) |
| `keyTag` | int32 | Key tag value of the DNSKEY RR that validates this signature |
| `algorithm` | int32 | Integer identifying the signing algorithm (e.g., 8 = RSA/SHA-256) |
| `digestType` | int32 | Integer identifying the digest algorithm (e.g., 2 = SHA-256) |
| `digest` | string | Digest of the DNSKEY RR registered with the registry |

---

### GET /v4/domains/{domainName}/dnssec — List DNSSEC Keys

Returns all DNSSEC keys registered with the registry for the domain.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/dnssec'
```

**Response:**
```json
{
  "dnssec": [
    {
      "domainName": "example.org",
      "keyTag": 30909,
      "algorithm": 8,
      "digestType": 2,
      "digest": "E2D3C916F6DEEAC73294E8268FB5885044A833FC5459588F4A9184CFC41A5766"
    }
  ]
}
```

---

### GET /v4/domains/{domainName}/dnssec/{digest} — Get DNSSEC Key

Retrieves details for a specific DNSSEC key identified by its digest.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/dnssec/E2D3C916F6DEEAC73294E8268FB5885044A833FC5459588F4A9184CFC41A5766'
```

---

### POST /v4/domains/{domainName}/dnssec — Create DNSSEC Key

Registers a DNSSEC key with the registry.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/dnssec' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "keyTag": 30909,
    "algorithm": 8,
    "digestType": 2,
    "digest": "E2D3C916F6DEEAC73294E8268FB5885044A833FC5459588F4A9184CFC41A5766"
  }'
```

**Response:** The created DNSSEC object.

---

### DELETE /v4/domains/{domainName}/dnssec/{digest} — Delete DNSSEC Key

Removes a DNSSEC key from the registry.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/dnssec/E2D3C916F6DEEAC73294E8268FB5885044A833FC5459588F4A9184CFC41A5766' \
  -X DELETE
```

**Response:** `{}`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. Domain Transfers

Base path: `/v4/transfers`

Transfers allow you to move a domain from another registrar into your Name.com account. The domain must be unlocked at the current registrar and you'll need the auth (EPP) code for most TLDs.

### Transfer Model

| Field | Type | Description |
|-------|------|-------------|
| `domainName` | string | Domain being transferred (read-only) |
| `email` | string | Approval email address (read-only) |
| `status` | string | Current transfer status (read-only) |

**Status values:** `Retrieving Email`, `Pending Approval`, `Approved`, `Cancelled`, `Completed`

---

### GET /v4/transfers — List Transfers

Returns all pending transfers for the account.

```bash
curl -u 'username:token' 'https://api.name.com/v4/transfers'
```

**Response:**
```json
{
  "transfers": [
    {
      "domainName": "example.org",
      "status": "Retrieving Email"
    }
  ]
}
```

---

### GET /v4/transfers/{domainName} — Get Transfer

Returns status details for a specific transfer request.

```bash
curl -u 'username:token' 'https://api.name.com/v4/transfers/example.org'
```

**Response:**
```json
{
  "domainName": "example.org",
  "email": "admin@example.org",
  "status": "Pending Approval"
}
```

---

### POST /v4/transfers — Create Transfer

Initiates an incoming domain transfer.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/transfers' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{"domainName":"example.org","authCode":"Authc0de","purchasePrice":12.99}'
```

**Request Body:**
- `domainName` (string, required): Domain to transfer in
- `authCode` (string): EPP auth code — required for most TLDs
- `privacyEnabled` (boolean): Purchase WHOIS privacy with transfer
- `purchasePrice` (float64): Required for premium domains

**Response:**
```json
{
  "transfer": {
    "domainName": "example.org",
    "status": "Retrieving Email"
  },
  "order": 123456,
  "totalPaid": 12.99
}
```

---

### POST /v4/transfers/{domainName}:cancel — Cancel Transfer

Cancels a pending transfer and refunds credits to the account balance.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/transfers/example.org:cancel' \
  -X POST \
  -H 'Content-Type: application/json'
```

**Response:** Transfer object with updated status.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. WHOIS Contacts

WHOIS contact information is managed at the domain level using `SetContacts` and read via `GetDomain`.

### Contact Roles

| Role | Field |
|------|-------|
| Registrant | `contacts.registrant` |
| Administrative | `contacts.admin` |
| Technical | `contacts.tech` |
| Billing | `contacts.billing` |

### Contact Object Fields

| Field | Type |
|-------|------|
| `firstName` | string |
| `lastName` | string |
| `companyName` | string |
| `address1` | string |
| `address2` | string |
| `city` | string |
| `state` | string |
| `zip` | string |
| `country` | string (ISO 3166 alpha-2) |
| `phone` | string (E.164 format) |
| `fax` | string |
| `email` | string |

---

### GET /v4/domains/{domainName} — Get WHOIS Contacts

Contact info is included in the `GetDomain` response under the `contacts` key.

```bash
curl -u 'username:token' 'https://api.name.com/v4/domains/example.org'
```

**Response includes:**
```json
{
  "domainName": "example.org",
  "contacts": {
    "registrant": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.org",
      "phone": "+1.5555551234",
      "address1": "123 Main St",
      "city": "Denver",
      "state": "CO",
      "zip": "80203",
      "country": "US"
    }
  }
}
```

---

### POST /v4/domains/{domainName}:setContacts — Set WHOIS Contacts

Updates registrant, admin, tech, and/or billing contacts.

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:setContacts' \
  -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "contacts": {
      "registrant": {
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@example.org",
        "phone": "+1.5555551234",
        "address1": "123 Main St",
        "city": "Denver",
        "state": "CO",
        "zip": "80203",
        "country": "US"
      }
    }
  }'
```

**Note:** WHOIS privacy must be disabled to update contact info publicly. When privacy is enabled, contacts are masked in public WHOIS but still stored internally.

---

### POST /v4/domains/{domainName}:enableWhoisPrivacy — Enable WHOIS Privacy

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:enableWhoisPrivacy' \
  -X POST \
  -H 'Content-Type: application/json'
```

---

### POST /v4/domains/{domainName}:disableWhoisPrivacy — Disable WHOIS Privacy

```bash
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org:disableWhoisPrivacy' \
  -X POST \
  -H 'Content-Type: application/json'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. CORE API Note

Name.com released the **CORE API** in June 2025 — available at `https://docs.name.com` with OpenAPI 3.1 specs.

| | v4 API | CORE API |
|-|--------|----------|
| **Base path** | `/v4/` | `/core/v1/` |
| **Status** | Fully supported, sunset TBD in 2026 | Active development, new features added here only |
| **Auth** | HTTP Basic | HTTP Basic (same) |
| **Rate limits** | 20 req/sec, 3000 req/hour | 20 req/sec |
| **Docs** | `name.com/api-docs` | `docs.name.com` |

**Guidance:**
- Existing integrations on v4: continue using v4 — it works today
- New integrations: use CORE API to avoid future migration
- v4 sunset timeline: announced in Name.com changelog at `docs.name.com`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 12. Rate Limits

| Limit | Value |
|-------|-------|
| Requests per second | 20 |
| Requests per hour | 3000 |
| Error response | HTTP 429 |
| Domains per checkAvailability | 50 max |

On HTTP 429, implement exponential backoff. Wait at least 1 second before retrying, doubling on each subsequent 429.

```bash
# 429 response — no body content
HTTP/1.1 429 Too Many Requests
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 13. Error Handling

All errors return JSON with a `message` field and optional `details`.

```json
{
  "message": "Not Found",
  "details": "Domain not found in this environment"
}
```

### Common Error Codes

| HTTP Status | `message` | Cause |
|-------------|-----------|-------|
| 400 | `Invalid Argument` | Malformed request — bad record format, missing required field |
| 401 | `Unauthenticated` | Missing credentials, trailing slash in URL, or invalid token |
| 403 | `Permission Denied` | Wrong credentials, 2FA blocking, or missing `Content-Type: application/json` on POST/PUT |
| 403 | `Permission Denied` + details: "Authentication Error - Account Has Two-Step Verification Enabled" | 2FA is enabled — must toggle API bypass in Security settings |
| 404 | `Not Found` | Domain or record doesn't exist — in sandbox, domain may not be registered |
| 429 | (no body) | Rate limit exceeded (20 req/sec or 3000 req/hour) |
| 500 | `Internal Server Error` | Name.com server error — retry with backoff |

### Pagination

All list endpoints support:
- `perPage` (int32): Records per response, defaults to 1000
- `page` (int32): Page to retrieve

Responses include `nextPage` and `lastPage` integers. When `nextPage` is absent or null, you are on the last page.

```bash
# Get page 2 with 10 records per page
curl -u 'username:token' \
  'https://api.name.com/v4/domains/example.org/records?perPage=10&page=2'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 14. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| 2FA enabled on account | HTTP 403 `Permission Denied` + "Two-Step Verification" details | Settings → Security → Name.com API → toggle green |
| Using production credentials in sandbox | Domains not found | Append `-test` to username for sandbox: `myuser-test` |
| Trailing slash in URL | HTTP 401 `Unauthenticated` | Remove trailing slash: `/v4/domains` not `/v4/domains/` |
| Missing `Content-Type: application/json` | HTTP 403 on POST/PUT | Always include `-H 'Content-Type: application/json'` |
| Testing DNS on production | Real DNS changes | Always use `api.dev.name.com` for development and testing |
| Domain doesn't exist in sandbox | HTTP 404 `Not Found` | Register the domain in sandbox before DNS ops — sandbox doesn't mirror production |
| Period (`.`) in FQDN when creating | HTTP 401 `Unauthenticated` | Use `host` field (e.g., `www`), not `fqdn` (e.g., `www.example.org.`) |
| Minimum TTL too low | HTTP 400 `Invalid Argument` | Minimum TTL is 300 seconds (5 minutes) |
| `priority` on non-MX/SRV record | Field silently ignored | Only required and meaningful for MX and SRV types |
| SRV answer format wrong | HTTP 400 `Invalid Argument` | Format: `{weight} {port} {target}` — e.g., `1 5061 sip.example.org` |
| `checkAvailability` over 50 domains | Error or truncation | Split into batches of ≤50 domains per request |
| Transfer without unlock | Transfer fails at registrar | Unlock domain at current registrar before initiating transfer |
