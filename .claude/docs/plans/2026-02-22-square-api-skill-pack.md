# Square API Skill Pack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive Square API reference skills to the `payments` pack covering payments, catalog, terminal, loyalty/engagement, plus a shared API infrastructure skill and a `square-expert` agent.

**Architecture:** 5 reference skills (SKILL.md + reference.md each) organized by business domain, plus 1 agent. Each skill authored using the `writing-reference-skills` process with mandatory web research. Skills are added to the existing `payments` pack alongside `stripe-api`.

**Tech Stack:** Square API v2026-01-22, Node.js SDK v44+ (`square` npm), Python SDK v44+ (`squareup` pip), OAuth 2.0 + PKCE

**Research completed:** SDK migration guides (v40+ Node, v42+ Python), OAuth flows, webhook signatures, pricing, error codes, all API categories, recent changelog (2025-2026).

---

### Task 1: Create `square-api-reference` Skill — Shared Infrastructure

**Files:**
- Create: `packs/payments/skills/square-api-reference/SKILL.md`
- Create: `packs/payments/skills/square-api-reference/reference.md`

**Step 1: Create SKILL.md**

Create `packs/payments/skills/square-api-reference/SKILL.md`:

```markdown
---
name: square-api-reference
description: Use when working with Square API authentication, SDK setup, webhook verification, error handling, or general Square API infrastructure. Also use when troubleshooting OAuth flows, debugging webhook delivery, or understanding Square API versioning.
---

# Square API Reference

## Overview
Square API (version 2026-01-22) for building commerce applications — payments, catalog, orders, subscriptions, terminal, loyalty, and more. Uses OAuth 2.0 for auth and provides SDKs for Node.js, Python, Ruby, PHP, Java, .NET, and Go.

## Quick Reference

| Item | Value |
|------|-------|
| **Current API Version** | 2026-01-22 |
| **Base URL (Production)** | `https://connect.squareup.com/v2` |
| **Base URL (Sandbox)** | `https://connect.squareupsandbox.com/v2` |
| **Auth** | OAuth 2.0 (access token, 30-day expiry) |
| **Node.js** | `npm install square` (v44+) |
| **Python** | `pip install squareup` (v44+) |
| **Webhook Signature** | HMAC-SHA-256 via `x-square-hmacsha256-signature` |

## Authentication

**Node.js (v40+ SDK):**
```typescript
import { SquareClient, SquareEnvironment } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox, // or SquareEnvironment.Production
});
```

**Python (v42+ SDK):**
```python
from square import Square
from square.environment import SquareEnvironment

client = Square(
  token=os.environ["SQUARE_ACCESS_TOKEN"],
  environment=SquareEnvironment.SANDBOX,  # or SquareEnvironment.PRODUCTION
)
```

## Common Operations

**List locations:**
```typescript
const response = await client.locations.list();
for (const location of response.locations) {
  console.log(`${location.id}: ${location.name}`);
}
```

**Webhook signature verification:**
```typescript
import { WebhooksHelper } from "square";
const isValid = WebhooksHelper.isValidWebhookEventSignature(
  body, signatureHeader, signatureKey, notificationUrl
);
```

## Rate Limits

Square does not publish fixed numeric rate limits. Monitor for `429 RATE_LIMITED` errors and implement exponential backoff with jitter. App Marketplace apps must handle rate limiting to pass review.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using legacy `Client` constructor | Use `SquareClient` (Node) or `Square` (Python) — v40+/v42+ SDKs |
| Passing positional args to API methods | Use named parameters: `client.customers.list({ limit: 10 })` |
| Not using BigInt for money (Node.js) | All monetary amounts require `BigInt`: `amount: BigInt(100)` |
| Mixing sandbox/production tokens | Tokens are environment-specific — sandbox tokens only work with sandbox URL |
| Not verifying webhook signatures | Always verify `x-square-hmacsha256-signature` header with HMAC-SHA-256 |
| Using dollars instead of cents | All amounts are in the smallest currency unit (cents for USD) |

## Full Reference

