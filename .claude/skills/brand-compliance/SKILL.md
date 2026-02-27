---
model: claude-sonnet-4-6
name: brand-compliance
description: Use when checking content, code, or components against brand guidelines. Also use when verifying brand voice compliance, color usage, font usage, logo usage, or messaging alignment.
---

┏━ ✅ brand-compliance ━━━━━━━━━━━━━━━━━━━━━━━┓
┃ your friendly armadillo is here to serve you ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

## Overview

Checks content, code, or components against brand rules sourced from the knowledge base (`.claude/knowledge/`) and `brand.json`. Non-blocking informational audit — scores compliance but never gates or blocks work. Use standalone or integrate with brand-strategist for pre-delivery checks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Prerequisites

| Requirement | Path | Purpose |
|-------------|------|---------|
| Knowledge base config | `.claude/knowledge/config.json` | At least some sections enabled |
| Brand voice guide | `.claude/knowledge/voice-and-tone.md` | Voice/tone checks |
| Brand dictionary | `.claude/knowledge/brand-dictionary.md` | Approved terms, forbidden terms, legal restrictions |
| Visual identity guide | `.claude/knowledge/visual-identity.md` | Logo usage rules |
| Messaging framework | `.claude/knowledge/messaging-framework.md` | Value propositions, key messages |
| Brand data file | `brand.json` | Color palette and font families |

If a source file is missing, the corresponding check is marked `○ skipped` with the reason. Never fail silently.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Compliance Checks

| Check | Source | What it validates |
|-------|--------|------------------|
| Voice/tone | `voice-and-tone.md` | Writing style matches brand voice guide (formal/casual, humor, directness) |
| Dictionary | `brand-dictionary.md` | Uses approved phrases, avoids forbidden terms and restricted topics |
| Colors | `brand.json` colors | Only brand-approved hex colors in code/CSS/design |
| Fonts | `brand.json` fonts | Only brand-approved font families in CSS/code |
| Logos | `visual-identity.md` | Logo usage follows documented rules (variants, clear space, minimum size) |
| Messaging | `messaging-framework.md` | Content hits value propositions, stays on-message |
| Legal | `brand-dictionary.md` (what not to say) | No forbidden topics, restricted claims, or competitor mentions |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Input Modes

### Mode 1: Content Check

User pastes or provides text content (ad copy, social post, email, website copy).

**Runs:** voice/tone, dictionary, messaging, legal
**Skips:** colors, fonts, logos (no code to scan — mark as `○ n/a`)

### Mode 2: Code Check

User provides a file path or component.

**Runs:**
- Colors — grep for hex values (`#[0-9a-fA-F]{3,6}`), compare to `brand.json` palette
- Fonts — grep for `font-family` declarations, compare to `brand.json` fonts
- Logos — check image `src` and `import` references for logo files
- Voice/dictionary — also check text content inside JSX/HTML strings and attributes

### Mode 3: Full Audit

Scans the entire project.

**Runs all checks:**
- Grep all CSS/SCSS/Tailwind for color values → compare to `brand.json` palette
- Grep all CSS for `font-family` → compare to `brand.json` fonts
- Grep all content files (`.md`, `.mdx`, `.txt`, JSX/TSX strings) for forbidden terms from `brand-dictionary.md`
- Check all logo references against `visual-identity.md` rules
- Sample content pages against messaging framework value propositions
- Comprehensive report across all checks with file:line citations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Process

**Step 1: Load sources**

Read the following and extract rules:
- `.claude/knowledge/config.json` — which sections are enabled
- `.claude/knowledge/voice-and-tone.md` — tone attributes, style rules
- `.claude/knowledge/brand-dictionary.md` — approved terms list, forbidden terms list, restricted topics
- `.claude/knowledge/visual-identity.md` — logo variants, clear space rules, minimum sizes
- `.claude/knowledge/messaging-framework.md` — value propositions, key messages, claims to make
- `brand.json` — `colors` array (hex values), `fonts` array (font family names)

Note which files are missing — those checks will be `○ skipped`.

**Step 2: Determine input mode**

If not already clear from context, ask:

```
▸ What should I check?
  1. Content (paste text — ad copy, email, website copy)
  2. Code (provide file path or component)
  3. Full audit (scan entire project)
```

