# Square Terminal API Developer Reference

> **Last Updated:** February 2026
> **Current API Version:** 2026-01-22
> **Base URL:** `https://connect.squareup.com/v2`
> **Sandbox URL:** `https://connect.squareupsandbox.com/v2`

---

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication and Client Libraries](#authentication-and-client-libraries)
3. [Device Pairing (Devices API)](#device-pairing-devices-api)
4. [Terminal Checkout](#terminal-checkout)
5. [Terminal Actions (Beta)](#terminal-actions-beta)
6. [Hardware and Connectivity](#hardware-and-connectivity)
7. [POS Integration Patterns](#pos-integration-patterns)
8. [Webhooks](#webhooks)
9. [Card Surcharge (New in 2026-01-22)](#card-surcharge-new-in-2026-01-22)
10. [Required OAuth Permissions](#required-oauth-permissions)
11. [Error Handling](#error-handling)
12. [Testing in Sandbox](#testing-in-sandbox)
13. [Retired APIs (as of 2026-01-22)](#retired-apis-as-of-2026-01-22)
14. [API Endpoint Quick Reference](#api-endpoint-quick-reference)

---

## Architecture

All communication flows through Square's servers. **No direct connection between POS app and Terminal hardware.**

```
POS Application  ──HTTPS──>  Square Servers  ──WiFi──>  Square Terminal
POS Application  <──webhook── Square Servers  <─────────  Square Terminal
```

Key rules:
- POS app and Terminal must share the same Square account and location
- Terminal requires active WiFi at all times during payment processing
- Checkout records persist 30 days; the `Payment` object is the permanent record
- Only use device codes created by `CreateDeviceCode` — Dashboard codes do not work

---

## Authentication and Client Libraries

### SDK Initialization

**Node.js (v40+):**
```typescript
import { SquareClient, SquareEnvironment } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,   // or Production
});
```

**Python (v42+):**
```python
from square import Square
from square.environment import SquareEnvironment

client = Square(
    token=os.environ["SQUARE_ACCESS_TOKEN"],
    environment=SquareEnvironment.SANDBOX,  # or PRODUCTION
)
```

**Install:**
```bash
npm install square         # Node.js v40+
pip install squareup       # Python v42+
```

**Never use** the legacy `squareconnect` package or `SquareConnect` class — retired.

### HTTP Headers (Direct Calls)

```
Authorization: Bearer <access_token>
Square-Version: 2026-01-22
Content-Type: application/json
```

---

## Device Pairing (Devices API)

### Device Code Lifecycle

```
CreateDeviceCode → UNPAIRED → (seller enters code within 5 min) → PAIRED → device_id returned
                                                                 → EXPIRED (5-min timeout)
```

| Status | Meaning |
|--------|---------|
| `UNPAIRED` | Code created, not yet entered on Terminal |
| `PAIRED` | Terminal signed in, `device_id` available |
| `EXPIRED` | Unused after 5 minutes — create a new code |
| `REVOKED` | Manually invalidated |

### CreateDeviceCode

**POST** `/v2/devices/codes` — Permission: `DEVICE_CREDENTIAL_MANAGEMENT`

**Node.js:**
```typescript
import crypto from "crypto";

const response = await client.devices.codes.create({
  idempotencyKey: crypto.randomUUID(),
  deviceCode: {
    name: "Counter 1",            // Friendly name shown in Dashboard
    productType: "TERMINAL_API",  // Always TERMINAL_API
    locationId: process.env.SQUARE_LOCATION_ID,
  },
});

const { id, code, pairBy } = response.deviceCode!;
// Display code to seller — they type it on the Terminal within 5 min
// Store id for polling or webhook matching
```

**Python:**
```python
import uuid

result = client.devices.codes.create(
    idempotency_key=str(uuid.uuid4()),
    device_code={
        "name": "Counter 1",
        "product_type": "TERMINAL_API",
        "location_id": os.environ["SQUARE_LOCATION_ID"],
    }
)
code = result.device_code.code
device_code_id = result.device_code.id
```

### Poll for Pairing Status

```typescript
async function waitForPairing(deviceCodeId: string): Promise<string | null> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const { deviceCode } = await client.devices.codes.get(deviceCodeId);
    if (deviceCode!.status === "PAIRED") return deviceCode!.deviceId!;
    if (deviceCode!.status === "EXPIRED") return null;
  }
  return null;
}
```

### DeviceCode Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Device code identifier |
| `code` | string | Code seller types on Terminal |
| `status` | enum | UNPAIRED, PAIRED, EXPIRED, REVOKED |
| `device_id` | string | Terminal device ID (set after pairing) |
| `pair_by` | RFC 3339 | Expiration (5 min after creation) |
| `location_id` | string | Location scope |
| `name` | string | Friendly device name |
| `product_type` | string | Always "TERMINAL_API" |

---

## Terminal Checkout

### Checkout Flow

```
CreateTerminalCheckout → PENDING → IN_PROGRESS (Terminal received)
    → COMPLETED (buyer paid) → Payment object created
    → CANCELED
```

### CreateTerminalCheckout

**POST** `/v2/terminals/checkouts` — Permission: `PAYMENTS_WRITE`

**Node.js:**
```typescript
const response = await client.terminal.checkouts.create({
  idempotencyKey: crypto.randomUUID(),
  checkout: {
    amountMoney: {
      amount: BigInt(2500),  // $25.00 — always cents, use BigInt in Node SDK
      currency: "USD",
    },
    referenceId: "order_abc123",
    note: "Table 4 order",
    deviceOptions: {
      deviceId: process.env.SQUARE_DEVICE_ID,
      skipReceiptScreen: false,
      collectSignature: false,
      tipSettings: {
        allowTipping: true,
        separateTipScreen: true,
        customTipField: true,
        tipPercentages: [15, 18, 20, 25],  // max 4 values, 0–100
      },
    },
  },
});
const checkout = response.checkout!;
// checkout.status === "PENDING"
```

**Python:**
```python
result = client.terminal.checkouts.create(
    idempotency_key=str(uuid.uuid4()),
    checkout={
        "amount_money": {"amount": 2500, "currency": "USD"},
        "reference_id": "order_abc123",
        "device_options": {
            "device_id": os.environ["SQUARE_DEVICE_ID"],
            "tip_settings": {
                "allow_tipping": True,
                "separate_tip_screen": True,
                "tip_percentages": [15, 18, 20, 25],
            },
        },
    }
)
checkout = result.checkout
```

### Checkout States

| Status | Meaning | Cancelable? |
|--------|---------|-------------|
| `PENDING` | Request created, not reached Terminal | Yes |
| `IN_PROGRESS` | Terminal received, buyer interacting | Yes |
| `COMPLETED` | Payment collected | No |
| `CANCELED` | Canceled by POS, seller, or buyer | No |
| `CANCEL_REQUESTED` | Cancel in flight | No |

### Retrieve, Cancel, and Search

```typescript
// Always fetch Payment after COMPLETED — tip changes the total
const { checkout } = await client.terminal.checkouts.get(checkoutId);
if (checkout!.status === "COMPLETED" && checkout!.paymentIds?.length) {
  const { payment } = await client.payments.get(checkout!.paymentIds![0]);
  const actual = payment!.totalMoney!.amount;  // Includes tip
}

// Cancel — only PENDING or IN_PROGRESS
await client.terminal.checkouts.cancel(checkoutId);

// Search
const { checkouts } = await client.terminal.checkouts.search({
  query: {
    filter: {
      deviceId: process.env.SQUARE_DEVICE_ID,
      status: "COMPLETED",
      createdAt: { startAt: "2026-02-01T00:00:00Z", endAt: "2026-02-22T23:59:59Z" },
    },
    sort: { sortOrder: "DESC" },
  },
  limit: 50,
});
```

---

## Terminal Actions (Beta)

Non-payment interactions sent to a paired Terminal.

### Action Types

| Type | Description |
|------|-------------|
| `PING` | Check if Terminal is online |
| `SAVE_CARD` | Store card on file without charging |
| `CONFIRMATION` | Display custom message, capture acknowledgment |
| `DATA_COLLECTION` | Capture custom form data from buyer |
| `SELECT` | Present selection options to buyer |
| `RECEIPT` | Launch receipt options screen |

### Action Lifecycle

```
PENDING → IN_PROGRESS → COMPLETED
                      → CANCELED
                      → FAILED
```

### Create a Terminal Action

```typescript
// PING — check device is online
await client.terminal.actions.create({
  idempotencyKey: crypto.randomUUID(),
  action: { deviceId: process.env.SQUARE_DEVICE_ID, type: "PING" },
});

// SAVE_CARD — store card without charging
await client.terminal.actions.create({
  idempotencyKey: crypto.randomUUID(),
  action: {
    deviceId: process.env.SQUARE_DEVICE_ID,
    type: "SAVE_CARD",
    saveCardOptions: { customerId: "CUST_123", referenceId: "card_save_456" },
  },
});
```

---

## Hardware and Connectivity

### Supported Devices

| Device | Notes |
|--------|-------|
| Square Terminal | Primary device for Terminal API |
| Square Register | Dual-screen countertop; customer display built in |

Not supported: Square Reader, Square Stand — use In-App Payments SDK for those.

### Accepted Payment Types

| Type | Notes |
|------|-------|
| Credit / debit (chip) | EMV tap or insert |
| Magnetic stripe | Fallback swipe |
| NFC contactless | Apple Pay, Google Pay |
| Square Gift Cards | Full support |
| Cash | **Not supported** — use Payments API |
| PayPay / e-money | Japan only |

### Connectivity Requirements

- WiFi required — Terminal connects to Square servers directly
- Keep Terminal software current: Settings > General > About Terminal
- No LAN-only operation — active internet required

---

## POS Integration Patterns

### Webhooks vs Polling

| Approach | Latency | When |
|----------|---------|------|
| Webhooks | Near real-time | Production — preferred |
| Poll `GetTerminalCheckout` | 2–5 sec | Fallback / timeout safety net |

Implement both: webhooks primary, poll as deadline guard.

### Polling Safety Net

```typescript
async function pollCheckout(checkoutId: string, timeoutMs = 120_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const { checkout } = await client.terminal.checkouts.get(checkoutId);
    if (["COMPLETED", "CANCELED"].includes(checkout!.status!)) return checkout!.status!;
  }
  throw new Error("Checkout timed out");
}
```

### Idempotency Keys

All `Create*` endpoints require `idempotency_key`. Use a fresh V4 UUID per request: `crypto.randomUUID()` (Node) or `str(uuid.uuid4())` (Python).

---

## Webhooks

### Supported Events

| Event | Trigger |
|-------|---------|
| `device.code.paired` | Terminal successfully paired |
| `terminal.checkout.created` | New checkout acknowledged |
| `terminal.checkout.updated` | Checkout status changed |
| `terminal.action.created` | Terminal Action created |
| `terminal.action.updated` | Terminal Action status changed |

### Webhook Handler

**Node.js (Express):**
```typescript
import { WebhooksHelper } from "square";
app.use(express.raw({ type: "application/json" }));  // Raw body required

app.post("/webhooks/square", (req, res) => {
  const body = req.body.toString("utf8");
  const isValid = WebhooksHelper.isValidWebhookEventSignature(
    body, req.headers["x-square-hmacsha256-signature"] as string,
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!, "https://yourapp.com/webhooks/square"
  );
  if (!isValid) return res.status(400).send("Invalid signature");

  const event = JSON.parse(body);
  if (event.type === "terminal.checkout.updated") {
    const checkout = event.data.object.checkout;
    handleCheckoutUpdate(checkout.id, checkout.status, checkout.payment_ids);
  }
  res.status(200).json({ received: true });
});
```

**Python (Flask):**
```python
from square.utilities.webhooks_helper import WebhooksHelper

@app.route("/webhooks/square", methods=["POST"])
def square_webhook():
    body = request.get_data(as_text=True)
    is_valid = WebhooksHelper.is_valid_webhook_event_signature(
        body, request.headers.get("X-Square-Hmacsha256-Signature"),
        os.environ["SQUARE_WEBHOOK_SIGNATURE_KEY"], "https://yourapp.com/webhooks/square"
    )
    if not is_valid:
        return "Invalid signature", 400
    event = request.get_json(force=True)
    if event["type"] == "terminal.checkout.updated":
        checkout = event["data"]["object"]["checkout"]
        handle_checkout_update(checkout["id"], checkout["status"])
    return jsonify({"received": True}), 200
```

Always verify `X-Square-Hmacsha256-Signature`. Return 200 within 5 seconds. Use `event_id` to deduplicate.

---

## Card Surcharge (New in 2026-01-22)

Allows merchants to pass card processing fees to buyers at the point of sale.

**Requirements:**
- US merchants only
- Not applicable to debit card transactions
- Surcharge percentage must comply with card network rules (typically max 4%)
- Prohibited in some US states — verify local law

**Node.js:**
```typescript
const response = await client.terminal.checkouts.create({
  idempotencyKey: crypto.randomUUID(),
  checkout: {
    amountMoney: { amount: BigInt(10000), currency: "USD" },
    referenceId: "order_xyz",
    deviceOptions: { deviceId: process.env.SQUARE_DEVICE_ID },
    appFeeMoney: { amount: BigInt(300), currency: "USD" },  // $3.00 surcharge
  },
});
```

**Python:**
```python
result = client.terminal.checkouts.create(
    idempotency_key=str(uuid.uuid4()),
    checkout={
        "amount_money": {"amount": 10000, "currency": "USD"},
        "device_options": {"device_id": os.environ["SQUARE_DEVICE_ID"]},
        "app_fee_money": {"amount": 300, "currency": "USD"},
    }
)
```

`PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS` permission required for `app_fee_money`.

---

## Required OAuth Permissions

| Permission | Required For |
|-----------|-------------|
| `DEVICE_CREDENTIAL_MANAGEMENT` | CreateDeviceCode, GetDeviceCode, ListDeviceCodes |
| `PAYMENTS_WRITE` | CreateTerminalCheckout, CancelTerminalCheckout |
| `PAYMENTS_READ` | GetTerminalCheckout, SearchTerminalCheckouts |
| `PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS` | Checkouts with `app_fee_money` |
| `MERCHANT_PROFILE_READ` | Recommended — read location and merchant info |

---

## Error Handling

### Common Error Codes

| Code | HTTP | Fix |
|------|------|-----|
| `INVALID_FEES` | 400 | Reduce `app_fee_money` |
| `INVALID_LOCATION` | 400 | Verify location is payment-activated |
| `DEVICE_OFFLINE` | 400 | Check Terminal WiFi, retry |
| `DEVICE_NOT_FOUND` | 404 | Re-pair the device |
| `CHECKOUT_EXPIRED` | 400 | Create a new checkout |
| `UNAUTHORIZED` | 401 | Refresh OAuth token |
| `FORBIDDEN` | 403 | Add missing OAuth scope |
| `CONFLICT` | 409 | Use a new idempotency key |

### Error Response Structure

```json
{
  "errors": [
    {
      "category": "INVALID_REQUEST_ERROR",
      "code": "INVALID_FEES",
      "detail": "App fee amount exceeds allowed maximum.",
      "field": "checkout.app_fee_money"
    }
  ]
}
```

### Error Handling Pattern

```typescript
const response = await client.terminal.checkouts.create({ ... });
if (response.errors?.length) {
  response.errors.forEach(e => console.error(`${e.code}: ${e.detail}`));
  return;
}
const checkout = response.checkout!;
```

```python
result = client.terminal.checkouts.create(...)
if result.errors:
    for e in result.errors:
        print(f"{e['code']}: {e['detail']}")
else:
    checkout = result.checkout
```

---

## Testing in Sandbox

- Use `SquareEnvironment.Sandbox` / `SquareEnvironment.SANDBOX`
- Sandbox credentials are in the Developer Dashboard > Sandbox tab
- Use the **Square Terminal Simulator** app to simulate device pairing and payment flows
- Webhooks require a publicly accessible URL — use ngrok or similar for local dev
- Sandbox data is fully isolated from production

---

## Retired APIs (as of 2026-01-22)

| API | Status | Migration |
|-----|--------|-----------|
| Mobile Authorization API | Retired | Use OAuth flow directly |
| Reader SDK | Retired | Use In-App Payments SDK (mobile) or Terminal API (hardware) |

**Do not use** `SQRDCheckoutController`, `SQRDReaderSDK`, or any Mobile Authorization endpoint. Fully removed.

---

## API Endpoint Quick Reference

| Operation | Method | Path |
|-----------|--------|------|
| Create device code | POST | `/v2/devices/codes` |
| Get device code | GET | `/v2/devices/codes/{id}` |
| List device codes | GET | `/v2/devices/codes` |
| Create terminal checkout | POST | `/v2/terminals/checkouts` |
| Get terminal checkout | GET | `/v2/terminals/checkouts/{checkout_id}` |
| Search terminal checkouts | POST | `/v2/terminals/checkouts/search` |
| Cancel terminal checkout | POST | `/v2/terminals/checkouts/{checkout_id}/cancel` |
| Create terminal action | POST | `/v2/terminals/actions` |
| Get terminal action | GET | `/v2/terminals/actions/{action_id}` |
| Search terminal actions | POST | `/v2/terminals/actions/search` |
| Cancel terminal action | POST | `/v2/terminals/actions/{action_id}/cancel` |

### Amount Formatting

All amounts in smallest currency unit (cents for USD). Use `BigInt` in the Node.js SDK.

```typescript
amountMoney: { amount: BigInt(2500), currency: "USD" }  // $25.00
```

```python
"amount_money": {"amount": 2500, "currency": "USD"}  # $25.00
```

### Useful Links

- [Terminal API Reference](https://developer.squareup.com/reference/square/terminal-api)
- [Devices API Reference](https://developer.squareup.com/reference/square/devices-api)
- [Developer Dashboard](https://developer.squareup.com/apps)
- [Webhook Events](https://developer.squareup.com/docs/webhooks/v2events)
- [OAuth Guide](https://developer.squareup.com/docs/oauth-api/overview)
- [API Changelog](https://developer.squareup.com/docs/changelog/connect)
- [Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [Python SDK](https://github.com/square/square-python-sdk)
