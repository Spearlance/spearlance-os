# Square Catalog & Inventory API Developer Reference

> **Last Updated:** February 2026
> **API Version:** 2026-01-22
> **Base URL:** `https://connect.squareup.com/v2`
> **Developer Portal:** `https://developer.squareup.com`

---

## Table of Contents

1. [Authentication and Setup](#authentication-and-setup)
2. [SDK Installation](#sdk-installation)
3. [Catalog Object Hierarchy](#catalog-object-hierarchy)
4. [Catalog CRUD Operations](#catalog-crud-operations)
5. [Batch Operations](#batch-operations)
6. [Search Catalog](#search-catalog)
7. [Catalog Images](#catalog-images)
8. [Modifiers, Taxes, and Discounts](#modifiers-taxes-and-discounts)
9. [Inventory API](#inventory-api)
10. [Kitchen Display System Fields](#kitchen-display-system-fields)
11. [Cross-API Integration](#cross-api-integration)
12. [Error Handling](#error-handling)
13. [Rate Limits and Testing](#rate-limits-and-testing)
14. [Recent Changes (2026-01-22)](#recent-changes-2026-01-22)

---

## Authentication and Setup

| Key Type | Environment | Source |
|----------|-------------|--------|
| Sandbox access token | Dev/testing | Square Developer Dashboard |
| Production access token | Live | Square Developer Dashboard |
| OAuth token | Customer accounts | OAuth 2.0 flow |

All tokens: `Authorization: Bearer <token>`

### Required Permissions

| Scope | Grants |
|-------|--------|
| `ITEMS_READ` | Read, search, retrieve catalog objects |
| `ITEMS_WRITE` | Create, update, delete catalog objects |
| `INVENTORY_READ` | Read counts and history |
| `INVENTORY_WRITE` | Adjust inventory, set physical counts |

---

## SDK Installation

### Node.js (v44.x)

```bash
npm install square  # Requires Node.js 18+
```

```typescript
import { SquareClient, SquareEnvironment } from "square";

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,  // or SquareEnvironment.Production
});
```

**BigInt required** for all `price_money.amount` in Node.js:

```typescript
priceMoney: { amount: BigInt(500), currency: "USD" }  // $5.00
```

### Python (v44.x)

```bash
pip install squareup  # Requires Python 3.8+
```

```python
import os
from square import Square
from square.environment import SquareEnvironment

client = Square(
    token=os.environ["SQUARE_ACCESS_TOKEN"],
    environment=SquareEnvironment.SANDBOX,
)
```

Python uses snake_case for all field names (`item_data`, `price_money`, `idempotency_key`). Node.js uses camelCase (`itemData`, `priceMoney`, `idempotencyKey`).

---

## Catalog Object Hierarchy

Every catalog entity is a `CatalogObject` with a `type` discriminator and corresponding `*_data` payload.

```
ITEM
├── ITEM_VARIATION  (required: min 1, max 250 per item)
├── CATEGORY        (referenced by ID in item)
├── TAX             (referenced by IDs array in item)
├── DISCOUNT        (referenced by IDs array)
├── IMAGE           (referenced by IDs array)
└── MODIFIER_LIST
    └── MODIFIER    (nested within MODIFIER_LIST)
```

### CatalogObject Base Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Server-generated; use `#temp` prefix for new objects |
| `type` | string | `ITEM`, `ITEM_VARIATION`, `CATEGORY`, etc. |
| `updated_at` | RFC 3339 | Read-only |
| `version` | int64 | Increments on each update; required for updates |
| `is_deleted` | boolean | Soft-delete flag |
| `present_at_all_locations` | boolean | Defaults true |

### CatalogItem Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Required, max 512 chars |
| `description_html` | string | HTML, max 65,535 chars |
| `description_plaintext` | string | Read-only; server-strips HTML |
| `abbreviation` | string | Max 5 chars, shown on POS |
| `buyer_facing_name` | string | Customer-visible override (new 2026-01-22) |
| `kitchen_name` | string | KDS display name — beta (new 2026-01-22) |
| `variations` | array | Required, min 1, max 250 |
| `categories` | array | Current category links |
| `tax_ids` | string[] | IDs of applicable TAX objects |
| `modifier_list_info` | array | Applicable modifier lists |
| `image_ids` | string[] | Associated IMAGE IDs (beta) |
| `product_type` | string | Immutable after creation |
| `is_archived` | boolean | Hides from active catalog |
| `is_taxable` | boolean | Defaults true |

### CatalogItemVariation Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `item_id` | string | Parent item ID (required) |
| `name` | string | Max 255 chars |
| `sku` | string | Stock keeping unit |
| `upc` | string | 12-14 digits |
| `pricing_type` | string | `FIXED_PRICING` or `VARIABLE_PRICING` |
| `price_money` | Money | Required if `FIXED_PRICING` |
| `track_inventory` | boolean | Defaults `false` — set explicitly |
| `inventory_alert_type` | string | `LOW_QUANTITY` or `NONE` |
| `inventory_alert_threshold` | int64 | Quantity trigger for alert |
| `service_duration` | int64 | Milliseconds; for appointments |
| `available_for_booking` | boolean | Appointments availability |
| `kitchen_name` | string | Variation-level KDS override (new 2026-01-22) |
| `location_overrides` | array | Per-location price/inventory |
| `image_ids` | string[] | Square Online images |

---

## Catalog CRUD Operations

### UpsertCatalogObject — Create or Update

`POST /v2/catalog/object`

- New objects: `id` must start with `#`
- Updates: provide real server ID + current `version`
- **Sparse updates NOT supported** — send the full object every time
- `idempotency_key`: UUID, 1-128 chars

**Node.js — create item with variations:**
```typescript
const { catalogObject, idMappings } = await client.catalog.upsertCatalogObject({
  idempotencyKey: crypto.randomUUID(),
  object: {
    type: "ITEM",
    id: "#coffee",
    itemData: {
      name: "Cold Brew Coffee",
      descriptionHtml: "<p>12-hour cold steep</p>",
      taxIds: ["TAX_ID"],
      kitchenName: "CB",
      buyerFacingName: "Cold Brew",
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
            sku: "CB-SM",
          },
        },
        {
          type: "ITEM_VARIATION",
          id: "#coffee-lg",
          itemVariationData: {
            itemId: "#coffee",
            name: "Large",
            pricingType: "FIXED_PRICING",
            priceMoney: { amount: BigInt(625), currency: "USD" },
            trackInventory: true,
            sku: "CB-LG",
          },
        },
      ],
    },
  },
});

// Map temp IDs to server IDs
const itemId = idMappings?.find(m => m.clientObjectId === "#coffee")?.objectId;
```

**Python:**
```python
import uuid

response = client.catalog.upsert_catalog_object(
    idempotency_key=str(uuid.uuid4()),
    object={
        "type": "ITEM",
        "id": "#coffee",
        "item_data": {
            "name": "Cold Brew Coffee",
            "tax_ids": ["TAX_ID"],
            "kitchen_name": "CB",
            "buyer_facing_name": "Cold Brew",
            "variations": [
                {
                    "type": "ITEM_VARIATION",
                    "id": "#coffee-sm",
                    "item_variation_data": {
                        "item_id": "#coffee",
                        "name": "Small",
                        "pricing_type": "FIXED_PRICING",
                        "price_money": {"amount": 450, "currency": "USD"},
                        "track_inventory": True,
                        "sku": "CB-SM",
                    },
                }
            ],
        },
    },
)
```

### Update an Existing Item

Always retrieve first — sparse updates fail silently by resetting omitted fields.

```typescript
const { object: existing } = await client.catalog.retrieveCatalogObject({
  objectId: "ITEM_ID",
});

await client.catalog.upsertCatalogObject({
  idempotencyKey: crypto.randomUUID(),
  object: {
    ...existing,
    itemData: { ...existing.itemData, name: "New Name" },
  },
});
```

### DeleteCatalogObject

`DELETE /v2/catalog/object/{object_id}`

Deleting an ITEM also deletes its ITEM_VARIATIONs. Deleting CATEGORY or TAX does not cascade to referencing items.

```typescript
const { deletedObjectIds } = await client.catalog.deleteCatalogObject({
  objectId: "ITEM_ID",
});
```

---

## Batch Operations

All batch operations are atomic — all succeed or all fail within a batch.

### BatchUpsertCatalogObjects

`POST /v2/catalog/batch-upsert`

| Limit | Value |
|-------|-------|
| Objects per batch | 1,000 |
| Total objects per request | 10,000 |
| Concurrent per seller | 1 (queued) |

Use `#`-prefixed IDs to cross-reference within the same batch (e.g., variation referencing its parent item).

```typescript
const response = await client.catalog.batchUpsertCatalogObjects({
  idempotencyKey: crypto.randomUUID(),
  batches: [
    {
      objects: [
        {
          type: "CATEGORY",
          id: "#cat-drinks",
          categoryData: { name: "Drinks" },
        },
        {
          type: "ITEM",
          id: "#latte",
          itemData: {
            name: "Latte",
            categories: [{ id: "#cat-drinks" }],
            variations: [
              {
                type: "ITEM_VARIATION",
                id: "#latte-12oz",
                itemVariationData: {
                  itemId: "#latte",
                  name: "12 oz",
                  pricingType: "FIXED_PRICING",
                  priceMoney: { amount: BigInt(550), currency: "USD" },
                  trackInventory: true,
                },
              },
            ],
          },
        },
      ],
    },
  ],
});

// response.idMappings: all #temp → real ID mappings
```

### BatchRetrieveCatalogObjects

```typescript
const { objects } = await client.catalog.batchRetrieveCatalogObjects({
  objectIds: ["ID1", "ID2", "ID3"],
  includeRelatedObjects: true,
});
```

### BatchDeleteCatalogObjects

```typescript
const { deletedObjectIds } = await client.catalog.batchDeleteCatalogObjects({
  objectIds: ["ID1", "ID2"],
});
```

---

## Search Catalog

### SearchCatalogObjects

`POST /v2/catalog/search` — searches any object type

| Query Type | Matches |
|------------|---------|
| `textQuery` | Full-text across searchable fields (names, descriptions) |
| `exactQuery` | Exact attribute value |
| `prefixQuery` | Attribute starts with prefix |
| `rangeQuery` | Numeric range on attribute |
| `setQuery` | Attribute value in set |

```typescript
const { objects, cursor } = await client.catalog.searchCatalogObjects({
  objectTypes: ["ITEM"],
  query: { textQuery: { keywords: ["coffee"] } },
  includeRelatedObjects: true,
  beginTime: "2026-01-01T00:00:00Z",  // modified after
  limit: 100,
});

// Paginate
while (cursor) {
  const page = await client.catalog.searchCatalogObjects({ objectTypes: ["ITEM"], cursor });
  cursor = page.cursor;
}
```

### SearchCatalogItems

`POST /v2/catalog/search-catalog-items` — items only, richer filters

| Parameter | Type | Notes |
|-----------|------|-------|
| `textFilter` | string | Names, descriptions, SKUs, UPCs |
| `categoryIds` | string[] | Filter by category |
| `enabledLocationIds` | string[] | Available at location |
| `stockLevels` | string[] | `"OUT"` or `"LOW"` |
| `customAttributeFilters` | array | Up to 10 conditions |
| `archivedState` | string | `NOT_ARCHIVED`, `ARCHIVED`, `ALL` |
| `limit` | integer | Max 100 per page |

```typescript
const { items } = await client.catalog.searchCatalogItems({
  textFilter: "latte",
  categoryIds: ["CATEGORY_ID"],
  stockLevels: ["OUT"],
  limit: 100,
});
```

### ListCatalog

Full catalog sync — retrieves all objects of specified types.

```typescript
let cursor: string | undefined;
do {
  const page = await client.catalog.listCatalog({ types: ["ITEM", "CATEGORY", "TAX"], cursor });
  // process page.objects
  cursor = page.cursor;
} while (cursor);
```

---

## Catalog Images

### CreateCatalogImage

`POST /v2/catalog/images` — multipart/form-data

**Formats:** JPEG, PJPEG, PNG, GIF — **max 15 MB**

Request: two parts — JSON `request` body + binary `image_file`.

```typescript
import { readFileSync } from "fs";

const blob = new Blob([readFileSync("./photo.jpg")], { type: "image/jpeg" });

const { image } = await client.catalog.createCatalogImage(
  {
    idempotencyKey: crypto.randomUUID(),
    objectId: "ITEM_ID",      // omit to create unattached image
    isPrimary: true,          // replaces existing primary image
    image: {
      type: "IMAGE",
      id: "#img",
      imageData: {
        name: "Product Shot",
        caption: "Our signature cold brew",
      },
    },
  },
  blob,
);

// image.imageData.url = CDN URL
```

```python
with open("./photo.jpg", "rb") as f:
    image_bytes = f.read()

response = client.catalog.create_catalog_image(
    request={
        "idempotency_key": str(uuid.uuid4()),
        "object_id": "ITEM_ID",
        "is_primary": True,
        "image": {
            "type": "IMAGE",
            "id": "#img",
            "image_data": {"name": "Product Shot"},
        },
    },
    image_file=image_bytes,
)
```

To attach an existing image to an item, include `imageIds` in `itemData` during upsert.

---

## Modifiers, Taxes, and Discounts

### Modifier List

```typescript
await client.catalog.upsertCatalogObject({
  idempotencyKey: crypto.randomUUID(),
  object: {
    type: "MODIFIER_LIST",
    id: "#milk-options",
    modifierListData: {
      name: "Milk Options",
      selectionType: "SINGLE",  // or "MULTIPLE"
      modifiers: [
        {
          type: "MODIFIER",
          id: "#oat-milk",
          modifierData: {
            name: "Oat Milk",
            priceMoney: { amount: BigInt(75), currency: "USD" },
            modifierListId: "#milk-options",
          },
        },
      ],
    },
  },
});
```

Attach to item via `modifierListInfo`:

```typescript
modifierListInfo: [{ modifierListId: "MODIFIER_LIST_ID", enabled: true, minSelectedModifiers: 0, maxSelectedModifiers: 1 }]
```

### Tax

```typescript
taxData: {
  name: "Sales Tax",
  calculationPhase: "TAX_SUBTOTAL_PHASE",
  inclusionType: "ADDITIVE",  // or "INCLUSIVE"
  percentage: "8.875",        // String, not float
  enabled: true,
}
```

Attach to items via `taxIds: ["TAX_ID"]`. Discount types: `FIXED_PERCENTAGE`, `FIXED_AMOUNT`, `VARIABLE_PERCENTAGE`, `VARIABLE_AMOUNT`.

---

## Inventory API

### How Inventory Works

Square accumulates adjustments from the last physical count:

```
current_qty = last_physical_count + Σ(adjustments since count)
```

No physical count = baseline of 0. Every change requires a client-supplied RFC 3339 `occurred_at` timestamp for ordering.

### Inventory States

| State | Description |
|-------|-------------|
| `NONE` | Initial placeholder (cannot return to this) |
| `IN_STOCK` | Available for sale — primary state |
| `SOLD` | Completed purchase — final, stops tracking |
| `WASTE` | Damaged/unsellable — terminal |
| `UNLINKED_RETURN` | Customer return without transaction |
| `RESERVED_FOR_SALE` | Held for pending online order |
| `IN_TRANSIT_TO` | Transfer in progress |
| `RECEIVED_FROM_VENDOR` | Receiving workflow |

**Valid transitions:** `NONE → IN_STOCK`, `IN_STOCK → SOLD/WASTE`, `UNLINKED_RETURN → IN_STOCK/WASTE`

### BatchChangeInventory

`POST /v2/inventory/changes/batch-create` — max 100 changes, atomic

**Change types:**

| Type | Field | When |
|------|-------|------|
| `PHYSICAL_COUNT` | `physicalCount` | Actual on-hand reconciliation |
| `ADJUSTMENT` | `adjustment` | Sales, receipts, waste, manual corrections |
| `TRANSFER` | `transfer` | Move stock between locations |

**PHYSICAL_COUNT — set absolute quantity:**

```typescript
await client.inventory.batchChangeInventory({
  idempotencyKey: crypto.randomUUID(),
  changes: [
    {
      type: "PHYSICAL_COUNT",
      physicalCount: {
        referenceId: crypto.randomUUID(),
        catalogObjectId: "VARIATION_ID",
        state: "IN_STOCK",
        locationId: "LOCATION_ID",
        quantity: "48",
        occurredAt: new Date().toISOString(),
      },
    },
  ],
  ignoreUnchangedCounts: true,  // default; skips if count matches previous
});
```

```python
from datetime import datetime, timezone
import uuid

client.inventory.batch_change_inventory(
    idempotency_key=str(uuid.uuid4()),
    changes=[
        {
            "type": "PHYSICAL_COUNT",
            "physical_count": {
                "reference_id": str(uuid.uuid4()),
                "catalog_object_id": "VARIATION_ID",
                "state": "IN_STOCK",
                "location_id": "LOCATION_ID",
                "quantity": "48",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            },
        }
    ],
)
```

**ADJUSTMENT — relative change (add/remove stock):**

```typescript
adjustment: {
  referenceId: crypto.randomUUID(),
  fromState: "NONE",
  toState: "IN_STOCK",
  locationId: "LOCATION_ID",
  catalogObjectId: "VARIATION_ID",
  quantity: "24",   // positive = add
  occurredAt: new Date().toISOString(),
}
```

**TRANSFER — between locations:**

```typescript
transfer: {
  referenceId: crypto.randomUUID(),
  catalogObjectId: "VARIATION_ID",
  fromLocationId: "LOC_A",
  toLocationId: "LOC_B",
  state: "IN_STOCK",
  quantity: "10",
  occurredAt: new Date().toISOString(),
}
```

### BatchRetrieveInventoryCounts

`POST /v2/inventory/counts/batch-retrieve`

```typescript
const { counts, cursor } = await client.inventory.batchRetrieveInventoryCounts({
  catalogObjectIds: ["VAR_ID_1", "VAR_ID_2"],
  locationIds: ["LOCATION_ID"],
  updatedAfter: "2026-01-01T00:00:00Z",
  limit: 1000,  // max
});
```

**InventoryCount fields:** `catalog_object_id`, `state`, `location_id`, `quantity` (string), `calculated_at`

### BatchRetrieveInventoryChanges

`POST /v2/inventory/changes/batch-retrieve` — filter by `catalogObjectIds`, `locationIds`, `types`, `updatedAfter`.

---

## Kitchen Display System Fields

New in **2026-01-22**.

| Field | Object | Description |
|-------|--------|-------------|
| `buyer_facing_name` | `CatalogItem` | Customer name on receipts and Square Online |
| `kitchen_name` (beta) | `CatalogItem` | Name shown on KDS and order tickets |
| `kitchen_name` (beta) | `CatalogItemVariation` | Per-variation override of item-level KDS name |

```typescript
itemData: {
  name: "Latte",                  // internal/POS
  buyerFacingName: "Café Latte",  // customer receipt
  kitchenName: "LAT",             // KDS shorthand
  variations: [
    {
      itemVariationData: {
        name: "Large",
        kitchenName: "LAT-LG",   // variation-level KDS override
      },
    },
  ],
}
```

| Use Case | `buyer_facing_name` | `kitchen_name` |
|----------|---------------------|----------------|
| Abbreviated POS | Full readable name | Short code (e.g., "ESP-D") |
| F&B branding | Marketing name | Prep shorthand |
| Multi-language | Localized customer name | Staff reference |

---

## Cross-API Integration

### Catalog → Orders

Reference catalog items in orders via `catalog_object_id` — Square auto-pulls name and price:

```typescript
lineItems: [
  {
    quantity: "2",
    catalogObjectId: "ITEM_VARIATION_ID",
    modifiers: [{ catalogObjectId: "MODIFIER_ID" }],
  },
]
```

Linked taxes and discounts apply automatically.

### Inventory Auto-Adjustment

When `track_inventory: true` and an order completes, Square automatically moves variation quantities `IN_STOCK → SOLD`. No manual inventory adjustment needed for POS sales.

### Catalog → Bookings

Service items (`product_type: "APPOINTMENTS_SERVICE"`) use `service_duration` (ms) and `available_for_booking` on variations to control scheduling in the Bookings API.

### Catalog → Square Online

Items with `image_ids` and `present_at_all_locations: true` appear in Square Online stores. `ecom_seo_data` on items controls SEO metadata.

---

## Error Handling

### Common Error Codes

| Code | Cause | Fix |
|------|-------|-----|
| `CONFLICT` | Version mismatch on update | Re-retrieve, get current version, retry |
| `NOT_FOUND` | Object ID doesn't exist | Verify ID; check if deleted |
| `IDEMPOTENCY_KEY_REUSED` | Same key, different body | Generate new UUID |
| `INVALID_ATTRIBUTE_VALUE` | Bad field value | Check field constraints (e.g., pricing type rules) |
| `MISSING_REQUIRED_PARAMETER` | Required field absent | Check required fields for object type |
| `RATE_LIMITED` | Too many requests | Exponential backoff, retry |

### Error Response Shape

```json
{
  "errors": [
    {
      "category": "INVALID_REQUEST_ERROR",
      "code": "CONFLICT",
      "detail": "Object version does not match.",
      "field": "version"
    }
  ]
}
```

---

## Rate Limits and Testing

| Endpoint Group | Limit |
|----------------|-------|
| Catalog write | 10 req/sec |
| Catalog read | 100 req/sec |
| Inventory write | 10 req/sec |
| Inventory read | 100 req/sec |
| Batch upsert (concurrent) | 1 per seller account |

HTTP 429 returned when rate limited. Use exponential backoff.

### Sandbox Testing

Use `SquareEnvironment.Sandbox` (Node.js) or `SquareEnvironment.SANDBOX` (Python). Sandbox is fully isolated — no real POS activity. Create test locations via the Square Developer Dashboard. Retrieve locations with `client.locations.listLocations()` to get valid `locationId` values.

---

## Recent Changes (2026-01-22)

| Field | Object | Description |
|-------|--------|-------------|
| `buyer_facing_name` | `CatalogItem` | Customer-visible name override for receipts and Square Online |
| `kitchen_name` (beta) | `CatalogItem` | KDS/order ticket name distinct from customer-facing name |
| `kitchen_name` (beta) | `CatalogItemVariation` | Per-variation KDS override |

Both Node.js (`square` v44.x) and Python (`squareup` v44.x) include these fields in the 2026-01-22 release.

---

## Useful Links

- [Catalog API Reference](https://developer.squareup.com/reference/square/catalog-api)
- [Inventory API Reference](https://developer.squareup.com/reference/square/inventory-api)
- [CatalogItem Object](https://developer.squareup.com/reference/square/objects/CatalogItem)
- [CatalogItemVariation Object](https://developer.squareup.com/reference/square/objects/CatalogItemVariation)
- [Node.js SDK (npm)](https://www.npmjs.com/package/square)
- [Python SDK (PyPI)](https://pypi.org/project/squareup/)
- [Square API Changelog](https://developer.squareup.com/docs/changelog)
