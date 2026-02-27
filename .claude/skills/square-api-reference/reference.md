# Square API Developer Reference

> **Last Updated:** February 2026
> **Current API Version:** 2026-01-22
> **Production Base URL:** `https://connect.squareup.com`
> **Sandbox Base URL:** `https://connect.squareupsandbox.com`
> **Developer Dashboard:** `https://developer.squareup.com`

---

## Table of Contents

1. [API Versioning](#api-versioning)
2. [Environments](#environments)
3. [Authentication — Access Tokens](#authentication--access-tokens)
4. [OAuth 2.0](#oauth-20)
5. [Client Libraries](#client-libraries)
6. [Payments API](#payments-api)
7. [Orders API](#orders-api)
8. [Customers API](#customers-api)
9. [Catalog API](#catalog-api)
10. [Webhooks](#webhooks)
11. [Error Handling](#error-handling)
12. [Rate Limits](#rate-limits)
13. [Idempotency](#idempotency)
14. [Testing and Sandbox](#testing-and-sandbox)
15. [Recent Changes (2025–2026)](#recent-changes-20252026)
16. [Appendix: Transaction Fees](#appendix-transaction-fees)

---

## API Versioning

Square uses date-based versioning. Every API request must specify a version either via the `Square-Version` header or through the SDK (which pins to its release version).

```
Square-Version: 2026-01-22
```

### Version Behavior

- **SDK auto-pin:** Both the Node.js and Python SDKs pin to the API version at SDK release time. Upgrade SDK versions to access newer API features.
- **Header override:** Pass `Square-Version` header to target a specific version per-request.
- **Backwards compatibility:** Square maintains older versions; responses from older versions may omit new fields added after that date.
- **Version listing:** Available via `GET /v2/square-versions` (REST) or the Square Developer dashboard.

### Current Version

`2026-01-22` — released January 2026. Includes Bank Accounts API new endpoints, Catalog kitchen display support, OAuth JWT support, Orders `blocked_service_charges`, Payments card surcharge, Terminal card surcharge. Mobile Auth API and Reader SDK retired in this version.

---

## Environments

| Environment | Base URL | Use |
|-------------|----------|-----|
| Production | `https://connect.squareup.com` | Live transactions |
| Sandbox | `https://connect.squareupsandbox.com` | Testing only |

### SDK Environment Constants

**Node.js:**
```typescript
import { SquareEnvironment } from "square";

SquareEnvironment.Production  // → "https://connect.squareup.com"
SquareEnvironment.Sandbox     // → "https://connect.squareupsandbox.com"
```

**Python:**
```python
from square.environment import SquareEnvironment

SquareEnvironment.PRODUCTION  # → "https://connect.squareup.com"
SquareEnvironment.SANDBOX     # → "https://connect.squareupsandbox.com"
```

Sandbox uses separate credentials. Production tokens do not work in sandbox and vice versa.

---

## Authentication — Access Tokens

### Token Types

| Token Type | Prefix | Use |
|------------|--------|-----|
| Personal Access Token (live) | `EAAAl...` or `sq0atp-...` | Server-side, live |
| Personal Access Token (sandbox) | `EAAAl...` sandbox variant | Server-side, testing |
| OAuth Access Token | Variable | Issued per merchant via OAuth flow |

### HTTP Header

```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
Square-Version: 2026-01-22
```

**Never expose access tokens client-side.** All Square API calls must be made server-side.

### Initializing the Client

**Node.js (v40+ — new SDK only):**
```typescript
import { SquareClient, SquareEnvironment } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,  // SquareEnvironment.Production for live
});
```

**Python (v42+ — new SDK only):**
```python
import os
from square import Square
from square.environment import SquareEnvironment

client = Square(
  token=os.environ["SQUARE_ACCESS_TOKEN"],
  environment=SquareEnvironment.SANDBOX,  # SquareEnvironment.PRODUCTION for live
)
```

---

## OAuth 2.0

Use OAuth when building apps for multiple Square merchants. Your app requests permission scopes, the merchant authorizes, and Square issues access + refresh tokens.

### Flow Types

| Flow | Use Case | Client Secret Required |
|------|----------|----------------------|
| Authorization Code | Server-side apps with secure backend | Yes |
| PKCE | Public clients (mobile, SPA) | No — uses `code_verifier` |

### Token Lifetimes

| Token | Expiry |
|-------|--------|
| Authorization code | 5 minutes, single-use |
| Access token | 30 days |
| Refresh token (code flow) | No expiry until revoked |
| Refresh token (PKCE) | 90 days, single-use |

### Authorization Code Flow

**Step 1 — Build the authorization URL:**
```
https://connect.squareup.com/oauth2/authorize
  ?client_id=YOUR_APP_ID
  &scope=PAYMENTS_WRITE+CUSTOMERS_READ
  &session=false
  &state=RANDOM_CSRF_TOKEN
```

**Step 2 — Exchange code for tokens:**
```typescript
// Node.js
const response = await client.oAuth.obtainToken({
  clientId: process.env.SQUARE_APP_ID,
  clientSecret: process.env.SQUARE_APP_SECRET,
  grantType: "authorization_code",
  code: authorizationCode,
});

const { accessToken, refreshToken, expiresAt } = response;
```

```python
# Python
response = client.o_auth.obtain_token(
  client_id=os.environ["SQUARE_APP_ID"],
  client_secret=os.environ["SQUARE_APP_SECRET"],
  grant_type="authorization_code",
  code=authorization_code,
)

access_token = response.access_token
refresh_token = response.refresh_token
```

**Step 3 — Refresh access token:**
```typescript
// Node.js
const response = await client.oAuth.obtainToken({
  clientId: process.env.SQUARE_APP_ID,
  clientSecret: process.env.SQUARE_APP_SECRET,
  grantType: "refresh_token",
  refreshToken: storedRefreshToken,
});
```

### PKCE Flow

```typescript
// Node.js — generate code verifier + challenge
import crypto from "crypto";

const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

// Authorization URL
const url = `https://connect.squareup.com/oauth2/authorize`
  + `?client_id=${appId}`
  + `&scope=PAYMENTS_WRITE`
  + `&code_challenge=${codeChallenge}`
  + `&code_challenge_method=S256`;

// Exchange code — pass code_verifier instead of client_secret
const response = await client.oAuth.obtainToken({
  clientId: appId,
  grantType: "authorization_code",
  code: authorizationCode,
  codeVerifier: codeVerifier,
});
```

### Common OAuth Scopes

| Scope | Access |
|-------|--------|
| `PAYMENTS_READ` | Read payment records |
| `PAYMENTS_WRITE` | Create and manage payments |
| `ORDERS_READ` | Read order records |
| `ORDERS_WRITE` | Create and manage orders |
| `CUSTOMERS_READ` | Read customer profiles |
| `CUSTOMERS_WRITE` | Create and manage customers |
| `ITEMS_READ` | Read catalog items |
| `ITEMS_WRITE` | Create and manage catalog items |
| `MERCHANT_PROFILE_READ` | Read merchant account info |
| `BANK_ACCOUNTS_READ` | Read bank account info |

---

## Client Libraries

### Node.js SDK (v40+)

```bash
npm install square
# Requires Node.js 16+
# TypeScript: requires moduleResolution "node16", "nodenext", or "bundler"
```

**Breaking changes from pre-v40:**

| Before v40 | v40+ |
|-----------|------|
| `import { Client, Environment } from "square/legacy"` | `import { SquareClient, SquareEnvironment } from "square"` |
| `new Client({ bearerAuthCredentials: { accessToken: token }, environment: ... })` | `new SquareClient({ token, environment })` |
| `client.customersApi.listCustomers()` | `client.customers.list()` |
| `client.paymentsApi.createPayment(body)` | `client.payments.create(body)` |
| Positional arguments | Named parameter objects |
| Integer for money | `BigInt(100)` required for money fields |

**Auto-pagination (Node.js):**
```typescript
// Iterate all customers without manual cursor management
for await (const customer of await client.customers.list({ limit: 100 })) {
  console.log(customer.id, customer.givenName);
}
```

**TypeScript config requirement (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "moduleResolution": "node16"
  }
}
```

### Python SDK (v42+)

```bash
pip install squareup
# Requires Python 3.8+
```

**Breaking changes from pre-v42:**

| Before v42 | v42+ |
|-----------|------|
| `from square_legacy.client import Client as LegacySquare` | `from square import Square` |
| `Client(environment="sandbox", access_token=token)` | `Square(environment=SquareEnvironment.SANDBOX, token=token)` |
| `client.customers.create_customer({"given_name": "value"})` | `client.customers.create(given_name="value")` |
| `response.body['locations'][0]['name']` | `response.locations[0].name` (Pydantic models) |
| `if response.is_error()` | `try/except ApiError as e:` |
| `response.errors` on result | Exception attributes: `e.errors`, `e.status_code` |

**Auto-pagination (Python):**
```python
# Iterate all customers without manual cursor management
for customer in client.customers.list(limit=100):
    print(customer.id, customer.given_name)
```

---

## Payments API

The Payments API processes card payments, digital wallets, and other tender types. Use it for direct card charges where you control the payment UI (Web Payments SDK, In-App Payments SDK, or manually via card nonce).

### Create a Payment

**Node.js:**
```typescript
import { randomUUID } from "crypto";

const response = await client.payments.create({
  sourceId: "cnon:card-nonce-ok",          // Card nonce from Web Payments SDK
  idempotencyKey: randomUUID(),
  amountMoney: {
    amount: BigInt(1000),                   // $10.00 — always BigInt in Node.js
    currency: "USD",
  },
  locationId: process.env.SQUARE_LOCATION_ID,
  note: "Order #1234",
});

const payment = response.payment;
console.log(payment.id, payment.status);   // "COMPLETED"
```

**Python:**
```python
import uuid

response = client.payments.create(
  source_id="cnon:card-nonce-ok",
  idempotency_key=str(uuid.uuid4()),
  amount_money={
    "amount": 1000,                          # $10.00 in cents
    "currency": "USD",
  },
  location_id=os.environ["SQUARE_LOCATION_ID"],
  note="Order #1234",
)

payment = response.payment
print(payment.id, payment.status)            # "COMPLETED"
```

### Payment Statuses

```
APPROVED → COMPLETED
         → CANCELED
         → FAILED
PENDING  → COMPLETED
         → FAILED
```

| Status | Meaning |
|--------|---------|
| `APPROVED` | Authorized but not captured (manual capture) |
| `PENDING` | ACH or delayed capture payment |
| `COMPLETED` | Payment captured and settled |
| `CANCELED` | Payment voided before capture |
| `FAILED` | Payment declined or error |

### Get a Payment

**Node.js:**
```typescript
const response = await client.payments.get({ paymentId: "payment_id_here" });
const payment = response.payment;
```

**Python:**
```python
response = client.payments.get(payment_id="payment_id_here")
payment = response.payment
```

### Cancel a Payment

```typescript
// Node.js — cancel before capture
await client.payments.cancel({ paymentId: "payment_id_here" });
```

```python
# Python
client.payments.cancel(payment_id="payment_id_here")
```

### Refund a Payment

**Node.js:**
```typescript
const refund = await client.refunds.refundPayment({
  paymentId: "payment_id_here",
  idempotencyKey: randomUUID(),
  amountMoney: {
    amount: BigInt(500),   // Partial refund: $5.00
    currency: "USD",
  },
  reason: "Customer request",
});
```

**Python:**
```python
response = client.refunds.refund_payment(
  payment_id="payment_id_here",
  idempotency_key=str(uuid.uuid4()),
  amount_money={"amount": 500, "currency": "USD"},
  reason="Customer request",
)
```

---

## Orders API

The Orders API manages line-item orders including tax, discounts, and fulfillment. Used with the Payments API for full checkout flows.

### Create an Order

**Node.js:**
```typescript
const response = await client.orders.create({
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [
      {
        name: "Widget",
        quantity: "2",
        basePriceMoney: {
          amount: BigInt(500),  // $5.00 each
          currency: "USD",
        },
      },
    ],
    taxes: [
      {
        name: "Sales Tax",
        percentage: "8.5",
        scope: "ORDER",
      },
    ],
  },
  idempotencyKey: randomUUID(),
});

const order = response.order;
```

**Python:**
```python
response = client.orders.create(
  order={
    "location_id": os.environ["SQUARE_LOCATION_ID"],
    "line_items": [
      {
        "name": "Widget",
        "quantity": "2",
        "base_price_money": {"amount": 500, "currency": "USD"},
      }
    ],
    "taxes": [
      {"name": "Sales Tax", "percentage": "8.5", "scope": "ORDER"}
    ],
  },
  idempotency_key=str(uuid.uuid4()),
)

order = response.order
```

### Pay for an Order

After creating an order, pay it by referencing the order ID in the payment:

**Node.js:**
```typescript
await client.payments.create({
  sourceId: cardNonce,
  idempotencyKey: randomUUID(),
  amountMoney: {
    amount: order.totalMoney.amount,
    currency: "USD",
  },
  orderId: order.id,
  locationId: process.env.SQUARE_LOCATION_ID,
});
```

### Order States

```
OPEN → COMPLETED
     → CANCELED
```

- `OPEN`: Order created, payment pending
- `COMPLETED`: Fully paid and fulfilled
- `CANCELED`: Order voided

---

## Customers API

Manages customer profiles for saved cards, receipts, and loyalty. Customer objects store contact info and link to saved payment methods (cards on file).

### Create a Customer

**Node.js:**
```typescript
const response = await client.customers.create({
  givenName: "Jane",
  familyName: "Doe",
  emailAddress: "jane@example.com",
  phoneNumber: "+14155551234",
  idempotencyKey: randomUUID(),
});

const customer = response.customer;
```

**Python:**
```python
response = client.customers.create(
  given_name="Jane",
  family_name="Doe",
  email_address="jane@example.com",
  phone_number="+14155551234",
  idempotency_key=str(uuid.uuid4()),
)

customer = response.customer
```

### List Customers (with auto-pagination)

**Node.js:**
```typescript
for await (const customer of await client.customers.list({ limit: 100, sortOrder: "DESC" })) {
  console.log(customer.id, customer.emailAddress);
}
```

**Python:**
```python
for customer in client.customers.list(limit=100, sort_order="DESC"):
    print(customer.id, customer.email_address)
```

### Save a Card on File

```typescript
// Node.js — create card linked to customer
const card = await client.cards.create({
  idempotencyKey: randomUUID(),
  sourceId: cardNonce,
  card: {
    customerId: customer.id,
    cardholderName: "Jane Doe",
    billingAddress: {
      postalCode: "94103",
    },
  },
});
```

### Charge a Saved Card

```typescript
// Node.js — charge using card ID (not nonce)
await client.payments.create({
  sourceId: card.card.id,   // "ccof:card-id-here"
  customerId: customer.id,
  idempotencyKey: randomUUID(),
  amountMoney: {
    amount: BigInt(2000),
    currency: "USD",
  },
  locationId: process.env.SQUARE_LOCATION_ID,
});
```

---

## Catalog API

Manages items, variations, categories, taxes, modifiers, and discounts for your product catalog. Catalog objects are versioned with `version` fields for optimistic concurrency.

### Upsert a Catalog Item

```typescript
// Node.js
const response = await client.catalog.upsertObject({
  idempotencyKey: randomUUID(),
  object: {
    type: "ITEM",
    id: "#new-item",    // Temp ID for batch creates
    itemData: {
      name: "Coffee",
      variations: [
        {
          type: "ITEM_VARIATION",
          id: "#small",
          itemVariationData: {
            name: "Small",
            pricingType: "FIXED_PRICING",
            priceMoney: {
              amount: BigInt(350),
              currency: "USD",
            },
          },
        },
      ],
    },
  },
});
```

### Search Catalog

```python
# Python
response = client.catalog.search_objects(
  object_types=["ITEM"],
  query={
    "text_query": {
      "keywords": ["coffee"],
    },
  },
)

for obj in response.objects:
    print(obj.id, obj.item_data.name)
```

---

## Webhooks

Webhooks deliver real-time event notifications to your server. Square sends a POST request with a JSON payload when subscribed events occur.

### Subscribing to Events

Create subscriptions in the Square Developer Dashboard under your app's **Webhooks** section, or via the Webhooks API.

### Signature Verification

**CRITICAL: Always verify the `x-square-hmacsha256-signature` header before processing any webhook event.**

The signature is computed as:
```
HMAC-SHA-256(signature_key, notification_url + raw_body)
```

**Node.js (using SDK helper):**
```typescript
import { WebhooksHelper } from "square";
import express from "express";

const WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
const NOTIFICATION_URL = "https://example.com/webhooks/square";

app.post(
  "/webhooks/square",
  express.raw({ type: "application/json" }),  // MUST use raw body
  (req, res) => {
    const signature = req.headers["x-square-hmacsha256-signature"] as string;
    const rawBody = req.body.toString("utf8");

    const isValid = WebhooksHelper.isValidWebhookEventSignature(
      rawBody,
      signature,
      WEBHOOK_SIGNATURE_KEY,
      NOTIFICATION_URL,
    );

    if (!isValid) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);
    console.log("Event type:", event.type);

    switch (event.type) {
      case "payment.completed":
        handlePaymentCompleted(event.data.object.payment);
        break;
      case "order.updated":
        handleOrderUpdated(event.data.object.order_updated);
        break;
    }

    res.sendStatus(200);
  }
);
```

**Python (manual verification):**
```python
import hashlib
import hmac
import base64

def verify_square_webhook(
  raw_body: bytes,
  signature: str,
  signature_key: str,
  notification_url: str,
) -> bool:
    payload = notification_url.encode("utf-8") + raw_body
    expected = base64.b64encode(
      hmac.new(
        signature_key.encode("utf-8"),
        payload,
        hashlib.sha256,
      ).digest()
    ).decode("utf-8")
    # Constant-time comparison prevents timing attacks
    return hmac.compare_digest(expected, signature)


@app.route("/webhooks/square", methods=["POST"])
def webhook():
    raw_body = request.get_data()
    signature = request.headers.get("x-square-hmacsha256-signature", "")

    if not verify_square_webhook(
      raw_body,
      signature,
      os.environ["SQUARE_WEBHOOK_SIGNATURE_KEY"],
      "https://example.com/webhooks/square",
    ):
        return "Invalid signature", 400

    event = request.json
    if event["type"] == "payment.completed":
        handle_payment_completed(event["data"]["object"]["payment"])

    return "", 200
```

### Webhook Best Practices

- **Return 200 quickly.** Enqueue events for async processing — do not do database writes in the webhook handler's critical path.
- **Deduplicate by event ID.** Square may deliver the same event more than once. Store processed `event_id` values.
- **Use raw body for signature.** Parsed JSON will fail signature verification. Always read the raw request body.
- **Constant-time comparison.** Use `hmac.compare_digest` (Python) or `crypto.timingSafeEqual` (Node.js) to prevent timing attacks.
- **Retry behavior:** Square retries failed deliveries (non-2xx) up to 3 days with exponential backoff.

### Common Webhook Event Types

| Event | Trigger |
|-------|---------|
| `payment.completed` | Payment captured successfully |
| `payment.updated` | Payment status changed |
| `refund.updated` | Refund status changed |
| `order.updated` | Order state or line items changed |
| `order.created` | New order created |
| `customer.created` | New customer profile created |
| `customer.updated` | Customer profile updated |
| `catalog.version.updated` | Catalog changes synced |
| `subscription.created` | New subscription started |
| `subscription.updated` | Subscription status changed |
| `invoice.payment_made` | Invoice payment received |

---

## Error Handling

### Error Response Shape

All Square API errors return this structure:

```json
{
  "errors": [
    {
      "category": "PAYMENT_METHOD_ERROR",
      "code": "CARD_DECLINED",
      "detail": "Card was declined.",
      "field": "source_id"
    }
  ]
}
```

### Error Categories

| Category | Meaning |
|----------|---------|
| `AUTHENTICATION_ERROR` | Invalid or expired access token |
| `INVALID_REQUEST_ERROR` | Missing or malformed request parameters |
| `PAYMENT_METHOD_ERROR` | Card declined or payment method issue |
| `REFUND_ERROR` | Refund failed (insufficient balance, already refunded, etc.) |
| `RATE_LIMITED` | Too many requests — implement backoff |
| `NOT_FOUND` | Resource does not exist |
| `SERVICE_UNAVAILABLE` | Square service temporarily unavailable |
| `INTERNAL_SERVER_ERROR` | Unexpected server error — retry with backoff |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request — invalid parameters |
| 401 | Unauthorized — invalid or missing token |
| 403 | Forbidden — token lacks required scope |
| 404 | Not found |
| 409 | Conflict — idempotency key reused with different body |
| 429 | Rate limited |
| 500 / 503 | Square server error — retry with backoff |

### Error Handling Pattern

**Node.js:**
```typescript
import { SquareError } from "square";

try {
  const response = await client.payments.create({
    sourceId: cardNonce,
    idempotencyKey: randomUUID(),
    amountMoney: { amount: BigInt(1000), currency: "USD" },
    locationId: locationId,
  });
  const payment = response.payment;
} catch (error) {
  if (error instanceof SquareError) {
    console.error("Status:", error.statusCode);
    for (const e of error.errors ?? []) {
      console.error(`[${e.category}] ${e.code}: ${e.detail}`);
    }
    if (error.statusCode === 429) {
      // Implement exponential backoff
    }
  } else {
    throw error;  // Re-throw unexpected errors
  }
}
```

**Python:**
```python
from square.core.api_error import ApiError

try:
  response = client.payments.create(
    source_id=card_nonce,
    idempotency_key=str(uuid.uuid4()),
    amount_money={"amount": 1000, "currency": "USD"},
    location_id=location_id,
  )
  payment = response.payment
except ApiError as e:
  print(f"Status: {e.status_code}")
  for error in e.errors:
    print(f"[{error.category}] {error.code}: {error.detail}")
  if e.status_code == 429:
    # Implement exponential backoff
    pass
```

### Common Error Codes

| Code | Category | Fix |
|------|----------|-----|
| `CARD_DECLINED` | PAYMENT_METHOD_ERROR | Ask for different payment method |
| `CVV_FAILURE` | PAYMENT_METHOD_ERROR | Ask customer to re-enter CVV |
| `ADDRESS_VERIFICATION_FAILURE` | PAYMENT_METHOD_ERROR | Check billing address |
| `EXPIRATION_FAILURE` | PAYMENT_METHOD_ERROR | Card expired — ask for new card |
| `INSUFFICIENT_FUNDS` | PAYMENT_METHOD_ERROR | Ask for different payment method |
| `INVALID_LOCATION` | INVALID_REQUEST_ERROR | Verify `location_id` is correct and active |
| `IDEMPOTENCY_KEY_REUSED` | INVALID_REQUEST_ERROR | Generate new idempotency key if parameters changed |
| `UNAUTHORIZED` | AUTHENTICATION_ERROR | Refresh or reauthorize access token |
| `FORBIDDEN` | AUTHENTICATION_ERROR | Token lacks required scope — re-authorize with correct scopes |

---

## Rate Limits

Square does not publish fixed rate limit numbers. Limits are enforced dynamically and vary by endpoint and account type.

### What You Know

- 429 responses indicate you are rate limited
- The `Retry-After` header (when present) specifies seconds to wait
- App Marketplace compliance requires exponential backoff + jitter

### Exponential Backoff Pattern

**Node.js:**
```typescript
async function squareCallWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof SquareError && error.statusCode === 429) {
        if (attempt === maxRetries - 1) throw error;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}
```

**Python:**
```python
import time
import random

def square_call_with_retry(fn, max_retries=5):
  for attempt in range(max_retries):
    try:
      return fn()
    except ApiError as e:
      if e.status_code == 429:
        if attempt == max_retries - 1:
          raise
        delay = (2 ** attempt) + random.uniform(0, 0.5)
        time.sleep(delay)
      else:
        raise
```

---

## Idempotency

Square requires idempotency keys on all write operations (payments, orders, customers, refunds). This prevents duplicate charges if a request times out or fails midway.

### Rules

- Use a UUID v4 per request
- Reuse the same key to safely retry the exact same operation
- Generate a NEW key if you change any request parameters
- Idempotency keys expire after 24 hours (Square discards the cached result)
- A reused key with different parameters returns a `IDEMPOTENCY_KEY_REUSED` error (HTTP 409)

```typescript
// Node.js — correct pattern
import { randomUUID } from "crypto";

const key = randomUUID();  // Generate once per logical operation

// If this call fails at network level, retry with same key:
await client.payments.create({
  idempotencyKey: key,
  // ... same parameters
});
```

---

## Testing and Sandbox

### Sandbox Setup

1. Create a sandbox test account in the [Square Developer Dashboard](https://developer.squareup.com)
2. Each sandbox has its own access token, location IDs, and data (isolated from production)
3. Sandbox tokens do not work against `connect.squareup.com`

### Test Card Nonces

Use these nonces in sandbox to simulate specific outcomes. Pass as `sourceId` in payment create calls.

| Nonce | Result |
|-------|--------|
| `cnon:card-nonce-ok` | Successful payment |
| `cnon:card-nonce-declined` | Card declined |
| `cnon:card-nonce-avs-failure` | AVS check failure |
| `cnon:card-nonce-cvv-failure` | CVV failure |
| `cnon:card-nonce-expiration-failure` | Expired card |
| `cnon:card-nonce-address-verification-failure` | Address verification failure |
| `cnon:card-nonce-insufficient-funds` | Insufficient funds |
| `cnon:gift-card-nonce-ok` | Successful gift card |

### Web Payments SDK (for getting real nonces)

The Web Payments SDK tokenizes card data client-side and returns a nonce for server-side use:

```html
<script type="text/javascript" src="https://web.squarecdn.com/v1/square.js"></script>
<script>
  const payments = Square.payments(APPLICATION_ID, LOCATION_ID);
  const card = await payments.card();
  await card.attach("#card-container");

  // On form submit:
  const result = await card.tokenize();
  if (result.status === "OK") {
    // Send result.token to your server as sourceId
    submitPayment(result.token);
  }
</script>
```

### Testing Webhooks Locally

Use the [Square Webhooks CLI](https://developer.squareup.com/docs/webhooks/overview) or ngrok to forward events:

```bash
# Using ngrok
ngrok http 3000

# Set your ngrok URL as the webhook notification URL in the Developer Dashboard
# Use the sandbox signature key for local verification
```

---

## Recent Changes (2025–2026)

### 2026-01-22 (Current Version)

| Change | Type |
|--------|------|
| Bank Accounts API new endpoints | Added |
| Catalog kitchen display support (KDS routing) | Added |
| OAuth JWT support | Added |
| Orders `blocked_service_charges` field | Added |
| Payments card surcharge field | Added |
| Terminal card surcharge field | Added |
| **Mobile Auth API — RETIRED** | Removed |
| **Reader SDK — RETIRED** | Removed |

### 2025-09-24

| Change | Type |
|--------|------|
| Subscriptions `COMPLETED` status added | Added |

### 2025-06-18

| Change | Type |
|--------|------|
| Square SDK (original) retired | Removed |

### 2025-04-16 — SDK Rewrites

Both SDKs were rewritten from scratch. This is the most significant breaking change for developers.

**Node.js v40 (April 2025):**

| Aspect | Before | After |
|--------|--------|-------|
| Import | `from "square/legacy"` | `from "square"` |
| Client class | `Client` | `SquareClient` |
| Environment | `Environment.Sandbox` | `SquareEnvironment.Sandbox` |
| Init | `bearerAuthCredentials: { accessToken }` | `token:` |
| API classes | `client.customersApi` | `client.customers` |
| Methods | `listCustomers()` | `list()` |
| Args | Positional | Named object params |
| Money | `number` | `BigInt` required |
| Pagination | Manual cursor | `for await ... of await client.x.list()` |
| TypeScript | Loose config | Requires `"moduleResolution": "node16"` |

**Python v42 (April 2025):**

| Aspect | Before | After |
|--------|--------|-------|
| Import | `from square_legacy.client import Client` | `from square import Square` |
| Client class | `Client` | `Square` |
| Init | `access_token=token` | `token=token` |
| Methods | `create_customer(body_dict)` | `create(given_name="value")` — TypedDict kwargs |
| Response | `response.body['key']` | `response.key` — Pydantic models |
| Errors | `if response.is_error()` | `try/except ApiError` |
| Pagination | Manual cursor | `for item in client.x.list():` |

### Legacy Path Support

Both SDKs provide legacy import paths for gradual migration, but these are deprecated and will be removed:

```typescript
// Node.js — legacy (deprecated, use only during migration)
import { Client, Environment } from "square/legacy";
```

```python
# Python — legacy (deprecated, use only during migration)
from square_legacy.client import Client as LegacySquare
```

---

## Appendix: Transaction Fees

### US Processing Fees (as of February 2026)

| Payment Type | Rate |
|-------------|------|
| Online / card-not-present | 2.9% + $0.30 |
| In-person / card-present / tap-to-pay | 2.6% + $0.15 |
| Manually keyed / card-not-present | 3.5% + $0.15 |
| ACH bank transfer | 1% ($1.00–$5.00 cap) |
| Afterpay (BNPL) | 6% + $0.30 |
| Cash App Pay | 2.9% + $0.30 |
| International card (add-on) | +1.5% on top of base rate |

### Monthly and Service Fees

| Item | Fee |
|------|-----|
| Square API access | Free (no monthly fee) |
| Chargeback protection | No fee charged by Square |
| Card-on-file storage | Free |
| Instant transfers | 1.75% |

### Amount Constraints

- All amounts are in **cents** (smallest currency unit)
- Minimum charge: $1.00 (100 cents) for most currencies
- **Node.js SDK requires `BigInt`** for all money fields: `amount: BigInt(100)`
- Python SDK accepts regular integers: `"amount": 100`

### Useful Links

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [API Reference](https://developer.squareup.com/reference/square)
- [Changelog](https://developer.squareup.com/changelog)
- [Node.js SDK (GitHub)](https://github.com/square/square-nodejs-sdk)
- [Python SDK (GitHub)](https://github.com/square/square-python-sdk)
- [Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [OAuth Overview](https://developer.squareup.com/docs/oauth-api/overview)
- [Webhooks Overview](https://developer.squareup.com/docs/webhooks/overview)
- [Sandbox Test Values](https://developer.squareup.com/docs/devtools/sandbox/testing)
- [App Marketplace Requirements](https://developer.squareup.com/docs/app-marketplace/overview)
