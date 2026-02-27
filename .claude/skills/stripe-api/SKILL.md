---
model: claude-sonnet-4-6
name: stripe-api
description: Use when working with Stripe API for payments, subscriptions, checkout sessions, webhooks, or billing. Also use when setting up Stripe authentication, handling payment errors, or troubleshooting rate limits.
---

# Stripe API

## Overview
Stripe API (version 2026-01-28.clover) for accepting payments, managing subscriptions, and building checkout experiences. Uses PaymentIntents for payment flows and Checkout Sessions for hosted/embedded payment pages.

## Quick Reference

| Item | Value |
|------|-------|
| **Current API Version** | 2026-01-28.clover |
| **Base URL** | `https://api.stripe.com/v1` |
| **Auth** | Secret key (`sk_live_...` / `sk_test_...`) |
| **Python** | `pip install stripe` (v14.x) |
| **Node.js** | `npm install stripe` (v20.x) |
| **Versioning** | Date-based with codenames: acacia, basil, clover |

## Authentication

```python
import stripe
stripe.api_key = "sk_test_..."
```

```typescript
import Stripe from "stripe";
const stripe = new Stripe("sk_test_...");
```

## Common Operations

**Create a PaymentIntent:**
```python
intent = stripe.PaymentIntent.create(
    amount=2000,  # $20.00 in cents
    currency="usd",
    automatic_payment_methods={"enabled": True},
)
```

**Create a Checkout Session:**
```python
session = stripe.checkout.Session.create(
    mode="payment",
    line_items=[{"price": "price_xxx", "quantity": 1}],
    success_url="https://example.com/success",
    cancel_url="https://example.com/cancel",
)
```

## Rate Limits

| Mode | Default Limit |
|------|--------------|
| Live | 100 ops/sec |
| Sandbox | 25 ops/sec |
| Files API | 20 read + 20 write/sec |
| Search API | 20 read/sec |

## Transaction Fees (US)

| Type | Fee |
|------|-----|
| Online cards | 2.9% + $0.30 |
| In-person (Terminal) | 2.7% + $0.05 |
| International cards | +1.5% |
| ACH Direct Debit | 0.8% (max $5) |
| Wire transfers | $8 flat |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Amounts in dollars instead of cents | All amounts are in smallest currency unit (cents for USD) |
| Using Card Element instead of Payment Element | Card Element is legacy; use Payment Element for 100+ payment methods |
| Not verifying webhook signatures | Always verify with `stripe.webhooks.constructEvent()` |
| Missing idempotency keys on POST requests | Use V4 UUIDs; keys expire after 24 hours |
| Hardcoding API version | Pin version in SDK config or let SDK handle it |

## Full Reference

See `reference.md` in this skill directory for complete API documentation including payment flows, subscription lifecycle, Checkout Sessions, webhooks, error codes, testing, and the Clover release breaking changes.
