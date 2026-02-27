# React + Vite — Developer Reference

> **Last Verified:** February 2026
> **Vite Version:** 7.x (requires Node.js 20.19+ or 22.12+)
> **React:** 19.x
> **React Router:** v7 (import from `react-router`)
> **Vitest:** 4.x
> **Documentation:** https://vite.dev/guide

---

## Table of Contents

1. [Setup](#1-setup)
2. [Project Structure](#2-project-structure)
3. [Routing](#3-routing)
4. [Code Splitting](#4-code-splitting)
5. [Environment Variables](#5-environment-variables)
6. [API Proxy](#6-api-proxy)
7. [Styling](#7-styling)
8. [Building & Optimization](#8-building--optimization)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [React + Vite vs Next.js](#11-react--vite-vs-nextjs)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Setup

### Create Project

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

Available official templates: `react`, `react-ts`, `react-swc`, `react-swc-ts`.

### vite.config.ts — Full Starter Config

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

> Use `fileURLToPath(new URL(..., import.meta.url))` — not `__dirname`. Vite 7 config files are ESM-only.

### TypeScript — tsconfig.json Path Mapping

TypeScript needs its own path mapping to match Vite's `resolve.alias`. Both must stay in sync.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@stores/*": ["src/stores/*"],
      "@lib/*": ["src/lib/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src"]
}
```

**Alternative — vite-tsconfig-paths plugin** (auto-syncs TS paths into Vite):

```bash
npm install -D vite-tsconfig-paths
```

```typescript
// vite.config.ts
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // No need for resolve.alias — plugin reads tsconfig.json paths
});
```

---

## 2. Project Structure

Recommended layout for a mid-to-large SPA:

```
my-app/
├── public/                  # Static assets — copied as-is, never bundled
│   └── favicon.ico
├── src/
│   ├── main.tsx             # Entry point — ReactDOM.createRoot + router
│   ├── App.tsx              # Root component (if not using router layout)
│   ├── routes/              # Route-level components (one file per route)
│   │   ├── RootLayout.tsx
│   │   ├── Home.tsx
│   │   ├── Dashboard/
│   │   │   ├── index.tsx
│   │   │   └── DashboardLayout.tsx
│   │   └── NotFound.tsx
│   ├── components/          # Shared UI components
│   │   ├── ui/              # Primitives (Button, Input, Modal)
│   │   └── layout/          # Nav, Sidebar, Footer
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Global state (Zustand, Jotai, etc.)
│   ├── lib/                 # Utilities, API clients, helpers
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── types/               # Shared TypeScript types/interfaces
│   │   └── index.ts
│   └── styles/              # Global CSS, theme tokens
│       └── globals.css
├── .env                     # Public env vars (committed)
├── .env.local               # Local overrides (gitignored)
├── .env.production          # Production overrides (committed, no secrets)
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json       # For vite.config.ts itself
└── index.html               # Vite entry HTML — <div id="root"> lives here
```

> `public/` files are served at `/`. Use `src/assets/` for files that get hashed and imported in code.

---

## 3. Routing

React Router v7 shipped as a unified package. Import everything from `react-router` — the `react-router-dom` package no longer exists separately.

```bash
npm install react-router
```

### Library Mode (Declarative — Recommended for Vite SPAs)

This is the standard approach: wrap your app in `BrowserRouter`, define routes with JSX.

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { RootLayout } from '@/routes/RootLayout';
import { Home } from '@/routes/Home';
import { Dashboard } from '@/routes/Dashboard';
import { Profile } from '@/routes/Profile';
import { NotFound } from '@/routes/NotFound';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile/:userId" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

### Data Router Mode (createBrowserRouter)

Use when you need route-level loaders, actions, or form handling. Enables parallel data fetching before render.

```typescript
// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import { RootLayout } from '@/routes/RootLayout';
import { Home } from '@/routes/Home';
import { projectLoader, ProjectDetail } from '@/routes/ProjectDetail';
import { NotFound } from '@/routes/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'projects/:projectId',
        loader: projectLoader,
        element: <ProjectDetail />,
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

// src/main.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

```typescript
// src/routes/ProjectDetail.tsx
import { useLoaderData, LoaderFunctionArgs } from 'react-router';

export async function projectLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/projects/${params.projectId}`);
  if (!res.ok) throw new Response('Not Found', { status: 404 });
  return res.json();
}

interface Project {
  id: string;
  name: string;
  description: string;
}

export function ProjectDetail() {
  const project = useLoaderData() as Project;
  return (
    <article>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
    </article>
  );
}
```

### Layout Routes (Outlet)

```typescript
// src/routes/RootLayout.tsx
import { Outlet, Link, NavLink } from 'react-router';

export function RootLayout() {
  return (
    <div className="app">
      <nav>
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Home
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
      </nav>
      <main>
        <Outlet />   {/* child routes render here */}
      </main>
    </div>
  );
}
```

### useNavigate and useParams

```typescript
import { useNavigate, useParams } from 'react-router';

function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  function handleBack() {
    navigate(-1);                     // browser back
    navigate('/dashboard');           // named route
    navigate('/login', { replace: true }); // replace history entry
  }

  return <div>User: {userId}</div>;
}
```

### Protected Routes (Auth Guard)

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Usage in router:
<Route element={<ProtectedRoute />}>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

### Lazy Loading with React.lazy + Suspense

```typescript
// src/main.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';

const Dashboard = lazy(() => import('@/routes/Dashboard'));
const Settings = lazy(() => import('@/routes/Settings'));
const AdminPanel = lazy(() => import('@/routes/AdminPanel'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
```

With `createBrowserRouter`, use the `lazy` property on the route object (React Router v7.5+):

```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'dashboard',
        lazy: {
          // Only the loader is fetched when navigating — component downloads separately
          loader: async () => (await import('@/routes/Dashboard')).loader,
          Component: async () => (await import('@/routes/Dashboard')).default,
        },
      },
    ],
  },
]);
```

---

## 4. Code Splitting

### Route-Based Splitting (Primary Strategy)

Lazy-load routes with `React.lazy`. Each route becomes a separate chunk.

```typescript
const Dashboard = lazy(() => import('@/routes/Dashboard'));
const Reports = lazy(() => import('@/routes/Reports'));
```

### Dynamic import()

For non-route splits — heavy libraries, charts, editors:

```typescript
async function loadChartLib() {
  const { Chart } = await import('chart.js');
  return Chart;
}

