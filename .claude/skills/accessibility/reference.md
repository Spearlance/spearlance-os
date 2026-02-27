# Accessibility (WCAG 2.2) Developer Reference

> **Last Verified:** February 2026
> **Standard:** WCAG 2.2 (W3C Recommendation, October 2023 · ISO/IEC 40500:2025)
> **EN 301 549:** v4.1.1 expected February 2026 (references WCAG 2.2)

---

## Table of Contents

1. [WCAG 2.2 Overview](#wcag-22-overview)
2. [Semantic HTML First](#semantic-html-first)
3. [ARIA Roles, States, Properties](#aria-roles-states-properties)
4. [Keyboard Navigation](#keyboard-navigation)
5. [Focus Management](#focus-management)
6. [Color & Contrast](#color--contrast)
7. [Component Patterns](#component-patterns)
8. [Forms](#forms)
9. [Images & Media](#images--media)
10. [Testing](#testing)
11. [Common Mistakes](#common-mistakes)

---

## WCAG 2.2 Overview

WCAG 2.2 organizes all criteria under four principles (POUR):

| Principle | Covers |
|-----------|--------|
| **Perceivable** | Content is available to the senses (vision, hearing, touch) |
| **Operable** | UI components are controllable by keyboard and assistive tech |
| **Understandable** | Content and operation are predictable and clear |
| **Robust** | Content works with current and future assistive technologies |

### Conformance Levels

| Level | Requirement | Who |
|-------|-------------|-----|
| **A** | Minimum — blocks access if missing | All public-facing sites |
| **AA** | Industry standard, legally required in most jurisdictions | Target for all work |
| **AAA** | Enhanced — not required for full conformance | Government, healthcare, high-stakes |

### WCAG 2.2 New Success Criteria (9 total vs 2.1)

| SC | Name | Level | Requirement |
|----|------|-------|-------------|
| **2.4.11** | Focus Not Obscured (Minimum) | AA | Focused component must not be *entirely* hidden by author content (sticky headers, modals) |
| **2.4.12** | Focus Not Obscured (Enhanced) | AAA | Focused component must be *fully* visible — zero occlusion |
| **2.4.13** | Focus Appearance | AAA | Focus indicator: ≥2 CSS px perimeter area, ≥3:1 contrast ratio between focused/unfocused states |
| **2.5.7** | Dragging Movements | AA | All drag operations must have a single-pointer (click/tap) alternative |
| **2.5.8** | Target Size (Minimum) | AA | Interactive targets ≥24×24 CSS px (exceptions: inline, spacing-equivalent, essential) |
| **3.2.6** | Consistent Help | A | Help mechanisms must appear in consistent relative order across pages |
| **3.3.7** | Redundant Entry | A | Previously entered info must be auto-populated or selectable — no re-entry in same session |
| **3.3.8** | Accessible Authentication (Minimum) | AA | No cognitive puzzles (CAPTCHAs, memory tests) without alternative or assistance |
| **3.3.9** | Accessible Authentication (Enhanced) | AAA | No cognitive puzzles at all — object recognition and personal content excluded |

**What WCAG 2.2 removed:** SC 4.1.1 (Parsing) was removed as modern browser parsing makes it redundant.

---

## Semantic HTML First

Use the right element before reaching for ARIA. Native elements carry implicit roles, keyboard behavior, and accessibility semantics for free.

### Native Elements vs ARIA Equivalents

| Use this | Not this | Why |
|----------|----------|-----|
| `<button>` | `<div role="button">` | Free keyboard, focus, click events |
| `<a href>` | `<span role="link">` | Free keyboard nav, history, URL display |
| `<input type="checkbox">` | `<div role="checkbox">` | Free checked state, keyboard toggle |
| `<select>` | Custom combobox | Built-in OS accessibility, mobile support |
| `<table>` | `<div role="table">` | Screen readers announce row/column context |
| `<fieldset>` + `<legend>` | `<div>` grouping | Groups related inputs with accessible label |
| `<nav>` | `<div role="navigation">` | Landmark nav — maps directly |
| `<main>` | `<div role="main">` | Skip-link target, single per page |

### Landmark Regions (HTML5 Elements)

```html
<header>     <!-- role="banner" (when top-level) -->
<nav>        <!-- role="navigation" -->
<main>       <!-- role="main" — one per page -->
<aside>      <!-- role="complementary" -->
<footer>     <!-- role="contentinfo" (when top-level) -->
<form>       <!-- role="form" (when it has accessible name) -->
<section>    <!-- role="region" (only when has accessible name via aria-label/aria-labelledby) -->
```

Multiple `<nav>` elements need `aria-label` to distinguish them:

```html
<nav aria-label="Primary">...</nav>
<nav aria-label="Breadcrumb">...</nav>
<nav aria-label="Footer">...</nav>
```

### Heading Hierarchy

One `<h1>` per page. Never skip levels — h1 → h2 → h3, not h1 → h3.

```html
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Next Section</h2>
```

Headings communicate document structure to screen readers. Don't use heading levels for visual size — use CSS for that.

---

## ARIA Roles, States, Properties

### The Five Rules of ARIA

1. **Use native HTML first.** If a native element satisfies the use case, use it.
2. **Never change native semantics unless required.** Don't add `role="button"` to a `<button>`.
3. **All interactive ARIA controls must be keyboard operable.**
4. **Never use `role="presentation"` or `aria-hidden` on focusable elements.**
5. **All interactive elements must have an accessible name.**

### Accessible Names — Priority Order

1. `aria-labelledby` (references visible text in DOM — highest priority)
2. `aria-label` (string label — use when no visible text)
3. `<label>` element (for form inputs)
4. `title` attribute (last resort — not reliable cross-AT)
5. Element content (for buttons, links — automatic)

```typescript
// Good — references visible heading
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Delete</h2>
</dialog>

// Good — no visible text available
<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

// Bad — aria-label overrides visible text and causes mismatch
<button aria-label="submit form">Submit</button>
```

### Common ARIA States

| State | Values | Use |
|-------|--------|-----|
| `aria-expanded` | `true` / `false` | Accordion, dropdown, disclosure |
| `aria-selected` | `true` / `false` | Tabs, listbox options |
| `aria-checked` | `true` / `false` / `mixed` | Checkboxes, switches |
| `aria-pressed` | `true` / `false` / `mixed` | Toggle buttons |
| `aria-disabled` | `true` / `false` | Prefer native `disabled` for form controls |
| `aria-hidden` | `true` | Remove from accessibility tree (decorative icons, duplicates) |
| `aria-live` | `off` / `polite` / `assertive` | Announce dynamic content changes |
| `aria-atomic` | `true` / `false` | Announce entire region or just changed part |
| `aria-invalid` | `true` / `false` / `grammar` / `spelling` | Field error state |
| `aria-required` | `true` | Required form field (pair with native `required`) |
| `aria-busy` | `true` / `false` | Loading state for async regions |

### ARIA Roles Reference

| Role | Native Equivalent | Use When |
|------|------------------|----------|
| `alert` | — | Urgent announcements; auto-live-assertive |
| `alertdialog` | — | Modal + alert combination (confirmation dialogs) |
| `dialog` | `<dialog>` | Modal or non-modal dialog |
| `status` | — | Status messages; auto-live-polite |
| `log` | — | Chat, activity feed; auto-live-polite |
| `progressbar` | `<progress>` | Determinate or indeterminate progress |
| `tab` / `tablist` / `tabpanel` | — | Tab interface |
| `combobox` | `<select>` | Custom searchable select |
| `listbox` / `option` | `<select>` / `<option>` | Selection list |
| `tree` / `treeitem` | — | Hierarchical navigation |
| `grid` / `gridcell` | `<table>` | Interactive table |
| `tooltip` | — | Short contextual info on hover/focus |

### When NOT to Use ARIA

- `aria-label` on `<div>` or `<span>` with no role (not announced)
- `aria-hidden="true"` on a parent of focusable content
- `role="presentation"` on elements with meaningful structure
- `aria-live` on elements that already have implicit live behavior (`role="alert"`)
- Redundant role: `<button role="button">` — already implied

---

## Keyboard Navigation

### Focus Order Rules

Tab order follows DOM order by default. Never override with positive `tabindex` — it creates disconnected tab order.

```typescript
// Never — breaks tab order for all users
<button tabIndex={3}>First</button>
<button tabIndex={1}>Actually first</button>

// Use DOM order instead
<button>First</button>
<button>Second</button>

// tabIndex={-1} is valid — removes from tab order but keeps programmatic focus
<div tabIndex={-1} ref={dialogRef}>...</div>
```

### Skip Links

Provide a skip navigation link as the first focusable element:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
...
<main id="main-content" tabindex="-1">...</main>
```

```css
.skip-link {
  position: absolute;
  top: -9999px;
  left: 0;
}
.skip-link:focus {
  top: 0;
  z-index: 9999;
}
```

### Roving Tabindex

Use for composite widgets where only one item in a group should be in the tab sequence at a time (tabs, radio groups, toolbars, menus).

```typescript
function TabList({ tabs }: { tabs: Tab[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next !== index) {
      e.preventDefault();
      setActiveIndex(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <div role="tablist">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          role="tab"
          tabIndex={i === activeIndex ? 0 : -1}
          aria-selected={i === activeIndex}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onClick={() => setActiveIndex(i)}
          ref={(el) => (tabRefs.current[i] = el)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Standard Keyboard Patterns

| Widget | Keys |
|--------|------|
| Button | Enter, Space |
| Link | Enter |
| Checkbox | Space (toggle) |
| Radio group | Arrow keys (roving), Space (select) |
| Tab list | Arrow keys (roving), Enter/Space (activate), Home/End |
| Menu | Arrow keys (roving), Enter (select), Escape (close), Home/End |
| Dialog | Tab/Shift+Tab (within), Escape (close) |
| Combobox | Arrow keys (list), Enter (select), Escape (dismiss), Home/End |
| Slider | Arrow keys, Home/End, Page Up/Down |
| Tree | Arrow keys, Enter (select/expand), Home/End |

---

## Focus Management

### Focus Visibility — WCAG Requirements

| SC | Level | Requirement |
|----|-------|-------------|
| **2.4.7** Focus Visible | AA | Keyboard-focusable component has a visible focus indicator |
| **2.4.11** Focus Not Obscured (Minimum) | AA (NEW 2.2) | Focus indicator not fully hidden by sticky/fixed content |
| **2.4.12** Focus Not Obscured (Enhanced) | AAA (NEW 2.2) | Focus indicator not partially hidden |
| **2.4.13** Focus Appearance | AAA (NEW 2.2) | ≥2px perimeter, 3:1 contrast between focused/unfocused |

**Never** do this:

```css
/* Illegal — fails 2.4.7 */
* { outline: none; }
button:focus { outline: none; }
```

**Do this** instead:

```css
/* Custom focus ring — meets 2.4.13 AAA */
:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove focus ring for mouse users (progressive enhancement) */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Focus Trap Implementation

Required for modals, drawers, and any dialog that uses `aria-modal="true"`.

```typescript
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ');

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
        (el) => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]')
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}
```

### Focus Restoration

When a modal, drawer, or menu closes, focus must return to the element that triggered it.

```typescript
export function Modal({ isOpen, onClose, children }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Capture trigger before focus moves
      triggerRef.current = document.activeElement as HTMLElement;
      // Move focus into dialog
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else {
      // Restore to trigger on close
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // ... rest of modal
}
```

### Sticky Headers and Focus Obscuring (2.4.11)

When sticky/fixed elements exist, ensure focused elements scroll into view with appropriate offset:

```css
/* Prevent sticky header from obscuring focused element */
:target,
:focus {
  scroll-margin-top: 80px; /* height of sticky header */
}
```

---

## Color & Contrast

### Contrast Ratios

| Content Type | AA | AAA |
|-------------|-----|-----|
| Normal text (< 18pt / 14pt bold) | 4.5:1 | 7:1 |
| Large text (≥ 18pt or ≥ 14pt bold) | 3:1 | 4.5:1 |
| UI components (borders, icons) | 3:1 | — |
| Decorative content | Exempt | Exempt |
| Logotypes | Exempt | Exempt |
| Disabled controls | Exempt | Exempt |

**"Large text"** = 18pt (24px) regular weight or 14pt (approximately 18.67px) bold weight.

### Non-Text Contrast (SC 1.4.11 AA)

The 3:1 requirement applies to:
- Form input borders (against background)
- Checkbox/radio borders
- Button boundaries (when border defines the control)
- Icon-only controls
- Focus indicators (against adjacent colors)
- Charts/graphs that convey information

### Testing Contrast

**Browser tools:**
- Chrome DevTools → Elements → Accessibility pane → contrast ratio
- Firefox → Accessibility inspector → contrast ratio
- Safari → Accessibility inspector

**Standalone tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — paste hex values
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) — desktop eyedropper tool
- Lighthouse → Accessibility audit (uses axe-core)
- [axe DevTools](https://www.deque.com/axe/devtools/) browser extension

**Never rely solely on automated tools for contrast** — they miss gradients, transparency stacking, and image backgrounds.

### Color-Only Information

Color must not be the only visual means of conveying information (SC 1.4.1 A):

```typescript
// Bad — error only shown in red
<input style={{ borderColor: hasError ? 'red' : 'gray' }} />

// Good — color + icon + text
<input
  style={{ borderColor: hasError ? 'red' : 'gray' }}
  aria-invalid={hasError}
  aria-describedby={hasError ? 'field-error' : undefined}
/>
{hasError && (
  <p id="field-error" style={{ color: 'red' }}>
    <span aria-hidden="true">⚠ </span>
    {errorMessage}
  </p>
)}
```

---

## Component Patterns

### Modal Dialog

```typescript
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const trapRef = useFocusTrap(isOpen);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        (trapRef.current?.querySelector('[autofocus], button, [href], input') as HTMLElement)?.focus()
          ?? trapRef.current?.focus();
      });
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        ref={trapRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </>,
    document.body
  );
}
```

**Checklist:**
- `role="dialog"` + `aria-modal="true"` on container
- `aria-labelledby` referencing visible title (or `aria-label`)
- Focus moves into dialog on open
- Focus trapped inside (Tab/Shift+Tab)
- Escape closes dialog
- Focus returns to trigger on close
- Background content is inert (use `inert` attribute on `<body>` children or `aria-hidden`)

### Tabs

```typescript
export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    const map: Record<string, number> = {
      ArrowRight: (i + 1) % tabs.length,
      ArrowLeft: (i - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = map[e.key];
    if (next !== undefined) {
      e.preventDefault();
      setActive(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Content sections">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[i] = el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={i !== active}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Accordion

```typescript
export function Accordion({ items }: { items: { id: string; title: string; content: React.ReactNode }[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <h3>
            <button
              id={`accordion-btn-${item.id}`}
              aria-expanded={open.has(item.id)}
              aria-controls={`accordion-panel-${item.id}`}
              onClick={() => toggle(item.id)}
            >
              {item.title}
            </button>
          </h3>
          <div
            id={`accordion-panel-${item.id}`}
            role="region"
            aria-labelledby={`accordion-btn-${item.id}`}
            hidden={!open.has(item.id)}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Toast / Notification

```typescript
// Toast container — render once, in App root
export function ToastContainer() {
  const { toasts } = useToasts();
  return (
    // role="status" for non-urgent toasts (polite)
    // role="alert" for errors (assertive)
    <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', bottom: 0 }}>
      {toasts.map((toast) => (
        <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}>
          {toast.message}
          <button onClick={() => dismissToast(toast.id)} aria-label={`Dismiss: ${toast.message}`}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Critical:** The live region container must be in the DOM before content is injected. Never create and populate it simultaneously — screen readers won't announce it.

### Combobox (Searchable Select)

```typescript
// Simplified — for full pattern see ARIA APG combobox pattern
export function Combobox({ options, onChange }: ComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const activeId = activeIndex >= 0 ? `option-${activeIndex}` : undefined;

  return (
    <div>
      <input
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul role="listbox" id={listId} aria-label="Options">
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              id={`option-${i}`}
              aria-selected={i === activeIndex}
              onClick={() => select(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Forms

### Labels

Every input must have an accessible name. Use `<label>` as the primary mechanism.

```typescript
// Correct — explicit label
<label htmlFor="name">Full Name</label>
<input id="name" type="text" />

// Correct — wrapped label
<label>
  Full Name
  <input type="text" />
</label>

// Wrong — placeholder is not a label
<input type="text" placeholder="Full Name" />

// Wrong — aria-label suppresses visible label pairing
<input type="text" aria-label="Full Name" />
```

### Required Fields

```typescript
// Mark both semantically and visually
<label htmlFor="email">
  Email
  <span aria-hidden="true"> *</span>
  <span className="sr-only"> (required)</span>
</label>
<input
  id="email"
  type="email"
  required           // native required for browser validation
  aria-required="true" // redundant but explicit for AT
/>

// Tell users what * means — at form start
<p>Fields marked <span aria-hidden="true">*</span> are required.</p>
```

### Error Messaging

**Inline field errors:**

```typescript
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : 'email-hint'}
  />
  <p id="email-hint">We'll never share your email.</p>
  {errors.email && (
    <p id="email-error" role="alert" aria-live="polite">
      {errors.email}
    </p>
  )}
</div>
```

**Form-level summary error (on submit):**

```typescript
// Render container empty in DOM — always present
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  id="form-error-summary"
/>

// On submit failure — inject content dynamically
useEffect(() => {
  if (submitFailed && Object.keys(errors).length > 0) {
    const summary = document.getElementById('form-error-summary');
    if (summary) {
      summary.textContent = `${Object.keys(errors).length} error(s) found. Please fix them and try again.`;
    }
    // Move focus to summary
    summary?.focus();
  }
}, [submitFailed, errors]);
```

### Live Validation Timing

Validate on blur (not on keypress) to avoid interrupting users mid-input. Clear errors on user re-engagement.

```typescript
const [touched, setTouched] = useState<Set<string>>(new Set());

const handleBlur = (field: string) => {
  setTouched((prev) => new Set([...prev, field]));
  validateField(field);
};

// Only show errors for touched fields
const showError = (field: string) => touched.has(field) && errors[field];
```

### Grouping Related Inputs

```html
<fieldset>
  <legend>Shipping Address</legend>
  <!-- inputs inherit group label -->
  <label for="street">Street</label>
  <input id="street" type="text" />
  <label for="city">City</label>
  <input id="city" type="text" />
</fieldset>

<!-- Radio group — always use fieldset + legend -->
<fieldset>
  <legend>Preferred Contact Method</legend>
  <label><input type="radio" name="contact" value="email" /> Email</label>
  <label><input type="radio" name="contact" value="phone" /> Phone</label>
</fieldset>
```

---

## Images & Media

### Alt Text Decision Tree

```
Is the image decorative (purely visual)?
  → Yes: alt="" (empty string, NOT omitted)
  → No: Does it convey information or function?
      → Function (button/link): describe the action ("Open menu", "Go to homepage")
      → Information: describe the content and purpose, not "image of..."
      → Complex (chart, diagram): brief alt + long description nearby or aria-describedby
```

```typescript
// Decorative
<img src="decorative-wave.svg" alt="" />

// Informative
<img src="dog.jpg" alt="Golden retriever running on the beach" />

// Functional (button icon)
<button>
  <img src="search.svg" alt="Search" />
</button>

// Functional — better: SVG with aria-hidden, button with aria-label
<button aria-label="Search">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

// Complex image
<figure>
  <img src="sales-chart.png" alt="Q4 2025 sales chart" aria-describedby="chart-desc" />
  <figcaption id="chart-desc">
    Sales increased 24% from Q3 to Q4, with peaks in November and December.
  </figcaption>
</figure>
```

### Video and Audio

```html
<!-- Video — captions required (SC 1.2.2 AA) -->
<video controls>
  <source src="video.mp4" type="video/mp4" />
  <track kind="captions" src="captions.vtt" srclang="en" label="English" default />
</video>

<!-- Audio — transcript required (SC 1.2.1 A) -->
<audio controls src="podcast.mp3"></audio>
<a href="/transcript">Read transcript</a>
```

---

## Testing

### Automated: axe-core with Vitest

```bash
npm install -D vitest-axe @testing-library/react @testing-library/user-event
```

```typescript
// src/test/setup.ts
import { configureAxe, toHaveNoViolations } from 'vitest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// Optional: configure axe rules
configureAxe({
  rules: [
    { id: 'color-contrast', enabled: false }, // not supported in jsdom
  ],
});
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom', // NOT happy-dom — axe-core incompatible with happy-dom
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```typescript
// Component.test.tsx
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Modal } from './Modal';

describe('Modal accessibility', () => {
  it('has no axe violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('traps focus inside dialog', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        <button>Action</button>
      </Modal>
    );
    // Tab through all elements — should cycle inside modal
    await user.tab();
    expect(document.activeElement).toHaveAttribute('role', 'dialog');
  });
});
```

**axe-core limitations in jsdom:**
- No color contrast checking (requires real browser rendering)
- No viewport-based checks
- Limited animation/timing detection

### Automated: axe-core with Jest

```bash
npm install -D jest-axe @testing-library/react
```

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('no violations', async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

### Automated: Playwright + axe-core

```bash
npm install -D @axe-core/playwright
```

```typescript
import { checkA11y } from 'axe-playwright';

test('homepage has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page, undefined, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
```

### Manual Testing Checklist

**Keyboard navigation:**
- [ ] Tab through entire page without mouse — all interactive elements reachable
- [ ] Visible focus indicator on every focused element
- [ ] No keyboard traps (unless intentional modal — verify Escape exits)
- [ ] Correct tab order (follows visual/logical flow)
- [ ] Skip link appears on first Tab press

**Screen reader basics (VoiceOver/NVDA):**
- [ ] Page title announces on load (`<title>`)
- [ ] Headings create logical document outline
- [ ] All images have appropriate alt text
- [ ] Form labels announce with inputs
- [ ] Error messages announced on validation failure
- [ ] Modal announced as dialog with title on open
- [ ] Dynamic content changes announced via live regions

**Visual:**
- [ ] Contrast ratios pass — test with contrast checker
- [ ] Zoom to 200% — no content loss or overlap
- [ ] Zoom to 400% — content reflows to single column (SC 1.4.10)
- [ ] No flashing content at 3+ Hz (SC 2.3.1)
- [ ] Hover/focus tooltips are persistent and dismissible (SC 1.4.13)

**WCAG 2.2 specific:**
- [ ] Focused elements not obscured by sticky header/footer (2.4.11)
- [ ] All draggable UI has pointer alternative (2.5.7)
- [ ] Touch targets ≥24×24 CSS px (2.5.8)
- [ ] No CAPTCHA without audio/visual alternative (3.3.8)

### Screen Reader Testing Matrix

| SR + Browser | Platform | Priority |
|-------------|----------|----------|
| NVDA + Chrome | Windows | High (most used combo) |
| NVDA + Firefox | Windows | Medium |
| VoiceOver + Safari | macOS/iOS | High (mobile critical) |
| TalkBack + Chrome | Android | Medium |
| JAWS + Chrome/Edge | Windows | High (enterprise) |

**VoiceOver quick start (macOS):**
- Toggle: Cmd + F5
- Navigate: VO (Control + Option) + arrow keys
- Headings: VO + Cmd + H
- Links: VO + Cmd + L
- Form controls: VO + Cmd + J

**NVDA quick start (Windows):**
- Toggle: Ctrl + Alt + N
- Navigate: Arrow keys (browse mode) or Tab (form mode)
- Headings: H key
- Toggle modes: Insert + Space

---

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| `outline: none` globally | Keyboard users lose focus indicator | `outline-offset` + custom ring via `:focus-visible` |
| `<div>` or `<span>` onClick without role/keyboard | Inaccessible to keyboard and screen readers | Use `<button>` or `<a>` |
| Placeholder as the only label | Disappears on input, fails contrast | Use `<label>` — placeholder is hint only |
| `aria-label` overriding visible text | SR reads different text than displayed | Use `aria-labelledby` pointing to visible text |
| `aria-hidden="true"` on parent of focusable element | Focusable child still receives focus; SR users can tab to invisible element | Move `aria-hidden` or restructure DOM |
| `role="alert"` present on page load with content | Content already in DOM won't re-announce | Empty container on load; inject text dynamically |
| Missing `aria-live` container in DOM before use | Announcement missed; container not being monitored | Render empty container in initial HTML |
| Positive `tabindex` values | Breaks natural tab order for all users | DOM order + `tabindex={-1}` only |
| Error shown in color only | Fails SC 1.4.1 — color-blind users miss it | Add text label + `aria-invalid` + `aria-describedby` |
| Missing `<title>` or generic title | Screen reader doesn't announce page on load | Unique descriptive `<title>` per page/route |
| Tooltip only on hover (not focus) | Keyboard users cannot trigger it | Add same tooltip on `:focus` |
| Icon button without accessible name | "Button" announced with no context | `aria-label` on button or `<title>` in SVG |
| Modal without focus trap | Tab exits modal into inert background | Implement focus trap; add `inert` to background |
| Animating content > 3 Hz | Can trigger seizures (SC 2.3.1) | Respect `prefers-reduced-motion` |
| Using `<table>` for layout | Creates confusing row/cell announcements | Use CSS Grid/Flexbox for layout |
| `autocomplete` off on standard fields | Fails 1.3.5 — prevents autofill for motor-impaired | Use correct `autocomplete` values |
| `required` without visual indicator | Users don't know which fields are required | Asterisk + legend + `aria-required` |
| Reusing IDs | Breaks `htmlFor`, `aria-labelledby`, `aria-describedby` | Use `useId()` in React for dynamic IDs |
