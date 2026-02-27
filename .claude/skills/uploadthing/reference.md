# Uploadthing Reference

Full API coverage for `uploadthing` v7.x and `@uploadthing/react` v7.x.
Last verified: February 2025. Always cross-reference at docs.uploadthing.com.

---

## 1. Setup

### Installation

```bash
npm install uploadthing @uploadthing/react
# or
pnpm add uploadthing @uploadthing/react
# or
bun add uploadthing @uploadthing/react
```

### Environment Variables

```env
# .env.local
UPLOADTHING_TOKEN=...   # Required — get from uploadthing.com/dashboard > API Keys
```

The token encodes your app ID and secret. A single `UPLOADTHING_TOKEN` replaces the older
`UPLOADTHING_SECRET` + `UPLOADTHING_APP_ID` pair used before v6.

### Project Structure (Next.js App Router)

```
app/
  api/
    uploadthing/
      core.ts        ← File router definition
      route.ts       ← API route handler (GET + POST)
  layout.tsx         ← Add NextSSRPlugin here
utils/
  uploadthing.ts     ← Type-safe component exports
```

### Tailwind Configuration

Wrap your Tailwind config with the `withUt` helper so UploadThing component styles
are included in your purge scan:

```typescript
// tailwind.config.ts
import { withUt } from "uploadthing/tw";

export default withUt({
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
});
```

For Tailwind v4 (`@import "tailwindcss"`), add the UploadThing source glob directly:

```css
/* globals.css */
@import "tailwindcss";
@source "../node_modules/@uploadthing/react/dist";
```

---

## 2. File Router

The file router is the core of UploadThing. Each key on the router object is an "endpoint"
that your frontend components target.

