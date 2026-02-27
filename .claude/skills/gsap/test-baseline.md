# GSAP Skill — RED/GREEN Test Baseline

> Tests conducted February 2026 against GSAP 3.14.x

---

## Testing Methodology

Four questions were posed to an agent WITHOUT the skill loaded (RED), then assessed against verified facts from official GSAP documentation. The GREEN column shows what the skill corrects or fills in.

---

## Q1: Setup + Core Tweens in Next.js 15

**Question:** "Set up GSAP in Next.js 15. Animate with gsap.to(), from(), fromTo(). React cleanup? useGSAP hook pattern."

### RED (Without Skill)

| Fact | Agent Response | Accurate? |
|------|---------------|-----------|
| Install command | `npm install gsap @gsap/react` | ✓ |
| `'use client'` requirement | Mentioned | ✓ |
| Plugin registration location | Module level | ✓ |
| useGSAP import | `from '@gsap/react'` | ✓ |
| `gsap.registerPlugin(useGSAP)` required | Not mentioned | ✗ |
| Scope parameter | Mentioned generically | ◐ |
| contextSafe for event handlers | Not mentioned | ✗ |
| gsap.to direction | "to target values" | ✓ |
| gsap.from direction | Confused with to() | ✗ |
| gsap.fromTo use case | Vague | ◐ |
| Plugin licensing | "some plugins require Club GSAP" | ✗ (outdated — all free since 3.13) |

**Gap count:** 4 wrong facts, 2 incomplete

### GREEN (With Skill)

Skill provides:
- Explicit `gsap.registerPlugin(useGSAP)` requirement at module level
- `contextSafe` pattern for click/hover handlers created after hook runs
- Clear directional explanation: `gsap.fromTo` for React where element state is uncertain
- Correct licensing: all plugins free as of 3.13

---

## Q2: ScrollTrigger Scroll Sequence

**Question:** "Scroll-triggered sequence: parallax hero, text reveals, pinned sections with animated content, horizontal scroll gallery. ScrollTrigger with scrub, pin, snap."

### RED (Without Skill)

| Fact | Agent Response | Accurate? |
|------|---------------|-----------|
| `scrub: true` behavior | Correct | ✓ |
| `scrub: 1` meaning | "1 second smoothing" | ✓ |
| `pin: true` behavior | Correct | ✓ |
| `pinSpacing` option | Not mentioned | ✗ |
| `start` syntax | Partially correct | ◐ |
| Horizontal scroll technique | `xPercent` approach | ✓ |
| `snap: 'labels'` | Not mentioned | ✗ |
| `ScrollTrigger.batch()` | Not mentioned | ✗ |
| `end` dynamic function `() =>` pattern | Not mentioned | ✗ |
| Parallax with `ease: 'none'` on scrub | Not mentioned | ✗ |
| React cleanup for ScrollTrigger | Mentioned useEffect cleanup | ✗ (wrong — use useGSAP) |

**Gap count:** 6 missing patterns, 1 wrong approach

### GREEN (With Skill)

Skill provides:
- `pinSpacing: false` for overlapping sections
- `snap: 'labels'` pattern with full snap config object
- `ScrollTrigger.batch()` for many elements
- `end: () => ...` dynamic end values for horizontal scroll
- `ease: 'none'` on scrub timeline tweens
- Correct React pattern via `useGSAP` not `useEffect`

---

## Q3: Complex Timeline Sequence

**Question:** "Complex multi-step GSAP timeline: logo appears → text splits/reveals → bg color morphs → CTA bounces in. Labels and position parameters."

### RED (Without Skill)

| Fact | Agent Response | Accurate? |
|------|---------------|-----------|
| `gsap.timeline()` syntax | Correct | ✓ |
| `defaults` object | Mentioned | ✓ |
| `tl.addLabel()` | Correct | ✓ |
| Position param `<` | Not mentioned | ✗ |
| Position param `<0.3` | Not mentioned | ✗ |
| Position param `+=0.5` | Mentioned | ✓ |
| Position param `'-=0.3'` | Mentioned | ✓ |
| `tl.seek('label')` | Not mentioned | ✗ |
| SplitText inside timeline | Used old `new SplitText()` API | ✗ (3.13 API is `SplitText.create()`) |
| `onSplit()` callback requirement | Not mentioned | ✗ |
| `back.out()` for CTA bounce | Mentioned | ✓ |
| `ease: 'none'` on backgroundColor | Not mentioned | ✗ |

**Gap count:** 5 missing, 1 outdated API

### GREEN (With Skill)

Skill provides:
- Full position parameter reference table: `<`, `<0.3`, `+=`, `-=`, label references
- `tl.seek()` for jumping to labels
- `SplitText.create()` API (not `new SplitText()`)
- `onSplit()` callback pattern for creating animations
- `ease: 'none'` for color transitions in scrubbed timelines

---

## Q4: React 18+ / Next.js Correct GSAP Usage

**Question:** "Correct GSAP usage in React/Next.js 2025-2026? gsap.context(), useGSAP, cleanup. Gotchas with React 18+ strict mode?"

### RED (Without Skill)

| Fact | Agent Response | Accurate? |
|------|---------------|-----------|
| `useGSAP` from `@gsap/react` | Mentioned | ✓ |
| Strict mode double-fire problem | Described correctly | ✓ |
| `gsap.context()` + `ctx.revert()` | Mentioned | ✓ |
| `useGSAP` handles strict mode | "yes" | ✓ |
| `contextSafe` for event handlers | Not mentioned | ✗ |
| `revertOnUpdate` option | Not mentioned | ✗ |
| `dependencies` array option | Mentioned like useEffect | ◐ |
| Plugin registration in providers | Not mentioned | ✗ |
| `gsap.registerPlugin(useGSAP)` required | Not mentioned | ✗ |
| `ctx.add()` for deferred context additions | Not mentioned | ✗ |
| SSR — `useIsomorphicLayoutEffect` pattern | Not mentioned | ✗ |
| All plugins free (no Club GSAP) | Said "some plugins need Club GSAP" | ✗ |

**Gap count:** 6 missing, 1 wrong (licensing), 1 partial

### GREEN (With Skill)

Skill provides:
- `contextSafe` — the most commonly missed gotcha
- `revertOnUpdate: true` for dependency-driven re-animations
- App-wide plugin registration pattern in `app/providers.tsx`
- `gsap.registerPlugin(useGSAP)` as mandatory step
- `ctx.add()` for extending contexts after creation
- Correct licensing: all plugins free since 3.13
- `useIsomorphicLayoutEffect` explanation (handled internally by `useGSAP`)

---

## Summary

| Question | RED Gaps | Key Corrections |
|----------|----------|-----------------|
| Q1 — Setup / core tweens | 4 wrong, 2 partial | contextSafe, registerPlugin(useGSAP), licensing |
| Q2 — ScrollTrigger sequence | 6 missing, 1 wrong | batch(), snap labels, pinSpacing, dynamic end |
| Q3 — Complex timeline | 5 missing, 1 outdated | position params table, SplitText.create() API, onSplit |
| Q4 — React/Next.js patterns | 6 missing, 1 wrong | contextSafe, revertOnUpdate, providers pattern, licensing |

**Licensing** was wrong in 3 of 4 questions — agents consistently cited "Club GreenSock" as required for premium plugins. This is false as of GSAP 3.13 (2025).

**`contextSafe`** was missing in 2 of 4 questions despite being the most common production bug (event handlers not getting cleaned up).

**`SplitText.create()`** vs `new SplitText()` — agents used the old API in all timeline/text questions.

The skill provides verified corrections for all identified gaps.
