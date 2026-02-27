---
model: claude-sonnet-4-6
name: square-api-reference
description: Use when working with Square API for payments, orders, customers, catalog, webhooks, or OAuth. Also use when setting up Square authentication, handling payment errors, or switching from the legacy Square SDK.
---

# Square API

## Overview
Square API (version 2026-01-22) for accepting payments, managing orders, customers, and inventory. Uses the Payments API for card processing and Orders API for line-item checkout flows. Both the Node.js (v40+) and Python (v42+) SDKs were rewritten in 2025 — legacy import paths are retired.

## Quick Reference

| Item | Value |
|------|-------|
| **Current API Version** | 2026-01-22 |
| **Production Base URL** | `https://connect.squareup.com` |
| **Sandbox Base URL** | `https://connect.squareupsandbox.com` |
| **Auth** | Bearer token (`Authorization: Bearer ACCESS_TOKEN`) |
| **Node.js** | `npm install square` (v44+) |
| **Python** | `pip install squareup` (v44+) |
| **Versioning** | Date-based: `Square-Version: YYYY-MM-DD` header |

## Authentication — Quick Setup

**Node.js (v40+ new SDK):**
```typescript
import { SquareClient, SquareEnvironment } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,
});
```

**Python (v42+ new SDK):**
```python
from square import Square
from square.environment import SquareEnvironment

client = Square(
  token=os.environ["SQUARE_ACCESS_TOKEN"],
  environment=SquareEnvironment.SANDBOX,
)
```

## Critical SDK Migration Notes

| Old (legacy) | New (v40+/v42+) |
|-------------|-----------------|
| `import { Client } from "square/legacy"` | `import { SquareClient } from "square"` |
| `import { Client as LegacySquare } from "square_legacy.client"` | `from square import Square` |
| `client.customersApi.listCustomers()` | `client.customers.list()` |
| `positional args` | Named params: `{ limit: 10 }` |
| `response.body['key']` | `response.locations[0].name` (Pydantic) |
| `if response.is_error()` | `try/except ApiError` |

## Transaction Fees (US)

| Type | Fee |
|------|-----|
| Online / card not present | 2.9% + $0.30 |
| In-person / card present | 2.6% + $0.15 |
| Manually keyed | 3.5% + $0.15 |
| ACH | 1% ($1–$5 cap) |
| Afterpay | 6% + $0.30 |
| International cards | +1.5% |

**All amounts in cents. Node.js requires `BigInt` for money fields.**

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using legacy import paths | Use `SquareClient` / `Square` — legacy paths removed |
| Amounts as integers in Node.js | Money fields require `BigInt(100)` |
| Parsing JSON response manually | Pydantic models — access as attributes, not dict keys |
| Raw `gh pr create` for webhooks | Verify with `x-square-hmacsha256-signature` header |
| Not using idempotency keys | Pass `idempotencyKey` on every create/charge call |

## Full Reference

See `reference.md` in this skill directory for complete documentation including OAuth 2.0 flows, webhook verification, error handling, SDK examples, versioning, all API modules, and recent 2025-2026 changes.
