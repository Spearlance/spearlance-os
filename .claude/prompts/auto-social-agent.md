# Auto-Social Agent — Scheduled Remote Execution Prompt

> **Isolation model:** This trigger processes all enabled clients in sequence. Client isolation
> is guaranteed because ALL content generation (captions, template text, images) happens in fresh AI calls
> inside edge functions. The agent never generates client-specific content itself — it reads
> generic context files from git and orchestrates edge function calls.

This prompt powers the scheduled remote Claude Code agent that runs the auto-social pipeline on Anthropic's infrastructure. Follow every step exactly. Do not skip steps. If a step fails, log the error and continue to the next step unless the failure is fatal (marked **FATAL**).

---

## Runtime Variables

The following placeholders are injected at invocation time:

- `{{SUPABASE_URL}}` — Supabase project URL (e.g. `https://abcxyz.supabase.co`)
- `{{AUTO_BLOG_API_KEY}}` — Dedicated API key for auto-social edge functions (shared with auto-blog pipeline — never the service role key)

---

## Tools Available

- **Read** — read any file in the repo checkout
- **Bash** — run shell commands (curl, date, etc.)

---

## Step 0: Load Context Files

Read before proceeding. Contents govern output style throughout the run.

```bash
Read: .claude/rules/output-style.md
```

Extract and hold in memory:
- Brand voice rules (tone, style, formatting expectations)
- Status marker conventions

---

## Step 0.5: Discover Clients

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-list-clients" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:** `{ "success": true, "clients": [{ "id": "<uuid>", "name": "...", "social_strategy": { ... } }] }`

If no clients are returned (empty array or `success` is false), log `"No clients with auto-social enabled"` and exit immediately.

For each client in the returned list, execute **Steps 1–5 independently and sequentially**.
After completing all steps for one client, begin the next client.
Log `"Starting social pipeline for: <client.name> (ID: <client.id>)"` before Step 1 for each client.
Log `"Completed social pipeline for: <client.name>"` after Step 5 for each client.

---

## Step 1: Initialize Run

**Purpose:** Create a `social_auto_runs` record and get the `auto_run_id` for this session.

Determine the target month and year (the NEXT calendar month from today):

```bash
date +%-m   # current month as number, no leading zero
date +%Y    # current year
```

Compute `next_month` and `next_year`:
- If current month < 12 → `next_month = current_month + 1`, `next_year = current_year`
- If current month == 12 → `next_month = 1`, `next_year = current_year + 1`

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-run-start" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "trigger_type": "scheduled",
    "month": <next_month>,
    "year": <next_year>
  }'
```

**Expected response:**
```json
{ "success": true, "auto_run_id": "<uuid>" }
```

**FATAL:** If `success` is not `true` or `auto_run_id` is missing, stop processing this client, log the error, and move to the next client.

Store `auto_run_id`, `next_month`, and `next_year` for all subsequent calls for this client.

---

## Step 2: Research

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-research" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "month": <next_month>,
    "year": <next_year>
  }'
```

**Expected response shape:**
```json
{
  "success": true,
  "bundle": {
    "client": { "id", "name", "brand_name", "industry", "website_url" },
    "brand_voice": { "tone_adjectives", "personality_traits", "personality_description" },
    "brand_story": { "executive_summary", "value_propositions", "pain_points", "marketing_angles" },
    "avatars": [...],
    "services": [...],
    "social_strategy": {
      "platforms": ["instagram", "facebook", ...],
      "posts_per_month": 12,
      "posting_days": [1, 3, 5, 8, 10, 12, ...],
      "content_mix": {
        "educational": 30,
        "quick_tips": 25,
        "promotional": 20,
        "customer_stories": 15,
        "behind_the_scenes": 10
      },
      "primary_cta": "...",
      "hashtag_sets": { "branded": [...], "industry": [...], "local": [...] }
    },
    "assets": [{ "id", "url", "type", "tags" }, ...],
    "recent_posts": [{ "id", "caption", "category", "published_at" }, ...]
  }
}
```

Store the full `bundle` object. Extract:
- `bundle.social_strategy` — governs post count, scheduling, and content distribution
- `bundle.assets` — candidate background images for template rendering
- `bundle.recent_posts` — used to avoid repeating recent topics/angles

**Non-fatal:** If `success` is false, log error and skip this client.

---

## Step 3: Plan the Month

Using `bundle.social_strategy`:

### 3a. Determine Post Slots

```
posting_days  = bundle.social_strategy.posting_days    (array of day-of-month integers)
posts_per_month = len(posting_days)
content_mix   = bundle.social_strategy.content_mix     (category → percentage)
```

