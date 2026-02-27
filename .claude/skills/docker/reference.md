# Docker Reference

**Engine:** v29.2.1 (February 2026) | **Compose:** v2 | **Scout:** built into Docker Desktop 4.17+

---

## Table of Contents

1. [Dockerfile Instructions](#1-dockerfile-instructions)
2. [Multi-Stage Builds](#2-multi-stage-builds)
3. [Docker Compose](#3-docker-compose)
4. [Development Setup](#4-development-setup)
5. [Production Patterns](#5-production-patterns)
6. [Image Optimization](#6-image-optimization)
7. [Secrets Management](#7-secrets-management)
8. [Networking](#8-networking)
9. [Docker Init](#9-docker-init)
10. [Docker Scout](#10-docker-scout)
11. [Common Mistakes](#11-common-mistakes)

---

## 1. Dockerfile Instructions

### FROM

Always pin versions. `latest` breaks builds unpredictably.

```dockerfile
# Bad
FROM node:latest

# Good
FROM node:22-alpine
FROM node:22.14-alpine3.21

# Named stage (for multi-stage)
FROM node:22-alpine AS builder
```

**Base image selection:**

| Use Case | Image |
|----------|-------|
| Node.js general | `node:22-alpine` |
| Node.js with native deps | `node:22-bookworm-slim` |
| Python | `python:3.12-slim` |
| Go runtime | `gcr.io/distroless/static` |
| Minimal shell | `alpine:3.21` |
| No shell (security) | `scratch` |

### WORKDIR / COPY / ADD

```dockerfile
WORKDIR /app                              # creates if missing, sets cwd

COPY package.json package-lock.json ./    # prefer COPY over ADD
COPY src/ ./src/

# ADD only for tarballs/URLs
ADD https://example.com/file.tar.gz /tmp/
```

### RUN

```dockerfile
# Chain to minimize layers; clean up apt cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Heredoc for multi-line scripts (BuildKit)
RUN <<EOF
apt-get update && apt-get install -y curl
rm -rf /var/lib/apt/lists/*
EOF
```

### CMD vs ENTRYPOINT

```dockerfile
CMD ["node", "server.js"]   # exec form — PID 1 is node (correct for signals)
CMD node server.js           # shell form — PID 1 is /bin/sh (bad for signals)

ENTRYPOINT ["node"]          # fixed; CMD becomes args
CMD ["server.js"]
```

Always use exec form — shell form prevents proper signal handling.

### ENV and ARG

```dockerfile
# ARG — build-time only, not in final image
ARG NODE_ENV=production
ARG BUILD_DATE

# ENV — persists in final image
ENV NODE_ENV=production
ENV PORT=3000

# ARG before FROM for global build args
ARG BASE_TAG=22-alpine
FROM node:${BASE_TAG}
```

### EXPOSE

```dockerfile
EXPOSE 3000
# Informational only — does NOT publish ports
# Use -p 3000:3000 or ports: in compose.yaml to publish
```

### HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Disable inherited healthcheck
HEALTHCHECK NONE
```

### USER

```dockerfile
# Debian/Ubuntu
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

# Alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

---

## 2. Multi-Stage Builds

Multi-stage builds drastically reduce final image size by separating build tooling from runtime.

### Node.js Pattern

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER nodeuser
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Next.js Standalone Pattern

Requires `output: "standalone"` in `next.config.js`. See SKILL.md for the full Dockerfile.

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
```

### Go Pattern

Go compiles to a static binary — final image can be `scratch` or `distroless`.

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /app/server ./cmd/server

FROM scratch AS runner
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Use `gcr.io/distroless/static` instead of `scratch` for timezone data or basic OS utilities.

### Python Pattern

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN useradd --system --create-home appuser
USER appuser
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 3. Docker Compose

### Current Syntax (v2)

The `version:` field is **obsolete** — remove it. Commands use a space: `docker compose up`.

```yaml
# compose.yaml (preferred over docker-compose.yml)
services:
  app:
    build:
      context: .
      target: runner          # target a specific stage
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: ${DATABASE_URL}
    env_file: [.env]
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user"]
      interval: 5s
      retries: 5
      start_period: 10s
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 3

volumes:
  pgdata:

networks:
  default:
    name: myapp-network
```

### depends_on Conditions

| Condition | Behavior |
|-----------|----------|
| `service_started` | Default — container started |
| `service_healthy` | Wait for healthcheck to pass |
| `service_completed_successfully` | For init/migration containers |

### Profiles

```yaml
adminer:
  image: adminer
  profiles: [tools]    # docker compose --profile tools up
```

### Useful Commands

```bash
docker compose up -d              # start detached
docker compose up --build         # force rebuild
docker compose down               # stop + remove containers
docker compose down -v            # also remove volumes
docker compose logs -f app        # tail logs for service
docker compose exec app sh        # shell into running container
docker compose ps                 # service status
docker compose restart app        # restart one service
docker compose pull               # pull latest images
```

---

## 4. Development Setup

### Hot Reload with Volume Mounts

```yaml
services:
  app:
    build:
      context: .
      target: builder           # use dev stage, not prod
    command: npm run dev
    volumes:
      - .:/app                  # mount source into container
      - /app/node_modules       # anonymous volume — don't override node_modules
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
```

### Compose Watch (GA since Compose 2.22.0)

Compose Watch is smarter than volume mounts — it syncs specific paths and can trigger rebuilds.

```yaml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync          # sync files without rebuild
          path: ./src
          target: /app/src
        - action: sync+restart  # sync then restart container
          path: ./config
          target: /app/config
        - action: rebuild       # full rebuild
          path: package.json
```

```bash
docker compose watch            # starts watch mode
docker compose up --watch       # up + watch in one command
```

**Actions:**
| Action | Behavior |
|--------|----------|
| `sync` | Copy file changes into container (no restart) |
| `sync+restart` | Sync then restart the container process |
| `rebuild` | Rebuild image and recreate container |

### Multi-Container Dev Stack

```yaml
services:
  app:
    build: { context: ., target: builder }
    command: npm run dev
    ports: ["3000:3000"]
    develop:
      watch:
        - { action: sync, path: ./src, target: /app/src }
        - { action: rebuild, path: package.json }
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/devdb
      REDIS_URL: redis://redis:6379
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }

  db:
    image: postgres:17-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: devdb
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user"]
      interval: 3s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

volumes:
  pgdata:
```

---

## 5. Production Patterns

### Non-Root User

```dockerfile
# Debian/Ubuntu base
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

# Alpine base
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy files with correct ownership
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
```

### Health Checks

```dockerfile
# HTTP endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# TCP check (no curl)
HEALTHCHECK --interval=30s --timeout=5s \
  CMD nc -z localhost 3000 || exit 1

# Custom script
COPY healthcheck.sh /healthcheck.sh
HEALTHCHECK --interval=30s CMD /healthcheck.sh
```

### Graceful Shutdown

Exec form `CMD ["node", "server.js"]` — PID 1 is node, receives SIGTERM directly.

```javascript
process.on("SIGTERM", async () => {
  await server.close();
  await db.disconnect();
  process.exit(0);
});
```

### Resource Limits (Compose)

```yaml
services:
  app:
    deploy:
      resources:
        limits: { cpus: "1.0", memory: 512M }
        reservations: { cpus: "0.25", memory: 128M }
```

---

## 6. Image Optimization

### Layer Caching Strategy

Order from least → most frequently changed:

```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache curl        # rarely changes
COPY package.json package-lock.json ./
RUN npm ci --only=production       # changes when deps change
COPY . .                           # changes most often
RUN npm run build
```

### .dockerignore

```
.git
node_modules
npm-debug.log
dist
.next
build
out
.env*
.vscode
.idea
.DS_Store
Dockerfile*
docker-compose*
compose*.yaml
.dockerignore
```

### Image Size Comparison

| Base | Approx. Size |
|------|-------------|
| `ubuntu:24.04` | ~78MB |
| `debian:bookworm-slim` | ~75MB |
| `node:22` | ~1.1GB |
| `node:22-slim` | ~230MB |
| `node:22-alpine` | ~55MB |
| `python:3.12` | ~1.0GB |
| `python:3.12-slim` | ~130MB |
| `alpine:3.21` | ~8MB |
| `scratch` | 0 bytes |

### Build Cache Mount (BuildKit)

Speed up package installs by caching the package manager cache between builds:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Python
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# apt-get
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y curl
```

Enable BuildKit (default in Docker Engine v23+):

```bash
export DOCKER_BUILDKIT=1
docker build .
```

### Squash Layers (Use Sparingly)

```bash
docker build --squash .   # merge all layers into one
```

Useful for final security-sensitive images, but destroys caching benefits during development.

---

## 7. Secrets Management

### Build Secrets (BuildKit)

For secrets needed during build (API keys for private npm registry, etc.) — never stored in image layers:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc .
```

### Runtime Secrets (Compose)

```yaml
services:
  app:
    secrets: [db_password]
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

Secret is at `/run/secrets/db_password` in the container. Read at runtime:

```javascript
const dbPassword = fs.readFileSync("/run/secrets/db_password", "utf8").trim();
```

### Environment Files

```yaml
services:
  app:
    env_file: [.env, .env.local]  # .env.local overrides .env
```

Never commit `.env`. Use `.env.example` with placeholders.

### What NOT to Do

```dockerfile
ENV API_KEY=sk-prod-1234      # NEVER — visible in docker history
ARG API_KEY                   # NEVER — ARG values also visible in docker history
```

Check for leaks: `docker history --no-trunc myimage`

---

## 8. Networking

### Network Types

| Driver | Use Case |
|--------|----------|
| `bridge` | Default — containers on same host communicate by service name |
| `host` | Container shares host network (Linux only) |
| `none` | No networking |
| `overlay` | Multi-host (Swarm/Kubernetes) |
| `macvlan` | Container gets its own MAC/IP on LAN |

### Service Discovery

Services resolve by name within a Compose network: `DB_HOST: db` resolves to the `db` container's IP. Never use `localhost` for inter-service calls.

### Custom Networks

```yaml
services:
  frontend:
    networks: [public, internal]
  backend:
    networks: [internal]
  db:
    networks: [internal]

networks:
  public:
    driver: bridge
  internal:
    driver: bridge
    internal: true          # no external access
```

### Port Mapping

```yaml
ports:
  - "3000:3000"             # host:container
  - "127.0.0.1:3000:3000"  # bind to localhost only (more secure)
  - "3000"                  # random host port (use docker compose ps to find)
```

### DNS Resolution

```bash
docker compose exec app ping db                    # verify service resolves
docker compose exec app wget -qO- http://api:8080/health
```

---

## 9. Docker Init

`docker init` auto-generates a production-ready Dockerfile, compose.yaml, and .dockerignore for your project.

```bash
docker init
```

Interactive prompts detect your project type and ask for:
- Language/platform (Go, Python, Node.js, Rust, ASP.NET, PHP, Java)
- Application port
- Entry point

**Supported languages (Docker Desktop 4.27+):** Go, Python, Node.js, Rust, ASP.NET, PHP, Java.

Generated files:
- `Dockerfile` — multi-stage, production-optimized
- `compose.yaml` — local development setup
- `.dockerignore` — sensible defaults

Use this as a starting point and customize. The generated Dockerfiles follow current best practices (non-root user, multi-stage, pinned versions).

---

## 10. Docker Scout

Vulnerability scanning built into Docker Desktop 4.17+. Generates SBOMs and checks against NVD, GitHub Advisory Database, and vendor feeds.

### Common Commands

```bash
docker scout cves myimage:latest
docker scout cves --format sarif --output results.sarif myimage:latest
docker scout compare myimage:new myimage:old
docker scout sbom myimage:latest
docker scout recommendations myimage:latest
docker scout quickview myimage:latest
```

### CI Integration

```yaml
# GitHub Actions
- name: Scan image
  uses: docker/scout-action@v1
  with:
    command: cves
    image: myimage:latest
    only-severities: critical,high
    exit-code: true           # fail CI on findings
```

### Severity Levels

| Level | Action |
|-------|--------|
| Critical | Block deployment — fix immediately |
| High | Fix before next release |
| Medium | Schedule fix |
| Low | Track, fix when convenient |

### EPSS Score

Docker Scout includes EPSS (Exploit Prediction Scoring System) — probability a CVE will be exploited in the next 30 days. Prioritize CVEs with high EPSS even if severity is moderate.

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `version:` in compose.yaml | Remove it — obsolete, causes warnings in Compose v2 |
| `docker-compose` command | Use `docker compose` (space, no hyphen) |
| `COPY . .` before installing deps | Copy `package.json` first → install → copy source |
| `CMD node server.js` (shell form) | Use `CMD ["node", "server.js"]` (exec form) for signal handling |
| Running container as root | Add `USER` instruction with non-root user |
| No `.dockerignore` | Always create one — `node_modules` in context = slow builds |
| `ENV SECRET=value` | Never set secrets via ENV — visible in `docker history` |
| Storing state in container filesystem | Use volumes for any persistent data |
| Not pinning base image version | `FROM node:latest` will break builds when major versions release |
| `apt-get install` without `--no-install-recommends` | Installs unnecessary packages — use `--no-install-recommends` |
| Forgetting `rm -rf /var/lib/apt/lists/*` | apt cache bloats image — always clean up after apt |
| Single-stage build for compiled languages | Use multi-stage — Go images go from 1GB → under 20MB |
| `depends_on` without `condition: service_healthy` | Services start in order but don't wait for readiness |
| Hard-coding `localhost` for inter-service calls | Use service name (`db`, `redis`) — `localhost` won't resolve |
| Exposing db/redis ports in production | Remove `ports:` for internal services in production compose |
| No health check | Orchestrators can't detect app crashes without `HEALTHCHECK` |

---

## Appendix: Diagnostics & BuildKit

```bash
docker history myimage                  # layer breakdown
docker logs -f <container_id>           # tail logs
docker exec -it <container_id> sh       # shell into container
docker stats                            # resource usage
docker system prune -a --volumes        # clean everything
docker network inspect bridge           # network details
```

### BuildKit Features

Enable with `DOCKER_BUILDKIT=1` (default since Docker Engine v23):

| Feature | Syntax |
|---------|--------|
| Cache mounts | `RUN --mount=type=cache,target=/root/.npm` |
| Secret mounts | `RUN --mount=type=secret,id=key` |
| SSH agent | `RUN --mount=type=ssh git clone git@github.com:...` |
| Bind mounts | `RUN --mount=type=bind,source=.,target=/src` |
| Heredoc | `RUN <<EOF ... EOF` |
| Target stage | `docker build --target builder .` |

## Appendix: Docker Desktop Licensing

| Plan | Price | Use Case |
|------|-------|----------|
| Personal (free) | $0 | Non-commercial, <250 employees, <$10M revenue |
| Pro | $9/mo (annual) | Individual commercial use |
| Team | $15/seat/mo | Small teams |
| Business | $24/seat/mo | Enterprise, SSO, centralized management |

Docker Engine (CLI) remains open source under Apache 2.0 — no licensing restrictions.
