# Sentry Reference

SDK: v9.x (latest ~9.32.x) | Node.js minimum: 18.0.0 | TypeScript minimum: 5.0.4

---

## Setup

### Next.js (Recommended: Wizard)

```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard creates:
- `sentry.client.config.ts` — browser instrumentation
- `sentry.server.config.ts` — server-side instrumentation
- `sentry.edge.config.ts` — edge runtime instrumentation
- Wraps `next.config.ts` with `withSentryConfig()`
- Configures source map uploads
- Creates example error buttons in `/app`

**Manual install:**

```bash
npm install @sentry/nextjs
```

`sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  // Bypass ad blockers
  tunnelRoute: "/monitoring",
  // Readable stack traces without uploading source maps
  hideSourceMaps: true,
});
```

`sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});
```

`next.config.ts`:
```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = { /* your config */ };

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
```

### React (SPA)

```bash
npm install @sentry/react
```

```typescript
// main.tsx or index.tsx — before rendering
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.2,
  tracePropagationTargets: ["localhost", /^https:\/\/yourapi\.com/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

Wrap app with error boundary:
```typescript
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@sentry/react";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallback={<p>Something went wrong</p>}>
    <App />
  </ErrorBoundary>
);
```

React Router v6 integration:
```typescript
import { useEffect } from "react";
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from "react-router-dom";

Sentry.init({
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
});
```

### Node.js

```bash
npm install @sentry/node
```

```typescript
// instrument.ts — MUST be imported before everything else
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});
```

Run with: `node --import ./instrument.js server.js`

Or set in `package.json`:
```json
{
  "scripts": {
    "start": "node --import ./dist/instrument.js dist/server.js"
  }
}
```

Express integration (auto-instrumented via `@sentry/node`):
```typescript
import express from "express";
import * as Sentry from "@sentry/node";

const app = express();

// Sentry request handler — must be first middleware
app.use(Sentry.expressErrorHandler());
```

---

## Error Capturing

### Basic Capture

```typescript
import * as Sentry from "@sentry/nextjs";

// Capture an exception
try {
  doSomething();
} catch (error) {
  Sentry.captureException(error);
  throw error; // re-throw if needed
}

// Capture a message
Sentry.captureMessage("Payment processing delayed", "warning");
// Levels: "fatal" | "error" | "warning" | "log" | "info" | "debug"

// Capture with extra context
Sentry.captureException(error, {
  tags: { feature: "checkout", userId: "123" },
  extra: { cartItems: cart.items, total: cart.total },
});
```

### Error Boundaries (React)

```typescript
import { ErrorBoundary, withErrorBoundary } from "@sentry/react";

// Component approach
<ErrorBoundary
  fallback={({ error, resetError }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetError}>Retry</button>
    </div>
  )}
  onError={(error, info) => {
    Sentry.setExtra("componentStack", info.componentStack);
  }}
>
  <MyComponent />
</ErrorBoundary>

// HOC approach
const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <p>Failed to load</p>,
});
```

### Server Actions (Next.js)

```typescript
"use server";
import * as Sentry from "@sentry/nextjs";

export async function submitForm(data: FormData) {
  return Sentry.withServerActionInstrumentation(
    "submitForm",
    { formData: data, recordResponse: true },
    async () => {
      // your logic
    }
  );
}
```

---

## Context & Scope

### User Context

```typescript
// Set globally after auth
Sentry.setUser({
  id: "user_123",
  email: "user@example.com",
  username: "jsmith",
  ip_address: "{{auto}}", // only if sendDefaultPii: true
});

// Clear on logout
Sentry.setUser(null);
```

Note: v9 no longer captures IP addresses by default. Set `sendDefaultPii: true` to re-enable.

### Tags & Extra Data

```typescript
// Tags — indexed, filterable in Sentry UI
Sentry.setTag("plan", "enterprise");
Sentry.setTag("region", "us-east-1");

// Extra — arbitrary JSON, not indexed
Sentry.setExtra("requestPayload", payload);

// Context — structured namespaced data
Sentry.setContext("cart", {
  items: 3,
  total: 99.99,
  currency: "usd",
});
```

### Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  message: "User clicked checkout button",
  category: "ui.click",
  level: "info",
  data: { buttonId: "checkout-btn" },
});
```

### Isolated Scope

```typescript
// Run code with a temporary scope — doesn't pollute global
Sentry.withScope((scope) => {
  scope.setTag("operation", "bulk-import");
  scope.setExtra("rowCount", rows.length);
  Sentry.captureException(error);
});
```

---

## Performance Monitoring

### Tracing Configuration

```typescript
Sentry.init({
  tracesSampleRate: 0.2,         // 20% uniform sampling
  // OR use dynamic sampling:
  tracesSampler: (samplingContext) => {
    const { name, attributes } = samplingContext;
    if (name.includes("/health")) return 0;          // skip health checks
    if (attributes?.["http.target"] === "/api/pay") return 1.0; // always trace payments
    return 0.2;                                       // default 20%
  },
});
```

### Custom Spans

```typescript
import * as Sentry from "@sentry/nextjs";

