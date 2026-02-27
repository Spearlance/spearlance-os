# GitHub Actions Developer Reference

> **Last Updated:** February 2026
> **Runner default:** ubuntu-latest = Ubuntu 24.04 (as of Jan 17, 2025)
> **Docs:** https://docs.github.com/en/actions

---

## Table of Contents

1. [Workflow Syntax](#workflow-syntax)
2. [Triggers](#triggers)
3. [Jobs](#jobs)
4. [Actions](#actions)
5. [Caching](#caching)
6. [Secrets & Variables](#secrets--variables)
7. [Artifacts](#artifacts)
8. [Reusable Workflows](#reusable-workflows)
9. [Deployment Patterns](#deployment-patterns)
10. [Matrix Builds](#matrix-builds)
11. [Performance](#performance)
12. [Billing & Limits](#billing--limits)
13. [Common Mistakes](#common-mistakes)

---

## Workflow Syntax

Workflows live in `.github/workflows/*.yml`. Minimum required fields: `on` and `jobs`.

```yaml
name: CI                          # Optional display name

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:                              # Workflow-level env vars
  NODE_ENV: test

defaults:
  run:
    shell: bash
    working-directory: ./src      # Default for all run steps

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15           # Prevent runaway jobs

    env:                          # Job-level env vars (override workflow-level)
      DATABASE_URL: ${{ secrets.DATABASE_URL }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install
        run: npm ci

      - name: Test
        run: npm test
        env:                      # Step-level env vars
          DEBUG: "true"
```

### Contexts

`github.*` (sha, ref, event), `env.*`, `secrets.*`, `vars.*`, `inputs.*`, `needs.<job>.outputs.*`, `matrix.*`, `runner.os`, `steps.<id>.outputs.*`

### Expressions

```yaml
# Conditional
if: github.ref == 'refs/heads/main'
if: contains(github.event.pull_request.labels.*.name, 'deploy')
if: failure()           # Only run if previous step failed
if: always()            # Run regardless of prior steps
if: cancelled()         # Run if workflow was cancelled

# String functions
${{ format('Hello {0}', github.actor) }}
${{ join(matrix.os, ', ') }}
${{ toJSON(github.event) }}
${{ fromJSON(steps.data.outputs.json) }}
${{ hashFiles('**/package-lock.json') }}
```

### Setting Outputs

```yaml
steps:
  - id: version
    run: echo "tag=$(git describe --tags)" >> $GITHUB_OUTPUT

  - run: echo "Tag is ${{ steps.version.outputs.tag }}"
```

Job outputs (accessible via `needs`):

```yaml
jobs:
  build:
    outputs:
      sha: ${{ steps.get-sha.outputs.sha }}
    steps:
      - id: get-sha
        run: echo "sha=${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    steps:
      - run: echo "SHA is ${{ needs.build.outputs.sha }}"
```

---

## Triggers

### push / pull_request

```yaml
on:
  push:
    branches:
      - main
      - 'release/**'
    branches-ignore:
      - 'dependabot/**'
    paths:
      - 'src/**'
      - 'package.json'
    paths-ignore:
      - '**.md'
    tags:
      - 'v*'

  pull_request:
    types: [opened, synchronize, reopened, labeled]
    branches: [main]
```

### schedule

```yaml
on:
  schedule:
    - cron: '0 2 * * 1'    # Every Monday at 2am UTC
    - cron: '*/30 * * * *' # Every 30 minutes
```

Cron syntax: `minute hour day-of-month month day-of-week`

### workflow_dispatch (Manual)

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: Target environment
        required: true
        default: staging
        type: choice
        options: [staging, production]
      debug:
        type: boolean
        default: false
      version:
        type: string
        required: false
```

Inputs accessed via `${{ inputs.environment }}`.

Other triggers: `release`, `issues`, `issue_comment`, `create`, `delete`, `deployment`, `repository_dispatch`, `workflow_run`.

---

## Jobs

### Basic Job Structure

```yaml
jobs:
  test:
    name: Run Tests            # Display name
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

### Runners (Feb 2026)

| Label | OS | Arch | Notes |
|-------|----|------|-------|
| `ubuntu-latest` | Ubuntu 24.04 | x64 | Default since Jan 17, 2025 |
| `ubuntu-22.04` | Ubuntu 22.04 | x64 | Stable if you need specific tools |
| `ubuntu-24.04-arm` | Ubuntu 24.04 | arm64 | Public preview; free for public repos |
| `ubuntu-22.04-arm` | Ubuntu 22.04 | arm64 | Public preview |
| `windows-latest` | Windows Server 2022 | x64 | 2x billing multiplier |
| `windows-2022` | Windows Server 2022 | x64 | |
| `macos-latest` | macOS 15 | arm64 | 10x billing multiplier |
| `macos-14` | macOS 14 | arm64 | |

### Job Dependencies (needs)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  test:
    needs: build              # Waits for build to complete
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy:
    needs: [build, test]      # Wait for multiple jobs
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### Concurrency

Prevent duplicate runs. Cancel in-progress when a new run starts on the same branch:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# For deployments — don't cancel, queue instead:
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

---

## Actions

### Using Actions

```yaml
steps:
  # Versioned by tag (recommended)
  - uses: actions/checkout@v4

  # Pinned to exact SHA (most secure)
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683

  # With inputs
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: pnpm

  # From same repo
  - uses: ./.github/actions/my-action

  # Docker action
  - uses: docker://alpine:3.8
```

### actions/checkout@v4

Key options: `fetch-depth: 0` (full history, default 1), `token`, `submodules: recursive`, `ref`.

### actions/setup-node@v4

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20               # Exact version
    node-version-file: .nvmrc      # Read from file (overrides node-version)
    cache: npm                     # npm | yarn | pnpm
    cache-dependency-path: package-lock.json
    registry-url: https://registry.npmjs.org/  # For publishing
```

Supports: `lts/*`, `lts/iron`, `20.x`, `>=18`, `latest`

### Other Core Actions

| Action | Purpose |
|--------|---------|
| `actions/upload-artifact@v4` | Save build outputs (`path`, `retention-days`) |
| `actions/download-artifact@v4` | Retrieve outputs across jobs |
| `actions/github-script@v7` | Run JS with `@octokit/rest` — `github` + `context` available |

---

## Caching

### actions/cache@v4

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
      npm-
```

- `key`: Exact match first. Cache saved at end of job on hit or miss.
- `restore-keys`: Prefix fallbacks used in order when `key` misses.
- Cache is immutable — same key always returns same content. Bust by changing key.

### Granular Save/Restore

```yaml
# Restore only (don't save on cache miss)
- uses: actions/cache/restore@v4
  id: cache
  with:
    path: node_modules
    key: node-${{ hashFiles('package-lock.json') }}

- if: steps.cache.outputs.cache-hit != 'true'
  run: npm ci

# Save only (deferred save)
- uses: actions/cache/save@v4
  if: steps.cache.outputs.cache-hit != 'true'
  with:
    path: node_modules
    key: node-${{ hashFiles('package-lock.json') }}
```

### Package Manager Patterns

**npm:**
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-${{ runner.os }}-
- run: npm ci
```

**pnpm:**
```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9

- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm             # setup-node has built-in pnpm support

- run: pnpm install --frozen-lockfile
```

**Yarn:**
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.yarn/cache
    key: yarn-${{ runner.os }}-${{ hashFiles('**/yarn.lock') }}
    restore-keys: yarn-${{ runner.os }}-
- run: yarn install --immutable
```

### Cache Limits

- **10 GB** per repo; LRU evicted when exceeded
- Caches older than **7 days** evicted automatically
- Cache is scoped to branch; PRs can read from base branch cache
- New service (Feb 2025): up to ~80% faster upload on GitHub-hosted runners

---

## Secrets & Variables

### GITHUB_TOKEN

Automatically available in every workflow. Scoped to the repo, expires when the run ends.

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      token: ${{ secrets.GITHUB_TOKEN }}

  - name: Create release
    uses: actions/github-script@v7
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      script: |
        await github.rest.repos.createRelease({ ... })
```

Two modes (Settings > Actions > General): **permissive** (read/write most scopes) or **restricted** (no access by default). Forks always get read-only regardless.

Override per-workflow or per-job:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  deploy:
    permissions:
      contents: read     # Overrides workflow-level for this job
      id-token: write    # Required for OIDC
```

### Repository Secrets

```yaml
- run: ./deploy.sh
  env:
    API_KEY: ${{ secrets.API_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Environment Secrets

Secrets scoped to a deployment environment (e.g., production, staging):

```yaml
jobs:
  deploy:
    environment: production      # Activates environment secrets + protection rules
    steps:
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}  # Pulls from "production" environment
```

### Variables (Non-Secret)

Non-sensitive config values stored in Settings > Secrets and variables > Variables:

```yaml
env:
  API_URL: ${{ vars.API_URL }}
  REGION: ${{ vars.AWS_REGION }}
```

Variables are available at org, repo, and environment level.

### OIDC (Keyless Auth)

For AWS, GCP, Azure — no long-lived secrets needed:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
      aws-region: us-east-1
```

---

## Artifacts

Upload build outputs and share between jobs:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: dist-files
          path: |
            dist/
            !dist/**/*.map    # Exclude source maps
          retention-days: 30  # Default: 90 days

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-files
          path: dist/

      - run: npm run test:e2e
```

Omit `name` in download to retrieve all artifacts (each placed in its own subdirectory).

---

## Reusable Workflows

### Defining (Called Workflow)

```yaml
# .github/workflows/deploy.yml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string       # string | boolean | number
      dry-run:
        type: boolean
        default: false
    secrets:
      DEPLOY_TOKEN:
        required: true
    outputs:
      deployment-url:
        description: URL of the deployed app
        value: ${{ jobs.deploy.outputs.url }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - id: deploy
        run: ./deploy.sh ${{ inputs.environment }}
        env:
          TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          DRY_RUN: ${{ inputs.dry-run }}
```

### Calling

```yaml
# .github/workflows/ci.yml
jobs:
  deploy-staging:
    uses: ./.github/workflows/deploy.yml     # Same repo
    with:
      environment: staging
      dry-run: false
    secrets:
      DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

  deploy-prod:
    uses: org/shared-workflows/.github/workflows/deploy.yml@main  # Another repo
    with:
      environment: production
    secrets: inherit    # Pass all caller secrets to the called workflow
```

**Limitations:**
- Max 4 levels of nested reusable workflows
- Environment secrets can't be passed via `workflow_call` inputs — they must be declared in the called workflow's `environment:` field
- Nested workflows need secrets re-passed at each level (or use `inherit`)

---

## Deployment Patterns

### Environment Protection Rules

Create environments in Settings > Environments. Gate deployments with:
- Required reviewers (manual approval)
- Wait timer
- Deployment branches (restrict to `main` or `release/**`)

```yaml
jobs:
  deploy:
    environment: production    # Requires approval if configured
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### Deploy on Push to Main

Gate deployment behind a `test` job using `needs: test`. Set `environment: production` on the deploy job to activate environment protection rules.

### Rollback Gate Pattern

Chain jobs with `if: failure()` on the rollback job. Use `needs: [smoke-test]` to sequence deploy → smoke → promote, with rollback triggering on smoke failure (`if: always() && needs.smoke-test.result == 'failure'`).

---

## Matrix Builds

### Basic Matrix

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false     # Don't cancel other jobs if one fails
      max-parallel: 4      # Run at most 4 jobs simultaneously

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

### Include / Exclude

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20]
    include:
      - os: ubuntu-latest
        node: 22           # Add a combination not in the base matrix
        experimental: true
      - os: macos-latest   # Add extra jobs
        node: 20
    exclude:
      - os: windows-latest
        node: 18           # Skip this specific combo
```

### Dynamic Matrix

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: echo 'matrix={"include":[{"env":"staging"},{"env":"prod"}]}' >> $GITHUB_OUTPUT

  deploy:
    needs: setup
    strategy:
      matrix: ${{ fromJSON(needs.setup.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh ${{ matrix.env }}
```

---

## Performance

### Caching Checklist

| Cache | Path | Key |
|-------|------|-----|
| npm | `~/.npm` | `hashFiles('**/package-lock.json')` |
| pnpm | auto via `setup-node cache: pnpm` | `hashFiles('**/pnpm-lock.yaml')` |
| yarn | `~/.yarn/cache` | `hashFiles('**/yarn.lock')` |
| Rust/Cargo | `~/.cargo`, `./target` | `hashFiles('**/Cargo.lock')` |
| pip | `~/.cache/pip` | `hashFiles('**/requirements.txt')` |

### Parallel Jobs

Define independent jobs at the same level (no `needs:`) to run in parallel. Split slow test suites across `unit-tests`, `integration-tests`, and `lint` jobs instead of sequential steps in one job.

### Conditional Steps

Skip expensive steps when unnecessary:

```yaml
steps:
  - run: npm run build
    if: github.event_name == 'push'

  - run: npm run test:e2e
    if: contains(github.event.pull_request.labels.*.name, 'e2e')

  - run: npm run deploy
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

### Fail Fast for PRs

Gate slow jobs behind fast ones with `needs:`. Run typecheck + lint first; only proceed to tests if they pass. This avoids wasting runner minutes on jobs that would fail anyway.

---

## Billing & Limits

### Free Minutes (Private Repos)

| Plan | Free Minutes/Month |
|------|--------------------|
| GitHub Free | 2,000 |
| GitHub Pro | 3,000 |
| GitHub Team | 3,000 |
| GitHub Enterprise Cloud | 50,000 |

Public repositories: always free.

### Runner Billing Multipliers

| Runner | Multiplier |
|--------|-----------|
| Linux (x64) | 1x |
| Linux (arm64) | 1x (public preview, free for public repos) |
| Windows | 2x |
| macOS | 10x |

### 2026 Pricing Changes

- GitHub-hosted runner rates decreased up to 39% as of January 1, 2026
- New $0.002/min Actions cloud platform charge applies to private repo workflows
- Self-hosted runner fee (initially proposed) postponed; implementation TBD
- Actions remains free for all public repositories

### Limits

| Limit | Value |
|-------|-------|
| Max workflow run time | 35 days |
| Max job run time | 6 hours |
| Max concurrent jobs (Free) | 20 |
| Max concurrent jobs (Pro/Team) | 40 |
| API requests per hour (GITHUB_TOKEN) | 1,000 |
| Cache storage per repo | 10 GB |
| Artifact storage | Charged separately |
| Max workflow file size | 512 KB |
| Max env variable value | 48 KB |

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `npm install` instead of `npm ci` | Non-deterministic installs | Always use `npm ci` in CI |
| Not caching `node_modules` or package store | Slow installs every run | Cache with `hashFiles` key |
| No concurrency group | PR queue pileup | Add `concurrency: group: ${{ github.workflow }}-${{ github.ref }}` |
| Broad `on: push` | Runs on every branch | Add `branches: [main]` filter |
| `actions/cache@v3` | May fail after Feb 2025 deprecation | Upgrade all to v4 |
| Hardcoded secrets in YAML | Secret leaked in logs/diff | Always use `${{ secrets.NAME }}` |
| Missing `permissions: id-token: write` for OIDC | Auth fails | Required for keyless cloud auth |
| `needs:` + `if: failure()` | `if` evaluates in job context, not step | `if: always() && needs.X.result == 'failure'` |
| Environment secrets not accessible | Secret resolves empty | Job must declare `environment:` matching secret's environment |
| Uploading node_modules as artifact | Artifact too large, slow | Build + upload `dist/` only |
| `fetch-depth: 1` with semantic-release | Can't compute version from history | Use `fetch-depth: 0` |
| `GITHUB_TOKEN` can't push to protected branch | Push rejected | Use a PAT stored in secrets, or configure branch protection exception for Actions |
| `runs-on: ubuntu-latest` version drift | Workflow breaks after GitHub updates | Pin to `ubuntu-24.04` for stability in prod |

### Debugging Failures

Enable debug logging: set repo secrets `ACTIONS_STEP_DEBUG=true` and `ACTIONS_RUNNER_DEBUG=true`.

Dump context in a step: `run: echo "${{ toJSON(github) }}"` or use `actions/github-script@v7` with `console.log(JSON.stringify(context, null, 2))`.

SSH into runner: `uses: mxschmitt/action-tmate@v3` with `if: failure()`.

---

## Useful Links

- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Events that Trigger Workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
- [Contexts](https://docs.github.com/en/actions/learn-github-actions/contexts)
- [Expressions](https://docs.github.com/en/actions/learn-github-actions/expressions)
- [GitHub-hosted Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
- [actions/cache](https://github.com/actions/cache)
- [actions/setup-node](https://github.com/actions/setup-node)
- [Reusing Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- [Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
