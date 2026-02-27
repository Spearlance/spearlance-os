---
model: claude-sonnet-4-6
context: fork
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
**Pairs with:** `onboarding` (auto-detect on project setup), `seo-audit` / `seo-pulse` (structured data consistency)
