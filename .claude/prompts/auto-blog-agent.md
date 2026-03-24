# Auto-Blog Agent — Scheduled Remote Execution Prompt

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

---

## Step 0.5: Discover Clients

Call `blog-auto-list-clients` to get all clients with auto-blog enabled.

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-list-clients" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:**
```json
{ "success": true, "clients": [{ "id": "<uuid>", "name": "...", "site_id": "...", "auto_blog_mode": "..." }] }
```

**FATAL:** If the request itself fails (network error, 500), stop and report the error.

**Early exit:** If `clients` is an empty array, log "No clients with auto-blog enabled" and exit the run. Nothing more to do.

Store the `clients` array. You will iterate over it in Steps 1–6.

---

## Client Loop: For Each Client

Run Steps 1–6 for **each client** in the `clients` array from Step 0.5. Process clients sequentially. At the start of each iteration, set `client` to the current client object (with fields `client.id`, `client.name`, `client.site_id`, `client.auto_blog_mode`).

Log `"Starting client: <client.name> (<client.id>)"` before Step 1 of each iteration.

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

**FATAL (per client):** If `success` is not `true` or `auto_run_id` is missing, skip this client, log the error, and continue to the next client. The pipeline cannot proceed for this client without a run record.

Store `auto_run_id` for all subsequent calls within this client's iteration.

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

Use the Duda MCP to understand what blog content already exists. Use `client.site_id` from the Step 0.5 list-clients response (or `bundle.client.site_id` — they are the same value).

```
mcp__claude_ai_Duda__list_blog_posts({ site_name: client.site_id })
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

**Non-fatal:** If this call fails entirely, continue without competitor gap data.

---

## Step 3: Strategy — Generate Topics

### 3a. Analyze Research

Using the research gathered in Step 2, identify topic opportunities:

1. **Competitor gaps** — topics competitors cover that the client has NOT published (compare against `bundle.recent_posts` titles and Duda posts from Step 2b)
2. **Service alignment** — topics that directly support the client's services (`bundle.services`) but haven't been blogged about
3. **Seasonal/timely** — topics relevant to the client's industry given the current date

### 3b. Determine Post Count

Use `bundle.content_strategy` to determine how many posts to generate this run:

```
posting_frequency = bundle.content_strategy.posting_frequency  (e.g. "weekly", "daily", "3x_week")
selected_days     = bundle.content_strategy.selected_days       (e.g. ["monday", "wednesday", "friday"])
content_mix       = bundle.content_strategy.content_mix         (e.g. { how_to: 40, case_studies: 20, ... })
```

- If `selected_days` has 3 entries → generate 3 topics
- If `selected_days` has 2 entries → generate 2 topics
- If `selected_days` has 1 entry → generate 1 topic
- If `content_strategy` is null → default to 3 topics
- **Hard cap: maximum 5 topics per run** to control costs

### 3c. Assign Dates

Assign `suggested_publish_date` to each topic based on `selected_days`. Use the upcoming week's matching weekdays (ISO 8601 format: `YYYY-MM-DD`). Get today's date via:

```bash
date +%Y-%m-%d
```

### 3d. Apply Content Mix Ratios

Distribute topic `category` values according to `content_mix` percentages. Valid categories:
- `how_to`
- `case_studies`
- `industry_news`
- `best_practices`
- `company_updates`

If `content_mix` is null, use: `how_to: 40%, best_practices: 30%, industry_news: 30%`

### 3e. Build Topic List

Each topic must have:
```json
{
  "title": "string — specific, keyword-rich, matches user search intent",
  "summary": "string — 1-2 sentences describing the article angle",
  "category": "how_to | case_studies | industry_news | best_practices | company_updates",
  "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
  "suggested_publish_date": "YYYY-MM-DD",
  "priority": 1
}
```

**Topic quality rules:**
- Title must be specific — no vague titles like "Tips for Your Business"
- Title must target a keyword that matches user search intent
- Do NOT generate topics already covered in `bundle.recent_posts` or Duda posts
- Do NOT generate topics listed in `bundle.blog_preferences.topics_to_avoid`
- Prefer topics with clear commercial or informational search intent
- Never generate seasonal fluff with no ranking intent

### 3f. Save Topics

Get current month and year:
```bash
date +%-m   # month as number, no leading zero
date +%Y    # year
```

```bash
curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-save-topics" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "<client.id>",
    "auto_run_id": "<auto_run_id>",
    "month": <month_number>,
    "year": <year_number>,
    "topics": [<topic objects from 3e>]
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

Log `"Completed client: <client.name>"` after Step 6 completes for this client.

---

## End of Client Loop

After all clients have been processed, log a final summary:

```
Auto-blog run complete.
Clients processed: <count>
```

---

## Error Handling Reference

| Step | Error Type | Action |
|------|-----------|--------|
| Step 0.5: list-clients | Network/500 error | **FATAL** — stop, report error |
| Step 0.5: list-clients | Empty clients array | Exit gracefully — log "No clients enabled" |
| Step 1: run-start | Any error | Skip this client, continue to next |
| Step 2a: research | HTTP error | Log, continue with empty bundle |
| Step 2b: Duda MCP | Any error | Log, skip Duda coverage check |
| Step 2c: competitors | HTTP error | Log, continue without gap data |
| Step 3f: save-topics | HTTP error | Log, continue writing with `topic_id: null` |
| Step 4b: auto-write | HTTP error | Log, skip topic, continue to next |
| Step 5: revision | All 3 attempts fail | Mark as flagged, continue |
| Step 6: queue | HTTP error | Log, report final error — client run still complete |

**General rule:** Never abort the entire pipeline for a per-client error. Always attempt all clients. Always call `blog-auto-queue` at the end of each client's run even if some topics failed.

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

When embedding large strings (like `system_prompt`) in curl `-d` JSON, use a bash heredoc or temp file to avoid shell escaping issues:

```bash
# Write payload to temp file, then curl it
cat > /tmp/blog_write_payload.json << 'PAYLOAD'
{
  "client_id": "<client.id>",
  "system_prompt": "...your full system prompt here..."
}
PAYLOAD

curl -s -X POST "{{SUPABASE_URL}}/functions/v1/blog-auto-write" \
  -H "x-auto-blog-key: {{AUTO_BLOG_API_KEY}}" \
  -H "Content-Type: application/json" \
  -d @/tmp/blog_write_payload.json
```

---

## Completion Checklist

Before finishing the run, verify:

- [ ] `blog-auto-list-clients` was called and clients were discovered
- [ ] Each client with auto-blog enabled was processed (or skipped with a logged error)
- [ ] For each client: `auto_run_id` was obtained in Step 1
- [ ] For each client: brand context bundle was fetched (or gracefully skipped)
- [ ] For each client: topics were generated and saved (or attempted)
- [ ] For each client: all topics (up to 5) were written
- [ ] For each client: quality gate was applied to every written article
- [ ] For each client: articles that failed the gate were revised up to 3 times
- [ ] For each client: `blog-auto-queue` was called with final `post_ids` and `flagged_post_ids`
- [ ] For each client: `research_summary` accurately reflects what happened this run
