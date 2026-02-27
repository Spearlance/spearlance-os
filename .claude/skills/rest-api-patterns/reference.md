# REST API Patterns — Full Reference

## 1. Resource Naming

### Nouns, Not Verbs

Resources are things, not actions. HTTP methods carry the action.

| ✗ Wrong | ✓ Right |
|---------|---------|
| `GET /getUser` | `GET /users/{id}` |
| `POST /createOrder` | `POST /orders` |
| `POST /deleteProduct` | `DELETE /products/{id}` |
| `GET /fetchAllComments` | `GET /comments` |

### Plural Collections

Always plural for collection endpoints, even if the resource sounds singular:

```
GET /users          → list all users
GET /users/{id}     → get one user
POST /users         → create a user
DELETE /users/{id}  → delete a user
```

### Hierarchy and Nesting

Express parent-child relationships in the URL — but stop at 2 levels:

```
GET /users/{id}/orders          ✓ — orders belonging to a user
GET /orders/{id}/line-items     ✓ — line items within an order

GET /users/{id}/orders/{orderId}/line-items/{lineId}/discounts  ✗ — too deep
→ Flatten to: GET /discounts/{id}
```

**Rule:** If the nested resource makes sense on its own (has its own ID), give it a top-level collection too.

### Casing

- **URL paths:** lowercase kebab-case → `/user-profiles`, `/order-history`
- **Query params:** camelCase → `?sortBy=createdAt&pageSize=20`
- **JSON fields:** camelCase (or snake_case — pick one and stay consistent)

### Singletons

When a sub-resource has exactly one instance per parent:

```
GET  /users/{id}/profile     → get the user's profile
PUT  /users/{id}/profile     → replace it
PATCH /users/{id}/profile    → update fields
```

### Actions That Don't Map to CRUD

Use a verb sub-resource when a pure resource model doesn't fit:

```
POST /orders/{id}/cancel        → cancel an order
POST /users/{id}/password/reset → trigger reset
POST /payments/{id}/refund      → refund a payment
POST /documents/{id}/publish    → transition state
```

These are acceptable exceptions. Don't overuse — most things do map to CRUD.

---

## 2. HTTP Methods

### GET — Fetch

- Safe (no side effects), idempotent
- Never modify state in a GET
- Use for single resources and collections

```
GET /products           → list products
GET /products/{id}      → get one product
GET /products?q=shirt   → search/filter products
```

### POST — Create or Trigger

- Not idempotent (calling twice creates two resources)
- Returns `201 Created` with `Location` header on success
- Use for creation and non-idempotent actions

```
POST /orders
→ 201 Created
→ Location: /orders/456
→ Body: { "id": "456", ... }
```

### PUT — Full Replace

- Idempotent — calling twice has same result as once
- Client sends the complete resource representation
- Missing fields are cleared/defaulted (not preserved)

```
PUT /users/{id}
Body: { "name": "Alice", "email": "alice@example.com", "role": "admin" }
→ 200 OK with updated resource
```

### PATCH — Partial Update

- Not guaranteed idempotent (depends on implementation)
- Client sends only the fields to change
- Use JSON Merge Patch (RFC 7396) or JSON Patch (RFC 6902)

**JSON Merge Patch** (simpler, most common):
```json
PATCH /users/{id}
{ "name": "Alice Updated" }
→ Only name changes; other fields untouched
```

**JSON Patch** (more precise):
```json
PATCH /users/{id}
[
  { "op": "replace", "path": "/name", "value": "Alice Updated" },
  { "op": "add", "path": "/tags/-", "value": "vip" }
]
```

### DELETE — Remove

- Idempotent — deleting a deleted resource returns `404` or `204` (both acceptable)
- Return `204 No Content` on success (no body needed)
- Return `404` if resource doesn't exist

```
DELETE /users/{id}
→ 204 No Content
```

### HEAD — Metadata Only

- Same as GET but returns headers only, no body
- Use for existence checks, cache validation, size probing

