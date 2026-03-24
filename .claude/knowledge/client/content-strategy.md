# Content Strategy
<!-- Sources: seo-doctrine.md (Sections 6, 7, 13, 16, 18), blog_content_strategy config schema -->

## Content Pillars

Five standard pillar categories map directly to `content_mix` keys in `blog_content_strategy`:

| Key | Label | Purpose |
|-----|-------|---------|
| `how_to` | How-to Guides | Step-by-step educational content teaching skills relevant to the client's industry. Must demonstrate genuine expertise — not surface-level overviews. |
| `case_studies` | Case Studies | Real results, client success stories, before/after comparisons. Cite specific metrics where available (e.g., "42% more leads in 60 days"). |
| `industry_news` | Industry News | Trends, regulation changes, market analysis. Must add editorial perspective — not just a repost. |
| `best_practices` | Best Practices | Expert tips, proven strategies, professional standards. Should be authoritative enough that a competitor can't copy it without domain knowledge. |
| `company_updates` | Company Updates | Team highlights, new services, awards, milestones. Keep these short — they support brand trust, not ranking. |

**Pillar weight rule:** The `content_mix` percentages in strategy config must sum to 100. If unset, agent defaults to: `how_to: 35`, `best_practices: 30`, `industry_news: 20`, `case_studies: 10`, `company_updates: 5`.

---

## Quality Gate Checklist

Every draft must pass ALL thresholds before it can be approved. These are minimums — target values should be the goal.

| Metric | Blog Post | Service Page | City Page |
|--------|-----------|-------------|-----------|
| Word count | 1,000+ (target 1,500–2,000) | 1,500+ (target 2,000–2,500) | 1,200+ (target 1,500–2,000) |
| H2 headings | 4+ | 6+ | 4+ |
| Internal links | 5+ (target 10+) | 10+ | 5+ (target 10+) |
| FAQ items | 3+ | 3+ | 5+ |
| Primary KW density | 2.0–2.5% | 2.0–2.5% | 2.0–2.5% |
| Secondary KW density | 1.0–1.5% | 1.0–1.5% | 1.0–1.5% |

**Rewrite triggers (hard failures):**
- Blog post below 800 words → reject, expand
- Service page below 1,200 words → reject, expand
- City page below 1,000 words → reject, expand
- Fewer than 3 internal links → reject, add links
- Fewer than 3 H2 headings → reject, restructure

**Density calculation:** `(occurrences of primary keyword / total word count) × 100`. Count stemmed variants (e.g., "designs", "designed" count toward "web design" density). Never count keyword in title/meta separately from body.

---

## Publishing Cadence Rules

| Level | Frequency |
|-------|-----------|
| Target | Minimum 3 posts per week. Daily if capacity allows. |
| Floor | Never below 2 posts per week. Non-negotiable. |

**Override behavior:** If strategy config specifies `posts_per_week`, that value governs. The floor (2/week) cannot be overridden below 2 — reject any config value lower than 2.

**Scheduling logic:**
- Spread posts throughout the week — never batch-publish multiple posts on the same day unless explicitly requested
- Prioritize high-intent content types for the first post of each week
- Company updates are best scheduled mid-week (Tuesday–Wednesday)

---

## Content Type Priority

Ranked by SEO impact. When queue is full or capacity is limited, execute in this order:

1. **High-intent informational** — targets commercial or transactional queries. Readers are actively evaluating a purchase or service. Highest conversion proximity.
2. **Legal/regulatory guides** — low competition, high trust signal, evergreen. Especially effective in construction and healthcare verticals.
3. **Strategic how-to with expertise** — step-by-step guides that demonstrate domain authority. Must go deeper than the top-ranking competitor.
4. **Industry updates** — algorithm changes, market shifts, new regulations. Time-sensitive — publish within 72 hours of the trigger event.
5. **Authoritative listicles** — only if backed by real data, original research, or industry stats. Listicles without a data backbone are filler.

---

## Never Publish

Hard stops — content matching these patterns must be rejected before generation, not after:

