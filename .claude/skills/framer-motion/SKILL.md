---
model: claude-sonnet-4-6
name: framer-motion
description: Use when working with Framer Motion for React animations, layout transitions, gestures, scroll-driven animations, or mount/unmount transitions with AnimatePresence. Also use when debugging spring physics, animation performance, or layout animation issues.
---

# Framer Motion (Motion for React)

## Overview

Motion for React (formerly Framer Motion) v12.x — production animation library for React. Latest stable: **12.34.x** (February 2026). Package rebranded from `framer-motion` to `motion` in November 2024.

## Quick Reference

| Item | Value |
|------|-------|
| **Package** | `motion` (new) or `framer-motion` (legacy, still works) |
| **Current version** | 12.34.x |
| **React import** | `import { motion } from "motion/react"` |
| **RSC import** | `import * as motion from "motion/react-client"` |
| **Legacy import** | `import { motion } from "framer-motion"` (still supported) |
| **Docs** | https://motion.dev/docs/react |
| **Install** | `npm install motion` |

## Installation

```bash
npm install motion
```

All Next.js components using motion must be client components:

```tsx
// components/animated-card.tsx
'use client'
import { motion } from "motion/react"
```

For Server Components that pass motion elements as children, wrap with `'use client'` in a separate file — do not put `'use client'` on the Server Component itself.

## Core Usage

```tsx
'use client'
import { motion, AnimatePresence } from "motion/react"

// Fade in on mount, scale on hover, slide out on unmount
function AnimatedCard({ isVisible }: { isVisible: boolean }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      )}
    </AnimatePresence>
  )
}
```

## Key Props at a Glance

| Prop | Purpose |
|------|---------|
| `initial` | State before mount |
| `animate` | Target state (or variant name) |
| `exit` | State on unmount (requires AnimatePresence) |
| `transition` | How values animate (spring/tween/inertia) |
| `variants` | Named animation states |
| `layout` | Animate layout changes automatically |
| `layoutId` | Shared layout between two elements |
| `whileHover` | State while hovered |
| `whileTap` | State while pressed |
| `whileInView` | State while in viewport |
| `whileDrag` | State while dragging |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `exit` animations not running | Wrap with `<AnimatePresence>` — required for exit |
| Layout animations fighting animate | Use `layout` prop for position/size changes, not `animate` |
| Using `framer-motion` package | Switch to `motion` — same API, smaller bundle |
| motion in Server Component | Add `'use client'` to the file |
| layoutId conflicts across component instances | Wrap with `<LayoutGroup id="unique">` |
| Animating width/height directly | Use `scaleX`/`scaleY` + `originX`/`originY` for performance |

## Full Reference

See `reference.md` for: installation, all motion props, transition types (spring/tween/inertia configs), AnimatePresence modes, layout animations, layoutId shared layout, gestures, scroll animations (useScroll/useTransform), variants & orchestration (staggerChildren), motion values, performance guide, and v10→v12 migration.
