# GSAP Reference

> **Last Verified:** February 2026 — GSAP 3.14.x

## Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [Core Methods](#2-core-methods)
3. [Timeline Orchestration](#3-timeline-orchestration)
4. [ScrollTrigger](#4-scrolltrigger)
5. [SplitText Plugin](#5-splittext-plugin)
6. [Flip Plugin](#6-flip-plugin)
7. [React / Next.js Integration](#7-react--nextjs-integration)
8. [Easing](#8-easing)
9. [Performance](#9-performance)
10. [Licensing](#10-licensing)
11. [Common Mistakes](#11-common-mistakes)
12. [Recent Changes](#12-recent-changes)

---

## 1. Installation & Setup

### npm

```bash
npm install gsap @gsap/react
```

All plugins are bundled in the `gsap` package as of 3.13. No separate plugin packages needed.

### Import & Register Plugins

Always register plugins at the **module level** (outside components), not inside hooks or functions.

```typescript
// lib/gsap.ts — centralized registration
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  SplitText,
  Flip,
  ScrollSmoother,
  MorphSVGPlugin,
  DrawSVGPlugin
)

export { gsap, ScrollTrigger, SplitText, Flip, ScrollSmoother }
```

### CDN

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.14.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.14.2/ScrollTrigger.min.js"></script>
```

```javascript
gsap.registerPlugin(ScrollTrigger)
```

### Next.js App Router Setup

```typescript
// components/AnimatedHero.tsx
'use client'  // required — GSAP is browser-only

import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function AnimatedHero() {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.hero-title', { opacity: 0, y: 60, duration: 1 })
  }, { scope: container })

  return <div ref={container}>...</div>
}
```

---

## 2. Core Methods

### gsap.to()

Animates from the element's **current state** to the target values.

```typescript
gsap.to('.box', {
  x: 200,           // translateX (px)
  y: 100,           // translateY (px)
  xPercent: 50,     // translateX (%)
  yPercent: -50,    // translateY (%)
  rotation: 360,    // degrees
  scale: 1.5,
  scaleX: 2,
  scaleY: 0.5,
  opacity: 0,
  backgroundColor: '#ff0000',
  width: 300,       // avoid — triggers layout; prefer scale
  duration: 1,
  ease: 'power2.out',
  delay: 0.5,
  stagger: 0.1,     // when target matches multiple elements
})
```

### gsap.from()

Animates from the specified values **to the element's current state**.

```typescript
gsap.from('.card', {
  opacity: 0,
  y: 80,
  duration: 0.8,
  ease: 'back.out(1.7)',
  stagger: {
    amount: 0.6,      // total stagger time spread across all elements
    from: 'center',   // 'start' | 'end' | 'center' | 'edges' | 'random' | index
    grid: 'auto',     // for grid layouts
  }
})
```

### gsap.fromTo()

Explicitly controls both start and end values. Use when you need predictable behavior regardless of current state — especially in React where component re-renders may change state.

```typescript
gsap.fromTo(
  '.box',
  { opacity: 0, x: -100 },   // FROM
  { opacity: 1, x: 0, duration: 1, ease: 'power3.out' }  // TO
)
```

### gsap.set()

Instant property assignment — no animation, no duration.

```typescript
gsap.set('.box', { opacity: 0, x: -50 })
```

### gsap.killTweensOf()

Stop all active tweens on a target. Essential for cleanup outside `useGSAP`.

```typescript
gsap.killTweensOf('.box')
gsap.killTweensOf('.box', 'opacity,x')  // kill only specific properties
gsap.killTweensOf([el1, el2])
```

### Tween Control

```typescript
const tween = gsap.to('.box', { x: 200, duration: 2 })

tween.pause()
tween.resume()
tween.reverse()
tween.restart()
tween.seek(0.5)          // jump to 0.5 seconds
tween.progress(0.5)      // jump to 50% progress
tween.kill()
```

### Callbacks

```typescript
gsap.to('.box', {
  x: 200,
  duration: 1,
  onStart: () => console.log('started'),
  onUpdate: () => console.log('updating'),
  onComplete: () => console.log('done'),
  onReverseComplete: () => console.log('reversed'),
})
```

---

## 3. Timeline Orchestration

Timelines sequence animations with shared defaults and precise timing control.

### Basic Timeline

```typescript
const tl = gsap.timeline({
  defaults: { duration: 0.8, ease: 'power2.out' },
  onComplete: () => console.log('sequence done'),
  repeat: -1,      // -1 = infinite
  yoyo: true,      // reverse on repeat
  delay: 0.5,
})

tl.from('.logo', { opacity: 0, scale: 0.8 })
  .from('.headline', { opacity: 0, y: 40 })
  .from('.cta', { opacity: 0, y: 20, scale: 0.9 }, '-=0.3')
```

### Position Parameters

The third argument to `.to()`, `.from()`, `.fromTo()` on a timeline controls timing:

| Value | Meaning |
|-------|---------|
| `0` | Absolute — start at 0 seconds |
| `1.5` | Absolute — start at 1.5 seconds |
| `'+=0.5'` | 0.5s after end of previous animation |
| `'-=0.5'` | 0.5s before end of previous animation (overlap) |
| `'<'` | Start same time as previous animation |
| `'<0.3'` | 0.3s after previous animation started |
| `'<-0.2'` | 0.2s before previous animation started |
| `'myLabel'` | Start at label position |
| `'myLabel+=0.5'` | 0.5s after label |

### Labels

```typescript
const tl = gsap.timeline()

// Add label at specific time
tl.addLabel('textReveal', 1.2)

// Add label at current end of timeline
tl.addLabel('bounce')

// Reference in subsequent tweens
tl.from('.text', { opacity: 0, y: 30 }, 'textReveal')
tl.from('.cta', { scale: 0, ease: 'back.out(2)' }, 'bounce')
```

### Complex Sequence Example

```typescript
// Logo appears → text reveals → bg morphs → CTA bounces in
const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

tl.from('.logo', { opacity: 0, scale: 0.6, duration: 0.6 })
  .addLabel('textStart')
  .from('.headline span', {
    opacity: 0,
    y: 60,
    stagger: 0.05,
    duration: 0.7,
  }, 'textStart')
  .from('.subheadline', { opacity: 0, y: 30 }, 'textStart+=0.3')
  .to('.hero-bg', {
    backgroundColor: '#1a1a2e',
    duration: 1.2,
    ease: 'none',
  }, '<')
  .addLabel('ctaEntry', '-=0.2')
  .from('.cta-button', {
    opacity: 0,
    scale: 0,
    ease: 'back.out(1.7)',
    duration: 0.5,
  }, 'ctaEntry')
```

### Timeline Control

```typescript
tl.pause()
tl.resume()
tl.reverse()
tl.seek('textReveal')   // jump to label
tl.seek(2)              // jump to 2 seconds
tl.progress(0)          // reset to start
tl.kill()
```

---

## 4. ScrollTrigger

### Registration

```typescript
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
```

### Core Configuration

```typescript
gsap.to('.box', {
  x: 500,
  scrollTrigger: {
    trigger: '.box',          // Element that triggers activation
    start: 'top 80%',         // "[trigger] [viewport]" — trigger top hits 80% viewport
    end: 'bottom 20%',        // trigger bottom hits 20% viewport
    scrub: 1,                 // Link to scroll (number = smoothing seconds)
    pin: true,                // Pin trigger element during animation
    markers: true,            // Debug markers (dev only)
    toggleActions: 'play pause resume reset',
    // onEnter onLeave onEnterBack onLeaveBack
  }
})
```

### start / end Syntax

```
"top bottom"     — top of trigger hits bottom of viewport (default start)
"center center"  — midpoints align
"80%"            — 80% down the viewport (no trigger point specified)
"+=300"          — 300px past the natural start point
"top top+=100"   — trigger top hits 100px from top of viewport
"max"            — maximum scroll position
```

### scrub

```typescript
scrub: true      // Links directly — no lag
scrub: 0.5       // 0.5s catch-up
scrub: 2         // 2s catch-up (smooth/cinematic feel)
```

### pin

```typescript
pin: true                // Pins the trigger element itself
pin: '.hero-wrapper'     // Pins a different element
pinSpacing: false        // Don't push content below — elements overlap
```

### snap

```typescript
// Snap to every 10% of progress
snap: 0.1

// Snap to specific progress values
snap: [0, 0.25, 0.5, 0.75, 1]

// Snap to timeline labels (use with scrub)
snap: 'labels'

// Full control
snap: {
  snapTo: [0, 0.5, 1],
  duration: { min: 0.2, max: 0.5 },
  delay: 0.1,
  ease: 'power1.inOut',
  directional: true,
}
```

### toggleActions

Four values for: onEnter / onLeave / onEnterBack / onLeaveBack

Available actions: `play` `pause` `resume` `reset` `restart` `complete` `reverse` `none`

```typescript
toggleActions: 'play none none reverse'   // play on enter, reverse on scroll back
toggleActions: 'restart none none reset'  // restart every time
```

### Callbacks

```typescript
ScrollTrigger.create({
  trigger: '.section',
  start: 'top center',
  end: 'bottom center',
  onEnter: (st) => console.log('entered, progress:', st.progress),
  onLeave: (st) => console.log('left'),
  onEnterBack: (st) => console.log('entered back'),
  onLeaveBack: (st) => console.log('left back'),
  onUpdate: (st) => console.log('progress:', st.progress, 'velocity:', st.getVelocity()),
  onToggle: (st) => console.log('active:', st.isActive),
})
```

### Parallax Hero

```typescript
gsap.to('.hero-bg', {
  yPercent: -30,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  }
})
```

### Pinned Section with Animated Content

```typescript
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.pinned-section',
    start: 'top top',
    end: '+=300%',    // scroll distance while pinned
    scrub: 1,
    pin: true,
    snap: { snapTo: 'labels', duration: 0.5 },
  }
})

tl.addLabel('step1')
  .from('.step-1', { opacity: 0, y: 40 })
  .addLabel('step2')
  .from('.step-2', { opacity: 0, y: 40 })
  .addLabel('step3')
  .from('.step-3', { opacity: 0, y: 40 })
```

### Horizontal Scroll Gallery

```typescript
const sections = gsap.utils.toArray<HTMLElement>('.panel')

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.gallery-container',
    pin: true,
    scrub: 1,
    end: () => `+=${document.querySelector('.gallery-container')!.scrollWidth}`,
    snap: 1 / (sections.length - 1),
  }
})
```

### ScrollTrigger.batch()

Coordinates multiple elements firing in batches as they enter the viewport.

```typescript
ScrollTrigger.batch('.card', {
  onEnter: (elements) => {
    gsap.from(elements, {
      opacity: 0,
      y: 60,
      stagger: 0.1,
      duration: 0.8,
    })
  },
  start: 'top 90%',
  end: 'top 60%',
})
```

### React Cleanup for ScrollTrigger

```typescript
useGSAP(() => {
  // ScrollTrigger instances created here are automatically
  // reverted when the component unmounts
  ScrollTrigger.create({
    trigger: '.section',
    start: 'top center',
    onEnter: () => gsap.to('.box', { x: 200 }),
  })
}, { scope: container })
```

---

## 5. SplitText Plugin

SplitText was completely rewritten in GSAP 3.13 — it is 50% smaller, fully accessible, and has new features. Use the **new API** shown below.

### Registration

```typescript
import { SplitText } from 'gsap/SplitText'
gsap.registerPlugin(SplitText)
```

### Basic Usage

```typescript
// Old API (pre-3.13): new SplitText() — still works but deprecated pattern
// New API (3.13+): SplitText.create()

const split = SplitText.create('.hero-text', {
  type: 'words, chars',  // 'chars' | 'words' | 'lines' or combinations
})

// split.chars  — array of char elements
// split.words  — array of word elements
// split.lines  — array of line elements

gsap.from(split.chars, {
  opacity: 0,
  y: 40,
  stagger: 0.03,
  duration: 0.6,
  ease: 'back.out(1.5)',
})
```

### autoSplit + onSplit (Required Pattern for Responsive)

```typescript
// onSplit is the correct place to create animations
// It re-runs on every re-split (resize, font load)
SplitText.create('.headline', {
  type: 'lines, words',
  autoSplit: true,   // re-splits on container resize and font load
  onSplit(self) {
    // Return the animation so SplitText can manage cleanup on re-split
    return gsap.from(self.lines, {
      opacity: 0,
      y: 60,
      stagger: 0.08,
      duration: 0.9,
      ease: 'power3.out',
    })
  }
})
```

### Masking / Clip Reveal

```typescript
SplitText.create('.reveal-text', {
  type: 'lines',
  mask: 'lines',     // wraps each line in a clipping container
  onSplit(self) {
    return gsap.from(self.lines, {
      yPercent: 100,   // slides up from inside the mask
      stagger: 0.1,
      duration: 0.8,
      ease: 'power2.out',
    })
  }
})
```

### Accessibility

```typescript
SplitText.create('.text', {
  type: 'chars',
  aria: 'auto',    // adds aria-label to parent, aria-hidden to chars (default)
  // aria: 'hidden'  — hides everything from screen readers
  // aria: 'none'    — no ARIA attributes applied
})
```

### deepSlice — Nested Elements

Handles `<span>`, `<strong>`, `<a>` that span multiple lines.

```typescript
SplitText.create('.rich-text p', {
  type: 'lines',
  deepSlice: true,   // correctly handles inline elements crossing line breaks
})
```

### Revert

```typescript
const split = SplitText.create('.text', { type: 'chars' })

// Later — restore original HTML
split.revert()
```

### ScrollTrigger Integration

```typescript
useGSAP(() => {
  SplitText.create('.section-title', {
    type: 'words',
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.words, {
        opacity: 0,
        y: 40,
        stagger: 0.05,
        duration: 0.7,
        scrollTrigger: {
          trigger: self.words[0].closest('.section-title'),
          start: 'top 85%',
        }
      })
    }
  })
}, { scope: container })
```

### 3.14 Change: Overwrite Behavior

As of 3.14, `SplitText.create()` checks if targets were already split by another instance and reverts them first to prevent duplicate splitting. To allow duplicates: `overwrite: false`.

```typescript
SplitText.create('.text', { type: 'chars', overwrite: false })
```

---

## 6. Flip Plugin

Flip enables seamless animations between two DOM states — even with structural/layout changes that would normally cause instant jumps.

### Registration

```typescript
import { Flip } from 'gsap/Flip'
gsap.registerPlugin(Flip)
```

### Core Workflow

```
1. Capture state before DOM change   → Flip.getState(targets)
2. Make DOM/CSS changes              → classList, style, reparent, etc.
3. Animate from old state to new     → Flip.from(state, options)
```

```typescript
const state = Flip.getState('.card')

