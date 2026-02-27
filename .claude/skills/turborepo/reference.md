# Turborepo Reference

Version: 2.7.x (December 2025). Docs: [turborepo.dev](https://turborepo.dev)

---

## 1. Setup

### New Repository

```bash
npx create-turbo@latest
# prompts: project name, package manager (npm/yarn/pnpm/bun)
```

Scaffolds two Next.js apps, a shared UI package, and a pre-configured `turbo.json`.

### Add to Existing Repository

```bash
npx turbo@latest init
```

Adds `turbo` to `devDependencies` and creates a starter `turbo.json`. You still need workspace declarations in your package manager config.

### Required Files

```
my-monorepo/
├── turbo.json              # task pipeline
├── package.json            # root — declares workspaces (npm/yarn/bun)
├── pnpm-workspace.yaml     # workspace declaration (pnpm only)
├── pnpm-lock.yaml          # lockfile required
├── apps/
│   ├── web/package.json
│   └── api/package.json
└── packages/
    ├── ui/package.json
    └── utils/package.json
```

Turborepo reads the lockfile to resolve internal package dependencies — it is mandatory.

### Directory Conventions

- `apps/` — deployable applications and services
- `packages/` — internal shared libraries, configs, design systems

Packages must be exactly one level deep. `apps/**` is not supported.

---

## 2. Workspaces

### pnpm (recommended)

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

Root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.7.0",
    "prettier": "^3.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### npm / Yarn / Bun

Declare workspaces in root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "^2.7.0"
  },
  "packageManager": "npm@10.0.0"
}
```

### Naming Convention

Use scoped names to avoid npm registry conflicts. Turborepo docs use `@repo/*` (unclaimable on npm):

```json
{ "name": "@repo/ui" }
```

For real orgs: `@myorg/ui`, `@myorg/utils`, etc.

### Installing Between Packages

```bash
pnpm --filter @myorg/web add @myorg/ui   # pnpm
npm install @myorg/ui --workspace=apps/web  # npm
yarn workspace @myorg/web add @myorg/ui  # yarn
```

Writes `"@myorg/ui": "workspace:*"` in the consuming package's `dependencies`.

---

## 3. Pipeline Configuration (turbo.json)

### Schema

```json
{
  "$schema": "./node_modules/turbo/schema.json"
}
```

Available locally after install (since 2.4). Also works via CDN: `"https://turbo.build/schema.v2.json"`. Since 2.3, `turbo.jsonc` (JSON with comments) is supported.

### Full Example

```json
{
  "$schema": "./node_modules/turbo/schema.json",
  "ui": "tui",
  "concurrency": "50%",
  "globalEnv": ["NODE_ENV", "CI"],
  "globalDependencies": [".env", "tsconfig.json"],
  "envMode": "strict",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": ["DATABASE_URL", "NEXT_PUBLIC_API_URL"],
      "outputLogs": "new-only"
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/**", "*.test.ts"],
      "outputLogs": "errors-only"
    },
    "lint": {
      "dependsOn": ["^lint"],
      "outputs": []
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build"]
    }
  }
}
```

### Global Fields

| Field | Type | Description |
|-------|------|-------------|
| `ui` | `"tui" \| "stream"` | `tui` = interactive terminal UI; `stream` = sequential logs (default: `stream`) |
| `concurrency` | `number \| string` | Max parallel tasks. Integer or CPU percent, e.g. `"50%"` (default: `"10"`) |
| `globalEnv` | `string[]` | Env vars baked into the hash of every task |
| `globalDependencies` | `string[]` | File globs included in all task hashes |
| `globalPassThroughEnv` | `string[]` | Env vars available at runtime but not hashed |
| `envMode` | `"strict" \| "loose"` | `strict` = only declared vars reach tasks (default: `strict`) |
| `cacheDir` | `string` | Override local cache dir (default: `.turbo/cache`) |

### Task Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dependsOn` | `string[]` | `[]` | Tasks that must complete first |
| `outputs` | `string[]` | `[]` | Globs of files to cache and restore on hit |
| `inputs` | `string[]` | all tracked files | Files that affect this task's cache key |
| `env` | `string[]` | `[]` | Env vars that affect this task's cache key |
| `passThroughEnv` | `string[]` | — | Env vars available at runtime in strict mode, not hashed |
| `cache` | `boolean` | `true` | Set `false` for tasks that must always run |
| `persistent` | `boolean` | `false` | Long-running process; other tasks cannot depend on it |
| `interruptible` | `boolean` | `false` | Allow `turbo watch` to restart this task on input change |
| `outputLogs` | `string` | `"full"` | `full`, `hash-only`, `new-only`, `errors-only`, `none` |
| `with` | `string[]` | — | Sidecar tasks to run alongside (since 2.3) |
| `interactive` | `boolean` | `false` | Enable stdin (auto-true for persistent tasks) |

---

## 4. Caching

### How Cache Keys Work

Turborepo hashes each task from:

1. Source files in the package (or `inputs` glob)
2. Values of env vars in `env` and `globalEnv`
3. Files declared in `globalDependencies`
4. The lockfile
5. turbo.json task configuration

Hash match → replay cached stdout/stderr + restore `outputs` files from `.turbo/cache/`.

Second run with no changes → full cache hit, replays in <1 second. Add `.turbo` to `.gitignore`.

### Outputs

Always declare what your task produces. Without `outputs`, turbo records a hit but restores nothing:

```json
{
  "tasks": {
    "build": { "outputs": ["dist/**"] },
    "build:next": { "outputs": [".next/**", "!.next/cache/**"] },
    "test": { "outputs": ["coverage/**", "test-results/**"] },
    "lint": { "outputs": [] }
  }
}
```

Use `!` prefix to exclude paths from cache (saves storage):

```json
"outputs": [".next/**", "!.next/cache/**"]
```

### Inputs

Narrow cache key scope with `inputs` (defaults to all git-tracked files in the package):

```json
{
  "tasks": {
    "test": {
      "inputs": ["src/**", "test/**", "vitest.config.ts"]
    },
    "lint": {
      "inputs": ["src/**", "*.ts", ".eslintrc*"]
    }
  }
}
```

Special input tokens:

- `$TURBO_DEFAULT$` — restore default inputs and add more:
  ```json
  "inputs": ["$TURBO_DEFAULT$", "../../packages/ui/src/**"]
  ```
- `$TURBO_ROOT$` — make globs relative to repo root:
  ```json
  "inputs": ["src/**", "$TURBO_ROOT$/shared-config.json"]
  ```

### Environment Variables and Cache

**Hashed** (affect cache key):

```json
{
  "globalEnv": ["NODE_ENV", "CI"],
  "tasks": {
    "build": {
      "env": ["DATABASE_URL", "NEXT_PUBLIC_*", "VITE_*"]
    }
  }
}
```

Wildcards (`NEXT_PUBLIC_*`) and negation (`!SECRET_KEY`) are supported.

**Pass-through** (available at runtime, don't affect cache key):

```json
{
  "globalPassThroughEnv": ["HOME", "PATH"],
  "tasks": {
    "build": {
      "passThroughEnv": ["AWS_PROFILE"]
    }
  }
}
```

**.env files** — Turborepo does not load `.env` files (that's your framework's job). Declare them in `inputs` so changes bust the cache:

```json
{
  "tasks": {
    "build": {
      "inputs": ["src/**", ".env", ".env.local", ".env.production"]
    }
  }
}
```

**Loose mode** — passes all process env vars through (avoid in CI):

```bash
turbo run build --env-mode=loose
```

---

## 5. Remote Caching

Share cache across developers and CI machines.

### Vercel Remote Cache (Free)

Free for any repo linked to a Vercel account (since January 2025).

```bash
turbo login    # one-time auth
turbo link     # link repo to your Vercel team/account
```

After linking, remote cache is used automatically on all machines.

### CI Setup

Add these to your CI environment:

| Variable | Source |
|----------|--------|
| `TURBO_TOKEN` | Vercel → Settings → Tokens |
| `TURBO_TEAM` | Your Vercel team slug |

Turbo reads these automatically — no additional config.

### Remote Cache Configuration

```json
{
  "remoteCache": {
    "enabled": true,
    "signature": false,
    "timeout": 30,
    "uploadTimeout": 60
  }
}
```

For artifact signing (tamper detection):

```json
{
  "remoteCache": { "signature": true }
}
```

Set `TURBO_REMOTE_CACHE_SIGNATURE_KEY` in your environment.

### Self-Hosted

**ducktors/turborepo-remote-cache** (open source):

```bash
docker run -p 3000:3000 \
  -e TURBO_TOKEN=my-secret-token \
  -e STORAGE_PROVIDER=local \
  -e STORAGE_PATH=/cache \
  -v $(pwd)/cache:/cache \
  ghcr.io/ducktors/turborepo-remote-cache
```

Point turbo at your server:

```json
{
  "remoteCache": {
    "apiUrl": "https://my-cache-server.example.com"
  }
}
```

Or via env:

```bash
TURBO_API=https://my-cache-server.example.com
TURBO_TOKEN=my-secret-token
TURBO_TEAM=my-team
```

---

## 6. Internal Packages

Shared libraries that live in `packages/` and are imported by apps — never published to npm.

### package.json — Source-First (no build step)

Works well for TypeScript packages consumed by bundler-powered apps:

```json
{
  "name": "@repo/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./button": {
      "types": "./src/button.tsx",
      "default": "./src/button.tsx"
    }
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "react": "^18 || ^19"
  }
}
```

### package.json — Built Package (tsup/tsc)

For packages consumed by non-bundler runtimes:

```json
{
  "name": "@repo/utils",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts"
  }
}
```

Cache the build output in turbo.json:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

### TypeScript Config Inheritance

Create `packages/config-ts/base.json` with shared compiler options, then extend in each package:

```json
// packages/config-ts/base.json
{
  "compilerOptions": {
    "strict": true, "declaration": true, "esModuleInterop": true,
    "isolatedModules": true, "skipLibCheck": true, "target": "ES2022",
    "lib": ["es2022", "dom", "dom.iterable"], "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

```json
// packages/ui/tsconfig.json
{
  "extends": "@repo/config-ts/base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src"], "exclude": ["node_modules", "dist"]
}
```

### Importing Internal Packages

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*"
  }
}
```

```typescript
// apps/web/src/app/page.tsx
import { Button } from "@repo/ui";
import { formatDate } from "@repo/utils";
```

---

## 7. Task Dependencies

### dependsOn Syntax

**Topological** (`^task`) — run named task in all upstream packages first:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] }
  }
}
```

If `apps/web` depends on `packages/ui`, this ensures `@repo/ui#build` completes before `@repo/web#build`.

**Same-package** (`task`) — run another task in the same package first:

```json
{
  "tasks": {
    "test": { "dependsOn": ["build"] }
  }
}
```

**Specific package** (`@scope/name#task`):

```json
{
  "tasks": {
    "deploy": {
      "dependsOn": ["@repo/web#build", "@repo/api#build"]
    }
  }
}
```

### Execution Order Example

Given: `apps/web` → `packages/ui` → `packages/utils`

With `"dependsOn": ["^build"]`:

```
1. @repo/utils#build      (no internal deps — first)
2. @repo/ui#build         (depends on utils — after utils)
3. apps/web#build  }      (both depend on utils/ui — parallel)
   apps/api#build  }
```

Tasks at the same graph level run in parallel automatically.

### Parallel Tasks (no dependsOn)

```json
{
  "tasks": {
    "lint": {},
    "format": {}
  }
}
```

Both run across all packages simultaneously.

### Sidecar Tasks (with, since 2.3)

Run tasks alongside the primary task:

```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "with": ["check-types"]
    },
    "check-types": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 8. Development

### Running Dev Mode

```bash
turbo run dev                           # all packages
turbo run dev --filter=@repo/web        # specific package + deps
turbo run dev --filter=@repo/web --filter=@repo/api
```

### --filter Flag

```bash
turbo run build --filter=@repo/web        # exact package
turbo run build --filter=@repo/*          # glob
turbo run build --filter="./apps/web"     # directory
turbo run build --filter=...@repo/ui      # dependents of ui
turbo run build --filter=@repo/ui...      # dependencies of ui
turbo run build --filter=[main]           # changed since main
turbo run build --filter=[HEAD^1]         # changed since last commit
```

### --affected Flag

Simpler for CI — runs only tasks in packages that changed:

```bash
turbo run build test --affected
turbo run build --affected --base=develop
```

### Watch Mode

```bash
turbo watch build
```

Requires `interruptible: true` in the task definition. Restarts the task on input changes.

### Devtools (2.7+)

```bash
turbo devtools  # opens browser with hot-reloading package/task graph
```

Also at [turborepo.dev/devtools](https://turborepo.dev/devtools).

---

## 9. CI/CD

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required for --affected and --filter=[main]

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - run: pnpm turbo run build test lint check-types --affected
```

### Per-Package Environment Variables

Use composable config (since 2.7) to declare env vars per package:

```json
// apps/web/turbo.json
{
  "$schema": "../../node_modules/turbo/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "env": ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_STRIPE_KEY", "DATABASE_URL"]
    }
  }
}
```

`extends: ["//"]` means "extend from the root turbo.json". `//` is turbo's workspace root token.

### Docker Multi-Stage Builds

`turbo prune` creates a minimal monorepo subset for a specific app. Pattern:

```dockerfile
# Stage 1: prune
FROM node:20-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @repo/web --docker
# writes out/json/ (package.json + lockfile) and out/full/ (source)

# Stage 2: install deps with layer caching
FROM node:20-alpine AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install

# Stage 3: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=@repo/web

# Stage 4: minimal runtime
FROM node:20-alpine AS runner
COPY --from=builder /app/apps/web/.next/standalone ./
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### turbo-ignore for Skipping CI

```yaml
- name: Check if web changed
  id: check-web
  run: npx turbo-ignore @repo/web || echo "changed=true" >> $GITHUB_OUTPUT

- name: Deploy web
  if: steps.check-web.outputs.changed == 'true'
  run: pnpm turbo run deploy --filter=@repo/web
```

---

## 10. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Using `pipeline` key | No tasks run in turbo 2.x | Rename `pipeline` to `tasks` — removed in 2.0 |
| Missing `^` in `"dependsOn": ["build"]` | Apps build before dependency packages | Use `"^build"` — without `^` it means "this package's own build task" |
| `outputs` empty or absent | Cache hits but nothing restored; files missing | Always declare outputs: `"outputs": ["dist/**"]` |
| `cache: true` on persistent tasks | Task blocks others; turbo errors | Persistent tasks need `"cache": false, "persistent": true` |
| Internal package missing `exports` | `Cannot find module '@repo/ui'` | Add `exports` field mapping entry points in package.json |
| Env var not in `env` or `globalEnv` | Wrong values in strict mode; incorrect cache hits | Declare every var the task reads |
| `.env` in `globalDependencies` but not `inputs` | .env changes don't bust task cache | Add `.env` to `inputs` for the relevant task |
| Nested workspace pattern `apps/**` | Turbo can't find packages | Use one-level-deep: `apps/*` |
| Missing `TURBO_TOKEN` + `TURBO_TEAM` in CI | Remote cache misses in CI | Add both as CI environment secrets |
| Committing `.turbo/` directory | Huge repo bloat | Add `.turbo` to `.gitignore` |
| Depending on a persistent task | turbo errors on startup | Persistent tasks can't be dependencies — run them directly |
| `fetch-depth: 0` missing in GitHub Actions | `--affected` returns all packages always | Set `fetch-depth: 0` in `actions/checkout` |

---

## Turborepo vs Nx

| Factor | Turborepo | Nx |
|--------|-----------|-----|
| **Setup time** | ~15 min | ~45 min |
| **Config complexity** | Low — single turbo.json | Higher — project.json per package |
| **Small repos (<5 pkgs)** | Faster (~3x) | More overhead |
| **Large repos (50+ pkgs)** | Adequate | Faster (7x+), better affected analysis |
| **Code generators** | None built-in | Full generator system |
| **Module boundaries** | Manual | Enforced by constraints |
| **Language support** | JS/TS only | Any language |
| **Best for** | JS/TS teams wanting fast setup | Enterprise teams needing guardrails |

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| **2.7** | Dec 2025 | Devtools graph explorer, composable config (extends any package), Biome `noUndeclaredEnvVars` rule, Yarn 4 catalogs |
| **2.3** | Oct 2025 | Sidecar tasks (`with` field), `turbo.jsonc` support, Bun pruning, `$TURBO_ROOT$` token, `$TURBO_EXTENDS$` |
| **2.1** | Apr 2025 | Experimental Boundaries, Terminal UI improvements, experimental Watch Mode caching |
| **2.0** | Mid 2024 | `pipeline` → `tasks`, strict env mode default, Rust-native |
| **1.x** | 2022–2024 | Original Node.js, `pipeline` key |
