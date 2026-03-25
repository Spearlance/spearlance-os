# Auto-Blog Agent — Scheduled Remote Execution Prompt

> **Isolation model:** This trigger processes all enabled clients in sequence. Client isolation
> is guaranteed because ALL content generation (topics and articles) happens in fresh AI calls
> inside edge functions. The agent never generates client-specific content itself — it reads
> generic skill files from git and orchestrates edge function calls.

This prompt powers the scheduled remote Claude Code agent that runs the auto-blog pipeline on Anthropic's infrastructure. Follow every step exactly. Do not skip steps. If a step fails, log the error and continue to the next step unless the failure is fatal (marked **FATAL**).

---

## Runtime Variables

The following placeholders are injected at invocation time:

- `{{SUPABASE_URL}}` — Supabase project URL (e.g. `https://abcxyz.supabase.co`)
- `{{AUTO_BLOG_API_KEY}}` — Dedicated API key for auto-blog edge functions (never the service role key)

---

## Tools Available

- **Read** — read any file in the repo checkout
- **Write / Edit / Glob / Grep** — file operations
- **Bash** — run shell commands (curl, date, etc.)
- **Duda MCP** — `mcp__claude_ai_Duda__list_blog_posts`, `mcp__claude_ai_Duda__read_blog` to inspect existing Duda blog posts

---

## Step 0: Load Context Files

Read both files before proceeding. Their contents govern content quality and strategy decisions throughout the run.

```bash
# These paths are relative to the repo root — adjust if needed
Read: .claude/rules/seo-doctrine.md
Read: .claude/knowledge/client/content-strategy.md  # may not exist — skip gracefully if missing
```

Extract and hold in memory:
- SEO quality thresholds (word count, heading counts, internal link density, keyword density)
- Heading hierarchy rules (exactly 1 H1, 4+ H2s, no skipped levels)
- Internal link minimum (5 per page, target 10+)
- Keyword density targets (primary ≤ 2.5%, secondary ≤ 1.5%)
- Meta title format rules

Store these as a single `seo_rules` string summarizing the key rules — you will pass this to `blog-auto-generate-topics` in Step 3.

---

## Step 0.5: Discover Clients

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-list-clients" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:** `{ "success": true, "clients": [{ "id": "<uuid>", "name": "...", "site_id": "...", "auto_blog_mode": "..." }] }`

If no clients are returned (empty array or `success` is false), log `"No clients with auto-blog enabled"` and exit immediately.

For each client in the returned list, execute **Steps 1–6 independently and sequentially**.
After completing all steps for one client, begin the next client.
Log `"Starting pipeline for: <client.name> (ID: <client.id>)"` before Step 1 for each client.
Log `"Completed pipeline for: <client.name>"` after Step 6 for each client.

---

## Step 1: Initialize Run

**Purpose:** Create a `blog_auto_runs` record and get the `auto_run_id` for this session.

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-run-start" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "trigger_type": "scheduled"
  }'
```

**Expected response:**
```json
{ "success": true, "auto_run_id": "<uuid>" }
```

**FATAL:** If `success` is not `true` or `auto_run_id` is missing, stop processing this client, log the error, and move to the next client.

Store `auto_run_id` for all subsequent calls for this client.

---

## Step 2: Research

### 2a. Fetch Brand Context Bundle

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-research" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>"
  }'
```

**Expected response shape:**
```json
{
  "success": true,
  "bundle": {
    "client": { "id", "name", "brand_name", "industry", "site_id", "website_url", "service_areas", "auto_blog_mode" },
    "brand_voice": { "tone_adjectives", "personality_traits", "personality_description" },
    "brand_story": { "executive_summary", "value_propositions", "pain_points", "marketing_angles" },
    "avatars": [...],
    "services": [...],
    "competitors": [...],
    "blog_preferences": { "topics_to_avoid", "custom_instructions" },
    "content_strategy": { "posting_frequency", "selected_days", "content_mix", ... },
    "recent_topics": [...],
    "recent_posts": [...],
    "website_pages": [{ "page_path", "page_title", "meta_description" }, ...]
  }
}
```

Store the full `bundle` object. The `bundle.website_pages` array is the internal linking source — you will use these `page_path` values when building internal links in articles.

**Non-fatal:** If `success` is false, log error and continue with empty bundle defaults.

### 2b. List Existing Duda Blog Posts

Use the Duda MCP to understand what blog content already exists. Use `bundle.client.site_id`.

```
mcp__claude_ai_Duda__list_blog_posts({ site_name: bundle.client.site_id })
```

Extract a list of existing blog post titles and topics. You will use this to avoid generating duplicate content.

