---
model: claude-sonnet-4-6
name: uploadthing
description: Use when implementing file uploads with Uploadthing — type-safe uploads, image processing, or file management in Next.js or React applications. Also use when choosing a file upload solution or handling user-generated content.
---

# Uploadthing

## Overview

Type-safe file uploads for TypeScript. Handles presigned URLs, S3 ingestion, and CDN delivery — no S3 config. SDK: `uploadthing` v7.x + `@uploadthing/react` v7.x.

## Quick Reference

| Item | Value |
|------|-------|
| **Install** | `npm install uploadthing @uploadthing/react` |
| **Env var** | `UPLOADTHING_TOKEN=...` (from dashboard) |
| **API route** | `app/api/uploadthing/route.ts` |
| **File router** | `app/api/uploadthing/core.ts` |
| **Dashboard** | `uploadthing.com/dashboard` |

## File Router (core.ts)

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      const user = await getUser(req); // your auth
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id }; // passed to onUploadComplete
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.insert(files).values({ url: file.ufsUrl, userId: metadata.userId });
      return { fileUrl: file.ufsUrl }; // returned to client
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

## Route Handler + Component Exports

```typescript
// app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });

// utils/uploadthing.ts — type-safe component exports
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "~/app/api/uploadthing/core";
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// In a client component:
<UploadButton
  endpoint="imageUploader"
  onClientUploadComplete={(res) => console.log(res)}
  onUploadError={(err) => alert(err.message)}
/>
```

## File Validators

```typescript
f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })       // images only
f({ video: { maxFileSize: "256MB", maxFileCount: 1 } })      // video
f({ pdf: { maxFileSize: "32MB" } })                          // PDFs
f({ "image/png": { maxFileSize: "2MB" }, pdf: {} })          // multiple types
f({ blob: { maxFileSize: "1GB" } })                          // any file type
```

## Pricing (as of Jan 2025 — verify at uploadthing.com/pricing)

| Plan | Price | Storage | Notes |
|------|-------|---------|-------|
| Free | $0 | 2GB | Up to 4MB/file |
| 100GB App | $10/mo | 100GB | Up to 256MB/file |
| Usage Based | $25/mo base | 250GB included | +$0.08/GB, no bandwidth fees |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Callback URL not public in dev | Use ngrok — UploadThing must POST back to your server |
| Calling S3 directly | Never — use `UTApi` for all server-side file ops |
| Client-side file validation | UT validates server-side; client UI is informational only |
| `getSignedURL` instead of `generateSignedURL` | `getSignedURL` is deprecated since v7.5 |
| Missing `NextSSRPlugin` | Add to root layout to avoid loading flash on hydration |

See reference.md for full API coverage.