**Step 3: Run applicable checks**

Execute only the checks relevant to the selected mode. For code checks, use grep patterns:

- Hex colors: `#[0-9a-fA-F]{3,6}` — normalize to lowercase before comparing to `brand.json` palette
- Font families: `font-family\s*:\s*[^;]+` — match partial names (e.g., "Futura" matches "Futura PT Extra Bold")
- Forbidden terms: exact string match against the forbidden list from `brand-dictionary.md`
- Competitor names: exact string match against any restricted competitor mentions

**Step 4: Score each check**

| Symbol | Meaning |
|--------|---------|
| `✓` | Pass — no violations found |
| `✗` | Fail — specific violations found |
| `◐` | Partial — some issues found, not all bad |
| `○` | Skipped — source file missing or not applicable for this mode |

**Step 5: Generate compliance report**

Format per the output template below. Every `✗` and `◐` must include specific findings with file:line references (for code) or quoted text (for content), plus a concrete fix suggestion.

**Step 6: Recommend fixes**

For each failure:
- Dictionary/legal violations: provide exact replacement text
- Color violations: provide the correct brand hex from `brand.json`
- Font violations: provide the correct font family string from `brand.json`
- Logo violations: cite the specific rule from `visual-identity.md` and what to do instead
- Voice violations: rewrite the offending sentence in the correct tone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Output Format

```
Brand Compliance Report
━━━━━━━━━━━━━━━━━━━━━
Voice/tone     ✓  matches casual, confident style
Dictionary     ✗  uses "flushable discussion" (forbidden per brand-dictionary.md)
                  ↳ Suggestion: remove reference to flushability per legal guidelines
Colors         ✓  all 8 hex values match brand.json palette
Fonts          ◐  body font correct (Futura PT Demi), header using system font instead of Futura PT Extra Bold
                  ↳ Fix: update font-family in .header class at styles.css:42
Messaging      ✓  hits 2/3 value props (confidence, cleanliness)
Legal          ✗  mentions competitor "Cottonelle" by name (restricted per brand-dictionary.md)
                  ↳ Suggestion: replace with "other brands" or "traditional wipes"

Score: 4/6 checks passed
```

For full audits with many findings, group by file:

```
Colors — 3 violations
  ↳ components/Hero.tsx:14  #e5e5e5 not in brand palette (closest: #f0f0f0)
  ↳ styles/global.css:87    #333333 not in brand palette (closest: #2b2b2b)
  ↳ styles/global.css:102   #ff0000 not in brand palette — no close match
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Behaviors

**Citation required.** Always cite the specific rule being violated with source file reference. Vague findings ("this doesn't sound right") are not acceptable.

**Fix suggestions required.** Every `✗` must have a concrete suggested fix. Never report a violation without telling the user what to do about it.

**File:line references required for code.** Any color, font, or logo violation in code must include the exact file path and line number.

**Score is informational.** Never block work. Report findings, suggest fixes, move on. The user decides what to act on.

**Hex normalization.** Always convert hex values to lowercase before comparing to `brand.json`. `#FF5733` and `#ff5733` are the same color.

**Partial font matching.** Match font names as substrings. If `brand.json` lists `"Futura PT Extra Bold"`, a CSS rule using `"Futura"` matches. A rule using `"Arial"` does not.

**Voice nuance.** Flag clear mismatches from the documented voice guide, not minor style differences. If the guide says "casual and direct" and the content is formal legal prose, flag it. If the content is slightly more formal than usual, note it as `◐` at most.

**Proactive integration.** The brand-strategist agent can call this skill before delivering work as a pre-delivery quality check.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Blocking work on compliance failures | Score is informational, never block |
| Vague violation reports | Always cite specific rule + source file |
| Case-sensitive hex comparison | Normalize to lowercase before comparing |
| Flagging minor style differences as voice violations | Only flag clear mismatches from documented voice guide |
| Not providing fix suggestions | Every `✗` must have a suggested fix |
| Skipping checks without noting it | If a check can't run (missing source), mark as `○` skipped with reason |
| Treating partial font matches as violations | Match by substring — "Futura" in CSS is valid if brand uses "Futura PT" |
| Over-reporting in full audit mode | Group findings by file, cap per-check detail to top 10 violations with a count for the rest |
