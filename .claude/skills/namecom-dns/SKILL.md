---
model: claude-sonnet-4-6
name: namecom-dns
description: Use when managing DNS records or domains via Name.com API v4 — record CRUD, domain registration, URL/email forwarding, DNSSEC, or transfers. Also use when debugging Name.com API auth or 2FA issues.
---

# Name.com DNS

> **Last Verified:** February 2026

## Overview

Name.com API v4 is a REST API for DNS record management, domain registration, URL/email forwarding, DNSSEC, and transfers. v4 is fully supported but slated for sunset at a predetermined time in 2026 — the new CORE API (`docs.name.com`) launched June 2025 and is the preferred path for new integrations. v4 and CORE are architecturally similar; v4 uses `/v4/` prefixes, CORE uses `/core/v1/`.

## Quick Reference

| Item | Value |
|------|-------|
| **Base URL** | `https://api.name.com/v4` |
| **Sandbox URL** | `https://api.dev.name.com/v4` |
| **Auth** | HTTP Basic Auth (`username:token`) |
| **Sandbox username** | Append `-test` suffix (e.g., `myuser-test`) |
| **Rate limit** | 20 req/sec, 3000 req/hour; HTTP 429 on exceed |
| **Docs** | https://www.name.com/api-docs |
| **CORE API** | https://docs.name.com |

## Authentication

HTTP Basic Auth with your Name.com username and API token.

**Generate token:** Account → Settings → Security → API Token → Create API Token

**2FA block:** If Two-Step Verification is enabled, all API calls return `Permission Denied`. Fix: Settings → Security → Name.com API → toggle to green ("Allow API access with Two-Step Verification").

**Sandbox credentials:** Use the same credentials with `-test` appended to username. Domains must be registered in the sandbox environment separately.

```bash
# Production
curl -u 'myuser:my-api-token' 'https://api.name.com/v4/domains'

# Sandbox
curl -u 'myuser-test:my-api-token' 'https://api.dev.name.com/v4/domains'
```

## Common Operations

**List DNS records:**
```bash
curl -u 'username:token' 'https://api.name.com/v4/domains/example.org/records'
```

**Create A record:**
```bash
curl -u 'username:token' 'https://api.name.com/v4/domains/example.org/records' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"host":"www","type":"A","answer":"203.0.113.10","ttl":300}'
```

**Create TXT record (e.g., SPF):**
```bash
curl -u 'username:token' 'https://api.name.com/v4/domains/example.org/records' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"host":"@","type":"TXT","answer":"v=spf1 include:example.com ~all","ttl":300}'
```

**Delete a record:**
```bash
curl -u 'username:token' 'https://api.name.com/v4/domains/example.org/records/12345' -X DELETE
```

## Rate Limits

20 requests/second, 3000 requests/hour. HTTP 429 response when exceeded. Implement exponential backoff on 429.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| 2FA enabled on account | Toggle "Allow API access with Two-Step Verification" in Security settings |
| Using production credentials for sandbox | Append `-test` to username for sandbox auth |
| Trailing slash in URL | `api.name.com/v4/domains/` → HTTP 401 `Unauthenticated`; drop the trailing slash |
| Missing `Content-Type` on POST/PUT | Always set `-H 'Content-Type: application/json'` — missing it returns HTTP 403 |
| Testing against production | Always use `api.dev.name.com` for dev/testing — changes are real on production |
| Domain not in sandbox | Sandbox doesn't mirror production; register domain in dev env before testing DNS ops |

## Full Reference

See `reference.md` for complete API documentation including all DNS, domain, URL/email forwarding, DNSSEC, transfer, and WHOIS contact endpoints with full curl examples and response schemas.
