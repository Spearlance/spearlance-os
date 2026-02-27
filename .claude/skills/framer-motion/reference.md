# Framer Motion (Motion for React) — Full Reference

> **Last Verified:** February 2026
> **Version:** 12.34.x (latest stable)
> **Package:** `motion` (formerly `framer-motion`)
> **Docs:** https://motion.dev/docs/react

---

## Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [Core: motion Components](#2-core-motion-components)
3. [Transition Types](#3-transition-types)
4. [AnimatePresence](#4-animatepresence)
5. [Layout Animations](#5-layout-animations)
6. [Gestures](#6-gestures)
7. [Scroll Animations](#7-scroll-animations)
8. [Variants & Orchestration](#8-variants--orchestration)
9. [Motion Values](#9-motion-values)
10. [Performance](#10-performance)
11. [Common Mistakes](#11-common-mistakes)
12. [Recent Changes (v10 → v12)](#12-recent-changes-v10--v12)

---

## 1. Installation & Setup

### Install

```bash
npm install motion
```

The package was renamed from `framer-motion` to `motion` in November 2024. Both packages coexist — `framer-motion` is a re-export of `motion` for backward compatibility, but `motion` is the canonical package going forward.

### Import paths

```tsx
// Standard React import (requires 'use client' in Next.js App Router)
import { motion, AnimatePresence, MotionConfig } from "motion/react"

// For use inside React Server Components passing motion as children
import * as motion from "motion/react-client"

// Legacy (still works, maps to motion/react internally)
import { motion } from "framer-motion"
```

### Next.js App Router setup

motion components require browser APIs (DOM, window, requestAnimationFrame). They cannot run in React Server Components.

**Every file that uses motion must be a Client Component:**

```tsx
// app/components/animated-card.tsx
'use client'
import { motion } from "motion/react"

export function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
  )
}
```

**Server Component consuming a motion component (correct pattern):**

```tsx
// app/page.tsx — Server Component, no 'use client'
import { AnimatedCard } from "@/components/animated-card"

export default function Page() {
  return (
    <main>
      <AnimatedCard />  {/* Client Component — fine */}
    </main>
  )
}
```

**Wrapper component pattern for reusable motion primitives:**

```tsx
// components/motion-primitives.tsx
'use client'
import { motion } from "motion/react"

export const MotionDiv = motion.div
export const MotionSection = motion.section
export const MotionH1 = motion.h1
export const MotionUl = motion.ul
export const MotionLi = motion.li
```

### MotionConfig (global defaults)

```tsx
'use client'
import { MotionConfig } from "motion/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      reducedMotion="user"  // auto-respects prefers-reduced-motion
    >
      {children}
    </MotionConfig>
  )
}
```

---

## 2. Core: motion Components

### Available elements

`motion` wraps any HTML or SVG element:

```tsx
motion.div  motion.span  motion.button  motion.a  motion.ul  motion.li
motion.p    motion.h1    motion.h2      motion.section  motion.article
motion.svg  motion.circle  motion.path  motion.rect  motion.g

// Custom component — must forward ref
const Box = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => (
  <div ref={ref} {...props} />
))
const MotionBox = motion(Box)
```

### Core props

| Prop | Type | Description |
|------|------|-------------|
| `initial` | `VariantLabels \| TargetAndTransition \| false` | State before mount. `false` = no initial animation |
| `animate` | `VariantLabels \| TargetAndTransition \| AnimationControls` | Animated target state |
| `exit` | `VariantLabels \| TargetAndTransition` | State on unmount. Requires `AnimatePresence` wrapper |
| `transition` | `Transition` | How the animation runs (spring, tween, etc.) |
| `variants` | `Variants` | Named animation states |
| `style` | `MotionStyle` | Static styles + motion values |
| `className` | `string` | Standard className |
| `custom` | `any` | Passed to dynamic variant functions |
| `layout` | `boolean \| "position" \| "size"` | Animate layout changes |
| `layoutId` | `string` | Connects two elements for shared layout |
| `layoutDependency` | `any` | Re-trigger layout animation when this changes |
| `onAnimationStart` | `(definition: AnimationDefinition) => void` | |
| `onAnimationComplete` | `(definition: AnimationDefinition) => void` | |
| `onLayoutAnimationStart` | `() => void` | |
| `onLayoutAnimationComplete` | `() => void` | |
| `onUpdate` | `(latest: ResolvedValues) => void` | Fires every frame during animation |

### Animatable properties

Motion can animate any CSS property. GPU-accelerated (prefer these):

```tsx
// Transform values (hardware accelerated — always prefer)
x, y, z                    // translate (px or %)
rotate, rotateX, rotateY   // degrees
scale, scaleX, scaleY      // multiplier
skewX, skewY               // degrees
originX, originY           // transform origin (0-1 or px)

// Opacity (hardware accelerated)
opacity

// Other animatable (triggers layout/paint — use sparingly)
width, height, borderRadius, backgroundColor, color, padding, margin
```

### Basic examples

```tsx
// Fade in on mount
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

// Slide up and fade in
<motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
/>

// Keyframe animation
<motion.div
  animate={{ x: [0, 100, 0], opacity: [1, 0.5, 1] }}
  transition={{ duration: 2, repeat: Infinity }}
/>

// Conditional animation
<motion.div animate={{ opacity: isVisible ? 1 : 0 }} />
```

---

## 3. Transition Types

The `transition` prop controls how animated values move. Applies globally or per-property.

### Spring (default for transform properties)

Physics-based. Most natural for UI interactions.

```tsx
transition={{
  type: "spring",
  stiffness: 300,   // how stiff the spring is (default: 100) — higher = snappier
  damping: 20,      // opposing force (default: 10) — 0 = bounces forever
  mass: 1,          // object mass (default: 1) — higher = more sluggish
  velocity: 0,      // initial velocity
  restSpeed: 0.01,  // velocity threshold to stop animation
  restDelta: 0.01,  // distance threshold to stop animation
}}
```

**Spring presets by feel:**

| Feel | stiffness | damping | mass |
|------|-----------|---------|------|
| Snappy | 400 | 30 | 1 |
| Bouncy | 200 | 10 | 1 |
| Gentle | 80 | 20 | 1 |
| Sluggish | 100 | 20 | 3 |
| No bounce | 300 | 40 | 1 |

**Duration-based spring (v11+):**

```tsx
// Instead of stiffness/damping, specify duration + bounce
transition={{
  type: "spring",
  duration: 0.6,   // seconds
  bounce: 0.25,    // 0 = no bounce, 0.5 = lots of bounce (default: 0.25)
}}
```

### Tween (default for color, opacity in some cases)

Time-based. Predictable duration.

```tsx
transition={{
  type: "tween",
  duration: 0.3,     // seconds
  ease: "easeOut",   // easing function
  delay: 0.1,
}}

// ease options:
"linear" | "easeIn" | "easeOut" | "easeInOut" | "circIn" | "circOut" |
"circInOut" | "backIn" | "backOut" | "backInOut" | "anticipate"

// Custom cubic bezier
ease: [0.25, 0.46, 0.45, 0.94]
```

### Inertia

Decelerates from an initial velocity. Used with drag.

```tsx
transition={{
  type: "inertia",
  velocity: 200,    // initial velocity (px/s)
  power: 0.8,       // how much the velocity affects distance (0-1)
  timeConstant: 700, // deceleration rate (ms)
  bounceStiffness: 500,
  bounceDamping: 20,
  min: 0,           // minimum boundary
  max: 500,         // maximum boundary
  modifyTarget: (target) => Math.round(target / 50) * 50  // snap to grid
}}
```

### Per-property transitions

```tsx
<motion.div
  animate={{ x: 100, opacity: 1, backgroundColor: "#ff0000" }}
  transition={{
    x: { type: "spring", stiffness: 300 },
    opacity: { duration: 0.2 },
    backgroundColor: { duration: 0.5, ease: "easeOut" },
  }}
/>
```

### Repeat

```tsx
transition={{
  duration: 1,
  repeat: Infinity,         // or number of repeats
  repeatType: "loop",       // "loop" | "reverse" | "mirror"
  repeatDelay: 0.5,         // delay between repeats
}}
```

---

## 4. AnimatePresence

Enables `exit` animations when components unmount from the React tree.

### Basic usage

```tsx
'use client'
import { motion, AnimatePresence } from "motion/react"

function Component({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="modal"                    // required when children can change
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </AnimatePresence>
  )
}
```

**Rules:**
- Children must have a `key` prop when the component can mount/unmount
- `exit` prop on motion components is ignored without AnimatePresence
- AnimatePresence must directly wrap the conditional element (not an intermediate component without forwardRef)

### Modes

| Mode | Behavior |
|------|----------|
| `"sync"` (default) | Enter and exit run simultaneously |
| `"wait"` | Wait for exit to complete before entering new component |
| `"popLayout"` | Exiting element pops out of layout (position: absolute), remaining elements immediately reflow |

```tsx
// mode="wait" — good for page transitions
<AnimatePresence mode="wait">
  <motion.div key={currentPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
</AnimatePresence>

// mode="popLayout" — good for list item removal with layout reflow
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div key={item.id} layout exit={{ opacity: 0, scale: 0.8 }}>
      {item.name}
    </motion.div>
  ))}
</AnimatePresence>
```

**popLayout gotcha:** The parent element must have `position` other than `static` (use `relative`, `absolute`, or `fixed`). Custom components directly inside AnimatePresence with popLayout must forward refs.

### Initial animation on first render

```tsx
// Disable initial animation for elements already present on page
<AnimatePresence initial={false}>
  {show && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>
```

### List animations

```tsx
function List({ items }: { items: Item[] }) {
  return (
    <AnimatePresence>
      {items.map((item) => (
        <motion.li
          key={item.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {item.name}
        </motion.li>
      ))}
    </AnimatePresence>
  )
}
```

### Page transitions with Next.js App Router

```tsx
// components/page-transition.tsx
'use client'
import { motion, AnimatePresence } from "motion/react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

---

## 5. Layout Animations

Layout animations use FLIP technique internally — CSS transforms instead of expensive layout recalculations.

### layout prop

Add `layout` to any motion component. When its size or position changes (due to state change, sibling removal, etc.), it animates to the new position.

```tsx
// Animates position/size changes
<motion.div layout />

// Only animate position changes (not size)
<motion.div layout="position" />

// Only animate size changes (not position)
<motion.div layout="size" />
```

### Grid reflow — item removal

```tsx
function Grid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout                          // smoothly reflows when item is removed
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {item.name}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

### layoutId — shared layout transitions

Two elements with the same `layoutId` animate between each other when one mounts and the other unmounts.

```tsx
// Tab indicator sliding between tabs
function Tabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex">
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="relative px-4 py-2">
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-blue-500 rounded"
              style={{ zIndex: -1 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
```

### Card expanding to modal

```tsx
'use client'
import { motion, AnimatePresence, LayoutGroup } from "motion/react"

function CardGrid({ cards }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <LayoutGroup>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            onClick={() => setSelected(card.id)}
            className="cursor-pointer rounded-lg bg-white p-4"
          >
            <motion.h2 layoutId={`card-title-${card.id}`}>{card.title}</motion.h2>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            layoutId={`card-${selected}`}
            className="fixed inset-0 z-50 bg-white p-8"
            onClick={() => setSelected(null)}
          >
            <motion.h2 layoutId={`card-title-${selected}`}>
              {cards.find(c => c.id === selected)?.title}
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  )
}
```

### LayoutGroup

Use `LayoutGroup` to:
1. Scope `layoutId` values — prevents collisions when the same component renders multiple times
2. Coordinate layout animations across sibling components

```tsx
import { LayoutGroup } from "motion/react"

// Without LayoutGroup, layoutId="indicator" is global — conflicts if TabRow renders twice
function App() {
  return (
    <>
      <LayoutGroup id="tabs-a">
        <TabRow />
      </LayoutGroup>
      <LayoutGroup id="tabs-b">
        <TabRow />
      </LayoutGroup>
    </>
  )
}
```

### Layout animation transition

```tsx
// Control layout animation speed separately
<motion.div
  layout
  transition={{
    layout: { type: "spring", stiffness: 300, damping: 30 }
  }}
/>
```

---

## 6. Gestures

### whileHover / whileTap

```tsx
<motion.button
  whileHover={{ scale: 1.05, backgroundColor: "#3b82f6" }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  Click me
</motion.button>
```

### whileInView

Animates when element enters the viewport.

```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{
    once: true,       // only animate once (don't reset on scroll out)
    margin: "-100px", // trigger 100px before element enters viewport
    amount: 0.5,      // trigger when 50% of element is visible (default: "some")
  }}
  transition={{ duration: 0.5 }}
/>
```

### Drag

```tsx
<motion.div
  drag                          // drag in both axes
  drag="x"                      // drag only on x axis
  dragConstraints={{ left: -100, right: 100, top: 0, bottom: 0 }}
  dragElastic={0.2}             // how much the element moves beyond constraints (0-1)
  dragMomentum={true}           // continue moving after release (inertia)
  dragSnapToOrigin              // snap back to initial position on release
  whileDrag={{ scale: 1.1, cursor: "grabbing" }}
  onDragEnd={(event, info) => {
    console.log(info.point, info.velocity, info.offset)
  }}
/>
```

**Drag with ref constraints:**

```tsx
const constraintsRef = useRef(null)

<div ref={constraintsRef} className="overflow-hidden relative w-full h-64">
  <motion.div
    drag
    dragConstraints={constraintsRef}
    className="w-16 h-16 bg-blue-500 rounded-full"
  />
</div>
```

**Manual drag controls:**

```tsx
import { useDragControls } from "motion/react"

function DragHandle() {
  const controls = useDragControls()

  return (
    <div>
      <div onPointerDown={(e) => controls.start(e)} className="cursor-grab">
        Drag from here
      </div>
      <motion.div drag="y" dragControls={controls} dragListener={false}>
        This element drags when you drag the handle
      </motion.div>
    </div>
  )
}
```

### Gesture callbacks

```tsx
<motion.div
  onHoverStart={(event, info) => {}}
  onHoverEnd={(event, info) => {}}
  onTap={(event, info) => {}}
  onTapStart={(event, info) => {}}
  onTapCancel={(event, info) => {}}
  onPan={(event, info) => {}}
  onPanStart={(event, info) => {}}
  onPanEnd={(event, info) => {}}
  onDrag={(event, info) => {}}
  onDragStart={(event, info) => {}}
  onDragEnd={(event, info) => {}}
/>
```

---

## 7. Scroll Animations

### useScroll

Returns motion values for scroll progress.

```tsx
'use client'
import { useScroll, useTransform, motion } from "motion/react"

// Page scroll progress
function ProgressBar() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-blue-500 origin-left"
      style={{ scaleX: scrollYProgress }}  // hardware accelerated in v12
    />
  )
}
```

**useScroll options:**

```tsx
const containerRef = useRef(null)

// Track scroll within a specific container
const { scrollY, scrollYProgress } = useScroll({
  container: containerRef,      // scrollable container element
})

// Track element scroll position relative to viewport
const elementRef = useRef(null)
const { scrollYProgress } = useScroll({
  target: elementRef,
  offset: ["start end", "end start"],
  // offset format: ["when target [edge] meets viewport [edge]", ...]
  // edges: "start", "end", "center", number (0-1)
})
```

**Offset presets:**

| Offset | Meaning |
|--------|---------|
| `"start end"` | When element's top hits viewport bottom (entering) |
| `"end start"` | When element's bottom hits viewport top (leaving) |
| `"start start"` | When element's top hits viewport top |
| `"center center"` | When element's center meets viewport center |

### useTransform

Maps one motion value to another.

```tsx
import { useScroll, useTransform } from "motion/react"

function ParallaxHero() {
  const { scrollY } = useScroll()

  // Map scrollY 0→300px to y 0→-150px (parallax effect)
  const y = useTransform(scrollY, [0, 300], [0, -150])

  // Map scrollYProgress 0→1 to opacity 1→0
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <div className="relative h-screen overflow-hidden">
      <motion.img
        src="/hero.jpg"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ y }}
      />
      <motion.div style={{ opacity }}>
        <h1>Scroll down</h1>
      </motion.div>
    </div>
  )
}
```

**Non-linear transform with easing:**

```tsx
const opacity = useTransform(
  scrollYProgress,
  [0, 0.5, 1],           // input range
  [0, 1, 0],             // output range
  { ease: easeInOut }    // optional easing
)
```

**Clamp (prevent extrapolation beyond range):**

```tsx
const x = useTransform(scrollY, [0, 500], [0, 100], { clamp: false })
```

### Fade/slide in on viewport entry

```tsx
// Pattern 1: whileInView (simple)
<motion.section
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.6 }}
/>

// Pattern 2: useScroll with target (scroll-linked, continuous)
function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["0 1", "1 1"],
  })
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const y = useTransform(scrollYProgress, [0, 1], [60, 0])

  return (
    <motion.div ref={ref} style={{ opacity, y }}>
      {children}
    </motion.div>
  )
}
```

### useMotionValueEvent

React to motion value changes without re-renders.

```tsx
import { useMotionValueEvent, useScroll } from "motion/react"

function Header() {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(latest > prev && latest > 150)
  })

  return (
    <motion.header
      variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
      animate={hidden ? "hidden" : "visible"}
    />
  )
}
```

### useScroll with hardware acceleration (v12.34+)

In v12.34, `useScroll` supports direct hardware-accelerated animations by passing motion values directly to `style`:

```tsx
const { scrollYProgress } = useScroll()

// Direct style binding — runs off main thread when possible
<motion.div style={{ scaleX: scrollYProgress }} />
```

---

## 8. Variants & Orchestration

Variants define named animation states and enable parent-child orchestration.

### Basic variants

```tsx
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
  transition={{ duration: 0.3 }}
/>
```

### Propagation — children inherit parent variant

When a parent has `variants`, all descendant motion components automatically use the same variant name without needing `animate` specified.

```tsx
const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

<motion.ul variants={listVariants} initial="hidden" animate="visible">
  {items.map(item => (
    // No initial/animate needed — inherited from parent
    <motion.li key={item.id} variants={itemVariants}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### Stagger — orchestrating children

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,      // delay between each child (seconds)
      delayChildren: 0.2,        // delay before first child starts
      when: "beforeChildren",    // parent animates first, then children
      // when: "afterChildren"   // children animate first, then parent
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function AnimatedList({ items }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

### Dynamic variants with `custom`

```tsx
const itemVariants = {
  hidden: { opacity: 0 },
  visible: (index: number) => ({
    opacity: 1,
    transition: { delay: index * 0.1 },
  }),
}

{items.map((item, i) => (
  <motion.div key={item.id} custom={i} variants={itemVariants} />
))}
```

### useAnimation — imperative controls

```tsx
import { useAnimation } from "motion/react"

function ControlledAnimation() {
  const controls = useAnimation()

  async function sequence() {
    await controls.start({ x: 100 })
    await controls.start({ y: 100 })
    controls.start({ opacity: 0 })
  }

  return (
    <motion.div animate={controls}>
      <button onClick={sequence}>Play</button>
    </motion.div>
  )
}
```

### useAnimate — fine-grained imperative animations

```tsx
import { useAnimate, stagger } from "motion/react"

function Component() {
  const [scope, animate] = useAnimate()

  async function handleClick() {
    await animate("li", { opacity: 0, x: -20 }, { delay: stagger(0.05) })
    await animate("li", { opacity: 1, x: 0 }, { delay: stagger(0.05) })
  }

  return (
    <ul ref={scope}>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
      <button onClick={handleClick}>Animate</button>
    </ul>
  )
}
```

---

## 9. Motion Values

Motion values are observable values that update without triggering React re-renders. Foundation of all motion animations.

### useMotionValue

```tsx
import { useMotionValue, motion } from "motion/react"

function Draggable() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  return (
    <motion.div
      drag
      style={{ x, y }}
      onDrag={() => console.log(x.get())}
    />
  )
}
```

### useSpring

Motion value that follows another with spring physics.

```tsx
import { useSpring, useMotionValue, motion } from "motion/react"

function SmoothFollower() {
  const mouseX = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 30 })

  return (
    <div onMouseMove={(e) => mouseX.set(e.clientX)}>
      <motion.div style={{ x: smoothX }} />
    </div>
  )
}
```

### useTransform (from motion value)

```tsx
import { useMotionValue, useTransform } from "motion/react"

const x = useMotionValue(0)
const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])
const rotate = useTransform(x, [-200, 200], [-45, 45])
```

### useMotionTemplate

Combine motion values into a CSS string.

```tsx
import { useMotionTemplate, useMotionValue } from "motion/react"

function RadialGradient() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const background = useMotionTemplate`radial-gradient(
    600px circle at ${mouseX}px ${mouseY}px,
    rgba(29, 78, 216, 0.15),
    transparent 80%
  )`

  return (
    <motion.div
      onMouseMove={(e) => {
        mouseX.set(e.clientX)
        mouseY.set(e.clientY)
      }}
      style={{ background }}
    />
  )
}
```

### useVelocity

Track velocity of a motion value.

```tsx
import { useVelocity, useMotionValue, useTransform } from "motion/react"

const x = useMotionValue(0)
const xVelocity = useVelocity(x)

// Scale based on drag speed
const scale = useTransform(xVelocity, [-3000, 0, 3000], [0.8, 1, 0.8])
```

### Reading and writing motion values

```tsx
const x = useMotionValue(0)

// Read (does not trigger re-render)
console.log(x.get())

// Write (does not trigger re-render, animates if bound to motion component)
x.set(100)

// Subscribe
const unsubscribe = x.on("change", (latest) => console.log(latest))
unsubscribe()

// Get previous value
const prev = x.getPrevious()
```

---

## 10. Performance

### GPU-accelerated properties (always prefer)

Animate these — they run on the compositor thread and do not trigger layout or paint:

```
transform: x, y, z, rotate, rotateX, rotateY, scale, scaleX, scaleY, skewX, skewY
opacity
filter (in modern browsers)
```

**Avoid animating** (triggers layout recalculation — expensive):
```
width, height, top, left, right, bottom, margin, padding
```

**Instead of animating width:**

```tsx
// BAD — triggers layout
animate={{ width: 200 }}

// GOOD — scale transforms, no layout
animate={{ scaleX: 2 }}
// or use transform origin to control expansion direction
style={{ originX: 0 }}
animate={{ scaleX: 2 }}
```

### MotionConfig reducedMotion

```tsx
// Respect user's system preference automatically
<MotionConfig reducedMotion="user">
  {/* all motion components inside respect prefers-reduced-motion */}
</MotionConfig>

// Always reduce motion (e.g., for battery saving)
<MotionConfig reducedMotion="always">

// Never reduce (explicit override)
<MotionConfig reducedMotion="never">
```

When `reducedMotion="user"` and the user has enabled Reduce Motion: transform and layout animations are disabled, opacity/color animations are preserved.

### useReducedMotion hook

```tsx
import { useReducedMotion } from "motion/react"

function AnimatedComponent() {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      animate={prefersReduced
        ? { opacity: 1 }                    // fade only
        : { opacity: 1, y: 0, scale: 1 }   // full animation
      }
      initial={prefersReduced
        ? { opacity: 0 }
        : { opacity: 0, y: 40, scale: 0.9 }
      }
    />
  )
}
```

### will-change

Motion adds `will-change: transform` automatically during animations and removes it afterward. Manual usage:

```tsx
// Only if you know an animation is about to start
<motion.div style={{ willChange: "transform" }} />
```

Do not set `will-change` statically on elements that rarely animate — it consumes GPU memory.

### skipAnimations (v12.30+)

Added in v12.30.0 — skip all animations (useful for testing, reduced-data mode):

```tsx
<MotionConfig skipAnimations>
  {/* all animations complete instantly */}
</MotionConfig>
```

### Lazy features (reduce bundle size)

```tsx
// Only import what you need from motion (vanilla JS, no React)
import { animate } from "motion"

// Minimal React bundle (~18kb vs ~34kb full)
import { motion } from "motion/react-m"  // m is the minimal build
```

---

## 11. Common Mistakes

| Mistake | Root Cause | Fix |
|---------|------------|-----|
| `exit` animation doesn't run | No `AnimatePresence` wrapping the component | Add `<AnimatePresence>` around conditional element |
| `exit` animation runs but layout doesn't reflow | Default `mode="sync"` keeps space reserved | Use `mode="popLayout"` for list removals |
| layoutId shared animation doesn't trigger | Both elements mounted simultaneously | Use conditional rendering — only one should be in DOM at a time |
| layoutId conflicts between instances | Global scope by default | Wrap with `<LayoutGroup id="unique">` per instance |
| Layout animation conflicts with animate | Both systems competing | Only use `layout` for layout changes; use `animate` for appearance changes |
| Custom component doesn't animate with layoutId | Missing forwardRef | Wrap with `React.forwardRef` forwarding ref to DOM node |
| `initial` runs on every render | Not memoizing variants | Define variants outside component or use `useMemo` |
| Server component error with motion | motion requires browser APIs | Add `'use client'` to the component file |
| `whileInView` fires repeatedly on scroll | Missing `viewport={{ once: true }}` | Add `once: true` to viewport config |
| Spring animation never settles | damping too low | Increase damping or use `bounce: 0` in duration-based spring |
| Drag snaps back unexpectedly | `dragSnapToOrigin` set | Remove prop or use dragConstraints instead |
| `animate` prop causes flicker | `initial` not set | Always set `initial` when using `animate` |
| Animating `height: "auto"` | Not supported directly | Use `motion.div` with `layout` prop, or animate `scaleY` |

---

## 12. Recent Changes (v10 → v12)

### Package rename (November 2024)

```bash
# Old
npm install framer-motion
import { motion } from "framer-motion"

# New
npm install motion
import { motion } from "motion/react"

# For React Server Components
import * as motion from "motion/react-client"
```

`framer-motion` still works as a compatibility shim — no breaking change, but migrate to `motion` for bundle size improvements and future features.

### v11 changes

- **animate/timeline API redesign** — the imperative `animate()` function from `motion/mini` is now a smaller, faster mini bundle (2.5kb). Supports default value types.
- **Removed APIs** — some internal APIs were removed. Check [upgrade guide](https://motion.dev/docs/react-upgrade-guide) if you relied on non-public APIs.
- **useScroll refinements** — smoother updates in long content-heavy pages, more stable velocity values.
- **Duration-based spring** — new `duration` + `bounce` API as alternative to `stiffness`/`damping`/`mass`.

### v12 changes

- **v12.0.0** — substantial internal changes to animation framework. API surface remained stable.
- **v12.30.0 (Feb 2026)** — `MotionConfig` gains `skipAnimations` option for instant completion of all animations.
- **v12.30.1 (Feb 2026)** — drag can now be initiated by child `<a>` and `<button>` elements.
- **v12.33.1 (Feb 2026)** — `AnimatePresence` fix: exiting nodes now correctly removed when rapidly switching children.
- **v12.34.0 (Feb 2026)** — `useScroll` hardware-accelerated animations: scroll progress values passed directly to `style` now run off main thread when possible.

### Deprecated patterns to avoid

```tsx
// DEPRECATED — AnimateSharedLayout (removed in v11)
// Use LayoutGroup instead
<AnimateSharedLayout>  // ✗
<LayoutGroup>          // ✓

// DEPRECATED — useCycle in favor of explicit state
const [cycle, cycleNext] = useCycle("closed", "open")  // works but not recommended
// Prefer useState + explicit variant names

// DEPRECATED — useViewportScroll (removed)
const { scrollY } = useViewportScroll()  // ✗
const { scrollY } = useScroll()          // ✓

// OLD package import (still works, prefer migration)
import { motion } from "framer-motion"   // works
import { motion } from "motion/react"    // preferred
```

### Migration from framer-motion to motion

```bash
# 1. Install new package
npm uninstall framer-motion
npm install motion

# 2. Update imports (global find & replace)
# "framer-motion" → "motion/react"

# 3. Add 'use client' if in Next.js App Router
# (was required before too, but now more strictly enforced)
```

API is identical — no other code changes required for standard usage.

---

Sources:
- [Motion Changelog](https://motion.dev/changelog)
- [Motion & Framer Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide)
- [React motion component](https://motion.dev/docs/react-motion-component)
- [AnimatePresence docs](https://motion.dev/docs/react-animate-presence)
- [Layout animations](https://motion.dev/docs/react-layout-animations)
- [useScroll docs](https://motion.dev/docs/react-use-scroll)
- [Accessibility guide](https://motion.dev/docs/react-accessibility)
- [framer-motion npm](https://www.npmjs.com/package/framer-motion)
