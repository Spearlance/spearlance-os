# Cloudinary API Reference

Deep reference for Cloudinary Upload API, transformation URL syntax, Admin API, Search API v2, SDKs, webhooks, and optimization.

---

## SDK Setup

### Node.js (cloudinary v2)

```bash
npm install cloudinary
```

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
```

### Python (cloudinary)

```bash
pip install cloudinary
```

```python
import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
    api_key=os.environ["CLOUDINARY_API_KEY"],
    api_secret=os.environ["CLOUDINARY_API_SECRET"],
    secure=True,
)
```

---

## Upload API

### upload

Uploads a file to Cloudinary. Works with file paths, URLs, base64 data URIs, and raw file bytes.

```typescript
// Node.js
const result = await cloudinary.uploader.upload(file, {
  // Identity
  public_id: 'folder/subfolder/filename',   // omit for auto-generated ID
  folder: 'products',                         // shorthand for path prefix
  resource_type: 'image',                    // 'image' | 'video' | 'raw' | 'auto'
  type: 'upload',                            // 'upload' | 'private' | 'authenticated'

  // Behavior
  overwrite: false,                          // default true
  unique_filename: true,
  use_filename: true,                        // use original filename as public_id base
  discard_original_filename: false,

  // Transformation on upload
  eager: [
    { width: 300, height: 300, crop: 'fill', format: 'webp' },
  ],
  eager_async: true,

  // Metadata and tagging
  tags: ['hero', 'homepage'],
  context: { alt: 'Hero image', caption: 'Product shot' },
  metadata: { category: 'electronics' },    // structured metadata (must define fields first)

  // Webhook
  notification_url: 'https://myapp.com/webhooks/cloudinary',

  // Access
  access_mode: 'public',                    // 'public' | 'authenticated'
});

console.log(result.public_id, result.secure_url, result.bytes);
```

```python
# Python
result = cloudinary.uploader.upload(
    file,
    public_id="folder/subfolder/filename",
    resource_type="image",
    tags=["hero", "homepage"],
    overwrite=False,
)
print(result["public_id"], result["secure_url"])
```

### explicit

Updates tags, metadata, or context on an **existing** asset without re-uploading.

```typescript
await cloudinary.uploader.explicit('products/hero', {
  type: 'upload',                            // required — specifies delivery type
  tags: ['featured'],
  context: { alt: 'Featured product' },
  metadata: { ad_eligible: 'yes' },
  eager: [{ width: 200, height: 200, crop: 'thumb' }],
});
```

### destroy

Deletes an asset.

```typescript
const result = await cloudinary.uploader.destroy('products/old-image', {
  resource_type: 'image',                   // required for video assets
  invalidate: true,                          // purge from CDN cache
});
// result.result === 'ok' | 'not found'
```

### rename

Renames (moves) an asset to a new public_id.

```typescript
await cloudinary.uploader.rename('products/old-name', 'products/new-name', {
  overwrite: false,
  invalidate: true,
});
```

### upload_large / upload_chunked

For files over 100 MB.

```typescript
await cloudinary.uploader.upload_large('/path/to/large-video.mp4', {
  resource_type: 'video',
  chunk_size: 6 * 1024 * 1024,             // 6 MB chunks
  public_id: 'videos/my-video',
});
```

### add_metadata_field

Define a structured metadata field before setting values on assets.

```typescript
await cloudinary.api.add_metadata_field({
  external_id: 'ad_eligible',
  label: 'Ad Eligible',
  type: 'enum',
  datasource: {
    values: [
      { external_id: 'yes', value: 'Yes' },
      { external_id: 'no', value: 'No' },
    ],
  },
});
```

Field types: `string`, `integer`, `date`, `enum`, `set` (multi-select).

---

## Transformation URL Syntax

### Base URL

```
https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{ext}
```

### Resize / Crop

```
w_<width>,h_<height>,c_<crop_mode>
```

| Crop mode | Behavior |
|-----------|----------|
| `c_fill` | Fill dimensions — may crop |
| `c_fit` | Fit inside — letterbox |
| `c_limit` | Fit inside — only scale down |
| `c_pad` | Fit with padding |
| `c_crop` | Exact crop at gravity point |
| `c_thumb` | Thumbnail focused on gravity |
| `c_scale` | Scale preserving ratio (width OR height) |
| `c_lfill` | Fill — avoid upscaling |

### Gravity / Focal Point

```
g_auto            // smart AI auto-detect subject
g_face            // face detection
g_faces           // multiple faces
g_center
g_north / g_south / g_east / g_west
g_north_east / etc.
```

### Format and Quality

```
f_auto            // auto format (WebP/AVIF for supported browsers)
f_webp
f_avif
f_jpg
f_png
q_auto            // auto quality (default: eco)
q_auto:best       // best quality
q_auto:good
q_auto:eco
q_auto:low
q_<1-100>         // explicit quality integer
```

### Effects

```
e_sharpen
e_blur:<strength>                 // e_blur:300
e_grayscale
e_sepia
e_brightness:<-100 to 100>        // e_brightness:30
e_contrast:<-100 to 100>
e_saturation:<-100 to 100>
e_viesus_correct                  // auto color correction
e_background_removal              // AI background removal (paid addon)
e_upscale                         // AI upscale (paid addon)
```

### Overlays and Watermarks

```
l_<public_id>,g_south_east,x_10,y_10,w_100,o_80
```

Text overlay:

```
l_text:<font_family>_<size>_<style>:<text>,co_white,g_south_west,x_20,y_20
// Example:
l_text:Arial_24_bold:Hello,co_white,g_north_east,x_10,y_10
```

### Chaining Transformations

Use `/` to chain — applied left to right:

```
w_800,h_600,c_fill/e_sharpen/f_auto,q_auto
```

### SDK URL Generation

```typescript
// Node.js
const url = cloudinary.url('products/hero', {
  width: 800,
  height: 600,
  crop: 'fill',
  gravity: 'auto',
  fetch_format: 'auto',
  quality: 'auto',
  secure: true,
});