See `reference.md` in this skill directory for complete documentation including OAuth 2.0 flows (code + PKCE), SDK migration guides, webhook event types, error codes, API versioning, and environment setup.
```

**Step 2: Create reference.md**

Create `packs/payments/skills/square-api-reference/reference.md` with comprehensive coverage of:

1. **API Versioning** — date-based versions, how versioning works, version header
2. **Authentication & OAuth 2.0** — code flow, PKCE flow, token management, scopes, authorization URLs
3. **Client Libraries** — Node.js v40+ (SquareClient, BigInt, auto-pagination, named params), Python v42+ (Square, Pydantic responses, auto-pagination), migration from legacy SDKs
4. **Webhooks** — event types (payments, orders, customers, bookings, loyalty, terminal, inventory, catalog), signature verification (HMAC-SHA-256, `x-square-hmacsha256-signature`), retry behavior, best practices
5. **Error Handling** — error categories (AUTHENTICATION_ERROR, INVALID_REQUEST_ERROR, RATE_LIMITED, etc.), HTTP status codes, SDK error classes (SquareError for Node, ApiError for Python), error response format
6. **Rate Limits** — dynamic limits, 429 handling, exponential backoff with jitter
7. **Environments** — sandbox vs production, URL differences, token separation
8. **Recent Changes & Deprecations** — 2025-2026 changelog highlights: Mobile Authorization API retired, Reader SDK retired, OAuth JWT support added, SDK rewrites (Node v40, Python v42), new APIs (Bank Accounts CreateBankAccount, Transfer Orders)
9. **Transaction Fees** — US: 2.9% + $0.30 online, 2.6% + $0.15 in-person, 3.5% + $0.15 keyed, 1% ACH; no monthly API fees, no chargeback fees; international +1.5%

**Research verification:**
- Confirm all version numbers via WebSearch/WebFetch against official docs
- Verify OAuth token expiry (30 days access, indefinite refresh for code flow, 90-day single-use refresh for PKCE)
- Verify webhook header name and algorithm
- Verify current SDK package names (`square` for npm, `squareup` for pip)

**Step 3: Commit**

```bash
git add packs/payments/skills/square-api-reference/
git commit -m "feat(skills): add square-api-reference skill — auth, SDKs, webhooks, errors"
```

---

### Task 2: Create `square-payments` Skill — Core Commerce

**Files:**
- Create: `packs/payments/skills/square-payments/SKILL.md`
- Create: `packs/payments/skills/square-payments/reference.md`

**Step 1: Research current state**

WebSearch and WebFetch the official docs for:
- Payments API: `https://developer.squareup.com/docs/payments-api/overview`
- Orders API: `https://developer.squareup.com/docs/orders-api/what-it-does`
- Checkout API: `https://developer.squareup.com/docs/checkout-api/what-it-does`
- Invoices API: `https://developer.squareup.com/docs/invoices-api/overview`
- Subscriptions API: `https://developer.squareup.com/docs/subscriptions-api/overview`
- Refunds API: `https://developer.squareup.com/reference/square/refunds-api`

Verify: payment flow lifecycle, order states, checkout link creation, invoice templates, subscription cadences, refund statuses.

**Step 2: Create SKILL.md**

Create `packs/payments/skills/square-payments/SKILL.md` following the reference skill template:

```markdown
---
name: square-payments
description: Use when working with Square Payments, Orders, Checkout, Invoices, Subscriptions, or Refunds. Also use when implementing payment flows, creating checkout links, managing recurring billing, or handling refunds with the Square API.
---
```

Cover:
- Quick reference table (endpoints, key objects)
- Create a payment (Node.js + Python code)
- Create an order with line items
- Create a checkout link
- Common mistakes (amount formats, idempotency keys, order vs payment lifecycle)

**Step 3: Create reference.md**

Comprehensive coverage organized by feature area:

1. **Payments API** — CreatePayment flow, payment lifecycle (APPROVED → COMPLETED → FAILED), card-on-file payments, external payments, delayed capture, payment sources
2. **Orders API** — Order creation with line items, taxes, discounts, service charges, order lifecycle (OPEN → COMPLETED), order calculation, custom attributes
3. **Checkout API** — Payment links (create, update, delete), checkout page options, pre-populated data, order templates
4. **Invoices API** — Create/send/cancel/publish invoices, invoice templates, recurring invoices, scheduled invoices, payment requests, reminders
5. **Subscriptions API** — Plans and variations, cadences (weekly/monthly/yearly), billing anchors, phases (free trials), subscription lifecycle (ACTIVE → DELINQUENT → CANCELED → COMPLETED), invoicing behavior
6. **Refunds API** — Create refund, partial refunds, refund lifecycle, refund by payment ID vs refund by order ID
7. **Idempotency** — All mutating endpoints require `idempotency_key` (UUID v4)

**Step 4: Commit**

