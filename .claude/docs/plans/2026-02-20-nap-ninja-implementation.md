# NAP-Ninja Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add NAP-Ninja to armadillo core — a skill, rule, and hook that centralize business info and enforce it.

**Architecture:** Core skill handles the scan→centralize→replace→verify workflow. Rule provides passive enforcement. PostToolUse hook on Write/Edit warns when hardcoded business values appear. Hook self-silences when no `business.json` exists or when toggled off.

**Tech Stack:** Bash (hook), Markdown (skill + rule), node:test (tests), jq (hook JSON parsing)

---

### Task 1: Create the nap-ninja skill

**Files:**
- Create: `.claude/skills/nap-ninja/SKILL.md`
- Test: `tests/nap-ninja.test.js`

**Step 1: Write the failing test**

Create `tests/nap-ninja.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILL_DIR = join(ROOT, '.claude', 'skills', 'nap-ninja');
const SKILL_FILE = join(SKILL_DIR, 'SKILL.md');

describe('nap-ninja skill — file structure', () => {
  it('SKILL.md exists', () => {
    assert.ok(existsSync(SKILL_FILE), 'SKILL.md should exist');
  });

  it('has correct YAML frontmatter', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.startsWith('---'), 'should start with YAML frontmatter');
    assert.ok(content.includes('name: nap-ninja'), 'should have name: nap-ninja');
    assert.ok(content.includes('model: claude-sonnet-4-6'), 'should use sonnet model');
    assert.match(content, /description:.*[Bb]usiness/, 'description should mention business');
  });

  it('has mandatory announcement box', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('┏━'), 'should have box frame');
    assert.ok(content.includes('nap-ninja'), 'box should mention nap-ninja');
  });

  it('documents all 5 phases', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('DETECT'), 'should have DETECT phase');
    assert.ok(content.includes('CENTRALIZE'), 'should have CENTRALIZE phase');
    assert.ok(content.includes('REPLACE'), 'should have REPLACE phase');
    assert.ok(content.includes('VERIFY'), 'should have VERIFY phase');
    assert.ok(content.includes('ENABLE'), 'should have ENABLE phase');
  });

  it('documents the business.json schema', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('business.json'), 'should reference business.json');
    assert.ok(content.includes('"business"'), 'should show business section');
    assert.ok(content.includes('"address"'), 'should show address section');
    assert.ok(content.includes('"social"'), 'should show social section');
  });

  it('documents toggle behavior', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('napNinja'), 'should reference napNinja setting');
    assert.ok(content.includes('toggle') || content.includes('pause') || content.includes('disable'),
      'should document how to disable');
  });

  it('documents framework-aware replacement', () => {
    const content = readFileSync(SKILL_FILE, 'utf8');
    assert.ok(content.includes('React') || content.includes('Next'), 'should mention React/Next');
    assert.ok(content.includes('Astro') || content.includes('Django'), 'should mention other frameworks');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/nap-ninja.test.js`
Expected: FAIL — SKILL.md doesn't exist yet

**Step 3: Write the skill**

Create `.claude/skills/nap-ninja/SKILL.md`:

