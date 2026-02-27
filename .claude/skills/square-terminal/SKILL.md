---
model: claude-sonnet-4-6
name: square-terminal
description: Use when working with Square Terminal API for in-person payments, device pairing, terminal checkout flows, or POS application integration. Also use when setting up Square Terminal hardware or debugging device connectivity.
---

# Square Terminal API

Connects POS applications to Square Terminal hardware for in-person payments via Square's servers. No direct POS-to-hardware connection.

| API Version | Base URL | Node SDK | Python SDK |
|-------------|----------|----------|------------|
| 2026-01-22 | `https://connect.squareup.com/v2` | `npm install square` (v40+) | `pip install squareup` (v42+) |

## Authentication

```typescript
import { SquareClient, SquareEnvironment } from "square";
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,
});
```

```python
from square import Square
from square.environment import SquareEnvironment
client = Square(token=os.environ["SQUARE_ACCESS_TOKEN"], environment=SquareEnvironment.SANDBOX)
```

## Required Permissions

`DEVICE_CREDENTIAL_MANAGEMENT` · `PAYMENTS_WRITE` · `PAYMENTS_READ`
(`PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS` for app fees only)

## Device Pairing Flow

```
POS → CreateDeviceCode → display code to seller
Seller types code on Terminal → device.code.paired webhook → device_id
POS → CreateTerminalCheckout (uses device_id) → buyer taps/swipes
Square → terminal.checkout.updated (COMPLETED) → Payment object
```

## Pair a Device

```typescript
const response = await client.devices.codes.create({
  idempotencyKey: crypto.randomUUID(),
  deviceCode: {
    name: "Counter 1",
    productType: "TERMINAL_API",
    locationId: process.env.SQUARE_LOCATION_ID,
  },
});
const { code, id } = response.deviceCode!;
// Display code to seller — they type it on the Terminal
// Code expires in 5 minutes if unused
```

## Create a Terminal Checkout

```typescript
const response = await client.terminal.checkouts.create({
  idempotencyKey: crypto.randomUUID(),
  checkout: {
    amountMoney: { amount: BigInt(2500), currency: "USD" }, // $25.00
    referenceId: "order_123",
    deviceOptions: {
      deviceId: process.env.SQUARE_DEVICE_ID,
      skipReceiptScreen: false,
      tipSettings: { allowTipping: true },
    },
    note: "Coffee + pastry",
  },
});
const checkout = response.checkout!;
// checkout.status === "PENDING" initially
```

## Checkout States

```
PENDING → IN_PROGRESS → COMPLETED
                      → CANCELED
                      → CANCEL_REQUESTED (if cancel was called)
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using Dashboard device code instead of API device code | Only use `device_id` from `CreateDeviceCode` response |
| Trusting checkout amount as final | Always verify against the Payment object — tips change the total |
| Trying to cancel a COMPLETED checkout | Only `PENDING` and `IN_PROGRESS` can be canceled |
| Cash payments via Terminal API | Terminal API doesn't support cash — use Payments API |
| Using legacy `SquareConnect` package | Use `square` package v40+ with `SquareClient` |
| Device code not used within 5 minutes | Code expires — create a new one |

See `reference.md` for complete docs: device pairing, checkout flows, Terminal Actions, webhooks, error handling, card surcharge, and retired APIs.
