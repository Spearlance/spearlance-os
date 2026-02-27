# Square API Skill Pack — Design

> **Date:** 2026-02-22
> **Status:** Approved
> **Pack:** payments (expanding existing)

## Goal

Add comprehensive Square API reference skills to the `payments` pack, covering the full Square ecosystem: payments, orders, catalog, inventory, terminal, loyalty, gift cards, and bookings. Plus a `square-expert` agent for interactive implementation help.

## Approach: Grouped by Domain (5 Skills + Agent)

Square APIs cluster into 4 business domains plus shared infrastructure. Each domain gets a skill with SKILL.md (<100 lines) + reference.md (400-800 lines).

## Skill Structure

```
packs/payments/skills/
├── stripe-api/           (existing — unchanged)
├── square-api-reference/ (shared infrastructure)
│   ├── SKILL.md
│   └── reference.md
├── square-payments/      (core commerce)
│   ├── SKILL.md
│   └── reference.md
├── square-catalog/       (items + inventory)
│   ├── SKILL.md
│   └── reference.md
├── square-terminal/      (in-person)
│   ├── SKILL.md
│   └── reference.md
└── square-engagement/    (loyalty, gifts, bookings)
    ├── SKILL.md
    └── reference.md
```

## Skill Coverage Map

| Skill | APIs Covered | Key Topics |
|-------|-------------|------------|
| `square-api-reference` | OAuth 2.0, SDKs (Node/Python), webhooks, error codes, environments, rate limits | Auth setup, SDK install, webhook signature verification, sandbox vs production |
| `square-payments` | Payments, Orders, Checkout, Invoices, Subscriptions, Refunds | Payment flows, order lifecycle, checkout links, invoice automation, recurring billing |
| `square-catalog` | Catalog, Inventory | Item/variation/modifier CRUD, catalog search, batch operations, stock adjustments |
| `square-terminal` | Terminal, Devices | Device pairing, terminal checkout, hardware setup, in-person payment flows |
| `square-engagement` | Loyalty, Gift Cards, Bookings | Loyalty programs, points/rewards, gift card lifecycle, appointment booking |

## Agent

**File:** `.claude/agents/square-expert.md`

Dedicated Task tool agent for interactive Square work — debugging OAuth flows, troubleshooting webhook delivery, SDK implementation guidance. Pattern matches `pinterest-expert`, `cloudinary-expert`.

## Shepherd Routing Additions

New entries for the routing table:

```markdown
| Square payments, orders, checkout, invoices, subscriptions | `square-payments` |
| Square catalog, items, inventory, stock | `square-catalog` |
| Square Terminal, in-person payments, device pairing | `square-terminal` |
| Square loyalty, gift cards, bookings, appointments | `square-engagement` |
| Square API auth, OAuth, SDK setup, webhooks, error codes | `square-api-reference` |
```

## armadillo.json Updates

```json
"payments": {
  "description": "Stripe and Square API references — payments, subscriptions, checkout, catalog, terminal, loyalty",
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

Agent addition to `core.agents[]`:
```json
"square-expert.md"
```

## Research Requirements

Each skill authored via `writing-reference-skills` process:

1. **WebSearch** for current Square API versions, SDK versions (Feb 2026)
2. **WebFetch** on official Square developer docs for endpoint specifics
3. **Verify:** OAuth 2.0 PKCE flows, webhook signatures (HMAC-SHA256), error codes, rate limits
4. **Check:** deprecations, Connect v2 migration status, recent API changes
5. **Red/green testing:** baseline accuracy vs with-skill accuracy (4 questions minimum per skill)

## Deliverables Checklist

- [ ] `square-api-reference` — SKILL.md + reference.md
- [ ] `square-payments` — SKILL.md + reference.md
- [ ] `square-catalog` — SKILL.md + reference.md
- [ ] `square-terminal` — SKILL.md + reference.md
- [ ] `square-engagement` — SKILL.md + reference.md
- [ ] `square-expert.md` agent
- [ ] Shepherd routing table updated
- [ ] `armadillo.json` pack registry updated
- [ ] Pack description updated
- [ ] Sync script run (`npm run sync`)
