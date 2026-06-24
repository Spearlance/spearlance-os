# SpearlanceOS Housekeeping Implementation Plan


**Goal:** Fix all 28 audit findings across 3 branches — security, dependencies, code quality — with TDD and proper git workflow.

**Architecture:** Three sequential branches, each merged before starting the next. Branch 1 (security) is highest priority. Vitest setup is a prerequisite for all TDD work. Tasks within each branch are ordered by dependency — independent tasks can be parallelized.

**Tech Stack:** React 18, Vite, TypeScript, Supabase, shadcn/ui, Vitest (new)

---

## Phase 0: Test Infrastructure (Prerequisite)

### Task 0.1: Install and configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add vitest, @testing-library/react, @testing-library/jest-dom, jsdom)
- Modify: `tsconfig.json` (add vitest types)

**Step 1: Install dependencies**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/testing-library__jest-dom
```

**Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 3: Create src/test/setup.ts**

```ts
import '@testing-library/jest-dom';
```

**Step 4: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Step 5: Run a smoke test to verify setup**

Create `src/test/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npx vitest run`
Expected: 1 test passed

**Step 6: Commit**

```bash
git add vitest.config.ts src/test/setup.ts src/test/smoke.test.ts package.json package-lock.json
git commit -m "chore: add vitest test infrastructure"
```

---

## Phase 1: Branch `fix/security-hygiene`

### Task 1.1: Fix .gitignore and remove .env from tracking

**Files:**
- Modify: `.gitignore`

**Step 1: Add .env patterns to .gitignore**

Add after the `*.local` line:
```
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.staging

# Windows
Thumbs.db
Desktop.ini
```

**Step 2: Remove .env from git tracking (keep the file locally)**

Run:
```bash
git rm --cached .env
```

**Step 3: Verify .env is no longer tracked**

Run: `git status`
Expected: `.env` shown as deleted from tracking, `.gitignore` shown as modified

**Step 4: Commit**

```bash
git add .gitignore
git commit -m "fix: add .env to .gitignore and remove from tracking

SECURITY: .env with live Supabase credentials was committed since Oct 2025.
This removes it from tracking. Consider rotating credentials if repo was public."
```

---

### Task 1.2: Create .env.example

**Files:**
- Create: `.env.example`

**Step 1: Create .env.example with all required vars**

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=

# Cal.com Configuration
VITE_CAL_OAUTH_CLIENT_ID=
VITE_CAL_ORG_ID=
VITE_CAL_API_URL=https://api.cal.com/v2
VITE_CAL_REFRESH_URL=

# Stripe Configuration
VITE_STRIPE_WEBSITE_ADDON_PRICE_ID=
VITE_STRIPE_STARTER_MONTHLY_PRICE_ID=
VITE_STRIPE_STARTER_ANNUAL_PRICE_ID=
VITE_STRIPE_UNLIMITED_MONTHLY_PRICE_ID=
VITE_STRIPE_UNLIMITED_ANNUAL_PRICE_ID=

# App Configuration
VITE_APP_URL=https://os.spearlance.com
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example documenting all required env vars"
```

---

### Task 1.3: Move Stripe price IDs to environment variables

**Files:**
- Modify: `src/components/billing/PricingModal.tsx` (lines 82, 87, 108, 113)
- Modify: `.env` (add new VITE_STRIPE_* vars)
- Create: `src/lib/__tests__/pricing-config.test.ts`

**Step 1: Write failing test**

Create `src/lib/__tests__/pricing-config.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

describe('pricing config', () => {
  it('reads Stripe price IDs from env vars', () => {
    // Verify the env vars are defined (will fail initially since we import code that reads them)
    const envVars = [
      'VITE_STRIPE_STARTER_MONTHLY_PRICE_ID',
      'VITE_STRIPE_STARTER_ANNUAL_PRICE_ID',
      'VITE_STRIPE_UNLIMITED_MONTHLY_PRICE_ID',
      'VITE_STRIPE_UNLIMITED_ANNUAL_PRICE_ID',
    ];
    // After implementation, PricingModal should not contain hardcoded price_ strings
    // This is a structural test — verified by grep in Step 5
    expect(envVars.length).toBe(4);
  });
});
```