- **Magazine-style filler** with no keyword ranking intent. If it could appear in a general lifestyle blog, it doesn't belong here.
- **Seasonal fluff** that doesn't target a specific search query (e.g., "Happy Thanksgiving from our team").
- **Rehashed site content** — any draft that substantially repeats existing page content without adding new depth, examples, or data.
- **Unreviewed AI output** — all AI-generated drafts must pass the quality gate checklist before approval. Verbatim AI output with no human review is a publish blocker.
- **Keyword-stuffed content** that exceeds 2.5% primary keyword density — this signals manipulation and degrades readability.

---

## Learning Loop Signals

The auto-blog agent improves over time by reading these signal sources before generating new content:

| Signal Source | What It Teaches |
|---------------|-----------------|
| Published blogs | Avoid duplicate topics. If a topic is covered, the new post must find a unique angle or expand with significantly more depth. |
| Competitor blogs | Identify content gaps — topics competitors rank for that the client doesn't cover yet. These are priority targets. |
| Rejected drafts | Learn from rejection reasons. If a draft was rejected for thin content, the next draft on a similar topic must address that gap explicitly. |
| Approved drafts | Reinforce winning patterns — tone, structure, keyword density range, H2 distribution. |
| AI Preferences | Hard constraints enforced every run. These override all other signals and cannot be relaxed. |

**Loop behavior:** Before generating a new brief, agent must:
1. Check published topic list — no exact duplicates
2. Check rejected draft log — if similar topic was rejected, note the reason and address it
3. Check AI Preferences — apply all hard constraints before ideation begins

---

## Interlinking Rules

Sourced from SEO Doctrine Section 7. These apply to every piece of content published.

### Density

- Minimum 5 internal links per page
- Target 10+ when content length and structure allow
- Every first mention of a keyword matching an existing service or city page must be linked

### Anchor Text Distribution

| Anchor Type | Target | Example |
|-------------|--------|---------|
| Exact match | 30–40% | "web design in Concord NH" → `/web-design/concord-nh` |
| Partial match | 30–40% | "our Concord web design team" → `/web-design/concord-nh` |
| Branded/natural | 20–30% | "learn more here", "Spearlance's services" |

### Linking Patterns

```
Blog post mentions a service keyword → Link to service page
Blog post mentions a city → Link to city page (if exists)
City page references neighboring towns → Link to those town pages
Service page references a related service → Link to that service page
Any page references the pillar topic → Link to pillar page
```

**Hard constraints:**
- Never link the same URL more than once per page — first occurrence only
- Never add a link that forces awkward anchor text — if it doesn't read naturally, skip it and find a better anchor elsewhere

---

## Pillar Page Architecture

Every major service must maintain a pillar structure. Blog content must reinforce this — not float independently.

```
Pillar Page: /web-design/
├── Supporting Article: /blog/how-to-choose-a-web-designer/
├── Supporting Article: /blog/web-design-cost-guide/
├── Supporting Article: /blog/custom-website-vs-template/
├── City Page: /web-design/concord-nh
├── City Page: /web-design/manchester-nh
└── City Page: /web-design/nashua-nh
```

**Linking rules within pillar structure:**
- Every supporting article links back to its pillar page
- Pillar page links to all supporting articles
- Cross-link between related pillars (e.g., `/web-design/` ↔ `/seo/`)
- City pages link to pillar and to adjacent city pages

**Blog assignment:** When generating a new post, the agent must identify which pillar it supports and ensure a link back to that pillar is included. Posts that don't support any existing pillar are low priority unless they establish a new pillar.

---

## Page Context Protection

Before any content is generated or optimized, the agent must identify and lock the page's primary intent. Optimizations must reinforce intent — never redirect it.

```
Service page → stays a service page
  Pricing can be a section (H2) or FAQ — never the primary focus

Blog post → stays a blog post
  Service CTAs are fine; full service page treatment is not

City page → stays a city page
  Do not dilute with non-local content that removes geographic focus

If a secondary keyword would redefine the page → create a new page
```

**Escalation trigger:** If generating content would shift a page's identity, stop. Document the opportunity, recommend a new page, and flag for review.

---

## Agent Operating Checklist

Run this before every content generation cycle:

1. Read published topic list → confirm no exact duplicates
2. Read AI Preferences → load all hard constraints
3. Read rejected draft log → note patterns to avoid
4. Identify target pillar for new post → confirm linking plan
5. Apply quality gate thresholds before marking any draft as passing
6. Verify anchor text distribution plan before finalizing internal links
7. Confirm publishing cadence — never schedule below the 2/week floor
