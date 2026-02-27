# S3 / Cloudflare R2 Developer Reference

> **Last Updated:** February 2026
> **SDK:** `@aws-sdk/client-s3` v3.x (modular)
> **Node.js:** 20.x+ required (Node 18 EOL'd from SDK in January 2026)

---

## Table of Contents

1. [S3 Setup](#s3-setup)
2. [R2 Setup](#r2-setup)
3. [Basic Operations](#basic-operations)
4. [Presigned URLs](#presigned-urls)
5. [Direct Upload Pattern](#direct-upload-pattern)
6. [CORS Configuration](#cors-configuration)
7. [Bucket Policies](#bucket-policies)
8. [CDN Integration](#cdn-integration)
9. [Multipart Upload](#multipart-upload)
10. [S3 vs R2 Comparison](#s3-vs-r2-comparison)
11. [Common Mistakes](#common-mistakes)

---

## S3 Setup

### Install

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Both packages required — presigner is separate in v3's modular architecture.

### Environment Variables

```bash
# .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# In production: use IAM roles — these vars are NOT needed on EC2/Lambda/ECS
# The SDK auto-discovers credentials from the instance metadata service
```

### S3Client Config

```typescript
import { S3Client } from "@aws-sdk/client-s3";

// Basic — credentials from environment or IAM role
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

// Explicit credentials (local dev / CI): pass credentials: { accessKeyId, secretAccessKey }
// With retry config: maxAttempts: 3 and requestHandler: { requestTimeout: 30_000 }
```

### TypeScript Types

```typescript
import type {
  PutObjectCommandInput,
  GetObjectCommandOutput,
  ListObjectsV2CommandOutput,
  _Object,                     // individual object in list results
  CommonPrefix,                // "folder" prefix in list results
  CompletedPart,               // multipart upload part
} from "@aws-sdk/client-s3";

// Typed wrapper for upload params
interface UploadParams {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
}
```

---

## R2 Setup

R2 exposes an S3-compatible API. You use the **same `@aws-sdk/client-s3` package** — no separate R2 SDK needed.

### Credentials from R2 Dashboard

1. Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Create token → permissions: Object Read & Write (or Read only for CDN)
3. Note the **Account ID** from the right sidebar

```bash
# .env
R2_ACCOUNT_ID=abc123def456...
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=my-bucket
```

### R2Client Config

```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",   // R2 requires "auto" as the region value
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

### One Client, Two Backends

Use a factory function — read `STORAGE_BACKEND` env var and return the right client. Both `storage` and `BUCKET` export from a single `lib/storage.ts` module so all commands stay backend-agnostic.

---

## Basic Operations

All commands work identically on S3 and R2 unless noted.

### PutObject — Upload a File

```typescript
import { PutObjectCommand } from "@aws-sdk/client-s3";

async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  await storage.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Optional: user-defined metadata (lowercase keys only)
      Metadata: {
        "uploaded-by": "user-123",
        "original-name": "photo.jpg",
      },
      // Optional: cache control for CDN
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

// Usage
await uploadFile("avatars/user-123.jpg", imageBuffer, "image/jpeg");
```

### GetObject — Download / Stream

```typescript
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";

async function getFileAsBuffer(key: string): Promise<Buffer> {
  const response: GetObjectCommandOutput = await storage.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );

  if (!response.Body) throw new Error(`Object not found: ${key}`);

  // transformToByteArray() is the correct v3 method — do NOT use .text() for binary
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

// Stream to HTTP response (Node.js)
// Body is a ReadableStream in v3 — convert with Readable.fromWeb() then pipe
async function streamToResponse(key: string, res: ServerResponse): Promise<void> {
  const { Body, ContentType, ContentLength } = await storage.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  if (!Body) throw new Error("Empty body");
  res.setHeader("Content-Type", ContentType ?? "application/octet-stream");
  if (ContentLength) res.setHeader("Content-Length", ContentLength);
  const { Readable } = await import("stream");
  Readable.fromWeb(Body.transformToWebStream() as any).pipe(res);
}
```

### DeleteObject

```typescript
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Single delete
await storage.send(
  new DeleteObjectCommand({ Bucket: BUCKET, Key: "avatars/user-123.jpg" })
);

// Batch delete (up to 1000 objects per request)
await storage.send(
  new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: [
        { Key: "uploads/a.jpg" },
        { Key: "uploads/b.jpg" },
        { Key: "uploads/c.jpg" },
      ],
      Quiet: true, // suppress success responses, only return errors
    },
  })
);
```

### ListObjectsV2 — List Files

```typescript
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { _Object } from "@aws-sdk/client-s3";

async function listFiles(prefix: string): Promise<_Object[]> {
  const results: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await storage.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,           // "folder/" path simulation
        MaxKeys: 1000,            // max per request
        Delimiter: "/",           // treat "/" as folder separator
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) results.push(...response.Contents);
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return results;
}
```

### HeadObject — Check Existence / Metadata

```typescript
import { HeadObjectCommand, NotFound } from "@aws-sdk/client-s3";

async function fileExists(key: string): Promise<boolean> {
  try {
    await storage.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err instanceof NotFound) return false;
    throw err; // re-throw unexpected errors
  }
}

async function getFileMetadata(key: string) {
  const response = await storage.send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: key })
  );
  return {
    size: response.ContentLength,
    contentType: response.ContentType,
    lastModified: response.LastModified,
    etag: response.ETag,
    metadata: response.Metadata, // user-defined metadata
  };
}
```

---

## Presigned URLs

Presigned URLs grant temporary, scoped access to a specific object without requiring the caller to have AWS credentials.

### Generate Presigned PUT URL (upload)

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

interface PresignedUploadUrl {
  url: string;
  key: string;
  expiresAt: Date;
}

async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<PresignedUploadUrl> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // ContentType in the command MUST match what the client sends
    // Mismatch = SignatureDoesNotMatch error
  });

  const url = await getSignedUrl(storage, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    url,
    key,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  };
}
```

### Generate Presigned GET URL (download)

```typescript
import { GetObjectCommand } from "@aws-sdk/client-s3";

async function generateDownloadUrl(
  key: string,
  expiresInSeconds = 900 // 15 minutes is typical for downloads
): Promise<string> {
  return getSignedUrl(
    storage,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      // Force download with original filename
      ResponseContentDisposition: `attachment; filename="my-file.pdf"`,
    }),
    { expiresIn: expiresInSeconds }
  );
}
```

### Presigned URL Limits

| Property | S3 | R2 |
|----------|----|----|
| Max expiry | 7 days (604800s) | 7 days |
| Signed by | IAM credentials at generation time | R2 API token |
| Works after key rotation? | No — regenerate URLs | No — regenerate URLs |
| Max object size via presigned PUT | 5 GB | 5 GiB |

---

## Direct Upload Pattern

The correct architecture for browser uploads: backend generates the URL, frontend uploads directly. The backend never proxies the file bytes.

### Backend — Next.js App Router Route Handler

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { storage, BUCKET } from "@/lib/storage";
import { auth } from "@/lib/auth"; // your auth solution

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  // 1. Auth gate — never skip this
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, size } = await req.json();

  // 2. Validate before generating URL
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  // 3. Scope key to the user — prevents path traversal
  const ext = filename.split(".").pop();
  const key = `uploads/${session.user.id}/${Date.now()}.${ext}`;

  // 4. Generate presigned PUT URL
  const url = await getSignedUrl(
    storage,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,        // lock the expected size
      Metadata: {
        "user-id": session.user.id,
        "original-name": filename,
      },
    }),
    { expiresIn: 300 } // 5 minutes is plenty for an upload
  );

  return NextResponse.json({ url, key });
}
```

### Frontend — Upload with Progress

```typescript
interface UploadResult {
  key: string;
  publicUrl: string;
}