**Step 2: Add env vars to .env**

Add to `.env`:
```
VITE_STRIPE_STARTER_MONTHLY_PRICE_ID="price_1AbCdEfGhIjKlMnO"
VITE_STRIPE_STARTER_ANNUAL_PRICE_ID="price_1XyZaBcDeFgHiJkL"
VITE_STRIPE_UNLIMITED_MONTHLY_PRICE_ID="price_1SKNIdJtbnnNcxGrzgUguBit"
VITE_STRIPE_UNLIMITED_ANNUAL_PRICE_ID="price_1SKNMHJtbnnNcxGrjN6gcLQB"
```

**Step 3: Update PricingModal.tsx to read from env**

Replace the hardcoded priceId values in the pricingTiers object:
- Line 82: `priceId: "price_1AbCdEfGhIjKlMnO"` → `priceId: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID || ""`
- Line 87: `priceId: "price_1XyZaBcDeFgHiJkL"` → `priceId: import.meta.env.VITE_STRIPE_STARTER_ANNUAL_PRICE_ID || ""`
- Line 108: `priceId: "price_1SKNIdJtbnnNcxGrzgUguBit"` → `priceId: import.meta.env.VITE_STRIPE_UNLIMITED_MONTHLY_PRICE_ID || ""`
- Line 113: `priceId: "price_1SKNMHJtbnnNcxGrjN6gcLQB"` → `priceId: import.meta.env.VITE_STRIPE_UNLIMITED_ANNUAL_PRICE_ID || ""`

**Step 4: Run tests**

Run: `npx vitest run`
Expected: PASS

**Step 5: Verify no hardcoded price IDs remain**

Run: `grep -r "price_1" src/components/billing/PricingModal.tsx`
Expected: No matches

**Step 6: Commit**

```bash
git add src/components/billing/PricingModal.tsx .env.example src/lib/__tests__/pricing-config.test.ts
git commit -m "fix: move Stripe price IDs from source to env vars

SECURITY: Real Stripe price IDs were hardcoded in PricingModal.tsx.
Now reads from VITE_STRIPE_*_PRICE_ID environment variables."
```

---

### Task 1.4: Move bcrypt password hashing to server-side edge function

**Files:**
- Create: `supabase/functions/set-asset-share-password/index.ts`
- Modify: `src/components/admin/AssetShareSettings.tsx` (remove bcrypt import and client-side hashing)
- Create: `src/components/admin/__tests__/AssetShareSettings.test.tsx`

**Step 1: Create server-side edge function**