// Chained transformation
const url = cloudinary.url('products/hero', {
  transformation: [
    { width: 800, height: 600, crop: 'fill', gravity: 'face' },
    { effect: 'sharpen' },
    { fetch_format: 'auto', quality: 'auto' },
  ],
});
```

```python
# Python
from cloudinary import CloudinaryImage

url = CloudinaryImage("products/hero").build_url(
    width=800, height=600, crop="fill", gravity="auto",
    fetch_format="auto", quality="auto",
)
```

---

## Admin API

Base URL: `https://api.cloudinary.com/v1_1/{cloud_name}/`
Auth: HTTP Basic with api_key:api_secret

### Resources (asset listing)

```typescript
// List all image assets
const result = await cloudinary.api.resources({
  resource_type: 'image',
  type: 'upload',
  max_results: 500,                          // max 500 per call
  next_cursor: result.next_cursor,           // pagination
  prefix: 'products/',                       // filter by folder prefix
  tags: true,                                // include tags in response
  context: true,                             // include context
  metadata: true,                            // include structured metadata
});

// result.resources = array of assets
// result.next_cursor = string if more pages exist
```

### Resource detail

```typescript
const asset = await cloudinary.api.resource('products/hero', {
  resource_type: 'image',
  tags: true,
  context: true,
  metadata: true,
  image_metadata: true,                      // EXIF data
  faces: true,                               // face coordinates
  colors: true,                              // dominant colors
});
```

### Folders

```typescript
// List folders
const result = await cloudinary.api.root_folders();
const result = await cloudinary.api.sub_folders('products');

// Create folder
await cloudinary.api.create_folder('products/seasonal');

// Delete folder (must be empty)
await cloudinary.api.delete_folder('products/old-season');
```

### Batch tag operations

```typescript
// Add tags to multiple assets (max 1,000 public_ids per call)
await cloudinary.api.update_resources_access_mode_by_tag(
  'old-campaign',
  'authenticated',
);

// Replace tags on multiple assets
await cloudinary.uploader.replace_tag('new-tag', ['products/image1', 'products/image2']);

// Remove all tags from assets
await cloudinary.uploader.remove_all_tags(['products/image1']);
```

### Usage stats

```typescript
const usage = await cloudinary.api.usage();
// usage.storage.usage (bytes)
// usage.bandwidth.usage (bytes)
// usage.requests (total API requests this month)
// usage.resources (total stored assets)
```

---

## Search API v2

More powerful than Admin API resources listing — supports expressions, aggregations, and sorting.

Base URL: `https://api.cloudinary.com/v2/{cloud_name}/search`

```typescript
// Node.js — fluent builder
const result = await cloudinary.search
  .expression('folder=products/* AND resource_type=image AND tags=featured')
  .with_field('tags')
  .with_field('context')
  .with_field('metadata')
  .with_field('image_analysis')
  .sort_by('created_at', 'desc')
  .max_results(100)                          // max 500
  .next_cursor(cursor)                       // pagination
  .aggregate('resource_type')               // facet counts
  .execute();

// result.resources — array of matching assets
// result.next_cursor — pagination token
// result.aggregations — facet counts by field
// result.total_count — total matching assets
```

