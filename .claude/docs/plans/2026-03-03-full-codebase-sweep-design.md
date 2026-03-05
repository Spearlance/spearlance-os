# Full Codebase Sweep — Design

**Goal:** Fix all bugs, complete dead-end features, clean up architecture, and polish UX across the entire SpearlanceOS codebase.

**Approach:** Serial priority sweep — P0 → P1 → P2 → P3. Each phase = one branch → one PR → squash merge.

## Phase 1 — P0 Bugs

### 1.1 Fix `.single()` → `.maybeSingle()` (87 calls)
- Every `.single()` call throws a PostgREST error if no row exists
- Replace with `.maybeSingle()` where the query might return 0 rows
- Keep `.single()` only where row is guaranteed (e.g., after insert, by primary key with known existence)

### 1.2 Consolidate dual toast system
- 110 files use `useToast` (radix-ui/react-toast)
- 38 files use `toast` from `sonner`
- Migrate all to `sonner` — it's simpler API, already in use, acknowledged TODO
- Remove `@radix-ui/react-toast`, `use-toast.ts`, `toaster.tsx`

### 1.3 Fix hardcoded 2025 dates
- `SocialMedia.tsx:168` and `BlogWriterMain.tsx:179` use `new Date(2025, month - 1)` for month names
- Replace with year-agnostic: `new Date(0, month - 1).toLocaleString('default', { month: 'long' })`

### 1.4 Convert Dashboard to useQuery
- Currently uses `useEffect` + `setState` with 6 sequential Supabase queries (waterfall)
- Convert to parallel `useQuery` hooks — enables caching, deduplication, loading states

## Phase 2 — P1 Dead-End Features

### 2.1 Wire up Blog "Write Single Post"
- Button currently shows `toast.info("Manual post creation coming soon")`
- `BlogCreationWizard.tsx` and `BlogArticleWizard.tsx` already exist
- Connect the button to open the creation wizard

### 2.2 Clean up Social Media scheduling UX
- Remove dead toast stubs in grid/weekly calendar views
- Late.com OAuth + scheduling edge functions exist — improve connection flow visibility
- Add clear status indicators for connected vs disconnected accounts

### 2.3 SEO Local Landing Pages
- Currently a fully stubbed "Coming Soon" tab
- Either remove the tab entirely (YAGNI) or add a waitlist/interest form
- Recommendation: Keep as disabled tab with badge — it sets user expectations

## Phase 3 — P2 Architecture

### 3.1 Convert useEffect data fetching → useQuery
- 35 pages use `useEffect` for data loading instead of `useQuery`
- Priority targets: pages with multiple sequential queries (Dashboard already done in 1.4)
- Focus on `Leads.tsx`, `SEO.tsx`, `SocialMedia.tsx` role check pattern

### 3.2 Fix Stripe product ID TODOs
- 3 edge functions have `TODO: Replace with actual product ID` comments
- Move to environment variables: `STRIPE_UNLIMITED_PRODUCT_ID`, `STRIPE_STARTER_PRICE_ID`
- Update `.env.example`

### 3.3 Continue god component decomposition
- MarketingProfile: 906 LOC (down from 2086, partially decomposed)
- TaskDrawer: 886 LOC (partially decomposed)
- PostManagementDrawer: 776 LOC (partially decomposed)
- Further extract sub-components along remaining tab boundaries

## Phase 4 — P3 Polish

### 4.1 Fix PostScheduler JSX indentation
### 4.2 Move SocialMedia role check to route-level guard
### 4.3 Standardize loading states (pick Skeleton or spinner, not both)

## Tech Context
- React 18 + Vite 5 + TypeScript
- Supabase (auth, DB, storage, edge functions)
- TanStack Query 5
- shadcn/ui + Tailwind CSS 3
- sonner (target toast library)
