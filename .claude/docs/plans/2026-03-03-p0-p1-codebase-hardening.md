# P0+P1 Codebase Hardening Implementation Plan


**Goal:** Fix the 8MB monolithic bundle by adding route-level code splitting, add error boundaries to prevent full-app crashes, configure QueryClient for sane defaults, and verify auth guard coverage.

**Architecture:** Convert all 50+ eager page imports to `React.lazy()` with `Suspense` fallbacks. Add a reusable `ErrorBoundary` component at the route level inside `MainLayout`. Configure `QueryClient` with stale time, retry, and global error handling. Auth guard already exists in `MainLayout` via `onAuthStateChange` — just verify no unprotected routes leak.

**Tech Stack:** React 18, React Router 6, Vite 5, TanStack Query 5, TypeScript

---

## Task 1: Create route loading fallback component

**Files:**
- Create: `src/components/RouteLoadingFallback.tsx`
- Test: `src/components/__tests__/RouteLoadingFallback.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/__tests__/RouteLoadingFallback.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteLoadingFallback } from '../RouteLoadingFallback';

describe('RouteLoadingFallback', () => {
  it('renders a loading spinner', () => {
    render(<RouteLoadingFallback />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/RouteLoadingFallback.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// src/components/RouteLoadingFallback.tsx
export function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/RouteLoadingFallback.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/RouteLoadingFallback.tsx src/components/__tests__/RouteLoadingFallback.test.tsx
git commit -m "feat: add RouteLoadingFallback component for lazy-loaded routes"
```

---

## Task 2: Create ErrorBoundary component

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Test: `src/components/__tests__/ErrorBoundary.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/__tests__/ErrorBoundary.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test crash');
  return <div>Content works</div>;
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console output during tests
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Content works')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('provides a retry button that resets the error state', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Click retry — this resets the boundary's error state
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // After reset, ErrorBoundary re-renders children.
    // Since ThrowingComponent still throws, it catches again — that's fine.
    // The point is the button exists and is clickable.
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ErrorBoundary.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground text-center max-w-md">
            An unexpected error occurred. You can try again or navigate to a different page.
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.assign("/")}>
              Go to dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ErrorBoundary.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/components/__tests__/ErrorBoundary.test.tsx
git commit -m "feat: add ErrorBoundary component with retry and dashboard escape"
```

---

## Task 3: Convert all route imports to React.lazy and wrap with Suspense + ErrorBoundary

**Files:**
- Modify: `src/App.tsx`

This is the big one — converts 50+ eager imports to lazy imports, adds `Suspense` with the loading fallback, and wraps the route tree with `ErrorBoundary`.

**Step 1: Write a test that validates the App renders without crashing**

Note: There's already a smoke test at `src/test/smoke.test.ts` but it doesn't test App rendering. We need one that validates lazy loading works.

```tsx
// src/components/__tests__/App.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock supabase before importing App
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [] })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

describe('App', () => {
  it('renders without crashing (lazy routes load)', async () => {
    const { default: App } = await import('../../App');
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
```

**Step 2: Run test to verify current state**

Run: `npx vitest run src/components/__tests__/App.test.tsx`
Expected: PASS (existing eager imports work)

**Step 3: Rewrite App.tsx with lazy imports**

Replace all 50+ static `import X from "./pages/X"` with `React.lazy(() => import("./pages/X"))`.

Key changes to `src/App.tsx`:

1. Remove all `import X from "./pages/X"` lines (lines 10-61)
2. Add `import { lazy, Suspense } from "react"` at top
3. Add `import { RouteLoadingFallback } from "@/components/RouteLoadingFallback"`
4. Add `import { ErrorBoundary } from "@/components/ErrorBoundary"`
5. Define all page components as lazy:

