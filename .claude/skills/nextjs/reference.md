# Next.js App Router — Developer Reference

> **Last Verified:** February 2026
> **Current Version:** 16.1.6 LTS
> **Requires:** Node.js 20.9.0+, TypeScript 5.1.0+, React 19.2
> **Documentation:** https://nextjs.org/docs

---

## Table of Contents

1. [Project Structure & File Conventions](#1-project-structure--file-conventions)
2. [Server vs Client Components](#2-server-vs-client-components)
3. [Routing](#3-routing)
4. [Layouts & Templates](#4-layouts--templates)
5. [Data Fetching](#5-data-fetching)
6. [Server Actions & Mutations](#6-server-actions--mutations)
7. [Caching](#7-caching)
8. [Metadata API](#8-metadata-api)
9. [Image Optimization](#9-image-optimization)
10. [Fonts](#10-fonts)
11. [Middleware & Proxy](#11-middleware--proxy)
12. [Error Handling](#12-error-handling)
13. [Recent Changes and Deprecations](#13-recent-changes-and-deprecations)

---

## 1. Project Structure & File Conventions

### Standard App Router Structure

```
app/
├── layout.tsx              # Root layout (required) — wraps all routes
├── page.tsx                # Home page (/)
├── loading.tsx             # Root loading UI
├── error.tsx               # Root error boundary
├── not-found.tsx           # Root 404 page
├── globals.css
├── (marketing)/            # Route group — no URL segment
│   ├── about/
│   │   └── page.tsx        # /about
│   └── blog/
│       ├── layout.tsx      # Blog layout
│       ├── page.tsx        # /blog
│       └── [slug]/
│           ├── page.tsx    # /blog/:slug
│           └── loading.tsx
├── (shop)/                 # Route group — no URL segment
│   ├── layout.tsx          # Shop layout (nav, cart)
│   ├── products/
│   │   ├── page.tsx        # /products
│   │   └── [id]/
│   │       ├── page.tsx    # /products/:id
│   │       └── not-found.tsx
│   ├── cart/
│   │   └── page.tsx        # /cart
│   └── checkout/
│       └── page.tsx        # /checkout
├── account/
│   ├── layout.tsx
│   ├── @orders/            # Parallel route slot
│   │   ├── page.tsx
│   │   └── default.tsx     # Required in Next.js 16
│   └── @profile/
│       ├── page.tsx
│       └── default.tsx
├── api/                    # Route handlers
│   └── products/
│       └── route.ts        # GET, POST /api/products
├── instrumentation.ts      # Server lifecycle observability
└── proxy.ts                # Request interceptor (Next.js 16+)
```

### Special File Reference

| File | Props | Purpose |
|------|-------|---------|
| `layout.tsx` | `children`, `params` | Shared UI, persists across navigations |
| `page.tsx` | `params`, `searchParams` | Route UI, creates public URL |
| `loading.tsx` | — | Suspense fallback (cached 5 min in Router Cache) |
| `error.tsx` | `error`, `reset` | Segment error boundary (must be `'use client'`) |
| `not-found.tsx` | — | 404 UI, triggered by `notFound()` |
| `template.tsx` | `children` | Like layout but remounts on every navigation |
| `route.ts` | `Request` | API endpoint, no UI |
| `default.tsx` | `params` | Parallel route slot fallback |
| `proxy.ts` | `NextRequest` | Node.js runtime request interceptor (Next.js 16+) |
| `middleware.ts` | `NextRequest` | Edge runtime interceptor (deprecated in Next.js 16) |
| `instrumentation.ts` | — | `register()` + `onRequestError()` hooks |

### `params` and `searchParams` are async (Next.js 15+)

```typescript
// page.tsx
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const { sort } = await searchParams;
  // ...
}
```

---

## 2. Server vs Client Components

### Decision Matrix

| Need | Use |
|------|-----|
| `useState`, `useEffect`, `useReducer` | Client Component |
| `onClick`, event handlers | Client Component |
| Browser APIs (`window`, `localStorage`) | Client Component |
| `useRouter`, `usePathname`, `useSearchParams` | Client Component |
| `useOptimistic`, `useActionState` | Client Component |
| Direct DB/filesystem access | Server Component |
| Access environment secrets | Server Component |
| Reduce client bundle size | Server Component |
| `async/await` data fetching | Server Component |
| `cookies()`, `headers()` | Server Component |

### Marking Client Components

```typescript
// MUST be first line, before imports
'use client';

import { useState } from 'react';

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => setAdded(true)}>
      {added ? 'Added!' : 'Add to Cart'}
    </button>
  );
}
```

### Component Boundaries

```typescript
// Server Component — can import Client Components
import { AddToCart } from './add-to-cart'; // 'use client' component

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.products.findUnique({ where: { id } });

  return (
    <div>
      <h1>{product.name}</h1>
      {/* Pass serializable props only — no functions, no class instances */}
      <AddToCart productId={product.id} />
    </div>
  );
}
```

### `'use server'` Directive

Marks a function or file as a Server Action. Not the same as "Server Component."

```typescript
// Option 1: File-level — all exports become server actions
'use server';

export async function createProduct(formData: FormData) { /* ... */ }
export async function deleteProduct(id: string) { /* ... */ }

// Option 2: Inline in a Server Component
export default function Page() {
  async function handleSubmit(formData: FormData) {
    'use server';
    // runs on server
  }
  return <form action={handleSubmit}>...</form>;
}
```

---

## 3. Routing

### Dynamic Routes

```
app/products/[id]/page.tsx       → /products/123
app/blog/[...slug]/page.tsx      → /blog/a/b/c (catch-all)
app/docs/[[...slug]]/page.tsx    → /docs and /docs/a/b (optional catch-all)
```

```typescript
// app/products/[id]/page.tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1>Product {id}</h1>;
}

// Pre-generate static params at build time
export async function generateStaticParams() {
  const products = await db.products.findMany({ select: { id: true } });
  return products.map((p) => ({ id: p.id }));
}
```

### Route Groups

Organize routes without affecting the URL. Use `(groupName)` syntax.

```
app/
  (marketing)/
    about/page.tsx    → /about
    blog/page.tsx     → /blog
  (shop)/
    products/page.tsx → /products
```

Each group can have its own layout — useful for different nav styles.

### Parallel Routes

Render multiple pages simultaneously in the same layout via named slots.

```
app/dashboard/
  layout.tsx      # receives @analytics and @team slots
  page.tsx
  @analytics/
    page.tsx
    default.tsx   # REQUIRED in Next.js 16 — return null or call notFound()
  @team/
    page.tsx
    default.tsx
```

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="sidebar">
        {analytics}
        {team}
      </div>
    </div>
  );
}
```

### Intercepting Routes

Display a route within another route's context (e.g., modal photo). Uses `(.)`, `(..)`, `(..)(..)`, `(...)` notation matching file system depth.

```
app/
  feed/
    page.tsx
    (..)photo/[id]/   # Intercepts /photo/:id when navigating from /feed
      page.tsx        # Shows modal; direct URL shows app/photo/[id]/page.tsx
  photo/
    [id]/
      page.tsx        # Full page view
```

### Route Handlers

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const products = await db.products.findMany();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const product = await db.products.create({ data: body });
  return NextResponse.json(product, { status: 201 });
}
```

---

## 4. Layouts & Templates

### Layout Behavior

- Renders once, **persists state** across navigations within its scope
- Does NOT re-render when child page changes
- Receives `children` and (in nested layouts) `params`

```typescript
// app/shop/layout.tsx
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ShopNav />    {/* Stays mounted across /shop/* navigations */}
      <CartDrawer /> {/* State preserved */}
      <main>{children}</main>
    </div>
  );
}
```

### Root Layout

Required at `app/layout.tsx`. Must include `<html>` and `<body>`.

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s | My Store', default: 'My Store' },
  description: 'The best store.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Template vs Layout

Use `template.tsx` when you need the UI to remount on every navigation (fresh state, CSS animations reset, re-run effects).

```typescript
// app/shop/template.tsx — remounts on every /shop/* navigation
export default function ShopTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-enter-animation">{children}</div>;
}
```

---

## 5. Data Fetching

### Server Component Data Fetching

```typescript
// app/products/page.tsx — Server Component
export default async function ProductsPage() {
  // Direct DB access — no API needed
  const products = await db.products.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Fetch with Caching Options

```typescript
// NOT cached by default (Next.js 15+)
const res = await fetch('https://api.example.com/products');

// Explicitly cache forever (or until revalidated)
const res = await fetch('https://api.example.com/products', {
  cache: 'force-cache',
});

// Time-based revalidation
const res = await fetch('https://api.example.com/products', {
  next: { revalidate: 3600 }, // revalidate every hour
});

// Tagged for on-demand invalidation
const res = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] },
});

// Never cache
const res = await fetch('https://api.example.com/products', {
  cache: 'no-store',
});
```

### Streaming with Suspense

```typescript
// app/products/page.tsx
import { Suspense } from 'react';
import { ProductList } from './product-list';
import { RecommendedProducts } from './recommended';

export default function ProductsPage() {
  return (
    <div>
      {/* Streams in once ready */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList />
      </Suspense>
      {/* Streams independently */}
      <Suspense fallback={<RecommendedSkeleton />}>
        <RecommendedProducts />
      </Suspense>
    </div>
  );
}
```

### `use cache` Directive (Next.js 16 Cache Components)

Caches any server computation — not just `fetch`.

```typescript
import { cacheTag, cacheLife } from 'next/cache';

async function getProducts() {
  'use cache';
  cacheTag('products');
  cacheLife('hours'); // built-in profile: seconds, minutes, hours, days, weeks, max

  return db.query('SELECT * FROM products WHERE published = true');
}

// Cache a component
async function HeroSection() {
  'use cache';
  cacheTag('homepage-hero');
  cacheLife('days');

  const config = await db.siteConfig.findFirst();
  return <Hero title={config.heroTitle} />;
}
```

Enable in `next.config.ts`:
```typescript
const nextConfig = {
  cacheComponents: true, // replaces experimental.dynamicIO
};
```

### Memoizing Non-Fetch Data

```typescript
import { cache } from 'react';
import db from '@/lib/db';

// Deduplicated within a single render pass
export const getProduct = cache(async (id: string) => {
  return db.products.findUnique({ where: { id } });
});

// Call from multiple components — executes once
const product = await getProduct('123');
```

### `after()` — Post-Response Tasks

```typescript
import { after } from 'next/server';

export default function Layout({ children }: { children: React.ReactNode }) {
  after(async () => {
    // Runs after response is sent — logging, analytics, webhooks
    await analytics.track('page_view');
  });
  return <>{children}</>;
}
```

---

## 6. Server Actions & Mutations

### Basic Server Action

```typescript
// app/actions/products.ts
'use server';

import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  price: z.coerce.number().positive('Price must be positive'),
  description: z.string().optional(),
});

export type ProductFormState = {
  errors?: {
    name?: string[];
    price?: string[];
    description?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export async function createProduct(
  prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const result = ProductSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price'),
    description: formData.get('description'),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  try {
    const product = await db.products.create({ data: result.data });
    revalidateTag('products');
    redirect(`/products/${product.id}`);
  } catch (error) {
    return { errors: { _form: ['Failed to create product. Try again.'] } };
  }
}
```

### Form with `useActionState`

```typescript
// app/products/new/product-form.tsx
'use client';

import { useActionState } from 'react';
import { createProduct, type ProductFormState } from '@/app/actions/products';

const initialState: ProductFormState = {};

export function ProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">Product Name</label>
        <input id="name" name="name" type="text" required />
        {state.errors?.name && (
          <p className="error" aria-live="polite">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="price">Price</label>
        <input id="price" name="price" type="number" step="0.01" required />
        {state.errors?.price && (
          <p className="error" aria-live="polite">
            {state.errors.price[0]}
          </p>
        )}
      </div>

      {state.errors?._form && (
        <p className="error" aria-live="assertive">
          {state.errors._form[0]}
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  );
}
```

### Optimistic Updates with `useOptimistic`

```typescript
// app/products/product-list.tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleFavorite } from '@/app/actions/products';

type Product = { id: string; name: string; isFavorite: boolean };

export function ProductList({ products }: { products: Product[] }) {
  const [optimisticProducts, updateOptimistic] = useOptimistic(
    products,
    (state: Product[], updatedId: string) =>
      state.map((p) =>
        p.id === updatedId ? { ...p, isFavorite: !p.isFavorite } : p,
      ),
  );

  const [isPending, startTransition] = useTransition();

  async function handleToggle(id: string) {
    startTransition(() => {
      updateOptimistic(id); // instant UI update
    });
    await toggleFavorite(id); // server confirms
  }

  return (
    <ul>
      {optimisticProducts.map((product) => (
        <li key={product.id}>
          {product.name}
          <button onClick={() => handleToggle(product.id)}>
            {product.isFavorite ? '♥' : '♡'}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### Passing Extra Arguments with `.bind()`

```typescript
// Bind additional arguments beyond formData
const updateWithId = updateProduct.bind(null, product.id);

return <form action={updateWithId}>...</form>;

// Server action receives bound args first
export async function updateProduct(id: string, formData: FormData) {
  'use server';
  // ...
}
```

### `useFormStatus` for Submit Buttons

```typescript
// app/ui/submit-button.tsx
'use client';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Loading...' : label}
    </button>
  );
}
```

---

## 7. Caching

### The 4 Caching Layers

| Layer | What | Where | Duration |
|-------|------|-------|----------|
| **Request Memoization** | Deduplicate identical `fetch` calls in one render | Server | Per render pass |
| **Data Cache** | Persist fetch/DB results across requests & deployments | Server | Persistent (opt-in) |
| **Full Route Cache** | Cache rendered HTML + RSC payload | Server | Persistent (static routes) |
| **Router Cache** | RSC payload for visited + prefetched routes | Client (in-memory) | Session / time-based |

### Layer 1: Request Memoization

Automatic deduplication — React `cache` for non-fetch, fetch GET/HEAD auto-memoized.

```typescript
// Called in Layout AND Page — executes once, result shared
async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// Manual memoization for DB clients
import { cache } from 'react';
export const getUser = cache(async (id: string) => {
  return db.users.findUnique({ where: { id } });
});
```

Scope: single render pass. Cleared between requests. Cannot be opted out.

### Layer 2: Data Cache

Persistent server-side cache. **Not cached by default in Next.js 15+.**

```typescript
// Opt in: force-cache
fetch(url, { cache: 'force-cache' });

// Time-based: revalidate after N seconds
fetch(url, { next: { revalidate: 3600 } });

// On-demand tag: revalidate by tag
fetch(url, { next: { tags: ['products', 'product-123'] } });

// Opt out explicitly
fetch(url, { cache: 'no-store' });

// Segment-level opt out
export const dynamic = 'force-dynamic'; // in layout.tsx or page.tsx
```

**`use cache` + `cacheTag` for non-fetch:**
```typescript
import { cacheTag } from 'next/cache';

async function getProductsFromDB() {
  'use cache';
  cacheTag('products');
  return db.products.findMany();
}
```

### Layer 3: Full Route Cache

Caches rendered HTML + RSC payload at build time for static routes. Dynamic routes bypass this.

A route becomes dynamic (bypasses Full Route Cache) when it uses:
- `cookies()`, `headers()`, `draftMode()`
- `searchParams` prop in page
- `fetch` with `{ cache: 'no-store' }`
- `export const dynamic = 'force-dynamic'`
- `connection` API

```typescript
// Force static — bypasses dynamic rendering even with searchParams
export const dynamic = 'force-static';

// Force dynamic — never cache this route
export const dynamic = 'force-dynamic';

// Revalidate every hour
export const revalidate = 3600;
```

Cleared by: data revalidation (rebuilds), redeployment.

### Layer 4: Router Cache (Client)

In-memory browser cache of RSC payloads. Persists per session, cleared on page refresh.

**Default behavior (Next.js 15+):**
- Layouts: cached, reused across navigations (partial rendering)
- Loading states: cached 5 minutes
- Pages: NOT cached by default (staleTime = 0)
- Back/forward: always restores from cache

**Invalidation from Server Actions:**
```typescript
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { updateTag } from 'next/cache';

// Invalidates Router Cache for that path
revalidatePath('/products');

// Invalidates Data Cache + Router Cache for tagged data (SWR semantics in Next.js 16)
revalidateTag('products', 'max');

// Server Action only — immediate expiry, read-your-writes
updateTag('products');
```

### Revalidation Strategies

```typescript
// Time-based ISR
export const revalidate = 60; // seconds

// On-demand: tag-based (in Server Action or Route Handler)
import { revalidateTag } from 'next/cache';
revalidateTag('products', 'max'); // stale-while-revalidate (Next.js 16)

// On-demand: path-based
import { revalidatePath } from 'next/cache';
revalidatePath('/products');
revalidatePath('/products/[id]', 'page'); // specific segment type

// Immediate expiry (Server Action only, Next.js 16)
import { updateTag } from 'next/cache';
updateTag('products');

// Uncached data refresh (Server Action only, Next.js 16)
import { refresh } from 'next/cache';
refresh();
```

### Cache API Summary (Next.js 16)

| API | Where | Behavior |
|-----|-------|----------|
| `revalidateTag(tag, 'max')` | Server Action, Route Handler | SWR — serves stale while revalidating background |
| `revalidateTag(tag)` | — | Deprecated single-arg form |
| `updateTag(tag)` | Server Action only | Immediate expiry, read-your-writes |
| `revalidatePath(path)` | Server Action, Route Handler | Revalidates Data + Full Route Cache |
| `refresh()` | Server Action only | Refreshes uncached data only |
| `router.refresh()` | Client Component | Invalidates Router Cache only |

---

## 8. Metadata API

### Static Metadata

```typescript
// app/products/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse our product catalog',
  keywords: ['shop', 'products'],
  openGraph: {
    title: 'Products',
    description: 'Browse our product catalog',
    images: ['/og-products.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};
```

### Dynamic Metadata with `generateMetadata`

```typescript
// app/products/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await db.products.findUnique({ where: { id } });

  if (!product) return { title: 'Product Not Found' };

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      images: [product.imageUrl],
    },
  };
}
```

### Title Templates

```typescript
// app/layout.tsx — root layout
export const metadata: Metadata = {
  title: {
    template: '%s | My Store',
    default: 'My Store',
  },
};

// app/products/page.tsx — outputs: "Products | My Store"
export const metadata: Metadata = {
  title: 'Products',
};

// Use 'absolute' to bypass template
export const metadata: Metadata = {
  title: { absolute: 'Special Campaign Page' },
};
```

### File-based Metadata

| File | Route |
|------|-------|
| `app/favicon.ico` | `/favicon.ico` |
| `app/icon.png` | `/icon.png` |
| `app/apple-icon.png` | `/apple-touch-icon.png` |
| `app/opengraph-image.png` | `/opengraph-image.png` |
| `app/opengraph-image.tsx` | Dynamic OG image |
| `app/sitemap.ts` | `/sitemap.xml` |
| `app/robots.ts` | `/robots.txt` |

### Dynamic Open Graph Images

```typescript
// app/products/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Product';
export const size = { width: 1200, height: 630 };

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.products.findUnique({ where: { id } });

  return new ImageResponse(
    <div style={{ background: '#fff', display: 'flex', width: '100%', height: '100%' }}>
      <h1>{product?.name}</h1>
    </div>,
    { ...size },
  );
}
```

---

## 9. Image Optimization

### Basic Usage

```typescript
import Image from 'next/image';

// Local image — width/height inferred from import
import profilePic from '@/public/profile.jpg';

<Image src={profilePic} alt="Profile" />

// Remote image — width/height required
<Image
  src="https://example.com/product.jpg"
  alt="Product"
  width={800}
  height={600}
/>

// Fill mode — stretches to container (parent must have position: relative + dimensions)
<div style={{ position: 'relative', height: '400px' }}>
  <Image src="/hero.jpg" alt="Hero" fill style={{ objectFit: 'cover' }} />
</div>
```

### Performance Props

```typescript
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority          // LCP image — disables lazy loading, no blur placeholder
  quality={85}      // 1-100, default 75 (coerced to nearest in images.qualities)
  sizes="(max-width: 768px) 100vw, 50vw"  // srcset hints
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Remote Patterns Config (Next.js 15+)

`images.domains` is deprecated. Use `remotePatterns`.

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/products/**',
      },
    ],
    // Defaults changed in Next.js 16:
    // minimumCacheTTL: 14400 (was 60)
    // qualities: [75] (was all values)
    // imageSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840] (removed 16)
  },
};
```

---

## 10. Fonts

### `next/font/google`

```typescript
// app/layout.tsx
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### `next/font/local`

```typescript
import localFont from 'next/font/local';

const customFont = localFont({
  src: [
    { path: '../fonts/custom-regular.woff2', weight: '400' },
    { path: '../fonts/custom-bold.woff2', weight: '700' },
  ],
  variable: '--font-custom',
  display: 'swap',
});
```

Key facts:
- Zero layout shift — fonts load with size-adjust fallback
- Self-hosted at build time — no runtime requests to Google Fonts
- Automatic font subsetting for Google Fonts
- `display: 'swap'` is recommended for most body text

---

## 11. Middleware & Proxy

### `proxy.ts` (Next.js 16 — Node.js Runtime)

Replaces `middleware.ts` for most use cases. Runs on Node.js runtime.

```typescript
// proxy.ts (root of project, NOT inside app/)
import { NextRequest, NextResponse } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Auth guard
  const token = request.cookies.get('auth-token');
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Geo-based routing
  const country = request.geo?.country ?? 'US';
  if (pathname === '/' && country === 'GB') {
    return NextResponse.redirect(new URL('/uk', request.url));
  }

  // Header injection
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### `middleware.ts` (Deprecated — Edge Runtime)

Still available for edge-specific use cases. Deprecated in Next.js 16.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Edge runtime — cannot use Node.js APIs
  return NextResponse.next();
}
```

---

## 12. Error Handling

### Error Boundaries (`error.tsx`)

```typescript
// app/products/error.tsx — must be 'use client'
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Report to Sentry etc.
  }, [error]);

  return (
    <div>
      <h2>Something went wrong loading products.</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### `not-found.tsx`

```typescript
// app/products/[id]/not-found.tsx
export default function ProductNotFound() {
  return (
    <div>
      <h2>Product not found</h2>
      <a href="/products">Back to products</a>
    </div>
  );
}

// Trigger from anywhere in the segment
import { notFound } from 'next/navigation';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.products.findUnique({ where: { id } });

  if (!product) notFound(); // renders not-found.tsx

  return <div>{product.name}</div>;
}
```

### Global Error Boundary

```typescript
// app/global-error.tsx — wraps the root layout
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
```

### `instrumentation.ts` for Server Error Monitoring

```typescript
// instrumentation.ts
export async function register() {
  // Initialize observability provider (e.g., Sentry, OpenTelemetry)
}

export async function onRequestError(
  err: Error,
  request: { method: string; url: string },
  context: { routeType: string },
) {
  await fetch('https://errors.example.com/report', {
    method: 'POST',
    body: JSON.stringify({ message: err.message, request, context }),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## 13. Recent Changes and Deprecations

### Next.js 16 (October 2025) — Current

#### Breaking Changes

| Change | Migration |
|--------|-----------|
| `middleware.ts` deprecated | Rename to `proxy.ts`, export `proxy` function |
| `params`, `searchParams`, `cookies()`, `headers()` must be awaited | Run codemod: `npx @next/codemod@canary next-async-request-api .` |
| `experimental.ppr` removed | Use `cacheComponents: true` |
| `experimental.dynamicIO` renamed | Use `cacheComponents: true` |
| `experimental.turbopack` location | Move to top-level `turbopack` config key |
| `revalidateTag(tag)` single-arg deprecated | Use `revalidateTag(tag, 'max')` or `updateTag(tag)` |
| `export const dynamic = 'force-static'` / sync params | All params must be async |
| Parallel routes `default.js` | All slots now require explicit `default.js` |
| AMP support removed | No replacement |
| `next lint` command removed | Use Biome or ESLint directly |
| `serverRuntimeConfig`, `publicRuntimeConfig` removed | Use `.env` files |
| Node.js minimum | 20.9.0 (Node.js 18 dropped) |

#### New APIs

```typescript
// updateTag — Server Actions only, immediate expiry
import { updateTag } from 'next/cache';
updateTag('products');

// refresh — refresh uncached data only
import { refresh } from 'next/cache';
refresh();

// use cache directive
async function getProducts() {
  'use cache';
  cacheTag('products');
  return db.products.findMany();
}
```

#### Turbopack Default

Turbopack is now the default bundler for both `next dev` and `next build`. No configuration required. Opt out with `--webpack` flag:

```bash
next dev --webpack
next build --webpack
```

#### React Compiler (Stable)

```typescript
// next.config.ts
const nextConfig = {
  reactCompiler: true, // automatic memoization, no useMemo/useCallback needed
};
```

### Next.js 15 (October 2024)

#### Caching Defaults Reversed

| API | Next.js 14 | Next.js 15 |
|-----|-----------|-----------|
| `fetch` | Cached by default | NOT cached by default |
| GET Route Handlers | Cached by default | NOT cached by default |
| Client Router Cache (pages) | 30s staleTime | 0s staleTime (always fresh) |

#### Async Request APIs

All of these became async and must be awaited:
- `cookies()` → `await cookies()`
- `headers()` → `await headers()`
- `draftMode()` → `await draftMode()`
- `params` in all file conventions → `await params`
- `searchParams` in page.tsx → `await searchParams`

#### New Features in Next.js 15

```typescript
// next/form — prefetching + client-nav + progressive enhancement
import Form from 'next/form';
<Form action="/search">
  <input name="query" />
  <button type="submit">Search</button>
</Form>

// after() — stable (was unstable_after)
import { after } from 'next/server';
after(() => analytics.track('event'));

// instrumentation.ts — stable (remove experimental.instrumentationHook)
// next.config.ts — TypeScript native config (NextConfig type)
```

### Deprecated in Next.js 15 / 16

| Deprecated | Replacement |
|------------|-------------|
| `useFormState` (react-dom) | `useActionState` (react) |
| `images.domains` | `images.remotePatterns` |
| `serverComponentsExternalPackages` | `serverExternalPackages` |
| `bundlePagesExternals` | `bundlePagesRouterDependencies` |
| `export const runtime = 'experimental-edge'` | `export const runtime = 'edge'` |
| `next/legacy/image` | `next/image` |
| `@next/font` package | `next/font` |
| `middleware.ts` | `proxy.ts` |
| `revalidateTag(tag)` (single arg) | `revalidateTag(tag, profile)` |
| `experimental.ppr` | `cacheComponents: true` |
| `unstable_cache` | `use cache` directive |

### Version History Summary

| Version | Date | Key Addition |
|---------|------|-------------|
| **16.1.6 LTS** | Feb 2026 | Current LTS — Turbopack FS caching, bundle analyzer |
| **16.1** | Dec 2025 | Turbopack FS caching (dev), bundle analyzer, Node.js debug |
| **16.0** | Oct 2025 | Turbopack default, Cache Components, proxy.ts, React Compiler stable |
| **15.x** | Oct 2024 | Async APIs, caching defaults reversed, Turbopack dev stable, React 19 |
| **14.x** | Oct 2023 | PPR (experimental), partial prerendering, Server Actions stable |

### `next.config.ts` (Recommended Config)

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components (Next.js 16)
  cacheComponents: true,

  // React Compiler (Next.js 16)
  reactCompiler: false, // opt in when ready

  // Images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
    ],
  },

  // External packages (don't bundle)
  serverExternalPackages: ['some-native-module'],

  // Experimental FS caching for Turbopack
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
```
