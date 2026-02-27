# ENV-Ninja Design

> Centralized environment variable enforcement for any framework.

## Problem

API keys, database URLs, tokens, and config values get hardcoded in source files — in components, server functions, configuration files, scripts. When they change or get rotated, devs hunt through the codebase. Worse, secrets accidentally end up in git history. `.env` files exist but are disorganized, undocumented, and inconsistent across environments.

## Solution

Three armadillo pieces working together:

| Piece | Type | Purpose |
|-------|------|---------|
| `env-ninja` | **Skill** (core) | Full workflow: scan → organize → replace → verify → enable |
| `env-enforcement.md` | **Rule** (core) | Passive reminder: always use env vars, never hardcode secrets |
| `env-ninja-hook.sh` | **Hook** (PostToolUse on Write/Edit) | Active enforcement: warns when hardcoded secret patterns detected in source files |

The `env-enforcement.md` rule complements (not replaces) `security.md`. The existing security rule covers broad OWASP patterns. This rule specifically handles env var centralization and `.env` file hygiene.

## Key Difference from NAP-Ninja

NAP-Ninja centralizes **public** data into a **committed** file (`business.json`).

ENV-Ninja deals with **secrets** that must **never** be committed. The replacement target is `process.env.VARIABLE_NAME` (or framework equivalent), not a JSON import. The hook uses **pattern-based detection** (regex), not exact value matching, because the actual secret values can't be read from a committed reference file.

## Detection Patterns

| Pattern | Detection | Example |
|---------|-----------|---------|
| API keys | Long alphanumeric strings (20+ chars) assigned to variables containing `key`, `api`, `token`, `secret`, `password`, `pass`, `pwd` | `const API_KEY = "sk_live_abc123def456..."` |
| Database URLs | Protocol + credentials pattern | `"postgresql://user:pass@host:5432/db"` |
| Auth credentials in URLs | `://user:password@` pattern | `https://admin:secret@host.com` |
| AWS-style keys | `AKIA[0-9A-Z]{16}` format | AWS access key IDs |
| JWT tokens | `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` | Inline JWTs |
| PEM private keys | `-----BEGIN (RSA\|EC\|DSA)? ?PRIVATE KEY-----` | Inline private keys |
| Stripe keys | `sk_live_`, `pk_live_`, `sk_test_`, `rk_live_` prefixes | Stripe secret keys |
| Generic secrets | Hex strings 32+ chars or base64 40+ chars assigned to secret-named vars | `SECRET = "a1b2c3d4e5..."` |

**Smart skip:**
- `.env*` files themselves — obviously fine
- Test files (`*.test.*`, `*.spec.*`, `__tests__/`) — test fixtures use fake values
- `node_modules/`, `.git/`, `dist/`, `build/`
- Lock files (`package-lock.json`, `yarn.lock`, etc.)
- Known false positives: CSS hex colors (`#fff`, `#1a2b3c`), UUIDs in test seeds, Git SHAs in changelogs

## .env Organization Format

When ENV-Ninja organizes `.env` files, it produces this format with section dividers and comments:

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# App
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Database
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE_URL=postgresql://localhost:5432/myapp
DIRECT_URL=postgresql://localhost:5432/myapp

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Auth
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Third-Party APIs
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Analytics & Monitoring
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=
```

### Section Categories (auto-detected by variable name prefix/suffix)

| Section | Variable patterns |
|---------|-----------------|
| App | `NODE_ENV`, `PORT`, `APP_*`, `NEXT_PUBLIC_APP_*` |
| Database | `DATABASE_*`, `DB_*`, `*_DATABASE_URL`, `DIRECT_URL` |
| Auth | `*AUTH*`, `JWT_*`, `SESSION_*`, `COOKIE_*` |
| Third-Party APIs | Everything else that looks like an external service key |
| Analytics & Monitoring | `POSTHOG_*`, `SENTRY_*`, `DATADOG_*`, `GA_*` |
| Storage | `S3_*`, `R2_*`, `CLOUDINARY_*`, `UPLOADTHING_*` |
| Feature Flags | `FEATURE_*`, `FF_*`, `ENABLE_*` |

Uncategorized vars go into a `# Misc` section at the bottom.

