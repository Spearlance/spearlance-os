---
model: claude-sonnet-4-6
name: content-strategy
description: Use when building topic clusters, creating content briefs, planning editorial calendars, analyzing content gaps, or evaluating content quality. Also use when developing E-E-A-T signals or creating AI-aware content guidelines for service businesses.
---

# Content Strategy

## Overview

SEO-driven content strategy for service businesses — topic cluster architecture, content gap analysis, content briefs, editorial calendar, E-E-A-T quality evaluation, AI content guidelines, and performance tracking. Every piece of content planned here has a search purpose and a conversion goal.

```
Phase 1: Topic Cluster Architecture
Phase 2: Content Gap Analysis
Phase 3: Content Brief Template
Phase 4: Editorial Calendar
Phase 5: Content Quality Checklist
Phase 6: AI Content Guidelines
Phase 7: Performance Tracking
```

---

## Quick Reference

| Phase | Focus | Output |
|-------|-------|--------|
| 1 | Hub-and-spoke cluster model | Cluster map per service |
| 2 | GSC gap analysis + competitor audit | Prioritized topic list |
| 3 | Per-piece content brief | Structured brief with SEO specs |
| 4 | Monthly editorial calendar | Publishing schedule by stage |
| 5 | E-E-A-T quality gate | Pass/fail checklist per piece |
| 6 | AI content guidelines | Human oversight rules |
| 7 | Performance tracking | GSC + GA4 per-content metrics |

---

## Phase 1: Topic Cluster Architecture

Hub-and-spoke model for service businesses.

**Pillar page** = main service page (e.g., `/plumbing-services`)
**Cluster content** = supporting blog posts, FAQs, guides (e.g., "How to Fix a Running Toilet", "Signs You Need a Water Heater Replacement", "Emergency Plumbing: What to Do Before the Plumber Arrives")

### Internal Linking Strategy

- Every cluster page links to its pillar page
- Pillar page links to all cluster pages
- Cluster pages cross-link where topically relevant
- Use descriptive anchor text (not "click here")

### Service Business Cluster Template

| Cluster Type | Content | Example (HVAC) |
|-------------|---------|----------------|
| Service pillar | Main service overview | /hvac-services |
| How-to guides | DIY tips (builds trust) | "How to Change Your AC Filter" |
| Cost guides | Pricing transparency | "How Much Does AC Repair Cost in [City]?" |
| Comparison | Help decisions | "Central AC vs. Mini-Split: Which Is Right?" |
| Emergency | Urgent queries | "AC Not Cooling? 5 Things to Check Before Calling" |
| Location | Local targeting | "HVAC Services in [Neighborhood]" |
| Seasonal | Timely content | "Spring AC Tune-Up Checklist" |
| FAQ | Common questions | "How Often Should You Service Your AC?" |

### Building the Cluster Map

For each primary service:

1. Identify the pillar page URL (existing or to create)
2. List all cluster types above — which apply to this service?
3. For each cluster type, draft 2–3 candidate titles
4. Assign target keyword to each candidate
5. Note existing content that already covers each slot (update vs. create)
6. Map internal links: pillar ↔ all clusters, cluster ↔ related clusters

Output: a table per service with URL, type, status (existing/create/update), and target keyword.

---

## Phase 2: Content Gap Analysis

Using GSC data to find missing opportunities.

### Step-by-Step

1. Pull all queries from GSC where the site gets impressions but no clicks (position 8+) — use `google-search-console-api`
2. Identify queries with no matching page (true content gap)
3. Map queries to intent:

| Intent | Query Pattern | Content Type |
|--------|--------------|-------------|
| Informational | "how to", "what is", "why" | Blog post, guide |
| Commercial | "best", "top", "vs", "review" | Comparison, service page |
| Transactional | "hire", "near me", "cost", "quote" | Service page, location page |
| Navigational | Brand name, specific service | Ensure page exists |

4. Competitor content audit: identify what the top 3 competitors rank for that this site doesn't cover
5. Prioritize gaps:

| Priority | Criteria |
|----------|----------|
| High | High volume + commercial/transactional intent + no existing page |
| Medium | High volume + informational + no existing page |
| Low | Low volume + informational + no existing page |

### Competitor Gap Audit

For each of the top 3 organic competitors:

- Pull their top-ranking pages by estimated traffic
- Cross-reference against this site's content inventory
- Flag topics they cover that this site doesn't

Document: competitor URL, topic, estimated volume, gap priority.

### Output

Ranked list of content gaps: topic, intent, estimated volume, content type needed, priority tier.

---

## Phase 3: Content Brief Template

For each piece of content, produce a brief before writing begins.

```markdown
# Content Brief: [Title]

## SEO Target
- Primary keyword: [keyword] ([volume]/mo, [difficulty])
- Secondary keywords: [list]
- Search intent: [informational/commercial/transactional]
- Current SERP: [what's ranking, what type of content, avg word count]

## Content Specifications
- Format: [blog post / service page / FAQ / guide]
- Target word count: [based on SERP analysis — match top 3 results]
- Outline:
  - H1: [main title with keyword]
  - H2: [section 1]
  - H2: [section 2]
  - H2: [FAQ section]
- Primary CTA: [what action should reader take]
- Internal links: [pages to link to/from]
- Schema type: [FAQPage / HowTo / Article / Service]

## Competitor Analysis
| Competitor | URL | Word Count | Unique Angle |
|-----------|-----|-----------|-------------|

## Differentiation
What angle makes this content better than what's ranking:
[unique experience, local expertise, specific data, better visuals, more complete answer]

## E-E-A-T Requirements
- Experience signal: [e.g., "include specific job count or years in business"]
- Expertise signal: [e.g., "author bio with license number"]
- Trust signal: [e.g., "link to review page, show real before/after"]
```

### Brief Quality Gate

Before assigning content to a writer (human or AI-assisted):

- [ ] Primary keyword confirmed with GSC/keyword tool data — not a guess
- [ ] SERP analyzed — content format matches what's ranking
- [ ] Word count target derived from top 3 results, not arbitrary
- [ ] Competitor gap documented — brief explains what to do differently
- [ ] Internal links mapped — cluster connections defined
- [ ] Schema type selected — matches content format

---

## Phase 4: Editorial Calendar

Monthly cadence for service businesses.

### Content Volume by Stage

| Business Stage | Monthly Content Volume | Mix |
|---------------|----------------------|-----|
| Launch (0–6 mo) | 8–12 pieces | 60% service pages, 40% blog |
| Growth (6–18 mo) | 4–8 pieces | 30% service, 50% blog, 20% location |
| Maintenance (18+ mo) | 2–4 pieces | 70% blog, 30% updates to existing pages |

### Publishing Cadence (Doctrine S6.2)

- **Target:** Minimum 3 posts per week. Daily if capacity allows.
- **Floor:** Never below 2 per week.

**Approved Content Types (Ranked by Priority):**
1. High-intent informational content (targets search queries with commercial or transactional intent)
2. Legal or regulatory guides relevant to client's industry
3. Strategic breakdowns (how-to guides with genuine expertise)
4. Industry updates (algorithm changes, market shifts)
5. Authoritative listicles (only if backed by real data or expertise)

**NEVER Publish:**
- Magazine-style filler with no ranking intent
- Seasonal fluff that doesn't target a keyword
- Content that rehashes what's already on the site without adding depth
- AI-generated content that hasn't been reviewed for accuracy and brand voice

### Seasonal Planning

Map service-specific seasons before building the calendar. Common patterns:

| Industry | Peak Season | Content to Pre-Publish |
|----------|------------|----------------------|
| HVAC | Spring (AC) / Fall (heating) | Tune-up guides, seasonal checklists |
| Plumbing | Winter (freeze prevention) | Pipe freeze guides, emergency prep |
| Landscaping | Spring (planning) | Design guides, mulch/seed timing |
| Dental | August (back-to-school) | Kids' dental guides, new patient content |
| Tax / Accounting | January–March | Filing guides, deduction checklists |
| Roofing | Spring / Storm season | Inspection guides, storm damage content |