// In component:
const [Chart, setChart] = useState<typeof import('chart.js')['Chart'] | null>(null);
useEffect(() => {
  import('chart.js').then(({ Chart }) => setChart(() => Chart));
}, []);
```

### rollupOptions — Manual Chunks

Control vendor chunk grouping in `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

Function form (more control):

```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
      return 'vendor-react';
    }
    if (id.includes('@tanstack')) {
      return 'vendor-query';
    }
    return 'vendor'; // everything else in one vendor chunk
  }
},
```

### Bundle Analysis

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' }),
  ],
});
```

Run `vite build` — browser opens with interactive treemap.

---

## 5. Environment Variables

### Rules

- Variables prefixed with `VITE_` are embedded into the client bundle at build time.
- Everything else (`SECRET_KEY`, `DB_URL`) is **never** exposed to the browser.
- `import.meta.env` is the access point — not `process.env`.

```typescript
// ✓ accessible in browser
const apiUrl = import.meta.env.VITE_API_URL;
const appName = import.meta.env.VITE_APP_NAME;

// ✗ undefined at runtime — never prefix secrets with VITE_
const secret = import.meta.env.SECRET_KEY;
```

### Built-in Vite Variables

```typescript
import.meta.env.MODE        // "development" | "production" | "test"
import.meta.env.DEV         // true in development
import.meta.env.PROD        // true in production
import.meta.env.BASE_URL    // from vite.config.ts `base` option
import.meta.env.SSR         // always false in Vite SPA
```

### File Priority (highest to lowest)

```
.env.production.local   # highest — gitignored
.env.production         # committed, production only
.env.local              # gitignored, all modes
.env                    # committed, all modes — lowest
```

### Type-Safe Env with Zod

Validate at startup — crashes immediately if config is wrong rather than silently at runtime:

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_NAME: z.string().min(1),
  VITE_SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(import.meta.env);
```

```typescript
// Usage
import { env } from '@/lib/env';

const response = await fetch(`${env.VITE_API_URL}/users`);
```

