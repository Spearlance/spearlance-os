---
model: claude-sonnet-4-6
name: react-vite
description: Use when building React SPAs with Vite — project setup, routing, bundling, or development server configuration. Also use when a project needs React without Next.js server-side features, or when building dashboards, admin panels, or embedded apps.
---

# React + Vite

Vite (v7.x, 2026) + React 19.x. Pairs with React Router v7 and Vitest — all sharing one config. Node.js 20.19+ required.

| Item | Value |
|------|-------|
| **React Router** | v7 — import from `react-router` (no `-dom` suffix) |
| **Vitest** | 4.x — shares `vite.config.ts` |
| **Docs** | https://vite.dev/guide |

## Project Creation

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install && npm run dev
```

## Path Aliases (vite.config.ts + tsconfig.json)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

```json
// tsconfig.json (inside compilerOptions)
{
  "baseUrl": ".",
  "paths": { "@/*": ["src/*"] }
}
```

## React Router v7 (Library Mode)

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { RootLayout } from './routes/RootLayout';
import { Home } from './routes/Home';
import { Dashboard } from './routes/Dashboard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="dashboard/*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

## Environment Variables

```typescript
// Only VITE_ prefix is exposed to the browser
const apiUrl = import.meta.env.VITE_API_URL;  // ✓ accessible
const secret = import.meta.env.SECRET_KEY;     // ✗ undefined at runtime
```

```
.env                  # always loaded
.env.local            # gitignored, always loaded
.env.production       # loaded on `vite build`
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Env var not exposed in browser | Prefix with `VITE_` — anything else is server-only |
| Proxy stops working in production | `server.proxy` is dev-only — configure API URL via `VITE_API_URL` for prod |
| Page 404 on hard refresh | Server must serve `index.html` for all routes — configure SPA fallback |
| `react-router-dom` import | v7 ships as `react-router` — one package, no `-dom` suffix |
| Missing `@vitejs/plugin-react` | Without the plugin, HMR breaks and JSX won't transform |
| Path alias works in app but not tests | Add `resolve.alias` to vitest config or share `vite.config.ts` |

See reference.md for full API coverage.