**Rule:** Publish seasonal content 6–8 weeks before peak season so Google has time to index and rank it.

### Calendar Template

| Month | Topic | Type | Primary Keyword | Cluster | Status |
|-------|-------|------|-----------------|---------|--------|
| Jan | [topic] | [blog/service/location] | [keyword] | [pillar] | ○ |
| Feb | [topic] | [blog/service/location] | [keyword] | [pillar] | ○ |

Statuses: ○ Pending → ● In Brief → ◐ In Draft → ✓ Published

### Calendar Priorities

1. Highest-gap, highest-intent content first (from Phase 2)
2. Seasonal content on schedule (never late)
3. Cluster completion — finish a full cluster before starting a new one
4. Update existing content before creating new thin content

---

## Phase 5: Content Quality Checklist

### E-E-A-T Signals

Google's Experience, Expertise, Authoritativeness, Trustworthiness:

| Signal | How to Demonstrate | Example |
|--------|-------------------|---------|
| Experience | First-person accounts, case studies, before/after | "In our 15 years of AC repair, the #1 cause of failure is..." |
| Expertise | Author bios, credentials, technical depth | Licensed contractor details, certifications shown |
| Authoritativeness | Industry awards, media mentions, association memberships | BBB rating, trade association links |
| Trustworthiness | Reviews, transparency, contact info visible | Phone number on every page, clear pricing |

### Helpful Content Checklist

Evaluate every piece before publishing:

- [ ] Written for humans first, search engines second
- [ ] Answers the user's question completely — no need to return to SERPs
- [ ] Provides original value (not rehashing competitors)
- [ ] Demonstrates first-hand experience — specific details, not generic advice
- [ ] No filler paragraphs or word count padding
- [ ] Primary keyword in H1 and first 100 words
- [ ] Internal links present — links to pillar, links to at least one related cluster page
- [ ] CTA present — reader knows what to do next
- [ ] Schema type assigned and implemented (use `schema-markup`)
- [ ] Meta description written — unique, 150–160 chars, includes CTA

### Minimum Quality Thresholds (Doctrine S6.1)

| Metric | Minimum | Target | Rewrite Trigger |
|--------|---------|--------|-----------------|
| Word count (service page) | 1,500 | 2,000-2,500 | Below 1,200 |
| Word count (blog post) | 1,000 | 1,500-2,000 | Below 800 |
| Word count (city page) | 1,200 | 1,500-2,000 | Below 1,000 |
| Internal links per page | 5 | 10+ | Below 3 |
| H2 headings per page | 4 | 6-8 | Below 3 |
| FAQ items (local pages) | 3 | 5-7 | Below 3 |
| Unique content per city page | 30% | 50%+ | Below 20% |

These thresholds are enforced by the `seo-doctrine` rule. Reference it for the full content standards.

### Failure Conditions

Flag content for rewrite if ANY of these are true:

| Condition | Action |
|-----------|--------|
| Fails 2+ helpful content criteria | Full rewrite required |
| No original experience or data | Add first-person specifics |
| Keyword stuffed (density > 2%) | Revise for natural language |
| Word count < 50% of top-ranking competitor | Expand significantly |
| No internal links | Add cluster links before publishing |
| Author has no bio or credentials | Add author bio with relevant credentials |

---

## Phase 6: AI Content Guidelines

AI-assisted content is acceptable — Google evaluates quality, not creation method.

### Rules

| Rule | Rationale |
|------|-----------|
| Human oversight required on every AI-generated piece | AI fabricates specifics — needs domain expert review |
| Fact-check all statistics, prices, claims, recommendations | AI confidently states outdated or wrong numbers |
| Add first-person experience AI cannot fabricate | Real job counts, local knowledge, specific outcomes |
| Add local context — neighborhoods, landmarks, regional specifics | AI output is generic — local detail differentiates |
| Never mass-produce thin content | 1 great piece outperforms 10 mediocre ones in every metric |
| Strip generic openers and closers | AI intros and outros are identical across the web |

