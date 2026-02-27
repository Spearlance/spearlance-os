# Squarespace Domains DNS — Complete Reference

> **Last Verified:** February 2026

## Table of Contents

1. [Google Domains → Squarespace Timeline](#1-google-domains--squarespace-timeline)
2. [No DNS API — Confirmed](#2-no-dns-api--confirmed)
3. [Dashboard-Only DNS Management](#3-dashboard-only-dns-management)
4. [Record Types](#4-record-types)
5. [Connection Methods](#5-connection-methods)
6. [Domain Management Operations](#6-domain-management-operations)
7. [Workaround Patterns](#7-workaround-patterns)
8. [Squarespace Hosting IPs](#8-squarespace-hosting-ips)
9. [Sharing Access](#9-sharing-access)
10. [Agency Workflow Decision Tree](#10-agency-workflow-decision-tree)

---

## 1. Google Domains → Squarespace Timeline

| Date | Event |
|------|-------|
| June 15, 2023 | Google announces sale of Google Domains to Squarespace |
| September 7, 2023 | Acquisition closes — Squarespace takes legal ownership |
| September–April 2024 | Phased migration of ~10M domains; automatic opt-in |
| July 10, 2024 | Full migration complete — all domains on Squarespace infrastructure |
| Post-migration | Google Cloud Domains API remains operational but DNS records are frozen |

### Google Cloud Domains API — Post-Migration State

The Google Cloud Domains API (`domains.googleapis.com`) still exists and can return domain records, but **DNS record mutations are blocked** for migrated domains. Any attempt to create/update/delete DNS records via the Cloud DNS API on a Squarespace-migrated domain returns an error. The API is effectively read-only for migrated domains unless the domain was re-delegated to Cloud DNS manually after migration.

### What Migrated Automatically

- Domain registration and renewal
- DNS records (copied as-is to Squarespace DNS)
- WHOIS privacy settings
- Auto-renew preferences
- Domain forwarding rules
- Google Workspace email linkage (via auto-added CNAME)

### What Did NOT Migrate

- Google Domains API programmatic access (no equivalent in Squarespace)
- Dynamic DNS (DDNS) support
- ACME DNS API support (used by some cert automation tools)
- Domain Groups

---

## 2. No DNS API — Confirmed

### Squarespace Commerce API Scope Audit

The Squarespace developer platform (`developers.squarespace.com`) provides a Commerce API covering:

| API | What it does |
|-----|-------------|
| Orders API | Read and manage store orders |
| Products API v1/v2 | CRUD on store products and variants |
| Inventory API | Stock levels and adjustments |
| Transactions API | Payment and transaction records |
| Profiles API | Customers, subscribers, donors |
| Webhook Subscriptions | Event notifications (order created, etc.) |

**There is no `domains` API. There is no `dns` API.**

Available OAuth scopes as of February 2026:
- `website.orders`
- `website.products`
- `website.inventory`
- `website.transactions`
- `website.profiles`

No `website.domains` scope. No `website.dns` scope. These do not exist.

### Why This Matters

Google Domains had no DNS API either, but it had:
- Dynamic DNS (built-in DDNS with username/password per record)
- ACME DNS API (Let's Encrypt DNS-01 challenge automation)
- Google Cloud DNS integration (for GCP workloads)

Squarespace dropped all three. If your workflow depended on any of these, you must adopt a workaround.

### Community Confirmation

Squarespace forum threads dating back to the 2023 acquisition consistently confirm there is no DNS management API. Dynamic DNS users (home servers, self-hosted services) were hit hardest and the community-recommended solution is universally: switch nameservers to Cloudflare and use Cloudflare's free DDNS workers or the Cloudflare API.

---

## 3. Dashboard-Only DNS Management

Dashboard URL: `https://account.squarespace.com/domains` → select domain → DNS

### Two Modes

**Preset DNS (auto-configuration)**

Squarespace provides one-click presets for popular services:
- Google Workspace (MX + DKIM + SPF)
- Fastmail
- Zoho Mail
- iCloud Custom Email
- Various email providers

Presets add the required records automatically. Useful for non-technical setups.

**Custom Records (manual entry)**

Full manual control over individual DNS records. Add/edit/delete records one at a time. No bulk import. No CSV upload. No API.

### Limitations

| Feature | Supported |
|---------|-----------|
| Bulk import | No |
| API access | No |
| Dynamic DNS | No |
| ACME DNS API | No |
| DNSSEC (with Squarespace NS) | Yes |
| DNSSEC (with custom NS) | Disabled |
| TTL customization | Yes (per record) |
| Wildcard records | Yes |

---

## 4. Record Types

All record types supported by Squarespace DNS panel:

| Type | Use Case |
|------|----------|
| A | IPv4 address mapping |
| AAAA | IPv6 address mapping |
| ALIAS | Root domain CNAME-like (flattened) |
| CNAME | Canonical name / subdomain alias |
| MX | Mail exchanger routing |
| TXT | SPF, DKIM, DMARC, domain verification |
| SRV | Service location (SIP, XMPP, etc.) |
| CAA | Certificate Authority Authorization |
| HTTPS | HTTPS/SVCB service binding (modern browsers) |
| PTR | Reverse DNS (limited use at registrar level) |
| SSHFP | SSH public key fingerprint |
| TLSA | TLS certificate association (DANE) |
| NS | Subdomain nameserver delegation |

### Record Types NOT Supported

- **Dynamic DNS records** — no DDNS protocol support
- **ACME DNS API** — no API endpoint for DNS-01 challenge automation

---

## 5. Connection Methods

Squarespace offers three domain connection modes. What's available depends on the mode:

| Feature | Squarespace-Managed Domain | Nameserver Connect | DNS Connect |
|---------|---------------------------|-------------------|-------------|
| Description | Domain registered + DNS at Squarespace | Third-party domain, NS pointed to Squarespace | Third-party domain, individual records pointed to Squarespace |
| DNS control panel | ✓ Full control | ✓ Squarespace manages NS zone | ✗ Managed at third-party registrar |
| Automatic SSL | ✓ | ✓ | ✓ (slower provisioning) |
| Custom DNS records | ✓ | ✓ | ✗ (not applicable — you manage records externally) |
| DNSSEC | ✓ (when using Squarespace NS) | ✓ | Depends on third-party |
| Email forwarding | ✓ | ✓ | ✗ |
| Auto-renewal | ✓ | ✗ (manage at registrar) | ✗ |
| Squarespace site connection | Primary | Secondary | Secondary |

### Nameserver Connect vs DNS Connect

**Nameserver Connect:** Point your domain's NS records to Squarespace's nameservers. Squarespace controls the entire DNS zone. Good when you want Squarespace to manage everything.

**DNS Connect:** Keep your own nameservers, add specific A/CNAME records pointing at Squarespace IPs. Good when you need to manage DNS elsewhere (e.g., Cloudflare) while still hosting the site on Squarespace.

---

## 6. Domain Management Operations

All of the following are **dashboard-only** — no API equivalent:

### Registration

- Register new domains at `domains.squarespace.com`
- Supported TLDs: .com, .net, .org, .io, .co, and many more
- Pricing varies by TLD; .com typically ~$20/year

### Transfer In

1. Unlock domain at current registrar
2. Get authorization/EPP code
3. Squarespace: Domains → Transfer Domain → enter domain → enter auth code
4. Approve transfer confirmation email
5. Transfer completes in 5–7 days (ICANN policy)

### Transfer Out

1. Disable domain lock: DNS → Domain Lock → Off
2. Disable WHOIS privacy (some registrars require this)
3. Request auth code from Squarespace support or dashboard
4. Initiate transfer at destination registrar

### Auto-Renew

Enabled by default. Toggle per domain in dashboard. Billing uses payment method on file.

### WHOIS Privacy

Enabled by default (free). Hides registrant contact info from public WHOIS queries.

### Domain Lock

Enabled by default (transfer lock). Prevents unauthorized transfers. Must disable before transferring out.

### Custom Nameservers

DNS → Domain Nameservers → Use Custom Nameservers. Requires password re-authentication. Automatically disables DNSSEC. Propagation: up to 48 hours.

---

## 7. Workaround Patterns

Since no DNS API exists, choose a workaround based on your needs:

### Option A: Cloudflare as DNS Provider (Recommended)

**Best for:** Programmatic DNS, DDNS, API automation, CI/CD pipelines, wildcard SSL, firewall rules.

**What it does:** Keep Squarespace as the registrar (no transfer, no downtime risk), delegate DNS authority to Cloudflare. Get full Cloudflare API access.

**Setup:**

```bash
# 1. Add domain to Cloudflare (free plan)
# Cloudflare assigns two nameservers, e.g.:
#   ns1.cloudflare.com
#   ns2.cloudflare.com

# 2. In Cloudflare DNS, recreate all existing records BEFORE switching NS
#    Export from Squarespace manually, re-enter in Cloudflare

# 3. In Squarespace dashboard:
#    DNS → Domain Nameservers → Use Custom Nameservers
#    Enter Cloudflare's two NS values → Save
#    Confirm DNSSEC disable prompt

# 4. Wait for propagation (up to 48 hours)
#    Check: dig NS yourdomain.com @8.8.8.8
```

**For Squarespace-hosted sites via Cloudflare DNS:**

```
# Add these records in Cloudflare (DNS-only, NOT proxied):
A     @      198.185.159.144   TTL: Auto   Proxy: DNS only
A     @      198.185.159.145   TTL: Auto   Proxy: DNS only
A     @      198.49.23.144     TTL: Auto   Proxy: DNS only
A     @      198.49.23.145     TTL: Auto   Proxy: DNS only
CNAME www    ext-cust.squarespace.com  TTL: Auto  Proxy: DNS only
```

**Critical:** The `www` CNAME must be DNS-only (gray cloud). Proxying through Cloudflare breaks Squarespace's SSL certificate provisioning and site verification.

**Programmatic DNS after setup:**

```bash
export CF_API_TOKEN="your_cloudflare_token"
export ZONE_ID="your_zone_id"

# Create a TXT record (e.g., for DNS-01 ACME challenge)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"TXT","name":"_acme-challenge","content":"verification_token","ttl":120}'
```

Use the `cloudflare-dns` skill for full Cloudflare API reference.

---

### Option B: Transfer Domain to Cloudflare Registrar

**Best for:** Teams that want everything in one place with full API control.

**What it does:** Move domain registration itself to Cloudflare. Squarespace is no longer involved at all.

**Tradeoffs:**

| Pro | Con |
|-----|-----|
| Full API control (registrar + DNS) | Transfer lock period (60 days post-registration) |
| Cloudflare at-cost pricing (~$9/year for .com) | One-time transfer friction |
| No two-dashboard management | Must recreate all DNS records |
| DNSSEC supported | Domain email changes to Cloudflare contact |

**Steps:**
1. Unlock domain in Squarespace → get auth code
2. In Cloudflare: Add a Site → Transfer Domain → enter auth code
3. Approve transfer email
4. Transfer completes in 5–7 days

---

### Option C: Stay on Squarespace DNS (Manual)

**Best for:** Low-change domains. Personal sites. No automation needed.

DNS changes are infrequent (once a month or less)? Manual dashboard updates are fine. No workaround needed.

**Limitations:**
- No API
- No Dynamic DNS
- No ACME DNS API (use HTTP-01 challenge for Let's Encrypt instead)
- Bulk changes are painful

---

### Option D: Google Cloud DNS (GCP Workloads)

**Best for:** Domains powering GCP services where Cloud DNS integration is preferable.

**What it does:** Keep Squarespace as registrar, point NS to Google Cloud DNS. Manage records via `gcloud` CLI or Cloud DNS API.

```bash
# Create a Cloud DNS managed zone
gcloud dns managed-zones create my-zone \
  --dns-name="yourdomain.com." \
  --description="Production zone"

# Get assigned NS records
gcloud dns managed-zones describe my-zone --format="value(nameServers)"
# → ns-cloud-a1.googledomains.com., ns-cloud-a2.googledomains.com., ...

# Enter these NS values in Squarespace custom nameservers field

# Add records via API
gcloud dns record-sets create yourdomain.com. \
  --zone=my-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="34.x.x.x"
```

**Note:** Despite the `googledomains.com` NS hostnames, this is Google Cloud DNS — not the deprecated Google Domains product. It's a separate GCP service with full API access.

---

## 8. Squarespace Hosting IPs

When pointing any external domain (regardless of registrar or DNS provider) to a Squarespace-hosted website:

```
# Required A records for root domain (@):
198.185.159.144
198.185.159.145
198.49.23.144
198.49.23.145

# Required CNAME for www subdomain:
www → ext-cust.squarespace.com
```

All four A records are required. Using only some will cause intermittent connectivity depending on which IP the CDN routes to.

The `198.185.159.0/24` and `198.49.23.0/24` ranges are owned by Squarespace, Inc. (AS53831), located in New York City.

**Squarespace trial sites:** Use `[hash].squarespace.com` as CNAME target — the production `ext-cust.squarespace.com` is only active after connecting a custom domain in the Squarespace site panel.

---

## 9. Sharing Access

Squarespace Domains supports shared access via Domain Manager invitations.

### Adding a Domain Manager

1. Dashboard → select domain → Permissions
2. Invite by email address
3. Invitee receives email and must accept
4. Managers can: add/edit/delete DNS records, manage renewal, edit nameservers

### Limitations

- Managers do NOT have billing access
- Managers cannot delete the domain
- Managers cannot transfer the domain out
- No role levels — all managers get the same permissions
- No API for access management

### Agency Best Practice

For agency clients: add your agency email as a Domain Manager rather than requesting full account access. Keeps client ownership intact. Remove access when engagement ends.

---

## 10. Agency Workflow Decision Tree

```
Need programmatic DNS management?
├── Yes
│   ├── GCP workload? → Option D (Cloud DNS, point NS to Google Cloud DNS)
│   └── Everything else? → Option A (Cloudflare NS, keep Squarespace as registrar)
│       └── Want registrar + DNS in one place? → Option B (transfer to Cloudflare)
└── No
    ├── Changes < 1x/month? → Option C (stay on Squarespace DNS, use dashboard)
    └── Changes > 1x/month? → Consider Option A anyway (save future pain)

Using Dynamic DNS (DDNS)?
→ Option A required — Squarespace has no DDNS support
→ Use Cloudflare DDNS worker or ddclient with Cloudflare API

Need ACME DNS-01 challenge for wildcard SSL?
→ Option A required — no ACME DNS API on Squarespace
→ Cloudflare supports DNS-01 via API (certbot cloudflare plugin, acme.sh, etc.)

Client's site hosted on Squarespace + custom domain at Squarespace?
→ Option A is safe — just keep www CNAME as DNS-only in Cloudflare
→ Or Option C if client makes their own DNS changes

Inheriting a Google Domains domain post-migration?
→ DNS records migrated automatically — verify in Squarespace dashboard
→ Google Cloud Domains API no longer manages DNS records
→ Choose Option A/B/C/D going forward
```

---

## Quick Copy: Common DNS Record Sets

### Squarespace Site (via Cloudflare DNS-only)
```
A     @    198.185.159.144  DNS only
A     @    198.185.159.145  DNS only
A     @    198.49.23.144    DNS only
A     @    198.49.23.145    DNS only
CNAME www  ext-cust.squarespace.com  DNS only
```

### Google Workspace Email (MX records)
```
MX  @  1   aspmx.l.google.com
MX  @  5   alt1.aspmx.l.google.com
MX  @  5   alt2.aspmx.l.google.com
MX  @  10  alt3.aspmx.l.google.com
MX  @  10  alt4.aspmx.l.google.com
TXT @  "v=spf1 include:_spf.google.com ~all"
```

### Fastmail Email (MX records)
```
MX  @  10  in1-smtp.messagingengine.com
MX  @  20  in2-smtp.messagingengine.com
TXT @  "v=spf1 include:spf.messagingengine.com ~all"
```

### Verify domain ownership (generic)
```
TXT @  "google-site-verification=..."
TXT @  "apple-domain-verification=..."
```