### OPTIONS — CORS Preflight

- Returns `Allow` header listing supported methods
- Frameworks handle this automatically — rarely implement manually

---

## 3. Status Codes

### 2xx — Success

| Code | Name | When to Use |
|------|------|------------|
| 200 | OK | GET, PUT, PATCH success with body |
| 201 | Created | POST success — resource created |
| 202 | Accepted | Request accepted, processing async |
| 204 | No Content | DELETE success, or PUT/PATCH with no body |
| 206 | Partial Content | Range requests (file downloads) |

### 3xx — Redirection

| Code | Name | When to Use |
|------|------|------------|
| 301 | Moved Permanently | Resource URL has permanently changed |
| 302 | Found | Temporary redirect |
| 304 | Not Modified | Client cache is still valid (ETag/If-None-Match) |
| 307 | Temporary Redirect | Redirect preserving HTTP method |
| 308 | Permanent Redirect | Like 301 but preserves method |

### 4xx — Client Errors

| Code | Name | When to Use |
|------|------|------------|
| 400 | Bad Request | Malformed syntax, invalid JSON |
| 401 | Unauthorized | No credentials or invalid token |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported on this endpoint |
| 409 | Conflict | State conflict (duplicate, version mismatch) |
| 410 | Gone | Resource permanently deleted |
| 422 | Unprocessable Entity | Valid syntax but semantic validation failed |
| 429 | Too Many Requests | Rate limit exceeded |

**401 vs 403:**
- `401` → "Who are you?" (missing or invalid auth)
- `403` → "I know who you are, but no." (insufficient permissions)

**400 vs 422:**
- `400` → Can't parse the request (bad JSON, wrong content-type)
- `422` → Parsed fine, but fields fail validation (email format, required missing)

### 5xx — Server Errors

| Code | Name | When to Use |
|------|------|------------|
| 500 | Internal Server Error | Unhandled exception, unexpected failure |
| 502 | Bad Gateway | Upstream service returned invalid response |
| 503 | Service Unavailable | Intentional downtime, overloaded |
| 504 | Gateway Timeout | Upstream service timed out |

---

## 4. Request/Response Design

### Response Envelopes

**Don't wrap single resources:**
```json
// ✗ unnecessary envelope
{ "data": { "id": "1", "name": "Alice" }, "success": true }

// ✓ direct resource
{ "id": "1", "name": "Alice" }
```

**Do wrap collection responses** (for metadata):
```json
{
  "data": [ { "id": "1" }, { "id": "2" } ],
  "meta": {
    "total": 200,
    "page": 1,
    "limit": 20
  },
  "links": {
    "next": "/users?cursor=eyJpZCI6Mn0",
    "prev": null
  }
}
```

### Content Negotiation

Always set `Content-Type` on responses:
```
Content-Type: application/json; charset=utf-8
```

For error responses (RFC 9457):
```
Content-Type: application/problem+json
```

Respect `Accept` header from clients when serving multiple formats.

### HATEOAS

Include hypermedia links when it adds navigation value:
```json
{
  "id": "456",
  "status": "pending",
  "_links": {
    "self": { "href": "/orders/456" },
    "cancel": { "href": "/orders/456/cancel", "method": "POST" },
    "user": { "href": "/users/123" }
  }
}
```

**Pragmatic take:** Full HATEOAS is rarely implemented in practice. Including a `_links` object on key resources is a good middle ground.

---

## 5. Pagination

### Offset Pagination

**How it works:** client specifies page number or item offset.

```
GET /products?page=3&limit=20
GET /products?offset=40&limit=20
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 500,
    "page": 3,
    "limit": 20,
    "totalPages": 25
  }
}
```

**Trade-offs:**
- ✓ Easy to implement, supports random access, user-friendly page numbers
- ✗ Slow on large datasets (DB must scan to offset), drift when records added/deleted between pages

