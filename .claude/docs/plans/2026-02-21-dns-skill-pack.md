# DNS Skill Pack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create a `dns` skill pack for armadillo that provides full DNS management across 5 providers (Cloudflare, GoDaddy, Namecheap, Name.com, Squarespace) with a unified interface, provider-specific reference skills, a pimp orchestrator, a dns-expert agent, and domains.json config model.

**Architecture:** Pack follows the same pattern as `frontend`, `brand`, and `opencode` packs — pimp orchestrator routes to provider-specific reference skills. A `dns-manager` workflow skill reads `domains.json` to auto-detect which provider to use. Each provider gets a SKILL.md (<100 lines) + reference.md (400-800 lines) with web-researched, verified API facts.

**Tech Stack:** Armadillo skill files (Markdown), agents (YAML+Markdown), armadillo.json manifest.

**Key research findings:**
- Cloudflare: API v4, Bearer token auth, batch endpoint (850x faster), DNS type change deprecated June 2026
- GoDaddy: v1 API, `sso-key` auth format, requires 10+ domains for API access, 60 req/min rate limit
- Namecheap: XML API (not REST), `setHosts` replaces ALL records (critical gotcha), requires $50 balance or 20+ domains, IPv4 whitelist required
- Name.com: v4 REST API, HTTP Basic Auth, new CORE API emerging but v4 still supported, 10 req/sec rate limit
- Squarespace: **NO DNS API** — dashboard only. Workaround: point NS to Cloudflare for API access. Reference skill documents this reality + workarounds.

---

## Task 1: Create pack directory structure

**Files:**
- Create: `packs/dns/skills/dns-pimp/`
- Create: `packs/dns/skills/dns-manager/`
- Create: `packs/dns/skills/cloudflare-dns/`
- Create: `packs/dns/skills/godaddy-dns/`
- Create: `packs/dns/skills/namecheap-dns/`
- Create: `packs/dns/skills/namecom-dns/`
- Create: `packs/dns/skills/squarespace-dns/`

**Step 1: Create all directories**

```bash
mkdir -p packs/dns/skills/{dns-pimp,dns-manager,cloudflare-dns,godaddy-dns,namecheap-dns,namecom-dns,squarespace-dns}
```

**Step 2: Verify structure**

```bash
find packs/dns -type d | sort
```

Expected:
```
packs/dns
packs/dns/skills
packs/dns/skills/cloudflare-dns
packs/dns/skills/dns-manager
packs/dns/skills/dns-pimp
packs/dns/skills/godaddy-dns
packs/dns/skills/namecheap-dns
packs/dns/skills/namecom-dns
packs/dns/skills/squarespace-dns
```

**Step 3: Commit**

```bash
git add packs/dns/
git commit -m "chore: scaffold dns skill pack directory structure"
```

---

## Task 2: Register dns pack in armadillo.json

**Files:**
- Modify: `armadillo.json`

**Step 1: Add dns pack to packs object**

Add after the last pack entry in armadillo.json:

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

**Step 2: Commit**

```bash
git add armadillo.json
git commit -m "chore: register dns pack in armadillo.json"
```

---

## Task 3: Write cloudflare-dns reference skill

**Files:**
- Create: `packs/dns/skills/cloudflare-dns/SKILL.md`
- Create: `packs/dns/skills/cloudflare-dns/reference.md`

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills

This is a reference skill. Use the writing-reference-skills process: research → write SKILL.md (<100 lines) → write reference.md (400-800 lines) → RED/GREEN test.

**SKILL.md must cover:**
- Frontmatter: `model: claude-sonnet-4-6`, name: `cloudflare-dns`, description triggers: "Cloudflare DNS", "Cloudflare zone", "CF API", "proxy toggle"
- Quick Reference table: base URL `https://api.cloudflare.com/client/v4`, Bearer token auth, `wrangler` CLI
- Auth: API Token (best practice) with `Zone.DNS Write` + `Zone.Zone Read` permissions
- Common ops: list records, create A record, batch operations
- Rate limits: 1200 req/5min
- Common mistakes: Global API Key vs Token, DNS type change deprecated June 2026, proxy toggle for A/AAAA/CNAME only

