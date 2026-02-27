---
model: claude-sonnet-4-6
name: dns-manager
description: Unified DNS management interface — reads domains.json to auto-detect provider, normalizes record operations across Cloudflare, GoDaddy, Namecheap, Name.com, and Squarespace. Use when managing DNS records for a domain without specifying which provider to use.
---

# DNS Manager

## Overview

Provider-agnostic DNS operations. Reads `domains.json` at the project root to determine which provider hosts each domain, then delegates to the provider-specific skill.

## domains.json Schema

```json
{
  "domains": {
    "example.com": {
      "provider": "cloudflare",
      "zoneId": "env:CLOUDFLARE_ZONE_EXAMPLE",
      "apiKeyEnv": "CLOUDFLARE_API_TOKEN",
      "notes": "Main site"
    },
    "client.com": {
      "provider": "godaddy",
      "apiKeyEnv": "GODADDY_API_KEY",
      "apiSecretEnv": "GODADDY_API_SECRET",
      "notes": "Client legacy domain"
    }
  }
}
```

### Provider Values

| Value | Provider Skill |
|-------|---------------|
| `cloudflare` | `cloudflare-dns` |
| `godaddy` | `godaddy-dns` |
| `namecheap` | `namecheap-dns` |
| `namecom` | `namecom-dns` |
| `squarespace` | `squarespace-dns` (dashboard-only — no API) |

### Credential Fields

All credential values reference env var names — never raw values.

| Field | When |
|-------|------|
| `apiKeyEnv` | Always required |
| `apiSecretEnv` | GoDaddy (key:secret pair) |
| `zoneId` | Cloudflare (zone identifier) — prefix with `env:` if stored in env var |
| `username` | Namecheap (ApiUser), Name.com (HTTP Basic Auth username) |

If `domains.json` doesn't exist at the project root, ask which provider to use.

## Unified Operations

| Operation | All Providers |
|-----------|:---:|
| List records | ✓ |
| Create record | ✓ |
| Update record | ✓ (Namecheap: via full setHosts) |
| Delete record | ✓ (Namecheap: via full setHosts minus record) |
| Bulk operations | ✓ (Cloudflare batch, others: loop) |

## DNS Propagation Check

Provider-independent — uses `dig` directly:

```bash
dig +short A example.com @8.8.8.8
dig +short A example.com @1.1.1.1
dig +short A example.com @208.67.222.222
```

## Email Auth Verification

```bash
dig +short TXT example.com            # SPF
dig +short TXT _dmarc.example.com     # DMARC
dig +short TXT selector._domainkey.example.com  # DKIM
```

## Provider-Specific Gotchas

| Provider | Gotcha |
|----------|--------|
| Cloudflare | DNS record type change deprecated June 2026 — delete + create instead |
| GoDaddy | PUT replaces ALL records of that type — use PATCH to add |
| Namecheap | setHosts replaces ALL records — must GET first, modify, then SET |
| Name.com | 2FA blocks API unless explicitly toggled on |
| Squarespace | No API — dashboard only. Use Cloudflare NS for programmatic access |
