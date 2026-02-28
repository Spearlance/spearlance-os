

## Admin CSV Export Page

Build an admin-only page with an Edge Function that exports database tables as CSV files, with an option to download all tables at once in a ZIP.

---

### 1. Fix Existing Build Error

**File: `supabase/functions/set-asset-share-password/index.ts` (line 74)**

Cast `err` to `Error` type to fix the TypeScript error:
```typescript
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { ... });
}
```

---

### 2. Create Edge Function: `export-csv`

**File: `supabase/functions/export-csv/index.ts`**

- Authenticates the caller and verifies they have `admin` role via the `profiles` table
- Accepts two modes:
  - `POST { table: "table_name" }` -- returns a single CSV
  - `POST { tables: ["table1", "table2", ...] }` or `POST { all: true }` -- returns a ZIP containing one CSV per table
- Queries `information_schema.tables` to get the list of public tables
- For each table, runs `SELECT * FROM <table>` using the service role client, converts rows to CSV
- For ZIP mode, uses Deno's built-in compression or a lightweight ZIP library to bundle all CSVs
- Whitelists only `public` schema tables; sanitizes table names to prevent injection
- Returns appropriate `Content-Type` and `Content-Disposition` headers

**Config: `supabase/config.toml`**
```toml
[functions.export-csv]
verify_jwt = false
```

---

### 3. Create Admin Page: `src/pages/admin/ExportData.tsx`

- Admin access check (same pattern as other admin pages)
- Fetches available table list from the edge function on load
- UI with:
  - Checkbox list of all tables (with "Select All" toggle)
  - "Download Selected as ZIP" button (primary action)
  - Individual "Download CSV" button per table row
- Uses `fetch` to call the edge function, then triggers a browser download via `URL.createObjectURL`

---

### 4. Register Route in `App.tsx`

Add route:
```tsx
<Route path="/admin/export-data" element={<MainLayout><ExportData /></MainLayout>} />
```

---

### 5. Add Navigation Link

Add an "Export Data" link in the admin section of the sidebar or admin page, using a `Download` icon from lucide-react.

---

### Summary

| Step | File(s) | What |
|------|---------|------|
| Fix build error | `set-asset-share-password/index.ts` | Type-cast catch variable |
| Edge function | `supabase/functions/export-csv/index.ts` | CSV/ZIP generation with admin auth |
| Config | `supabase/config.toml` | Register new function |
| Admin page | `src/pages/admin/ExportData.tsx` | Table selection UI + download |
| Route | `src/App.tsx` | Register `/admin/export-data` |
| Navigation | Sidebar/Admin page | Add link to export page |

