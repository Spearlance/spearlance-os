# Auto-Blog System v2 — Design Document

> **Status:** Approved 2026-03-24
> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement the plan derived from this design.

## Overview

Replace the current "dumb pipeline" blog system (single AI call per step) with an intelligent auto-blog system that researches, strategizes, writes, self-reviews, and queues polished drafts for approval — all running autonomously on Anthropic's cloud via scheduled Claude Code remote agents.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Approval flow | **Mode B** (generate + queue for approval) default, **Mode A** (auto-publish) toggle |
| Intelligence location | **Hybrid** — remote agent is the brain, edge functions are the hands |
| Research depth | **Internal + competitive** (Phase C: real-time SERP analysis later) |
| Quality gate | **Heavy** — self-review + self-fix, max 3 revision cycles |
| Hosting | **Anthropic cloud** via `/schedule` remote triggers |
| Brand context | Full client profile pulled every run |

## Architecture

```
SCHEDULED REMOTE AGENT (Anthropic cloud, cron-triggered)
│
│  Has: Git checkout (skills, SEO doctrine, rules)
│  Has: Duda MCP (published blog access)
│  Has: Bash (curl to edge functions)
│  Does NOT have: Raw API keys, local env vars
│
├─ STEP 1: RESEARCH
│  ▪ Read SEO doctrine + content-strategy skill from git checkout
│  ▪ Read published blogs via Duda MCP
│  ▪ curl → blog-auto-research (brand context bundle)
│  ▪ curl → blog-auto-competitors (Firecrawl competitor scrape)
│  → Outputs: research brief
│
├─ STEP 2: STRATEGY
│  ▪ Read strategy config from Supabase (via curl)
│  ▪ Apply content mix percentages
│  ▪ Agent generates topics using research + SEO doctrine + competitor gaps
│  ▪ curl → blog-auto-save-topics
│  → Outputs: topic plan
│
├─ STEP 3: WRITE (per article)
│  ▪ Agent builds brief from brand context + research + SEO doctrine
│  ▪ curl → blog-auto-write (AI generates article)
│  ▪ Agent reviews output against quality checklist
│  ▪ If fails → curl → blog-auto-write (with fix instructions)
│  ▪ Max 3 revision cycles
│  → Outputs: draft article in Supabase
│
├─ STEP 4: QUALITY GATE
│  ▪ Agent reads draft back from Supabase
│  ▪ Checks against SEO doctrine checklist (see below)
│  ▪ If fails → sends fix instructions for targeted rewrite
│  ▪ If unfixable after 3 attempts → flags for human review
│  → Outputs: scored, polished draft
│
└─ STEP 5: QUEUE
   ▪ curl → blog-auto-queue
     Mode B: status = "pending_approval"
     Mode A: status = "scheduled"
   ▪ curl → blog-auto-notify (optional webhook)
   ▪ Log run to blog_auto_runs table
```

## Edge Functions

### Existing (keep as-is)
- `blog-publish-to-duda` — publishes approved posts to Duda
- `blog-schedule-check` — cron fires, publishes scheduled posts
- `blog-generate-images` — image generation

### New (thin wrappers for agent orchestration)
- `blog-auto-research` — returns brand context bundle (client, brand voice, story, avatars, services, competitors, AI prefs, strategy, existing topics, published posts, analyzed pages)
- `blog-auto-competitors` — scrapes competitor blogs via Firecrawl, returns recent posts with topics/keywords
- `blog-auto-write` — upgraded article generation with research context, SEO rules, and optional revision instructions
- `blog-auto-save-topics` — batch save generated topics to Supabase
- `blog-auto-queue` — set post status (pending_approval or scheduled) and notify
- `blog-auto-notify` — webhook/email notification of new drafts

### Deprecated (agent replaces their intelligence)
- `blog-generate-monthly-topics` → replaced by agent + `blog-auto-save-topics`
- `blog-generate-outline` → agent generates outlines directly using skill knowledge
- `blog-generate-article` → replaced by `blog-auto-write`

Note: deprecated functions stay deployed for backward compatibility with existing UI manual flows until the UI is updated.

## New Supabase Tables