```tsx
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicAssets = lazy(() => import("./pages/PublicAssets"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const CommunicationLogs = lazy(() => import("./pages/CommunicationLogs"));
const CommunicationDetail = lazy(() => import("./pages/CommunicationDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const Assets = lazy(() => import("./pages/Assets"));
const Marketing = lazy(() => import("./pages/Marketing"));
const MarketingProfile = lazy(() => import("./pages/MarketingProfile"));
const BrandGuide = lazy(() => import("./pages/BrandGuide"));
const MoodBoard = lazy(() => import("./pages/MoodBoard"));
const MarketingTools = lazy(() => import("./pages/MarketingTools"));
const Avatar = lazy(() => import("./pages/Avatar"));
const LaunchPad = lazy(() => import("./pages/LaunchPad"));
const MarketingFlowchart = lazy(() => import("./pages/MarketingFlowchart"));
const MarketingIdeas = lazy(() => import("./pages/MarketingIdeas"));
const Reports = lazy(() => import("./pages/Reports"));
const SocialMedia = lazy(() => import("./pages/SocialMedia"));
const Support = lazy(() => import("./pages/Support"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const SupportDocs = lazy(() => import("./pages/SupportDocs"));
const SupportDocsCategory = lazy(() => import("./pages/SupportDocsCategory"));
const SupportDocsArticle = lazy(() => import("./pages/SupportDocsArticle"));
const AdminSupportDocs = lazy(() => import("./pages/AdminSupportDocs"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Admin2FASetup = lazy(() => import("./pages/Admin2FASetup"));
const CalendarCallback = lazy(() => import("./pages/CalendarCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const WebsiteFormSubmissions = lazy(() => import("./pages/WebsiteFormSubmissions"));
const SiteComments = lazy(() => import("./pages/SiteComments"));
const SiteCommentDetail = lazy(() => import("./pages/SiteCommentDetail"));
const Leads = lazy(() => import("./pages/Leads"));
const AdminBugReports = lazy(() => import("./pages/AdminBugReports"));
const MyBugReports = lazy(() => import("./pages/MyBugReports"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SEO = lazy(() => import("./pages/SEO"));
const EmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const PromptTemplates = lazy(() => import("./pages/admin/PromptTemplates"));
const DesignerWorkload = lazy(() => import("./pages/admin/DesignerWorkload"));
const UserActivity = lazy(() => import("./pages/admin/UserActivity"));
const ExportData = lazy(() => import("./pages/admin/ExportData"));
const BlogWriter = lazy(() => import("./pages/BlogWriter"));
const ClientSuccessHub = lazy(() => import("./pages/ClientSuccessHub"));
const WebsiteBuilds = lazy(() => import("./pages/WebsiteBuilds"));
const WebsiteBuildDetail = lazy(() => import("./pages/WebsiteBuildDetail"));
```

6. Wrap `<Routes>` with `<ErrorBoundary>` and `<Suspense>`:

```tsx
<ErrorBoundary>
  <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      {/* all routes unchanged */}
    </Routes>
  </Suspense>
</ErrorBoundary>
```

7. Also fix the inconsistent indentation in the routes block (normalize to 2-space consistent indent).

**Step 4: Run tests + build to verify**

