---
model: claude-sonnet-4-6
name: express
description: Use when building APIs or web servers with Express.js — routing, middleware, error handling, or when working with the most widely-used Node.js HTTP framework. Also use when migrating Express apps or debugging Express-specific issues.
---

# Express.js

## Overview

Express.js is the most widely-used Node.js HTTP framework. Current version: **5.x** (stable, default on npm since March 2025). Express 5 auto-forwards rejected promises to error middleware — no more try/catch boilerplate in async routes.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 5.x (stable, latest on npm) |
| **Min Node.js** | v18+ |
| **Install** | `npm install express` |
| **TypeScript types** | `npm install -D @types/express` |
| **Docs** | https://expressjs.com |

## Modern Setup (TypeScript)

```bash
npm install express && npm install -D typescript @types/express tsx
```

```typescript
// src/app.ts
import express from 'express';
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
export default app;

// src/index.ts
import app from './app';
app.listen(process.env.PORT ?? 3000);
```

## Routing

```typescript
import { Router } from 'express';
const router = Router();
router.get('/:id', async (req, res) => {
  const item = await db.find(req.params.id);  // throws → auto-caught in Express 5
  res.json(item);
});
app.use('/api/items', router);
```

## Middleware

```typescript
// Order: global → router-level → route → error
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', authMiddleware);
```

## Error Handling

```typescript
// Express 5: async throws auto-forwarded — no try/catch needed
app.get('/users/:id', async (req, res) => {
  const user = await findUser(req.params.id);
  res.json(user);
});

// 4-arg signature = error middleware — must be last
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message });
});
```

## Security (Essential Middleware)

```bash
npm install helmet cors express-rate-limit
```
```typescript
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Async errors not caught (Express 4) | Use `express-async-errors` or upgrade to Express 5 |
| Error middleware with 3 args | Must be `(err, req, res, next)` — Express detects by arity |
| Regex sub-expressions in routes | Express 5 removed them — validate params manually |
| Error middleware before routes | Must be registered **last** |
| No body parser | Add `app.use(express.json())` before routes |

## Full Reference
See `reference.md`: TypeScript/ESM project structure, nested routers, JWT/session/Passport auth, file uploads (multer), testing (supertest), performance, clustering, Express 4→5 migration.