**reference.md must cover (verified from research):**
1. Authentication (API Token creation, scopes, restrictions — max 50 user tokens, 500 account tokens)
2. Zone management (list zones, zone ID lookup by domain name)
3. DNS record CRUD (`GET/POST/PUT/PATCH/DELETE /zones/{zone_id}/dns_records[/{id}]`)
4. Batch endpoint (`POST /zones/{zone_id}/dns_records/batch` — deletes, patches, puts, posts in order)
5. Record types: A, AAAA, CNAME, MX, TXT, SRV, CAA, NS, HTTPS, LOC, NAPTR, SMIMEA, CERT, DNSKEY, DS, SSHFP, SVCB, TLSA, URI
6. Proxy toggle (`proxied: true/false` — only A, AAAA, CNAME)
7. SSL/TLS mode (`PATCH /zones/{zone_id}/settings/ssl` — values: off, flexible, full, strict)
8. Page Rules / Redirect Rules
9. DNSSEC enable/disable
10. Filter parameters: `name.contains=`, `type=A`, `proxied=true` (new syntax, old `name=contains:` deprecated Feb 2025)
11. Deprecations: DNS record type change deprecated Jan 2026, EOL June 2026 — use delete+create instead
12. Pricing: Free plan includes DNS, no per-query charges
13. Common mistakes with curl examples

**Step 1: Research and write SKILL.md**

Use WebSearch to verify current Cloudflare API state (Feb 2026). Write SKILL.md following the neon/cloudflare-pages-workers pattern.

**Step 2: Write reference.md**

Comprehensive reference with TOC, curl examples, JS fetch examples. Follow the neon reference.md pattern.

**Step 3: RED/GREEN test**

Test with a subagent: ask 4 questions (auth setup, create A record, batch operations, recent deprecation) without and with the skill.

**Step 4: Commit**

```bash
git add packs/dns/skills/cloudflare-dns/
git commit -m "feat: add cloudflare-dns reference skill"
```

---

## Task 4: Write godaddy-dns reference skill

**Files:**
- Create: `packs/dns/skills/godaddy-dns/SKILL.md`
- Create: `packs/dns/skills/godaddy-dns/reference.md`

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills

**SKILL.md must cover:**
- Frontmatter: model: `claude-sonnet-4-6`, name: `godaddy-dns`, description triggers: "GoDaddy DNS", "GoDaddy domain", "GoDaddy API"
- Quick Reference: base URL `https://api.godaddy.com/v1`, `sso-key` auth header
- Auth: `Authorization: sso-key {KEY}:{SECRET}` — NOT Bearer, NOT Basic
- Access requirements: 10+ domains for API access, 50+ for Availability API
- Common ops: list records, add A record, replace records by type
- Rate limits: 60 req/min
- Common mistakes: `sso-key` format, OTE vs Production keys, record replacement replaces ALL records of that type

**reference.md must cover (verified from research):**
1. Authentication (`sso-key` format, key generation, OTE vs Production separation)
2. Base URLs (`api.ote-godaddy.com` sandbox, `api.godaddy.com` production)
3. Access tiers: 10+ domains = DNS API, 50+ domains = Availability API, $20/mo spend alternative
4. DNS Record endpoints:
   - `GET /v1/domains/{domain}/records` — all records
   - `GET /v1/domains/{domain}/records/{type}` — by type
   - `GET /v1/domains/{domain}/records/{type}/{name}` — by type+name
   - `PUT /v1/domains/{domain}/records` — replace ALL records (dangerous!)
   - `PUT /v1/domains/{domain}/records/{type}` — replace all of type
   - `PUT /v1/domains/{domain}/records/{type}/{name}` — replace specific
   - `PATCH /v1/domains/{domain}/records` — add records (non-destructive)
   - `DELETE /v1/domains/{domain}/records/{type}/{name}` — delete specific
5. Domain management: list, get, availability, purchase, validate, renew, cancel, TLDs
6. Record types: A, AAAA, CNAME, MX, TXT, SRV, CAA, NS
7. Domain forwarding: `GET/PUT/DELETE /v1/domains/{domain}/forwarding`
8. WHOIS contacts: `GET/PATCH /v1/domains/{domain}/contacts`
9. Domain transfers: initiate, accept, status
10. Reseller support: `X-Shopper-Id` header for subaccount management
11. Rate limits: 60 req/min (standard), 20,000 calls/month
12. Common mistakes: `sso-key` not `Bearer`, PUT replaces ALL records of type, OTE keys don't work in production

**Step 1-4: Same pattern as Task 3**

```bash
git add packs/dns/skills/godaddy-dns/
git commit -m "feat: add godaddy-dns reference skill"
```

---

## Task 5: Write namecheap-dns reference skill

**Files:**
- Create: `packs/dns/skills/namecheap-dns/SKILL.md`
- Create: `packs/dns/skills/namecheap-dns/reference.md`

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills

**SKILL.md must cover:**
- Frontmatter: model: `claude-sonnet-4-6`, name: `namecheap-dns`, description triggers: "Namecheap DNS", "Namecheap domain", "Namecheap API"
- Quick Reference: base URL `https://api.namecheap.com/xml.response`, XML API format, IPv4 whitelist required
- Auth: 4 required params (ApiUser, ApiKey, UserName, ClientIp)
- CRITICAL WARNING: `setHosts` replaces ALL records — must GET first, modify, then SET
- Access requirements: $50 balance OR 20+ domains OR $50 purchases in 2 years
- Common ops: getHosts, setHosts (the only two DNS operations)
- Common mistakes: setHosts wipes records, XML parsing, IPv4-only whitelist

**reference.md must cover (verified from research):**
1. Authentication: 4 global params, account requirements, IP whitelisting (IPv4 only)
2. Base URLs: production `api.namecheap.com/xml.response`, sandbox `api.sandbox.namecheap.com/xml.response`
3. API format: HTTP GET with query string params, XML responses
4. DNS commands (only two!):
   - `namecheap.domains.dns.getHosts` — get all records for a domain
   - `namecheap.domains.dns.setHosts` — SET ALL records (replaces everything!)
   - SLD + TLD params required (e.g., SLD=example, TLD=com)
5. THE CRITICAL GOTCHA: setHosts workflow — ALWAYS getHosts first, add/modify/remove from the list, then setHosts with the complete record set. Missing a record in setHosts = that record is deleted.
6. Record types: A, AAAA, CNAME, MX, MXE, TXT, URL301, URL302, FRAME, NS, CAA
7. Domain management: getList, getInfo, check, create, renew, reactivate, getRegistrarLock, setRegistrarLock
8. Domain transfers: create, getStatus, updateStatus, getList
9. SSL certificates: create, activate, getInfo, getList, parseCSR
10. WHOIS/WhoisGuard: getWhoisGuardList, enable, disable, getContacts, setContacts
11. Rate limits: ~20 req/min (soft limit), 50 commands per page for lists
12. Error codes: XML error format with `Number`, `Description`
13. Common mistakes: setHosts wipes all records, XML not JSON, IPv4-only whitelist, sandbox requires separate account

**Step 1-4: Same pattern as Task 3**

```bash
git add packs/dns/skills/namecheap-dns/
git commit -m "feat: add namecheap-dns reference skill"
```

---

## Task 6: Write namecom-dns reference skill

**Files:**
- Create: `packs/dns/skills/namecom-dns/SKILL.md`
- Create: `packs/dns/skills/namecom-dns/reference.md`

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills

**SKILL.md must cover:**
- Frontmatter: model: `claude-sonnet-4-6`, name: `namecom-dns`, description triggers: "Name.com DNS", "Name.com domain", "Name.com API"
- Quick Reference: base URL `https://api.name.com/v4`, HTTP Basic Auth (`username:token`)
- Auth: HTTP Basic Auth, 2FA blocks API unless explicitly toggled on, sandbox uses `-test` suffix on username
- Common ops: list records, create record, delete record
- Rate limits: 10 req/sec
- Common mistakes: 2FA blocking API, trailing slashes in URLs, sandbox token separation

**reference.md must cover (verified from research):**
1. Authentication: HTTP Basic Auth, API token generation, 2FA bypass toggle, IP whitelisting (optional)
2. Base URLs: production `api.name.com`, sandbox `api.dev.name.com`, all paths prefixed `/v4/`
3. DNS record endpoints:
   - `GET /v4/domains/{domain}/records` — list all
   - `GET /v4/domains/{domain}/records/{id}` — get specific
   - `POST /v4/domains/{domain}/records` — create record
   - `PUT /v4/domains/{domain}/records/{id}` — update record
   - `DELETE /v4/domains/{domain}/records/{id}` — delete record
4. Record types: A, AAAA, CNAME, MX, TXT, SRV, NS
5. Domain management: list domains, get domain, search availability, register, renew, auto-renew settings
6. URL forwarding: create, list, get, update, delete
7. Email forwarding: create, list, get, update, delete
8. DNSSEC: create DS record, list, get, delete
9. Domain transfers: initiate (create), list, get, cancel
10. WHOIS contacts: get, set
11. New CORE API note: Name.com has a new CORE API (`docs.name.com`), v4 still fully supported
12. Rate limits: 10 req/sec, HTTP 429 on exceed
13. Common mistakes: 2FA blocking API, sandbox credentials are separate, no trailing slash

**Step 1-4: Same pattern as Task 3**

```bash
git add packs/dns/skills/namecom-dns/
git commit -m "feat: add namecom-dns reference skill"
```

---

