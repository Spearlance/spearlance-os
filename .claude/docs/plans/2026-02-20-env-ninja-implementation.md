# ENV-Ninja Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add centralized environment variable enforcement to armadillo core — skill, rule, hook, manifest, build script, and shepherd routing.

**Architecture:** Three pieces mirroring NAP-Ninja: a skill (`env-ninja`) for the full scan→organize→replace→verify→enable workflow, a rule (`env-enforcement.md`) for passive enforcement, and a hook (`env-ninja-hook.sh`) that fires PostToolUse on Write|Edit to warn about hardcoded secrets. Pattern-based detection (regex) instead of value-based matching (NAP-Ninja) because secrets can't be read from a committed reference file.

**Tech Stack:** Bash (hook), Markdown (skill + rule), Node.js test runner (`node:test` + `node:assert/strict`), jq (hook JSON parsing)

**Note:** This branch is based on `main`. NAP-Ninja (`feat/nap-ninja`) may merge first — if so, rebase before Task 4 to pick up shared file changes (hooks.json, armadillo.json, build-claude-md.js, shepherd). The merge conflicts will be trivial (additive entries in arrays/objects).

---

### Task 1: Create env-ninja SKILL.md + tests

**Files:**
- Create: `.claude/skills/env-ninja/SKILL.md`
- Create: `tests/env-ninja.test.js`

**Step 1: Write the failing test**

Create `tests/env-ninja.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILL_DIR = join(ROOT, '.claude', 'skills', 'env-ninja');
const SKILL_FILE = join(SKILL_DIR, 'SKILL.md');

describe('env-ninja skill — file structure', () => {
  it('SKILL.md exists', () => {
    assert.ok(existsSync(SKILL_FILE), 'SKILL.md should exist');
  });

  it('has correct YAML frontmatter', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.startsWith('---'), 'should start with YAML frontmatter');
    assert.ok(content.includes('name: env-ninja'), 'should have name: env-ninja');
    assert.ok(content.includes('model: claude-sonnet-4-6'), 'should use sonnet model');
    assert.match(content, /description:.*[Ee]nv/, 'description should mention env');
  });

  it('has mandatory announcement box', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('┏━'), 'should have box frame');
    assert.ok(content.includes('env-ninja'), 'box should mention env-ninja');
  });

  it('documents all 5 phases', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('SCAN'), 'should have SCAN phase');
    assert.ok(content.includes('ORGANIZE'), 'should have ORGANIZE phase');
    assert.ok(content.includes('REPLACE'), 'should have REPLACE phase');
    assert.ok(content.includes('VERIFY'), 'should have VERIFY phase');
    assert.ok(content.includes('ENABLE'), 'should have ENABLE phase');
  });

  it('documents detection patterns', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('API key') || content.includes('api key') || content.includes('API_KEY'),
      'should mention API keys');
    assert.ok(content.includes('DATABASE_URL') || content.includes('database'),
      'should mention database URLs');
    assert.ok(content.includes('process.env') || content.includes('import.meta.env'),
      'should mention env var references');
  });

  it('documents .env organization format', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('.env.example'), 'should mention .env.example');
    assert.ok(content.includes('.env.local') || content.includes('env.local'),
      'should mention .env.local');
    assert.ok(content.includes('.gitignore') || content.includes('gitignore'),
      'should mention .gitignore');
  });

  it('documents toggle behavior', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('envNinja'), 'should reference envNinja setting');
    assert.ok(content.includes('toggle') || content.includes('pause') || content.includes('disable'),
      'should document how to disable');
  });

  it('documents framework-aware replacement', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('process.env'), 'should mention process.env');
    assert.ok(content.includes('import.meta.env') || content.includes('Vite') || content.includes('Astro'),
      'should mention import.meta.env or Vite/Astro');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/env-ninja.test.js`
Expected: FAIL — SKILL.md doesn't exist

**Step 3: Write the skill**

Create `.claude/skills/env-ninja/SKILL.md`:

````markdown
---
model: claude-sonnet-4-6
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
````

**Step 4: Run test to verify it passes**

