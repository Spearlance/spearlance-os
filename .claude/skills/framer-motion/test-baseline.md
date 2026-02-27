# Framer Motion — Test Baseline (RED/GREEN)

> **Tested:** February 2026
> **Package version at test time:** motion 12.34.x (framer-motion 12.34.x shim)

---

## RED Phase — Baseline (Without Skill)

Answers produced from training data alone, before web research. Documents what the agent got wrong, uncertain about, or omitted.

### Q1: Next.js 15 App Router — animated card (fade in, scale on hover, slide out)

**Baseline answer:**

```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'

export function AnimatedCard({ isVisible }: { isVisible: boolean }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -100 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          Card content
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**What was wrong:**
- Import from `framer-motion` — correct but outdated. The package is now `motion` and the import should be `motion/react`.
- No mention of `key` prop on the animated element (required when conditionally rendering inside AnimatePresence).
- Did not mention the `motion/react-client` import path for Server Components.
- Didn't note that `'use client'` is mandatory in Next.js App Router for any file using motion.

**What was right:** Basic structure, `AnimatePresence` usage, `exit` prop, `whileHover`, spring transition.

---

### Q2: Grid reflow + layoutId shared layout (card expands to modal)

**Baseline answer:**

```tsx
<motion.div layout layoutId="card-1">
```

For grid reflow, wrap each item with `layout` prop. `AnimatePresence` wraps the list. `layoutId` enables shared layout between states.

**What was wrong:**
- Incomplete — no mention of `LayoutGroup` and when it's needed (multiple instances of same component).
- No mention that both elements with the same `layoutId` must NOT be in the DOM simultaneously — one must unmount for the transition to work.
- No mention that custom components inside `AnimatePresence` with `layoutId` need `React.forwardRef`.
- `AnimateSharedLayout` mentioned as an alternative — this was removed in v11, should not be suggested.
- `mode="popLayout"` not mentioned for grid reflow animations.

**What was right:** `layout` prop basics, `layoutId` concept, `AnimatePresence` + list structure.

---

### Q3: Scroll-driven animations (progress bar, parallax, viewport entry)

**Baseline answer:**

```tsx
const { scrollYProgress } = useScroll()
const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

// parallax
const y = useTransform(scrollY, [0, 300], [0, -200])

// viewport entry
<motion.div whileInView={{ opacity: 1 }} initial={{ opacity: 0 }} viewport={{ once: true }} />
```

**What was wrong:**
- Uncertain about the exact API for element-relative scroll tracking (target + offset options).
- No mention of `useMotionValueEvent` for reacting to scroll changes imperatively.
- Did not mention `offset` array format for `useScroll` target tracking (`["start end", "end start"]`).
- No mention that `useScroll` in v12.34 supports hardware-accelerated animations when passing values directly to `style`.
- `useViewportScroll` not mentioned (deprecated — good omission, but reason not explained).

**What was right:** `useScroll`, `useTransform`, `whileInView`, `viewport={{ once: true }}`.

---

### Q4: Current version, API changes, deprecations

**Baseline answer:**
- "Training data says v10-v11 range"
- "Possible import path change to `motion/react`"
- "Uncertain about v12+ changes"

**What was wrong:**
- Version unknown — actual current version is 12.34.x.
- Rebranding details vague — Framer Motion rebranded to "Motion for React" in November 2024. Package is now `motion`, import is `motion/react`.
- No mention of `motion/react-client` for RSC contexts.
- No mention of `skipAnimations` added in v12.30.
- No mention of `AnimateSharedLayout` removal (replaced by `LayoutGroup`).
- No mention of `useViewportScroll` removal (replaced by `useScroll`).
- Duration-based spring (`duration` + `bounce`) not known.
- Hardware-accelerated `useScroll` in v12.34 not known.

**What was right:** Identified the import path likely changed. Correctly uncertain rather than confidently wrong.

---

## GREEN Phase — With Skill

Expected improvement when `reference.md` is loaded as context. Each answer should now:

### Q1 (Next.js setup + animated card)

- Use `import { motion, AnimatePresence } from "motion/react"` (not `framer-motion`)
- Add `'use client'` directive explanation
- Include `key` prop on conditionally rendered element
- Mention `motion/react-client` for RSC patterns
- Optionally show the wrapper component pattern (MotionDiv, etc.)

**Skill value:** Corrects import path, adds RSC pattern, adds `key` requirement.

---

### Q2 (Grid reflow + layoutId modal)

- Explain `LayoutGroup` for scoping `layoutId` across multiple instances
- Note that only ONE element with the same `layoutId` should be mounted at a time
- Show `mode="popLayout"` for grid item removal with smooth reflow
- Note `forwardRef` requirement for custom components inside `AnimatePresence`
- Not suggest `AnimateSharedLayout` (correctly omit deprecated API)

**Skill value:** Fills LayoutGroup gap, adds popLayout mode, corrects shared layout misunderstandings.

---

### Q3 (Scroll animations)

- Show `useScroll` with `target` + `offset` for element-relative tracking
- Explain `offset` array format with edge pairs
- Show `useMotionValueEvent` for imperative scroll reactions
- Note v12.34 hardware acceleration for scroll values passed to `style`
- Show `viewport` option with `margin` and `amount` for `whileInView`

**Skill value:** Fills offset API gap, adds useMotionValueEvent, notes hardware acceleration.

---

### Q4 (Version + recent changes)

- State version: 12.34.x (February 2026)
- State package rename: `framer-motion` → `motion`, import `motion/react`
- State RSC import: `motion/react-client`
- List removed APIs: `AnimateSharedLayout`, `useViewportScroll`
- New in v12: `skipAnimations` (v12.30), hardware-accelerated scroll (v12.34), drag from child elements (v12.30.1)
- Duration-based spring: `{ type: "spring", duration: 0.6, bounce: 0.25 }`

**Skill value:** Provides definitive version, full rename story, removed APIs, new features the agent had no training data for.

---

## Success Criteria

| Question | Baseline | With Skill | Delta |
|----------|----------|------------|-------|
| Q1 — Next.js setup | Partially correct, wrong import | Correct import, RSC pattern, key prop | ✓ |
| Q2 — Layout/layoutId | Incomplete, deprecated API risk | LayoutGroup, popLayout, forwardRef | ✓ |
| Q3 — Scroll animations | Missing offset API, useMotionValueEvent | Complete scroll API | ✓ |
| Q4 — Version/changes | Entirely wrong/unknown | Accurate version + full change history | ✓ |

All 4 questions show meaningful improvement. Skill passes GREEN gate.
