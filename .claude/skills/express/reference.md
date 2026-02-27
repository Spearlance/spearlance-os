# Express.js Reference

Express 5.x — stable, default on npm since March 2025. Min Node.js: v18.

---

## 1. Modern Setup (TypeScript + ESM)

### Install

```bash
npm install express
npm install -D typescript @types/express tsx
```

### tsconfig.json (recommended)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

> ESM note: Express 5 ships as CJS. For ESM projects, set `"module": "ESNext"` and `"moduleResolution": "bundler"` in tsconfig, add `"type": "module"` to package.json, and use `.js` extensions on local imports.

### Project Structure

```
src/
  app.ts          # Express app (no listen — testable)
  index.ts        # Entry point (calls app.listen)
  routes/
    users.ts
    items.ts
  middleware/
    auth.ts
    error.ts
  types/
    express.d.ts  # Augment Request if needed
dist/             # compiled output
```

### app.ts

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/error';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', usersRouter);

// Error handler — must be last
app.use(errorHandler);

export default app;
```

### index.ts

```typescript
import app from './app';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on :${PORT}`);
});
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## 2. Routing

### Basic Router

```typescript
// routes/users.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const users = await db.users.findMany();
  res.json(users);
});

router.get('/:id', async (req: Request, res: Response) => {
  const user = await db.users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.post('/', async (req: Request, res: Response) => {
  const user = await db.users.create(req.body);
  res.status(201).json(user);
});

router.put('/:id', async (req: Request, res: Response) => {
  const user = await db.users.update(req.params.id, req.body);
  res.json(user);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await db.users.delete(req.params.id);
  res.status(204).send();
});

export default router;
```

### Route Parameters

```typescript
// Named params: /users/:id
req.params.id

// Optional params (Express 5): /users/:id?
router.get('/:id?', (req, res) => { ... });

// Multiple params: /orgs/:orgId/repos/:repoId
req.params.orgId
req.params.repoId
```

### Query Strings

```typescript
// GET /search?q=foo&page=2&limit=20
const { q, page = '1', limit = '20' } = req.query as Record<string, string>;
const pageNum = parseInt(page, 10);
```

### Nested Routers

```typescript
// routes/index.ts
import { Router } from 'express';
import usersRouter from './users';
import postsRouter from './posts';

const router = Router();
router.use('/users', usersRouter);
router.use('/posts', postsRouter);

export default router;

// app.ts
app.use('/api/v1', router);
// results in: /api/v1/users, /api/v1/posts
```

### Express 5 Route Changes

```typescript
// Express 4 — regex sub-expressions worked:
router.get('/:id(\\d+)', handler);  // BROKEN in Express 5

// Express 5 — validate manually:
router.get('/:id', (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return next();
  handler(req, res, next);
});
```

---

## 3. Middleware

### Execution Order

```
Request → global middleware → router middleware → route handler → error middleware → Response
```

Order of `app.use()` calls is the execution order. Error middleware runs only when `next(err)` is called or an async throw propagates.

### Built-in Middleware

```typescript
app.use(express.json());                        // parse application/json
app.use(express.urlencoded({ extended: true })); // parse form bodies
app.use(express.static('public'));              // serve static files
```

### Custom Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

// Request logger
function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`${req.method} ${req.url}`);
  next();
}

// Auth guard
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // attach user to req
  next();
}
```

### Third-Party Essentials

| Package | Purpose | Install |
|---------|---------|---------|
| `helmet` | Security headers | `npm i helmet` |
| `cors` | CORS handling | `npm i cors` |
| `express-rate-limit` | Rate limiting | `npm i express-rate-limit` |
| `morgan` | HTTP request logging | `npm i morgan` |
| `compression` | Gzip compression | `npm i compression` |
| `multer` | File uploads | `npm i multer` |

```typescript
import morgan from 'morgan';
import compression from 'compression';

app.use(morgan('combined'));   // Apache log format
app.use(compression());       // gzip all responses
```

### Augmenting Request Type

```typescript
// types/express.d.ts
import { User } from '../models/user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

---

## 4. Error Handling

### Express 5 — Async Auto-Forwarding

Express 5 automatically catches rejected promises from async route handlers and forwards them to error middleware. No wrapper needed.

```typescript
// Express 5 — clean async handlers
router.get('/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);  // rejection auto-caught
  if (!user) throw new NotFoundError('User not found');
  res.json(user);
});
```

### Express 4 Async Wrapper (if you can't upgrade)

```typescript
// express-async-errors package (import once in index.ts)
import 'express-async-errors';

// Or manual wrapper
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id);
  res.json(user);
}));
```

### Error Middleware

```typescript
// middleware/error.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// MUST be 4 args — Express detects by arity
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Programmer error — don't leak details
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
```

### 404 Handler

```typescript
// Add before error middleware, after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);
```

---

## 5. Security

### helmet

Sets 14 security-related HTTP headers by default (Content-Security-Policy, X-Frame-Options, etc.).

```typescript
import helmet from 'helmet';

// Default — covers most cases
app.use(helmet());

// Custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
```

### cors

```typescript
import cors from 'cors';

// Allow specific origin
app.use(cors({
  origin: 'https://myapp.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // allow cookies
}));