```bash
git add packs/payments/skills/square-payments/
git commit -m "feat(skills): add square-payments skill — payments, orders, checkout, invoices, subscriptions"
```

---

### Task 3: Create `square-catalog` Skill — Items & Inventory

**Files:**
- Create: `packs/payments/skills/square-catalog/SKILL.md`
- Create: `packs/payments/skills/square-catalog/reference.md`

**Step 1: Research current state**

WebSearch and WebFetch the official docs for:
- Catalog API: `https://developer.squareup.com/docs/catalog-api/what-it-does`
- Inventory API: `https://developer.squareup.com/docs/inventory-api/what-it-does`

Verify: catalog object types (ITEM, ITEM_VARIATION, CATEGORY, MODIFIER, MODIFIER_LIST, DISCOUNT, TAX, IMAGE), batch operations, search/filter capabilities, inventory adjustment types.

**Step 2: Create SKILL.md**

Create `packs/payments/skills/square-catalog/SKILL.md`:

```markdown
---
name: square-catalog
description: Use when working with Square Catalog API for item management, categories, modifiers, images, or pricing. Also use when working with Square Inventory API for stock tracking, batch adjustments, or inventory counts.
---
```

Cover:
- Quick reference (catalog object types, batch endpoints)
- Create a catalog item with variations (code example)
- Batch upsert catalog objects
- Adjust inventory count
- Common mistakes (catalog object hierarchy, batch atomicity, image handling)

**Step 3: Create reference.md**

Comprehensive coverage:

1. **Catalog Object Hierarchy** — Items → Variations → Modifiers, Categories, Taxes, Discounts, Images
2. **CRUD Operations** — UpsertCatalogObject, BatchUpsertCatalogObjects, RetrieveCatalogObject, DeleteCatalogObject
3. **Search & Filter** — SearchCatalogObjects, SearchCatalogItems, query types (exact, prefix, range)
4. **Batch Operations** — BatchUpsertCatalogObjects (atomic), BatchDeleteCatalogObjects, BatchRetrieveCatalogObjects
5. **Images** — CreateCatalogImage, multipart upload, linking images to items
6. **Inventory API** — Adjustment types (PHYSICAL_COUNT, ADJUSTMENT, TRANSFER), BatchChangeInventory, BatchRetrieveInventoryCounts, inventory states (IN_STOCK, SOLD, WASTE, etc.)
7. **Kitchen Display (new)** — `kitchen_name` and `buyer_facing` properties (added 2026-01-22)
8. **Cross-references** — How catalog items link to orders, payments, and subscriptions

**Step 4: Commit**

```bash
git add packs/payments/skills/square-catalog/
git commit -m "feat(skills): add square-catalog skill — catalog items, inventory tracking"
```

---

### Task 4: Create `square-terminal` Skill — In-Person

**Files:**
- Create: `packs/payments/skills/square-terminal/SKILL.md`
- Create: `packs/payments/skills/square-terminal/reference.md`

**Step 1: Research current state**

WebSearch and WebFetch the official docs for:
- Terminal API: `https://developer.squareup.com/docs/terminal-api/overview`
- Devices API: `https://developer.squareup.com/docs/terminal-api/integrate-square-terminal`

Verify: device pairing flow, terminal checkout flow, supported devices, card surcharge support (new in 2026-01-22), webhook events for terminal.

**Step 2: Create SKILL.md**

Create `packs/payments/skills/square-terminal/SKILL.md`:

```markdown
---
name: square-terminal
description: Use when working with Square Terminal API for in-person payments, device pairing, terminal checkout flows, or POS application integration. Also use when setting up Square Terminal hardware or debugging device connectivity.
---
```

Cover:
- Quick reference (Terminal endpoints, device pairing flow diagram)
- Pair a device (code example)
- Create a terminal checkout (code example)
- Common mistakes (device code expiry, polling vs webhooks, required permissions)

**Step 3: Create reference.md**

Comprehensive coverage:

1. **Device Pairing** — Devices API, CreateDeviceCode, device code lifecycle, webhook notification (device.code.paired), device ID usage
2. **Terminal Checkout** — CreateTerminalCheckout flow, checkout states, payment type options, tip settings
3. **Terminal Actions** — Action types, action lifecycle, managing pending actions
4. **Hardware** — Supported devices (Square Terminal, Square Reader), connectivity requirements
5. **POS Integration** — How POS apps communicate with Terminal via Square servers (not direct connection)
6. **Card Surcharge** — New in 2026-01-22, US-only, surcharge reporting on terminal payments
7. **Webhooks** — `device.code.paired`, `terminal.checkout.created`, `terminal.checkout.updated`
8. **Required Permissions** — PAYMENTS_WRITE, PAYMENTS_READ, DEVICE_CREDENTIAL_MANAGEMENT