Run: `node --test tests/env-ninja.test.js`
Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add .claude/skills/env-ninja/SKILL.md tests/env-ninja.test.js
git commit -m "feat(env-ninja): add skill — 5-phase env var centralization workflow"
```

---

### Task 2: Create env-enforcement rule + tests

**Files:**
- Create: `.claude/rules/env-enforcement.md`
- Modify: `tests/env-ninja.test.js` (append)

**Step 1: Write the failing test**

Append to `tests/env-ninja.test.js`:

```js
describe('env-enforcement rule — file structure', () => {
  const RULE_FILE = join(ROOT, '.claude', 'rules', 'env-enforcement.md');

  it('env-enforcement.md exists in rules/', () => {
    assert.ok(existsSync(RULE_FILE), 'env-enforcement.md should exist');
  });

  it('mentions environment variables as the pattern', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(content.includes('process.env') || content.includes('environment variable'),
      'should reference env vars');
  });

  it('mentions .env.example as source of truth', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(content.includes('.env.example'), 'should reference .env.example');
  });

  it('lists what counts as secrets', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(content.includes('API key') || content.includes('api key') || content.includes('API_KEY'),
      'should mention API keys');
    assert.ok(content.includes('token') || content.includes('Token'),
      'should mention tokens');
    assert.ok(content.includes('password') || content.includes('Password') || content.includes('secret'),
      'should mention passwords/secrets');
  });

  it('states when hardcoding is OK', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(
      content.includes('test') || content.includes('Test') || content.includes('fixture'),
      'should mention test fixtures as exception'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/env-ninja.test.js`
Expected: FAIL on the new rule tests

**Step 3: Write the rule**

Create `.claude/rules/env-enforcement.md`:

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
3. Reference with the framework-appropriate env var accessor

## What Counts as a Secret

- **API keys:** Stripe, Resend, OpenAI, any third-party service key
- **Database URLs:** Connection strings with credentials
- **Auth secrets:** JWT secrets, session secrets, OAuth client secrets
- **Tokens:** Access tokens, refresh tokens, bearer tokens
- **Passwords:** Any password or passphrase
- **Private keys:** PEM files, signing keys

## .gitignore

All `.env*` files except `.env.example` must be in `.gitignore`:
- `.env`
- `.env.local`
- `.env.*.local`
- `.env.production`

## When Hardcoding Is OK

- `.env.example` itself (empty values or safe defaults like `PORT=3000`)
- Test files using obviously fake values (`"test_key_fake"`, `"sk_test_mock"`)
- Non-secret config that's truly static and public (e.g., `NODE_ENV=development` in docs)
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/env-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/rules/env-enforcement.md tests/env-ninja.test.js
git commit -m "feat(env-ninja): add env-enforcement rule"
```

---

### Task 3: Create the env-ninja hook

**Files:**
- Create: `.claude/hooks/env-ninja-hook.sh`
- Modify: `tests/env-ninja.test.js` (append)

**Step 1: Write the failing test**

Append to `tests/env-ninja.test.js`. Add these imports at the top if not already present (they may already be imported from Task 1 — check before duplicating):

```js
import { writeFileSync, mkdirSync, statSync } from 'fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
```

Then append these describe blocks:

```js
const ENV_HOOK_SCRIPT = join(ROOT, '.claude', 'hooks', 'env-ninja-hook.sh');

describe('env-ninja-hook.sh — file structure', () => {
  it('hook script exists', () => {
    assert.ok(existsSync(ENV_HOOK_SCRIPT), 'env-ninja-hook.sh should exist');
  });

  it('hook script is executable', () => {
    const { mode } = statSync(ENV_HOOK_SCRIPT);
    assert.ok((mode & 0o111) !== 0, 'should be executable');
  });
});

describe('env-ninja-hook.sh — behavior', () => {
  function runEnvHook(filePath, fileContent, opts = {}) {
    const input = JSON.stringify({
      tool_input: { file_path: filePath, content: fileContent },
      tool_result: ''
    });
    const env = {
      ...process.env,
      CLAUDE_PROJECT_DIR: opts.projectDir || tmpdir()
    };
    const result = spawnSync('bash', [ENV_HOOK_SCRIPT], {
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      timeout: 5000,
    });
    return { exitCode: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
  }

  it('warns when hardcoded database URL is found', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-dburl`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'db.ts'),
      'const db = new Pool({ connectionString: "postgresql://user:pass@localhost:5432/mydb" })',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0, 'should exit 0 (warn, not block)');
    assert.ok(result.stderr.includes('ENV-Ninja') || result.stderr.includes('env-ninja'),
      `stderr should contain ENV-Ninja warning, got: "${result.stderr}"`);
  });

  it('warns when hardcoded Stripe live key is found', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-stripe`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'payment.ts'),
      'const stripe = new Stripe("sk_live_51abc123def456ghi789jkl0")',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.ok(result.stderr.includes('ENV-Ninja') || result.stderr.includes('env-ninja'),
      `should warn about Stripe key, got: "${result.stderr}"`);
  });

  it('warns when hardcoded AWS key is found', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-aws`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'aws.ts'),
      'const accessKeyId = "AKIAIOSFODNN7EXAMPLE"',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.ok(result.stderr.includes('ENV-Ninja') || result.stderr.includes('env-ninja'),
      `should warn about AWS key, got: "${result.stderr}"`);
  });

  it('stays silent when content has no secrets', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-clean`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'utils.ts'),
      'export function add(a: number, b: number) { return a + b; }',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('skips .env files', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-envfile`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, '.env'),
      'DATABASE_URL=postgresql://user:pass@localhost:5432/mydb',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should not warn in .env files');
  });

  it('skips .env.local files', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-envlocal`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, '.env.local'),
      'STRIPE_SECRET_KEY=sk_live_51abc123def456ghi789jkl0',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should not warn in .env.local files');
  });

  it('skips test files', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-testfile`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'payment.test.ts'),
      'const mockKey = "sk_live_51abc123def456ghi789jkl0"',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should not warn in test files');
  });

  it('respects envNinja: false toggle', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-toggle`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
      envNinja: false
    }));
    const result = runEnvHook(
      join(tmpDir, 'src', 'db.ts'),
      'const url = "postgresql://user:pass@localhost:5432/mydb"',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should be silent when envNinja is false');
  });

  it('does not flag process.env references (already correct)', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-procenv`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'db.ts'),
      'const db = new Pool({ connectionString: process.env.DATABASE_URL })',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should not warn about process.env references');
  });

  it('warns when JWT token is hardcoded', () => {
    const tmpDir = join(tmpdir(), `env-test-${Date.now()}-jwt`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runEnvHook(
      join(tmpDir, 'src', 'auth.ts'),
      'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.ok(result.stderr.includes('ENV-Ninja') || result.stderr.includes('env-ninja'),
      `should warn about JWT token, got: "${result.stderr}"`);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/env-ninja.test.js`
Expected: FAIL — hook script doesn't exist yet

**Step 3: Write the hook**

Create `.claude/hooks/env-ninja-hook.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse hook: warns when written content contains hardcoded secrets.
# Matcher: Write|Edit — fires on file writes and edits.
# Exit 0 always (warning only, never blocking).
# Self-silences when: envNinja: false, .env files, test files.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || FILE_PATH=""

# No file path → nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Determine project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Check envNinja toggle — if explicitly false, exit silently
SETTINGS_FILE="${PROJECT_DIR}/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  ENV_SETTING=$(jq -r 'if .envNinja == false then "false" elif .envNinja == true then "true" else "unset" end' "$SETTINGS_FILE" 2>/dev/null) || ENV_SETTING="unset"
  if [ "$ENV_SETTING" = "false" ]; then
    exit 0
  fi
fi

# Skip .env files — secrets belong there
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  .env|.env.*|*.env) exit 0 ;;
esac

# Skip non-source files
case "$FILE_PATH" in
  */node_modules/*|*/.git/*|*/dist/*|*/build/*|*/.next/*|*/.astro/*|*/__pycache__/*) exit 0 ;;
  *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.map|*.lock) exit 0 ;;
  *package-lock.json|*yarn.lock|*pnpm-lock.yaml) exit 0 ;;
esac

# Skip test files
case "$FILE_PATH" in
  */__tests__/*|*.test.*|*.spec.*|*/test_*|*/tests/*) exit 0 ;;
esac

# Get the written content — try content (Write) then new_string (Edit)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null) || CONTENT=""
if [ -z "$CONTENT" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null) || CONTENT=""
fi

if [ -z "$CONTENT" ]; then
  exit 0
fi

MATCHES=""

# Pattern 1: Database URLs with credentials
if echo "$CONTENT" | grep -qE '(postgres|mysql|mongodb|redis|mongodb\+srv)://[^[:space:]/]+:[^[:space:]@]+@'; then
  MATCHES="${MATCHES}\n  ▪ database URL with credentials → use process.env.DATABASE_URL"
fi

# Pattern 2: Stripe live/test secret keys
if echo "$CONTENT" | grep -qE '(sk_live_|rk_live_|sk_test_)[A-Za-z0-9]{10,}'; then
  MATCHES="${MATCHES}\n  ▪ Stripe secret key → use process.env.STRIPE_SECRET_KEY"
fi

# Pattern 3: AWS access key IDs
if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  MATCHES="${MATCHES}\n  ▪ AWS access key → use process.env.AWS_ACCESS_KEY_ID"
fi

# Pattern 4: JWT tokens (three base64url segments)
if echo "$CONTENT" | grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'; then
  # Skip if it's inside a process.env or import.meta.env reference
  if ! echo "$CONTENT" | grep -qE 'process\.env\.|import\.meta\.env\.'; then
    MATCHES="${MATCHES}\n  ▪ JWT token → use process.env.JWT_TOKEN or appropriate env var"
  fi
fi

# Pattern 5: PEM private keys
if echo "$CONTENT" | grep -qF '-----BEGIN'; then
  if echo "$CONTENT" | grep -qE '-----BEGIN.*(PRIVATE KEY|RSA|EC|DSA)'; then
    MATCHES="${MATCHES}\n  ▪ private key → store in env var or file, not source code"
  fi
fi

# Pattern 6: Generic "secret"/"key"/"token"/"password" assignments with long values
# Match: const/let/var/= followed by secret-named var, then a quoted string 20+ chars
if echo "$CONTENT" | grep -qEi '(api[_-]?key|secret[_-]?key|auth[_-]?token|password|api[_-]?secret|access[_-]?token|private[_-]?key|client[_-]?secret)\s*[=:]\s*["\x27][A-Za-z0-9+/=_-]{20,}'; then
  # Don't flag if it references process.env or import.meta.env
  if ! echo "$CONTENT" | grep -qE 'process\.env\.|import\.meta\.env\.'; then
    MATCHES="${MATCHES}\n  ▪ possible hardcoded secret → use an environment variable"
  fi
fi

if [ -n "$MATCHES" ]; then
  echo "⚠ ENV-Ninja: possible hardcoded secret in $(basename "$FILE_PATH"):" >&2
  echo -e "$MATCHES" >&2
  echo "  Use environment variables instead of hardcoding secrets." >&2
fi

exit 0
```

Make it executable:

```bash
chmod +x .claude/hooks/env-ninja-hook.sh
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/env-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/hooks/env-ninja-hook.sh tests/env-ninja.test.js
git commit -m "feat(env-ninja): add PostToolUse hook — warns on hardcoded secrets"
```

---

### Task 4: Wire hook into hooks.json

**Files:**
- Modify: `.claude/hooks/hooks.json`
- Modify: `tests/env-ninja.test.js` (append)

**Step 1: Write the failing test**

Append to `tests/env-ninja.test.js`:

```js
describe('env-ninja — hooks.json wiring', () => {
  it('hooks.json has env-ninja-hook entry on PostToolUse Write|Edit', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, '.claude', 'hooks', 'hooks.json'), 'utf8'));
    const postToolUse = hooks.hooks.PostToolUse || [];
    const writeEditEntry = postToolUse.find(e =>
      e.matcher === 'Write|Edit' && e.hooks && e.hooks.some(h =>
        h.command && h.command.includes('env-ninja-hook.sh')
      )
    );
    assert.ok(writeEditEntry, 'should have a PostToolUse entry for Write|Edit with env-ninja-hook.sh');
  });

  it('env-ninja hook is NOT async (needs to warn in same turn)', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, '.claude', 'hooks', 'hooks.json'), 'utf8'));
    const postToolUse = hooks.hooks.PostToolUse || [];
    for (const entry of postToolUse) {
      if (!entry.hooks) continue;
      for (const hook of entry.hooks) {
        if (hook.command && hook.command.includes('env-ninja-hook.sh')) {
          assert.ok(!hook.async, 'env-ninja hook should not be async');
        }
      }
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/env-ninja.test.js`
Expected: FAIL — hooks.json doesn't reference env-ninja-hook.sh yet

**Step 3: Update hooks.json**

Add the env-ninja hook as a synchronous entry in the PostToolUse `Write|Edit` matcher block. Add it BEFORE `async-lint.sh`:

The current entry (line 110-120 in hooks.json):

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/async-lint.sh",
      "async": true,
      "timeout": 60
    }
  ]
}
```

Change to:

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/env-ninja-hook.sh"
    },
    {
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/async-lint.sh",
      "async": true,
      "timeout": 60
    }
  ]
}
```

**Note:** If NAP-Ninja has merged first, there will already be a nap-ninja-hook.sh entry. Add env-ninja-hook.sh alongside it (order doesn't matter — both are synchronous warnings).

**Step 4: Run test to verify it passes**

Run: `node --test tests/env-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/hooks/hooks.json tests/env-ninja.test.js
git commit -m "feat(env-ninja): wire hook into hooks.json PostToolUse"
```

---

### Task 5: Update manifest, build script, and shepherd routing

**Files:**
- Modify: `armadillo.json`
- Modify: `scripts/build-claude-md.js`
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`
- Modify: `tests/env-ninja.test.js` (append)

**Step 1: Write the failing test**

Append to `tests/env-ninja.test.js`:

```js
describe('env-ninja — manifest registration', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));

  it('env-ninja is in core.skills', () => {
    assert.ok(manifest.core.skills.includes('env-ninja'), 'env-ninja should be in core.skills');
  });

  it('env-enforcement.md is in core.rules', () => {
    assert.ok(manifest.core.rules.includes('env-enforcement.md'), 'env-enforcement.md should be in core.rules');
  });

  it('env-ninja-hook.sh is in core.hooks', () => {
    assert.ok(manifest.core.hooks.includes('env-ninja-hook.sh'), 'env-ninja-hook.sh should be in core.hooks');
  });
});

describe('env-ninja — build script descriptions', () => {
  const buildScript = readFileSync(join(ROOT, 'scripts', 'build-claude-md.js'), 'utf8');

  it('SKILL_DESCRIPTIONS has env-ninja entry', () => {
    assert.ok(buildScript.includes("'env-ninja'"), 'build script should have env-ninja description');
  });

  it('RULES_DESCRIPTIONS has env-enforcement entry', () => {
    assert.ok(buildScript.includes("'env-enforcement'"), 'build script should have env-enforcement description');
  });
});

describe('env-ninja — shepherd routing', () => {
  const shepherd = readFileSync(join(ROOT, '.claude', 'skills', 'armadillo-shepherd', 'SKILL.md'), 'utf8');

  it('shepherd has env-ninja in routing table', () => {
    assert.ok(shepherd.includes('env-ninja'), 'shepherd should route to env-ninja');
  });

  it('shepherd routes env-related requests', () => {
    assert.ok(
      shepherd.includes('hardcoded') || shepherd.includes('API key') || shepherd.includes('.env'),
      'shepherd should mention env-related trigger phrases'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/env-ninja.test.js`
Expected: FAIL — manifest doesn't have env-ninja yet

**Step 3a: Update armadillo.json**

Add to `core.skills` array (alphabetical — after `"dispatching-parallel-agents"` and before `"executing-plans"`):
```
"env-ninja",
```

Add to `core.rules` array (after `"coding-standards.md"` and before `"git-workflow.md"`):
```
"env-enforcement.md",
```

Add to `core.hooks` array (after `"enforce-tdd-order.sh"` and before `"hooks.json"`):
```
"env-ninja-hook.sh",
```

**Step 3b: Update scripts/build-claude-md.js**

Add `'env-ninja'` to the `'Data Quality'` entry in `CORE_CATEGORIES`. If `'Data Quality'` doesn't exist yet (NAP-Ninja not merged), create it after `'Meta'`:

```js
'Data Quality': [
  'env-ninja',
],
```

If `'Data Quality'` already exists (NAP-Ninja merged first), just add `'env-ninja'` to its array.

Add to `SKILL_DESCRIPTIONS`:
```js
'env-ninja': 'Centralized env var enforcement — scan, organize .env files, replace hardcoded secrets',
```

Add to `RULES_DESCRIPTIONS`:
```js
'env-enforcement': 'Never hardcode secrets — always use environment variables and .env files',
```

**Step 3c: Update shepherd routing**

If the `### Data Quality` section exists (NAP-Ninja merged first), add a new row to the table:

```markdown
| Hardcoded API keys, organize .env, environment variables, secrets in source | `env-ninja` |
```

If `### Data Quality` doesn't exist yet, create it before `## Hard Rules`:

```markdown
### Data Quality

| Request | Skill |
|---------|-------|
| Hardcoded API keys, organize .env, environment variables, secrets in source | `env-ninja` |
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/env-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add armadillo.json scripts/build-claude-md.js .claude/skills/armadillo-shepherd/SKILL.md tests/env-ninja.test.js
git commit -m "feat(env-ninja): register in manifest, build script, and shepherd routing"
```

---

### Task 6: Regenerate CLAUDE.md and run full test suite

**Files:**
- Regenerate: `.claude/CLAUDE.md`
- No new test file — run existing full suite

**Step 1: Regenerate CLAUDE.md**

Run: `node scripts/build-claude-md.js`
Expected: `✓ .claude/CLAUDE.md updated — N core skills, M packs`

**Step 2: Verify CLAUDE.md contains env-ninja**

```bash
grep 'env-ninja' .claude/CLAUDE.md
grep 'env-enforcement' .claude/CLAUDE.md
```

Expected: Both should appear in the generated content.

**Step 3: Run full test suite**

Run: `node --test tests/*.test.js`
Expected: All tests pass (existing + new env-ninja tests)

**Step 4: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: regenerate CLAUDE.md with env-ninja skill and rule"
```