- If `posting_days` is empty or null → default to [1, 8, 15, 22] (4 posts per month)
- **Hard cap: maximum 20 posts per run** to control costs

### 3b. Assign Categories to Slots

Distribute categories across slots according to `content_mix` percentages. Round-robin within each category bucket.

Example for 12 posts with `{ educational: 30, quick_tips: 25, promotional: 20, customer_stories: 15, behind_the_scenes: 10 }`:
- 4 educational, 3 quick_tips, 2 promotional, 2 customer_stories, 1 behind_the_scenes

Build a `post_plan` array where each entry has:
```json
{
  "slot": 1,
  "publish_date": "YYYY-MM-DD",
  "category": "educational",
  "template_id": "quote-card"
}
```

### 3c. Map Categories to Template IDs

| Category | Template ID |
|----------|-------------|
| `educational` | `quote-card` |
| `quick_tips` | `quick-tip` |
| `promotional` | `promo-cta` |
| `customer_stories` | `testimonial` |
| `behind_the_scenes` | `behind-scenes` |

---

## Step 4: Generate Content

For each post in `post_plan` (process sequentially — do not parallelize):

Log `"Generating post <slot>/<total>: <category> → <template_id>"` before each post.

### 4a. Generate Caption + Template Texts

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-generate" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d @/tmp/social_generate_<client_id>_slot<slot>.json
```

Write payload to temp file:

```bash
cat > /tmp/social_generate_<client_id>_slot<slot>.json << 'PAYLOAD'
{
  "client_id": "<client.id>",
  "auto_run_id": "<auto_run_id>",
  "category": "<post_plan[i].category>",
  "template_id": "<post_plan[i].template_id>",
  "publish_date": "<post_plan[i].publish_date>",
  "brand_context": {
    "brand_name": "<bundle.client.brand_name>",
    "industry": "<bundle.client.industry>",
    "brand_voice": <bundle.brand_voice>,
    "brand_story": <bundle.brand_story>,
    "services": <bundle.services (up to 5)>,
    "avatars": <bundle.avatars (up to 2)>
  },
  "strategy": {
    "primary_cta": "<bundle.social_strategy.primary_cta>",
    "hashtag_sets": <bundle.social_strategy.hashtag_sets>,
    "platforms": <bundle.social_strategy.platforms>
  },
  "recent_posts": <bundle.recent_posts (up to 10, titles/captions only)>
}
PAYLOAD
```

**Expected response:**
```json
{
  "success": true,
  "caption": "...",
  "hashtags": ["#tag1", "#tag2", ...],
  "template_texts": {
    "headline": "...",
    "subheadline": "...",
    "body": "...",
    "cta": "..."
  }
}
```

Store `caption`, `hashtags`, and `template_texts` for this post slot.

**Non-fatal:** If this call fails, log error, skip this post slot, and continue to next.

### 4b. Find or Generate Background Image

First, attempt to match from `bundle.assets`:
- Look for an asset where `asset.tags` overlap with `post_plan[i].category` or `bundle.client.industry`
- If a match is found, use `asset.url` as `background_image_url` — skip the AI generation call

If no asset match:

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-generate-image" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "category": "<post_plan[i].category>",
    "industry": "<bundle.client.industry>",
    "template_id": "<post_plan[i].template_id>",
    "brand_colors": "<bundle.brand_voice.brand_colors if present or null>"
  }'
```

**Expected response:**
```json
{ "success": true, "image_url": "https://..." }
```

Store `image_url` as `background_image_url` for this post slot.

**Non-fatal:** If this call fails, set `background_image_url = null` and continue — the post will be saved without a rendered image.

### 4c. Render Template

Only call if `background_image_url` is not null AND `template_texts` was successfully generated in 4a.

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-render-template" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "template_id": "<post_plan[i].template_id>",
    "background_image_url": "<background_image_url>",
    "template_texts": <template_texts from 4a>
  }'
```

**Expected response:**
```json
{ "success": true, "rendered_image_url": "https://..." }
```

Store `rendered_image_url` for this post slot.

**Non-fatal:** If this call fails, log error, set `rendered_image_url = null`, and continue — post will be saved without rendered image.

### 4d. Save Post

```bash
curl -s -X POST "{{SUPABASE_URL}}/rest/v1/social_media_posts" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "category": "<post_plan[i].category>",
    "template_id": "<post_plan[i].template_id>",
    "publish_date": "<post_plan[i].publish_date>",
    "caption": "<caption from 4a>",
    "hashtags": <hashtags from 4a>,
    "template_texts": <template_texts from 4a>,
    "background_image_url": "<background_image_url or null>",
    "rendered_image_url": "<rendered_image_url or null>",
    "platforms": <bundle.social_strategy.platforms>,
    "status": "pending_approval"
  }'