// Make DOM changes
element.classList.toggle('expanded')

// Animate from the old state to the new one
Flip.from(state, {
  duration: 0.5,
  ease: 'power2.inOut',
  nested: true,       // compensate for nested element transforms
  absolute: true,     // use position:absolute during animation (prevents layout shifts)
})
```

### Flip.getState()

```typescript
// Single element
const state = Flip.getState(element)

// Selector
const state = Flip.getState('.grid-item')

// Multiple elements
const state = Flip.getState([el1, el2, el3])

// Capture specific properties beyond transforms
const state = Flip.getState('.items', { props: 'color,backgroundColor' })
```

### Flip.from() Options

```typescript
Flip.from(state, {
  duration: 0.6,
  ease: 'power2.inOut',
  stagger: 0.05,         // stagger multiple elements
  nested: true,          // handle nested transforms correctly
  absolute: true,        // position:absolute during animation
  scale: true,           // use scaleX/scaleY instead of width/height
  toggleClass: 'flipping',   // CSS class applied during animation
  spin: true,            // add rotation flourish
  onComplete: () => {},
  onEnter: (elements) => {   // elements that weren't in old state (new DOM elements)
    return gsap.from(elements, { opacity: 0, scale: 0 })
  },
  onLeave: (elements) => {   // elements that were removed from DOM
    return gsap.to(elements, { opacity: 0, scale: 0 })
  },
})
```

### Flip.to()

Animate TO a new state while the element stays in its current position.

```typescript
const state = Flip.getState('.card')
element.classList.add('selected')
Flip.to(state, { duration: 0.5 })
```

### Flip.fit()

Resize/reposition one element to match another's bounds.

```typescript
Flip.fit('.thumbnail', '.featured-slot', {
  duration: 0.5,
  ease: 'power2.inOut',
  scale: true,
})
```

### React Integration

React's rendering cycle means DOM mutations happen asynchronously. Capture state before the render, then call `Flip.from()` after.

```typescript
const { contextSafe } = useGSAP({ scope: container })

