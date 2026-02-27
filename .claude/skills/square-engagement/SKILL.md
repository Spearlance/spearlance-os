---
model: claude-sonnet-4-6
name: square-engagement
description: Use when working with Square Loyalty programs, Gift Cards, or Bookings/Appointments. Also use when implementing reward points, gift card lifecycle management, or appointment scheduling with the Square API.
---

# Square Engagement APIs

## Overview
Square engagement APIs cover three domains: Loyalty (points + rewards), Gift Cards (balance lifecycle), and Bookings (appointment scheduling). API version: `2026-01-22`.

## Quick Reference

| Domain | Base Path | Required OAuth Scope |
|--------|-----------|----------------------|
| Loyalty | `/v2/loyalty` | `LOYALTY_READ` / `LOYALTY_WRITE` |
| Gift Cards | `/v2/gift-cards` | `GIFTCARDS_READ` / `GIFTCARDS_WRITE` |
| Bookings | `/v2/bookings` | `APPOINTMENTS_READ` / `APPOINTMENTS_WRITE` |

## SDK Setup

```typescript
// Node.js v40+
import { SquareClient, SquareEnvironment } from "square";
const client = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: SquareEnvironment.Sandbox });
```

```python
# Python v42+
from square import Square; from square.environment import SquareEnvironment
client = Square(token=os.environ["SQUARE_ACCESS_TOKEN"], environment=SquareEnvironment.SANDBOX)
```

## Common Operations

**Create loyalty account (enroll customer):**
```typescript
const { loyaltyAccount } = await client.loyalty.createLoyaltyAccount({
  loyaltyAccount: { programId: "loyalty_program_id", mapping: { phoneNumber: "+12065551234" } },
  idempotencyKey: crypto.randomUUID(),
});
```

**Accumulate points from an order:**
```typescript
await client.loyalty.accumulateLoyaltyPoints({
  accountId: "loyalty_account_id",
  accumulatePoints: { orderId: "order_id" },
  locationId: "location_id",
  idempotencyKey: crypto.randomUUID(),
});
```

**Create and activate a gift card:**
```typescript
const { giftCard } = await client.giftCards.createGiftCard({
  idempotencyKey: crypto.randomUUID(), locationId: "location_id", giftCard: { type: "DIGITAL" },
});
// Cards start PENDING — must ACTIVATE before use
await client.giftCardActivities.createGiftCardActivity({
  idempotencyKey: crypto.randomUUID(),
  giftCardActivity: { type: "ACTIVATE", locationId: "location_id", giftCardId: giftCard.id,
    activateActivityDetails: { amountMoney: { amount: 5000n, currency: "USD" } } },
});
```

**Create a booking:**
```typescript
const { booking } = await client.bookings.createBooking({
  idempotencyKey: crypto.randomUUID(),
  booking: { startAt: "2026-03-01T10:00:00Z", locationId: "location_id", customerId: "customer_id",
    appointmentSegments: [{ durationMinutes: 60, serviceVariationId: "svc_id",
      teamMemberId: "tm_id", serviceVariationVersion: 1234567890 }] },
});
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Attempting to create/modify loyalty programs via API | Programs are read-only via API — configure in Square Dashboard |
| Calling AccumulateLoyaltyPoints before order is complete | Points accrue on completed orders only |
| Not validating phone ownership before reward redemption | App Marketplace requires phone validation gate |
| Skipping gift card ACTIVATE step after create | Cards start in PENDING state — must ACTIVATE before use |
| Booking without checking `support_seller_level_writes` | Seller-level writes require Appointments Plus/Premium — verify first |
| Using legacy `new Client()` SDK syntax | Use `new SquareClient()` (Node v40+ / Python v42+) |

## Full Reference

See `reference.md` in this skill directory for complete API documentation including loyalty program structure, gift card activity types, booking states, availability search, webhooks, and error handling.