### createUploadthing

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();
```

`createUploadthing()` returns a `FileRouteBuilder` factory (the `f` helper). The import
path changes per framework:

| Framework | Import path |
|-----------|-------------|
| Next.js App Router | `"uploadthing/next"` |
| Next.js Pages Router | `"uploadthing/next-legacy"` |
| Astro | `"uploadthing/astro"` |
| SvelteKit | `"uploadthing/server"` + `createServerHandler` |
| Express | `"uploadthing/express"` |
| Fastify | `"uploadthing/fastify"` |

### FileRoute with f() Helper

```typescript
export const ourFileRouter = {
  // Single image, max 4MB
  profilePhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => { /* ... */ })
    .onUploadComplete(async ({ metadata, file }) => { /* ... */ }),

  // Multiple file types
  documentUploader: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    "image/png": { maxFileSize: "8MB" },
    "image/jpeg": { maxFileSize: "8MB" },
  })
    .middleware(async ({ req }) => { /* ... */ })
    .onUploadComplete(async ({ metadata, file }) => { /* ... */ }),

  // Video with larger limit
  videoUploader: f({ video: { maxFileSize: "256MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => { /* ... */ })
    .onUploadComplete(async ({ metadata, file }) => { /* ... */ }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

Always export `OurFileRouter` as a type — it threads type safety from the server
router into your client components.

### Middleware

Middleware runs on your server before the upload begins. Use it to authenticate,
authorize, and attach metadata.

```typescript
import { auth } from "@/lib/auth"; // your auth solution
import { UploadThingError } from "uploadthing/server";

profilePhoto: f({ image: { maxFileSize: "4MB" } })
  .middleware(async ({ req }) => {
    // req is the raw Request object
    const session = await auth.getSession(req);

    // Throw UploadThingError to reject with a message surfaced to the client
    if (!session?.user) throw new UploadThingError("Unauthorized");

    // Return value becomes `metadata` in onUploadComplete
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      plan: session.user.plan,
    };
  })
```

**Middleware rules:**
- Must return a plain JSON-serializable object (the metadata)
- Throwing `UploadThingError` sends the message to the client
- Throwing any other error sends a generic error to the client
- Runs before presigned URLs are generated — file never touches S3 if this throws

### onUploadComplete Callback

Runs on your server after the file is fully uploaded to storage.

```typescript
.onUploadComplete(async ({ metadata, file }) => {
  // file properties:
  // file.key        — unique file key (use for UTApi ops)
  // file.ufsUrl     — permanent CDN URL (use this, not url)
  // file.url        — alias for ufsUrl
  // file.name       — original filename
  // file.size       — size in bytes
  // file.type       — MIME type
  // file.customId   — custom ID if set

  // metadata is whatever middleware returned
  await db.insert(userFiles).values({
    userId: metadata.userId,
    fileKey: file.key,
    fileUrl: file.ufsUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });

  // Return value is sent to the client's onClientUploadComplete callback
  return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
})
```

### Metadata Types

```typescript
// Type the return of onUploadComplete for client inference:
export type UploadCompleteResponse = {
  uploadedBy: string;
  fileUrl: string;
};

// In your component, res is typed as UploadCompleteResponse[]:
onClientUploadComplete={(res) => {
  const { fileUrl, uploadedBy } = res[0]; // fully typed
}}
```

---

## 3. Next.js API Route

### App Router (createRouteHandler)

```typescript
// app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  // Optional config overrides (normally from env):
  // config: { token: process.env.UPLOADTHING_TOKEN }
});
```

The route must live at `/api/uploadthing` (or match the path you configure). UploadThing
calls back to this route to coordinate presigned URLs and notify upload completion.

### SSR Hydration (Root Layout)

Add `NextSSRPlugin` to your root layout to inject router config into the HTML. Without it,
components show a loading state until the client fetches the config.

```typescript
// app/layout.tsx
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "~/app/api/uploadthing/core";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        {children}
      </body>
    </html>
  );
}
```

**Next.js 15 with `ppr` or `dynamicIO`:** Wrap in Suspense and opt out of dynamic:

```typescript
import { connection } from "next/server";
import { Suspense } from "react";

async function UTPlugin() {
  await connection();
  return <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <UTPlugin />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
```

---

## 4. React Components

### Component Exports Setup

Generate type-safe components bound to your router before using them:

```typescript
// utils/uploadthing.ts
import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { OurFileRouter } from "~/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

### UploadButton

A button that opens the native file picker. Default mode: `auto` (uploads immediately
on file selection).

```typescript
"use client";
import { UploadButton } from "~/utils/uploadthing";

export function AvatarUploader() {
  return (
    <UploadButton
      endpoint="profilePhoto"           // must match a key in your FileRouter
      input={{ userId: "user_123" }}    // passed to middleware as `input`
      onClientUploadComplete={(res) => {
        // res: Array<{ key, url, name, size, ...returnValue from onUploadComplete }>
        console.log("Uploaded:", res[0].url);
      }}
      onUploadError={(error: Error) => {
        console.error("Upload error:", error.message);
      }}
      onUploadBegin={(fileName) => {
        console.log("Starting upload:", fileName);
      }}
      onUploadProgress={(progress) => {
        console.log("Progress:", progress); // 0-100
      }}
      disabled={false}
      config={{
        mode: "auto",          // "auto" | "manual"
        appendOnPaste: false,  // allow paste from clipboard
      }}
      appearance={{
        button: "bg-blue-600 text-white rounded-lg px-4 py-2",
        allowedContent: "text-gray-500 text-sm",
        container: "flex flex-col items-center gap-2",
      }}
    />
  );
}
```

### UploadDropzone

A drag-and-drop zone. Default mode: `manual` (shows a separate upload button after
files are dropped).

```typescript
"use client";
import { UploadDropzone } from "~/utils/uploadthing";

export function DocumentDropzone() {
  return (
    <UploadDropzone
      endpoint="documentUploader"
      onDrop={(acceptedFiles) => {
        // fires when files are dropped, before upload starts
        console.log("Dropped:", acceptedFiles);
      }}
      onClientUploadComplete={(res) => {
        alert(`${res.length} file(s) uploaded`);
      }}
      onUploadError={(error: Error) => {
        alert(`Upload failed: ${error.message}`);
      }}
      config={{ mode: "auto" }} // override to upload immediately on drop
      appearance={{
        container: "border-2 border-dashed border-gray-300 rounded-xl p-8",
        uploadIcon: "text-gray-400",
        label: "text-gray-600 font-medium",
        allowedContent: "text-gray-400 text-xs",
        button: "bg-indigo-600 text-white rounded mt-4",
      }}
    />
  );
}
```

### Appearance API

All component slots accept Tailwind classes (string), CSS properties (object),
or a callback that receives state and returns either:

```typescript
appearance={{
  button({ ready, isUploading }) {
    return `rounded px-4 py-2 ${
      isUploading ? "bg-gray-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
    }`;
  },
  container: { padding: "2rem", border: "2px dashed #e5e7eb" },
  allowedContent: "hidden",  // hide the "Allowed: image (up to 4MB)" text
}}
```

Available slots: `button`, `container`, `uploadIcon`, `label`, `allowedContent`.

---

## 5. useUploadThing Hook

For custom upload UI that doesn't fit `UploadButton` or `UploadDropzone`.

### Setup

```typescript
// utils/uploadthing.ts (add to the existing export file)
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "~/app/api/uploadthing/core";

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

### Usage

```typescript
"use client";
import { useState } from "react";
import { useUploadThing } from "~/utils/uploadthing";

export function CustomUploader() {
  const [progress, setProgress] = useState(0);

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => { console.log("Done:", res); setProgress(0); },
    onUploadError: (err) => console.error("Error:", err.message),
    onUploadProgress: (p) => setProgress(p),
    uploadProgressGranularity: "fine", // "all" | "fine" | "coarse"
  });

  return (
    <div>
      <input type="file" onChange={(e) => startUpload(Array.from(e.target.files ?? []))} />
      {isUploading && <div style={{ width: `${progress}%` }} className="h-1 bg-blue-600" />}
    </div>
  );
}
```

### Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `startUpload` | `(files: File[], input?: TInput) => Promise<UploadedFileResponse[] \| undefined>` | Initiates upload |
| `isUploading` | `boolean` | True while upload is in progress |
| `routeConfig` | `ExpandedRouteConfig` | Permitted file types, sizes, and counts for this endpoint |

### Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onClientUploadComplete` | `(res: UploadedFileResponse[]) => void` | — | Fires when complete |
| `onUploadError` | `(err: UploadThingError) => void` | — | Fires on failure |
| `onUploadBegin` | `({ file: string }) => void` | — | Fires per file before upload |
| `onUploadProgress` | `(progress: number) => void` | — | Progress 0-100 |
| `onUploadAborted` | `() => void` | — | Fires when aborted via AbortSignal |
| `uploadProgressGranularity` | `"all" \| "fine" \| "coarse"` | `"coarse"` | Event frequency (all/1%/10% increments) |
| `headers` | `HeadersInit \| (() => HeadersInit)` | — | Additional headers for presigned URL request |
| `signal` | `AbortSignal` | — | Abort signal to cancel in-flight uploads |

---

## 6. Upload Progress and States

### onUploadProgress

Fires continuously during the upload to S3. Progress is 0-100 as a number.

```typescript
const { startUpload, isUploading } = useUploadThing("imageUploader", {
  onUploadProgress: (progress) => {
    // progress: number (0-100)
    setProgress(progress);
  },
});
```

### UploadFileResponse Type

The `res` array from `onClientUploadComplete` contains:

```typescript
type UploadFileResponse<TServerOutput> = {
  name: string;           // original filename
  size: number;           // bytes
  key: string;            // UploadThing file key (use for UTApi ops)
  url: string;            // CDN URL (same as ufsUrl)
  ufsUrl: string;         // Unified File Storage URL — use this
  customId: string | null;
  type: string;           // MIME type
  serverData: TServerOutput; // return value from onUploadComplete
};
```

`serverData` is typed from what your `onUploadComplete` returns — this is why
exporting `OurFileRouter` as a type matters.

### Upload Lifecycle

```
User selects file
  → middleware() runs (auth check, return metadata)
  → Presigned URLs generated
  → onUploadBegin fires
  → File uploaded to S3 (onUploadProgress fires)
  → UploadThing notifies your server
  → onUploadComplete() runs (save to DB)
  → onClientUploadComplete fires (update UI)
```

---

## 7. File Validation

File types are validated server-side. The `f()` helper accepts an object where keys
are file categories or MIME types.

### Built-in Categories

```typescript
f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
f({ video: { maxFileSize: "256MB", maxFileCount: 1 } })
f({ audio: { maxFileSize: "64MB", maxFileCount: 1 } })
f({ pdf: { maxFileSize: "32MB", maxFileCount: 5 } })
f({ text: { maxFileSize: "1MB" } })
f({ blob: { maxFileSize: "1GB" } })  // accepts any file type
```

### Specific MIME Types

```typescript
f({
  "image/png": { maxFileSize: "4MB" },
  "image/jpeg": { maxFileSize: "4MB" },
  "image/webp": { maxFileSize: "4MB" },
  "application/pdf": { maxFileSize: "16MB" },
  "text/csv": { maxFileSize: "512KB" },
})
```

### Validator Options

| Option | Type | Description |
|--------|------|-------------|
| `maxFileSize` | `FileSize` | Max size per file — e.g. `"4MB"`, `"256MB"`, `"1GB"` |
| `maxFileCount` | `number` | Max files per upload (default: 1) |
| `minFileCount` | `number` | Minimum files required per upload (default: 1) |
| `acl` | `"public-read" \| "private"` | Access control (default: `"public-read"`) |
| `additionalProperties` | `object` | Pass custom metadata from client to middleware |

### Supported Size Strings

```
"512B", "1KB", "2KB", "4KB", "8KB", "16KB", "32KB", "64KB", "128KB", "256KB", "512KB",
"1MB", "2MB", "4MB", "8MB", "16MB", "32MB", "64MB", "128MB", "256MB", "512MB",
"1GB", "2GB", "4GB", "8GB", "16GB"
```

Maximum allowed size depends on your plan (see Pricing section).

### Multiple Types, Shared Options

```typescript
f(["image", "pdf"])  // shorthand — uses defaults for both
```

---

## 8. Server-Side UTApi

`UTApi` provides server-side file management. Instantiate it once (e.g., in a lib file).

### Instantiation

```typescript
// lib/uploadthing.ts
import { UTApi } from "uploadthing/server";

export const utapi = new UTApi();
// Reads UPLOADTHING_TOKEN from env automatically

// With explicit config:
export const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
  logLevel: "Error", // "Error" | "Warning" | "Info" | "Debug" | "Trace"
  defaultKeyType: "fileKey", // "fileKey" | "customId"
});
```

### listFiles

```typescript
const { files, hasMore } = await utapi.listFiles({ limit: 500, offset: 0 });
// files: Array<{ key, id, status, name, customId, ... }>
// Paginate: loop incrementing offset by 500 while hasMore is true
```

### deleteFiles

```typescript
await utapi.deleteFiles("file_key_abc123");
await utapi.deleteFiles(["key_1", "key_2"]);
await utapi.deleteFiles("my-custom-id", { keyType: "customId" });
```

### renameFiles

```typescript
await utapi.renameFiles({ fileKey: "file_key_abc123", newName: "photo.jpg" });
await utapi.renameFiles([
  { fileKey: "key_1", newName: "doc-1.pdf" },
  { fileKey: "key_2", newName: "doc-2.pdf" },
]);
```

### generateSignedURL (v7.5+)

Generates a signed URL locally — no extra API call.

```typescript
const { ufsUrl } = await utapi.generateSignedURL("file_key_abc123", {
  expiresIn: 3600, // seconds (max: 604800 = 7 days) or "1 hour"
});
```

### uploadFiles (Server-Side)

Upload from your server without the file router — useful for pipelines/jobs:

```typescript
const { data, error } = await utapi.uploadFiles(file, {
  metadata: { userId: "user_123" },
  contentDisposition: "inline", // "inline" | "attachment"
});
if (error) throw new Error(error.message);
console.log(data.ufsUrl);
```

### uploadFilesFromUrl

Download a remote URL and store it in UploadThing:

```typescript
const { data } = await utapi.uploadFilesFromUrl("https://example.com/image.jpg", {
  metadata: { source: "import" },
  acl: "private",
});
// Pass an array for multiple URLs
```

### updateACL

```typescript
await utapi.updateACL("file_key_abc123", "private");
await utapi.updateACL(["key_1", "key_2"], "public-read");
await utapi.updateACL("my-id", "private", { keyType: "customId" });
```

---

## 9. Database Integration

Save the file key and URL in `onUploadComplete`. Always store `file.key` so you can
delete from storage later via `UTApi`.

```typescript
// onUploadComplete — save to DB
.onUploadComplete(async ({ metadata, file }) => {
  await db.insert(userFiles).values({
    userId: metadata.userId,   // from middleware return
    fileKey: file.key,         // store this — needed for UTApi.deleteFiles()
    fileUrl: file.ufsUrl,      // canonical CDN URL
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
  return { fileUrl: file.ufsUrl }; // sent to client onClientUploadComplete
})
```

### Drizzle Schema (PostgreSQL)

```typescript
export const userFiles = pgTable("user_files", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileKey: text("file_key").notNull().unique(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
```

### Delete Pattern

Always clean up storage when removing a DB record:

```typescript
// Verify ownership, then:
await utapi.deleteFiles(file.fileKey);
await db.delete(userFiles).where(eq(userFiles.fileKey, fileKey));
```

---

## 10. Pricing and Limits

Usage-based pricing launched January 30, 2025. Verify current details at
**uploadthing.com/pricing** — plans and limits change.

### Plans (as of February 2025)

| Plan | Price | Storage | Max File Size | Notes |
|------|-------|---------|---------------|-------|
| **Free** | $0/mo | 2GB total | 4MB per file | No credit card required |
| **100GB App** | $10/mo | 100GB total | 256MB per file | Fixed pricing |
| **Usage Based** | $25/mo base | 250GB included | 2GB per file | +$0.08/GB over 250GB |

**No charges for:** bandwidth, seats, API requests, or number of files — only total bytes stored.

**Token security (2025):** Classic tokens revoked. Granular tokens expire after 90 days (2FA required to create). Update CI/CD secrets before they expire.

---

## 11. Common Mistakes

**1. Callback URL not public in local dev**
UploadThing must POST back to your server — it can't reach `localhost`.
```bash
npx ngrok http 3000
# then: UPLOADTHING_URL=https://your-url.ngrok.io in .env.local
```

**2. Using S3 directly instead of UTApi**
UploadThing abstracts S3 — no bucket access. Use `UTApi` for all server-side file ops.
```typescript
// Wrong: const s3 = new S3Client(); await s3.deleteObject(...)
await utapi.deleteFiles(fileKey); // Correct
```

**3. Assuming client-side validation is enforced**
`maxFileSize`/`maxFileCount` are validated server-side. Client UI is informational only — never trust client-sent file metadata.

**4. Using `getSignedURL` instead of `generateSignedURL`**
`getSignedURL` (deprecated v7.5) makes an extra API round-trip. Use `generateSignedURL`.
```typescript
const { ufsUrl } = await utapi.generateSignedURL(fileKey, { expiresIn: 3600 });
```

**5. Missing `NextSSRPlugin` in root layout**
Without it, upload components show a loading flash on hydration.
```typescript
// app/layout.tsx — inside <body>:
<NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
```

**6. Forgetting to export `OurFileRouter` as a type**
Type safety breaks without it.
```typescript
export type OurFileRouter = typeof ourFileRouter; // core.ts
export const UploadButton = generateUploadButton<OurFileRouter>(); // utils/uploadthing.ts
```

**7. Storing `file.url` instead of `file.ufsUrl`**
Both point to the same URL now, but `ufsUrl` (Unified File Storage) is the stable canonical field. Always store `ufsUrl`.

**8. Not handling `onUploadError` on the client**
Failures are silent without it. Always wire up the error callback.
```typescript
onUploadError={(err) => toast.error(`Upload failed: ${err.message}`)}
```

**9. Importing `UTApi` in a client component or Edge Runtime**
`UTApi` is Node.js only. Don't import it in `"use client"` components or Edge middleware.
```typescript
// Correct — Server Action or API route only:
"use server";
import { utapi } from "~/lib/uploadthing";
```

**10. Not cleaning up storage when deleting DB records**
Files count against your plan even after the DB row is gone. Always pair DB deletes with `utapi.deleteFiles()`.
```typescript
await utapi.deleteFiles(file.fileKey);
await db.delete(userFiles).where(eq(userFiles.id, fileId));
```
