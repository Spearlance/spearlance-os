---
model: claude-sonnet-4-6
context: fork
name: env-ninja
description: "Use when hardcoded secrets or API keys are detected in source code, when organizing .env files, when centralizing environment variables, or when the user says 'env ninja', 'organize env', 'hardcoded secret', 'API key in code', '.env cleanup'. Also use when onboarding detects scattered secrets."
---

# ENV-Ninja

Centralized environment variable enforcement. Scans for hardcoded secrets, organizes `.env` files with sections and comments, replaces hardcoded values with `process.env` references, and enables ongoing enforcement.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔧 env-ninja ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what you're doing]     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## Detection Patterns

ENV-Ninja uses pattern-based detection because secret values can't be read from a committed reference file (unlike NAP-Ninja which matches exact values from `business.json`).

| Pattern | Detection | Example |
|---------|-----------|---------|
| Database URLs | `(postgres\|mysql\|mongodb\|redis)://` with credentials | `"postgresql://user:pass@host:5432/db"` |
| Auth in URLs | `://[^:]+:[^@]+@` | `https://admin:secret@host.com` |
| AWS keys | `AKIA[0-9A-Z]{16}` | AWS access key IDs |
| Stripe keys | `sk_live_`, `pk_live_`, `sk_test_`, `rk_live_` | Stripe secret/publishable keys |
| JWT tokens | `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` | Inline JWTs |
| PEM keys | `-----BEGIN.*PRIVATE KEY-----` | Inline private keys |
| API keys | Long alphanumeric (20+) assigned to `key`, `secret`, `token`, `password` vars | `const API_KEY = "sk_abc123..."` |
| Generic secrets | Hex 32+ or base64 40+ assigned to secret-named vars | `SECRET = "a1b2c3d4..."` |

### Smart Skip

- `.env*` files — secrets belong there
- Test files (`*.test.*`, `*.spec.*`, `__tests__/`) — fake values are fine
- `node_modules/`, `.git/`, `dist/`, `build/`, lock files
- Known false positives: CSS hex colors, UUIDs in test seeds, git SHAs

## .env Organization Format

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
DATABASE_URL=
DIRECT_URL=

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
```

### Section Categories

| Section | Variable patterns |
|---------|-----------------|
| App | `NODE_ENV`, `PORT`, `APP_*`, `NEXT_PUBLIC_APP_*` |
| Database | `DATABASE_*`, `DB_*`, `DIRECT_URL` |
| Auth | `*AUTH*`, `JWT_*`, `SESSION_*`, `COOKIE_*` |
| Third-Party APIs | External service keys not in other categories |
| Analytics & Monitoring | `POSTHOG_*`, `SENTRY_*`, `GA_*` |
| Storage | `S3_*`, `R2_*`, `CLOUDINARY_*`, `UPLOADTHING_*` |
| Feature Flags | `FEATURE_*`, `FF_*`, `ENABLE_*` |
| Misc | Everything uncategorized |

## File Separation

| File | Purpose | In .gitignore? | ENV-Ninja writes? |
|------|---------|----------------|-------------------|
| `.env.example` | Template — empty secrets, safe defaults | **No — committed** | ✓ Always generates |
| `.env` | Dev values | **Yes** | ✓ Creates from .example if missing |
| `.env.local` | Personal overrides | **Yes** | ✗ Never touches |
| `.env.production` | Production (platform-set) | **Yes** | ✗ Never touches |

**Critical:** Never write actual secret values. Only write structure (names, sections, comments) and safe defaults.

## Phases

### Phase 1: SCAN

1. Grep codebase for hardcoded secret patterns (see Detection Patterns)
2. Check existing `.env*` files — organized? `.env.example` current?
3. Check `.gitignore` — `.env*` entries present?
4. Present findings table:
   - Hardcoded secrets: N instances in M files
   - `.env.example` status: missing / outdated / current
   - `.gitignore` status: ✓ or ✗
5. Ask: "Want me to fix all of this?"

### Phase 2: ORGANIZE

1. Collect all variable names from `.env` files and `process.env.*` / `import.meta.env.*` in source
2. Sort into sections by category (see Section Categories)
3. Generate `.env.example` with `━` section dividers and empty secret values
4. Update `.env` with same structure — preserve existing values
5. Ensure `.gitignore` has `.env`, `.env.local`, `.env.*.local` entries
6. Commit: `chore(env-ninja): organize .env files and generate .env.example`

### Phase 3: REPLACE

For each hardcoded secret found:

1. Propose a variable name (e.g., `STRIPE_SECRET_KEY`, `DATABASE_URL`)
2. Add variable to `.env.example`
3. Replace hardcoded value with framework-appropriate reference

**Framework-aware replacement:**

| Framework | Pattern |
|-----------|---------|
| Node.js / Next.js | `process.env.VARIABLE_NAME` |
| Vite / React+Vite | `import.meta.env.VITE_VARIABLE_NAME` |
| Astro | `import.meta.env.VARIABLE_NAME` |
| Django / Python | `os.environ.get('VARIABLE_NAME')` |
| Any other | `process.env.VARIABLE_NAME` |

4. Commit per group: `refactor(env-ninja): move database URL to env var`

### Phase 4: VERIFY

1. Re-scan for remaining hardcoded secrets
2. Verify `.gitignore` has all `.env*` entries
3. Verify `.env.example` has an entry for every `process.env.*` call in source
4. Report: `0 hardcoded secrets remain` or flag remaining
5. Run project test suite

### Phase 5: ENABLE

1. Confirm hook is active
2. Tell user:
   ```
   ENV-Ninja is watching. Future writes that contain hardcoded
   secrets will get flagged.

   ▸ To pause: "turn off env-ninja" or set
     envNinja: false in .claude/settings.json
   ▸ To rescan: /env-ninja
   ```

## Toggle

| Action | What happens |
|--------|-------------|
| "turn off env-ninja" | Set `envNinja: false` in `.claude/settings.json` → hook silences |
| "turn on env-ninja" / `/env-ninja` | Remove `envNinja: false` → quick scan → re-enabled |

To disable: set `envNinja: false` in `.claude/settings.json` to pause the hook.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing actual secrets to `.env.example` | Only write empty values or safe defaults |
| Missing `.gitignore` entries | Always verify `.env*` exclusions |
| Using `process.env` in Vite client code | Vite requires `import.meta.env.VITE_` prefix |
| Hardcoding "just this one time" | The hook will catch it — use env vars from the start |

## Integration

**Complements:**
- `security.md` rule — broad OWASP coverage; ENV-Ninja is specifically about env var hygiene
- `nap-ninja` — same pattern for business info; ENV-Ninja handles secrets

**Pairs with:**
- `onboarding` — detects scattered secrets during project setup
- `armadillo-shepherd` — routes env-related requests here