**Step 4: Commit**

```bash
git add packs/payments/skills/square-terminal/
git commit -m "feat(skills): add square-terminal skill — in-person payments, device pairing"
```

---

### Task 5: Create `square-engagement` Skill — Loyalty, Gift Cards, Bookings

**Files:**
- Create: `packs/payments/skills/square-engagement/SKILL.md`
- Create: `packs/payments/skills/square-engagement/reference.md`

**Step 1: Research current state**

WebSearch and WebFetch the official docs for:
- Loyalty API: `https://developer.squareup.com/docs/loyalty-api/overview`
- Gift Cards API: `https://developer.squareup.com/docs/gift-cards/using-gift-cards-api`
- Bookings API: `https://developer.squareup.com/docs/bookings-api/what-it-does`

Verify: loyalty program structure, accrual rules, redemption flow, gift card lifecycle, booking states, staff availability.

**Step 2: Create SKILL.md**

Create `packs/payments/skills/square-engagement/SKILL.md`:

```markdown
---
name: square-engagement
description: Use when working with Square Loyalty programs, Gift Cards, or Bookings/Appointments. Also use when implementing reward points, gift card lifecycle management, or appointment scheduling with the Square API.
---
```

Cover:
- Quick reference (Loyalty/GiftCards/Bookings endpoints)
- Create a loyalty account (code example)
- Accumulate loyalty points (code example)
- Create a gift card (code example)
- Create a booking (code example)
- Common mistakes (loyalty program requirements, gift card states, booking availability)

**Step 3: Create reference.md**

Comprehensive coverage:

1. **Loyalty API** — Program structure (accrual rules, reward tiers, terminology), loyalty accounts, accumulate/adjust/redeem points, loyalty events, promotions, App Marketplace requirements
2. **Gift Cards API** — Create/activate/deactivate gift cards, load/unload balance, gift card activities (ACTIVATE, LOAD, REDEEM, CLEAR_BALANCE, etc.), linking to orders
3. **Gift Card Activities API** — Activity types, creating activities, retrieving activity history
4. **Bookings API** — Service availability, create/update/cancel bookings, booking states, team member availability, business booking profile, customer booking profile
5. **Booking Custom Attributes** — Custom metadata on bookings
6. **Cross-references** — How loyalty connects to customers/orders, gift cards in checkout flows, bookings with customer profiles

**Step 4: Commit**

```bash
git add packs/payments/skills/square-engagement/
git commit -m "feat(skills): add square-engagement skill — loyalty, gift cards, bookings"
```

---

### Task 6: Create `square-expert` Agent

**Files:**
- Create: `.claude/agents/square-expert.md`

**Step 1: Create agent file**

Create `.claude/agents/square-expert.md` following the `pinterest-expert` pattern:

```markdown
---
name: square-expert
description: |
  Use this agent when implementing or debugging Square API integrations —
  payments, orders, catalog, terminal, loyalty, gift cards, bookings,
  OAuth setup, or webhook verification. Also use when troubleshooting
  Square SDK errors or debugging API responses.
model: claude-sonnet-4-6
memory: project
maxTurns: 20
skills:
  - square-api-reference
  - square-payments
---

You are a Square API Specialist. You implement and debug Square commerce integrations including payments, orders, catalog, terminal, and engagement features.

## Core Expertise

### Square API Fundamentals
- API Version: 2026-01-22
- Base URL: `https://connect.squareup.com/v2` (production)
- Sandbox: `https://connect.squareupsandbox.com/v2`
- Auth: OAuth 2.0 (Bearer token, 30-day expiry)
- Money: smallest currency unit (cents for USD), BigInt required in Node.js SDK

### SDK Quick Setup

**Node.js (v40+):**
```typescript
import { SquareClient, SquareEnvironment } from "square";
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production,
});
```

**Python (v42+):**
```python
from square import Square
from square.environment import SquareEnvironment
client = Square(
  token=os.environ["SQUARE_ACCESS_TOKEN"],
  environment=SquareEnvironment.PRODUCTION,
)
```

