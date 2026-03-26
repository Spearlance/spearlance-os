# Auto Social Media Scheduler — Design Document

> **Status:** Approved 2026-03-26
> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement the plan derived from this design.

## Overview

Add a fully automated social media pipeline that generates, renders, and publishes brand-consistent posts across all connected platforms via Late/Zernio (getlate.dev). Mirrors the auto-blog architecture: a monthly remote agent generates content, a daily cron publishes on schedule, and the existing planner UI lets clients view/edit anything in between.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Approval flow | **Auto-publish** — social posts are ephemeral, no approval queue needed |
| Automation trigger | **Hybrid** — monthly agent plans + generates, daily cron publishes |
| Image generation | **Remotion static templates** — deterministic brand elements, AI/asset backgrounds |
| Image priority chain | Brand asset match → AI generation fallback → user upload (manual) |
| Image storage | **Supabase Storage** — existing infrastructure, no new services |
| Client experience | **Minimal config + hands-off** — set strategy once, view/edit via existing planner UI |
| Output format | **Static images only** (1080x1080 feed, 1080x1920 stories) |

## Architecture

```
MONTHLY REMOTE AGENT (Anthropic cloud, cron — 20th of each month)
│
│  Has: Git checkout (skills, brand rules)
│  Has: Bash (curl to edge functions)
│
├─ STEP 1: RESEARCH
│  ▪ Pull brand context (voice, avatars, services, competitors)
│  ▪ Pull existing posts (avoid repeats)
│  ▪ Pull strategy config (frequency, days, topic distribution)
│
├─ STEP 2: PLAN MONTH
│  ▪ Generate topic + caption for each posting day
│  ▪ Assign template type per post (quote, tip, promo, etc.)
│  ▪ Respect topic distribution percentages from strategy
│
├─ STEP 3: GENERATE IMAGES (per post)
│  ▪ Match brand assets via existing asset-matching system
│  ▪ If no match → AI-generate background (no text, no logos)
│  ▪ Render static image via Remotion template + brand data
│  ▪ Upload to Supabase Storage → store URL on post record
│
├─ STEP 4: SAVE TO SUPABASE
│  ▪ Insert all posts as status = 'scheduled'
│  ▪ Each post has: caption, image_url, scheduled_date, template_id
│  ▪ Visible immediately in existing planner UI
│
└─ STEP 5: LOG RUN
   ▪ Record run stats (posts generated, assets matched vs AI-generated)
   ▪ Optional notification to Garrett

DAILY CRON (Supabase edge function, fires daily)
│
└─ Query posts where scheduled_date = today AND status = 'scheduled'
   ▪ For each: push to Late/Zernio API
   ▪ Update status → 'posted', store late_post_id
   ▪ If Late API fails → status = 'failed', log error
```

## Remotion Templates

5 core templates, one per strategy category. All static image output.

| Template | Category | Layout | Slots |
|----------|----------|--------|-------|
| `quote-card` | educational | Centered text over dimmed background | background_image, quote_text, attribution, logo, brand_colors |
| `quick-tip` | quick_tips | Bold number/icon top, tip text below, branded footer | background_image, tip_number, tip_text, logo, brand_colors |
| `promo-cta` | promotional | Hero image with overlay text + CTA button | background_image, headline, cta_text, logo, brand_colors |
| `testimonial` | customer_stories | Quote marks, customer text, name/role, subtle background | background_image, testimonial_text, customer_name, customer_role, logo, brand_colors |
| `behind-scenes` | behind_the_scenes | Full-bleed image with caption bar at bottom | background_image, caption_text, logo, brand_colors |

### Template Props Interface

```ts
interface SocialTemplateProps {
  templateId: string;
  backgroundImageUrl: string;
  texts: Record<string, string>;  // slot_name → content
  logo: string;                   // from brand assets
  brandColors: { primary: string; secondary: string; accent: string };
  format: '1080x1080' | '1080x1920';
}
```

Rendering: edge function calls Remotion `renderStill()` with props, uploads result to Supabase Storage, returns URL.

## Manual Post Creator (Template-Based)

Upgrades existing `PostCreatorSheet` to a template-driven visual builder.

### Flow

