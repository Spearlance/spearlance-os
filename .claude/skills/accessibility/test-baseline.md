# Accessibility Skill — Test Baseline (RED/GREEN)

This document records the honest pre-research baseline (RED) and post-research corrections (GREEN) for the four accessibility challenge questions used to calibrate this skill.

---

## Q1: Accessible Modal Dialog in React

**Challenge:** Build an accessible modal dialog in React. Focus trapping, restore focus on close, Escape key, correct ARIA roles/attributes. Complete component with keyboard handling.

### RED (Pre-Research Baseline)

Confident in: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape handler, focus restoration to trigger element.

Uncertain/gaps:
- Exact initial focus placement strategy (which element to focus first?)
- Whether to use `createPortal` and how it interacts with `aria-modal`
- `aria-describedby` usage — when to include vs omit
- Inert attribute for background content — browser support unknown

Initial answer would have:
- Used `role="dialog"` + `aria-modal="true"` — correct
- Moved focus to dialog on open — correct but vague on *where* inside dialog
- Returned focus to trigger on close — correct
- Escape key handler — correct
- Focus trap logic — partially correct (would have missed the `[hidden]` and `[aria-hidden]` exclusion from focusable query)
- Missed: `tabIndex={-1}` on the dialog container itself for programmatic focus
- Missed: `requestAnimationFrame` wrapper for focus timing

### GREEN (Post-Research Corrections)

**Confirmed correct:**
- `role="dialog"` + `aria-modal="true"` on container element
- `aria-labelledby` referencing visible title (preferred over `aria-label`)
- Tab/Shift+Tab must cycle within dialog — no escape
- Escape closes dialog
- Focus returns to triggering element on close

**Corrections:**
- Initial focus: APG specifies strategy based on content type. For complex content requiring sequential reading — `tabIndex={-1}` on a non-interactive static element. For simple dialogs — focus the first actionable element or the least destructive action.
- `aria-describedby` should be **omitted if dialog contains complex semantic structures** (lists, paragraphs, tables) — it causes the entire description to be read as a flat string.
- Background inertness: `aria-modal="true"` handles AT isolation but does NOT make background DOM inert for all ATs. Supplement with `inert` attribute on background siblings in high-compliance scenarios.
- Focus exclusion from trap: elements inside `[hidden]` or `[aria-hidden="true"]` parents must be excluded from the focusable selector query.
- `requestAnimationFrame` needed because React state updates and portal rendering happen asynchronously — direct `.focus()` call can fire before DOM is ready.

**Final pattern confirmed by APG:**
- Dialog container: `role="dialog"` + `aria-modal="true"` + `tabIndex={-1}` + `aria-labelledby`
- Keyboard: Tab/Shift+Tab trapped, Escape closes
- Focus: moves in on open, returns to trigger on close

---

## Q2: Accessible Form

**Challenge:** Make a form with name, email, phone, country dropdown, submit accessible. Labels, error messaging, required indicators, live validation announcements, submission error handling.

### RED (Pre-Research Baseline)

Confident in: `<label htmlFor>`, `aria-invalid`, `aria-describedby` for errors, `required` attribute.

Uncertain/gaps:
- When to use `role="alert"` vs `aria-live="polite"` vs `aria-live="assertive"`
- Whether to use a form-level error summary or just inline errors (or both)
- Timing: should I validate on keypress, change, or blur?
- Required field asterisk accessibility (aria-hidden on the *)
- `aria-errormessage` vs `aria-describedby` for errors

### GREEN (Post-Research Corrections)

**Confirmed correct:**
- `<label htmlFor>` is the primary label mechanism
- `aria-invalid="true"` on invalid fields
- `aria-describedby` pointing to error element id
- `required` attribute on inputs

**Corrections:**
- `role="alert"` is equivalent to `aria-live="assertive"` + `aria-atomic="true"`. For field-level errors during typing, **`aria-live="polite"`** is preferred — assertive interrupts the screen reader mid-sentence. Reserve assertive for form-level submission error summaries.
- Use **both** a form-level summary error AND inline field errors for best coverage. Summary should receive focus on submit failure.
- The live region container must be **present in the DOM on page load** — empty container first, then inject content. Never create and populate simultaneously.
- `aria-errormessage` (vs `aria-describedby`): `aria-errormessage` is specifically for error text and requires `aria-invalid="true"` to be set. Browser/AT support varies — `aria-describedby` is more universally supported as of 2026. Use `aria-describedby` as the safe default.
- Validate **on blur** (not keypress) — validating while typing interrupts users. Exception: real-time character counts (e.g., Twitter-style) use polite live regions.
- Asterisk: `aria-hidden="true"` on the `*` character, plus visually hidden `(required)` text for screen readers. Tell users what asterisk means at form start.
- Country dropdown (`<select>`): native select is preferred. Custom combobox only when search/filter is required.

---

## Q3: WCAG 2.2 Color Contrast Requirements

**Challenge:** WCAG 2.2 color contrast requirements. AA vs AAA difference. Testing contrast for text, icons, interactive elements. New WCAG 2.2 focus appearance criteria.

### RED (Pre-Research Baseline)

Confident in: 4.5:1 normal text AA, 3:1 large text AA, 7:1 AAA for normal text.

