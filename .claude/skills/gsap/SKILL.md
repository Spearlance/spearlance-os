---
model: claude-sonnet-4-6
name: gsap
description: Use when working with GSAP for timeline-based animations, ScrollTrigger scroll effects, text splitting animations, or layout transitions with Flip plugin. Also use when integrating GSAP with React or Next.js using useGSAP hook.
---

# GSAP

## Overview

GreenSock Animation Platform (GSAP) v3.14.x — JavaScript animation library for high-performance web animations. As of GSAP 3.13 (2025), **all plugins are free** including formerly paid plugins (SplitText, MorphSVG, ScrollSmoother, etc.), thanks to Webflow's sponsorship.

## Quick Reference

| Item | Value |
|------|-------|
| Current Version | `3.14.x` (latest on npm) |
| Install | `npm install gsap @gsap/react` |
| CDN | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.14.2/gsap.min.js` |
| Docs | `https://gsap.com/docs/v3/` |
| License | Free, including commercial use |
| React Hook | `@gsap/react` — `useGSAP()` |

## Setup

```typescript
// Next.js App Router — must be a Client Component
'use client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip)
```

## Core Tween Methods

```typescript
gsap.to('.box', { x: 200, duration: 1 })          // current → target
gsap.from('.box', { opacity: 0, y: 50 })           // start values → current
gsap.fromTo('.box', { x: -100 }, { x: 100 })       // explicit start + end
gsap.set('.box', { opacity: 0 })                    // instant (no animation)
```

## React Pattern (useGSAP)

```typescript
const container = useRef<HTMLDivElement>(null)

useGSAP(() => {
  gsap.to('.box', { x: 200, duration: 1 })
}, { scope: container })  // selector queries scoped to container

// For interaction handlers:
const { contextSafe } = useGSAP({ scope: container })
const handleClick = contextSafe(() => {
  gsap.to('.box', { rotation: 180 })
})
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `useEffect` for GSAP in React | Use `useGSAP` from `@gsap/react` |
| Forgetting `'use client'` in Next.js | Required for any component using GSAP |
| Not registering plugins | `gsap.registerPlugin(ScrollTrigger)` at module level |
| Mutating DOM before `Flip.from()` | Record state first, mutate second, then call `Flip.from()` |
| Creating SplitText outside `onSplit` | Use `onSplit()` callback so re-splits get fresh elements |
| Animating width/height instead of transforms | Use `scaleX`/`scaleY` or `xPercent`/`yPercent` |

## Full Reference

See `reference.md` for:
- Timeline orchestration (labels, position parameters)
- ScrollTrigger (trigger, start, end, scrub, pin, snap, batch, callbacks)
- SplitText (autoSplit, onSplit, deepSlice, masking, aria)
- Flip plugin (getState, from, to, fit, nested, absolute)
- Easing (built-in, CustomEase, RoughEase, SlowMo)
- Performance optimization
- Licensing details
- Recent changes (3.13 / 3.14)