```sql
-- Tracks each auto-blog run
CREATE TABLE blog_auto_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  triggered_at timestamptz DEFAULT now(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  topics_generated int DEFAULT 0,
  articles_generated int DEFAULT 0,
  articles_passed_gate int DEFAULT 0,
  articles_flagged int DEFAULT 0,
  research_summary jsonb,
  completed_at timestamptz,
  error_log text,
  created_at timestamptz DEFAULT now()
);
```

### blog_posts table changes
New status values: `pending_approval`, `rejected`, `auto_draft`
New columns:
- `auto_run_id` (uuid FK → blog_auto_runs) — which auto run generated this post
- `quality_scores` (jsonb) — detailed breakdown from quality gate
- `rejection_reason` (text) — why user rejected (feeds learning loop)
- `revision_count` (int) — how many quality gate cycles it went through

### clients table changes
New columns:
- `auto_blog_mode` (text, default 'off') — 'off' | 'queue' | 'auto_publish'
- `auto_blog_schedule` (text) — cron expression for this client's auto runs

## Quality Gate Checklist

| Check | Threshold | Auto-fix Action |
|-------|-----------|-----------------|
| Word count | 1,500+ service page, 1,000+ blog post, 1,200+ city page | Expand thin sections |
| Primary keyword density | 2.0-2.5% | Rewrite to inject/reduce keyword naturally |
| Secondary keyword density | 1.0-1.5% | Inject secondary keywords naturally |
| Internal links | Min 5, target 10+ | Add links from analyzed pages list |
| H1 count | Exactly 1 | Fix heading structure |
| H2 count | Min 4, target 6-8 | Add/split sections |
| H2/H3 hierarchy | No skipped levels (no H2→H4) | Restructure headings |
| Meta title | SEO doctrine format: [Primary KW + City] | [Var 2] | [Brand] | Rewrite per template |
| Meta description | 150-160 chars, keyword + city + CTA | Rewrite |
| Brand voice | Matches tone adjectives from client profile | Rewrite off-voice sections |
| CTA present | At least one, matches configured cta_type | Add CTA if missing |
| Anchor text distribution | 30-40% exact match, 30-40% partial, 20-30% branded | Adjust anchor text |
| FAQ items (local pages) | Min 3, target 5-7 | Generate FAQ section |
| No duplicate topics | Title doesn't match existing published posts | Reject and regenerate |

## UI Changes

### Blog Writer page additions:
1. **Approval Queue tab** — shows `pending_approval` drafts with:
   - Quality score badges (word count, SEO, readability, brand voice)
   - Approve / Reject / Edit actions
   - Rejection reason field (feeds learning loop)
2. **Auto-Mode toggle** — per-client setting: Off / Queue (B) / Auto-Publish (A)
3. **Auto-Run History** — past runs with stats (topics generated, articles passed, flagged)
4. **Manual Trigger button** — "Run Auto-Blog Now" (calls the scheduled trigger immediately)

## Learning Loop

| Signal | How Agent Uses It |
|--------|-------------------|
| Published blogs (Duda MCP) | Avoids duplicate topics, understands coverage |
| Competitor blogs (Firecrawl) | Identifies gaps and differentiation angles |
| Rejected drafts (status = 'rejected') | Reads rejection_reason, avoids patterns |
| Approved drafts (status = 'published') | Reinforces successful patterns |
| Content strategy knowledge file | Agent appends insights after each run |
| AI Preferences (topics_to_avoid, custom_instructions) | Hard constraints on every run |

## Agent Prompt Design

The scheduled agent's prompt encodes the full pipeline:
1. Read `.claude/rules/seo-doctrine.md` for SEO rules
2. Read `.claude/skills/content-strategy/SKILL.md` for strategy guidance
3. curl `blog-auto-research` to get brand context for target client
4. Read published blogs via Duda MCP to understand existing coverage
5. curl `blog-auto-competitors` to find content gaps
6. Generate topics that fill gaps + follow content mix ratios
7. For each topic: curl `blog-auto-write` → review against quality checklist → fix → queue
8. curl `blog-auto-queue` to save results with appropriate status
9. Log the entire run to `blog_auto_runs`

## Future: Phase C (SERP Intelligence)

Deferred to a separate initiative. See memory: `project_blog_auto_serp_upgrade.md`
- Real-time SERP analysis for target keywords
- "People Also Ask" mining
- Trending industry news detection
- Keyword difficulty scoring