## File Separation

| File | Purpose | In .gitignore? | ENV-Ninja writes? |
|------|---------|----------------|-------------------|
| `.env.example` | Template — empty secrets, safe defaults | **No — committed** | ✓ Always generates |
| `.env` | Dev values | **Yes** | ✓ Creates if missing (copy from .example) |
| `.env.local` | Personal overrides | **Yes** | ✗ Never touches |
| `.env.production` | Production values | **Yes** | ✗ Never touches |

**Critical:** ENV-Ninja never writes actual secret values to files. It writes structure (variable names, sections, comments) and safe default values (`=` with empty value for secrets, `=value` for non-secrets like `PORT=3000`).

## Skill: `env-ninja`

### Trigger

- User invokes `/env-ninja`
- Shepherd routes: "hardcoded secret", "API key in code", ".env", "environment variables scattered", "organize env"
- Onboarding detects secret-like patterns in an existing project

### Phases

#### Phase 1: SCAN

1. Grep codebase for secret patterns (see Detection Patterns table)
2. Check existing `.env*` files — are they organized? Is `.env.example` current?
3. Check `.gitignore` — are `.env*` files listed?
4. Present findings:
   - Hardcoded secrets found: `N` instances in `M` files
   - `.env.example` status: missing / outdated / current
   - `.gitignore` status: ✓ / ✗
5. Ask: "Want me to fix all of this?"

#### Phase 2: ORGANIZE

1. Collect all variable names from:
   - Existing `.env` files
   - `process.env.X` references in source code
   - Hardcoded values that should become env vars
2. Sort into sections by category
3. Generate formatted `.env.example` with `━` section dividers
4. Update (or create) `.env` with same structure — preserving existing values
5. Ensure `.gitignore` has `.env`, `.env.local`, `.env.*.local` entries
6. Commit: `chore(env-ninja): organize .env files and generate .env.example`

#### Phase 3: REPLACE

For each hardcoded secret found in SCAN:
1. Propose a variable name (`STRIPE_SECRET_KEY`, `DATABASE_URL`, etc.)
2. Add the variable name to `.env.example` (value empty)
3. Replace the hardcoded value in source with `process.env.VARIABLE_NAME` (or framework equivalent)
4. Commit per logical group: `refactor(env-ninja): move database URL to env var`

**Framework-aware replacement:**

| Framework | Pattern |
|-----------|---------|
| Node.js / Next.js | `process.env.VARIABLE_NAME` |
| Vite / React | `import.meta.env.VITE_VARIABLE_NAME` |
| Astro | `import.meta.env.VARIABLE_NAME` |
| Django / Python | `os.environ.get('VARIABLE_NAME')` |
| Any other | `process.env.VARIABLE_NAME` (most common) |

#### Phase 4: VERIFY

1. Re-scan for remaining hardcoded secrets
2. Verify `.gitignore` has all `.env*` entries
3. Verify `.env.example` is complete (has an entry for every `process.env.X` call in source)
4. Report: `0 hardcoded secrets remain` or flag remaining
5. Run existing test suite

#### Phase 5: ENABLE

1. Confirm hook is active
2. Tell user:
   ```
   ENV-Ninja is watching. Future writes that contain hardcoded
   secrets will get flagged.

   ▸ To pause: "turn off env-ninja" or set
     envNinja: false in .claude/settings.json
   ▸ To rescan: /env-ninja
   ```

## Rule: `env-enforcement.md`

