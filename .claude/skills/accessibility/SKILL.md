---
model: claude-sonnet-4-6
name: accessibility
description: Use when implementing WCAG-compliant interfaces, ARIA patterns, keyboard navigation, focus management, or screen reader support. Also use when auditing component accessibility, fixing contrast issues, or building accessible forms, modals, and navigation.
---

# Accessibility (WCAG 2.2)

WCAG 2.2 is the current standard (ISO/IEC 40500:2025). Three levels: A (minimum), AA (legal standard — target this), AAA (enhanced). Target AA.

## Quick Rules

| Rule | Requirement |
|------|-------------|
| Text contrast (normal) | 4.5:1 AA · 7:1 AAA |
| Text contrast (large: 18pt / 14pt bold) | 3:1 AA · 4.5:1 AAA |
| Non-text contrast (borders, icons) | 3:1 AA |
| Focus — not fully obscured | 2.4.11 AA (new in 2.2) |
| Focus indicator size + contrast | 2px perimeter + 3:1 (2.4.13 AAA) |
| Touch targets | 24×24 CSS px minimum (2.5.8 AA, new in 2.2) |
| ARIA first rule | Native HTML before ARIA |

## axe-core Setup

```bash
npm install -D vitest-axe @testing-library/react   # Vitest
npm install -D jest-axe @testing-library/react      # Jest
```

```typescript
// setup.ts
import { toHaveNoViolations } from 'vitest-axe';
expect.extend(toHaveNoViolations);

// test
it('has no a11y violations', async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Use `jsdom` — NOT `happy-dom`. axe-core is incompatible with happy-dom. Color contrast requires a real browser (Lighthouse/axe DevTools).

## Modal Dialog Pattern

```typescript
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const trapRef = useFocusTrap(isOpen); // see reference.md
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => trapRef.current?.focus());
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return createPortal(
    <div ref={trapRef} role="dialog" aria-modal="true"
      aria-labelledby="modal-title" tabIndex={-1}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>,
    document.body
  );
}
```

## Form Error Pattern

```typescript
// Empty alert container always in DOM — inject text dynamically
<div role="alert" aria-live="assertive" aria-atomic="true" />

// Field-level: aria-invalid + aria-describedby
<input aria-invalid={!!error} aria-describedby={error ? 'field-error' : undefined} />
{error && <p id="field-error" aria-live="polite">{error}</p>}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `outline: none` globally | `:focus-visible` with custom ring |
| Icon button with no label | `aria-label` on button, `aria-hidden` on SVG |
| `<div>` onClick | Use `<button>` |
| `role="alert"` pre-populated on load | Empty container first, inject text to trigger announce |
| Error in color only | Add text + `aria-invalid` + `aria-describedby` |
| Positive `tabindex` | Never use `tabindex > 0` |
| Modal without focus trap | Implement trap — Tab must cycle inside |

## Full Reference

See `reference.md`: WCAG 2.2 all 9 new criteria, ARIA role catalog, `useFocusTrap` implementation, roving tabindex, tabs/accordion/combobox/toast patterns, form validation, images/media, screen reader testing matrix, manual checklist.
