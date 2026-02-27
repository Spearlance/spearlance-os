---
model: claude-sonnet-4-6
name: sentry
description: Use when integrating Sentry for error tracking — SDK setup, source maps, performance monitoring, or alert configuration. Also use when debugging Sentry integration issues or optimizing event volume.
---

# Sentry

## Overview
Sentry SDK v9 (latest: ~9.32.x) for error tracking, performance monitoring, session replay, and alerting. Wizard handles most setup automatically.

## Quick Setup

```bash
npx @sentry/wizard@latest -i nextjs   # Next.js (recommended)
npx @sentry/wizard@latest -i react    # React SPA
npx @sentry/wizard@latest -i node     # Node.js
```

Wizard creates: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, instruments `next.config.ts`, and sets up source map uploads.

## Config Files

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser init — replay, client errors |
| `sentry.server.config.ts` | Node/Edge server init |
| `next.config.ts` | `withSentryConfig()` wraps Next config |
| `.env.local` | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |

## Core API

```typescript
import * as Sentry from "@sentry/nextjs";

// Capture errors
Sentry.captureException(error);
Sentry.captureMessage("Something happened", "warning");

// Add context
Sentry.setUser({ id: "123", email: "user@example.com" });
Sentry.setTag("feature", "checkout");
Sentry.addBreadcrumb({ message: "User clicked pay", category: "ui" });

// Custom spans
const span = Sentry.startInactiveSpan({ name: "my-operation" });
span.end();
```

## Performance Sampling

```typescript
Sentry.init({
  tracesSampleRate: 0.2,          // 20% of transactions
  replaysSessionSampleRate: 0.1,  // 10% of sessions
  replaysOnErrorSampleRate: 1.0,  // 100% of sessions with errors
});
```

## Pricing Tiers (2026)

| Plan | Price | Errors |
|------|-------|--------|
| Developer | Free | 5K/month |
| Team | $26/month | 50K/month |
| Business | $80/month | 100K/month |
| Enterprise | Custom | Custom |

Pay-as-you-go overages available on all paid plans.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `SENTRY_AUTH_TOKEN` in CI | Add to environment secrets — required for source map uploads |
| `tracesSampleRate: 1.0` in production | Use 0.1–0.2; 1.0 tanks performance and quota |
| Tunnel not configured | Set `tunnelRoute: "/monitoring"` to bypass ad blockers |
| Not setting `sendDefaultPii: true` | v9 default: IP addresses not captured — opt in explicitly |
| `captureException` in catch-all without context | Always `Sentry.setUser()` / `setTag()` before capturing |

## Full Reference

See `reference.md` in this skill directory for complete documentation including framework-specific setup, error capturing patterns, context/scope, session replay, source maps, releases, alerting, filtering, and quota management.
