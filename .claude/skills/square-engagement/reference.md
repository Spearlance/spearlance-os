# Square Engagement APIs Developer Reference

> **Last Updated:** February 2026
> **Current API Version:** 2026-01-22
> **Base URL:** `https://connect.squareup.com/v2`
> **Sandbox:** `https://connect.squareupsandbox.com/v2`
> **Developer Portal:** `https://developer.squareup.com`

---

## Table of Contents

1. [Authentication and Setup](#authentication-and-setup)
2. [Loyalty API](#loyalty-api)
   - [Program Structure](#program-structure)
   - [Loyalty Accounts](#loyalty-accounts)
   - [Accumulate and Adjust Points](#accumulate-and-adjust-points)
   - [Rewards](#rewards)
   - [Loyalty Events](#loyalty-events)
   - [Loyalty Promotions](#loyalty-promotions)
   - [App Marketplace Requirements](#app-marketplace-requirements)
3. [Gift Cards API](#gift-cards-api)
   - [Gift Card Object](#gift-card-object)
   - [Create and Activate](#create-and-activate)
   - [Gift Card Activities API](#gift-card-activities-api)
   - [Activity Types Reference](#activity-types-reference)
   - [Orders API Integration](#orders-api-integration)
   - [Compliance Limits](#compliance-limits)
4. [Bookings API](#bookings-api)
   - [Booking Concepts](#booking-concepts)
   - [Subscription Requirements](#subscription-requirements)
   - [Search Availability](#search-availability)
   - [Create a Booking](#create-a-booking)
   - [Update and Cancel](#update-and-cancel)
   - [Booking Profiles](#booking-profiles)
   - [Booking Custom Attributes](#booking-custom-attributes)
5. [Webhooks](#webhooks)
6. [Error Handling](#error-handling)
7. [Testing in Sandbox](#testing-in-sandbox)

---

## Authentication and Setup

```bash
npm install square      # Node.js v40+
pip install square      # Python v42+
```

```typescript
import { SquareClient, SquareEnvironment } from "square";
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox, // .Production for live
});
```

```python
from square import Square
from square.environment import SquareEnvironment
client = Square(token=os.environ["SQUARE_ACCESS_TOKEN"], environment=SquareEnvironment.SANDBOX)
```

### OAuth Scopes

| Domain | Read | Write |
|--------|------|-------|
| Loyalty | `LOYALTY_READ` | `LOYALTY_WRITE` |
| Gift Cards | `GIFTCARDS_READ` | `GIFTCARDS_WRITE` |
| Bookings (buyer-level) | `APPOINTMENTS_READ` | `APPOINTMENTS_WRITE` |
| Bookings (seller-level) | `APPOINTMENTS_ALL_READ` | `APPOINTMENTS_ALL_WRITE` |

Seller-level also requires: `CUSTOMERS_READ`, `CUSTOMERS_WRITE`, `MERCHANT_PROFILE_READ`, `ITEMS_READ`.

---

## Loyalty API

### Program Structure

Loyalty programs are configured exclusively in the Square Dashboard — the API is **read-only** for program configuration. Use `RetrieveLoyaltyProgram` with the keyword `main` to get the active program.

```typescript
const { program } = await client.loyalty.retrieveLoyaltyProgram({ programId: "main" });
// program.status: ACTIVE | INACTIVE  .accrualRules[]  .rewardTiers[]  .locationIds[]
```

#### Accrual Rules

| Rule Type | How Points Earn | Key Field |
|-----------|----------------|-----------|
| `VISIT` | Per transaction (opt. min spend) | `visitData.minimumAmountMoney` |
| `SPEND` | Proportional to order amount | `spendData.amountMoney` (spend per point) |
| `ITEM_VARIATION` | Per specific SKU purchased | `itemVariationData.itemVariationId` |
| `CATEGORY` | Per item in a catalog category | `categoryData.categoryId` |

Tax treatment: before-tax in US/CA; after-tax in AU, FR, IE, JP, ES, UK.

#### Reward Tiers

Each tier has a point threshold and references a `PRICING_RULE` in the Catalog API.

```typescript
const tier = program.rewardTiers[0];
// tier.points: 100 (required to redeem)
// tier.definition.catalogObjectId → PRICING_RULE
```

---

### Loyalty Accounts

Accounts are keyed by phone number and linked to a Square customer profile.

**Create (enroll):**
```typescript
const { loyaltyAccount } = await client.loyalty.createLoyaltyAccount({
  loyaltyAccount: { programId: "loyalty_program_id", mapping: { phoneNumber: "+12065551234" } }, // E.164
  idempotencyKey: crypto.randomUUID(),
});
// loyaltyAccount.id  .balance  .lifetimePoints
```

```python
import uuid
result = client.loyalty.create_loyalty_account(
    loyalty_account={"program_id": "loyalty_program_id", "mapping": {"phone_number": "+12065551234"}},
    idempotency_key=str(uuid.uuid4()),
)
```

**Search:**
```typescript
// By phone
await client.loyalty.searchLoyaltyAccounts({ query: { mappings: [{ phoneNumber: "+12065551234" }] } });
// By customer ID
await client.loyalty.searchLoyaltyAccounts({ query: { customerIds: ["customer_id"] } });
```

---

### Accumulate and Adjust Points

**Accumulate from completed order:**
```typescript
await client.loyalty.accumulateLoyaltyPoints({
  accountId: "loyalty_account_id",
  accumulatePoints: { orderId: "order_id" },
  locationId: "location_id",
  idempotencyKey: crypto.randomUUID(),
});
```

```python
client.loyalty.accumulate_loyalty_points(
    account_id="loyalty_account_id",
    accumulate_points={"order_id": "order_id"},
    location_id="location_id",
    idempotency_key=str(uuid.uuid4()),
)
```

**Preview points before accumulating:**
```typescript
// loyaltyAccountId required for promotion point calculation
const { points, promotionPoints } = await client.loyalty.calculateLoyaltyPoints({ programId: "loyalty_program_id", orderId: "order_id", loyaltyAccountId: "loyalty_account_id" });
```

**Manual adjustment (corrections/refunds):**
```typescript
await client.loyalty.adjustLoyaltyPoints({ accountId: "loyalty_account_id",
  adjustPoints: { points: -50, reason: "Refund adjustment for order #1234" }, idempotencyKey: crypto.randomUUID() });
```

---

### Rewards

```typescript
// Issue
const { reward } = await client.loyalty.createLoyaltyReward({
  reward: { loyaltyAccountId: "loyalty_account_id", rewardTierId: "reward_tier_id", orderId: "order_id" },
  idempotencyKey: crypto.randomUUID(),
}); // reward.status: ISSUED | REDEEMED | DELETED  .redemptionCode: POS code
// Redeem
await client.loyalty.redeemLoyaltyReward({ rewardId: "reward_id", locationId: "location_id", idempotencyKey: crypto.randomUUID() });
// Search
const { rewards } = await client.loyalty.searchLoyaltyRewards({ query: { loyaltyAccountId: "loyalty_account_id", status: "ISSUED" } });
```

---

### Loyalty Events

Every balance-affecting action creates an event. Use `SearchLoyaltyEvents` for audit trails or activity feeds.

```typescript
const { events } = await client.loyalty.searchLoyaltyEvents({
  query: { filter: { loyaltyAccountFilter: { loyaltyAccountId: "loyalty_account_id" },
    typeFilter: { types: ["ACCUMULATE_POINTS", "REDEEM_REWARD", "ADJUST_POINTS"] } } },
  limit: 30,
});
```

| Event Type | Trigger |
|-----------|---------|
| `ACCUMULATE_POINTS` | Points earned from order |
| `ACCUMULATE_PROMOTION_POINTS` | Bonus from active promotion |
| `CREATE_REWARD` | Reward issued |
| `REDEEM_REWARD` | Reward applied to order |
| `DELETE_REWARD` | Reward voided |
| `ADJUST_POINTS` | Manual adjustment |
| `EXPIRE_POINTS` | Expiration policy triggered |

---

### Loyalty Promotions

Programs support up to 10 ACTIVE + SCHEDULED promotions. Promotions layer bonus points on top of base accrual rules.

```typescript
const { promotions } = await client.loyalty.listLoyaltyPromotions({
  programId: "loyalty_program_id",
  status: "ACTIVE",
});
```

`CalculateLoyaltyPoints` includes promotion points only when `loyaltyAccountId` is provided.

---

### App Marketplace Requirements

| Requirement | Rule |
|------------|------|
| Program management | Never attempt to create or update programs via API |
| Error handling | Gracefully handle sellers with no active loyalty program |
| Phone validation | Validate phone ownership before showing or redeeming rewards |
| Point adjustments | Increase on purchase, decrease on refund |
| Multi-reward orders | Track balance changes when buyer adds/removes rewards |
| Non-Orders integrations | Manually track promotion points when not using Square Orders |

---

## Gift Cards API

### Gift Card Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `type` | enum | `DIGITAL` or `PHYSICAL` |
| `gan` | string | Gift card number used for redemption |
| `gan_source` | enum | `SQUARE` (auto) or `OTHER` (custom) |
| `state` | enum | `PENDING` → `ACTIVE` → `DEACTIVATED` |
| `balance_money` | Money | Current balance |
| `customer_ids` | string[] | Linked customer profiles (max 10 per card) |

---

### Create and Activate

Cards always start `PENDING`. Must `ACTIVATE` before use.

```typescript
// Step 1 — Create
const { giftCard } = await client.giftCards.createGiftCard({
  idempotencyKey: crypto.randomUUID(),
  locationId: "location_id",
  giftCard: { type: "DIGITAL" },
});
// giftCard.state === "PENDING"

// Step 2 — Activate with opening balance
await client.giftCardActivities.createGiftCardActivity({
  idempotencyKey: crypto.randomUUID(),
  giftCardActivity: {
    type: "ACTIVATE",
    locationId: "location_id",
    giftCardId: giftCard.id,
    activateActivityDetails: { amountMoney: { amount: 5000n, currency: "USD" } },
  },
});
```

```python
import uuid
result = client.gift_cards.create_gift_card(
    idempotency_key=str(uuid.uuid4()), location_id="location_id", gift_card={"type": "DIGITAL"},
)
client.gift_card_activities.create_gift_card_activity(
    idempotency_key=str(uuid.uuid4()),
    gift_card_activity={
        "type": "ACTIVATE", "location_id": "location_id", "gift_card_id": result.gift_card.id,
        "activate_activity_details": {"amount_money": {"amount": 5000, "currency": "USD"}},
    },
)
```

**Link to customer:**
```typescript
await client.giftCards.linkCustomerToGiftCard({ giftCardId: giftCard.id, customerId: "customer_id" });
```

**Retrieve by GAN:**
```typescript
const { giftCard } = await client.giftCards.retrieveGiftCardFromGan({ gan: "7783320001001635" });
```

---

### Gift Card Activities API

All balance and state changes go through `CreateGiftCardActivity`. Provide `giftCardId` or `giftCardGan` — not both.

**Load funds:**
```typescript
await client.giftCardActivities.createGiftCardActivity({
  idempotencyKey: crypto.randomUUID(),
  giftCardActivity: {
    type: "LOAD",
    locationId: "location_id",
    giftCardId: "gift_card_id",
    loadActivityDetails: { amountMoney: { amount: 2500n, currency: "USD" } },
  },
});
```

**Deactivate (permanent) / Clear balance:**
```typescript
// DEACTIVATE: ACTIVE → DEACTIVATED (cannot reactivate)
await client.giftCardActivities.createGiftCardActivity({
  idempotencyKey: crypto.randomUUID(),
  giftCardActivity: { type: "DEACTIVATE", locationId: "location_id", giftCardId: "gift_card_id",
    deactivateActivityDetails: { reason: "SUSPICIOUS_ACTIVITY" } },
});

// CLEAR_BALANCE: resets balance to zero
await client.giftCardActivities.createGiftCardActivity({
  idempotencyKey: crypto.randomUUID(),
  giftCardActivity: { type: "CLEAR_BALANCE", locationId: "location_id", giftCardId: "gift_card_id",
    clearBalanceActivityDetails: { reason: "SUSPICIOUS_ACTIVITY" } },
});
```

**Activity history:**
```typescript
const { giftCardActivities } = await client.giftCardActivities.listGiftCardActivities({ giftCardId: "gift_card_id", limit: 50 });
```

---

### Activity Types Reference

| Activity Type | Effect | Creator |
|--------------|--------|---------|
| `ACTIVATE` | PENDING → ACTIVE, sets opening balance | Developer |
| `LOAD` | Adds funds to ACTIVE card | Developer |
| `REDEEM` | Deducts funds after payment | Square (auto) |
| `REFUND` | Returns funds from refunded transaction | Square (auto) |
| `ADJUST_INCREMENT` | Manual balance increase (non-order) | Developer |
| `ADJUST_DECREMENT` | Manual balance decrease (non-payment) | Developer |
| `CLEAR_BALANCE` | Resets balance to zero | Developer |
| `DEACTIVATE` | Permanently blocks card | Developer |
| `UNLINKED_ACTIVITY_REFUND` | Refund to a different gift card | Developer |
| `IMPORT` | Initial balance for imported cards | Developer |

Square auto-creates `REDEEM` and `REFUND` activities when Payments/Refunds APIs are used — no explicit call needed.

---

### Orders API Integration

For ACTIVATE/LOAD tied to an order, provide `orderId` + `lineItemUid` (line item must have `item_type: GIFT_CARD`). Square reads the amount from the order automatically.

```typescript
await client.giftCardActivities.createGiftCardActivity({
  idempotencyKey: crypto.randomUUID(),
  giftCardActivity: {
    type: "ACTIVATE",
    locationId: "location_id",
    giftCardId: "gift_card_id",
    activateActivityDetails: { orderId: "order_id", lineItemUid: "line_item_uid" },
  },
});
```

No application fees are allowed on gift card payments — Square returns an error.

---

### Compliance Limits

| Country | Max Card Balance | Daily Load (per payment card) |
|---------|-----------------|-------------------------------|
| US | $2,000 | $10,000 |
| CA | C$2,000 | C$10,000 |
| AU | A$2,000 | A$10,000 |
| JP | ¥200,000 | ¥1,000,000 |

Load fees in US/CA/AU: 2.5% per ACTIVATE/LOAD/ADJUST_INCREMENT. Custom GAN cards cannot receive cross-method Refunds API refunds.

---

## Bookings API

### Booking Concepts

| Concept | Definition |
|---------|-----------|
| **Booking** | A reservation for a service at a specific location and time |
| **Appointment Segment** | One service block — has a service variation, team member, and duration |
| **Availability** | Queryable inventory of open time slots |
| **Business Booking Profile** | Seller-level config: hours, cancellation policy, subscription tier |
| **Team Member Booking Profile** | Per-staff availability and display settings |

Integrates with: Locations API, Team API, Customers API, Catalog API.

---

### Subscription Requirements

| Operation | Free | Plus/Premium |
|-----------|------|-------------|
| Buyer-level reads | ✓ | ✓ |
| Buyer-level create/update/cancel | ✓ | ✓ |
| Seller-level reads (`ListBookings`) | ✗ | ✓ |
| Seller-level writes | ✗ | ✓ |

Always verify before seller-level writes:
```typescript
const { businessBookingProfile } = await client.bookings.retrieveBusinessBookingProfile();
if (!businessBookingProfile.supportSellerLevelWrites) {
  throw new Error("Seller requires Appointments Plus or Premium");
}
```

---

### Search Availability

Time range: minimum 24 hours, maximum 31 days. Already-booked slots and adjacent buffer time are excluded.

```typescript
const { availabilities } = await client.bookings.searchAvailability({
  query: {
    filter: {
      startAtRange: { startAt: "2026-03-01T00:00:00Z", endAt: "2026-03-07T23:59:59Z" },
      locationId: "location_id",
      segmentFilters: [{
        serviceVariationId: "service_variation_id",
        teamMemberIdFilter: { any: ["team_member_id"] }, // omit to search all team members
      }],
    },
  },
});
// availabilities[0].startAt  .locationId  .appointmentSegments
```

```python
result = client.bookings.search_availability(
    query={
        "filter": {
            "start_at_range": {"start_at": "2026-03-01T00:00:00Z", "end_at": "2026-03-07T23:59:59Z"},
            "location_id": "location_id",
            "segment_filters": [{"service_variation_id": "service_variation_id"}],
        }
    }
)
```

---

### Create a Booking

```typescript
const { booking } = await client.bookings.createBooking({
  idempotencyKey: crypto.randomUUID(),
  booking: {
    startAt: "2026-03-01T10:00:00Z",
    locationId: "location_id",
    customerId: "customer_id",
    customerNote: "Allergy: latex gloves",
    appointmentSegments: [{
      durationMinutes: 60,
      serviceVariationId: "service_variation_id",
      serviceVariationVersion: 1234567890, // must match catalog version
      teamMemberId: "team_member_id",
    }],
  },
});
// booking.status === "ACCEPTED"
```

```python
result = client.bookings.create_booking(
    idempotency_key=str(uuid.uuid4()),
    booking={
        "start_at": "2026-03-01T10:00:00Z",
        "location_id": "location_id",
        "customer_id": "customer_id",
        "appointment_segments": [{
            "duration_minutes": 60,
            "service_variation_id": "service_variation_id",
            "service_variation_version": 1234567890,
            "team_member_id": "team_member_id",
        }],
    },
)
```

**Multi-service booking** — multiple segments with optional intermission:
```typescript
appointmentSegments: [
  { serviceVariationId: "haircut_id", teamMemberId: "stylist_id", durationMinutes: 45, serviceVariationVersion: 111 },
  { serviceVariationId: "color_id", teamMemberId: "stylist_id", durationMinutes: 90, serviceVariationVersion: 222, intermissionMinutes: 15 },
],
```

---

### Update and Cancel

#### Booking States

| State | Meaning |
|-------|---------|
| `ACCEPTED` | Active — initial state after create |
| `PENDING` | Awaiting seller confirmation |
| `CANCELLED_BY_SELLER` | Seller cancelled |
| `CANCELLED_BY_CUSTOMER` | Customer cancelled (if policy allows) |
| `NO_SHOW` | Customer did not appear |

**Update:**
```typescript
const { booking: updated } = await client.bookings.updateBooking({
  bookingId: "booking_id",
  idempotencyKey: crypto.randomUUID(),
  booking: {
    version: booking.version, // optimistic concurrency — must match
    startAt: "2026-03-01T11:00:00Z",
    // Cannot update appointmentSegments after a deposit is made
  },
});
```

**Cancel:**
```typescript
await client.bookings.cancelBooking({
  bookingId: "booking_id",
  idempotencyKey: crypto.randomUUID(),
  bookingVersion: booking.version,
});
```

Buyer-level cancel requires cancellation to be enabled and the booking to be within the cancellation window.

---

### Booking Profiles

**Business profile** — subscription tier, cancellation policy:
```typescript
const { businessBookingProfile } = await client.bookings.retrieveBusinessBookingProfile();
// .bookingEnabled  .bookingPolicy (ACCEPT_ALL | REQUIRES_ACCEPTANCE)
// .cancellationPolicy.cancellationWindowSeconds
// .supportSellerLevelWrites
```

**Team member profiles** — which staff are bookable:
```typescript
const { teamMemberBookingProfiles } = await client.bookings.listTeamMemberBookingProfiles({
  bookableOnly: true,
});
// profile.isBookingEnabled  .displayName  .description
```

**Customer profile:**
```typescript
const { customerBookingProfile } = await client.bookings.retrieveCustomerBookingProfile({
  customerId: "customer_id",
});
// .isAbleToBook  .createdAt
```

---

### Booking Custom Attributes

Attach metadata (e.g., intake form IDs, internal notes) to bookings.

**Define once:**
```typescript
await client.bookingCustomAttributes.createBookingCustomAttributeDefinition({
  customAttributeDefinition: {
    key: "intake_form_id",
    name: "Intake Form ID",
    inputType: "STRING",
    visibility: "VISIBILITY_READ_ONLY",
  },
  idempotencyKey: crypto.randomUUID(),
});
```

**Set on a booking:**
```typescript
await client.bookingCustomAttributes.upsertBookingCustomAttribute({
  bookingId: "booking_id",
  key: "intake_form_id",
  customAttribute: { value: "form_abc123" },
  idempotencyKey: crypto.randomUUID(),
});
```

**Read from a booking:**
```typescript
const { customAttribute } = await client.bookingCustomAttributes.retrieveBookingCustomAttribute({
  bookingId: "booking_id",
  key: "intake_form_id",
});
```

---

## Webhooks

### Loyalty

| Event | Trigger |
|-------|---------|
| `loyalty.account.created` | New loyalty account enrolled |
| `loyalty.account.updated` | Balance, phone, or status changed |
| `loyalty.event.created` | Any balance-affecting transaction |

### Gift Cards

| Event | Trigger |
|-------|---------|
| `gift_card.created` | Card created (PENDING) |
| `gift_card.updated` | State or balance changed |
| `gift_card.customer_linked` | Customer linked |
| `gift_card_activity.created` | Any activity created |

### Bookings

| Event | Trigger |
|-------|---------|
| `booking.created` | New booking |
| `booking.updated` | Booking modified |
| `booking.cancelled` | Booking cancelled |

Seller-level subscriptions (Plus/Premium) emit events for ALL bookings. Buyer-level subscriptions emit events only for bookings created by your application.

---

## Error Handling

| Code | Domain | Cause | Fix |
|------|--------|-------|-----|
| `LOYALTY_PROGRAM_NOT_FOUND` | Loyalty | No active loyalty program | Check `program.status === "ACTIVE"` first |
| `LOYALTY_ACCOUNT_NOT_FOUND` | Loyalty | Account ID invalid | Verify with `SearchLoyaltyAccounts` |
| `INSUFFICIENT_POINTS` | Loyalty | Not enough points for reward | Check `account.balance` before creating reward |
| `GIFT_CARD_ALREADY_ACTIVE` | Gift Cards | ACTIVATE on already-active card | Check `giftCard.state` before activating |
| `GIFT_CARD_DEACTIVATED` | Gift Cards | Operation on deactivated card | DEACTIVATED is permanent — cannot reactivate |
| `BALANCE_EXCEEDED` | Gift Cards | Load would breach compliance limit | Enforce country max balance before loading |
| `BOOKING_VERSION_MISMATCH` | Bookings | Stale version in update/cancel | Re-fetch booking, use current `version` |
| `SELLER_LEVEL_WRITE_NOT_ALLOWED` | Bookings | No paid subscription | Check `supportSellerLevelWrites` first |

```typescript
try {
  await client.loyalty.accumulateLoyaltyPoints({ ... });
} catch (error) {
  if (error.errors) {
    for (const e of error.errors) console.error(`${e.category}/${e.code}: ${e.detail}`);
  }
}
```

```python
from square.core.api_error import ApiError
try:
    client.loyalty.accumulate_loyalty_points(...)
except ApiError as e:
    for error in e.errors:
        print(f"{error.category}/{error.code}: {error.detail}")
```

---

## Testing in Sandbox

| Domain | Sandbox Notes |
|--------|--------------|
| Loyalty | Create test programs in Sandbox Dashboard; no real SMS sent |
| Gift Cards | DIGITAL only — physical cards not testable in Sandbox |
| Gift Cards | Load fees do not apply in Sandbox |
| Bookings | Full CRUD works; requires catalog items and team members in Sandbox Dashboard |
| Bookings | Seller-level writes still require Plus/Premium on the sandbox seller account |

Sandbox Dashboard: `https://squareupsandbox.com/dashboard`