```markdown
---
model: claude-sonnet-4-6
name: nap-ninja
description: "Use when hardcoded business info is detected, when centralizing contact data into business.json, or when the user says 'nap ninja', 'business info', 'centralize contacts', or 'hardcoded phone/email/address'. Also use when onboarding detects scattered NAP data."
---

# NAP-Ninja

Centralized business information enforcement. Scans for hardcoded NAP (Name, Address, Phone) data, centralizes it into `business.json`, replaces all instances with references, and enables ongoing enforcement.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔧 nap-ninja ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what you're doing]     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## business.json Schema

Lives at project root. Only populated sections required — omit empty ones entirely.

```json
{
  "business": {
    "name": "Acme Corp",
    "legalName": "Acme Corporation LLC",
    "tagline": "Building better widgets since 1999",
    "phone": "+1-555-867-5309",
    "altPhone": "+1-555-867-5310",
    "fax": "+1-555-867-5311",
    "email": "hello@acme.com",
    "supportEmail": "support@acme.com",
    "url": "https://acme.com"
  },
  "address": {
    "street": "123 Main St",
    "suite": "Suite 400",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "country": "US",
    "formatted": "123 Main St, Suite 400, Austin, TX 78701"
  },
  "additionalLocations": [
    {
      "label": "Downtown Office",
      "street": "456 Congress Ave",
      "city": "Austin",
      "state": "TX",
      "zip": "78701",
      "phone": "+1-555-867-5312"
    }
  ],
  "social": {
    "facebook": "https://facebook.com/acme",
    "facebookHandle": "@acme",
    "instagram": "https://instagram.com/acme",
    "instagramHandle": "@acme",
    "twitter": "https://x.com/acme",
    "twitterHandle": "@acmecorp",
    "linkedin": "https://linkedin.com/company/acme",
    "youtube": "https://youtube.com/@acme",
    "youtubeHandle": "@acme",
    "tiktok": "https://tiktok.com/@acme",
    "tiktokHandle": "@acme",
    "pinterest": "https://pinterest.com/acme",
    "yelp": "https://yelp.com/biz/acme-austin",
    "googleBusiness": "https://g.page/acme"
  },
  "hours": {
    "monday": "9:00 AM - 5:00 PM",
    "tuesday": "9:00 AM - 5:00 PM",
    "wednesday": "9:00 AM - 5:00 PM",
    "thursday": "9:00 AM - 5:00 PM",
    "friday": "9:00 AM - 5:00 PM",
    "saturday": "Closed",
    "sunday": "Closed",
    "holidayNote": "Closed on major US holidays"
  },
  "schema": {
    "type": "LocalBusiness",
    "priceRange": "$$",
    "areaServed": ["Austin", "Round Rock", "Cedar Park"],
    "paymentAccepted": ["Cash", "Credit Card"],
    "currenciesAccepted": "USD"
  }
}
```

## The Process

### Phase 1: DETECT

1. Check if `business.json` exists at project root
2. **If yes:** Load it and scan codebase for hardcoded values that match any value in the file. Report violations with file:line references.
3. **If no:** Scan codebase for NAP-like patterns:

| Pattern | Regex / Heuristic |
|---------|-------------------|
| Phone numbers | `(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}` |
| Email addresses | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` |
| Street addresses | Lines with street numbers + state abbreviations + zip codes |
| Social URLs | `facebook.com/`, `instagram.com/`, `x.com/`, `linkedin.com/`, `youtube.com/`, `tiktok.com/`, `pinterest.com/` |
| Social handles | `@username` patterns near social context |
| Repeated strings | Any non-trivial string (8+ chars) appearing in 3+ different files |

4. Present findings in a table grouped by type
5. Ask user: "Which of these are business data to centralize?"

**Exclude from scanning:** `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `.astro/`, `__pycache__/`, `*.lock`, `*.map`, image/font files, `business.json` itself.

### Phase 2: CENTRALIZE

1. Build `business.json` from confirmed values using the schema above
2. Show the generated file to user for approval
3. Write `business.json` to project root
4. Commit: `feat(nap-ninja): create business.json`

### Phase 3: REPLACE

Framework-aware replacement — detect from project files:

| Detection | Framework | Import Pattern |
|-----------|-----------|---------------|
| `next.config.*` or `app/layout.*` | Next.js | `import business from '@/business.json'` |
| `astro.config.*` | Astro | `import business from '../business.json'` in frontmatter |
| `svelte.config.*` | SvelteKit | `import business from '$lib/../business.json'` |
| `nuxt.config.*` | Nuxt | `import business from '~/business.json'` |
| `manage.py` or `settings.py` | Django | `json.load(open(BASE_DIR / 'business.json'))` in context processor |
| `*.html` only (no framework) | Static HTML | Leave `<!-- NAP: field.path -->` comment markers + note |
| Anything else | Generic | `import business from './business.json'` or `require('./business.json')` |

For each file with hardcoded values:
1. Add the import statement if not present
2. Replace each hardcoded value with the reference (e.g., `business.business.phone`)
3. Verify the replacement renders correctly
4. Commit per logical group: `refactor(nap-ninja): centralize NAP data in <component>`

### Phase 4: VERIFY

1. Grep entire codebase for every string value in `business.json`:
   - Exact match for all strings
   - Normalized variants for phone numbers (strip all formatting: dashes, parens, spaces, dots)
2. Exclude: `business.json` itself, `node_modules/`, `.git/`, build output, lock files
3. Report results:
   - `✓ 0 hardcoded instances remain` → proceed to Phase 5
   - `✗ N instances remain` → show file:line for each, fix them, re-verify
4. Run the project's existing test suite to confirm nothing broke

### Phase 5: ENABLE

1. Confirm the NAP-Ninja hook is active (auto-enabled when `business.json` exists)
2. Tell the user:

```
NAP-Ninja is watching. Future writes that hardcode values
from business.json will get flagged.