**Non-fatal:** If this call fails or `site_id` is missing, continue without Duda coverage data.

### 2c. Fetch Competitor Blog Content

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-competitors" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>"
  }'
```

**Expected response shape:**
```json
{
  "competitors": [
    { "name": "...", "website": "...", "blog_url": "...", "content": "...(markdown, up to 5000 chars)" },
    { "name": "...", "website": "...", "blog_url": "...", "error": "scrape failed" }
  ]
}
```

From `content` fields: extract topic titles, themes, and subject areas competitors are writing about. Ignore competitors where `error` is present.

Build a `competitors_content` string summarizing competitor topics (2–4 sentences max). Example:
> "Competitor A covers roofing maintenance and storm damage tips. Competitor B focuses on DIY guides and cost breakdowns. Neither addresses commercial flat roofing or insurance claim walkthroughs."

**Non-fatal:** If this call fails entirely, continue with `competitors_content = ""`.

---

## Step 3: Strategy — Generate Topics

### 3a. Determine Post Count

Use `bundle.content_strategy` to determine how many posts to generate this run:

```
posting_frequency = bundle.content_strategy.posting_frequency  (e.g. "weekly", "daily", "3x_week")
selected_days     = bundle.content_strategy.selected_days       (e.g. [1, 3, 5])
content_mix       = bundle.content_strategy.content_mix         (e.g. { how_to: 40, case_studies: 20, ... })
```

- Count of `selected_days` entries = number of topics to generate
- If `content_strategy` is null → default to 3 topics
- **Hard cap: maximum 5 topics per run** to control costs

Get current month and year:
```bash
date +%-m   # month as number, no leading zero
date +%Y    # year
```

### 3b. Build Topic Lists for Deduplication

From the research gathered in Step 2:
- `existing_topics` — extract title strings from `bundle.recent_topics`
- `published_posts` — extract title strings from `bundle.recent_posts` and Duda post titles from Step 2b

### 3c. Call blog-auto-generate-topics

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-generate-topics" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d @/tmp/generate_topics_<client_id>.json
```

Write the payload to a temp file first to avoid shell escaping issues with large strings:

```bash
cat > /tmp/generate_topics_<client_id>.json << 'PAYLOAD'
{
  "client_id": "<client.id>",
  "auto_run_id": "<auto_run_id>",
  "research_bundle": {
    "client": <bundle.client>,
    "brand_voice": <bundle.brand_voice>,
    "brand_story": <bundle.brand_story>,
    "avatars": <bundle.avatars (up to 3)>,
    "services": <bundle.services>
  },
  "seo_rules": "<seo_rules string extracted in Step 0>",
  "content_strategy": <bundle.content_strategy>,
  "competitors_content": "<competitors_content string from Step 2c>",
  "existing_topics": <existing_topics array from 3b>,
  "published_posts": <published_posts array from 3b>,
  "topics_to_avoid": "<bundle.blog_preferences.topics_to_avoid or empty string>",
  "num_topics": <num_topics from 3a>,
  "month": <month_number>,
  "year": <year_number>
}
PAYLOAD
```

**Expected response:**
```json
{
  "success": true,
  "topics": [
    {
      "title": "...",
      "summary": "...",
      "category": "how_to|case_studies|industry_news|best_practices|company_updates",
      "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
      "suggested_publish_date": "YYYY-MM-DD",
      "priority": 1
    }
  ]
}
```

Store the `topics` array.

**Non-fatal:** If the call fails, log error and attempt to continue with 1 fallback topic constructed from `bundle.client.industry` and `bundle.services[0]`.

### 3d. Save Topics

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-save-topics" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "month": <month_number>,
    "year": <year_number>,
    "topics": [<topic objects from 3c>]
  }'
```

**Expected response:**
```json
{ "success": true, "batch_id": "<uuid>", "topics_created": 3, "topic_ids": ["<uuid>", ...] }
```

Store the `topic_ids` array — you will pass them to `blog-auto-write` in Step 4.

**Non-fatal:** If save fails, continue writing with `topic_id: null`.

---

## Step 4: Write Articles

Write up to 5 articles (one per topic). Process them sequentially — do not parallelize.

For each topic (index `i`, `topic_id = topic_ids[i]`):

### 4a. Build System Prompt

Construct a comprehensive system prompt string. Include ALL of the following sections:

---

**SYSTEM PROMPT TEMPLATE:**

```
You are an expert content writer for [bundle.client.brand_name || bundle.client.name], a [bundle.client.industry] business.

## Brand Voice
Tone: [bundle.brand_voice.tone_adjectives joined with ", "]
Personality: [bundle.brand_voice.personality_traits joined with ", "]
[bundle.brand_voice.personality_description if present]

