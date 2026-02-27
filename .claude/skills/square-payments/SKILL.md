---
model: claude-sonnet-4-6
name: square-payments
description: Use when working with Square Payments, Orders, Checkout, Invoices, Subscriptions, or Refunds. Also use when implementing payment flows, creating checkout links, managing recurring billing, or handling refunds with the Square API.
---

# Square Payments

## Overview
Square API (version 2026-01-22) for accepting payments, managing orders, and building checkout experiences. Uses source tokens from Square Web Payments SDK client-side; processes payments server-side via Payments API.

## Quick Reference

| Item | Value |
|------|-------|
| **Current API Version** | 2026-01-22 |
| **Base URL** | `https://connect.squareup.com/v2` |
| **Auth** | Bearer access token (`EAAAl...` for sandbox, `EAAA...` for prod) |
| **Node.js** | `npm install square` (v40+) |
| **Python** | `pip install squareup` (v42+) |
| **Sandbox** | `https://connect.squareupsandbox.com/v2` |

## Authentication

```typescript
import { SquareClient, SquareEnvironment } from "square";
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox, // or Production
});
```

```python
from square import Square
from square.environment import SquareEnvironment
client = Square(
    token=os.environ["SQUARE_ACCESS_TOKEN"],
    environment=SquareEnvironment.SANDBOX,
)
```

## Create a Payment

```typescript
import { randomUUID } from "crypto";

const payment = await client.payments.create({
  sourceId: "cnon:card-nonce-ok",            // from Web Payments SDK
  idempotencyKey: randomUUID(),
  amountMoney: { amount: BigInt(1000), currency: "USD" },  // $10.00
  locationId: process.env.SQUARE_LOCATION_ID,
});
```

```python
from uuid import uuid4
payment = client.payments.create(
    source_id="cnon:card-nonce-ok",
    idempotency_key=str(uuid4()),
    amount_money={"amount": 1000, "currency": "USD"},
    location_id=os.environ["SQUARE_LOCATION_ID"],
)
```

## Create a Checkout Link

```typescript
const link = await client.checkout.createPaymentLink({
  idempotencyKey: randomUUID(),
  quickPay: {
    name: "Consulting Session",
    priceMoney: { amount: BigInt(15000), currency: "USD" },
    locationId: process.env.SQUARE_LOCATION_ID,
  },
});
// link.paymentLink.url → share with customer
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Amounts in dollars instead of cents | All `Money` amounts are in smallest currency unit (cents for USD) |
| Not using BigInt in Node.js | All `amount` fields require `BigInt(value)` in Node.js v40+ SDK |
| Missing `idempotency_key` on mutations | Every create/update call requires a UUID v4 idempotency key |
| Using positional args or old `Client` class | Use named params with `SquareClient` (Node) / `Square` (Python) |
| Refunding a non-COMPLETED payment | Can only refund payments with `status: "COMPLETED"` |
| Charging < $1 on subscriptions | Minimum subscription charge is $1.00 |

## Full Reference

See `reference.md` in this skill directory for complete API documentation covering Payments, Orders, Checkout, Invoices, Subscriptions, and Refunds — including payment lifecycle, order states, subscription cadences, invoice workflow, and error handling.