**Use when:** datasets under ~10k records, admin dashboards, user-facing page numbers matter.

### Cursor-Based Pagination

**How it works:** server returns an opaque cursor pointing to the last item; client passes it to get the next page.

```
GET /posts?limit=20
→ returns cursor: "eyJpZCI6MjB9"

GET /posts?after=eyJpZCI6MjB9&limit=20
→ next page
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6NDB9",
    "prevCursor": "eyJpZCI6MX0"
  }
}
```

**Cursor encoding** (base64 of JSON):
```js
// Encode
const cursor = Buffer.from(JSON.stringify({ id: 20 })).toString('base64')

// Decode
const { id } = JSON.parse(Buffer.from(cursor, 'base64').toString())
```

**Trade-offs:**
- ✓ Consistent performance regardless of dataset size, stable results with live data
- ✗ No random page access, cursor must be treated as opaque

**Use when:** feeds, activity streams, large datasets, any list that could grow unbounded.

### Keyset Pagination

**How it works:** cursor is a compound key from the sort fields — avoids encoding overhead.

```
GET /orders?after_id=500&after_created_at=2024-01-15T00:00:00Z&limit=20
```

**SQL equivalent:**
```sql
SELECT * FROM orders
WHERE (created_at, id) < ('2024-01-15', 500)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

**Trade-offs:**
- ✓ Fastest for sorted queries, no encoding overhead, index-friendly
- ✗ Exposed sort fields in URL, harder to implement multi-column sorts

**Use when:** high-throughput APIs, sorted exports, financial/audit logs.

### Which to Choose

```
Dataset size < 10k AND page numbers needed  →  Offset
Dataset size > 10k OR real-time data        →  Cursor
High-performance sorted list               →  Keyset
```

---

## 6. Filtering and Sorting

### Filtering Query Params

Simple equality filters as query params:
```
GET /products?category=electronics&status=active
```

Range filters:
```
GET /orders?createdAfter=2024-01-01&createdBefore=2024-12-31
GET /products?minPrice=10&maxPrice=500
```

Multi-value (comma-separated or repeated param):
```
GET /products?status=active,draft
GET /products?status=active&status=draft
```

Complex filters (when query strings aren't enough, use POST):
```
POST /products/search
{
  "filters": {
    "status": { "in": ["active", "draft"] },
    "price": { "gte": 10, "lte": 500 },
    "tags": { "all": ["sale", "featured"] }
  }
}
```

### Sorting

```
GET /products?sort=price          → ascending
GET /products?sort=-price         → descending (minus prefix)
GET /products?sort=-createdAt,name → multiple fields
```

Alternative convention (explicit):
```
GET /products?sortBy=price&order=desc
```

Pick one style per API and document it. The `-field` prefix is more concise.

### Field Selection (Sparse Fieldsets)

Allow clients to request only needed fields:
```
GET /users?fields=id,name,email
```

Reduces payload size — especially valuable for mobile clients.

### Search

Full-text search as a query param:
```
GET /products?q=wireless+headphones
GET /articles?search=REST+API+design
```

---

## 7. Error Responses

### RFC 9457 Problem Details

The standard for HTTP API error responses. Replaces custom error formats.

**Content-Type:** `application/problem+json`

**Standard fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | URI | Identifies the problem type. Links to docs. |
| `title` | string | Short human-readable summary (stable across occurrences) |
| `status` | integer | HTTP status code |
| `detail` | string | Human-readable explanation specific to this occurrence |
| `instance` | URI | URI identifying this specific error occurrence |

**Basic error:**
```json
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "No order with ID 999 exists.",
  "instance": "/orders/999"
}
```

**Validation error (with extensions):**
```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request body contains invalid fields.",
  "instance": "/users",
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address",
      "value": "not-an-email"
    },
    {
      "field": "age",
      "message": "Must be at least 18",
      "value": 15
    }
  ]
}
```

**Rate limit error:**
```json
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 30

