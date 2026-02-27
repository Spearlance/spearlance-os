---
model: claude-sonnet-4-6
name: dns-pimp
description: Active router for ALL domain and DNS requests — classifies and routes to the correct dns-* skill before any response. Use when anything involves DNS records, domain registration, domain transfers, WHOIS, nameservers, or email authentication records.
---

<EXTREMELY-IMPORTANT>
If the request involves DNS or domains in ANY way — DNS records, domain registration, domain transfers, WHOIS, nameservers, SSL certificates, email auth (SPF/DKIM/DMARC), DNS propagation, proxy toggle, domain forwarding, or anything else DNS-related — you MUST route through this skill FIRST.

This is not optional. This is not negotiable. You cannot skip this.
</EXTREMELY-IMPORTANT>

# DNS Pimp

The orchestration layer for all DNS/domain expertise. Not documentation — an active router. Every DNS request flows through this routing table before any response.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🌐 dns-pimp ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what request/routing]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then route.

## Quick Context

The dns pack is armadillo's domain/DNS ecosystem — 7 skills covering 5 providers (Cloudflare, GoDaddy, Namecheap, Name.com, Squarespace) with a unified interface via `dns-manager` and `domains.json` config.

## Routing Table

Classify the request. Invoke the matching skill. No response before invocation.

| Request Pattern | Skill |
|----------------|-------|
| DNS ops without specifying provider, "add A record for client.com" | `dns-manager` |
| Cloudflare DNS, CF proxy, Cloudflare zone, wrangler DNS | `cloudflare-dns` |
| GoDaddy DNS, GoDaddy domain, GoDaddy records | `godaddy-dns` |
| Namecheap DNS, Namecheap domain, Namecheap records | `namecheap-dns` |
| Name.com DNS, Name.com domain, Name.com records | `namecom-dns` |
| Squarespace DNS, Squarespace domain, Google Domains | `squarespace-dns` |
| "Set up domains.json", configure DNS provider mapping | `dns-manager` |
| DNS propagation check, nameserver check, dig query | `dns-manager` |
| Email auth (SPF, DKIM, DMARC) setup or verification | `dns-manager` |
| Compare DNS providers, "which registrar should I use" | `dns-expert` agent |
| DNS theory, TTL, record types explained, DNSSEC concepts | `dns-expert` agent |

## State Detection

Before routing, check project state:

- **`domains.json` at project root** → read it to auto-detect provider for the requested domain
- **`stack.json` → `deploy`** → if Cloudflare, suggest using Cloudflare DNS
- **No `domains.json`** → ask which provider, then suggest creating `domains.json`

| State | Recommendation |
|-------|---------------|
| domains.json exists with domain | Route to provider-specific skill directly |
| domains.json exists, domain not listed | Ask which provider, add to domains.json |
| No domains.json | Ask provider, suggest creating domains.json via dns-manager |

## Cross-Cutting Rules

- If request specifies a provider, route directly to that provider skill
- If request mentions a domain, check domains.json first
- If domains.json maps the domain → route to that provider
- If unclear which provider → ask ONE question, then route
- "Compare providers" or "which is best" → dns-expert agent

## Priority Order

1. **dns-manager** — generic DNS ops, domains.json setup
2. **Provider skill** — provider-specific operations
3. **dns-expert** — theory, comparison, debugging

## What This Skill Does NOT Route

- General hosting questions (even if domain-related) → infra-guide
- SSL certificate setup in web server config → not DNS-specific
- Email service configuration beyond DNS records → not DNS-specific

## Hard Rules

- Never respond about DNS before invoking the target skill
- No summarizing, planning to invoke, or explaining what you're about to do
- If unclear, ask ONE clarifying question, then route
- The skill's reference.md has the verified facts — always defer to it