## Task 7: Write squarespace-dns reference skill

**Files:**
- Create: `packs/dns/skills/squarespace-dns/SKILL.md`
- Create: `packs/dns/skills/squarespace-dns/reference.md`

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills

This is a **non-standard reference skill** — Squarespace has NO DNS API. The skill documents this reality + workarounds. Still valuable because it prevents agents from wasting time looking for an API that doesn't exist.

**SKILL.md must cover:**
- Frontmatter: model: `claude-sonnet-4-6`, name: `squarespace-dns`, description: "Use when managing DNS for domains registered with Squarespace (formerly Google Domains). Documents the dashboard-only workflow and Cloudflare NS workaround for programmatic access."
- CLEAR STATEMENT: No DNS API exists. Dashboard only.
- Google Domains acquisition timeline
- The Cloudflare workaround (recommended for API access)
- Record types supported in dashboard
- Common ops: all via dashboard at Domains > [domain] > DNS

**reference.md must cover (verified from research):**
1. Google Domains → Squarespace acquisition timeline (June 2023 → July 2024)
2. Commerce API exists but zero domain/DNS endpoints
3. Dashboard-only DNS management: Preset DNS, Custom records
4. Record types: A, AAAA, ALIAS, CNAME, MX, TXT, SRV, CAA, HTTPS, PTR, SSHFP, TLSA, NS
5. Default TTL: 4 hours, configurable
6. Three connection methods: Squarespace-Managed, Nameserver Connect, DNS Connect
7. Workaround patterns:
   - **Option A (recommended):** Cloudflare as DNS — keep Squarespace as registrar, point NS to Cloudflare, manage DNS via Cloudflare API. Include the 4 A records + CNAME needed for Squarespace-hosted sites.
   - **Option B:** Transfer domain to Cloudflare Registrar entirely
   - **Option C:** Stay on Squarespace DNS (manual, acceptable when changes are infrequent)
   - **Option D:** Cloud DNS (Google Cloud) for GCP workloads
8. Squarespace IPs for site hosting: `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145`
9. CNAME for www: `ext-cust.squarespace.com`
10. Sharing access: Domain Managers via email invitation
11. DNSSEC implications when switching NS
12. Dynamic DNS: not supported by Squarespace

**Step 1-4: Same pattern as Task 3**

```bash
git add packs/dns/skills/squarespace-dns/
git commit -m "feat: add squarespace-dns reference skill — documents no-API reality and workarounds"
```

---

## Task 8: Write dns-manager unified interface skill

**Files:**
- Create: `packs/dns/skills/dns-manager/SKILL.md`

**Step 1: Write SKILL.md**

This is a workflow skill (not a reference skill) — it provides the unified DNS interface that reads `domains.json` and delegates to the correct provider skill.

```markdown
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

## Workflow

1. Read `domains.json` at project root
2. Look up the requested domain
3. Load the provider-specific skill
4. Execute the operation using provider's API

If `domains.json` doesn't exist, ask which provider to use.

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
# Check propagation across multiple nameservers
dig +short A example.com @8.8.8.8
dig +short A example.com @1.1.1.1
dig +short A example.com @208.67.222.222
```

## Email Auth Verification

Provider-independent — check SPF, DKIM, DMARC via TXT records:

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
```

**Step 2: Commit**

```bash
git add packs/dns/skills/dns-manager/
git commit -m "feat: add dns-manager unified interface skill"
```

---

## Task 9: Write dns-pimp orchestrator skill

**Files:**
- Create: `packs/dns/skills/dns-pimp/SKILL.md`

**Step 1: Write SKILL.md**

Follow the exact pattern from `frontend-pimp`, `brand-pimp`, and `opencode-pimp`.

```markdown
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
```

**Step 2: Commit**

```bash
git add packs/dns/skills/dns-pimp/
git commit -m "feat: add dns-pimp orchestrator skill"
```

---

## Task 10: Write dns-expert agent

**Files:**
- Create: `.claude/agents/dns-expert.md`

**Step 1: Write agent definition**

Follow the exact pattern from `infra-guide.md` and `database-guide.md`.

```markdown
---
name: dns-expert
description: Use when asking general DNS questions, comparing providers, debugging DNS issues, or when choosing between DNS providers. Routes to specific skills (cloudflare-dns, godaddy-dns, namecheap-dns, namecom-dns, squarespace-dns) based on context.
model: inherit
memory: user
maxTurns: 20
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, Skill
---

# DNS Expert

You help with domain management, DNS configuration, and DNS troubleshooting.

## Skills You Route To