Add a `vite-env.d.ts` file for TypeScript intellisense:

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 6. API Proxy

### Development Proxy (vite.config.ts)

Avoids CORS during development by proxying `/api` to your backend:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

With this config:
- `fetch('/api/users')` in dev → proxied to `http://localhost:3001/users`
- No CORS headers needed on the backend for local development

Multiple targets:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
  '/ws': {
    target: 'ws://localhost:3001',
    ws: true,
  },
  '/auth': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  },
},
```

### Production

The proxy only runs in `vite dev`. For production builds:

```typescript
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

In production, set `VITE_API_URL=https://api.example.com`. In dev, leave it unset — the proxy handles it.

---

## 7. Styling

### Tailwind CSS v4 (Vite Plugin)

```bash
npm install tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/styles/globals.css */
@import "tailwindcss";
```

No `tailwind.config.js` needed with v4's CSS-first configuration. Use `@theme` in CSS to customize.

### CSS Modules

Zero config — Vite handles `.module.css` natively:

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  background-color: var(--color-primary);
}

.button:hover {
  opacity: 0.9;
}
```

```typescript
// Button.tsx
import styles from './Button.module.css';

export function Button({ children }: { children: React.ReactNode }) {
  return <button className={styles.button}>{children}</button>;
}
```

Class names are locally scoped — no collision. TypeScript can infer module types with `vite-env.d.ts`.

### styled-components

```bash
npm install styled-components
npm install -D @types/styled-components babel-plugin-styled-components
```

Works without additional Vite config. For SSR or better dev names, add the babel plugin via `@vitejs/plugin-react`:

```typescript
plugins: [
  react({
    babel: { plugins: ['babel-plugin-styled-components'] },
  }),
],
```

---

## 8. Building & Optimization

### vite build

```bash
npm run build          # outputs to dist/
npx vite preview       # serves dist/ locally to verify build
```

### Build Config

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,                  // full source maps in dist/
    chunkSizeWarningLimit: 500,       // warn if chunk > 500 KB
    minify: 'esbuild',                // default — fast, good output
    // minify: 'terser',              // slower, slightly smaller (install terser separately)
    target: 'baseline-widely-available',  // Vite 7 default (Chrome 107, Safari 16, Firefox 104)
    rollupOptions: {
      output: {
        // Named chunk files for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
        },
      },
    },
  },
});
```

### Minification: esbuild vs terser

| | esbuild (default) | terser |
|---|---|---|
| Speed | Very fast | 10-20x slower |
| Output size | Slightly larger | Slightly smaller |
| Install | Built-in | `npm i -D terser` |
| Use when | Almost always | Size is critical and build time is not |

### Asset Handling

- Files `< 4 KB` → inlined as base64 data URLs (configurable via `build.assetsInlineLimit`)
- Files `>= 4 KB` → emitted with hash in filename
- Reference from `src/assets/` to get hashed URL: `import logo from '@/assets/logo.svg'`
- Files in `public/` → copied verbatim, referenced as `/logo.svg`

```typescript
// Explicit asset import
import logoUrl from '@/assets/logo.svg';
<img src={logoUrl} alt="Logo" />

// Raw string import
import svgContent from '@/assets/icon.svg?raw';

// URL-only import (no inline)
import workerUrl from '@/workers/compute.ts?url';
```

### Rolldown (Experimental — Vite 7)

Vite 7 ships experimental Rust-based bundler. Opt in by installing `rolldown-vite` instead of `vite`:

```bash
npm install rolldown-vite
```

Significant build time reduction for large projects. Not yet production-default — test before adopting.

---

## 9. Testing

### Vitest Setup

Vitest is Vite-native — it reuses your `vite.config.ts`, including plugins and aliases.

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Component Test

```typescript
// src/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button onClick={vi.fn()}>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

### MSW for API Mocking

```bash
npm install -D msw
```

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: '1', name: 'Alice' }]);
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// src/test/setup.ts
import { server } from './mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Testing with React Router

Wrap components that use router hooks in `MemoryRouter` or use `createMemoryRouter`:

```typescript
import { MemoryRouter, Route, Routes } from 'react-router';

