# Task Editor Formatting (Nested Bullets + Paste Fidelity) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Let the Task panel description editor nest bullets via Tab (Word/Docs style) and retain common formatting (headings, bold/italic/underline, ordered + nested lists, links, blockquotes) when pasting from email.

**Architecture:** Both behaviors are blocked by one cause — Quill's `formats` allow-list in `DetailsTab.tsx` omits `header`, `indent`, and `blockquote`, so Quill strips them on typing AND on paste. Fix: extend the allow-list and toolbar. We extract the Quill config into its own module so it is unit-testable without mounting Quill in jsdom (Quill's clipboard/Tab behavior needs a real browser selection and is verified manually).

**Tech Stack:** react-quill ^2.0.0 (Quill 1.3.7), vitest + @testing-library/react (jsdom), TypeScript.

---

## Design reference

See `.claude/docs/plans/2026-06-17-task-editor-formatting-design.md`.

Scope: Task panel only (`src/components/tasks/task-drawer/DetailsTab.tsx`). Other Quill
editors in the app are untouched.

---

### Task 1: Extract + extend the Quill config (TDD)

Move the inline `quillModules` / `quillFormats` out of `DetailsTab.tsx` into a dedicated,
testable module, and add the missing formats/toolbar entries that unblock nesting and
paste fidelity.

**Files:**
- Create: `src/components/tasks/task-drawer/quillConfig.ts`
- Create: `src/components/tasks/task-drawer/__tests__/quillConfig.test.ts`
- Modify: `src/components/tasks/task-drawer/DetailsTab.tsx` (lines 11-27 + usage)

**Step 1: Write the failing test**

Create `src/components/tasks/task-drawer/__tests__/quillConfig.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { quillFormats, quillModules } from "../quillConfig";

// Flatten the toolbar (array of groups, each group an array of buttons/objects)
// into a list of the format keys it controls.
const toolbarKeys = (quillModules.toolbar as unknown[])
  .flat()
  .map((entry) =>
    typeof entry === "string" ? entry : Object.keys(entry as object)[0]
  );

describe("task editor quill config", () => {
  it("allows the formats needed for nesting + pasted email formatting", () => {
    // Pre-existing formats stay
    expect(quillFormats).toEqual(
      expect.arrayContaining(["bold", "italic", "underline", "list", "bullet", "link"])
    );
    // New formats that unblock the two reported issues
    expect(quillFormats).toContain("indent"); // nested bullets (Tab)
    expect(quillFormats).toContain("header"); // pasted headings
    expect(quillFormats).toContain("blockquote"); // pasted quotes
  });

  it("exposes header, indent, and blockquote controls in the toolbar", () => {
    expect(toolbarKeys).toContain("header");
    expect(toolbarKeys).toContain("indent");
    expect(toolbarKeys).toContain("blockquote");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/tasks/task-drawer/__tests__/quillConfig.test.ts`
Expected: FAIL — cannot resolve `../quillConfig` (module does not exist yet).

**Step 3: Write minimal implementation**

Create `src/components/tasks/task-drawer/quillConfig.ts`:

```ts
// Quill config for the Task description editor.
// Extracted from DetailsTab so the allow-list is unit-testable without mounting Quill.
// Quill strips any format not in `quillFormats` on BOTH typing and paste, so this
// list is what makes nested bullets (indent) and pasted email formatting survive.

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "link"],
    ["clean"],
  ],
};

export const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "indent",
  "blockquote",
  "link",
];
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/tasks/task-drawer/__tests__/quillConfig.test.ts`
Expected: PASS (both tests).

**Step 5: Commit**

```bash
git add src/components/tasks/task-drawer/quillConfig.ts src/components/tasks/task-drawer/__tests__/quillConfig.test.ts
git commit -m "feat: extend task editor quill config for nesting + paste formatting"
```

---

### Task 2: Wire DetailsTab to the shared config

Replace the inline config in `DetailsTab.tsx` with the extracted module. No behavior
change beyond using the new config — pure DRY cleanup so there is one source of truth.

**Files:**
- Modify: `src/components/tasks/task-drawer/DetailsTab.tsx`

**Step 1: Remove the inline config**

Delete lines 14-27 (the `const quillModules = {...}` and `const quillFormats = [...]`
blocks) from `DetailsTab.tsx`.

**Step 2: Import the extracted config**

Replace the react-quill import block (currently lines 11-12) with:

```tsx
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { quillModules, quillFormats } from "./quillConfig";
```

The `<ReactQuill ... modules={quillModules} formats={quillFormats} />` usage at
lines ~102-110 stays exactly as-is (same variable names).

**Step 3: Verify the build + full test suite**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npx vitest run` → Expected: all tests pass (including Task 1's config tests and
the existing MyTaskCard tests).

**Step 4: Commit**

```bash
git add src/components/tasks/task-drawer/DetailsTab.tsx
git commit -m "refactor: use shared quill config in task DetailsTab"
```

---

### Task 3: Manual verification (browser)

Quill's Tab-to-nest and clipboard paste require a real browser selection and cannot be
faithfully reproduced in jsdom — verify them by hand.

**Steps:**
1. `npm run dev`, open a task, focus the Description editor.
2. Type a bullet line, press **Tab** → it nests under the parent (bullet glyph changes);
   **Shift+Tab** → it outdents. ✓
3. In Gmail/Docs, copy a block with a heading, bold text, and a nested bulleted list.
   Paste into the editor → heading, bold, and nesting are preserved. ✓
4. Save the task, close and reopen the drawer → formatting persists (stored HTML
   round-trips through `quill.snow.css`). ✓
5. Confirm colors/fonts/tables/images from the source are dropped (expected — the
   chosen "common formatting" line). ✓

No commit (verification only).

---

## Out of scope (flagged, not in this plan)

Task *card* previews (`TaskCard.tsx`, `MyTaskCard.tsx`) render `{task.description}` as
literal text, so HTML tags show raw in the clamped preview. Pre-existing; fix separately
if desired.
