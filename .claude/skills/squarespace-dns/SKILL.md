---
model: claude-sonnet-4-6
name: squarespace-dns
description: Use when managing DNS for domains registered with Squarespace (formerly Google Domains). Documents the dashboard-only workflow and Cloudflare NS workaround for programmatic access. No DNS API exists.
---

# Squarespace Domains DNS

## Overview

**No DNS API exists.** Dashboard only. Google Domains was acquired by Squarespace in September 2023; full domain migration completed July 2024. The Squarespace Commerce API covers Orders, Products, Inventory, Transactions, and Profiles — zero domain or DNS endpoints.

If you need programmatic DNS management, the answer is Cloudflare nameservers (see workaround below).

## Quick Reference

| Item | Value |
|------|-------|
| **Dashboard** | https://account.squarespace.com/domains |
| **DNS API** | Does not exist |
| **Default TTL** | 4 hours (14400 seconds) |
| **Dynamic DNS** | Not supported |
| **DNSSEC** | Disabled when switching to custom nameservers |
| **Docs** | https://support.squarespace.com/hc/en-us/articles/360002101888 |

## Record Types Supported

A, AAAA, ALIAS, CNAME, MX, TXT (SPF/DKIM/DMARC), SRV, CAA, HTTPS, PTR, SSHFP, TLSA, NS

## Squarespace Hosting DNS Records

When pointing a third-party domain to a Squarespace-hosted site:

| Record | Host | Value |
|--------|------|-------|
| A | `@` | `198.185.159.144` |
| A | `@` | `198.185.159.145` |
| A | `@` | `198.49.23.144` |
| A | `@` | `198.49.23.145` |
| CNAME | `www` | `ext-cust.squarespace.com` |

## The Cloudflare Workaround (Recommended)

Keep Squarespace as registrar. Delegate DNS to Cloudflare. Full API control, zero domain transfer required.

**Steps:**
1. Add domain to Cloudflare (free plan works) — Cloudflare assigns two nameservers
2. In Cloudflare, create all required DNS records BEFORE switching nameservers
3. In Squarespace: DNS → Domain Nameservers → Use Custom Nameservers → enter Cloudflare's NS
4. Confirm the DNSSEC disable prompt
5. Propagation: up to 48 hours

**For Squarespace-hosted sites via Cloudflare:**
- Add the 4 A records above (`198.185.159.144/145`, `198.49.23.144/145`)
- Add CNAME `www → ext-cust.squarespace.com` — **must be DNS-only (gray cloud), not proxied**
- Proxying the verify CNAME breaks Squarespace SSL verification

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Looking for a Squarespace DNS API | It doesn't exist — use Cloudflare NS instead |
| Expecting Dynamic DNS support | Not supported — use Cloudflare DDNS worker or deSEC |
| Leaving DNSSEC enabled when switching NS | Squarespace disables it automatically; confirm the prompt |
| Proxying the www CNAME through Cloudflare | Set to DNS-only — Squarespace SSL fails behind proxy |
| Editing DNS after switching to custom NS | Records in Squarespace panel are ignored — manage in your NS provider |

## Full Reference

See `reference.md` for the complete Google Domains → Squarespace timeline, API scope audit, all connection modes, domain management operations, workaround patterns (Cloudflare, transfer, Cloud DNS), sharing access, and agency decision tree.