render(
  <MemoryRouter initialEntries={['/profile/123']}>
    <Routes>
      <Route path="/profile/:userId" element={<Profile />} />
    </Routes>
  </MemoryRouter>
);
```

---

## 10. Deployment

Vite builds static files. Any static host works. The critical requirement: **the server must serve `index.html` for all routes** so React Router handles navigation client-side.

### Vercel

Zero config — Vercel auto-detects Vite. Add `vercel.json` only to configure the SPA fallback:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Netlify

```
# public/_redirects
/*    /index.html   200
```

Or `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Nginx

```nginx
server {
  listen 80;
  root /var/www/app/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache hashed assets aggressively
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
```

### Cloudflare Pages

Set build command to `npm run build`, output directory to `dist`. SPA routing works by default via Pages' built-in routing.

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### base URL (non-root deployment)

If deploying to a subdirectory (e.g., `https://example.com/app`):

```typescript
// vite.config.ts
export default defineConfig({
  base: '/app/',
});
```

```typescript
// src/main.tsx — match base in router
<BrowserRouter basename="/app">
```

---

## 11. React + Vite vs Next.js

| Scenario | Recommendation |
|---|---|
| Admin panel / dashboard | **React + Vite** — auth gate, no SEO needed |
| Embedded widget or microfrontend | **React + Vite** — full control over build output |
| Complex SPA with rich client state | **React + Vite** — simpler mental model, no server boundary |
| App behind auth (no public pages) | **React + Vite** — SSR provides no benefit |
| Marketing or content site | **Next.js** — SEO, metadata, static generation |
| Blog, docs, editorial | **Next.js** or Astro — SSG with excellent SEO |
| E-commerce storefront | **Next.js** — product pages need SEO and fast TTFB |
| Full-stack app (DB + UI in one repo) | **Next.js** — server actions, API routes collocated |
| Need server-side auth cookies | **Next.js** — server components read cookies directly |
| Bundle size is the top priority | **React + Vite** — only client code, no server runtime |
| Team already knows React Router | **React + Vite** — React Router v7 is mature and powerful |
| Real-time app (WebSocket-heavy) | **React + Vite** — easier to manage persistent connections |

**Rule of thumb:** If your users must log in before seeing anything meaningful, use React + Vite. If Google needs to index it, use Next.js.

---

## 12. Common Mistakes

| Mistake | Why it happens | Fix |
|---|---|---|
| Env var is `undefined` in the browser | Missing `VITE_` prefix | Rename `API_URL` → `VITE_API_URL`. Server-only vars intentionally stay unprefixed. |
| `/api` proxy works in dev but fails in production | `server.proxy` is dev-only | Set `VITE_API_URL` for prod. The proxy is never in the build output. |
| Hard refresh returns 404 | Server serves files, not the SPA | Configure `try_files $uri /index.html` (nginx), `_redirects` (Netlify), or `rewrites` (Vercel). |
| Importing from `react-router-dom` | v7 merged packages | Change all imports to `react-router`. The `-dom` package is gone. |
| Path alias `@/` resolves in app but not in tests | Vitest doesn't inherit alias by default | Add `resolve.alias` to `vite.config.ts` under `test` or use `vite-tsconfig-paths`. |
| `__dirname` is not defined in vite.config.ts | Vite 7 config files are ESM | Use `fileURLToPath(new URL('.', import.meta.url))` instead. |
| Large vendor chunk causes slow initial load | No code splitting | Add `manualChunks` to separate `react`, `react-dom`, and heavy libs. |
| `import.meta.env` values are strings | All env vars are strings | Parse booleans/numbers explicitly: `import.meta.env.VITE_FEATURE === 'true'`. |
| Component test fails because router hook used | No router context in test | Wrap with `MemoryRouter` or use `createMemoryRouter` in test setup. |
| `vite preview` serves stale build | `outDir` not cleared | Add `build.emptyOutDir: true` to always clean before build. |
| CSS Modules class names missing in test | jsdom doesn't process CSS | Mock CSS modules in Vitest config: `css: { modules: { classNameStrategy: 'non-scoped' } }`. |
| Build passes but runtime crashes on missing env | No validation at startup | Use Zod to validate `import.meta.env` at the top of `src/lib/env.ts`. |
