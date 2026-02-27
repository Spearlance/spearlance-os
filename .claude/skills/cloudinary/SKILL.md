---
model: claude-sonnet-4-6
name: cloudinary
description: Use when working with Cloudinary for media management — image/video uploads, transformations, optimization, responsive delivery, or Admin API. Also use when choosing a media CDN or setting up asset pipelines.
---

# cloudinary

## Overview

Cloudinary is a media management platform covering upload, transformation, storage, and CDN delivery. The SDK wraps the REST APIs. Node.js `cloudinary` v2 and Python `cloudinary` are the primary integration points.

## Quick Reference

| Item | Value |
|------|-------|
| Node.js package | `cloudinary` v2 — `import { v2 as cloudinary } from 'cloudinary'` |
| Python package | `cloudinary` — `import cloudinary` |
| Admin API base | `https://api.cloudinary.com/v1_1/{cloud_name}/` |
| Search API v2 | `https://api.cloudinary.com/v2/{cloud_name}/search` |
| Delivery URL | `https://res.cloudinary.com/{cloud_name}/` |
| Auth | Basic auth — api_key:api_secret on Admin/Upload; signature for signed uploads |

## Authentication

```typescript
// Node.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
```

```python
# Python
import cloudinary

cloudinary.config(
    cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
    api_key=os.environ["CLOUDINARY_API_KEY"],
    api_secret=os.environ["CLOUDINARY_API_SECRET"],
    secure=True,
)
```

## Common Operations

```typescript
// Upload
await cloudinary.uploader.upload('/path/to/image.jpg', {
  public_id: 'products/hero-image',
  resource_type: 'image',
  overwrite: false,
});

// Update metadata on existing asset (explicit, NOT update)
await cloudinary.uploader.explicit('products/hero-image', {
  type: 'upload',
  tags: ['featured', 'homepage'],
});

// Search
const results = await cloudinary.search
  .expression('folder=products/* AND tags=featured')
  .with_field('metadata').with_field('tags')
  .sort_by('created_at', 'desc')
  .max_results(100)
  .execute();

// Delete
await cloudinary.uploader.destroy('products/old-image');

// Transformation URL
const url = cloudinary.url('products/hero-image', {
  width: 800, height: 600, crop: 'fill', gravity: 'face',
  fetch_format: 'auto', quality: 'auto',
});
```

## Rate Limits

| API | Free | Plus | Advanced |
|-----|------|------|----------|
| Admin API | 500/hr | 2,000/hr | 5,000/hr |
| Upload API | No hard limit | No hard limit | No hard limit |
| Search API | Shares Admin quota | Shares Admin quota | Shares Admin quota |
| Search results/page | 500 max | 500 max | 500 max |

Safe pacing for Free plan: 8-second delay between Admin API calls (~450/hr).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `api.update()` on existing assets | Use `uploader.explicit()` with `type: 'upload'` |
| Metadata fields without definitions | Create field via `api.add_metadata_field()` first |
| No pagination on large asset lists | Use `next_cursor`; max 500 results per page |
| Missing `resource_type: 'video'` on video ops | Always pass for video — defaults to 'image' |
| No delay between batch Admin API calls | Add 8s delay (Free) or 2s delay (Plus) |
| Hardcoding cloud name in transformation URLs | Use `cloudinary.url()` helper — reads from config |

## Full Reference

See `reference.md` in this skill directory for: Upload API params (upload/explicit/destroy/rename), transformation URL syntax (resize/crop/effects/format/quality), Admin API endpoints, Search API v2, Node.js and Python SDK patterns, webhooks, and optimization presets.