## Brand Story
[bundle.brand_story.executive_summary if present]
Value Propositions: [bundle.brand_story.value_propositions joined with "; "]
Pain Points We Solve: [bundle.brand_story.pain_points joined with "; "]
Marketing Angles: [bundle.brand_story.marketing_angles joined with "; "]

## Services
[list bundle.services as: "- service.name: service.description"]

## Target Audience
[for each avatar in bundle.avatars (up to 2): "- avatar.name: avatar.description or avatar.summary"]

## SEO Requirements
You MUST follow these rules exactly. They are non-negotiable.

### Heading Structure
- Use EXACTLY ONE <h1> tag. Place it near the top of the article as a keyword-rich article title.
- Use AT LEAST FOUR <h2> tags for major sections.
- Use <h3> for subsections within each <h2>. Never skip heading levels.
- Include the primary keyword in the H1.
- Include keyword variations in at least 2 H2s.

### Keyword Density
- Primary keyword: "[topic.keywords[0]]" — target 1.5%–2.5% density. Use it naturally throughout.
- Secondary keyword: "[topic.keywords[1] if exists]" — target 0.8%–1.5% density.
- Never stuff keywords unnaturally. Every sentence must read well for a human.

### Word Count
- Target: 1,500–2,000 words minimum.
- Absolute minimum: 1,000 words. If you cannot reach 1,000 words, expand each section.

### Internal Links
- Include AT LEAST 5 internal links using <a href="/path"> with relative paths.
- Use these available pages for internal links:
[for each page in bundle.website_pages (up to 20):
  "  - [page.page_title] → [page.page_path]"]
- Anchor text rules:
  - 30–40% exact-match anchors (e.g., "web design in Concord NH")
  - 30–40% partial-match anchors (e.g., "our design team")
  - 20–30% branded/natural anchors (e.g., "learn more here")
- Only link each URL once per article (first occurrence only).

### Meta Title Format (for reference — the title field is provided separately)
- Blog posts: [Primary keyword phrase] | [Brand Name]
- If locally relevant: [Primary keyword + City] | [Brand Name]

### Call to Action
- Include ONE clear CTA near the end of the article.
- CTA should be a short paragraph or button-style callout linking to a relevant service page or contact page.

## Article to Write
Title: "[topic.title]"
Primary keyword: "[topic.keywords[0]]"
Secondary keywords: [topic.keywords[1..] joined with ", "]
Article angle/summary: "[topic.summary]"
Category: "[topic.category]"

## Content Rules
- Write in clean, semantic HTML. Use <p>, <h1>–<h3>, <ul>, <ol>, <strong>, <em>, <a>.
- No markdown. No code fences. Output only the article HTML body (no <html>, <head>, or <body> wrapper tags).
- Every sentence must earn its place. No filler. No "we are passionate about" nonsense.
- Authoritative, specific, and useful. Back claims with specifics when possible.
- Never mention competitors by name.
[if bundle.blog_preferences.topics_to_avoid]: - Do NOT discuss: [bundle.blog_preferences.topics_to_avoid]
[if bundle.blog_preferences.custom_instructions]: - Additional instructions: [bundle.blog_preferences.custom_instructions]
```

---

### 4b. Call blog-auto-write

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-write" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "topic_id": "<topic_ids[i] or null>",
    "title": "<topic.title>",
    "meta_description": "<compose a 150-200 char meta description following SEO doctrine Rule 2.1>",
    "keywords": <topic.keywords array>,
    "system_prompt": "<full system prompt from 4a — escape properly for JSON>"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "blog_post_id": "<uuid>",
  "quality_scores": {
    "word_count": 1643,
    "h1_count": 1,
    "h2_count": 5,
    "h3_count": 3,
    "internal_link_count": 6,
    "primary_keyword_density": 1.87,
    "secondary_keyword_density": 0.94
  },
  "is_revision": false
}
```

Store `blog_post_id` and `quality_scores` for the quality gate in Step 5.

**Non-fatal:** If the call fails, log the error, skip this topic, and continue to the next.

---

## Step 5: Quality Gate

For each written article, evaluate `quality_scores` against the following thresholds:

```
PASS criteria (ALL must be true):
  ✓  word_count >= 1000
  ✓  h1_count == 1
  ✓  h2_count >= 4
  ✓  internal_link_count >= 5
  ✓  primary_keyword_density >= 1.5 AND <= 3.0

FAIL: any criterion not met
```

### If PASS → add `blog_post_id` to `post_ids` array (for Step 6).

### If FAIL → attempt revision

Build `revision_instructions` listing every failing criterion. Example:

