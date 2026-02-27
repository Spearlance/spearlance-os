---
model: claude-sonnet-4-6
name: s3-cloudflare-r2
description: Use when working with AWS S3 or Cloudflare R2 for object storage — file uploads, presigned URLs, bucket policies, or CDN integration. Also use when choosing between S3 and R2 or implementing direct-to-storage uploads.
---

# S3 / Cloudflare R2

## Overview

Both use the same SDK: `@aws-sdk/client-s3`. R2 is S3-compatible — swap the endpoint, keep the code.

| Item | Value |
|------|-------|
| **SDK** | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` |
| **S3 endpoint** | AWS regional (e.g. `https://s3.us-east-1.amazonaws.com`) |
| **R2 endpoint** | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| **Node.js** | 20.x+ (v18 dropped from SDK in Jan 2026) |

## S3 vs R2 — Choose One

| Factor | S3 | R2 |
|--------|----|----|
| Storage price | $0.023/GB/mo | $0.015/GB/mo |
| Egress price | $0.09/GB (after 100GB free) | **$0 always** |
| Free tier | 5 GB storage, 15 GB egress | 10 GB storage, 10M reads, 1M writes |
| Storage classes | 8 tiers (IA, Glacier, etc.) | Single tier |
| Object Lock | Yes | No |
| Versioning | Yes | No (paid tier roadmap) |
| Global CDN | CloudFront (+cost) | Custom domain (free egress) |
| Ecosystem | Mature, vast tooling | Growing, S3-compatible |

**Pick R2** when egress dominates cost (media, downloads, SaaS assets).
**Pick S3** when you need Object Lock, versioning, Lambda triggers, or Glacier archival.

## Client Setup

```typescript
// S3
import { S3Client } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: process.env.AWS_REGION! });

// R2
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

## Presigned URL (upload)

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const url = await getSignedUrl(
  client, // s3 or r2
  new PutObjectCommand({ Bucket: "my-bucket", Key: "uploads/file.png", ContentType: "image/png" }),
  { expiresIn: 3600 }
);
// Frontend: fetch(url, { method: "PUT", body: file })
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using root AWS keys | Use IAM roles (EC2/Lambda) or IAM user with least-privilege policy |
| Presigned URLs used after expiry | Set `expiresIn` conservatively; generate fresh URL per upload |
| Missing CORS on direct uploads | Configure `AllowedMethods: ["PUT"]` and `AllowedHeaders: ["*"]` |
| R2 with unsupported S3 features | Check compatibility table — no ObjectLambda, no Object Lock |
| `forcePathStyle` not set for R2 | Not needed — R2 handles path style automatically |
| Streaming body not consumed | Always `await Body.transformToByteArray()` or pipe the stream |

See reference.md for full API coverage.