▸ To pause: tell me "turn off nap-ninja" or set
  napNinja: false in .claude/settings.json
▸ To rescan: /nap-ninja
```

## Toggle

### Turning Off

When user says "turn off nap ninja", "disable nap", "pause nap-ninja":

1. Read `.claude/settings.json` (or create if missing)
2. Set `"napNinja": false`
3. Response: `NAP-Ninja paused. Run /nap-ninja to re-enable and rescan.`

### Turning On

When user runs `/nap-ninja` or says "turn on nap ninja":

1. Remove `napNinja: false` from settings (or set `true`)
2. Run a quick verification scan
3. Response: `NAP-Ninja re-enabled. Watching for hardcoded business data.`

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Replacing values in test fixtures | Skip test directories during REPLACE phase |
| Missing phone number variants | Always normalize: strip `+1`, `-`, `(`, `)`, `.`, spaces |
| Flagging short strings like "US" or "TX" | Only match strings 4+ characters |
| Breaking import paths | Use framework-appropriate path resolution |
| Not checking structured data (JSON-LD) | Scan `<script type="application/ld+json">` blocks too |
| Replacing in `business.json` itself | Always exclude the config file from scans |

## Integration

**Routed by:** `armadillo-shepherd` → Data Quality section
**Enforced by:** `nap-enforcement` rule (passive) + `nap-ninja-hook.sh` (active)
**Pairs with:** `onboarding` (auto-detect on project setup), `seo-flow` / `seo-pulse` (structured data consistency)
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/nap-ninja.test.js`
Expected: PASS — all 7 assertions

**Step 5: Commit**

```bash
git add tests/nap-ninja.test.js .claude/skills/nap-ninja/SKILL.md
git commit -m "feat(nap-ninja): add skill — 5-phase NAP centralization workflow"
```

---

### Task 2: Create the nap-enforcement rule

**Files:**
- Create: `.claude/rules/nap-enforcement.md`
- Test: `tests/nap-ninja.test.js` (append to existing)

**Step 1: Write the failing test**

Append to `tests/nap-ninja.test.js`:

```js
describe('nap-enforcement rule — file structure', () => {
  const RULE_FILE = join(ROOT, '.claude', 'rules', 'nap-enforcement.md');

  it('nap-enforcement.md exists in rules/', () => {
    assert.ok(existsSync(RULE_FILE), 'nap-enforcement.md should exist');
  });

  it('mentions business.json as the source of truth', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(content.includes('business.json'), 'should reference business.json');
  });

  it('lists what counts as business info', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(content.includes('phone'), 'should mention phone');
    assert.ok(content.includes('email'), 'should mention email');
    assert.ok(content.includes('address'), 'should mention address');
    assert.ok(content.includes('social'), 'should mention social');
  });

  it('states the rule is conditional on business.json existing', () => {
    const content = readFileSync(RULE_FILE, 'utf8');
    assert.ok(
      content.includes('does NOT exist') || content.includes('does not exist') || content.includes('inactive'),
      'should state rule is inactive without business.json'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/nap-ninja.test.js`
Expected: FAIL on the new rule tests

**Step 3: Write the rule**

Create `.claude/rules/nap-enforcement.md`:

```markdown
# NAP Enforcement

When `business.json` exists at the project root, NEVER hardcode business information in source files. Always import and reference from `business.json`.

## What Counts as Business Info

- **Identity:** Business name, legal name, tagline
- **Contact:** Phone numbers, fax, email addresses (primary and support)
- **Address:** Street, city, state, zip, country, formatted address, additional locations
- **Social:** All social media URLs and @handles (Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok, Pinterest, Yelp, Google Business)
- **Hours:** Business hours for any day, holiday notes
- **Schema:** Business type, price range, area served

## When Writing Components That Display Business Info

1. Import `business.json` (framework-appropriate import)
2. Reference the field: `business.business.phone`, `business.address.formatted`, etc.
3. Never copy-paste the actual value into the component

## When This Rule Is Inactive

When `business.json` does NOT exist at the project root, this rule is inactive. Not every project has business info to centralize.

## When Hardcoding Is OK

- Test fixtures and mock data (use obviously fake values)
- Documentation examples
- The `business.json` file itself
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/nap-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/rules/nap-enforcement.md tests/nap-ninja.test.js
git commit -m "feat(nap-ninja): add nap-enforcement rule"
```

---

### Task 3: Create the nap-ninja hook

**Files:**
- Create: `.claude/hooks/nap-ninja-hook.sh`
- Test: `tests/nap-ninja.test.js` (append to existing)

**Step 1: Write the failing test**

Append to `tests/nap-ninja.test.js`:

```js
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HOOK_SCRIPT = join(ROOT, '.claude', 'hooks', 'nap-ninja-hook.sh');

describe('nap-ninja-hook.sh — file structure', () => {
  it('hook script exists', () => {
    assert.ok(existsSync(HOOK_SCRIPT), 'nap-ninja-hook.sh should exist');
  });

  it('hook script is executable', () => {
    const { mode } = statSync(HOOK_SCRIPT);
    assert.ok((mode & 0o111) !== 0, 'should be executable');
  });
});

describe('nap-ninja-hook.sh — behavior', () => {
  // Helper to run hook with simulated Write tool input
  function runHook(filePath, fileContent, opts = {}) {
    const input = JSON.stringify({
      tool_input: { file_path: filePath, content: fileContent },
      tool_result: ''
    });
    const env = {
      ...process.env,
      CLAUDE_PROJECT_DIR: opts.projectDir || tmpdir()
    };
    try {
      const stdout = execSync(`bash "${HOOK_SCRIPT}"`, {
        input,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        timeout: 5000,
      });
      return { exitCode: 0, stdout, stderr: '' };
    } catch (err) {
      return { exitCode: err.status, stdout: err.stdout || '', stderr: err.stderr || '' };
    }
  }

  it('exits silently when no business.json exists', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const result = runHook('/some/file.tsx', '<div>555-867-5309</div>', { projectDir: tmpDir });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('warns when hardcoded phone from business.json is found', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      business: { phone: '+1-555-867-5309' }
    }));
    const result = runHook(
      join(tmpDir, 'src', 'Footer.tsx'),
      '<a href="tel:+1-555-867-5309">Call us</a>',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0, 'should exit 0 (warn, not block)');
    assert.ok(result.stderr.includes('NAP-Ninja') || result.stderr.includes('nap-ninja'),
      'stderr should contain NAP-Ninja warning');
  });

  it('warns when hardcoded email from business.json is found', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      business: { email: 'hello@acme.com' }
    }));
    const result = runHook(
      join(tmpDir, 'src', 'Contact.tsx'),
      '<a href="mailto:hello@acme.com">Email us</a>',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.ok(result.stderr.includes('NAP-Ninja') || result.stderr.includes('nap-ninja'),
      'should warn about hardcoded email');
  });

  it('stays silent when written content has no matching values', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      business: { phone: '+1-555-867-5309', email: 'hello@acme.com' }
    }));
    const result = runHook(
      join(tmpDir, 'src', 'About.tsx'),
      '<div>No business info here</div>',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('skips business.json itself', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const bizJson = JSON.stringify({ business: { phone: '+1-555-867-5309' } });
    writeFileSync(join(tmpDir, 'business.json'), bizJson);
    const result = runHook(
      join(tmpDir, 'business.json'),
      bizJson,
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('skips short values (< 4 chars) to avoid false positives', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      address: { state: 'TX', country: 'US' }
    }));
    const result = runHook(
      join(tmpDir, 'src', 'Address.tsx'),
      '<span>TX</span><span>US</span>',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should not warn for short values');
  });

  it('skips test files', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      business: { phone: '+1-555-867-5309' }
    }));
    const result = runHook(
      join(tmpDir, 'src', 'Footer.test.tsx'),
      'expect(phone).toBe("+1-555-867-5309")',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should not warn in test files');
  });

  it('respects napNinja: false toggle', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      business: { phone: '+1-555-867-5309' }
    }));
    writeFileSync(join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
      napNinja: false
    }));
    const result = runHook(
      join(tmpDir, 'src', 'Footer.tsx'),
      '<div>+1-555-867-5309</div>',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '', 'should be silent when napNinja is false');
  });

  it('detects normalized phone variants (no dashes)', () => {
    const tmpDir = join(tmpdir(), `nap-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'business.json'), JSON.stringify({
      business: { phone: '+1-555-867-5309' }
    }));
    const result = runHook(
      join(tmpDir, 'src', 'Footer.tsx'),
      '<a href="tel:15558675309">Call</a>',
      { projectDir: tmpDir }
    );
    assert.equal(result.exitCode, 0);
    assert.ok(result.stderr.includes('NAP-Ninja') || result.stderr.includes('nap-ninja'),
      'should detect phone even without dashes');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/nap-ninja.test.js`
Expected: FAIL — hook script doesn't exist yet

**Step 3: Write the hook**

Create `.claude/hooks/nap-ninja-hook.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse hook: warns when written content contains hardcoded values from business.json.
# Matcher: Write|Edit — fires on file writes and edits.
# Exit 0 always (warning only, never blocking).
# Self-silences when: no business.json, napNinja: false, test files, short values.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || FILE_PATH=""