async function uploadFile(file: File): Promise<UploadResult> {
  // 1. Request presigned URL from your backend
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!res.ok) throw new Error("Failed to get upload URL");
  const { url, key } = await res.json();

  // 2. Upload directly to S3/R2 — no backend involved
  const uploadRes = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
      // Must match exactly what was used to sign the URL
    },
  });

  if (!uploadRes.ok) throw new Error("Upload failed");

  return {
    key,
    publicUrl: `https://cdn.example.com/${key}`, // your CDN URL
  };
}

// For upload progress: use XMLHttpRequest instead of fetch
// xhr.upload.addEventListener("progress", (e) => onProgress(Math.round(e.loaded / e.total * 100)))
// xhr.open("PUT", url); xhr.setRequestHeader("Content-Type", file.type); xhr.send(file)
```

---

## CORS Configuration

CORS is required for any browser-initiated request (presigned PUT uploads, direct fetches).

### S3 Bucket CORS (JSON via AWS Console or CLI)

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-server-side-encryption", "x-amz-request-id"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply via CLI: `aws s3api put-bucket-cors --bucket my-bucket --cors-configuration file://cors.json`

### R2 CORS — Dashboard

1. R2 Dashboard → your bucket → Settings → CORS Policy
2. Add rule:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type", "Authorization", "x-amz-date", "x-amz-content-sha256"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**R2 CORS difference:** R2 does not support `"*"` for `AllowedHeaders` in some configurations — list headers explicitly if wildcard fails.