```

**Expected response:** Array containing the created record with `id` field.

Store the returned `id` as `post_id` for this slot. Add to `post_ids` array.

**Non-fatal:** If save fails, log error and continue to next slot.

---

## Step 5: Complete Run

Collect final results:
- `post_ids` — all `post_id` values successfully saved in Step 4d
- `posts_with_images` — count of posts where `rendered_image_url` is not null
- `posts_without_images` — count of posts where `rendered_image_url` is null
- `posts_skipped` — count of post slots that were skipped due to errors

Build a `run_summary` string (plain text, 2–4 sentences) describing:
- How many posts were generated for the client
- Content category distribution
- Image generation success rate
- Any notable issues encountered during the run

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-run-complete" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "month": <next_month>,
    "year": <next_year>,
    "post_ids": [<saved post_ids>],
    "stats": {
      "posts_planned": <total post_plan length>,
      "posts_saved": <len(post_ids)>,
      "posts_with_images": <posts_with_images>,
      "posts_without_images": <posts_without_images>,
      "posts_skipped": <posts_skipped>
    },
    "run_summary": "<run_summary string>"
  }'
```

**Expected response:**
```json
{ "success": true, "status": "complete", "posts_created": 12 }
```

**Non-fatal:** If this call fails, log the error — the run is still considered complete for this client. Posts were already saved.

---

## Error Handling Reference

| Step | Error Type | Action |
|------|-----------|--------|
| Step 0.5: list-clients | Any error | **FATAL** — stop entire run, report error |
| Step 1: run-start | Any error | **FATAL for this client** — skip client, continue to next |
| Step 2: research | HTTP error or `success: false` | Log, skip this client entirely |
| Step 3: plan | No posting_days | Default to [1, 8, 15, 22], continue |
| Step 4a: generate | HTTP error | Log, skip this post slot, continue |
| Step 4b: image (asset match) | No match found | Proceed to AI generation |
| Step 4b: image (AI generate) | HTTP error | Set `background_image_url = null`, continue |
| Step 4c: render | HTTP error | Set `rendered_image_url = null`, continue |
| Step 4d: save post | HTTP error | Log, continue to next slot |
| Step 5: run-complete | HTTP error | Log error, mark run as still complete locally |

**Set run `status` to `failed`** only if the entire run crashes before Step 4 begins (e.g., Step 1 or Step 2 FATAL). Individual post failures never set the run to `failed`.

---

## curl Header Reference

All edge function calls require these exact headers:

```
x-auto-social-key: {{AUTO_BLOG_API_KEY}}
Content-Type: application/json
```

The `x-auto-social-key` header uses the dedicated API key — not the Supabase service role key. The edge functions use the service role key internally (from their own environment), but the remote agent never needs it.

---

## JSON Escaping in curl

When embedding large objects (like `brand_context`) in curl `-d` JSON, use a bash heredoc or temp file to avoid shell escaping issues:

```bash
# Write payload to temp file, then curl it
cat > /tmp/social_payload_<client_id>_<slot>.json << 'PAYLOAD'
{
  "client_id": "<client.id>",
  "brand_context": { ... }
}
PAYLOAD

curl -s -X POST "{{SUPABASE_URL}}/functions/v1/social-auto-generate" \
  -H "x-auto-social-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d @/tmp/social_payload_<client_id>_<slot>.json
```

Use unique temp file names per client and slot (include both `<client_id>` and `<slot>` in the filename) to avoid cross-client file collisions.

---

## Completion Checklist

After all clients are processed, verify:

- [ ] All clients from Step 0.5 were attempted
- [ ] Each client's `auto_run_id` was obtained in Step 1
- [ ] Target month/year was computed correctly (next calendar month)
- [ ] Brand context bundle was fetched for each client
- [ ] Post plan was built from `social_strategy.posting_days` and `content_mix`
- [ ] Categories were correctly mapped to template IDs
- [ ] Captions and template texts were generated via `social-auto-generate` (not by the agent directly)
- [ ] Background images were sourced from assets or generated via `social-generate-image`
- [ ] Templates were rendered via `social-render-template`
- [ ] All posts were saved to `social_media_posts` with `status: pending_approval`
- [ ] `social-auto-run-complete` was called with final stats for each client
- [ ] `run_summary` accurately reflects what happened for each client's run
