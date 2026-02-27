# Square API Developer Reference

> **Last Updated:** February 2026
> **Current API Version:** 2026-01-22
> **Base URL:** `https://connect.squareup.com/v2`
> **Sandbox Base URL:** `https://connect.squareupsandbox.com/v2`
> **Developer Portal:** `https://developer.squareup.com`

---

## Table of Contents

1. [Authentication and Setup](#authentication-and-setup)
2. [Client Libraries](#client-libraries)
3. [Idempotency](#idempotency)
4. [Payments API](#payments-api)
5. [Orders API](#orders-api)
6. [Checkout API](#checkout-api)
7. [Invoices API](#invoices-api)
8. [Subscriptions API](#subscriptions-api)
9. [Refunds API](#refunds-api)
10. [Error Handling](#error-handling)
11. [Testing](#testing)
12. [Useful Links](#useful-links)

---

## Authentication and Setup

### Access Token Types

| Token Type | Prefix | Use Case |
|------------|--------|----------|
| Sandbox access token | `EAAAl...` | Test transactions, no real money |
| Production access token | `EAAA...` | Live transactions |
| OAuth token | `EAAA...` | Acting on behalf of another seller |

HTTP headers for direct API calls:

```
Authorization: Bearer EAAA...
Square-Version: 2026-01-22
Content-Type: application/json
```

### Required Scopes by API

| API | Required Scopes |
|-----|----------------|
| Payments | `PAYMENTS_READ`, `PAYMENTS_WRITE` |
| Orders | `ORDERS_READ`, `ORDERS_WRITE` |
| Invoices | `INVOICES_READ/WRITE`, `ORDERS_READ/WRITE` |
| Subscriptions | `SUBSCRIPTIONS_READ/WRITE` + Orders + Payments + Invoices + `ITEMS_READ` + Customers |
| Refunds | `PAYMENTS_READ`, `PAYMENTS_WRITE` |

Every transaction requires a `location_id`. Get it via `client.locations.list()`.

---

## Client Libraries

### Node.js (v40+)

```bash
npm install square   # Requires Node.js 14+; v40+ — new SquareClient syntax
```

```typescript
import { SquareClient, SquareEnvironment, SquareError } from "square";
import { randomUUID } from "crypto";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,   // .Production for live
});
```

### Python (v42+)

```bash
pip install squareup  # Requires Python 3.8+; v42+ — full rewrite, new Square class
```

```python
import os
from uuid import uuid4
from square import Square
from square.environment import SquareEnvironment
from square.core.api_error import ApiError

client = Square(
    token=os.environ["SQUARE_ACCESS_TOKEN"],
    environment=SquareEnvironment.SANDBOX,   # .PRODUCTION for live
)
```

---

## Idempotency

Every mutating endpoint requires an `idempotency_key` (UUID v4). Square returns the cached response for duplicate keys — generate a new key if you change parameters.

```typescript
await client.payments.create({ idempotencyKey: randomUUID(), /* ... */ });
```

---

## Payments API

### Payment Lifecycle

```
APPROVED → COMPLETED
         → CANCELED  (autocomplete=false, then manually canceled)
         → FAILED    (bank declined)
```

| Status | Meaning |
|--------|---------|
| `APPROVED` | Authorized; funds held, awaiting capture |
| `COMPLETED` | Captured; funds credited to seller |
| `CANCELED` | Authorization voided; funds released |
| `FAILED` | Declined by the bank |

### Payment Flow

1. **Client:** Web Payments SDK tokenizes card → returns `source_id` nonce (`cnon:...`)
2. **Server:** Call `CreatePayment` with `source_id` and `amount_money`
3. **Server:** Payment returns `status: APPROVED` → auto-captures to `COMPLETED`
4. **Server:** Verify final status via webhooks

### Create a Payment

**Node.js:**
```typescript
const { payment } = await client.payments.create({
  sourceId: "cnon:card-nonce-ok",          // nonce from Web Payments SDK
  idempotencyKey: randomUUID(),
  amountMoney: { amount: BigInt(2000), currency: "USD" },  // $20.00
  locationId: process.env.SQUARE_LOCATION_ID,
  customerId: "CUSTOMER_ID",               // optional: links to customer
  referenceId: "order-ref-123",
  note: "Payment for order #123",
});
```

**Python:**
```python
result = client.payments.create(
    source_id="cnon:card-nonce-ok",
    idempotency_key=str(uuid4()),
    amount_money={"amount": 2000, "currency": "USD"},
    location_id=os.environ["SQUARE_LOCATION_ID"],
    customer_id="CUSTOMER_ID",
)
payment = result.payment
```

### Delayed Capture (Authorize Now, Capture Later)

```typescript
// Authorize only — set autocomplete: false
const { payment } = await client.payments.create({
  sourceId: "cnon:card-nonce-ok",
  idempotencyKey: randomUUID(),
  amountMoney: { amount: BigInt(5000), currency: "USD" },
  autocomplete: false,
  locationId: process.env.SQUARE_LOCATION_ID,
});

// Capture after fulfillment (within 7 days for cards)
await client.payments.complete(payment.id, {
  versionToken: payment.versionToken,
});
```

### Card-on-File Payments

```typescript
const { payment } = await client.payments.create({
  sourceId: cardId,                        // stored card ID (ccof:...)
  idempotencyKey: randomUUID(),
  amountMoney: { amount: BigInt(1500), currency: "USD" },
  customerId: "CUSTOMER_ID",              // required for card-on-file
  locationId: process.env.SQUARE_LOCATION_ID,
});
```

### External Payments

Record transactions completed outside Square (cash, check, wire):

```typescript
const { payment } = await client.payments.create({
  sourceId: "EXTERNAL",
  idempotencyKey: randomUUID(),
  amountMoney: { amount: BigInt(3000), currency: "USD" },
  externalDetails: { type: "CHECK", source: "Bank of America" },
  locationId: process.env.SQUARE_LOCATION_ID,
});
```

### Payment Source Types

| `source_id` Value | Source | Notes |
|-------------------|--------|-------|
| `cnon:...` nonce | Card (Web SDK) | Tokenized client-side |
| `CASH` | Cash | No authorization; amount_money is advisory |
| `EXTERNAL` | External | Requires `external_details` |
| `ccof:...` card ID | Card on file | Requires `customer_id` |

---

## Orders API

### Order Lifecycle

```
DRAFT → OPEN → COMPLETED
             → CANCELED
```

| State | Meaning |
|-------|---------|
| `DRAFT` | Cannot be paid or fulfilled; deleted after 30 days |
| `OPEN` | Active; receives payments and fulfillment |
| `COMPLETED` | Fully paid and fulfilled |
| `CANCELED` | Voided |

### Create an Order with Line Items, Taxes, Discounts, and Service Charges

**Node.js:**
```typescript
const { order } = await client.orders.create({
  idempotencyKey: randomUUID(),
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [
      {
        name: "Espresso",
        quantity: "2",
        basePriceMoney: { amount: BigInt(400), currency: "USD" },
      },
      {
        name: "Croissant",
        quantity: "1",
        basePriceMoney: { amount: BigInt(350), currency: "USD" },
      },
    ],
    taxes: [{ name: "Sales Tax", percentage: "8.5", scope: "ORDER" }],
    discounts: [{ name: "Happy Hour", percentage: "10", scope: "ORDER" }],
    serviceCharges: [
      {
        name: "Delivery Fee",
        amountMoney: { amount: BigInt(200), currency: "USD" },
        calculationPhase: "TOTAL_PHASE",
      },
    ],
  },
});
// order.totalMoney → auto-calculated with taxes/discounts applied
```

**Python:**
```python
result = client.orders.create(
    idempotency_key=str(uuid4()),
    order={
        "location_id": os.environ["SQUARE_LOCATION_ID"],
        "line_items": [
            {"name": "Espresso", "quantity": "2",
             "base_price_money": {"amount": 400, "currency": "USD"}},
        ],
        "taxes": [{"name": "Sales Tax", "percentage": "8.5", "scope": "ORDER"}],
        "discounts": [{"name": "Happy Hour", "percentage": "10", "scope": "ORDER"}],
    },
)
```

### Preview Order Totals Without Creating

```typescript
const { order } = await client.orders.calculate({
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [{ name: "Widget", quantity: "3",
      basePriceMoney: { amount: BigInt(1000), currency: "USD" } }],
    taxes: [{ name: "Tax", percentage: "7", scope: "ORDER" }],
  },
});
// order.totalMoney reflects calculated total — not persisted
```

### Pay an Order

```typescript
await client.orders.pay(order.id, {
  idempotencyKey: randomUUID(),
  paymentIds: [payment.id],   // payment must reference this order_id
});
```

### Auto-Pagination for Order Search

```typescript
const pager = await client.orders.search({
  locationIds: [process.env.SQUARE_LOCATION_ID],
  query: {
    filter: { stateFilter: { states: ["OPEN"] } },
    sort: { sortField: "CREATED_AT", sortOrder: "DESC" },
  },
});
for await (const order of pager) {
  console.log(order.id, order.totalMoney);
}
```

---

## Checkout API

### Payment Links vs. Web Payments SDK

- **Payment Links** — shareable URLs, no buyer-side code. Use for email/text/quick-pay.
- **Web Payments SDK** — embedded card form in your UI. Full layout control.

### Create a Payment Link (Quick Pay)

**Node.js:**
```typescript
const { paymentLink } = await client.checkout.createPaymentLink({
  idempotencyKey: randomUUID(),
  quickPay: {
    name: "Consulting Session – 1 hour",
    priceMoney: { amount: BigInt(15000), currency: "USD" },
    locationId: process.env.SQUARE_LOCATION_ID,
  },
});
console.log(paymentLink.url);    // https://square.link/u/xxxx (SMS-friendly)
console.log(paymentLink.longUrl);
```

**Python:**
```python
result = client.checkout.create_payment_link(
    idempotency_key=str(uuid4()),
    quick_pay={
        "name": "Consulting Session – 1 hour",
        "price_money": {"amount": 15000, "currency": "USD"},
        "location_id": os.environ["SQUARE_LOCATION_ID"],
    },
)
print(result.payment_link.url)
```

### Create a Payment Link from an Order

```typescript
const { paymentLink } = await client.checkout.createPaymentLink({
  idempotencyKey: randomUUID(),
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [
      { name: "Premium Plan", quantity: "1",
        basePriceMoney: { amount: BigInt(9900), currency: "USD" } },
    ],
  },
  checkoutOptions: {
    allowTipping: false,
    redirectUrl: "https://example.com/thank-you",
    askForShippingAddress: false,
    merchantSupportEmail: "support@example.com",
    enableCoupon: true,
  },
  prePopulatedData: {
    buyerEmail: "customer@example.com",
  },
});
```

### Manage Payment Links

```typescript
// Update
await client.checkout.updatePaymentLink(paymentLink.id, {
  paymentLink: { version: 1, checkoutOptions: { redirectUrl: "https://new-url.com" } },
});

// Delete
await client.checkout.deletePaymentLink(paymentLink.id);

// List
const pager = await client.checkout.listPaymentLinks({});
for await (const link of pager) { console.log(link.id, link.url); }
```

### Checkout Options Reference

| Field | Description |
|-------|-------------|
| `allow_tipping` | Enable tip selection |
| `redirect_url` | Redirect buyer after payment |
| `ask_for_shipping_address` | Collect shipping address |
| `merchant_support_email` | Shown to buyer for support |
| `enable_coupon` | Show coupon field |
| `enable_loyalty` | Show loyalty points UI |

---

## Invoices API

### Invoice Workflow

```
CreateOrder → CreateInvoice → PublishInvoice → [customer pays] → PAID
                                             → [cancel]        → CANCELED
```

### Invoice Statuses

| Status | Meaning |
|--------|---------|
| `DRAFT` | Created, not sent; editable |
| `UNPAID` | Published and sent to customer |
| `SCHEDULED` | Future scheduled send date |
| `PARTIALLY_PAID` | One or more installments paid |
| `PAID` | Fully paid |
| `REFUNDED` | Fully refunded |
| `CANCELED` | Voided |
| `FAILED` | Could not be delivered |

### Create and Send an Invoice

**Node.js:**
```typescript
// Step 1: Create an order
const { order } = await client.orders.create({
  idempotencyKey: randomUUID(),
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [
      { name: "Web Design Services", quantity: "1",
        basePriceMoney: { amount: BigInt(200000), currency: "USD" } },
    ],
  },
});

// Step 2: Create the invoice
const { invoice } = await client.invoices.create({
  idempotencyKey: randomUUID(),
  invoice: {
    locationId: process.env.SQUARE_LOCATION_ID,
    orderId: order.id,
    customerId: "CUSTOMER_ID",
    primaryRecipient: { customerId: "CUSTOMER_ID" },
    paymentRequests: [
      {
        requestType: "BALANCE",
        dueDate: "2026-03-15",
        automaticPaymentSource: "NONE",   // NONE or CARD_ON_FILE
        reminders: [
          { relativeScheduledDays: -3, message: "Invoice due in 3 days" },
          { relativeScheduledDays: 0, message: "Invoice due today" },
        ],
      },
    ],
    deliveryMethod: "EMAIL",              // EMAIL, SMS, or SHARE_MANUALLY
    invoiceNumber: "INV-0042",
    title: "Web Design Services",
  },
});

// Step 3: Publish (sends to customer)
const { invoice: published } = await client.invoices.publish(invoice.id, {
  version: invoice.version,
  idempotencyKey: randomUUID(),
});
console.log(published.publicUrl);        // share directly or embed
```

**Python:**
```python
# Create order, then invoice, then publish
order = client.orders.create(
    idempotency_key=str(uuid4()),
    order={
        "location_id": os.environ["SQUARE_LOCATION_ID"],
        "line_items": [{"name": "Services", "quantity": "1",
                        "base_price_money": {"amount": 200000, "currency": "USD"}}],
    },
).order

invoice = client.invoices.create(
    idempotency_key=str(uuid4()),
    invoice={
        "location_id": os.environ["SQUARE_LOCATION_ID"],
        "order_id": order.id,
        "customer_id": "CUSTOMER_ID",
        "primary_recipient": {"customer_id": "CUSTOMER_ID"},
        "payment_requests": [{"request_type": "BALANCE", "due_date": "2026-03-15",
                               "automatic_payment_source": "NONE"}],
        "delivery_method": "EMAIL",
        "title": "Web Design Services",
    },
).invoice

published = client.invoices.publish(
    invoice_id=invoice.id, version=invoice.version, idempotency_key=str(uuid4()),
).invoice
```

### Cancel an Invoice

```typescript
await client.invoices.cancel(invoice.id, { version: invoice.version });
```

### Payment Request Types

| Type | Use Case |
|------|----------|
| `BALANCE` | Full remaining balance due on a date |
| `DEPOSIT` | Partial upfront payment (percentage or fixed) |
| `INSTALLMENT` | Split into multiple payments (requires Invoices Plus) |

### Delivery Methods

| Method | Behavior |
|--------|----------|
| `EMAIL` | Square sends invoice email + reminders automatically |
| `SMS` | Square sends invoice via SMS |
| `SHARE_MANUALLY` | Square sends nothing — distribute `public_url` yourself |

**Note:** Recurring invoices are not supported. Use the Subscriptions API for recurring billing.

---

## Subscriptions API

### Core Model

- **Subscription Plan** — the catalog item being sold
- **Subscription Plan Variation** — how it's sold (cadence + price)
- **Subscription** — the customer's active agreement

### Supported Cadences

| Cadence | Billing Basis |
|---------|--------------|
| `WEEKLY` | Start date |
| `EVERY_TWO_WEEKS` | Start date |
| `THIRTY_DAYS` | Start date |
| `SIXTY_DAYS` | Start date |
| `NINETY_DAYS` | Start date |
| `MONTHLY` | Supports `monthly_billing_anchor_date` |
| `EVERY_TWO_MONTHS` | Anchor date |
| `QUARTERLY` | Anchor date |
| `EVERY_FOUR_MONTHS` | Anchor date |
| `EVERY_SIX_MONTHS` | Anchor date |
| `ANNUAL` | Anchor date |
| `EVERY_TWO_YEARS` | Anchor date |

### Subscription Lifecycle

```
PENDING → ACTIVE → CANCELED
                 → COMPLETED    (v2025-09-24+, fixed-length only)
                 → DEACTIVATED  (location/customer issue blocks billing)
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Future `start_date`; not yet billing |
| `ACTIVE` | Actively billing each period |
| `PAUSED` | Temporarily halted; no invoices generated |
| `CANCELED` | No further billing after `canceled_date` |
| `COMPLETED` | Fixed-length subscription finished all cycles (v2025-09-24+) |
| `DEACTIVATED` | Non-billable; customer/location data missing |

### Billing Behavior

- Customers with a `card_id` are charged automatically each period
- Customers without `card_id` receive an emailed invoice with a payment link
- Failed charges: Square emails the customer an invoice — no automatic retry
- Minimum charge: **$1.00**
- ACH payments are not supported
- Items must be shippable — in-person pickup is not supported

### Create a Subscription

**Node.js:**
```typescript
const { subscription } = await client.subscriptions.create({
  idempotencyKey: randomUUID(),
  locationId: process.env.SQUARE_LOCATION_ID,
  customerId: "CUSTOMER_ID",
  planVariationId: "PLAN_VARIATION_ID",  // from Catalog API
  cardId: "CARD_ID",                     // optional; enables auto-charge
  startDate: "2026-03-01",               // YYYY-MM-DD; omit for immediate
  timezone: "America/Los_Angeles",
  monthlyBillingAnchorDate: 1,           // bill on the 1st (monthly cadences)
});
```

**Python:**
```python
result = client.subscriptions.create(
    idempotency_key=str(uuid4()),
    location_id=os.environ["SQUARE_LOCATION_ID"],
    customer_id="CUSTOMER_ID",
    plan_variation_id="PLAN_VARIATION_ID",
    card_id="CARD_ID",
    start_date="2026-03-01",
)
subscription = result.subscription
```

### Free Trials

Free trials use a plan variation with an initial phase at zero price (or 100% discount). Customers are not billed until the trial phase ends.

### Cancel a Subscription

```typescript
// Cancel at end of current billing period
await client.subscriptions.cancel(subscription.id);
```

### Pause and Resume

```typescript
await client.subscriptions.pauseSubscription(subscription.id, {
  pauseCycleDuration: 2,                  // pause for 2 billing cycles
});
await client.subscriptions.resumeSubscription(subscription.id, {
  resumeEffectiveDate: "2026-05-01",
});
```

---

## Refunds API

### Refund Rules

- Only payments with `status: COMPLETED` can be refunded
- Refund amount cannot exceed the original payment amount
- Partial refunds are supported — specify `amount_money` less than original
- Square uses available account balance; withdraws from bank if insufficient

### Refund Lifecycle

```
PENDING → COMPLETED
        → REJECTED
        → FAILED  (further refunds to this payment are blocked)
```

### Create a Refund

**Node.js:**
```typescript
const { refund } = await client.refunds.refundPayment({
  idempotencyKey: randomUUID(),
  paymentId: "PAYMENT_ID",
  amountMoney: { amount: BigInt(500), currency: "USD" },  // partial refund
  reason: "Customer request",
});
```

**Python:**
```python
result = client.refunds.refund_payment(
    idempotency_key=str(uuid4()),
    payment_id="PAYMENT_ID",
    amount_money={"amount": 500, "currency": "USD"},
    reason="Customer request",
)
```

### Full Refund

```typescript
const { payment } = await client.payments.get("PAYMENT_ID");
const { refund } = await client.refunds.refundPayment({
  idempotencyKey: randomUUID(),
  paymentId: payment.id,
  amountMoney: payment.amountMoney,   // full original amount
});
```

---

## Error Handling

### Error Structure

```json
{
  "errors": [
    { "category": "PAYMENT_METHOD_ERROR", "code": "CARD_DECLINED",
      "detail": "Card was declined", "field": "source_id" }
  ]
}
```

### Error Categories and Common Codes

| Code | Category | Fix |
|------|----------|-----|
| `CARD_DECLINED` | PAYMENT_METHOD_ERROR | Ask customer for different card |
| `CARD_EXPIRED` | PAYMENT_METHOD_ERROR | Ask customer to update card |
| `CVV_FAILURE` | PAYMENT_METHOD_ERROR | Ask customer to re-enter CVV |
| `INSUFFICIENT_FUNDS` | PAYMENT_METHOD_ERROR | Ask for different payment method |
| `BAD_REQUEST` | INVALID_REQUEST_ERROR | Check required fields |
| `NOT_FOUND` | INVALID_REQUEST_ERROR | Verify IDs are correct |
| `UNAUTHORIZED` | AUTHENTICATION_ERROR | Check access token and scopes |
| `RATE_LIMITED` | RATE_LIMIT_ERROR | Back off and retry |
| `SERVICE_UNAVAILABLE` | API_ERROR | Retry with exponential backoff |

### Error Handling Pattern

**Node.js:**
```typescript
import { SquareError } from "square";

try {
  const { payment } = await client.payments.create({ /* ... */ });
} catch (err) {
  if (err instanceof SquareError) {
    err.errors?.forEach((e) => {
      console.error(`${e.category}: ${e.code} — ${e.detail}`);
    });
  } else throw err;
}
```

**Python:**
```python
from square.core.api_error import ApiError

try:
    result = client.payments.create(/* ... */)
except ApiError as e:
    for err in e.body.get("errors", []):
        print(f"{err['category']}: {err['code']} — {err.get('detail')}")
```

---

## Testing

### Sandbox Environment

```typescript
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,   // sandbox token from Developer Dashboard
  environment: SquareEnvironment.Sandbox,
});
```

### Sandbox Nonces (No Web SDK Needed)

| Nonce | Behavior |
|-------|----------|
| `cnon:card-nonce-ok` | Successful card payment |
| `cnon:card-nonce-declined` | Declined payment |
| `cnon:card-nonce-avs-rejected` | AVS rejected |

### Test Card Numbers

| Number | Result |
|--------|--------|
| `4111 1111 1111 1111` | Successful (Visa) |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 0069` | Card expired |

Any future expiration date, any 3-digit CVV, any billing ZIP.

---

## Useful Links

- [API Reference](https://developer.squareup.com/reference/square)
- [Developer Dashboard](https://developer.squareup.com/apps)
- [Node.js SDK (GitHub)](https://github.com/square/square-nodejs-sdk)
- [Python SDK (GitHub)](https://github.com/square/square-python-sdk)
- [Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Changelog](https://developer.squareup.com/docs/changelog)
- [Payments API](https://developer.squareup.com/docs/payments-api/overview)
- [Orders API](https://developer.squareup.com/docs/orders-api/what-it-does)
- [Checkout API](https://developer.squareup.com/docs/checkout-api/what-it-does)
- [Invoices API](https://developer.squareup.com/docs/invoices-api/overview)
- [Subscriptions API](https://developer.squareup.com/docs/subscriptions-api/overview)
- [Refunds API](https://developer.squareup.com/reference/square/refunds-api)
- [Sandbox Test Values](https://developer.squareup.com/docs/testing/test-values)
- [Error Handling](https://developer.squareup.com/docs/build-basics/common-api-patterns/error-handling)