---

## Bucket Policies

### S3 — Least-Privilege IAM Policy

Grant only what the application needs. Never use the root account or AdministratorAccess.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/uploads/*"
    },
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket",
      "Condition": {
        "StringLike": { "s3:prefix": ["uploads/*"] }
      }
    }
  ]
}
```

### S3 — Public Read Bucket Policy (for public assets)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-public-bucket/*"
    }
  ]
}
```

**Warning:** Public bucket = any object readable by anyone. Use presigned GET URLs for access-controlled downloads instead.

### R2 — Bucket Access Policy

R2 uses API token scopes rather than bucket policies:

| Token Permission | Allows |
|-----------------|--------|
| `r2:get` | Read objects |
| `r2:put` | Write objects |
| `r2:delete` | Delete objects |
| `r2:list` | List buckets and objects |
| `r2:*` | Full access |

Scope tokens to specific buckets in the R2 Dashboard during token creation. R2 does not support S3-style bucket policy JSON — access control is managed at the token level.

---

## CDN Integration

### CloudFront for S3

Create a CloudFront distribution with your S3 bucket as the origin. Use an Origin Access Identity (OAI) or Origin Access Control (OAC — newer) to keep the bucket private and serve only through CloudFront.

Key config: set `viewer_protocol_policy = "redirect-to-https"`, `compress = true`, and `default_ttl = 86400`. Use `PriceClass_100` (US/EU only) to reduce costs.

**CloudFront costs:** $0.0085–$0.012/10k HTTPS requests + $0.0075–$0.02/GB egress. Egress from S3 to CloudFront is free — you only pay CloudFront's egress to end users.

### Construct CDN URLs from Keys

```typescript
const CDN_BASE = process.env.CDN_BASE_URL; // "https://d1abc.cloudfront.net" or "https://assets.example.com"

function getPublicUrl(key: string): string {
  return `${CDN_BASE}/${key}`;
}
```

### R2 Custom Domain (Zero Egress Cost)

1. R2 Dashboard → bucket → Settings → Custom Domains
2. Add your domain (e.g. `assets.example.com`)
3. Cloudflare automatically provisions SSL and routes traffic

No CloudFront needed. Egress through a custom domain on R2 is always $0.

```typescript
const R2_CDN = process.env.R2_PUBLIC_URL; // "https://assets.example.com"

function getPublicUrl(key: string): string {
  return `${R2_CDN}/${key}`;
}
```

**R2 Worker URL (alternative):** R2 buckets can also be accessed via a `*.r2.dev` subdomain — free but rate-limited. Use a custom domain in production.

---

## Multipart Upload

Required for files over 5 GB. Recommended for files over 100 MB (resumable, faster via parallelism).

```typescript
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import type { CompletedPart } from "@aws-sdk/client-s3";

const PART_SIZE = 10 * 1024 * 1024; // 10 MB — minimum is 5 MB per part (except last)

async function multipartUpload(
  key: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {
  // 1. Initiate
  const { UploadId } = await storage.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })
  );

  if (!UploadId) throw new Error("No UploadId returned");

  const parts: CompletedPart[] = [];

  try {
    // 2. Upload parts
    const totalParts = Math.ceil(fileBuffer.length / PART_SIZE);

    for (let i = 0; i < totalParts; i++) {
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileBuffer.length);
      const partNumber = i + 1; // 1-indexed

      const { ETag } = await storage.send(
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: key,
          UploadId,
          PartNumber: partNumber,
          Body: fileBuffer.subarray(start, end),
        })
      );

      if (!ETag) throw new Error(`No ETag for part ${partNumber}`);
      parts.push({ PartNumber: partNumber, ETag });

      console.log(`Uploaded part ${partNumber}/${totalParts}`);
    }

    // 3. Complete
    await storage.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  } catch (err) {
    // 4. Abort on failure — incomplete multipart uploads accrue storage costs
    await storage.send(
      new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId })
    );
    throw err;
  }
}
```

### Parallel Parts

Use `Promise.all` on batches of `UploadPartCommand` calls (same pattern — set `concurrency = 4`, slice `partNumbers` into chunks, sort `parts` by `PartNumber` before `CompleteMultipartUploadCommand`). Always `AbortMultipartUpload` in the catch block.

### S3 Multipart Limits

| Limit | Value |
|-------|-------|
| Min part size | 5 MB (except last part) |
| Max part size | 5 GB |
| Max parts | 10,000 |
| Max object size | 5 TB |
| R2 max single PUT | 5 GiB |

---

## S3 vs R2 Comparison

### Pricing (February 2026)

| Cost Item | AWS S3 Standard | Cloudflare R2 |
|-----------|----------------|---------------|
| Storage | $0.023/GB/mo | $0.015/GB/mo |
| Egress (internet) | $0.09/GB (after 100 GB/mo free) | **$0.00** |
| Egress (CloudFront) | $0.00 | N/A |
| PUT / COPY / POST / LIST | $0.005/1,000 requests | $4.50/million |
| GET / SELECT | $0.0004/1,000 requests | $0.36/million |
| Free tier (storage) | 5 GB (12 months) | 10 GB (ongoing) |
| Free tier (reads) | 20,000 GET (12 months) | 10M/month (ongoing) |
| Free tier (writes) | 2,000 PUT (12 months) | 1M/month (ongoing) |

### Break-Even Analysis

**Example: 1 TB stored, 10 TB egress/month**

```
S3 cost:
  Storage:  1,000 GB × $0.023       =   $23.00
  Egress:   (10,000 - 0.1) GB × $0.09 =  $899.91
  Total:                              =  $922.91/mo

R2 cost:
  Storage:  1,000 GB × $0.015       =   $15.00
  Egress:   10,000 GB × $0.00       =    $0.00
  Total:                              =   $15.00/mo

Savings: ~$908/mo (98.4%)
```

**R2 wins hard for bandwidth-heavy workloads.** For write-heavy workloads with low egress, the gap narrows — recalculate with your actual ratios.

### Feature Comparison

| Feature | S3 | R2 |
|---------|----|----|
| Object versioning | Yes | No (paid tier roadmap) |
| Object Lock (WORM) | Yes | No |
| Storage classes (IA, Glacier) | Yes (8 tiers) | No |
| Server-side encryption | SSE-S3, SSE-KMS, SSE-C | SSE-C (customer keys) |
| Lifecycle policies | Yes | Yes |
| Event notifications | S3 Events → SQS/SNS/Lambda | R2 event notifications (Workers) |
| Object Lambda | Yes | No |
| Replication (cross-region) | Yes | No |
| Intelligent-Tiering | Yes | No |
| S3 Select (query objects) | Yes | No |
| Access Points | Yes | No |
| Inventory reports | Yes | No |
| Max object size (single PUT) | 5 GB | 5 GiB |
| Max object size (multipart) | 5 TB | 5 TB |
| S3 API compatibility | Native | ~85% (ongoing improvements) |

### R2 API Compatibility Gaps

R2 does not implement these S3 APIs:

- `SelectObjectContent` (S3 Select)
- `GetObjectTorrent`
- `RequestPayment` APIs
- `ReplicationConfiguration`
- `ObjectLambda` APIs
- `IntelligentTieringConfiguration`
- `InventoryConfiguration`
- `AnalyticsConfiguration`
- Access Points (`CreateAccessPoint`, etc.)
- `RestoreObject` (no Glacier)

Check [developers.cloudflare.com/r2/api/s3/api/](https://developers.cloudflare.com/r2/api/s3/api/) for current compatibility status — Cloudflare updates this list regularly.

---

## Common Mistakes

| # | Mistake | Impact | Fix |
|---|---------|--------|-----|
| 1 | Using root AWS account keys | Critical security risk | Use IAM roles (EC2/ECS/Lambda auto-detect) or IAM users with scoped policies |
| 2 | Hardcoding credentials in source | Credential leak in git history | Always use environment variables or AWS Secrets Manager |
| 3 | Presigned URL used after expiry | `403 Request has expired` | Generate a fresh URL per upload session; set `expiresIn` to 5–15 minutes for uploads |
| 4 | ContentType mismatch in presigned PUT | `403 SignatureDoesNotMatch` | The `Content-Type` header in the fetch must exactly match the value used to sign the URL |
| 5 | Missing CORS on direct uploads | Browser blocks the PUT request | Configure AllowedMethods including PUT and AllowedHeaders including Content-Type |
| 6 | Using R2 features not yet supported | Silent failure or error | Check S3 compatibility docs; Object Lock, versioning, S3 Select are not available |
| 7 | Not aborting failed multipart uploads | Silent cost accumulation — you pay for incomplete parts | Always `AbortMultipartUpload` in your catch block; set bucket lifecycle rule to expire incomplete uploads after 1 day |
| 8 | Calling `.text()` on binary GetObject body | Corrupted binary data | Use `await Body.transformToByteArray()` then `Buffer.from(bytes)` |
| 9 | Listing without pagination | Missing objects when bucket has >1000 keys | Loop on `NextContinuationToken` until it's undefined |
| 10 | Public bucket + sensitive data | Any object readable without auth | Enable Block Public Access; use presigned GET URLs for access-controlled downloads |
| 11 | No lifecycle policy for temp uploads | Storage costs grow unbounded | Add S3/R2 lifecycle rule to delete objects under `uploads/tmp/` after 24 hours |
| 12 | R2 wildcard AllowedHeaders in CORS | CORS rule silently ignored in some clients | Specify headers explicitly: `["Content-Type", "Authorization", "x-amz-date", "x-amz-content-sha256"]` |

---

Sources:
- [AWS SDK for JavaScript v3 — S3 Examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html)
- [AWS SDK for JavaScript v3 Releases](https://github.com/aws/aws-sdk-js-v3/releases)
- [Cloudflare R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 vs AWS S3 — Pricing](https://www.cloudflare.com/pg-cloudflare-r2-vs-aws-s3/)
- [R2 Pricing Calculator](https://r2-calculator.cloudflare.com/)
- [Vantage: Storage Wars — R2 vs S3](https://www.vantage.sh/blog/cloudflare-r2-aws-s3-comparison)