### AI Content Workflow

1. Generate draft with detailed prompt including: target keyword, audience, content brief, local context
2. Have a domain expert (licensed contractor, business owner, specialist) review and annotate
3. Add first-person experience sections that AI drafted as placeholders
4. Verify every specific claim: prices, stats, code references, product names
5. Add local landmarks, neighborhood references, regional regulations where relevant
6. Run through E-E-A-T checklist (Phase 5) before publishing

### What AI Handles Well

- Outline generation
- First-draft structure
- FAQ generation from a topic list
- Meta description drafts
- Schema markup generation

### What Requires Human Input

- Years in business, job counts, certifiable facts about the business
- Before/after examples from real projects
- Local knowledge (which neighborhoods, local regulations, climate specifics)
- Pricing — must match actual service pricing
- Credentials, license numbers, certifications

---

## Phase 7: Performance Tracking

Per-content-piece tracking via GSC + GA4.

### Metrics to Track

| Metric | Source | What It Tells You |
|--------|--------|------------------|
| Impressions | GSC | Visibility / indexing |
| Clicks | GSC | Traffic from search |
| Position | GSC | Ranking competitiveness |
| CTR | GSC | Title/meta effectiveness |
| Engagement rate | GA4 | Content quality signal |
| Conversions | GA4 | Content ROI |
| Time on page | GA4 | Content depth match |
| Scroll depth | GA4 | Reader actually consumed content |

### Tracking Setup

For each published piece:

1. Tag the URL in GSC — confirm it's indexed within 48 hours (use URL Inspection)
2. Set up GA4 content group — tag by cluster and content type
3. Define conversion event — form fill, call click, booking, or page goal

### 30/60/90 Day Review

| Timeframe | What to Check |
|-----------|--------------|
| 30 days | Indexed? Impressions appearing? Position tracked? |
| 60 days | Position stabilizing? CTR benchmarked against cluster average? |
| 90 days | Conversions attributed? Update brief if position < 15? |

### Content ROI Formula

```
ROI = (Conversions from content × avg customer value) / content production cost
```

Track per cluster — identify which cluster types drive the most revenue per dollar spent on content.

### Update Triggers

Reoptimize existing content when:

| Signal | Action |
|--------|--------|
| Position drops > 5 spots in 30 days | Review competitors, update content |
| CTR drops without position change | Rewrite title and meta description |
| Impressions stable but zero clicks | SERP feature is capturing clicks — add schema |
| Content > 12 months old with outdated facts | Refresh with current data, update `dateModified` |
| Competitor publishes a significantly better piece | Expand with more depth or a different angle |

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Publishing content with no keyword brief | Always start with Phase 3 brief before writing |
| Building clusters in random order | Finish one cluster completely before starting another |
| Ignoring seasonal timing | Pre-publish seasonal content 6–8 weeks before peak |
| Publishing AI content without expert review | Every AI-assisted piece requires domain expert sign-off |
| Tracking impressions as success | Track clicks, position, and conversions — impressions alone mean nothing |
| Creating new content instead of updating existing | Audit existing content before adding volume |
| Internal links as afterthought | Map cluster links in the brief, add before publishing |
| Generic author bios | Author bio should include credentials, license, years of experience |
| Word count as quality metric | Quality = answers the question completely; length is a side effect |
| Treating every content type the same | Match content format to SERP — what's ranking determines your format |

---

## Related Skills

- `seo-audit` — content gaps found during Phase 5
- `search-rank` — keyword data for content prioritization
- `local-seo-audit` — local content planning and location page strategy
- `schema-markup` — schema type per content piece (FAQPage, HowTo, Article)
- `google-search-console-api` — GSC data for gap analysis and performance tracking
- `ga4-api` — GA4 for per-content conversion and engagement tracking
- `ai-visibility` — AI-optimized content structure for LLM citation
- `site-report` — HTML deliverable with content performance summary
