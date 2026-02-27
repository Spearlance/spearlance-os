---
model: claude-sonnet-4-6
name: docker
description: Use when containerizing applications with Docker — Dockerfiles, multi-stage builds, docker-compose, or container deployment. Also use when debugging container issues, optimizing image sizes, or setting up local development with Docker.
---

# Docker

## Overview
Docker Engine v29.2.1 (February 2026). Docker Compose v2 is the standard — `docker compose` (space, no hyphen). `version:` field in compose.yaml is obsolete — remove it.

## Quick Reference

| Item | Value |
|------|-------|
| **Engine** | v29.2.1 |
| **Compose** | v2 (`docker compose`, not `docker-compose`) |
| **Init** | `docker init` — auto-generates Dockerfile + compose.yaml |
| **Scout** | `docker scout cves <image>` — vulnerability scanning |
| **Desktop license** | Free: <250 employees AND <$10M revenue |

## Dockerfile Commands

| Instruction | Purpose |
|-------------|---------|
| `FROM` | Base image — always pin a version |
| `WORKDIR` | Set working directory (creates if missing) |
| `COPY` | Copy files from build context |
| `RUN` | Execute command in new layer |
| `ENV` | Set environment variable (persists in image) |
| `ARG` | Build-time variable (not in final image) |
| `CMD` | Default command — overridable at runtime |
| `ENTRYPOINT` | Fixed executable — CMD becomes its args |
| `HEALTHCHECK` | Container health probe |
| `USER` | Switch to non-root user |

## Multi-Stage Build (Next.js Standalone)

Requires `output: "standalone"` in `next.config.js`.

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
```

## Docker Compose Basics

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17-alpine
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user"]
      interval: 5s
      retries: 5
    volumes: [pgdata:/var/lib/postgresql/data]
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `version:` field in compose.yaml | Remove it — obsolete in Compose v2 |
| `COPY . .` before `npm ci` | Copy package files first to cache deps layer |
| Running as root in production | Add `USER` instruction with non-root user |
| No `.dockerignore` | Always add — prevents `node_modules` in build context |
| `ENV SECRET=value` in Dockerfile | Never — visible in `docker history`; use runtime secrets |

## Full Reference

See `reference.md` for: Dockerfile deep dive, multi-stage patterns (Go, Python), Compose Watch, dev hot-reload, production hardening, image optimization, secrets, networking, Docker Init, and Docker Scout.