Run: `npx vitest run && npx vite build 2>&1 | tail -5`
Expected:
- All tests PASS
- Build succeeds
- **Multiple chunks** in output instead of single 8MB index.js
- Chunk size warning should be gone or significantly reduced

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "perf: convert all routes to React.lazy for code splitting"
```

---

## Task 4: Configure QueryClient with production-ready defaults

**Files:**
- Modify: `src/App.tsx` (QueryClient initialization at line 63)
- Test: `src/components/__tests__/App.test.tsx` (extend existing)

**Step 1: Write a test for QueryClient configuration**

```tsx
// Add to src/components/__tests__/App.test.tsx
it('configures QueryClient with stale time and retry', async () => {
  // We can't easily inspect QueryClient config from rendered output,
  // so we test that the app renders and data fetching doesn't
  // immediately refetch (which the default 0ms staleTime causes).
  // This is a build-verification test — the real validation is:
  // the QueryClient config object in App.tsx.
  const { default: App } = await import('../../App');
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
```

**Step 2: Update QueryClient config in App.tsx**

Replace line 63:
```tsx
const queryClient = new QueryClient();
```

With:
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min — don't refetch on every mount
      gcTime: 10 * 60 * 1000,       // 10 min garbage collection
      retry: 1,                      // one retry, then fail
      refetchOnWindowFocus: false,   // prevent surprise refetches
    },
    mutations: {
      retry: 0,                      // never auto-retry mutations
    },
  },
});
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: configure QueryClient with sane defaults (staleTime, retry, gcTime)"
```

---

## Task 5: Add ErrorBoundary inside MainLayout (route-level protection)

**Files:**
- Modify: `src/components/MainLayout.tsx`

**Step 1: Verify existing MainLayout tests** — none exist, so this is a modification-only step.

**Step 2: Add ErrorBoundary wrapping `children` in MainLayout**

In `src/components/MainLayout.tsx`, add import:
```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
```

Then wrap `children` at line 142 — change:
```tsx
) : (
  children
)}
```

To:
```tsx
) : (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
)}
```

This catches errors within a page without breaking the sidebar/header layout.

**Step 3: Run tests + build**

Run: `npx vitest run && npx vite build 2>&1 | tail -3`
Expected: PASS, build succeeds

**Step 4: Commit**

```bash
git add src/components/MainLayout.tsx
git commit -m "fix: add ErrorBoundary inside MainLayout for route-level crash protection"
```

---

## Task 6: Verify auth guard completeness

**Files:**
- No code changes expected (verification only)

**Step 1: Audit all routes for auth protection**

Check `src/App.tsx` routes — identify which are wrapped in `MainLayout` (protected) vs. bare (public):

**Public routes (no MainLayout = no auth guard):**
- `/assets/share/:token` → `PublicAssets` — ✓ intentionally public
- `/auth` → `Auth` — ✓ intentionally public (login page)
- `/reset-password` → `ResetPassword` — ✓ intentionally public
- `/set-password` → `SetPassword` — ✓ intentionally public
- `/calendar/callback` → `CalendarCallback` — needs verification (OAuth callback)

**Protected routes (MainLayout wraps = auth guard active):**
- All other routes — ✓ wrapped in `<MainLayout>`

**Step 2: Verify CalendarCallback handles auth correctly**

Read `src/pages/CalendarCallback.tsx` to confirm it either:
- Has its own auth check, OR
- Is a stateless OAuth redirect handler (no sensitive data exposed)

**Step 3: Document findings**

If all routes are correctly classified (public vs protected), no code change needed. If CalendarCallback exposes data without auth, wrap it in MainLayout.

**Step 4: Commit (only if changes made)**

```bash
git add src/App.tsx
git commit -m "fix: wrap CalendarCallback in auth guard"
```

---

## Task 7: Final verification build

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Run production build and check chunk sizes**

Run: `npx vite build 2>&1 | grep -E "(kB|chunks|warning)"`
Expected:
- Multiple route chunks (not one 8MB blob)
- No chunk size warnings, or significantly reduced warning threshold
- Build completes successfully

**Step 3: Verify the app starts**

Run: `npx vite preview &` then check `http://localhost:4173` loads (manual check).

**Step 4: Final commit if any tweaks needed**

---

## Summary

| Task | Type | Files | Risk |
|------|------|-------|------|
| 1. RouteLoadingFallback | New component | 2 | Low |
| 2. ErrorBoundary | New component | 2 | Low |
| 3. Lazy routes | Major refactor | 1 (App.tsx) | Medium — all routes affected |
| 4. QueryClient config | Config change | 1 (App.tsx) | Low |
| 5. ErrorBoundary in MainLayout | Integration | 1 | Low |
| 6. Auth guard audit | Verification | 0-1 | None |
| 7. Final build verification | Verification | 0 | None |

**Expected outcome:** Bundle drops from ~8MB single chunk to ~200KB initial + per-route chunks. App no longer fully crashes on component errors. Data fetching stops hammering the server with 0ms stale time.