// Active span (auto-closes with callback)
const result = await Sentry.startSpan(
  { name: "process-payment", op: "payment" },
  async (span) => {
    span.setAttribute("payment.method", "card");
    const result = await processPayment();
    span.setAttribute("payment.amount", result.amount);
    return result;
  }
);

// Inactive span (manual control)
const span = Sentry.startInactiveSpan({ name: "db-query", op: "db" });
try {
  await runQuery();
} finally {
  span.end();
}
```

### Distributed Tracing

Headers for propagating trace context to other services:

```typescript
// Outgoing fetch — Sentry auto-instruments fetch/XHR
// Configure which URLs to trace:
Sentry.init({
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.myapp\.com/,
  ],
});
```

---

## Session Replay

Replay captures video-like reproduction of browser sessions with full privacy masking by default.

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  integrations: [
    Sentry.replayIntegration({
      // Privacy — defaults are strict
      maskAllText: true,          // mask all text (default: true)
      blockAllMedia: true,        // block images/video (default: true)
      maskAllInputs: true,        // mask form inputs (default: true)

      // Network capture
      networkDetailAllowUrls: [/^https:\/\/api\.myapp\.com/],
      networkRequestHeaders: ["X-Request-Id"],
      networkResponseHeaders: ["X-Response-Time"],
    }),
  ],
  replaysSessionSampleRate: 0.1,    // 10% of normal sessions
  replaysOnErrorSampleRate: 1.0,    // 100% of sessions with errors
});
```

### Privacy Controls in HTML

```html
<!-- Block specific elements (replaced with placeholder) -->
<img src="..." data-sentry-block />

<!-- Mask text content -->
<p data-sentry-mask>Sensitive text here</p>

<!-- Unmask specific element (override global masking) -->
<span data-sentry-unmask>Public info</span>
```

### Programmatic Control

```typescript
const replay = Sentry.getReplay();

// Manual start/stop
replay.start();
replay.stop();

// Flush buffer immediately (e.g. on important events)
await replay.flush();
```

---

## Source Maps

Source maps allow Sentry to display original TypeScript/JSX in stack traces.

### Next.js (via `withSentryConfig`)

Source maps upload automatically during `next build` when env vars are set:

```bash
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=my-org
SENTRY_PROJECT=my-project
```

Get auth token: `npx @sentry/wizard@latest -i nextjs` or Settings > Auth Tokens in Sentry UI.

### Vite / React SPA

```bash
npm install @sentry/vite-plugin --save-dev
```

`vite.config.ts`:
```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: { sourcemap: true },
  plugins: [
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

### Manual Upload (CI/CD)

```bash
npx @sentry/cli releases new "$VERSION"
npx @sentry/cli releases files "$VERSION" upload-sourcemaps ./dist
npx @sentry/cli releases finalize "$VERSION"
npx @sentry/cli releases deploys "$VERSION" new -e production
```

---

## Releases & Deploys

Releases link errors to specific code versions and enable suspect commit tracking.

### Automatic (Next.js)

`withSentryConfig` automatically sets release to the current git SHA if `SENTRY_AUTH_TOKEN` is present.

### Manual

```typescript
Sentry.init({
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? "dev",
});
```

Set in CI:
```bash
# GitHub Actions
NEXT_PUBLIC_SENTRY_RELEASE: ${{ github.sha }}
```

### Deploy Tracking

```bash
npx @sentry/cli releases deploys "$VERSION" new \
  --env production \
  --started $(date +%s) \
  --finished $(date +%s)
```

---

## Alerts

### Issue Alerts (Error Spikes)

In Sentry UI: Alerts > Create Alert > Issue Alert

Common trigger conditions:
- "A new issue is created" — catch regressions immediately
- "An issue occurs more than N times in M minutes" — catch spikes
- "An issue affects more than N users in M minutes" — prioritize by impact
- "An issue is seen by N% of sessions" — session-rate alerting

### Metric Alerts (Performance)

Alert on percentile thresholds:
- p75 LCP > 2500ms
- p95 API response > 1000ms
- Error rate > 1% of transactions

### Uptime Monitoring

```typescript
// Cron job check-in
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "daily-export",
  status: "in_progress",
});

await runDailyExport();