| Topic | Skill |
|-------|-------|
| Cloudflare DNS management | armadillo:cloudflare-dns |
| GoDaddy DNS management | armadillo:godaddy-dns |
| Namecheap DNS management | armadillo:namecheap-dns |
| Name.com DNS management | armadillo:namecom-dns |
| Squarespace DNS management | armadillo:squarespace-dns |
| Unified DNS ops | armadillo:dns-manager |

## How to Help

1. Read `domains.json` if it exists — use the project's configured providers
2. If no domains.json, understand the project's needs before recommending
3. Load the relevant reference skill for provider-specific questions
4. For "where should I register?" questions, compare based on: API quality, pricing, features, ease of use

## Decision Quick Reference

| Need | Recommendation |
|------|----------------|
| Best API, full automation | Cloudflare (free, best API, batch support) |
| Client already on GoDaddy | GoDaddy (API requires 10+ domains) |
| Client on Namecheap | Namecheap (XML API, setHosts gotcha — be careful) |
| Client on Name.com | Name.com (clean REST API, good DX) |
| Client on Squarespace | Squarespace (no API — use Cloudflare NS workaround) |
| Cheapest registrar at-cost | Cloudflare Registrar (wholesale pricing, no markup) |
| Need email + domain bundle | GoDaddy or Namecheap |

## DNS Debugging Toolkit

```bash
# Check what nameservers a domain uses
dig +short NS example.com

# Check A record propagation
dig +short A example.com @8.8.8.8
dig +short A example.com @1.1.1.1

# Check MX records
dig +short MX example.com

# Check TXT records (SPF, DMARC, DKIM)
dig +short TXT example.com
dig +short TXT _dmarc.example.com

# Full DNS trace
dig +trace example.com
```
```

**Step 2: Register agent in armadillo.json**

Add `"dns-expert.md"` to `core.agents` array.

**Step 3: Commit**

```bash
git add .claude/agents/dns-expert.md armadillo.json
git commit -m "feat: add dns-expert agent"
```

---

## Task 11: Update armadillo-shepherd routing table

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`

**Step 1: Add DNS routing entries**

Add a new "Domain & DNS" section to the routing table in armadillo-shepherd:

```markdown
### Domain & DNS

| Request | Skill |
|---------|-------|
| ANYTHING DNS/domain-related (DNS records, domain management, registrar, nameservers, domain transfer, WHOIS) | `dns-pimp` |
| DNS records, add A/CNAME/MX/TXT record, manage DNS | `dns-pimp` |
| Domain registration, WHOIS, domain transfer, registrar | `dns-pimp` |
| DNS propagation, nameserver check, dig query | `dns-pimp` |
| Email auth DNS (SPF, DKIM, DMARC), email DNS setup | `dns-pimp` |
| Cloudflare DNS, GoDaddy DNS, Namecheap DNS, Name.com DNS, Squarespace DNS | `dns-pimp` |
```

**Step 2: Commit**

```bash
git add .claude/skills/armadillo-shepherd/
git commit -m "feat: add DNS routing to armadillo-shepherd"
```

---

## Task 12: Run sync-all.js validation

**Files:**
- Validate: `armadillo.json` ↔ filesystem sync

**Step 1: Run validation**

```bash
node scripts/sync-all.js --check
```

Expected: all checks pass — armadillo.json lists the dns pack, filesystem has matching directories.

**Step 2: Fix any validation errors**

If sync-all.js reports mismatches, fix them (missing directories, manifest entries, etc.)

**Step 3: Run sync-all.js in generate mode**

```bash
node scripts/sync-all.js
```

This regenerates CLAUDE.md marked sections and README.md to include the new dns pack.

**Step 4: Commit generated files**

```bash
git add .claude/CLAUDE.md README.md
git commit -m "chore: regenerate CLAUDE.md and README.md with dns pack"
```

---

## Task Dependency Map

```
Task 1 (dirs) ──→ Task 2 (manifest) ──→ Task 12 (validate)
                                           ↑
Task 3 (cloudflare) ─┐                    │
Task 4 (godaddy)   ──┤                    │
Task 5 (namecheap) ──┼── Task 8 (manager) ─┤
Task 6 (namecom)   ──┤        ↓           │
Task 7 (squarespace)─┘  Task 9 (pimp) ────┤
                              ↓            │
                     Task 10 (agent) ──────┤
                     Task 11 (shepherd) ───┘
```

**Parallelizable groups:**
- Tasks 3, 4, 5, 6, 7 can all run in parallel (independent reference skills)
- Tasks 1, 2 are sequential prerequisites
- Tasks 8-12 are sequential after the reference skills

**Total: 12 tasks**
