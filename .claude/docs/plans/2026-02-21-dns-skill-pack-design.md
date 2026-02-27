# DNS Skill Pack — Design Document

> **Date:** 2026-02-21
> **Status:** Approved
> **Scope:** New `dns` skill pack for armadillo

## Purpose

A skill pack that gives armadillo full DNS management capabilities across 5 providers — both for agency operations (managing client DNS day-to-day) and for building tools that programmatically manage DNS records via provider APIs.

## Providers

| Provider | API | Priority |
|----------|-----|----------|
| Cloudflare | API v4 (REST) | Primary |
| GoDaddy | Domains API v1 (REST) | Primary |
| Namecheap | XML API | Primary |
| Name.com | API v4 (REST) | Primary |
| Squarespace | Domains API (REST) | Primary |

## Pack Structure

```
packs/dns/
├── skills/
│   ├── dns-pimp/              # Orchestrator — routes to correct provider
│   │   └── SKILL.md
│   ├── dns-manager/           # Unified interface — provider-agnostic ops
│   │   └── SKILL.md
│   ├── cloudflare-dns/        # Cloudflare API v4 — full reference
│   │   ├── SKILL.md
│   │   └── reference.md
│   ├── godaddy-dns/           # GoDaddy Domains API v1
│   │   ├── SKILL.md
│   │   └── reference.md
│   ├── namecheap-dns/         # Namecheap API
│   │   ├── SKILL.md
│   │   └── reference.md
│   ├── namecom-dns/           # Name.com API v4
│   │   ├── SKILL.md
│   │   └── reference.md
│   └── squarespace-dns/       # Squarespace Domains API
│       ├── SKILL.md
│       └── reference.md
```

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `dns-pimp` | Pimp orchestrator | Routes all DNS requests to correct skill |
| `dns-manager` | Workflow skill | Unified DNS ops — reads `domains.json`, delegates to provider |
| `cloudflare-dns` | Reference skill | Cloudflare API v4 — zones, records, proxy, page rules, SSL |
| `godaddy-dns` | Reference skill | GoDaddy Domains API — records, forwarding, WHOIS |
| `namecheap-dns` | Reference skill | Namecheap API — domains, records, transfers, SSL |
| `namecom-dns` | Reference skill | Name.com v4 API — records, DNSSEC, URL forwarding |
| `squarespace-dns` | Reference skill | Squarespace Domains API — records, built-in site connections |
| `dns-expert` | Agent | General DNS guide — routes to skills, answers DNS theory |

## `domains.json` Schema

```json
{
  "$schema": "domains.schema.json",
  "domains": {
    "clientsite.com": {
      "provider": "cloudflare",
      "zoneId": "env:CLOUDFLARE_ZONE_CLIENTSITE",
      "apiKeyEnv": "CLOUDFLARE_API_TOKEN",
      "notes": "Main client site"
    },
    "otherclient.com": {
      "provider": "godaddy",
      "apiKeyEnv": "GODADDY_API_KEY",
      "apiSecretEnv": "GODADDY_API_SECRET",
      "notes": "Legacy GoDaddy client"
    }
  }
}
```

Credentials always reference env var names, never raw values. Follows the same pattern as `business.json` / NAP enforcement.

## Operations Coverage

| Operation | All Providers |
|-----------|:---:|
| Record CRUD (A, AAAA, CNAME, MX, TXT, SRV, CAA, NS) | Yes |
| Bulk record operations | Yes |
| DNS propagation check | Yes (via dig/nslookup) |
| Email auth verification (SPF, DKIM, DMARC) | Yes |
| SSL certificate status | Yes (provider-specific) |
| Domain WHOIS lookup | Yes (where API supports) |
| Domain transfer | Yes (where API supports) |
| Redirect/forwarding rules | Yes (provider-specific) |
| Proxy toggle | Cloudflare only |
| DNSSEC | Where supported |

## Routing Flow

```
User: "Add an A record for clientsite.com"
  → armadillo-shepherd → dns-pimp
    → dns-pimp reads domains.json → provider: cloudflare
    → routes to cloudflare-dns skill
    → cloudflare-dns uses reference.md for API details
```

## Shepherd Integration

New rows in the armadillo-shepherd routing table:

| Request | Skill |
|---------|-------|
| DNS records, domain management, add DNS record | `dns-pimp` |
| Domain registration, WHOIS, domain transfer | `dns-pimp` |
| DNS propagation, nameserver check | `dns-pimp` |
| Email auth (SPF, DKIM, DMARC), email DNS | `dns-pimp` |

## Agent: `dns-expert`

```yaml
name: dns-expert
model: inherit
description: Use when asking general DNS questions, comparing providers, or debugging DNS issues
```

Routes to provider-specific skills. Answers DNS theory (TTL, propagation, record types). Recommends best practices.

## armadillo.json Registration

```json
"dns": {
  "description": "Domain & DNS management — Cloudflare, GoDaddy, Namecheap, Name.com, Squarespace with unified interface and domains.json config",
  "skills": [
    "dns-pimp",
    "dns-manager",
    "cloudflare-dns",
    "godaddy-dns",
    "namecheap-dns",
    "namecom-dns",
    "squarespace-dns"
  ]
}
```

## Reference Skill Coverage Per Provider

Each reference.md covers:
- Authentication setup (API keys, tokens, OAuth where applicable)
- Record CRUD endpoints with request/response examples
- Rate limits and pagination
- Domain management (list, register, transfer, renew where applicable)
- SSL/TLS certificate management
- Redirect/forwarding rules
- WHOIS and privacy
- DNSSEC configuration
- Common mistakes and gotchas
- Pricing reference
- CLI tools (where applicable — e.g. Cloudflare's wrangler)

## Rules

A `dns-enforcement.md` rule that enforces:
- Never hardcode domain credentials — always use env vars via domains.json
- Always verify propagation after DNS changes
- Always set appropriate TTL values (not leaving at 1 for production)
