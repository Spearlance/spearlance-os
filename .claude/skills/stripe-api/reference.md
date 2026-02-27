# Stripe API Developer Reference

> **Last Updated:** February 2026
> **Current API Version:** 2026-01-28.clover
> **Base URL:** `https://api.stripe.com/v1`
> **Dashboard:** `https://dashboard.stripe.com`

---

## Table of Contents

1. [API Versioning](#api-versioning)
2. [Authentication and Setup](#authentication-and-setup)
3. [Client Libraries](#client-libraries)
4. [Payments (PaymentIntents)](#payments-paymentintents)
5. [Checkout Sessions](#checkout-sessions)
6. [Subscriptions and Billing](#subscriptions-and-billing)
7. [Webhooks](#webhooks)
8. [Error Handling](#error-handling)
9. [Rate Limits and Quotas](#rate-limits-and-quotas)
10. [Testing](#testing)
11. [Recent Changes and Deprecations](#recent-changes-and-deprecations)
12. [Appendix: Transaction Fees](#appendix-transaction-fees)

---

## API Versioning

### Naming Convention

Stripe uses date-based versions with codenames for major releases:

| Codename | First Version | Contains |
|----------|--------------|----------|
| Acacia | 2024-xx-xx | Breaking changes from prior era |
| Basil | 2025-03-31 | Breaking changes from Acacia |
| Clover | 2025-09-30 | Breaking changes from Basil |

**Monthly releases** within a codename (e.g., 2025-10-29.clover, 2025-12-15.clover, 2026-01-28.clover) contain only backward-compatible changes. Safe to upgrade within the same codename.

### How Versions Apply

- **Account default version:** Set in Stripe Dashboard > Workbench
- **SDK pinned version:** Newer SDKs (Node v12+, Python v6+) pin to the API version at SDK release time
- **Per-request override:** Pass `stripe_version` parameter or `Stripe-Version` header
- **Webhook endpoints:** Locked to the version set when the endpoint was created
- **72-hour rollback window** after upgrading account version

### Setting Version

**Python:**
```python
import stripe
stripe.api_key = "sk_test_..."
stripe.api_version = "2026-01-28.clover"  # Optional: SDK pins automatically
```

**Node.js:**
```typescript
const stripe = new Stripe("sk_test_...", {
    apiVersion: "2026-01-28.clover",  // Optional: SDK pins automatically
});
```

---

## Authentication and Setup

### API Key Types

| Key Type | Prefix | Use Case |
|----------|--------|----------|
| Secret key (live) | `sk_live_` | Server-side, live transactions |
| Secret key (test) | `sk_test_` | Server-side, test/sandbox |
| Publishable key (live) | `pk_live_` | Client-side (Stripe.js, Elements) |
| Publishable key (test) | `pk_test_` | Client-side, test/sandbox |
| Restricted key | `rk_live_` / `rk_test_` | Limited permissions for specific integrations |

**Secret keys must NEVER be exposed client-side.** Use publishable keys in browsers/mobile.

### HTTP Headers

```
Authorization: Bearer sk_test_...
Content-Type: application/x-www-form-urlencoded
Stripe-Version: 2026-01-28.clover        # Optional version override
Idempotency-Key: <uuid>                   # Required for safe retries on POST
```

### Idempotency Keys

- Required for all POST requests to prevent duplicate operations
- Use V4 UUIDs
- Expire after 24 hours
- Stripe saves the response for the first request; subsequent requests with the same key return the cached response
- Generate a NEW key if you change request parameters

```python
stripe.PaymentIntent.create(
    amount=2000,
    currency="usd",
    idempotency_key="unique-uuid-v4-here",
)
```

```typescript
await stripe.paymentIntents.create(
    { amount: 2000, currency: "usd" },
    { idempotencyKey: "unique-uuid-v4-here" },
);
```

---

## Client Libraries

### Python (Official)

```bash
pip install stripe
# Requires Python 3.6+
# Latest: v14.x (as of Feb 2026), pins to API 2026-01-28.clover
```

```python
import stripe
stripe.api_key = "sk_test_..."

# All resources accessed as stripe.<Resource>.<method>
customers = stripe.Customer.list(limit=10)
customer = stripe.Customer.create(email="user@example.com")
```

### Node.js (Official)

```bash
npm install stripe
# Requires Node.js 16+ (Node 16 deprecated, removal planned March 2026)
# Latest: v20.x (as of Feb 2026), pins to API 2026-01-28.clover
```

```typescript
import Stripe from "stripe";
const stripe = new Stripe("sk_test_...");

// All resources accessed as stripe.<resource>.<method>
const customers = await stripe.customers.list({ limit: 10 });
const customer = await stripe.customers.create({ email: "user@example.com" });
```

### Other Official SDKs

| Language | Package | Notes |
|----------|---------|-------|
| Ruby | `gem install stripe` | v13.x |
| PHP | `composer require stripe/stripe-php` | v16.x |
| Java | `com.stripe:stripe-java` | v28.x |
| .NET | `Stripe.net` NuGet package | v47.x |
| Go | `github.com/stripe/stripe-go/v82` | v82.x |

### Client-Side (Stripe.js)

```html
<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe("pk_test_...");
</script>
```

Or via npm:
```bash
npm install @stripe/stripe-js
```
```typescript
import { loadStripe } from "@stripe/stripe-js";
const stripe = await loadStripe("pk_test_...");
```

---

## Payments (PaymentIntents)

### Payment Flow Overview

1. **Server:** Create a PaymentIntent with amount and currency
2. **Client:** Use Stripe.js + Payment Element to collect payment details
3. **Client:** Confirm the PaymentIntent
4. **Server:** Listen for `payment_intent.succeeded` webhook

### Creating a PaymentIntent

**Python:**
```python
intent = stripe.PaymentIntent.create(
    amount=2000,          # $20.00 in cents
    currency="usd",
    automatic_payment_methods={"enabled": True},
    metadata={"order_id": "order_123"},
)
# Send intent.client_secret to the client
```

**Node.js:**
```typescript
const intent = await stripe.paymentIntents.create({
    amount: 2000,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { order_id: "order_123" },
});
// Send intent.client_secret to the client
```

### Client-Side Confirmation (Payment Element)

```typescript
// Mount the Payment Element
const elements = stripe.elements({ clientSecret: intent.client_secret });
const paymentElement = elements.create("payment");
paymentElement.mount("#payment-element");

// On form submit
const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
        return_url: "https://example.com/order/complete",
    },
});

if (error) {
    // Show error to customer (e.g., card declined)
    console.error(error.message);
}
// If no error, customer is redirected to return_url
```

### PaymentIntent Lifecycle

```
requires_payment_method -> requires_confirmation -> requires_action -> processing -> succeeded
                                                                                  -> canceled
                                                                     -> requires_payment_method (retry)
```

Key statuses:
- `requires_payment_method`: Initial state, awaiting payment details
- `requires_confirmation`: Payment method collected, awaiting confirm call
- `requires_action`: Customer authentication needed (3D Secure, etc.)
- `processing`: Payment being processed
- `succeeded`: Payment complete
- `canceled`: Payment canceled

### Capture Later (Authorization + Capture)

```python
# Step 1: Authorize (hold funds)
intent = stripe.PaymentIntent.create(
    amount=5000,
    currency="usd",
    capture_method="manual",
    automatic_payment_methods={"enabled": True},
)

# Step 2: Capture (after fulfillment)
stripe.PaymentIntent.capture(intent.id)

# Or capture a partial amount
stripe.PaymentIntent.capture(intent.id, amount_to_capture=3000)
```

### Saving Payment Methods for Future Use

```python
intent = stripe.PaymentIntent.create(
    amount=2000,
    currency="usd",
    customer="cus_xxx",
    setup_future_usage="off_session",  # Save for later charges when customer is away
    automatic_payment_methods={"enabled": True},
)
```

`setup_future_usage` values:
- `off_session`: Customer not present (recurring charges, background payments)
- `on_session`: Customer present in your app (one-click checkout)

### Charging a Saved Payment Method Off-Session

```python
try:
    intent = stripe.PaymentIntent.create(
        amount=1500,
        currency="usd",
        customer="cus_xxx",
        payment_method="pm_xxx",
        off_session=True,
        confirm=True,
    )
except stripe.error.CardError as e:
    # Card was declined; notify customer to return and re-authenticate
    err = e.error
    intent_id = err.payment_intent["id"]
    intent = stripe.PaymentIntent.retrieve(intent_id)
```

---

## Checkout Sessions

### When to Use Checkout vs Payment Element

| Feature | Checkout (Hosted) | Checkout (Embedded) | Payment Element |
|---------|-------------------|---------------------|-----------------|
| UI Control | Stripe-hosted page | Embedded on your site | Fully custom layout |
| Setup Effort | Minimal | Low | Medium |
| Line Items | Built-in | Built-in | You build your own UI |
| Tax Calculation | Built-in (Stripe Tax) | Built-in | Manual integration |
| Coupons/Promotions | Built-in | Built-in | Manual integration |
| Subscriptions | Built-in | Built-in | Use with Billing API |

**Stripe's recommendation:** Use Checkout Sessions for most integrations. Use Payment Element only when you need granular UI control.

### Hosted Checkout (Redirect)

```python
session = stripe.checkout.Session.create(
    mode="payment",  # or "subscription" or "setup"
    line_items=[{
        "price": "price_xxx",
        "quantity": 1,
    }],
    success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url="https://example.com/cancel",
    customer_email="user@example.com",  # Optional: pre-fill email
)
# Redirect customer to session.url
```

### Embedded Checkout

```python
session = stripe.checkout.Session.create(
    mode="payment",
    ui_mode="embedded",
    line_items=[{"price": "price_xxx", "quantity": 1}],
    return_url="https://example.com/return?session_id={CHECKOUT_SESSION_ID}",
)
# Send session.client_secret to the client
```

```typescript
// Client-side
const checkout = await stripe.initEmbeddedCheckout({
    clientSecret: session.client_secret,
});
checkout.mount("#checkout");
```

### Subscription Checkout

```python
session = stripe.checkout.Session.create(
    mode="subscription",
    line_items=[{
        "price": "price_monthly_xxx",  # Must be a recurring price
        "quantity": 1,
    }],
    success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url="https://example.com/cancel",
    subscription_data={
        "trial_period_days": 14,
        "metadata": {"plan": "pro"},
    },
)
```

### Checkout Session Expiration

- Default: 24 hours
- Custom: Set `expires_at` (30 minutes to 24 hours after creation)
- Listen for `checkout.session.expired` webhook to handle abandoned checkouts

### Retrieving Session Results

```python
session = stripe.checkout.Session.retrieve(
    "cs_xxx",
    expand=["line_items", "payment_intent"],
)
# session.payment_status: "paid", "unpaid", "no_payment_required"
# session.status: "open", "complete", "expired"
```

---

## Subscriptions and Billing

### Creating a Subscription

```python
# Step 1: Create a Customer
customer = stripe.Customer.create(
    email="user@example.com",
    payment_method="pm_xxx",
    invoice_settings={"default_payment_method": "pm_xxx"},
)

# Step 2: Create a Subscription
subscription = stripe.Subscription.create(
    customer=customer.id,
    items=[{"price": "price_monthly_xxx"}],
    payment_behavior="default_incomplete",
    expand=["latest_invoice.payment_intent"],
)

# For SCA: send subscription.latest_invoice.payment_intent.client_secret to client
```

### Subscription Lifecycle

```
incomplete -> active -> past_due -> canceled
                     -> paused
                     -> unpaid
```

Key statuses:
- `incomplete`: First payment pending (72-hour window)
- `active`: Recurring payments succeeding
- `past_due`: Latest invoice payment failed; retrying
- `canceled`: Terminated; no further invoices
- `paused`: Payment collection paused; no invoices generated
- `unpaid`: All retry attempts failed (based on your settings)

### Flexible Billing Mode (New Default in Clover)

As of the Clover release (2025-09-30), `flexible` billing mode is the default for new subscriptions. This changes several behaviors:

```python
subscription = stripe.Subscription.create(
    customer="cus_xxx",
    items=[{"price": "price_xxx"}],
    billing_mode={"type": "flexible"},  # Now the default
)
```

Key differences from legacy mode:
- Mixed interval subscriptions supported (monthly + annual items together)
- Subscription consolidation on a single invoice
- Partial payments allowed
- Trial handling improved

### Updating a Subscription (Proration)

```python
subscription = stripe.Subscription.modify(
    "sub_xxx",
    items=[{
        "id": "si_xxx",                 # Existing subscription item ID
        "price": "price_annual_xxx",    # New price
    }],
    proration_behavior="create_prorations",  # or "none" or "always_invoice"
)
```

### Canceling a Subscription

```python
# Cancel immediately
stripe.Subscription.cancel("sub_xxx")

# Cancel at period end (recommended)
stripe.Subscription.modify(
    "sub_xxx",
    cancel_at_period_end=True,
)
```

### Pausing a Subscription

```python
# Pause payment collection (subscription stays active but no invoices generated)
stripe.Subscription.modify(
    "sub_xxx",
    pause_collection={"behavior": "mark_uncollectible"},
    # behavior options: "keep_as_draft", "mark_uncollectible", "void"
)

# Resume
stripe.Subscription.modify(
    "sub_xxx",
    pause_collection="",  # Empty string removes the pause
)
```

### Trials

```python
import time

# Free trial with no payment method upfront
subscription = stripe.Subscription.create(
    customer="cus_xxx",
    items=[{"price": "price_xxx"}],
    trial_period_days=14,
    payment_settings={"save_default_payment_method": "on_subscription"},
)

# Trial with specific end date
subscription = stripe.Subscription.create(
    customer="cus_xxx",
    items=[{"price": "price_xxx"}],
    trial_end=int(time.time()) + (14 * 24 * 60 * 60),
)
```

### Subscription Webhooks to Monitor

| Event | When |
|-------|------|
| `customer.subscription.created` | New subscription created |
| `customer.subscription.updated` | Status change, plan change, etc. |
| `customer.subscription.deleted` | Subscription canceled |
| `customer.subscription.trial_will_end` | 3 days before trial ends |
| `customer.subscription.paused` | Subscription paused |
| `customer.subscription.resumed` | Subscription resumed |
| `invoice.paid` | Successful recurring payment |
| `invoice.payment_failed` | Recurring payment failed |
| `invoice.upcoming` | ~3 days before next invoice |

### Dunning (Failed Payment Recovery)

Stripe automatically retries failed payments using Smart Retries (machine learning-based retry timing). Configure behavior in Dashboard > Settings > Billing > Subscriptions.

Options when all retries fail:
- Cancel subscription
- Mark subscription as unpaid
- Leave subscription past_due

---

## Webhooks

### Setting Up a Webhook Endpoint

**Dashboard:** Stripe Dashboard > Developers > Webhooks > Add endpoint

**API:**
```python
endpoint = stripe.WebhookEndpoint.create(
    url="https://example.com/webhooks/stripe",
    enabled_events=[
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "checkout.session.completed",
        "customer.subscription.updated",
        "invoice.paid",
        "invoice.payment_failed",
    ],
)
```

### Verifying Webhook Signatures

**CRITICAL: Always verify signatures to prevent spoofed events.**

**Python:**
```python
import stripe

endpoint_secret = "whsec_..."

@app.route("/webhooks/stripe", methods=["POST"])
def webhook():
    payload = request.get_data()  # Raw body (not parsed JSON)
    sig_header = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        return "Invalid payload", 400
    except stripe.error.SignatureVerificationError:
        return "Invalid signature", 400

    # Handle the event
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        handle_successful_payment(payment_intent)

    return "", 200
```

**Node.js (Express):**
```typescript
import express from "express";
import Stripe from "stripe";

const stripe = new Stripe("sk_test_...");
const endpointSecret = "whsec_...";

app.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),  // MUST use raw body
    (req, res) => {
        const sig = req.headers["stripe-signature"]!;

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                handleSuccessfulPayment(paymentIntent);
                break;
            case "invoice.payment_failed":
                const invoice = event.data.object as Stripe.Invoice;
                handleFailedInvoice(invoice);
                break;
        }

        res.json({ received: true });
    }
);
```

### Webhook Best Practices

- **Return 200 quickly.** Process events asynchronously (queue the work).
- **Handle duplicate events.** Stripe may send the same event more than once. Use `event.id` to deduplicate.
- **Use the `Stripe-Signature` header** to verify authenticity. The signing secret (`whsec_...`) is per-endpoint.
- **Raw body required.** Most frameworks parse JSON automatically; you must access the raw body for signature verification.
- **Retry behavior:** Stripe retries failed webhook deliveries (non-2xx responses) for up to 3 days with exponential backoff.
- **Event ordering:** Events may arrive out of order. Always fetch the latest resource state if order matters.

### Webhook Secret Rotation

You can roll your webhook secret in the Dashboard with a 24-hour grace period where both old and new secrets are valid. Use this to rotate secrets without downtime.

---

## Error Handling

### Error Types

| Error Type | Class (Python) | Class (Node) | Cause |
|-----------|----------------|--------------|-------|
| Card errors | `stripe.error.CardError` | `Stripe.errors.StripeCardError` | Payment declined |
| Invalid request | `stripe.error.InvalidRequestError` | `Stripe.errors.StripeInvalidRequestError` | Bad parameters |
| Authentication | `stripe.error.AuthenticationError` | `Stripe.errors.StripeAuthenticationError` | Wrong API key |
| Rate limit | `stripe.error.RateLimitError` | `Stripe.errors.StripeRateLimitError` | Too many requests (429) |
| API error | `stripe.error.APIError` | `Stripe.errors.StripeAPIError` | Stripe server issue (500) |
| Connection | `stripe.error.APIConnectionError` | `Stripe.errors.StripeConnectionError` | Network failure |
| Idempotency | `stripe.error.IdempotencyError` | `Stripe.errors.StripeIdempotencyError` | Idempotency key misuse |
| Permission | `stripe.error.PermissionError` | `Stripe.errors.StripePermissionError` | Restricted key lacks access |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing or invalid parameters) |
| 401 | Unauthorized (invalid API key) |
| 402 | Request failed (card declined, etc.) |
| 403 | Forbidden (restricted key) |
| 404 | Resource not found |
| 409 | Conflict (idempotency key conflict) |
| 429 | Rate limited |
| 500, 502, 503 | Stripe server errors (retry with backoff) |

### Common Error Codes

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| `card_declined` | 402 | Card was declined | Show decline message; ask for different card |
| `authentication_required` | 402 | 3D Secure / SCA needed | Use `requires_action` flow |
| `expired_card` | 402 | Card expired | Ask customer to update card |
| `incorrect_cvc` | 402 | CVC doesn't match | Ask customer to re-enter |
| `insufficient_funds` | 402 | Not enough balance | Ask for different payment method |
| `processing_error` | 402 | Temporary processing issue | Retry the payment |
| `invalid_charge_amount` | 400 | Amount too small or invalid | Check minimum charge for currency |
| `parameter_missing` | 400 | Required param missing | Check required fields in API docs |
| `rate_limit` | 429 | Too many requests | Implement exponential backoff |
| `api_key_expired` | 401 | API key no longer valid | Generate new key in Dashboard |

### Error Handling Pattern

**Python:**
```python
try:
    intent = stripe.PaymentIntent.create(
        amount=2000,
        currency="usd",
    )
except stripe.error.CardError as e:
    # Card was declined
    body = e.json_body
    err = body.get("error", {})
    print(f"Decline code: {err.get('decline_code')}")
    print(f"Message: {err.get('message')}")
except stripe.error.RateLimitError:
    # Retry with exponential backoff
    pass
except stripe.error.InvalidRequestError as e:
    # Invalid parameters
    print(f"Invalid: {e.user_message}")
except stripe.error.AuthenticationError:
    # Wrong API key
    pass
except stripe.error.APIConnectionError:
    # Network issue -- retry
    pass
except stripe.error.StripeError as e:
    # Catch-all for other Stripe errors
    print(f"Stripe error: {e.user_message}")
```

**Node.js:**
```typescript
try {
    const intent = await stripe.paymentIntents.create({
        amount: 2000,
        currency: "usd",
    });
} catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
        console.log(`Decline code: ${err.decline_code}`);
        console.log(`Message: ${err.message}`);
    } else if (err instanceof Stripe.errors.StripeRateLimitError) {
        // Retry with backoff
    } else if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        console.log(`Invalid: ${err.message}`);
    } else {
        console.log(`Unexpected error: ${err}`);
    }
}
```

---

## Rate Limits and Quotas

### Global Limits

| Environment | Default Limit |
|-------------|--------------|
| Live mode | 100 operations/sec |
| Sandbox/Test mode | 25 operations/sec |

### Per-Endpoint Limits

| Endpoint / Service | Limit |
|-------------------|-------|
| Files API | 20 read + 20 write/sec |
| Search API | 20 read/sec |
| PaymentIntent updates | 1,000 per PaymentIntent per hour |
| Subscriptions (new invoices) | 10/min and 20/day per subscription |
| Subscription quantity updates | 200/hour per subscription |
| Create Payout | 15 req/sec, 30 concurrent per merchant |
| Connect account creation (live) | 30 accounts/sec |
| Connect account creation (sandbox) | 5 accounts/sec |
| Meter Events | 1,000 calls/sec per account (live) |

### Read Request Allocation

- Average of 500 read requests per transaction over a rolling 30-day period
- Minimum floor: 10,000 read requests per month for all accounts

### Handling Rate Limits (429 Errors)

```python
import time
import random

def stripe_call_with_retry(func, *args, max_retries=5, **kwargs):
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except stripe.error.RateLimitError:
            if attempt == max_retries - 1:
                raise
            wait = (2 ** attempt) + random.uniform(0, 0.5)
            time.sleep(wait)
```

---

## Testing

### Test API Keys

Use keys prefixed with `sk_test_` and `pk_test_`. No real charges are created.

### Common Test Card Numbers

| Number | Scenario |
|--------|----------|
| `4242 4242 4242 4242` | Successful payment (Visa) |
| `4000 0000 0000 3220` | 3D Secure authentication required |
| `4000 0000 0000 9995` | Declined: `insufficient_funds` |
| `4000 0000 0000 0002` | Declined: generic `card_declined` |
| `4000 0000 0000 0069` | Declined: `expired_card` |
| `4000 0000 0000 0127` | Declined: `incorrect_cvc` |
| `4000 0025 0000 3155` | Requires authentication (SCA) |

For all test cards: use any future expiration date and any 3-digit CVC.

### Sandbox vs Test Mode

- **Sandbox:** Fully isolated environment; create via Dashboard. Events, webhooks, and data are separate from live.
- **Test mode:** Uses test API keys against your account's test data. Shares configuration with live mode.

### Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger specific events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

The CLI provides a webhook signing secret (`whsec_...`) for local testing.

---

## Recent Changes and Deprecations

### Clover Release (2025-09-30) -- Key Breaking Changes

**Subscriptions:**
- **Flexible billing mode is now the default** for new subscriptions. This changes lifecycle behavior, enabling mixed intervals and partial payments. Legacy behavior requires explicitly setting `billing_mode.type = "legacy"`.
- `iterations` parameter removed from subscription schedules.
- Discount objects replaced `coupon` property with new `source` property (polymorphic field).

**Checkout:**
- **Postal codes no longer auto-collected** in Canada, UK, and Puerto Rico.
- `currency_conversion` field removed from Checkout Sessions; replaced with `presentment_details`.
- `initCheckout` converted from async to synchronous operation.
- Deprecated messaging and bank elements removed from Stripe.js.

**Payments:**
- Decline codes revised for Alma, Amazon Pay, Billie, Satispay, and Korean payment methods.
- Client secret reuse prevention for certain Intent states.
- Saved payment method defaults behavior changed.

**Connect:**
- Accounts v2 API now generally available for new Connect platforms.
- Risk requirement descriptions made more specific for legal/PEP/sanctions reviews.
- Platform-specific identity fields moved to default profile in Accounts v2.

### Clover -- Notable New Features

- **Payment Records API:** Track external (non-Stripe) payments alongside Stripe payments.
- **MB WAY** (Portugal) and **PayTo** payment methods added.
- **3D Secure 2.3.0 and 2.3.1** support.
- **Custom payment methods** capability.
- **Accounts v2 for Connect:** Unified Account object for customers + merchants.
- **Digital attestation** for registration and beneficial ownership verification.
- **Invoice payment detachment:** Reopen paid invoices.
- **Forever duration** reintroduced for amount-off coupons.
- Automatic tax transaction commitment with PaymentIntents.

### Deprecations in Progress

| Item | Status | Action |
|------|--------|--------|
| Card Element | Deprecated | Migrate to Payment Element |
| Node.js 16 support | Deprecated | Removal planned March 2026 |
| Messaging/bank Stripe.js elements | Removed in Clover | Use alternatives per migration guide |
| `currency_conversion` on Checkout Sessions | Removed in Clover | Use `presentment_details` |
| `iterations` on subscription schedules | Removed in Clover | Use `end_date` instead |
| Non-namespaced services (Python SDK) | Deprecated | Use namespaced services via StripeClient |

### Migration from Basil to Clover

Review all breaking changes before upgrading your account version. Test in sandbox first. Note the 72-hour rollback window after upgrading.

Key migration items:
1. Check subscription creation code for `billing_mode` assumptions
2. Update any `currency_conversion` references to `presentment_details`
3. Review discount/coupon code for `source` vs `coupon` property changes
4. Test Checkout Sessions in CA/UK/PR markets for postal code changes
5. If using Card Element, plan migration to Payment Element

---

## Appendix: Transaction Fees

### Payment Processing (US, as of Feb 2026)

| Method | Fee |
|--------|-----|
| Online cards + digital wallets | 2.9% + $0.30 |
| Manually entered cards | 3.4% + $0.30 |
| International cards | +1.5% on top of base rate |
| Currency conversion | +1% |
| In-person (Terminal) | 2.7% + $0.05 |
| ACH Direct Debit | 0.8% (max $5) |
| ACH Credit | $1.00 flat |
| Wire transfers | $8.00 flat |
| ACH returns (failed debits) | $4.00 |

### Additional Services

| Service | Fee |
|---------|-----|
| Stripe Billing (subscriptions) | 0.7% of billing volume |
| Stripe Invoicing (Starter) | 0.4% per paid invoice |
| Stripe Connect (Express/Custom) | $2/month per active connected account |
| Stripe Tax | 0.5% per transaction |
| Stripe Radar (fraud) | Included for default rules; $0.07/txn for Radar for Fraud Teams |
| Chargebacks | $15 per dispute (waived if you win) |

### Currency Minimums

Amounts must be in the smallest currency unit. Minimum charge varies by currency:
- USD: 50 cents ($0.50)
- EUR: 50 cents
- GBP: 30 pence
- JPY: 50 yen (no decimal subdivision)

### Useful Links

- [API Reference](https://docs.stripe.com/api)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Changelog](https://docs.stripe.com/changelog)
- [Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Test Card Numbers](https://docs.stripe.com/testing)
- [Error Codes](https://docs.stripe.com/error-codes)
- [Rate Limits](https://docs.stripe.com/rate-limits)
- [Python SDK (GitHub)](https://github.com/stripe/stripe-python)
- [Node.js SDK (GitHub)](https://github.com/stripe/stripe-node)
- [Stripe.js Reference](https://docs.stripe.com/js)