const handleSelect = contextSafe((id: string) => {
  const state = Flip.getState('.card')

  setSelectedId(id)  // React state update triggers re-render

  // Wait for DOM update
  requestAnimationFrame(() => {
    Flip.from(state, { duration: 0.4, ease: 'power2.inOut', nested: true })
  })
})
```

### data-flip-id for Cross-Element Transitions

Flip can crossfade between different DOM elements using matching `data-flip-id` attributes.

```typescript
// HTML: <div class="thumb" data-flip-id="photo-1">
//       <div class="featured" data-flip-id="photo-1">

const state = Flip.getState('[data-flip-id]')
// Make DOM changes
Flip.from(state, { duration: 0.6, ease: 'power2.inOut' })
```

---

## 7. React / Next.js Integration

### useGSAP Hook

```typescript
import { useGSAP } from '@gsap/react'

// Must register the hook as a plugin
gsap.registerPlugin(useGSAP)
```

### Signature

```typescript
useGSAP(
  callback: () => void | (() => void),
  config?: {
    scope?: React.RefObject<Element>  // scopes selector queries
    dependencies?: any[]              // re-runs when these change (like useEffect)
    revertOnUpdate?: boolean          // revert animations on dependency change (default: false)
  }
)
```

### Basic Pattern

```typescript
'use client'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export function Hero() {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Selector '.box' is scoped to container.current descendants
    gsap.to('.box', { x: 200, duration: 1 })
  }, { scope: container })

  return (
    <div ref={container}>
      <div className="box" />
    </div>
  )
}
```

### With Dependencies

```typescript
const [active, setActive] = useState(false)