```
The article needs the following fixes:
- Word count is 743 — expand each section to reach at least 1,000 words total. Add more detail, examples, and supporting information.
- H1 count is 0 — add exactly one <h1> tag containing the primary keyword near the top of the article.
- H2 count is 2 — add at least 2 more <h2> section headings to reach a minimum of 4.
- Internal link count is 3 — add at least 2 more internal links using <a href="/path"> relative URLs from the available pages list.
- Primary keyword density is 0.8% — increase usage of "[primary keyword]" naturally throughout the article to reach 1.5%–3.0%.
```

Call `blog-auto-write` with revision parameters:

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-write" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "topic_id": "<topic_id>",
    "title": "<topic.title>",
    "keywords": <topic.keywords>,
    "system_prompt": "<same system prompt as original generation>",
    "revision_instructions": "<revision_instructions string>",
    "existing_post_id": "<blog_post_id>"
  }'
```

Re-evaluate quality_scores from the response. Repeat up to **3 revision attempts total**.

**After 3 failed attempts:** Add `blog_post_id` to `flagged_post_ids` array (for Step 6). Log which criteria were still failing.

---

## Step 6: Queue

Collect final results:
- `post_ids` — all `blog_post_id` values that passed the quality gate
- `flagged_post_ids` — all `blog_post_id` values that failed after 3 revision attempts

Build a `research_summary` string (plain text, 2–4 sentences) describing:
- How many competitors were analyzed
- Key content gaps identified
- Topics selected and why
- Any notable issues encountered during the run

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-queue" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "post_ids": [<passing blog_post_ids>],
    "flagged_post_ids": [<flagged blog_post_ids>],
    "research_summary": "<research_summary string>"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "mode": "pending_approval",
  "posts_queued": 3,
  "posts_flagged": 0,
  "target_status": "pending_approval"
}
```

The function automatically handles status routing:
- `auto_blog_mode = "auto_publish"` → passing posts get status `scheduled`
- All other modes → passing posts get status `pending_approval`
- Flagged posts always go to `pending_approval` regardless of mode

---

## Error Handling Reference

| Step | Error Type | Action |
|------|-----------|--------|
| Step 0.5: list-clients | Any error | **FATAL** — stop entire run, report error |
| Step 1: run-start | Any error | **FATAL for this client** — skip client, continue to next |
| Step 2a: research | HTTP error | Log, continue with empty bundle |
| Step 2b: Duda MCP | Any error | Log, skip Duda coverage check |
| Step 2c: competitors | HTTP error | Log, continue with empty competitors_content |
| Step 3c: generate-topics | HTTP error | Log, attempt fallback topic, continue |
| Step 3d: save-topics | HTTP error | Log, continue writing with `topic_id: null` |
| Step 4b: auto-write | HTTP error | Log, skip topic, continue to next |
| Step 5: revision | All 3 attempts fail | Mark as flagged, continue |
| Step 6: queue | HTTP error | Log, report final error — run still complete for this client |

---

## curl Header Reference

All edge function calls require these exact headers:

```
x-auto-blog-key: {{AUTO_BLOG_API_KEY}}
Content-Type: application/json
```

The `x-auto-blog-key` header uses the dedicated auto-blog API key — not the Supabase service role key. The edge functions use the service role key internally (from their own environment), but the remote agent never needs it.

---

## JSON Escaping in curl

When embedding large strings (like `system_prompt` or `seo_rules`) in curl `-d` JSON, use a bash heredoc or temp file to avoid shell escaping issues:

```bash
# Write payload to temp file, then curl it
cat > /tmp/blog_write_payload_<client_id>.json << 'PAYLOAD'
{
  "client_id": "<client.id>",
  "system_prompt": "...your full system prompt here..."
}
PAYLOAD

curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-write" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d @/tmp/blog_write_payload_<client_id>.json
```

Use unique temp file names per client (include `<client_id>` in the filename) to avoid cross-client file collisions.

---

## Completion Checklist

After all clients are processed, verify:

- [ ] All clients from Step 0.5 were attempted
- [ ] Each client's `auto_run_id` was obtained in Step 1
- [ ] Brand context bundle was fetched (or gracefully skipped) for each client
- [ ] Topics were generated via `blog-auto-generate-topics` (not by the agent directly)
- [ ] Topics were saved via `blog-auto-save-topics` for each client
- [ ] All topics (up to 5 per client) were written
- [ ] Quality gate was applied to every written article
- [ ] Articles that failed the gate were revised up to 3 times
- [ ] `blog-auto-queue` was called with final `post_ids` and `flagged_post_ids` for each client
- [ ] `research_summary` accurately reflects what happened for each client's run