{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded 100 requests per minute.",
  "retryAfter": 30
}
```

### Error Consistency Rules

- Always return `application/problem+json` for 4xx and 5xx
- Never return `200 OK` with an error body
- Never expose stack traces or internal details in production
- `type` URI should resolve to documentation (even a static page)
- Keep `title` stable — it's meant for programmatic matching

---

## 8. Authentication Patterns

### Bearer Token (JWT)

Most common for modern APIs. Token in `Authorization` header.

```
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Flow:**
1. Client authenticates (POST /auth/token with credentials)
2. Server returns `access_token` + `refresh_token`
3. Client sends `access_token` in every request header
4. When expired (401), client uses `refresh_token` to get new access token

**JWT best practices:**
- Short expiry for access tokens (15min–1hr)
- Longer expiry for refresh tokens (7–30 days), stored securely
- Sign with RS256 (asymmetric) for public key verification
- Include `iss`, `sub`, `exp`, `jti` claims minimum

### API Keys

Simple server-to-server authentication. Key in header (preferred) or query param (avoid for sensitive APIs — keys end up in logs).

```
# Preferred
X-API-Key: sk_live_abc123xyz

# Acceptable but logs-risky
GET /data?api_key=sk_live_abc123xyz
```

**Best practices:**
- Prefix keys with environment hint: `sk_live_`, `sk_test_`
- Store only the hash (SHA-256) server-side, show full key once on creation
- Support key rotation without service disruption
- Rate limit per key

### OAuth 2.0

Use for delegated access (users authorizing third-party apps to act on their behalf).

**Authorization Code Flow** (for user-facing apps):
```
1. Redirect user to /oauth/authorize?client_id=...&scope=read:orders&response_type=code
2. User authenticates and approves
3. Server redirects to callback with ?code=AUTH_CODE
4. App exchanges code for tokens: POST /oauth/token
5. Use access_token for API calls
```

**Client Credentials Flow** (machine-to-machine, no user):
```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=...&client_secret=...&scope=read:data
```

**Scopes:** use colon-namespaced strings → `read:users`, `write:orders`, `admin:billing`

---

## 9. Versioning Strategies

### URL Path Versioning (Recommended Default)

Version in the URL path segment:

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