useGSAP(() => {
  gsap.to('.panel', { opacity: active ? 1 : 0, duration: 0.3 })
}, { dependencies: [active], revertOnUpdate: true })
```

### contextSafe — Interaction Handlers

Any GSAP animation created AFTER the hook runs (click handlers, setTimeout, Promise callbacks) must be wrapped in `contextSafe` to be included in the cleanup context.

```typescript
const { contextSafe } = useGSAP({ scope: container })

const handleClick = contextSafe(() => {
  gsap.to('.box', { rotation: '+=180', duration: 0.4 })
})

const handleHover = contextSafe(() => {
  gsap.to('.card', { scale: 1.05, duration: 0.2 })
})

return (
  <div ref={container}>
    <button onClick={handleClick}>Animate</button>
    <div className="card" onMouseEnter={handleHover} />
  </div>
)
```

### React 18 Strict Mode

In development, Strict Mode double-invokes effects. Without proper cleanup:

- `gsap.from()` tweens fire twice — element jumps and snaps
- ScrollTriggers duplicate
- Timelines stack

`useGSAP` handles this automatically. If you must use `useEffect` with GSAP (avoid this), use `gsap.context()`:

```typescript
// Only if you can't use useGSAP for some reason
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.to('.box', { x: 200 })
  }, container)

  return () => ctx.revert()
}, [])
```

### gsap.context() — Manual Context

`gsap.context()` records all GSAP objects created within the callback. Calling `.revert()` undoes all of them.

```typescript
const ctx = gsap.context((self) => {
  // self.selector('.box') — scoped selector
  gsap.to('.box', { x: 200 })
  ScrollTrigger.create({ trigger: '.section', ... })
}, containerElement)

