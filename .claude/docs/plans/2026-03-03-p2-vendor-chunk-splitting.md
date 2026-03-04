# P2 Vendor Chunk Splitting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Break the 5.9MB shared vendor chunk into logical sub-chunks so browsers can cache stable libraries independently and load only what each route needs.

**Architecture:** Add `manualChunks` to `vite.config.ts` `build.rollupOptions.output` to split vendor code into: react (react + react-dom + scheduler), supabase (@supabase/*), ui (radix + lucide + class-variance-authority), charts (recharts + d3), calcom (@calcom/*), editor (react-quill), and a catch-all vendor chunk for everything else. Also move `bcryptjs` from `dependencies` to a comment/removal since it's only used in Supabase Edge Functions (not imported in src/).

**Tech Stack:** Vite 5, Rollup manualChunks

---

## Task 1: Add manualChunks vendor splitting to vite.config.ts

**Files:**
- Modify: `vite.config.ts`

**Step 1: Write a build verification baseline**

Run: `npx vite build 2>&1 | grep "index-" | head -3`
Expected: Single large `index-*.js` chunk ~5,961 kB

**Step 2: Add manualChunks config to vite.config.ts**

Add `build.rollupOptions.output.manualChunks` to the existing config:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      process: "process/browser",
    },
  },
  define: {
    "process.env": "{}",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core — changes rarely
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) {
            return "vendor-react";
          }

          // Supabase client — large, stable
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          // UI primitives — Radix + icons + CVA
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("class-variance-authority")) {
            return "vendor-ui";
          }

          // Charts — only needed on Analytics/Reports pages
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }

          // Cal.com — only needed on Meetings pages
          if (id.includes("@calcom")) {
            return "vendor-calcom";
          }

          // Rich text editor — only needed on blog/support-docs pages
          if (id.includes("react-quill") || id.includes("quill")) {
            return "vendor-editor";
          }
        },
      },
    },
  },
});
```

**Step 3: Run build and verify chunks are split**

Run: `npx vite build 2>&1 | grep -E "vendor-|index-" | sort -t'|' -k1`
Expected: Multiple vendor chunks instead of one 5.9MB blob:
- `vendor-react-*.js` (~130kB)
- `vendor-supabase-*.js` (~200kB)
- `vendor-ui-*.js` (~200kB)
- `vendor-charts-*.js` (~300kB)
- `vendor-calcom-*.js` (~variable)
- `vendor-editor-*.js` (~60kB)
- `index-*.js` (remaining — significantly smaller)

**Step 4: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests PASS (manualChunks is build-only config, doesn't affect runtime)

**Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "perf: split vendor bundle into logical chunks via manualChunks"
```

---

## Task 2: Move bcryptjs to Supabase Edge Functions scope

**Files:**
- Modify: `package.json` (remove bcryptjs from dependencies)
- Verify: `supabase/functions/set-asset-share-password/index.ts` and `supabase/functions/public-assets-auth/index.ts` (these use bcryptjs but run server-side on Deno, not via npm)

**Step 1: Verify bcryptjs is not imported anywhere in src/**

Run: `grep -r "bcrypt" src/`
Expected: No matches (already confirmed — bcryptjs is only in supabase/functions/)

**Step 2: Check how Supabase Edge Functions import bcryptjs**

Read the two files that use it:
- `supabase/functions/set-asset-share-password/index.ts`
- `supabase/functions/public-assets-auth/index.ts`

Supabase Edge Functions run on Deno and import via URL (e.g., `import { hash } from "https://deno.land/x/bcrypt/mod.ts"`) or from a local import map — they do NOT use the npm package.json `bcryptjs` package. Confirm this by reading the imports.

**Step 3: Remove bcryptjs from package.json dependencies**

Remove the line `"bcryptjs": "^3.0.3"` from the `dependencies` object in `package.json`.

**Step 4: Run `npm install` to update lockfile**

Run: `npm install`
Expected: lockfile updates, no errors

**Step 5: Run tests + build to verify nothing breaks**

Run: `npx vitest run && npx vite build 2>&1 | tail -3`
Expected: PASS, build succeeds

**Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused bcryptjs from client dependencies"
```

---

## Task 3: Final verification

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Compare chunk sizes**

Run: `npx vite build 2>&1 | grep -E "kB" | grep -E "vendor|index" | sort`
Expected: No single chunk > 500kB warning, or significantly reduced

**Step 3: Verify the app starts**

Run: `npx vite preview` (manual check — loads in browser)

---

## Summary

| Task | Type | Files | Risk |
|------|------|-------|------|
| 1. manualChunks splitting | Config | 1 (vite.config.ts) | Low — build-only change |
| 2. Remove bcryptjs | Dependency cleanup | 2 (package.json, lockfile) | Low — unused in client |
| 3. Final verification | Verification | 0 | None |

**Expected outcome:** Vendor bundle drops from ~5.9MB single chunk to 5-6 smaller cached chunks. Browsers cache stable vendor code independently — React updates don't invalidate Supabase cache, charts don't invalidate UI cache.