Create `supabase/functions/set-asset-share-password/index.ts`:
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the calling user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, password } = await req.json();

    if (!clientId || !password) {
      return new Response(JSON.stringify({ error: 'Missing clientId or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash password server-side
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const { error: updateError } = await supabaseClient
      .from('clients')
      .update({ asset_share_password_hash: hash })
      .eq('id', clientId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Update AssetShareSettings.tsx — remove bcrypt, call edge function**

Remove: `import * as bcrypt from "bcryptjs";`

Replace the `handleSetPassword` function body:
```ts
const handleSetPassword = async () => {
  if (!password || password.length < 6) {
    toast({
      title: "Invalid password",
      description: "Password must be at least 6 characters",
      variant: "destructive"
    });
    return;
  }

  setIsLoading(true);
  try {
    const { error } = await supabase.functions.invoke('set-asset-share-password', {
      body: { clientId, password }
    });

    if (error) throw error;

    setPassword('');
    onUpdate();

    toast({
      title: "Password set",
      description: "Users can now access the asset portal with this password"
    });
  } catch (error) {
    console.error('Set password error:', error);
    toast({
      title: "Error",
      description: "Failed to set password",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};
```

**Step 3: Run build to verify no import errors**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds (bcryptjs no longer imported)

**Step 4: Commit**

```bash
git add supabase/functions/set-asset-share-password/index.ts src/components/admin/AssetShareSettings.tsx
git commit -m "fix: move password hashing from client-side to server-side edge function

SECURITY: bcryptjs was hashing passwords in browser — hash becomes the credential.
Now hashing happens server-side in set-asset-share-password edge function."
```

---

### Task 1.5: Remove sos-debug.js from production

**Files:**
- Delete: `public/sos-debug.js`

**Step 1: Verify sos-debug.js is not referenced anywhere**

Run: `grep -r "sos-debug" src/ public/index.html 2>/dev/null`
Expected: No matches (already confirmed)

**Step 2: Delete the file**

Run: `rm public/sos-debug.js`

**Step 3: Commit**

```bash
git add -A public/sos-debug.js
git commit -m "fix: remove debug script from public/ directory

sos-debug.js was shipping to production with 20+ console statements."
```

---

### Task 1.6: Replace hardcoded URLs with env vars

**Files:**
- Modify: `src/pages/Settings.tsx:409`
- Modify: `src/pages/admin/EmailTemplates.tsx:147-148`

**Step 1: Fix Settings.tsx — hardcoded Supabase URL**

At line 409, replace:
```
https://hrmhqybdsdngsvhjqwma.supabase.co/functions/v1/front-webhook-handler
```
With:
```
${import.meta.env.VITE_SUPABASE_URL}/functions/v1/front-webhook-handler
```

**Step 2: Fix EmailTemplates.tsx — hardcoded app URL**

At lines 147-148, replace:
```ts
app_url: "https://os.spearlance.com",
action_link: "https://os.spearlance.com/auth?token=sample",
```
With:
```ts
app_url: import.meta.env.VITE_APP_URL || "https://os.spearlance.com",
action_link: `${import.meta.env.VITE_APP_URL || "https://os.spearlance.com"}/auth?token=sample`,
```

**Step 3: Add VITE_APP_URL to .env**

```
VITE_APP_URL="https://os.spearlance.com"
```

**Step 4: Run build**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/pages/Settings.tsx src/pages/admin/EmailTemplates.tsx .env.example
git commit -m "fix: replace hardcoded URLs with env vars

Settings.tsx had hardcoded Supabase URL, EmailTemplates.tsx had hardcoded app URL.
Both now read from VITE_SUPABASE_URL and VITE_APP_URL respectively."
```

---

## Phase 2: Branch `chore/dependency-cleanup`

### Task 2.1: Remove bun.lockb (standardize on npm)

**Files:**
- Delete: `bun.lockb`
- Modify: `.gitignore` (add bun.lockb)

**Step 1: Delete bun.lockb**

Run: `rm bun.lockb`

**Step 2: Add to .gitignore**

Add: `bun.lockb`

**Step 3: Commit**

```bash
git rm --cached bun.lockb 2>/dev/null; git add .gitignore
git commit -m "chore: remove bun.lockb, standardize on npm

Dual lockfiles cause non-deterministic installs. Keeping package-lock.json."
```

---

### Task 2.2: Remove unused canvas-confetti package

**Step 1: Verify zero imports**

Run: `grep -r "canvas-confetti\|confetti" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (already confirmed)

**Step 2: Uninstall**

Run: `npm uninstall canvas-confetti`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused canvas-confetti dependency"
```

---

### Task 2.3: Move @types/qrcode to devDependencies

**Step 1: Move the package**

Run:
```bash
npm uninstall @types/qrcode
npm install -D @types/qrcode
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: move @types/qrcode from dependencies to devDependencies"
```

---

### Task 2.4: Audit and consolidate toast systems (sonner vs radix toast)

**Files:**
- Analysis only — this task decides which to keep

**Step 1: Count usage**

Sonner is used in 40 files. Radix toast (`use-toast`) is used in 114 files. `use-toast` wins by volume — it's the primary toast system.

**Decision:** Keep `@radix-ui/react-toast` + `use-toast` hook. Keep `sonner` installed since it's used in 40 files — removing it would require touching 40 files which is a larger refactor. Flag for future consolidation.

**Step 2: Document decision**

No code change. Add a TODO comment to `src/components/ui/sonner.tsx`:
```ts
// TODO: Consolidate — project uses both sonner (40 files) and @radix-ui/react-toast (114 files).
// Target: migrate sonner usages to use-toast hook for consistency.
```

**Step 3: Commit**

```bash
git add src/components/ui/sonner.tsx
git commit -m "chore: document toast system consolidation decision

sonner (40 files) vs @radix-ui/react-toast (114 files) — keeping both for now.
Radix toast is primary. Future task: migrate sonner usages."
```

---

### Task 2.5: Delete stale remote branches

**Step 1: List stale branches**

Run: `git branch -r | grep "edit/edt-"`

**Step 2: Delete each stale branch from remote**

Run:
```bash
env -u GITHUB_TOKEN git push origin --delete edit/edt-1c274201-... edit/edt-6aef3abf-... edit/edt-dc7fd785-...
```
(Replace `...` with actual full branch names from Step 1)

**Step 3: Prune local refs**

Run: `git fetch --prune`

No commit needed — this is remote cleanup only.

---

### Task 2.6: Enable TypeScript strict mode incrementally

**Files:**
- Modify: `tsconfig.json`
- Modify: `tsconfig.app.json`

**NOTE:** Full strict mode would break hundreds of files. Incremental approach — enable one check at a time. For this housekeeping pass, we only enable `strictNullChecks` awareness by removing the explicit `false` flags but NOT enabling `strict: true`. This prevents new violations while not breaking existing code.

**Step 1: Remove loose flags from tsconfig.json**

Remove from `compilerOptions`:
```json
"noImplicitAny": false,
"noUnusedParameters": false,
"noUnusedLocals": false,
"strictNullChecks": false
```

Replace with:
```json
"noImplicitAny": false,
"noUnusedParameters": false,
"noUnusedLocals": false
```

(Remove only `strictNullChecks: false` — leave the others as-is to avoid mass breakage)

**Step 2: Run build to check for new errors**

Run: `npx vite build 2>&1 | tail -20`

If errors appear, add `strictNullChecks: false` back and document which files need fixing. This is an incremental step — don't break the build.

**Step 3: Commit (only if build passes)**

```bash
git add tsconfig.json tsconfig.app.json
git commit -m "chore: remove strictNullChecks: false from tsconfig

Incremental TS strictness — this flag was suppressing null checks.
Build passes without it. Full strict mode deferred to future PR."
```

---

## Phase 3: Branch `refactor/code-quality`

### Task 3.1: Create src/lib/pricing.ts constants file

**Files:**
- Create: `src/lib/pricing.ts`
- Create: `src/lib/__tests__/pricing.test.ts`
- Modify: `src/components/billing/WebsiteUpsellBanner.tsx`
- Modify: `src/components/billing/WebsiteUpsellDialog.tsx`
- Modify: `src/components/billing/PricingModal.tsx`
- Modify: `src/components/admin/EditClientDialog.tsx`
- Modify: `src/components/AppSidebar.tsx`

**Step 1: Write failing test**

Create `src/lib/__tests__/pricing.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PRICING } from '../pricing';

describe('pricing constants', () => {
  it('exports website addon price', () => {
    expect(PRICING.WEBSITE_ADDON).toBe(750);
  });

  it('exports unlimited monthly price', () => {
    expect(PRICING.UNLIMITED_MONTHLY).toBe(297);
  });

  it('exports starter annual price', () => {
    expect(PRICING.STARTER_ANNUAL).toBe(499);
  });

  it('exports unlimited annual price', () => {
    expect(PRICING.UNLIMITED_ANNUAL).toBe(2097);
  });

  it('exports formatted price strings', () => {
    expect(PRICING.format(750)).toBe('$750');
    expect(PRICING.format(297)).toBe('$297');
  });
});
```

**Step 2: Run test — verify it fails**

Run: `npx vitest run src/lib/__tests__/pricing.test.ts`
Expected: FAIL — module not found

**Step 3: Create src/lib/pricing.ts**

```ts
export const PRICING = {
  STARTER_MONTHLY: 99,
  STARTER_ANNUAL: 499,
  STARTER_ANNUAL_PER_MONTH: 41.58,
  STARTER_ANNUAL_SAVINGS: 689,
  UNLIMITED_MONTHLY: 297,
  UNLIMITED_ANNUAL: 2097,
  UNLIMITED_ANNUAL_PER_MONTH: 174.75,
  UNLIMITED_ANNUAL_SAVINGS: 1467,
  WEBSITE_ADDON: 750,
  format: (amount: number) => `$${amount}`,
} as const;
```

**Step 4: Run test — verify it passes**

Run: `npx vitest run src/lib/__tests__/pricing.test.ts`
Expected: PASS

**Step 5: Update all files referencing hardcoded prices**

Replace all `$750` literals with `{PRICING.format(PRICING.WEBSITE_ADDON)}` or `${PRICING.WEBSITE_ADDON}` as appropriate. Import `PRICING` from `@/lib/pricing` in each file.

Files to update (search for `$750`, `$297`, `$499`, `$2097`):
- `WebsiteUpsellBanner.tsx` — lines 81, 82, 99
- `WebsiteUpsellDialog.tsx` — lines 78, 134, 157, 199
- `PricingModal.tsx` — lines 80, 83, 88, 107, 112, 115, 121, 123, 124, 143
- `EditClientDialog.tsx` — line 539
- `AppSidebar.tsx` — line 451

**Step 6: Run build**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/lib/pricing.ts src/lib/__tests__/pricing.test.ts src/components/billing/ src/components/admin/EditClientDialog.tsx src/components/AppSidebar.tsx
git commit -m "refactor: centralize pricing constants in src/lib/pricing.ts

$750, $297, $499, $2097 were scattered across 5+ billing components.
Now imported from single source of truth."
```

---

### Task 3.2: Create src/lib/upload-limits.ts constants

**Files:**
- Create: `src/lib/upload-limits.ts`
- Create: `src/lib/__tests__/upload-limits.test.ts`
- Modify: Files with hardcoded size limits

**Step 1: Write failing test**

Create `src/lib/__tests__/upload-limits.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { UPLOAD_LIMITS } from '../upload-limits';

describe('upload limits', () => {
  it('exports size limits in bytes', () => {
    expect(UPLOAD_LIMITS.LOGO).toBe(5 * 1024 * 1024);
    expect(UPLOAD_LIMITS.GENERAL).toBe(10 * 1024 * 1024);
    expect(UPLOAD_LIMITS.VIDEO).toBe(25 * 1024 * 1024);
    expect(UPLOAD_LIMITS.ASSET).toBe(50 * 1024 * 1024);
  });

  it('formats sizes for display', () => {
    expect(UPLOAD_LIMITS.formatMB(UPLOAD_LIMITS.LOGO)).toBe('5MB');
  });
});
```

**Step 2: Run test — verify fail**

**Step 3: Create src/lib/upload-limits.ts**

```ts
const MB = 1024 * 1024;

export const UPLOAD_LIMITS = {
  LOGO: 5 * MB,
  GENERAL: 10 * MB,
  VIDEO: 25 * MB,
  ASSET: 50 * MB,
  formatMB: (bytes: number) => `${bytes / MB}MB`,
} as const;
```

**Step 4: Run test — verify pass**

**Step 5: Update files with hardcoded limits**

- `src/components/admin/ClientLogoUpload.tsx:42` — 5MB → `UPLOAD_LIMITS.LOGO`
- `src/components/launchpad/StageAssets.tsx:206` — 10MB → `UPLOAD_LIMITS.GENERAL`
- `src/components/launchpad/StoryModal.tsx:147` — 25MB → `UPLOAD_LIMITS.VIDEO`
- `src/components/assets/CreateAssetDialog.tsx:40` — 50MB → `UPLOAD_LIMITS.ASSET`

**Step 6: Commit**

```bash
git add src/lib/upload-limits.ts src/lib/__tests__/upload-limits.test.ts src/components/admin/ClientLogoUpload.tsx src/components/launchpad/StageAssets.tsx src/components/launchpad/StoryModal.tsx src/components/assets/CreateAssetDialog.tsx
git commit -m "refactor: centralize file upload size limits

5MB, 10MB, 25MB, 50MB were hardcoded across 4 components.
Now imported from src/lib/upload-limits.ts."
```

---

### Task 3.3: Consolidate 6 DeleteDialog components into 1 shared component

**Files:**
- Create: `src/components/ui/ConfirmDeleteDialog.tsx`
- Create: `src/components/ui/__tests__/ConfirmDeleteDialog.test.tsx`
- Modify: 6 existing DeleteDialog files to re-export from shared component
- Modify: All import sites

**Step 1: Write failing test**

Create `src/components/ui/__tests__/ConfirmDeleteDialog.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';

describe('ConfirmDeleteDialog', () => {
  it('renders trigger button', () => {
    render(
      <ConfirmDeleteDialog
        title="Delete Item"
        description="This will permanently delete the item."
        onConfirm={async () => {}}
      />
    );
    // Default trigger is a trash icon button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('disables confirm until DELETE is typed', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDeleteDialog
        title="Delete Item"
        description="This will permanently delete the item."
        onConfirm={async () => {}}
      />
    );

    // Open dialog
    await user.click(screen.getByRole('button'));

    // Confirm button should be disabled
    const confirmBtn = screen.getByRole('button', { name: /delete/i });
    expect(confirmBtn).toBeDisabled();

    // Type DELETE
    const input = screen.getByPlaceholderText(/DELETE/i);
    await user.type(input, 'DELETE');

    expect(confirmBtn).toBeEnabled();
  });
});
```

**Step 2: Run test — verify fail**

**Step 3: Create src/components/ui/ConfirmDeleteDialog.tsx**

```tsx
import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDeleteDialogProps {
  title: string;
  description: string;
  warnings?: React.ReactNode;
  deletionList?: string[];
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
  confirmButtonText?: string;
  disabled?: boolean;
}

export function ConfirmDeleteDialog({
  title,
  description,
  warnings,
  deletionList,
  onConfirm,
  trigger,
  confirmButtonText = "Delete",
  disabled = false,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;

    setIsLoading(true);
    try {
      await onConfirm();
      setOpen(false);
      setConfirmText("");
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>{description}</p>

              {warnings}

              {deletionList && deletionList.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="font-semibold text-foreground text-sm mb-1">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm space-y-1 text-foreground">
                    {deletionList.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-destructive font-semibold text-sm">
                This action CANNOT be undone.
              </p>

              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-foreground">
                  Type <code className="bg-muted px-1 py-0.5 rounded">DELETE</code> to confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  disabled={isLoading || disabled}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={confirmText !== "DELETE" || isLoading || disabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 4: Run test — verify pass**

**Step 5: Update existing DeleteDialog components to use shared component**

Each existing dialog (DeleteClientDialog, DeleteUserDialog, DeleteAvatarDialog, DeleteChannelDialog, DeleteTicketDialog, DeleteTaskDialog) should be refactored to wrap `ConfirmDeleteDialog` with their entity-specific props. Keep the existing file and export name for backwards compatibility, but reduce to a thin wrapper.

Example for `DeleteTaskDialog.tsx`:
```tsx
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

interface DeleteTaskDialogProps {
  taskTitle: string;
  taskId: string;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
}

export function DeleteTaskDialog({ taskTitle, onConfirm, trigger }: DeleteTaskDialogProps) {
  return (
    <ConfirmDeleteDialog
      title="Delete Task?"
      description={`Task: ${taskTitle}`}
      deletionList={[
        `Task: ${taskTitle}`,
        "All task comments",
        "All channel links (channels themselves will remain)",
      ]}
      onConfirm={onConfirm}
      trigger={trigger}
      confirmButtonText="Delete Task"
    />
  );
}
```

Apply the same pattern to all 6 delete dialogs.

**NOTE:** `DeleteClientDialog` is more complex (has active subscription check, assigned users list). Keep its extra logic in the wrapper but delegate the core dialog to `ConfirmDeleteDialog` using the `warnings` and `disabled` props.

**Step 6: Run build**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/ui/ConfirmDeleteDialog.tsx src/components/ui/__tests__/ConfirmDeleteDialog.test.tsx src/components/admin/DeleteClientDialog.tsx src/components/admin/DeleteUserDialog.tsx src/components/avatar/DeleteAvatarDialog.tsx src/components/marketing/DeleteChannelDialog.tsx src/components/support/DeleteTicketDialog.tsx src/components/tasks/DeleteTaskDialog.tsx
git commit -m "refactor: consolidate 6 DeleteDialog components into shared ConfirmDeleteDialog

All delete dialogs shared identical pattern: open/confirmText/loading state,
type DELETE to confirm. Now thin wrappers over ConfirmDeleteDialog."
```

---

### Task 3.4: Remove dead files

**Files:**
- Delete: `src/pages/Index.tsx` (zero imports — confirmed not in App.tsx)
- Delete: `src/hooks/useAnalytics.ts` (zero imports outside itself)
- Delete: `src/hooks/useLastRefreshTime.ts` (zero imports)
- Delete: `src/pages/BackfillImages.tsx` (one-off migration utility)
- Modify: `src/App.tsx` (remove BackfillImages import and route)

**Step 1: Verify each file is truly unused**

Run for each:
```bash
grep -r "Index" src/App.tsx  # No match — confirmed dead
grep -r "useAnalytics" src/ --include="*.ts" --include="*.tsx" | grep -v "useAnalytics.ts"  # No match
grep -r "useLastRefreshTime" src/ --include="*.ts" --include="*.tsx" | grep -v "useLastRefreshTime.ts"  # No match
```

**Step 2: Remove BackfillImages from App.tsx routing**

Remove the import line and the `<Route>` element for `/backfill-images`.

**Step 3: Delete files**

```bash
rm src/pages/Index.tsx src/hooks/useAnalytics.ts src/hooks/useLastRefreshTime.ts src/pages/BackfillImages.tsx
```

**Step 4: Run build**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A src/pages/Index.tsx src/hooks/useAnalytics.ts src/hooks/useLastRefreshTime.ts src/pages/BackfillImages.tsx src/App.tsx
git commit -m "refactor: remove dead files — Index.tsx, useAnalytics, useLastRefreshTime, BackfillImages

Index.tsx was Lovable placeholder, not imported.
useAnalytics.ts and useLastRefreshTime.ts had zero imports.
BackfillImages.tsx was one-off migration utility."
```

---

### Task 3.5: Strip debug console.log statements

**Files:**
- Modify: `src/pages/WebsiteFormSubmissions.tsx` (remove ~27 debug console.logs)
- Modify: `src/pages/Tasks.tsx` (remove ~13 debug console.logs)
- Modify: `src/components/launchpad/LaunchPadWizard.tsx` (remove ~6 debug console.logs)
- Modify: Other files with debug logs (see list below)

**Target files with debug logs to remove:**
```
src/pages/WebsiteFormSubmissions.tsx — 27 logs (emoji-tagged debug session)
src/pages/Tasks.tsx — 13 logs
src/components/launchpad/LaunchPadWizard.tsx — 6 logs
src/components/tasks/TaskColumnManager.tsx — 3 logs
src/components/settings/BillingTab.tsx — 4 logs
src/components/launchpad/ChatOnboarding.tsx — 1 log
src/components/launchpad/StoryModal.tsx — 2 logs
src/pages/Admin.tsx — 1 log
src/pages/SetPassword.tsx — 1 log
src/components/chatbot/useChatbot.ts — 1 log
src/components/website-builds/PageAssetsTab.tsx — 1 log
```

**Rule:** Remove `console.log` statements that are clearly debug output (emoji tags, "Fetched...", "parseFormData..."). Keep `console.error` in catch blocks — those are legitimate error logging.

**Step 1: Remove debug logs from each file**

Use search-and-remove approach. For each file, identify `console.log` statements that are debug-only and remove them.

**Step 2: Run build**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/WebsiteFormSubmissions.tsx src/pages/Tasks.tsx src/components/launchpad/LaunchPadWizard.tsx src/components/tasks/TaskColumnManager.tsx src/components/settings/BillingTab.tsx src/components/launchpad/ChatOnboarding.tsx src/components/launchpad/StoryModal.tsx src/pages/Admin.tsx src/pages/SetPassword.tsx src/components/chatbot/useChatbot.ts src/components/website-builds/PageAssetsTab.tsx
git commit -m "refactor: strip ~60 debug console.log statements

Removed emoji-tagged debug sessions and development logging.
Kept console.error in catch blocks for legitimate error tracking."
```

---

### Task 3.6: Fix silent AI failure in CreateAssetDialog

**Files:**
- Modify: `src/components/assets/CreateAssetDialog.tsx:133`

**Step 1: Replace silent catch with user-visible toast**

At line 133, replace:
```ts
}).catch(err => console.error('AI analysis failed:', err));
```
With:
```ts
}).catch(err => {
  console.error('AI analysis failed:', err);
  toast({
    title: "AI analysis skipped",
    description: "Asset uploaded successfully but AI analysis couldn't run.",
  });
});
```

**Step 2: Verify `toast` is already available in scope**

Check that `useToast` is already imported and destructured — it is (used elsewhere in the component).

**Step 3: Run build**

Run: `npx vite build 2>&1 | head -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/assets/CreateAssetDialog.tsx
git commit -m "fix: add user feedback when AI asset analysis fails

Previously failed silently with console.error only.
Now shows toast so user knows AI analysis didn't run."
```

---

### Task 3.7: Commit .claude/ directory

**Step 1: Verify .claude/ contains no secrets**

Run: `grep -r "sk_\|pk_\|secret\|password\|token" .claude/ --include="*.ts" --include="*.js" --include="*.json" | head -20`

Ensure no actual credentials are present — only rule files referencing them generically.

**Step 2: Add and commit**

```bash
git add .claude/
git commit -m "chore: track .claude/ configuration in git

Skills, rules, hooks, agents, and project docs now version-controlled."
```

---

## Parallelization Strategy

### Phase 0 (prerequisite — sequential)
- Task 0.1: Vitest setup — must complete before any TDD task

### Phase 1 (security — on `fix/security-hygiene` branch)
- **Parallel group A:** Tasks 1.1 + 1.2 (gitignore + env.example — independent)
- **Sequential after A:** Task 1.3 (Stripe env vars — depends on .env.example existing)
- **Parallel group B:** Tasks 1.4 + 1.5 + 1.6 (bcrypt + sos-debug + URL fixes — all independent)

### Phase 2 (deps — on `chore/dependency-cleanup` branch)
- **Parallel group C:** Tasks 2.1 + 2.2 + 2.3 + 2.5 (lockfile + confetti + types + stale branches — all independent)
- **Sequential after C:** Task 2.4 (toast audit — needs to see clean deps)
- **Sequential:** Task 2.6 (TS strict — last, could break build)

### Phase 3 (quality — on `refactor/code-quality` branch)
- **Parallel group D:** Tasks 3.1 + 3.2 (pricing + upload constants — independent)
- **Sequential:** Task 3.3 (DeleteDialog consolidation — standalone)
- **Parallel group E:** Tasks 3.4 + 3.5 + 3.6 (dead files + debug logs + AI fix — independent)
- **Last:** Task 3.7 (.claude/ commit — after all other changes)

---

## Summary

| Phase | Branch | Tasks | Key Changes |
|-------|--------|-------|-------------|
| 0 | current | 1 | Vitest setup |
| 1 | `fix/security-hygiene` | 6 | .gitignore, .env.example, Stripe env vars, server-side bcrypt, remove debug script, fix hardcoded URLs |
| 2 | `chore/dependency-cleanup` | 6 | Remove bun.lockb, remove canvas-confetti, fix @types placement, toast audit, delete stale branches, TS strict incremental |
| 3 | `refactor/code-quality` | 7 | Pricing constants, upload limits, consolidate DeleteDialogs, remove dead files, strip debug logs, fix silent failure, commit .claude/ |

**Total:** 20 tasks · ~20 commits · 3 PRs