Sentry.captureCheckIn({
  checkInId,
  monitorSlug: "daily-export",
  status: "ok",
  duration: elapsedSeconds,
});
```

---

## Filtering

### Before-Send Hooks

```typescript
Sentry.init({
  beforeSend(event, hint) {
    // Drop events in development
    if (process.env.NODE_ENV === "development") return null;

    // Drop specific errors
    const error = hint.originalException;
    if (error instanceof NetworkError && error.status === 404) return null;

    // Scrub PII
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    return event;
  },

  beforeSendTransaction(event) {
    // Drop health check transactions
    if (event.transaction === "GET /health") return null;
    return event;
  },
});
```

### Ignore Specific Errors

```typescript
Sentry.init({
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    /^Network Error$/,
    /ChunkLoadError/,
  ],
  ignoreTransactions: ["/health", "/ping", "/__nextjs_"],
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],
});
```

### Sampling Rules (Server-Side)

In Sentry UI: Settings > SDK Configuration > Inbound Filters

- Filter known browser extension errors
- Filter localhost events
- Filter web crawlers

---

## Pricing & Quotas

### Plans (2026)

| Plan | Price | Errors/month | Replays | Spans |
|------|-------|-------------|---------|-------|
| Developer | Free | 5K | 50 | 10K |
| Team | $26/mo | 50K | 500 | 100K |
| Business | $80/mo | 100K | 1K | 500K |
| Enterprise | Custom | Custom | Custom | Custom |

Annual billing saves ~20%. Pay-as-you-go overages available on Team+.

### Quota Management

```typescript
// Check current quota in: Settings > Subscription

// Rate limiting — drop events at SDK level when spike detected
Sentry.init({
  // Sentry's Spike Protection is automatic on paid plans
  // Manual: use beforeSend to drop low-value events
  beforeSend(event) {
    // Skip info-level breadcrumbs to reduce payload size
    if (event.breadcrumbs) {
      event.breadcrumbs.values = event.breadcrumbs.values?.filter(
        (b) => b.level !== "info"
      ) ?? [];
    }
    return event;
  },
});
```

### Reducing Event Volume

1. `tracesSampleRate` — 0.1–0.2 in production (not 1.0)
2. `replaysSessionSampleRate: 0.05` — 5% is usually enough for UX insight
3. `ignoreErrors` — filter noisy browser extension errors
4. `beforeSend` — drop 404s, expected errors, bot traffic
5. `denyUrls` — block browser extension origins
6. SDK-level filtering fires before the event leaves the browser — no quota cost

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `tracesSampleRate: 1.0` in production | Set to 0.1–0.2; 1.0 sends every transaction and will exhaust quota fast |
| Missing `SENTRY_AUTH_TOKEN` in CI | Source maps won't upload — add token to CI secrets, not just `.env.local` |
| Not setting `tunnelRoute` | Ad blockers drop ~30% of Sentry events; set `tunnelRoute: "/monitoring"` in `withSentryConfig` |
| `sendDefaultPii` unset in v9 | v9 default: IP not captured. Set `sendDefaultPii: true` if you need it |
| Initializing after routing | `Sentry.init()` must run before any route handling; use `--import` flag in Node |
| `captureException` in `useEffect` | React Strict Mode double-fires effects — use error boundaries or `try/catch` instead |
| Capturing expected errors | Use `beforeSend` to drop 4xx auth errors, validation errors, known third-party noise |
| Hardcoding DSN in source | Use env vars; DSN is public-safe but avoid embedding in committed files |
| Not using `withScope` | Global `setUser` / `setTag` persist across requests in serverless — always scope per-request |
| Skipping `Sentry.flush()` on Lambda | Serverless functions end before events send — call `await Sentry.flush(2000)` before handler returns |

### Serverless / Lambda Pattern

```typescript
import * as Sentry from "@sentry/aws-serverless";

Sentry.init({ dsn: process.env.SENTRY_DSN });

export const handler = Sentry.wrapHandler(async (event, context) => {
  // your handler
});
```

Or manually:
```typescript
export async function handler(event: APIGatewayEvent) {
  try {
    return await processEvent(event);
  } catch (error) {
    Sentry.captureException(error);
    await Sentry.flush(2000); // critical — wait for events to send
    throw error;
  }
}
```

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client + server | DSN for browser SDK |
| `SENTRY_DSN` | Server only | DSN for server SDK |
| `SENTRY_AUTH_TOKEN` | CI/build only | Source map uploads — never expose to browser |
| `SENTRY_ORG` | CI/build | Organization slug |
| `SENTRY_PROJECT` | CI/build | Project slug |
| `NEXT_PUBLIC_SENTRY_RELEASE` | Optional | Release version for commit tracking |

Get `SENTRY_AUTH_TOKEN`: Sentry UI > Settings > Auth Tokens > Create New Token (scope: `project:releases`, `org:read`).

---

## Quick Diagnostics

```typescript
// Verify SDK is initialized
console.log(Sentry.isInitialized()); // true/false

// Send a test event
Sentry.captureMessage("Sentry test — delete me", "debug");

// Check current hub/scope state
const client = Sentry.getClient();
console.log(client?.getDsn());
```

Test source maps: throw an intentional error in production build, check if Sentry shows original file/line numbers (not minified). If not — verify `SENTRY_AUTH_TOKEN` is set and `next build` completed without source map upload errors.
