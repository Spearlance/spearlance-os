# Armadillo Shepherd + Style Enforcement Design

## Overview

Four interconnected upgrades that make skill usage the only path and armadillo responses unmistakably on-brand.

---

## 1. armadillo-shepherd (rename + rewrite of using-armadillo)

### What it is
The orchestration layer. Not a documentation skill — an active router. Every request flows through the shepherd before any response is given.

### Invocation model
- **Fast path**: Session-start injects the full shepherd routing table into context. Claude always has the map.
- **Explicit path**: Claude invokes `armadillo:armadillo-shepherd` via Skill tool when uncertain about routing.
- **No double-hop needed**: routing table in context → Claude classifies → invokes target skill directly.

### Routing table (all 44 skills organized by intent)

**Creative & Planning**
| Request | Skill |
|---------|-------|
| New feature, idea, anything creative | `brainstorming` |
| Have a spec/design, need a plan | `writing-plans` |
| Have a plan, need to execute it | `executing-plans` |

**Implementation**
| Request | Skill |
|---------|-------|
| Implementing ANYTHING | `test-driven-development` |
| 2+ independent tasks | `dispatching-parallel-agents` |
| Sequential tasks this session | `subagent-driven-development` |
| Bug, unexpected behavior, mystery | `systematic-debugging` |

**Completion & Delivery**
| Request | Skill |
|---------|-------|
| Claiming work is done | `verification-before-completion` |
| Branch complete, need to ship | `finishing-a-development-branch` |
| Creating/writing a PR | `writing-prs` |
| Requesting code review | `requesting-code-review` |
| Received review feedback | `receiving-code-review` |

**Git & Workspace**
| Request | Skill |
|---------|-------|
| Feature work needs isolation | `using-git-worktrees` |

**Armadillo Meta**
| Request | Skill |
|---------|-------|
| Install armadillo in a project | `onboarding` |
| Update armadillo | `updating-armadillo` |
| Create a new skill | `writing-skills` |
| Document an external API | `writing-reference-skills` |

**Testing Tools**
| Request | Skill |
|---------|-------|
| E2E / browser testing (Playwright) | `playwright` |
| Browser automation / Chrome | `puppeteer` |
| Component or E2E (Cypress) | `cypress` |
| Unit / component testing | `vitest` |

**Frontend**
| Request | Skill |
|---------|-------|
| Styling / CSS | `tailwind-css` |
| UI components | `shadcn-ui` |
| Next.js / App Router | `nextjs` |
| Astro / content sites | `astro` |
| Animations (React) | `framer-motion` |
| Scroll / timeline animations | `gsap` |
| Responsive / mobile-first | `responsive-design` |
| Accessibility / WCAG | `accessibility` |

**APIs & Services**
| Request | Skill |
|---------|-------|
| Google Analytics 4 | `ga4-api` |
| Google Ads | `google-ads-api` |
| Google Search Console | `google-search-console-api` |
| Google Business Profile | `google-business-profile-api` |
| Google Places | `google-places-api` |
| Lighthouse / PageSpeed | `lighthouse-api` |
| YouTube | `youtube-data-api` |
| Stripe / payments | `stripe-api` |
| Neon / Postgres | `neon` |

**Content & Creative**
| Request | Skill |
|---------|-------|
| ASCII art / CLI visuals | `ascii-art` |
| Brand knowledge / voice | `brand-knowledge-builder` |
| Audio transcription | `deepgram-transcription` |
| Programmatic video | `remotion` |
| Website migration (Duda→Astro) | `duda-to-astro-migration` |

### Hard rules baked into the skill
- Never respond before invoking the target skill
- No summarizing, planning to invoke, or explaining what you're about to do
- If two skills apply, invoke the FIRST one — it chains to the next
- If unclear, ask ONE clarifying question, then route

### Rename scope
- Directory: `.claude/skills/using-armadillo/` → `.claude/skills/armadillo-shepherd/`
- SKILL.md rewrite (router, not docs)
- skills.json entry renamed + description updated
- session-start.sh: inject armadillo-shepherd content
- inject-skill-awareness.sh: reference armadillo-shepherd
- CLAUDE.md: update skill list
- README.md: update references
- All tests: update file paths and descriptions

---

## 2. Output Style — Visual Enhancement

### Keep (perfect as-is)
Box-drawing skill announcements: `┏━ skill-name ━━━━━┓`
Status markers: `✓ ✗ ○ ● ◐`
Flow markers: `▸ → ↳ ▪`
Severity: `◆ ◇ ⚠ ℹ`

