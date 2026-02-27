---
model: claude-sonnet-4-6
name: square-catalog
description: Use when working with Square Catalog API for item management, categories, modifiers, images, or pricing. Also use when working with Square Inventory API for stock tracking, batch adjustments, or inventory counts.
---

# Square Catalog & Inventory

## Quick Reference

| Item | Value |
|------|-------|
| **API Version** | `2026-01-22` |
| **Node.js SDK** | `npm install square` (v44.x) |
| **Python SDK** | `pip install squareup` (v44.x) |
| **Auth** | `SQUARE_ACCESS_TOKEN` env var |
| **Permissions** | `ITEMS_READ/WRITE`, `INVENTORY_READ/WRITE` |
| **Amounts** | Integers (cents); Node.js requires `BigInt` |

## SDK Init

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

## Create Item with Variations

```typescript
const { idMappings } = await client.catalog.upsertCatalogObject({
  idempotencyKey: crypto.randomUUID(),
  object: {
    type: "ITEM",
    id: "#coffee",
    itemData: {
      name: "Cold Brew",
      kitchenName: "CB",
      buyerFacingName: "Cold Brew Coffee",
      variations: [
        {
          type: "ITEM_VARIATION",
          id: "#coffee-sm",
          itemVariationData: {
            itemId: "#coffee",
            name: "Small",
            pricingType: "FIXED_PRICING",
            priceMoney: { amount: BigInt(450), currency: "USD" },
            trackInventory: true,
          },
        },
      ],
    },
  },
});
```

## Adjust Inventory

```typescript
await client.inventory.batchChangeInventory({
  idempotencyKey: crypto.randomUUID(),
  changes: [{
    type: "PHYSICAL_COUNT",
    physicalCount: {
      referenceId: crypto.randomUUID(),
      catalogObjectId: "VARIATION_ID",
      state: "IN_STOCK",
      locationId: "LOCATION_ID",
      quantity: "50",
      occurredAt: new Date().toISOString(),
    },
  }],
});
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Sparse updates | Send full object every time — omitted fields reset to defaults |
| Missing `trackInventory: true` | Default is `false`; omitting it disables tracking silently |
| Amounts as floats/strings | Integers only; Node.js requires `BigInt` |
| Positional SDK params | Named params only: `{ idempotencyKey, object }` |
| Calculated counts as PHYSICAL_COUNT | Use `ADJUSTMENT` for sales; PHYSICAL_COUNT = actual on-hand only |
| Missing `occurredAt` | RFC 3339 timestamp required on every inventory change |

## Full Reference

See `reference.md` for: object hierarchy, CRUD, batch ops, search, images, modifiers, taxes, inventory states, KDS fields, cross-API integration, error codes, and rate limits.