**Pros:** Maximum visibility, easy to test in browser, cache-friendly, simple routing
**Cons:** "Breaks" REST purity (version isn't part of the resource), URL sprawl

**Use when:** public APIs, mobile clients, third-party integrations. The pragmatic default.

### Header Versioning

Version in a custom request header:

```
GET /users
API-Version: 2024-01-01
```

Or via `Accept` header:
```
Accept: application/vnd.example.v2+json
```

**Pros:** Clean URLs, aligns with REST content negotiation principles
**Cons:** Hidden from URL, harder to test, requires explicit header in every request

**Use when:** internal APIs, teams that control all clients, strict REST adherence required.

### Query Parameter Versioning

```
GET /users?version=2
GET /users?api-version=2024-01-01
```

**Pros:** Easy to test in browser, backwards compatible by defaulting to v1
**Cons:** Pollutes query string, cache key complications, easy to forget

**Avoid for new APIs.** Acceptable for legacy systems where URL changes are costly.

### Date-Based Versioning

Stripe's model — version by calendar date, not integer:

```
Stripe-Version: 2024-11-20
```

**Pros:** Clear when changes were introduced, easy to audit
**Cons:** Complex changelog tracking, more cognitive overhead

### Versioning Rules

```
Major breaking changes     →  bump major version (v1 → v2)
Additive changes           →  no version bump (new fields are backwards compatible)
Removing/renaming fields   →  major version bump
Deprecation timeline       →  announce 6+ months ahead, return Deprecation header
```

**Deprecation header:**
```
Deprecation: Tue, 31 Dec 2024 23:59:59 GMT
Sunset: Tue, 30 Jun 2025 23:59:59 GMT
Link: <https://api.example.com/docs/migration-v2>; rel="successor-version"
```

---

## 10. Rate Limiting

### Standard Headers

Always return rate limit state in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1735689600
Retry-After: 30
```

| Header | Value |
|--------|-------|
| `X-RateLimit-Limit` | Total requests allowed in the window |
| `X-RateLimit-Remaining` | Requests left in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds to wait (429 responses only) |

### Rate Limit Response

```json
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735689600
Retry-After: 30

{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "100 requests per minute limit reached. Retry after 30 seconds.",
  "retryAfter": 30
}
```

### Rate Limit Strategies

| Strategy | Description | Use |
|----------|-------------|-----|
| Fixed window | Count resets at window boundary | Simple, easy to reason about |
| Sliding window | Rolling count over past N seconds | Smoother, no burst at window reset |
| Token bucket | Tokens refill at constant rate, burst allowed | Best UX — allows occasional spikes |
| Leaky bucket | Requests queued, processed at fixed rate | Strict output rate control |

**Multi-tier limits:**
```
Global:       10,000 req/day per API key
Per-endpoint: 100 req/min for POST /orders
              1,000 req/min for GET /products
```

---

## 11. API Documentation (OpenAPI)

### OpenAPI 3.1 Structure

```yaml
openapi: "3.1.0"
info:
  title: Example API
  version: "1.0.0"
  description: |
    Full description with markdown.

servers:
  - url: https://api.example.com/v1
    description: Production

paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      tags: [Users]
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: after
          in: query
          schema:
            type: string
          description: Cursor for pagination
      responses:
        "200":
          description: Paginated user list
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserList"
        "401":
          $ref: "#/components/responses/Unauthorized"

components:
  schemas:
    User:
      type: object
      required: [id, email]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        createdAt:
          type: string
          format: date-time

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

### Documentation Best Practices

- Write `operationId` for every endpoint — SDK generators use it
- Include `examples` for request/response bodies
- Document every error response, not just success
- Use `description` on every parameter, not just `name`
- Tag endpoints for grouping in docs UI
- Version the OpenAPI spec alongside the API

---

## 12. Common Mistakes

### Verbs in URLs
```
✗ POST /createUser
✗ GET /getUserById?id=1
✓ POST /users
✓ GET /users/{id}
```

### Wrong Status Codes
```
✗ 200 OK { "error": "User not found" }
✗ 500 for a validation failure
✓ 404 Not Found with problem detail
✓ 422 Unprocessable Entity for validation
```

### Offset Pagination on Large Tables
```
✗ GET /events?page=5000&limit=20   → full table scan to offset 100,000
✓ GET /events?after=<cursor>&limit=20  → index seek, O(1)
```

### Inconsistent Casing
```
✗ /userProfile vs /user_profile vs /UserProfile in same API
✓ Pick kebab-case for paths, camelCase for JSON, enforce it
```

### Exposing Internal IDs
```
✗ /users/4821   → reveals user count, enumerable
✓ /users/01J8X3KVQ7QG1R4NZ5XMTP8YFD  → ULID/UUID
```

### Missing Idempotency for Payments
```
✗ POST /payments  → retry on network error = double charge
✓ POST /payments
  Idempotency-Key: client-generated-uuid-here
  → server deduplicates on key, safe to retry
```

### Breaking Changes Without Versioning
```
✗ Rename field "name" → "fullName" in v1 response
✓ Add "fullName" to v1, deprecate "name", remove in v2
```

### Not Paginating Collection Endpoints
```
✗ GET /events → returns all 2M records
✓ GET /events?limit=20 → paginated, required limit param
```

### Swallowing Errors in Middleware
```
✗ catch (err) { res.json({ success: false }) }
✓ catch (err) { next(err) }  // let error handler format RFC 9457 response
```

### No Rate Limiting on Auth Endpoints
```
✗ POST /auth/login  → brute-forceable, no limits
✓ POST /auth/login  → 5 req/min per IP, 10 req/hour per email
```
