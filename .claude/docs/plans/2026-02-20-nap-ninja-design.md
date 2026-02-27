# NAP-Ninja Design

> Centralized business information enforcement for any framework.

## Problem

Business info (name, address, phone, email, social handles, hours) gets hardcoded across a codebase — in components, footers, contact pages, meta tags, JSON-LD, emails. When it changes (new phone number, office move, rebrand), devs play whack-a-mole finding every instance. Things get missed. SEO structured data drifts from the actual site content.

## Solution

Three armadillo pieces working together:

| Piece | Type | Purpose |
|-------|------|---------|
| `nap-ninja` | **Skill** (core) | Full workflow: scan → centralize → replace → verify → enable |
| `nap-enforcement.md` | **Rule** (core) | Passive reminder: always reference `business.json` |
| `nap-ninja-hook.sh` | **Hook** (PostToolUse on Write/Edit) | Active enforcement: warns when hardcoded NAP values detected |

## business.json Schema

Lives at project root. Only populated fields required — omit empty sections entirely.

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

### What Gets Tracked

| Category | Fields | Detection Strategy |
|----------|--------|--------------------|
| Business identity | name, legalName, tagline | Exact string match from business.json |
| Contact | phone, altPhone, fax, email, supportEmail | Exact match + normalized phone variants (with/without dashes, parens, spaces) |
| Address | street, city, state, zip, formatted | Exact match on each field + the formatted combo |
| Additional locations | same fields per location | Same strategy per location entry |
| Social | all URLs + handles | Exact match on URLs and @handles |
| Hours | day values | Exact match |
| URL | business url | Exact match (skip in href context where it's a legitimate link target — only flag display text) |

## Skill: `nap-ninja`

### Trigger

- User invokes `/nap-ninja`
- Shepherd routes: "hardcoded business info", "centralize contact info", "business.json", "NAP data"
- Onboarding detects business info patterns in an existing project

### Phases

#### Phase 1: DETECT

1. Check if `business.json` exists
2. If yes: load it, scan codebase for hardcoded values that match → report violations
3. If no: scan codebase for NAP-like patterns:
   - Phone regex: `(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}`
   - Email regex: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
   - Address heuristics: lines with street numbers + state abbreviations + zip codes
   - Social URLs: facebook.com/, instagram.com/, x.com/, linkedin.com/, etc.
   - Repeated strings: any non-trivial string appearing 3+ times across different files
4. Present findings in a table, grouped by type
5. Ask user to confirm: "Which of these are business data to centralize?"

#### Phase 2: CENTRALIZE

1. Build `business.json` from confirmed values
2. Show the generated file to user for approval
3. Write `business.json` to project root
4. Commit: `feat(nap-ninja): create business.json`

#### Phase 3: REPLACE

Framework-aware replacement strategy:

| Framework | Import Pattern |
|-----------|---------------|
| React / Next.js | `import business from '../business.json'` then `{business.phone}` |
| Astro | `import business from '../business.json'` in frontmatter |
| Vue / Nuxt | Same ESM import |
| SvelteKit | Same ESM import |
| Django | `json.load(open('business.json'))` in context processor or view |
| Static HTML | Build step or manual — leave `<!-- NAP: phone -->` markers + helper script note |
| Any other | Import/require from business.json |

For each file with violations:
1. Add import statement if not present
2. Replace each hardcoded value with the reference
3. Commit per logical group: `refactor(nap-ninja): centralize contact info in header`

#### Phase 4: VERIFY

1. Grep entire codebase for every value in `business.json` (with normalized variants for phone numbers)
2. Exclude `business.json` itself, `node_modules`, `.git`, build output
3. Report: `0 hardcoded instances remain` or flag remaining
4. If remaining: fix them, re-verify
5. Run project's existing test suite to confirm nothing broke

#### Phase 5: ENABLE

1. Confirm hook auto-enabled (business.json exists = hook active)
2. Tell user:
   ```
   NAP-Ninja is watching. Future writes that hardcode values
   from business.json will get flagged.

   ▸ To pause: tell me "turn off nap-ninja" or set
     napNinja: false in .claude/settings.json
   ▸ To rescan: /nap-ninja
   ```

## Rule: `nap-enforcement.md`

Always-loaded rule in `.claude/rules/`:

```markdown
# NAP Enforcement

When `business.json` exists at the project root, NEVER hardcode business
information in source files. Always import and reference from business.json.

This includes: business name, phone numbers, email addresses, physical
addresses, social media URLs/handles, business hours, and any other
contact or identity information defined in business.json.

When writing new components or pages that display business info:
1. Import business.json
2. Reference the appropriate field
3. Never copy-paste the actual value

When business.json does NOT exist, this rule is inactive.
```

## Hook: `nap-ninja-hook.sh`

PostToolUse hook on Write/Edit.

### Logic Flow

```
1. Check .claude/settings.json for napNinja: false → exit 0 (disabled)
2. Check business.json exists → exit 0 if not (nothing to enforce)
3. Read the written/edited file content from hook input
4. Skip if the file IS business.json
5. Skip non-source files (node_modules, .git, images, etc.)
6. Load all values from business.json (flatten nested object)
7. For each value (strings only, skip booleans/nulls):
   - Normalize phone numbers (strip dashes, parens, spaces)
   - Check if value appears in the written content
8. If matches found → stderr warning (exit 0, not blocking):
   "⚠ NAP-Ninja: found hardcoded business data in <file>:
    - Line 23: phone number '+1-555-867-5309' → use business.phone
    - Line 45: email 'hello@acme.com' → use business.email
    Reference business.json instead of hardcoding."
9. If no matches → exit 0 silently
```

### Why Warning Not Blocking

Exit 0 (warn) instead of exit 2 (block) because:
- The rule already tells Claude not to do it
- Blocking creates friction when there's a legitimate reason (test fixtures, documentation)
- Warning gives Claude the chance to self-correct in the same turn

### Smart Silence

The hook auto-silences in these scenarios:
- No `business.json` → not a NAP-tracked project
- `napNinja: false` in settings → user opted out
- File being written IS `business.json` → obviously allowed
- Short values (< 4 chars) → too many false positives (skip "US", "TX", etc.)
- Values inside test directories → skip `__tests__`, `*.test.*`, `*.spec.*`

## Toggle UX

### Turning Off
User says anything like "turn off nap ninja", "disable nap", "pause nap-ninja":
1. Skill sets `napNinja: false` in `.claude/settings.json`
2. Response: "NAP-Ninja paused. Run /nap-ninja to re-enable and rescan."

### Turning On
User says "turn on nap ninja", "enable nap", or runs `/nap-ninja`:
1. Skill removes the `napNinja: false` flag (or sets true)
2. Runs a quick scan to verify current state
3. Response: "NAP-Ninja re-enabled. Watching for hardcoded business data."

### Auto-Detection (Onboarding Integration)
When onboarding scans an existing project:
- If it finds NAP-like patterns in 3+ files → suggest: "Detected hardcoded business info. Want me to run NAP-Ninja to centralize it?"
- If project has no HTML/JSX/template files → skip entirely

## Shepherd Routing

Add to armadillo-shepherd routing table under a new section:

### Data Quality

| Request | Skill |
|---------|-------|
| Hardcoded business info, centralize NAP, business.json, contact info scattered | `nap-ninja` |

## File Inventory

| File | Type | Location |
|------|------|----------|
| `SKILL.md` | Skill definition | `.claude/skills/nap-ninja/SKILL.md` |
| `nap-enforcement.md` | Rule | `.claude/rules/nap-enforcement.md` → ships as `plugins/core/rules/nap-enforcement.md` |
| `nap-ninja-hook.sh` | Hook | `.claude/hooks/nap-ninja-hook.sh` |
| `hooks.json` update | Hook registration | Add PostToolUse entry for Write/Edit matcher |
| `armadillo.json` update | Manifest | Add `nap-ninja` to `core.skills`, add `nap-enforcement.md` to `core.rules` |
| `build-claude-md.js` update | Build script | Add description for `nap-ninja` skill and `nap-enforcement` rule |
| `armadillo-shepherd/SKILL.md` update | Routing | Add Data Quality section |
| Tests | Test files | Skill test + hook test |