```markdown
# ENV Enforcement

Never hardcode secrets, API keys, tokens, passwords, or configuration
values in source files. Always use environment variables.

## Always Reference Environment Variables

- `process.env.VARIABLE_NAME` in Node.js / Next.js
- `import.meta.env.VARIABLE_NAME` in Vite / Astro
- `os.environ.get('VARIABLE_NAME')` in Python / Django
- Never inline the actual value — even in "temporary" code

## .env.example Is the Source of Truth

When `.env.example` exists, it documents every required env var.
Before writing code that needs a new env var:
1. Add the variable name to `.env.example` (value empty for secrets)
2. Add the actual value to `.env` or `.env.local` (never committed)
3. Reference with `process.env.VARIABLE_NAME`

## .gitignore

All `.env*` files except `.env.example` must be in `.gitignore`:
- `.env`
- `.env.local`
- `.env.*.local`
- `.env.production`

## When Hardcoding Is OK

- `.env.example` itself (empty values or safe defaults)
- Test files using obviously fake values (`"test_key_fake"`, `"sk_test_mock"`)
- Non-secret config that's truly static (`PORT=3000`, `NODE_ENV=development`)
```

## Hook: `env-ninja-hook.sh`

PostToolUse hook on Write|Edit.

### Logic Flow

```
1. Check .claude/settings.json for envNinja: false → exit 0 (disabled)
2. Skip .env* files — obviously fine to write secrets there
3. Skip non-source files (node_modules, .git, build, lock files, images)
4. Skip test files (__tests__, *.test.*, *.spec.*)
5. Get written content from tool_input.content (Write) or tool_input.new_string (Edit)
6. Run pattern detection against content:
   - Database URL pattern (postgres://, mysql://, mongodb://)
   - Auth credential in URL (://user:pass@)
   - Long alphanumeric string assigned to secret-named variable
   - Stripe live key prefixes (sk_live_, pk_live_)
   - AWS key pattern (AKIA...)
   - JWT token pattern (eyJ...eyJ...xxx)
   - PEM private key header
7. If matches found → stderr warning (exit 0, never blocking):
   "⚠ ENV-Ninja: possible hardcoded secret in <file>:
    - Line 12 looks like a database URL → use process.env.DATABASE_URL
    - Line 34 looks like an API key → use process.env.YOUR_API_KEY_NAME
    Reference .env instead of hardcoding."
8. If no matches → exit 0 silently
```

### Why Warning Not Blocking

Pattern matching has false positives. A hex string that looks like a secret might be a CSS value or a test UUID. Exit 0 (warn) instead of exit 2 (block) lets Claude self-correct without friction.

### Smart Silence

- No `envNinja: false` check needed — defaults to active (same as NAP-Ninja)
- Skip `.env*` files — all content is expected there
- Skip test files — fake keys are fine in tests
- Don't flag `process.env.X` references — those are already correct
- Don't flag `.env.example` — that's the template

## Toggle UX

### Turning Off
"turn off env ninja", "disable env-ninja", "pause env":
1. Skill sets `envNinja: false` in `.claude/settings.json`
2. Response: "ENV-Ninja paused. Run /env-ninja to re-enable."

### Turning On
"turn on env ninja", "enable env", or `/env-ninja`:
1. Skill removes `envNinja: false` (or sets true)
2. Quick scan
3. Response: "ENV-Ninja re-enabled. Watching for hardcoded secrets."

## Shepherd Routing

Add to the Data Quality section (alongside nap-ninja):

```markdown
| Hardcoded API keys, organize .env, environment variables, secrets in source | `env-ninja` |
```

## File Inventory

| File | Type | Location |
|------|------|----------|
| `SKILL.md` | Skill definition | `.claude/skills/env-ninja/SKILL.md` |
| `env-enforcement.md` | Rule | `.claude/rules/env-enforcement.md` |
| `env-ninja-hook.sh` | Hook | `.claude/hooks/env-ninja-hook.sh` |
| `hooks.json` update | Hook registration | Add PostToolUse Write\|Edit entry |
| `armadillo.json` update | Manifest | Add `env-ninja` to `core.skills`, `env-enforcement.md` to `core.rules`, `env-ninja-hook.sh` to `core.hooks` |
| `build-claude-md.js` update | Build script | Add description for `env-ninja` skill and `env-enforcement` rule |
| `armadillo-shepherd/SKILL.md` update | Routing | Add to Data Quality section |
| Tests | Test files | `tests/env-ninja.test.js` |