// Cleanup:
ctx.revert()    // undoes all tweens, ScrollTriggers, SplitText, etc.

// Add more animations to an existing context:
ctx.add(() => {
  gsap.to('.new-element', { opacity: 1 })
})

// Context-safe wrapper for deferred code:
const animateOnClick = ctx.add(() => {
  gsap.to('.box', { rotation: 180 })
})
```

### SSR / Next.js Gotchas

```typescript
// useGSAP already handles SSR via useIsomorphicLayoutEffect
// No window checks needed when using useGSAP

// If you import GSAP outside components (e.g., in a utility file),
// and it references browser APIs, guard with:
if (typeof window !== 'undefined') {
  ScrollTrigger.refresh()
}

// For dynamic imports in Next.js (if needed for code splitting):
const { gsap } = await import('gsap')
```

### Plugin Registration — App-Wide

For Next.js projects, register once in a layout or provider:

```typescript
// app/providers.tsx
'use client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip)

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

---

## 8. Easing

### Built-in Easings

```
power1, power2, power3, power4   — polynomial curves
back                             — overshoots
bounce                           — bounces at end
elastic                          — elastic spring
circ, expo, sine                 — math-based curves
none / linear                    — constant speed
steps(n)                         — stepped (n steps)
```

Each has `.in`, `.out`, `.inOut` variants:

```typescript
ease: 'power2.out'       // decelerates (most common)
ease: 'power2.in'        // accelerates
ease: 'power2.inOut'     // accelerates then decelerates
ease: 'back.out(1.7)'    // overshoot amount as param
ease: 'elastic.out(1, 0.3)'  // amplitude, period
ease: 'bounce.out'
ease: 'steps(5)'         // 5-step staircase
ease: 'none'             // linear
```

### CustomEase

```typescript
import { CustomEase } from 'gsap/CustomEase'
gsap.registerPlugin(CustomEase)

CustomEase.create('myEase', 'M0,0 C0.14,0 0.242,0.438 0.272,0.561 0.313,0.728 0.354,0.963 0.362,1')

gsap.to('.box', { x: 200, ease: 'myEase' })
```

### RoughEase

Creates organic, jittery motion (e.g., a shaking effect):

```typescript
import { RoughEase } from 'gsap/EasePack'
gsap.registerPlugin(RoughEase)

gsap.to('.box', {
  x: 200,
  ease: RoughEase.ease.config({
    template: 'power1.inOut',
    strength: 1,
    points: 20,
    taper: 'none',
    randomize: true,
    clamp: false,
  })
})
```

### SlowMo

Ease that slows in the middle — good for highlight moments:

```typescript
import { SlowMo } from 'gsap/EasePack'
gsap.registerPlugin(SlowMo)

gsap.to('.text', {
  opacity: 1,
  ease: SlowMo.ease.config(0.7, 0.7, false)
  // linearRatio, power, yoyoMode
})
```

---

## 9. Performance

### Use Transforms, Not Layout Properties

```typescript
// Bad — triggers layout recalculation
gsap.to('.box', { width: 300, height: 200, top: 100, left: 50 })

// Good — GPU-accelerated transforms
gsap.to('.box', { x: 50, y: 100, scaleX: 1.5, scaleY: 1.2 })
```

### will-change

Apply `will-change: transform` to elements that animate. Remove after animation completes:

```typescript
gsap.to('.hero', {
  x: 200,
  onStart() {
    this.targets()[0].style.willChange = 'transform'
  },
  onComplete() {
    this.targets()[0].style.willChange = 'auto'
  }
})
```

Or via CSS for elements that always animate:

```css
.animated-element {
  will-change: transform, opacity;
}
```

### SplitText Performance

Only split what you animate:

```typescript
// Bad — splitting chars when only lines animate
SplitText.create('.text', { type: 'lines, words, chars' })

// Good — match split type to animation type
SplitText.create('.text', { type: 'lines' })
```

### ScrollTrigger.batch vs Individual

Use `ScrollTrigger.batch()` instead of individual ScrollTriggers per element when many elements enter the viewport:

```typescript
// Bad — 50 ScrollTrigger instances
document.querySelectorAll('.card').forEach(card => {
  ScrollTrigger.create({ trigger: card, ... })
})

// Good — one batch
ScrollTrigger.batch('.card', { onEnter: elements => gsap.from(elements, ...) })
```

### Force Reflow Before Animating

For `gsap.from()` in React, use `gsap.set()` first if initial state must be guaranteed:

```typescript
useGSAP(() => {
  gsap.set('.card', { opacity: 0, y: 60 })
  gsap.to('.card', { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 })
}, { scope: container })
```

### ScrollTrigger.refresh()

Call after dynamic content loads or layout changes:

```typescript
ScrollTrigger.refresh()

// In Next.js after route change:
useEffect(() => {
  ScrollTrigger.refresh()
}, [pathname])
```

### Lazy / Deferred Loading

Register plugins only in the browser:

```typescript
'use client'
import dynamic from 'next/dynamic'

// Heavy animation component — code split
const AnimatedSection = dynamic(() => import('./AnimatedSection'), { ssr: false })
```

---

## 10. Licensing

**As of GSAP 3.13 (2025), all GSAP tools and plugins are free, including commercial use.**

Webflow sponsors GSAP and made the entire platform freely available. There is no longer a Club GreenSock membership tier.

### What's Free

Everything in the `gsap` npm package:

| Category | Plugins |
|----------|---------|
| Core | `gsap`, Draggable, Observer, Inertia |
| Scroll | ScrollTrigger, ScrollSmoother, ScrollTo |
| Text | SplitText, ScrambleText |
| SVG | DrawSVG, MorphSVG, MotionPath, MotionPathHelper |
| Layout | Flip |
| Physics | Physics2D, PhysicsProps, CustomBounce, CustomWiggle |
| Dev Tools | GSDevTools |

### Installation

All plugins are in the standard `gsap` package:

```bash
npm install gsap
```

Import paths:

```typescript
import { SplitText } from 'gsap/SplitText'         // formerly Club GSAP only
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin' // formerly Club GSAP only
import { ScrollSmoother } from 'gsap/ScrollSmoother' // formerly Club GSAP only
```

No authentication, no token, no member-only npm registry — just install and import.

---

## 11. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `useEffect` instead of `useGSAP` | Always use `useGSAP` from `@gsap/react` — handles cleanup, strict mode, SSR |
| Missing `'use client'` | Every file importing GSAP in Next.js App Router needs `'use client'` |
| Plugin not registered | Call `gsap.registerPlugin(...)` at module level before any usage |
| Selector not scoped | Pass `{ scope: containerRef }` to `useGSAP` — without it, `.box` matches any `.box` on the page |
| Click handler outside contextSafe | Wrap deferred animations in `contextSafe()` returned from `useGSAP` |
| `Flip.from()` called before DOM update | Capture `Flip.getState()`, mutate DOM, then call `Flip.from()` — never before |
| `Flip.from()` in React without `requestAnimationFrame` | React state updates are async — wrap `Flip.from()` in `requestAnimationFrame(() => ...)` |
| SplitText animation outside `onSplit` | Create animations inside `onSplit()` callback — they'll target fresh elements on resize |
| Using `new SplitText()` syntax | Use `SplitText.create()` (3.13+ API) |
| Animating `width`/`height`/`top`/`left` | Use `scaleX`/`scaleY`/`x`/`y` — transforms are GPU-accelerated |
| `ScrollTrigger.refresh()` not called after layout change | Call after dynamic content renders or route changes |
| Creating a new ScrollTrigger on every render | Move creation inside `useGSAP` which handles cleanup, not inside event handlers |
| `gsap.from()` double-fires in strict mode | This is fixed by `useGSAP` — if using `useEffect`, use `gsap.context()` with cleanup |
| Missing `ease: 'none'` on scrub animations | Scrub overrides easing but on non-scrubbed segments, ease matters — use `'none'` on scrub timelines |
| Pinning without accounting for `pinSpacing` | By default, GSAP adds spacing below pinned elements — use `pinSpacing: false` carefully |

---

## 12. Recent Changes

### GSAP 3.14.x (Latest)

- **SplitText auto-revert on duplicate targets**: When creating a new `SplitText.create()` instance on targets already split by another instance, GSAP now automatically reverts the original split first. Opt out with `overwrite: false`.
- Bug fixes for ScrollTrigger firing timing (regression introduced in 3.13, fixed in 3.14).

### GSAP 3.13 (Major — 2025)

**All plugins now free.** Webflow acquired/sponsored GSAP and released the full platform at no cost.

**SplitText full rewrite:**
- New API: `SplitText.create()` (replaces `new SplitText()`)
- `autoSplit` — automatically re-splits on container resize and font load
- `onSplit()` callback — create animations here so re-splits get fresh elements
- `deepSlice` — correctly handles nested inline elements (`<span>`, `<a>`) across line breaks
- `mask` — built-in clip/reveal masking wrapper
- `aria` — built-in accessibility with `aria-label`/`aria-hidden`
- 50% smaller file size
- Standalone operation (no core GSAP required for splitting only)

**Breaking changes in 3.13:**
- Removed `position: 'absolute'` config option from SplitText
- Class name incrementing resets per element (was global)
- Removed `lineThreshold` setting
- Removed function-based `specialChars` (array still supported)

**New core feature:**
- Animate to CSS variable values: `gsap.to('.el', { color: 'var(--my-color)' })`

### Pre-3.13 Migration Notes

If upgrading from pre-3.13 with Club GreenSock plugins loaded from a members-only npm registry:

1. Remove `@greensock/` scoped package references
2. Install standard `gsap` package
3. Update import paths from `gsap/dist/SplitText` to `gsap/SplitText`
4. Update `new SplitText()` to `SplitText.create()`
5. Move animations from post-construction code to `onSplit()` callback