# No file path → nothing to check
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Determine project root
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Check napNinja toggle — if explicitly false, exit silently
SETTINGS_FILE="${PROJECT_DIR}/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  NAP_SETTING=$(jq -r '.napNinja // "unset"' "$SETTINGS_FILE" 2>/dev/null) || NAP_SETTING="unset"
  if [ "$NAP_SETTING" = "false" ]; then
    exit 0
  fi
fi

# Check business.json exists
BUSINESS_JSON="${PROJECT_DIR}/business.json"
if [ ! -f "$BUSINESS_JSON" ]; then
  exit 0
fi

# Skip business.json itself
BASENAME=$(basename "$FILE_PATH")
if [ "$BASENAME" = "business.json" ]; then
  exit 0
fi

# Skip non-source files
case "$FILE_PATH" in
  */node_modules/*|*/.git/*|*/dist/*|*/build/*|*/.next/*|*/.astro/*|*/__pycache__/*) exit 0 ;;
  *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.map|*.lock) exit 0 ;;
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

# Normalize phone: strip +, -, (, ), spaces, dots → just digits
normalize_phone() {
  echo "$1" | tr -d '+- ()./' | sed 's/^1//'
}

# Extract all string values from business.json (flatten nested objects)
# Skip arrays and non-string values
MATCHES=""
while IFS= read -r line; do
  KEY=$(echo "$line" | cut -d'=' -f1)
  VALUE=$(echo "$line" | cut -d'=' -f2-)

  # Skip empty or short values (< 4 chars → too many false positives)
  if [ ${#VALUE} -lt 4 ]; then
    continue
  fi

  # Check exact match
  if echo "$CONTENT" | grep -qF "$VALUE"; then
    MATCHES="${MATCHES}\n  ▪ '${VALUE}' → use business.json field: ${KEY}"
    continue
  fi

  # For phone-like values, also check normalized form
  NORMALIZED=$(normalize_phone "$VALUE")
  if [ ${#NORMALIZED} -ge 10 ]; then
    CONTENT_NORMALIZED=$(normalize_phone "$CONTENT")
    if echo "$CONTENT_NORMALIZED" | grep -qF "$NORMALIZED"; then
      MATCHES="${MATCHES}\n  ▪ '${VALUE}' (normalized) → use business.json field: ${KEY}"
    fi
  fi
done < <(jq -r '
  paths(scalars) as $p |
  "\($p | join("."))=\(getpath($p))"
' "$BUSINESS_JSON" 2>/dev/null | grep -v '^\[' || true)

if [ -n "$MATCHES" ]; then
  echo "⚠ NAP-Ninja: hardcoded business data in $(basename "$FILE_PATH"):" >&2
  echo -e "$MATCHES" >&2
  echo "  Reference business.json instead of hardcoding." >&2
fi

exit 0
```

Make it executable:

```bash
chmod +x .claude/hooks/nap-ninja-hook.sh
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/nap-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/hooks/nap-ninja-hook.sh tests/nap-ninja.test.js
git commit -m "feat(nap-ninja): add PostToolUse hook — warns on hardcoded NAP values"
```

---

### Task 4: Wire hook into hooks.json

**Files:**
- Modify: `.claude/hooks/hooks.json`
- Test: `tests/nap-ninja.test.js` (append to existing)

**Step 1: Write the failing test**

Append to `tests/nap-ninja.test.js`:

```js
describe('nap-ninja — hooks.json wiring', () => {
  it('hooks.json has nap-ninja-hook entry on PostToolUse Write|Edit', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, '.claude', 'hooks', 'hooks.json'), 'utf8'));
    const postToolUse = hooks.hooks.PostToolUse || [];
    const writeEditEntry = postToolUse.find(e =>
      e.matcher === 'Write|Edit' && e.hooks && e.hooks.some(h =>
        h.command && h.command.includes('nap-ninja-hook.sh')
      )
    );
    assert.ok(writeEditEntry, 'should have a PostToolUse entry for Write|Edit with nap-ninja-hook.sh');
  });

  it('nap-ninja hook is NOT async (needs to warn in same turn)', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, '.claude', 'hooks', 'hooks.json'), 'utf8'));
    const postToolUse = hooks.hooks.PostToolUse || [];
    for (const entry of postToolUse) {
      if (!entry.hooks) continue;
      for (const hook of entry.hooks) {
        if (hook.command && hook.command.includes('nap-ninja-hook.sh')) {
          assert.ok(!hook.async, 'nap-ninja hook should not be async');
        }
      }
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/nap-ninja.test.js`
Expected: FAIL — hooks.json doesn't reference nap-ninja-hook.sh yet

**Step 3: Update hooks.json**

Add to the `PostToolUse` array in `.claude/hooks/hooks.json`, in the existing `Write|Edit` matcher block. Add as another hook alongside `async-lint.sh`:

Find the existing PostToolUse entry with matcher `"Write|Edit"` and add the nap-ninja hook. The entry currently looks like:

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

Add the nap-ninja hook (synchronous, not async) to the same hooks array:

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/nap-ninja-hook.sh"
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

**Step 4: Run test to verify it passes**

Run: `node --test tests/nap-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/hooks/hooks.json tests/nap-ninja.test.js
git commit -m "feat(nap-ninja): wire hook into hooks.json PostToolUse"
```

---

### Task 5: Update manifest, build script, and shepherd routing

**Files:**
- Modify: `armadillo.json` — add `nap-ninja` to `core.skills`, `nap-enforcement.md` to `core.rules`, `nap-ninja-hook.sh` to `core.hooks`
- Modify: `scripts/build-claude-md.js` — add `nap-ninja` to `SKILL_DESCRIPTIONS` and `CORE_CATEGORIES`, add `nap-enforcement` to `RULES_DESCRIPTIONS`
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md` — add Data Quality routing section
- Test: `tests/nap-ninja.test.js` (append to existing)

**Step 1: Write the failing test**

Append to `tests/nap-ninja.test.js`:

```js
describe('nap-ninja — manifest registration', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));

  it('nap-ninja is in core.skills', () => {
    assert.ok(manifest.core.skills.includes('nap-ninja'), 'nap-ninja should be in core.skills');
  });

  it('nap-enforcement.md is in core.rules', () => {
    assert.ok(manifest.core.rules.includes('nap-enforcement.md'), 'nap-enforcement.md should be in core.rules');
  });

  it('nap-ninja-hook.sh is in core.hooks', () => {
    assert.ok(manifest.core.hooks.includes('nap-ninja-hook.sh'), 'nap-ninja-hook.sh should be in core.hooks');
  });
});

describe('nap-ninja — build script descriptions', () => {
  const buildScript = readFileSync(join(ROOT, 'scripts', 'build-claude-md.js'), 'utf8');

  it('SKILL_DESCRIPTIONS has nap-ninja entry', () => {
    assert.ok(buildScript.includes("'nap-ninja'"), 'build script should have nap-ninja description');
  });

  it('RULES_DESCRIPTIONS has nap-enforcement entry', () => {
    assert.ok(buildScript.includes("'nap-enforcement'"), 'build script should have nap-enforcement description');
  });
});

describe('nap-ninja — shepherd routing', () => {
  const shepherd = readFileSync(join(ROOT, '.claude', 'skills', 'armadillo-shepherd', 'SKILL.md'), 'utf8');

  it('shepherd has nap-ninja in routing table', () => {
    assert.ok(shepherd.includes('nap-ninja'), 'shepherd should route to nap-ninja');
  });

  it('shepherd has Data Quality section', () => {
    assert.ok(
      shepherd.includes('Data Quality') || shepherd.includes('data quality'),
      'shepherd should have Data Quality routing section'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/nap-ninja.test.js`
Expected: FAIL — manifest doesn't have nap-ninja yet

**Step 3a: Update armadillo.json**

Add to `core.skills` array (alphabetical position after `finishing-a-development-branch`):

```
"nap-ninja",
```

Add to `core.rules` array:

```
"nap-enforcement.md",
```

Add to `core.hooks` array:

```
"nap-ninja-hook.sh",
```

**Step 3b: Update scripts/build-claude-md.js**

Add to `CORE_CATEGORIES` — create a new category:

```js
'Data Quality': [
  'nap-ninja',
],
```

Add to `SKILL_DESCRIPTIONS`:

```js
'nap-ninja': 'Centralized business info enforcement — scan, centralize to business.json, replace, verify',
```

Add to `RULES_DESCRIPTIONS`:

```js
'nap-enforcement': 'Always reference business.json — never hardcode NAP data in source files',
```

**Step 3c: Update shepherd routing**

Add a new section to `.claude/skills/armadillo-shepherd/SKILL.md` after the "SEO" section and before "Hard Rules":

```markdown
### Data Quality

| Request | Skill |
|---------|-------|
| Hardcoded business info, centralize NAP data, business.json, contact info scattered | `nap-ninja` |
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/nap-ninja.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add armadillo.json scripts/build-claude-md.js .claude/skills/armadillo-shepherd/SKILL.md tests/nap-ninja.test.js
git commit -m "feat(nap-ninja): register in manifest, build script, and shepherd routing"
```

---

### Task 6: Regenerate CLAUDE.md and run full test suite

**Files:**
- Regenerate: `.claude/CLAUDE.md`
- No new test file — run existing full suite

**Step 1: Regenerate CLAUDE.md**

Run: `node scripts/build-claude-md.js`
Expected: `✓ .claude/CLAUDE.md updated — N core skills, M packs`

**Step 2: Verify CLAUDE.md contains nap-ninja**

```bash
grep 'nap-ninja' .claude/CLAUDE.md
grep 'nap-enforcement' .claude/CLAUDE.md
```

Expected: Both should appear in the generated content.

**Step 3: Run full test suite**

Run: `node --test tests/*.test.js`
Expected: All tests pass (existing + new nap-ninja tests)

**Step 4: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: regenerate CLAUDE.md with nap-ninja skill and rule"
```
