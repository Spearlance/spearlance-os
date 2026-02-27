---
model: claude-sonnet-4-6
name: namecheap-dns
description: Use when managing DNS records or domains via Namecheap API — getHosts/setHosts record management, domain registration, transfers, SSL certificates, or WHOIS. Critical — setHosts replaces ALL records, must GET first then SET complete list.
---

# Namecheap DNS & Domain API

## Overview

Namecheap XML API (February 2026). All requests are HTTP GET with query string params. Responses are XML. IPv4 whitelist required — no IPv6.

## Quick Reference

| Item | Value |
|------|-------|
| **Base URL (production)** | `https://api.namecheap.com/xml.response` |
| **Base URL (sandbox)** | `https://api.sandbox.namecheap.com/xml.response` |
| **Format** | HTTP GET, XML responses |
| **Auth** | 4 global query params (see below) |
| **IP whitelist** | IPv4 only — enable at Profile → Tools → API Access |
| **Rate limit** | ~20 req/min soft limit |
| **Docs** | https://www.namecheap.com/support/api/intro/ |

## Authentication

Every request requires these 4 params:

| Param | Value |
|-------|-------|
| `ApiUser` | Your Namecheap username |
| `ApiKey` | API key from Profile → Tools |
| `UserName` | Same as ApiUser (typically) |
| `ClientIp` | Whitelisted IPv4 of the requesting machine |

```
https://api.namecheap.com/xml.response?ApiUser=USER&ApiKey=KEY&UserName=USER&ClientIp=1.2.3.4&Command=namecheap.domains.getList
```

## Access Requirements

To enable API on production, account must meet **one** of:
- $50 account balance
- 20+ domains registered
- $50+ in purchases in the past 2 years

Sandbox has no restrictions — create a separate account at sandbox.namecheap.com.

## ⚠ CRITICAL: setHosts Replaces ALL Records

```
┌──────────────────────────────────────────────────────────────────┐
│  setHosts OVERWRITES THE ENTIRE RECORD SET.                      │
│  Missing a record = that record is deleted.                      │
│                                                                  │
│  ALWAYS:                                                         │
│  1. Call getHosts → parse all existing records                   │
│  2. Modify the list (add/edit/remove what you need)              │
│  3. Call setHosts with the COMPLETE modified list                 │
└──────────────────────────────────────────────────────────────────┘
```

## Common Operations

**Get all DNS records:**
```
GET https://api.namecheap.com/xml.response
  ?ApiUser=USER&ApiKey=KEY&UserName=USER&ClientIp=IP
  &Command=namecheap.domains.dns.getHosts
  &SLD=example&TLD=com
```

**Set DNS records (full example with 2 records):**
```
GET https://api.namecheap.com/xml.response
  ?ApiUser=USER&ApiKey=KEY&UserName=USER&ClientIp=IP
  &Command=namecheap.domains.dns.setHosts
  &SLD=example&TLD=com
  &HostName1=@&RecordType1=A&Address1=1.2.3.4&TTL1=1800
  &HostName2=www&RecordType2=CNAME&Address2=example.com.&TTL2=1800
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Calling setHosts without getHosts first | You'll wipe existing records — always GET first |
| Expecting JSON | API is XML only — parse with an XML library |
| Whitelisting IPv6 | IPv4 only — find your IPv4 at whatismyipaddress.com |
| Using production creds in sandbox | Sandbox needs a separate account at sandbox.namecheap.com |
| Omitting `ClientIp` | Required on every request — not just auth setup |

## Full Reference

See `reference.md` for complete documentation including all DNS commands, domain management, transfers, SSL certificates, WhoisGuard, error codes, and pagination.