Uncertain/gaps:
- Non-text contrast (UI components, icons) — knew it existed, unsure of exact ratio
- What counts as "large text" in CSS px terms
- Focus appearance criteria (new in 2.2) — knew it existed but unsure of exact measurements
- Focus Not Obscured (2.4.11) — knew sticky headers were relevant but not the spec language
- The exempt categories (decorative, logotypes, disabled)

### GREEN (Post-Research Corrections)

**Confirmed correct:**
- Normal text AA: 4.5:1
- Large text AA: 3:1
- Normal text AAA: 7:1
- Large text AAA: 4.5:1

**Corrections / additions:**
- **Non-text contrast (SC 1.4.11 AA):** 3:1 — applies to form borders, icon-only controls, chart elements, focus indicators against adjacent colors. Decorative images, disabled controls, and logotypes are exempt.
- **"Large text" definition:** ≥18pt (24px) regular weight OR ≥14pt (~18.67px) bold weight. Not just "big font" — specific thresholds.
- **SC 2.4.11 Focus Not Obscured (Minimum) — AA (NEW in 2.2):** Focused component must not be *entirely* obscured by author-created content. Partial occlusion allowed at AA. Exception: content repositioned by user, or content user opened that can be dismissed without moving focus (e.g., press Escape).
- **SC 2.4.12 Focus Not Obscured (Enhanced) — AAA (NEW in 2.2):** Zero occlusion — fully visible.
- **SC 2.4.13 Focus Appearance — AAA (NEW in 2.2):** When focus indicator is visible: area ≥2 CSS px perimeter of unfocused component; 3:1 contrast ratio between focused and unfocused states of same pixels. This is AAA, not AA — but implement it anyway for good UX.
- **Testing tools:** WebAIM Contrast Checker, Colour Contrast Analyser (eyedropper), axe DevTools, Lighthouse. Color contrast does NOT work in jsdom — must test in real browser.

---

## Q4: Testing Accessibility in Next.js

**Challenge:** Test accessibility in Next.js: automated with axe-core (jest-axe/vitest), manual checklist, screen reader verification. Most commonly missed a11y issues.

### RED (Pre-Research Baseline)

Confident in: jest-axe / vitest-axe wrapper around axe-core, `toHaveNoViolations()` matcher, `render()` from RTL.

Uncertain/gaps:
- vitest-axe vs jest-axe — were they maintained? API differences?
- happy-dom vs jsdom compatibility with axe-core
- Playwright + axe-core integration (`@axe-core/playwright`)
- Most commonly missed issues (had guesses but no data to back them up)

### GREEN (Post-Research Corrections)

**Confirmed correct:**
- `jest-axe` and `vitest-axe` wrap axe-core with `toHaveNoViolations()`
- `axe(container)` pattern — pass RTL container
- Must call `expect.extend(toHaveNoViolations)` in setup

**Corrections / additions:**
- **`vitest-axe`** is a fork of `jest-axe` maintained by Chance Strickland. Same API. Use `vitest-axe` for Vitest projects, `jest-axe` for Jest projects.
- **happy-dom incompatibility:** vitest-axe does NOT work with `environment: 'happy-dom'`. Bug in happy-dom's `Node.prototype.isConnected` breaks axe-core. Use `jsdom` only.
- **Color contrast in jsdom:** axe-core cannot check color contrast in jsdom — JSDOM does not compute CSS. Must run contrast tests in real browser (Playwright + axe, or Lighthouse).
- **`@axe-core/playwright`:** install separately, use `checkA11y(page)` in Playwright tests for full-page real-browser audits including contrast.
- **`configureAxe`:** use to disable rules that don't apply in test environment (e.g., `color-contrast`).
- **Most commonly missed issues (research-confirmed):**
  1. Missing focus indicators (`outline: none` globally)
  2. Modal without focus trap — Tab escapes dialog
  3. Icon buttons without accessible name
  4. Error shown in color only (no text description)
  5. Form inputs with placeholder instead of label
  6. Missing `aria-live` container before content injection
  7. Sticky headers obscuring keyboard focus (new in WCAG 2.2)
  8. Touch targets below 24×24 CSS px (new in WCAG 2.2)
  9. Positive `tabindex` values disrupting tab order
  10. Reused `id` attributes breaking ARIA relationships

---

## Skill Calibration Summary

| Area | Pre-Research Confidence | Post-Research Accuracy |
|------|------------------------|------------------------|
| ARIA roles (dialog, tab, combobox) | High | Confirmed correct |
| Focus trap implementation | Medium | Corrected exclusion logic |
| Focus timing (requestAnimationFrame) | Low | Learned — required |
| ARIA live regions (polite vs assertive) | Medium | Confirmed + clarified timing |
| Form error patterns | Medium | Confirmed + added summary error |
| `aria-errormessage` vs `aria-describedby` | Low | Learned — use describedby |
| Color contrast ratios | High | Confirmed + filled in non-text |
| Large text definition (px) | Medium | Confirmed specific px values |
| WCAG 2.2 new SC (2.4.11, 2.4.13) | Low | Fully researched |
| axe-core test tooling | High | Corrected happy-dom bug |
| Screen reader testing matrix | Medium | Expanded priority ranking |

**Overall:** Core ARIA knowledge was solid. Primary gaps were WCAG 2.2-specific criteria (new in 2.2), subtle focus management timing, `aria-errormessage` vs `aria-describedby` nuance, and the happy-dom/axe-core incompatibility.