### Expression syntax

```
folder=products/*                            // assets in products/ and subdirs
resource_type=image                          // image | video | raw
tags=featured                               // has 'featured' tag
metadata.ad_eligible=yes                    // structured metadata
created_at>1d                               // created in last day
bytes<1000000                               // under 1 MB
public_id=products/hero                     // exact match
public_id:products/*                        // prefix match
format=jpg                                  // file format
width>800 AND height>600
```

---

## Webhooks (notification_url)

Cloudinary POSTs a JSON payload to your URL on upload completion, eager transformation completion, and moderation results.

```typescript
// Specify on upload
await cloudinary.uploader.upload(file, {
  notification_url: 'https://myapp.com/webhooks/cloudinary',
});

// Set globally in account settings or per-upload-preset

// Payload (POST body)
// {
//   notification_type: 'upload',
//   public_id: 'products/hero',
//   resource_type: 'image',
//   type: 'upload',
//   format: 'jpg',
//   bytes: 123456,
//   secure_url: 'https://res.cloudinary.com/...',
//   eager: [...],       // if eager transformations were requested
//   tags: [...],
//   created_at: '2025-01-01T00:00:00Z',
// }

// Verify webhook authenticity
import crypto from 'crypto';

function verifyWebhook(body: string, timestamp: string, signature: string): boolean {
  const expected = crypto
    .createHash('sha1')
    .update(body + timestamp + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');
  return expected === signature;
}
```

---

## Optimization Presets

### Standard optimization — always include

```
f_auto,q_auto
```

Auto format picks WebP or AVIF when the browser supports it. `q_auto` dynamically adjusts quality per image content.

### Responsive images with breakpoints

```typescript
// Generate srcset breakpoints automatically
const result = await cloudinary.uploader.upload(file, {
  responsive_breakpoints: [{
    create_derived: true,
    bytes_step: 20000,
    min_width: 200,
    max_width: 1200,
    transformation: { crop: 'fill', aspect_ratio: '16:9', fetch_format: 'auto', quality: 'auto' },
  }],
});

// result.responsive_breakpoints[0].breakpoints = array of { width, height, bytes, url }
```

```html
<!-- Use in HTML -->
<img
  src="https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto/w_800/products/hero"
  srcset="
    https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto/w_400/products/hero 400w,
    https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto/w_800/products/hero 800w,
    https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto/w_1200/products/hero 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 900px) 800px, 1200px"
  alt="Product hero"
/>
```

### Video optimization

```
f_auto,q_auto,vc_auto         // auto format (mp4/webm), auto quality, auto codec
w_<width>,c_scale             // scale video width
so_<seconds>                  // start offset for thumbnail
du_<seconds>                  // duration
```

```typescript
// Video thumbnail at 3s mark
const thumbnailUrl = cloudinary.url('videos/promo', {
  resource_type: 'video',
  start_offset: 3,
  width: 640,
  height: 360,
  crop: 'fill',
  format: 'jpg',
});
```

---

## Error Handling

```typescript
try {
  const result = await cloudinary.uploader.upload(file, { public_id: 'test' });
} catch (error) {
  if (error.http_code === 400) {
    // Invalid parameters
  } else if (error.http_code === 401) {
    // Auth failure — check cloud_name, api_key, api_secret
  } else if (error.http_code === 420) {
    // Rate limited — back off
    await sleep(error.retry_after * 1000);
  } else if (error.http_code === 500) {
    // Cloudinary server error — retry with backoff
  }
}

// Pagination pattern with rate limit safety
async function fetchAllAssets(folder: string) {
  const assets = [];
  let cursor: string | undefined;

  do {
    const result = await cloudinary.search
      .expression(`folder=${folder}/*`)
      .max_results(500)
      .next_cursor(cursor)
      .execute();

    assets.push(...result.resources);
    cursor = result.next_cursor;

    if (cursor) {
      await sleep(2000); // avoid rate limit on Free/Plus plans
    }
  } while (cursor);

  return assets;
}
```

---

## Sources

- [Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [Transformation Reference](https://cloudinary.com/documentation/transformation_reference)
- [Admin API Reference](https://cloudinary.com/documentation/admin_api)
- [Search API](https://cloudinary.com/documentation/search_api)
- [Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Python SDK](https://cloudinary.com/documentation/django_integration)
- [Responsive Images](https://cloudinary.com/documentation/responsive_images)
- [Optimization Guide](https://cloudinary.com/documentation/image_optimization)
