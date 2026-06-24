# Design: Nested bullets + paste fidelity in Task editor

**Date:** 2026-06-17
**Author:** Garrett + Claude
**Status:** Approved

## Problem

The Task panel description editor (`src/components/tasks/task-drawer/DetailsTab.tsx`)
uses `react-quill` (Quill 1.3.x). Two issues:

1. **No nested bullets.** Pressing Tab on a bullet does not nest it under the parent
   (Word / Google Docs behavior).
2. **Paste loses formatting.** Copying a formatted email (headings, bold, bullets,
   links) into the editor flattens it.

## Root cause (both issues)

`quillFormats` is an allow-list. Quill strips any format not on the list — on typing
*and* on paste. `indent` (nesting) and `header` (headings) are absent, so they are
discarded at the door. Tab-to-nest is already wired into Quill's keyboard engine; the
resulting indent was simply being thrown away because `indent` wasn't allowed.

## Decision

- **Paste fidelity target:** common formatting — headings, bold/italic/underline,
  ordered + nested bulleted lists, links, blockquotes. Drop colors, fonts, tables,
  images. (User chose this over near-pixel fidelity to avoid an editor migration.)
- **Scope:** Task panel only (`DetailsTab.tsx`). Other Quill editors untouched.
- **Approach:** Extend the existing Quill config. No library change, no storage change
  (still an HTML string), no display change inside the drawer — `quill.snow.css`
  already styles nested lists (`ql-indent-N`) and headings.

## Changes (single file: `DetailsTab.tsx`)

1. `quillFormats` — add `header`, `indent`, `blockquote` (keep existing
   `bold, italic, underline, list, bullet, link`). These now survive typing and paste.
2. `quillModules.toolbar` — add for discoverability:
   - Header dropdown: `[{ 'header': [1, 2, 3, false] }]`
   - Indent buttons: `[{ 'indent': '-1' }, { 'indent': '+1' }]`
   - `'blockquote'` in the formatting group
3. Nested bullets: Tab nests, Shift+Tab outdents — native once `indent` is allowed.
4. Paste: Quill clipboard matchers keep only allowed formats; with the additions a
   pasted email retains headings, bold/italic/underline, ordered + nested lists,
   links, quotes.

## Testing

- **Unit (vitest + testing-library):** render `DetailsTab`; assert the Quill config
  exposes the new formats and toolbar groups. Simulate paste of HTML containing
  `<h2>`, nested `<ul>`, `<strong>` and assert the resulting value retains `header`,
  `ql-indent-1`, and `<strong>`.
- **Manual:** paste a real formatted email; Tab-nest a bullet; save; reopen drawer →
  verify persistence and correct rendering.

## Out of scope (flagged)

Task *card* previews (`TaskCard.tsx`, `MyTaskCard.tsx`) render `{task.description}`
as literal text, so HTML tags show raw in the clamped preview. Pre-existing, not part
of "Task panel." Fix separately if desired (strip-to-text for the preview).
