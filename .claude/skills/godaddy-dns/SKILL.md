---
model: claude-sonnet-4-6
name: godaddy-dns
description: Use when managing DNS records or domains via GoDaddy API — record CRUD, domain registration, forwarding, WHOIS, or transfers. Also use when debugging GoDaddy API auth issues or migrating from GoDaddy.
---

# GoDaddy DNS

> **Last Verified:** February 2026

## Overview

GoDaddy Domains API v1. Covers DNS record management, domain registration, renewals, transfers, forwarding, and contacts. Auth uses a custom `sso-key` scheme — not Bearer tokens.

## Quick Reference

| Item | Value |
|------|-------|
| **Base URL** | `https://api.godaddy.com/v1` |
| **OTE Sandbox** | `https://api.ote-godaddy.com/v1` |
| **Auth format** | `Authorization: sso-key {KEY}:{SECRET}` |
| **Rate limit** | 60 req/min per endpoint |
| **Monthly quota** | 20,000 calls (free tier) |
| **Docs** | https://developer.godaddy.com/doc/endpoint/domains |

## Authentication

```bash
Authorization: sso-key {KEY}:{SECRET}
```

Generate keys at https://developer.godaddy.com/keys. First key created is always an OTE (test) key — OTE keys only work against `api.ote-godaddy.com`. Create a separate production key for `api.godaddy.com`.

**Access requirement:** 10+ active domains OR monthly spend of $20+ USD.

## Common Operations

**List all DNS records:**
```bash
curl -X GET "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET"
```

**Add an A record (non-destructive PATCH — preferred):**
```bash
curl -X PATCH "https://api.godaddy.com/v1/domains/example.com/records" \
  -H "Authorization: sso-key KEY:SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"type":"A","name":"www","data":"1.2.3.4","ttl":3600}]'
```

## Rate Limits

| Limit | Value |
|-------|-------|
| Requests/minute | 60 per endpoint |
| Monthly calls | 20,000 (standard free tier) |
| HTTP status on exceed | `429 Too Many Requests` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `Bearer` auth | Auth scheme is `sso-key`, not `Bearer` |
| `PUT /records` nukes everything | PUT replaces ALL records — use PATCH to add |
| OTE key in production | OTE keys only work on `api.ote-godaddy.com` |
| Less than 10 domains | API access requires 10+ domains or $20/mo spend |
| `PUT /records/{type}` nukes type | Replaces ALL records of that type — use PATCH |

## Full Reference

See `reference.md` for all 8 DNS endpoints with curl examples, domain management, forwarding, contacts, transfers, reseller/shopper support, error formats, and access tier pricing.