```
1. Pick template → visual preview cards showing each layout
2. Fill slots:
   ▪ Text inputs for each text slot (headline, body, CTA, etc.)
   ▪ Image input: upload your own OR pick from assets OR trigger AI generation
   ▪ AI assist button per text field → generates suggestion, user edits
3. Live preview → Remotion Player renders the composition in real-time
4. Pick platforms → checkboxes for connected accounts
5. Schedule or post now → date picker, or immediate push to Late
```

### UX Decisions

| Decision | Choice |
|----------|--------|
| Preview | Remotion `<Player>` component embedded in the sheet — WYSIWYG |
| Text fields | Pre-labeled per template (not generic "text 1") |
| AI text assist | "Suggest" button next to each field, editable result |
| Image source | Toggle: "Upload" / "Pick from assets" / "Generate with AI" |
| AI image prompt | Auto-generated from caption context, user can edit before generating |
| Brand elements | Logo + colors auto-populated from brand data, not editable per-post |

## Image Pipeline

### Priority Chain for Background Images

```
1. User uploads their own image → use directly
2. Asset matching → query existing brand assets, AI describes the caption,
   finds best visual match from asset library
3. AI generation → gpt-image-1 with strict prompt rules:
   ▪ "No text, no words, no letters, no logos, no watermarks"
   ▪ Style derived from brand voice (professional, playful, etc.)
   ▪ Context from caption/topic for relevance
   ▪ Output: 1080x1080 PNG
```

### Rendering Pipeline

```
background_image (from any source above)
       ↓
Remotion composition (template + brand data + texts)
       ↓
renderStill() → PNG buffer
       ↓
Upload to Supabase Storage → public URL
       ↓
Store URL on social_media_posts.image_url
```

## Daily Publisher Cron

Edge function on Supabase cron (daily, default 9am in client timezone):

```
1. Query: social_media_posts WHERE scheduled_date = today
   AND status = 'scheduled' AND late_post_id IS NULL
2. For each post:
   ▪ Look up late_profiles + late_social_accounts for client
   ▪ POST to Late API (caption + image_url + accounts)
   ▪ On success: update status → 'posted', store late_post_id
   ▪ On failure: update status → 'failed', store late_error_message
3. Log results
```

## Data Model Changes

### New Columns on `social_media_posts`

| Field | Type | Purpose |
|-------|------|---------|
| `template_id` | text | Which Remotion template was used |
| `template_props` | jsonb | Full inputProps for re-rendering |
| `image_source_type` | text | 'upload' / 'asset_match' / 'ai_generated' |
| `auto_run_id` | uuid | Links to auto run record (null for manual posts) |

### New Table: `social_auto_runs`

```sql
CREATE TABLE social_auto_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  triggered_at timestamptz DEFAULT now(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  posts_generated int DEFAULT 0,
  assets_matched int DEFAULT 0,
  assets_ai_generated int DEFAULT 0,
  month int NOT NULL,
  year int NOT NULL,
  completed_at timestamptz,
  error_log jsonb DEFAULT '[]'::jsonb
);
```

## Edge Functions

### New

| Function | Purpose |
|----------|---------|
| `social-auto-research` | Returns brand context bundle for agent (voice, assets, strategy, recent posts) |
| `social-auto-generate` | AI caption generation with brand context + topic + template assignment |
| `social-auto-render` | Remotion renderStill() + Supabase Storage upload |
| `social-auto-publish` | Daily cron — pushes scheduled posts to Late API |
| `social-auto-run-start` | Creates social_auto_runs record, returns run ID |
| `social-auto-run-complete` | Updates run record with stats |

### Existing (reused as-is)

| Function | How Used |
|----------|----------|
| `late-schedule-post` | Existing Late API integration — may be refactored into social-auto-publish |

## What Does NOT Change

- **Social media page UI** — planner, drafts, strategy tabs stay as-is
- **Calendar views** — table, monthly grid, weekly all work with auto-generated posts
- **Strategy form** — existing frequency + topic distribution config drives the agent
- **Late/Zernio integration** — same API, same `late_profiles` / `late_social_accounts` tables
- **Post editing** — clients can edit any auto-generated post before publish day
