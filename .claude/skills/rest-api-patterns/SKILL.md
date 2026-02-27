---
model: claude-sonnet-4-6
name: rest-api-patterns
description: Use when designing REST APIs — resource naming, HTTP methods, status codes, pagination, filtering, error responses, or versioning. Also use when reviewing API design decisions or resolving REST design debates.
---

```
┏━ 🔧 rest-api-patterns ━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ your friendly armadillo is here to serve you   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Overview

Reference skill for REST API design. Covers resource naming, HTTP methods, status codes, pagination strategies, error formats (RFC 9457), versioning, and rate limiting. Use `reference.md` for code examples and deep-dives.

---

## Quick Reference

### HTTP Methods

| Method | Idempotent | Safe | Use |
|--------|-----------|------|-----|
| GET | ✓ | ✓ | Fetch resource(s) |
| POST | ✗ | ✗ | Create resource, trigger action |
| PUT | ✓ | ✗ | Full replace |
| PATCH | ✗ | ✗ | Partial update |
| DELETE | ✓ | ✗ | Remove resource |

### Status Codes

| Range | Meaning | Examples |
|-------|---------|---------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 Moved, 304 Not Modified |
| 4xx | Client error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 429 Too Many Requests |
| 5xx | Server error | 500 Internal, 502 Bad Gateway, 503 Unavailable |

---

## Resource Naming

- **Nouns, not verbs:** `/orders`, not `/getOrders`
- **Plural collections:** `/users`, `/products`
- **Lowercase kebab-case:** `/user-profiles`, not `/userProfiles`
- **Hierarchy for nesting:** `/users/{id}/orders` — max 2 levels deep
- **Singletons:** `/users/{id}/profile` (one per user)

---

## Pagination

| Strategy | Best for | Avoid when |
|----------|---------|-----------|
| Offset (`?page=2&limit=20`) | Small datasets, admin UIs | Large datasets, real-time data |
| Cursor (`?after=<token>`) | Feeds, large tables, real-time | Random access, user-facing page numbers |
| Keyset (`?after_id=123`) | High-performance sorted lists | Complex multi-field sorts |

**Default:** cursor-based for any list endpoint that could exceed ~1000 records.

---

## Error Format (RFC 9457)

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request body contains invalid fields.",
  "instance": "/orders/987",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" }
  ]
}
```

`Content-Type: application/problem+json`

---

## Common Mistakes

| ✗ Wrong | ✓ Right |
|---------|---------|
| `POST /getUser` | `GET /users/{id}` |
| `DELETE /users` (no ID) | `DELETE /users/{id}` |
| Returning 200 for errors | Use 4xx/5xx appropriately |
| `?page=1` on 10M-row tables | Cursor pagination |
| Versioning in query string | URL path or `Accept` header |
| Custom error format | RFC 9457 `application/problem+json` |
| Nesting 3+ levels deep | Flatten: `/comments/{id}` not `/posts/{id}/sections/{id}/comments/{id}` |

---

## Full Reference

See `reference.md` for complete status code tables, filtering/sorting patterns, auth strategies (Bearer/API key/OAuth 2.0), versioning trade-offs, rate limiting headers, OpenAPI documentation, and pagination code examples.