// Dynamic origin validation
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['https://myapp.com', 'https://admin.myapp.com'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Global limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

// Strict limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many attempts, try again in 15 minutes' },
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

### Input Validation (zod)

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
});

function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}

router.post('/', validate(CreateUserSchema), async (req, res) => {
  const user = await db.users.create(req.body);
  res.status(201).json(user);
});
```

---

## 6. Authentication Patterns

### JWT

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  try {
    req.user = verifyToken(token) as User;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken({ id: user.id, email: user.email });
  res.json({ token });
});
```

### Sessions

```typescript
import session from 'express-session';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(session({
  store: new connectRedis({ client: redisClient }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  },
}));
```

### Passport (OAuth)

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback',
}, async (_accessToken, _refreshToken, profile, done) => {
  const user = await db.users.upsert({ googleId: profile.id, email: profile.emails![0].value });
  done(null, user);
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);
```

---

## 7. File Uploads (multer)

```typescript
import multer from 'multer';
import path from 'path';

// Memory storage (for processing/S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Disk storage
const diskUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Single file
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  // req.file.buffer (memory) or req.file.path (disk)
  const url = await uploadToS3(req.file.buffer, req.file.originalname);
  res.json({ url });
});

// Multiple files
router.post('/upload-many', upload.array('files', 5), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  const urls = await Promise.all(files.map(f => uploadToS3(f.buffer, f.originalname)));
  res.json({ urls });
});
```

---

## 8. Testing (supertest)

```bash
npm install -D supertest @types/supertest vitest
```

```typescript
// tests/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GET /api/users', () => {
  it('returns 200 with user list', async () => {
    const res = await request(app)
      .get('/api/users')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
  });

  it('returns 401 without auth token', async () => {
    await request(app)
      .get('/api/users/protected')
      .expect(401);
  });

  it('creates a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ email: 'test@example.com', name: 'Test User' })
      .expect(201);

    expect(res.body).toMatchObject({ email: 'test@example.com' });
  });
});
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node' },
});
```

---

## 9. Performance

### Compression

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024,  // only compress responses > 1KB
}));
```

### Response Caching

```typescript
// Simple in-memory cache middleware
function cache(duration: number) {
  const store = new Map<string, { data: unknown; expiry: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.url;
    const cached = store.get(key);

    if (cached && cached.expiry > Date.now()) {
      res.json(cached.data);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      store.set(key, { data, expiry: Date.now() + duration * 1000 });
      return originalJson(data);
    };

    next();
  };
}

router.get('/products', cache(60), async (_req, res) => {
  const products = await db.products.findMany();
  res.json(products);
});
```

### Clustering

```typescript
// cluster.ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  console.log(`Forking ${cpus} workers`);
  for (let i = 0; i < cpus; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.id} died, restarting`);
    cluster.fork();
  });
} else {
  // Worker: start Express server
  import('./index');
}
```

> For production, prefer a process manager (PM2) over manual clustering.

```bash
npm install -g pm2
pm2 start dist/index.js -i max  # auto cluster by CPU count
pm2 save && pm2 startup         # persist across reboots
```

---

## 10. Express 4 → 5 Migration

| Change | Express 4 | Express 5 |
|--------|-----------|-----------|
| Async errors | Manual `try/catch` + `next(err)` | Auto-forwarded from async handlers |
| Regex sub-expressions | `/:id(\\d+)` works | Removed — validate manually |
| `res.status()` chaining | `res.status(200).send()` | Same — no change |
| Path matching | Permissive | Stricter — `/foo/` no longer matches `/foo` |
| `req.query` | Parsed with qs | Same behavior |
| Removed methods | — | `res.json(obj, status)` removed — use `res.status(n).json(obj)` |
| Node.js support | v0.10+ | v18+ required |

### Migration Steps

1. Upgrade: `npm install express@5`
2. Remove `try/catch` wrappers from async handlers (or `express-async-errors` import)
3. Audit all regex route params — replace with manual validation
4. Test trailing slash behavior — `app.set('strict routing', true)` may be needed
5. Update `res.json(obj, status)` calls to `res.status(n).json(obj)`

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Async handler errors not caught (Express 4) | Use `express-async-errors` or upgrade to Express 5 |
| Error middleware with 3 args instead of 4 | Must be `(err, req, res, next)` — Express detects by arity |
| Error middleware registered before routes | Must come **after** all routes and routers |
| Regex sub-expressions in routes on Express 5 | Removed — validate params manually |
| Not setting `NODE_ENV=production` | Disables stack traces in error responses — set it |
| Sending response after headers sent | Guard with `if (res.headersSent) return` |
| Forgetting `next()` in middleware | Causes request to hang — always call `next()` or send response |
| Using `req.body` without body-parser | Add `app.use(express.json())` before routes |
| Setting `Access-Control-Allow-Origin: *` in production | Use explicit origin allowlist via `cors` package |
| Running without `helmet` | Sets no security headers by default — always add `helmet()` |
| Missing `await` in async handler | Rejection goes unhandled — always `await` promises |
| Storing secrets in `req.query` | Query strings appear in server logs — use headers or body |