### Add — selective emoji for visual hierarchy
| Emoji | Context |
|-------|---------|
| 🛡 | Armadillo brand moments, protection/guardrail callouts |
| 🚀 | Release, deploy, shipped |
| ⚡ | Performance, fast-path, speed |
| 🎯 | Precision, goal achieved, on-target |
| 🔥 | Completion, hot streak |
| 💡 | Insight, tip, non-obvious suggestion |
| 📋 | Checklist, plan, structured list |
| 🧪 | Test-related callouts |
| 🐛 | Bug found/identified |
| 🔧 | Fix, tool, configuration |
| 🔍 | Investigation, search, debugging |

### Skill announcement box — add category emoji
```
┏━ 🔍 systematic-debugging ━━━━━━━━━━━━━━━━━━━━━━┓
┃ Tracing null pointer in checkout flow           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

Each skill category gets an emoji prefix in the box:
- 🧠 Creative/planning (brainstorming, writing-plans)
- ⚡ Execution (executing-plans, subagent-driven-development, dispatching-parallel-agents)
- 🔧 Implementation (test-driven-development)
- 🔍 Debugging (systematic-debugging)
- 🚀 Delivery (finishing-a-development-branch, writing-prs, verification-before-completion)
- 🛡 Armadillo meta (onboarding, updating-armadillo, writing-skills)
- 📋 Review (requesting-code-review, receiving-code-review)

### Personality guide — restructure and expand
Full rewrite of the personality section in output-style.md:
- Voice: Tony Hawk + CS degree, never letting bad code slide, always hella chill
- Brand phrases: context-gated, with emoji enhancement
- Edge cases: what to say when blocked, when confused, when something is actually impressive
- Anti-patterns: what armadillo NEVER says (listed explicitly)

### subagent-start.sh enhancement
Currently injects coding-standards + output-style content.
Enhancement: inject the FULL output-style (not just the file — ensure it's complete and clear).

---

## 3. Enforcement — Re-block Explore, Tighten Directive

### enforce-skills.sh
Re-block Explore agent type (exit 2 with clear redirect):
```
Blocked: Explore agents are disabled. Use the Skill tool to invoke
armadillo-shepherd — it routes to the right skill for any request.
```

### inject-skill-awareness.sh
Rewrite from soft reminder to hard constraint:
```
CONSTRAINT: You MUST invoke an armadillo skill via the Skill tool before
responding to this request. Check armadillo-shepherd routing table (above)
and invoke the matching skill NOW — before writing any response.
Plan and Explore agents are blocked. EnterPlanMode is blocked.
```

---

## 4. Permissions — Bypass Mode with Clear Warning

### settings.json default: acceptEdits (keep)
### session-start.sh: detect bypass mode
If `defaultMode` is `bypassPermissions` in settings.json → inject visible warning:
```
🛡 BYPASS MODE ACTIVE — all non-deny-listed Bash commands auto-approved.
Deny-list still enforced (force-push, reset --hard, rm -rf blocked).
To return to safe mode: set defaultMode to "acceptEdits" in .claude/settings.json
```

### Fix stale reference
`updating-armadillo/SKILL.md` line 450: remove "bypassPermissions is the standard" — update to reflect acceptEdits as default with bypass as opt-in.

---

## Edge Cases Locked In

| Edge case | Handling |
|-----------|----------|
| Request matches 2+ skills | Route to first in chain (e.g., feature → brainstorming, not test-driven-development) |
| User says "just answer" / "skip skills" | Skill directive is a constraint, not a suggestion — still route |
| Skill not installed (optional bundle) | Shepherd routing table only shows installed skills; session-start reads skills.json |
| Subagent spawned without skills | subagent-start.sh injects full context including shepherd routing |
| Bypass mode active but not intended | session-start detects and warns every session |
| Explore dispatched from within a skill | Blocked at hook level — skills use Read/Glob/Grep directly |
| New skill added but shepherd not updated | skills-json-schema.test.js catches missing skill coverage |

---

## Files Changed

```
.claude/skills/using-armadillo/SKILL.md     → DELETED (directory renamed)
.claude/skills/armadillo-shepherd/SKILL.md  → CREATED (full rewrite)
.claude/hooks/enforce-skills.sh             → re-block Explore
.claude/hooks/inject-skill-awareness.sh     → hard constraint rewrite
.claude/hooks/session-start.sh              → inject shepherd, bypass detection
.claude/rules/output-style.md               → emoji additions, personality rewrite
.claude/skills/updating-armadillo/SKILL.md  → fix bypassPermissions stale ref
skills.json                                 → rename using-armadillo → armadillo-shepherd
README.md                                   → update references
.claude/CLAUDE.md                           → update skill list
tests/*                                     → update all path references
```