### Webhook Verification
- Header: `x-square-hmacsha256-signature`
- Algorithm: HMAC-SHA-256
- Inputs: signature key + notification URL + raw request body
- Use `WebhooksHelper.isValidWebhookEventSignature()` from SDK

### OAuth Token Lifecycle
- Access tokens: 30-day expiry
- Refresh tokens (code flow): no expiry until revoked
- Refresh tokens (PKCE): single-use, 90-day expiry
- Authorization codes: 5-minute expiry, single-use

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Client is not a constructor` | Using legacy SDK import | Import `SquareClient` from `"square"` (not `Client`) |
| Money amounts wrong | Not using smallest unit | Use cents: $10.00 = `1000` (Node: `BigInt(1000)`) |
| 401 Unauthorized | Expired access token | Refresh using OAuth token endpoint |
| Sandbox call to production | Mixed environment tokens | Tokens are environment-specific |
| Webhook signature fails | Parsed JSON body | Must use raw request body for verification |
| `INSUFFICIENT_SCOPES` | Missing OAuth permissions | Add required scopes to OAuth authorize URL |

## Rules
- Always use named parameters (not positional) in v40+/v42+ SDKs
- Always use BigInt for monetary amounts in Node.js SDK
- Always verify webhook signatures before processing
- Always use idempotency keys on mutating API calls
- Store access tokens securely — never expose in client-side code
- Handle 429 rate limits with exponential backoff + jitter
```

**Step 2: Commit**

```bash
git add .claude/agents/square-expert.md
git commit -m "feat(agents): add square-expert agent for Square API implementation help"
```

---

### Task 7: Update Shepherd Routing Table

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`

**Step 1: Add Square entries to the routing table**

Add the following rows to the `### APIs & Services` section of the shepherd SKILL.md routing table:

```markdown
| Square payments, orders, checkout, invoices, subscriptions | `square-payments` |
| Square catalog, items, inventory, stock | `square-catalog` |
| Square Terminal, in-person payments, device pairing | `square-terminal` |
| Square loyalty, gift cards, bookings, appointments | `square-engagement` |
| Square API auth, OAuth, SDK setup, webhooks, errors | `square-api-reference` |
```

**Step 2: Commit**

```bash
git add .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat(shepherd): add Square API skill routing entries"
```

---

### Task 8: Update `armadillo.json` Manifest

**Files:**
- Modify: `armadillo.json`

**Step 1: Update the payments pack entry**

Change the `payments` pack in `armadillo.json`:

**Before:**
```json
"payments": {
  "description": "Stripe API reference — endpoints, webhooks, Checkout, subscriptions",
  "skills": [
    "stripe-api"
  ]
}
```

**After:**
```json
"payments": {
  "description": "Stripe and Square API references — payments, checkout, subscriptions, catalog, terminal, loyalty",
  "skills": [
    "stripe-api",
    "square-api-reference",
    "square-payments",
    "square-catalog",
    "square-terminal",
    "square-engagement"
  ]
}
```

**Step 2: Add `square-expert.md` to `core.agents[]`**

Add `"square-expert.md"` to the agents array in `armadillo.json`.

**Step 3: Run sync to regenerate CLAUDE.md and validate**

```bash
node scripts/sync-all.js
```

Verify: no errors, CLAUDE.md updated with new skills listed under payments pack.

**Step 4: Commit**

```bash
git add armadillo.json .claude/CLAUDE.md
git commit -m "feat(manifest): register Square skills in payments pack and square-expert agent"
```

---

## Task Dependency Graph

```
Task 1 (square-api-reference) ──┐
Task 2 (square-payments)  ──────┤
Task 3 (square-catalog)   ──────┼──→ Task 7 (shepherd routing) ──→ Task 8 (manifest + sync)
Task 4 (square-terminal)  ──────┤
Task 5 (square-engagement) ─────┘
Task 6 (square-expert agent) ───────→ Task 8 (manifest + sync)
```

Tasks 1-6 are independent and can be parallelized. Tasks 7-8 depend on all skills being written first.

## Execution Notes

- Each reference skill task uses the `writing-reference-skills` process: WebSearch → WebFetch official docs → write SKILL.md → write reference.md → verify facts
- SKILL.md should be <100 lines, <500 words
- reference.md should be 400-800 lines with code examples in Node.js + Python
- All monetary amounts in examples use cents (smallest currency unit)
- Node.js examples use `BigInt` for money amounts
- Python examples use the new `Square()` constructor (v42+), not legacy `Client()`
- Node.js examples use `SquareClient` (v40+), not legacy `Client`
