---
model: claude-sonnet-4-6
name: link-analysis
description: Use when analyzing competitor backlinks, identifying link building opportunities, creating linkable assets, or building domain authority. Also use when asked about no-outreach link building, broken link opportunities, unlinked mentions, or resource page inclusion.
---

# Link Analysis

## Overview

Competitor backlink analysis with actionable link building opportunities — all following Google's official guidelines. No link schemes, no paid links, no spam. Every phase is approval-gated. The focus is on earning links by being genuinely useful, not by gaming the system.

```
Phase 1: Discovery     — identify competitors + their backlink patterns
Phase 2: Opportunity   — categorize and map replication methods
Phase 3: Asset Design  — spec linkable content assets
Phase 4: Prioritize    — 90-day roadmap with effort/impact matrix
Phase 5: Execute       — implement approved actions
```

**Each phase requires explicit user approval before proceeding.**

---

## Quick Reference

| Opportunity Type | Effort | Impact | Timeline |
|-----------------|--------|--------|----------|
| Directory listings | Low | Medium | Week 1 |
| Citation cleanup | Low | Medium | Week 1–2 |
| Unlinked brand mentions | Low | High | Week 2 |
| Broken link reclamation | Low | Medium | Week 2–3 |
| Community participation | Low (ongoing) | Low–Medium | Ongoing |
| Resource page inclusion | Low | Medium | Week 3–4 |
| Guest contributions | Medium | Medium | Month 2 |
| Visual guides / infographics | Medium | Medium | Month 2 |
| Local press / events | Medium | High | Month 2–3 |
| Interactive tools / calculators | High | Very High | Month 3 |
| Original data / research | High | Very High | Month 3–4 |
| Scholarship / educational | High | High | Month 4+ |

---

## Phase 1: Discovery

**Goal:** Map the competitive backlink landscape.

### Process

1. Identify top 5 organic competitors for your primary keywords
   - Search your 3–5 main target keywords
   - Record the top 10 organic results
   - Select 5 that most directly compete with your pages

2. For each competitor, use free backlink tools to get their top backlinks:
   - [Ahrefs Free Backlink Checker](https://ahrefs.com/backlink-checker) — top 100 backlinks
   - [Semrush Free](https://www.semrush.com/analytics/backlinks/) — limited queries
   - [Moz Link Explorer](https://moz.com/link-explorer) — 10 free queries/month

3. Export and deduplicate backlink sources across all competitors

4. Identify backlink patterns:
   - What types of sites link to competitors?
   - What content earns the most backlinks?
   - Are there industry directories, resource pages, or local sites?

### Output

Save to `.claude/progress/link-building/competitor-analysis-[date].md`:

```
## Competitors Analyzed
1. [competitor URL] — [backlink count] links from [domain count] domains
...

## Backlink Source Patterns
- [pattern 1]: N competitors have this
...
```

**STOP. Present findings. Ask: "Approved to proceed to opportunity mapping? (yes/no)"**

---

## Competitive Response Logic (Doctrine S11)

### Rule 11.1 — Competitor Audit Process

**Trigger:** Before creating or optimizing any service or city page.

1. Identify top 5 ranking competitors for the target keyword
2. Record for each:

| Metric | Competitor 1 | Competitor 2 | Competitor 3 | Competitor 4 | Competitor 5 |
|--------|-------------|-------------|-------------|-------------|-------------|
| Word count | | | | | |
| Number of H2/H3 headings | | | | | |
| Internal link count | | | | | |
| Schema types present | | | | | |
| FAQ count | | | | | |
| Unique content elements (tools, calculators, videos, etc.) | | | | | |

3. Identify gaps — sections, topics, or questions competitors miss
4. Plan content that is better, deeper, and more complete

### Rule 11.2 — Competitive Response Decision Logic

```
If competitor word count > our page word count by 500+ words
  → Flag for content expansion

If competitor has FAQ schema and we don't
  → Add FAQ schema immediately

If competitor covers subtopics we don't
  → Add those subtopics or create supporting articles

If competitor has more internal links
  → Run interlinking audit on our page

If we already outperform on all metrics
  → Monitor quarterly, no immediate action needed
```

---

## Phase 2: Opportunity Mapping

**Goal:** Categorize every replication opportunity and explain how to get it without outreach.

### The 12 Opportunity Types

#### Type 1: Directory Listings (Self-Submit)
**Effort:** Low | **Impact:** Medium

Submit directly — no relationship needed.

General: Google Business Profile, Yelp, Apple Maps, Bing Places, BBB, Yellowpages
Industry-specific: Varies by vertical — search `[industry] directory submit listing`
Local: Chamber of Commerce, Alignable, Nextdoor Business

#### Type 2: Citation Cleanup (Claim + Correct)
**Effort:** Low | **Impact:** Medium

Existing NAP citations with wrong information hurt local SEO. Claim and fix:

1. Search `"[Business Name]" "[City]"` to find all mentions
2. Claim unclaimed listings
3. Correct NAP inconsistencies
4. Submit to data aggregators (Foursquare, Neustar Localeze)

#### Type 3: Resource Page Inclusion (Application)
**Effort:** Low | **Impact:** Medium

Resource pages link out to useful industry resources. Find them:

```
[topic] inurl:resources
[topic] "useful links"
[topic] "recommended" site:.gov OR site:.edu
[topic] "resource page" submit
```

Only submit if your content genuinely belongs on the list.

#### Type 4: Broken Link Reclamation
**Effort:** Low | **Impact:** Medium

Find resource pages with broken links — offer your content as a replacement:

1. Find resource pages in your niche (Type 3 search above)
2. Check links with [Check My Links](https://chrome.google.com/webstore/detail/check-my-links) Chrome extension
3. For each broken link, check if you have equivalent content
4. Submit replacement via the resource page's contact form

No cold email required if the page has a suggest/submit form.

#### Type 5: Unlinked Brand Mentions (Claim)
**Effort:** Low | **Impact:** High

Pages that mention your business but don't link to you. Easy claim.

Search:
```
"[Business Name]" -site:[yourdomain.com]
"[Business Name]" "[City]" -site:[yourdomain.com]
```

Set up Google Alerts for ongoing discovery:
- Alert: `"[Business Name]"`
- Alert: `"[Business Name]" -site:[yourdomain.com]`

If the page has a contact form, submit a simple note: "Thanks for mentioning us — would you mind adding a link?"

#### Type 6: Linkable Assets — Interactive Tools
**Effort:** High | **Impact:** Very High

Tools that solve a real problem get linked naturally. Examples:

- Cost calculators for your service/product
- ROI calculators
- Comparison tools
- Quizzes / self-assessments
- Checklists (downloadable)

The key: it must be genuinely useful, not a marketing fluff piece.

#### Type 7: Linkable Assets — Original Data / Research
**Effort:** High | **Impact:** Very High

Original data is highly linkable — journalists, bloggers, and researchers cite it.

- Survey your customer base
- Analyze your own data and publish insights
- Compile industry statistics from public sources (cite them, add commentary)
- Conduct and publish case studies with real numbers

#### Type 8: Linkable Assets — Visual Guides
**Effort:** Medium | **Impact:** Medium

Well-designed visual content gets embedded and linked:

- Infographics with original data or process explanations
- Comparison charts
- Step-by-step visual guides
- Before/after showcases

#### Type 9: Guest Contributions (Open Submissions)
**Effort:** Medium | **Impact:** Medium

Sites with open "write for us" or "contribute" pages — no relationship required.

Search:
```
[topic] "write for us"
[topic] "guest post"
[topic] "contribute an article"
[topic] "submit a post"
```

Only write for sites with real audiences in your niche. Thin directories are not worth the effort.

#### Type 10: Community Participation
**Effort:** Low (ongoing) | **Impact:** Low–Medium

Genuine participation in communities where your audience hangs out:

- Answer questions on Reddit, Quora, Stack Exchange
- Participate in Facebook Groups
- Comment meaningfully on industry blogs

**Rule:** Add value first. Links (when allowed) are a byproduct, not the goal. Spammy participation gets removed and burns trust.

#### Type 11: Local Press / Events
**Effort:** Medium | **Impact:** High

Local news sites and event directories link to businesses involved in the community:

- Sponsor local events (your logo/link appears on event pages)
- Reach out as a local expert for comment on industry news
- Issue press releases for newsworthy milestones (10 years in business, new location, etc.)
- Join local business associations that have member directories

#### Type 12: Educational / Scholarships
**Effort:** High | **Impact:** High

Educational content and scholarships earn .edu links:

- Create a scholarship for students in a relevant field
- Produce career or educational resources
- Partner with local community colleges for training programs

---

### Opportunity Map Output

For each opportunity found in Phase 1, categorize it:

| Source | Type # | Why they got it | How to replicate | Effort | Impact |
|--------|--------|----------------|-----------------|--------|--------|
| [URL] | 1 | Self-submitted | Submit same directory | Low | Medium |
| [URL] | 7 | Cited our research | Create original data | High | Very High |

Save to `.claude/progress/link-building/opportunities-[date].md`

**STOP. Present opportunities. Ask: "Approved to proceed to asset design? (yes/no)"**

---

## Phase 3: Linkable Asset Design

**Goal:** Spec 2–3 high-value content assets to build.

### Asset Specification Template

```
## Asset: [Name]

**Type:** Calculator / Tool / Data Study / Visual Guide
**Target keyword:** [keyword]
**Target audience:** [who uses this]
**Why it earns links:** [specific reason]
**Effort estimate:** [hours/days]

**Content spec:**
- [What it includes]
- [How it works]
- [What data it uses]

**Promotion strategy:** [where/how to get initial visibility]
```

### How to Select Assets

1. What questions do people in your space ask repeatedly?
2. What data does your business have that others don't?
3. What would a journalist cite in a story about your industry?
4. What tool would save your customers time?

Save to `.claude/progress/link-building/asset-specs-[date].md`

**STOP. Present asset specs. Ask: "Approved to proceed to prioritization? (yes/no)"**

---

## Phase 4: Prioritization

**Goal:** 90-day action roadmap with clear effort/impact scoring.

### Scoring Rubric

| Score | Effort | Impact |
|-------|--------|--------|
| 5 | < 1 hour | Domain authority 40+ |
| 4 | < 1 day | DA 30+, high relevance |
| 3 | < 1 week | DA 20+, medium relevance |
| 2 | < 1 month | Low DA, low relevance |
| 1 | > 1 month | Unclear benefit |

Prioritize by `(Impact Score × 2) - Effort Score` — highest first.

### 30-60-90 Roadmap Structure

```
## Quick Wins (Week 1–2)
- [action 1] — low effort, medium+ impact
- [action 2]

## Month 1
- [action 1]

## Month 2
- [action 1]

## Month 3
- Asset creation: [asset name]

## Ongoing
- Community participation
- Google Alerts monitoring
```

Save to `.claude/progress/plans/link-building-roadmap-[date].md`

**STOP. Present roadmap. Ask: "Approved to begin execution? (yes/no)"**

---

## Phase 5: Execution

**Goal:** Execute approved quick-win actions.

### Per-Action Checkpoint

After each action:

```
✓ [Action completed]
  Source: [URL]
  Status: Submitted / Claimed / Published
  Expected result: [link live in N days / pending approval]
```

### Execution Rules

- Never spam — one submission per directory, no duplicate content
- Brand voice: consistent across all directory descriptions and bios
- Track every submission in `.claude/progress/link-building/submissions-log.md`
- Do not submit to any directory with DA < 10 or irrelevant audience

---

## Google's Official Stance on Link Building

**Google recommends:**
- Create valuable content users want to reference
- Be involved in the community around your topic
- Contribute positively to forums and discussions

**Google prohibits:**
- Buying or selling links that pass PageRank
- Link exchanges ("link to me and I'll link to you")
- Automated link schemes
- Low-quality directory submissions at scale

Source: [Google Search Central — Quality Links](https://developers.google.com/search/blog/2010/06/quality-links-to-your-site)

Every action in this skill passes the "would this earn a link if Google weren't a factor?" test.

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Buying links from link sellers | Never — manual penalty risk |
| Mass-submitting to low-DA directories | Quality over quantity — DA 20+ minimum |
| Skipping the approval gate | Present findings between every phase |
| Creating assets without search demand | Validate with keyword research first |
| Unlinked mentions left unclaimed | Set up Google Alerts — claim immediately |
| Community participation that feels like spam | Add value first, every time |
| Tracking submissions in memory | Keep a written log — memory fails |

---

## Free Tools Reference

| Tool | Use | Limit |
|------|-----|-------|
| [Ahrefs Backlink Checker](https://ahrefs.com/backlink-checker) | Top 100 backlinks per domain | Free |
| [Semrush](https://www.semrush.com/analytics/backlinks/) | Backlink overview | 10 queries/day free |
| [Moz Link Explorer](https://moz.com/link-explorer) | DA + backlinks | 10 queries/month free |
| Google Search operators | Unlinked mentions, resource pages | Unlimited |
| [Google Alerts](https://google.com/alerts) | Ongoing mention monitoring | Free |
| [Check My Links](https://chrome.google.com/webstore/detail/check-my-links) | Broken link detection on pages | Free Chrome extension |

---

## Related Skills

- `seo-audit` — full SEO pipeline
- `search-rank` — keyword and ranking analysis
- `local-seo-audit` — local authority signals
- `google-search-console-api` — backlink data from GSC

---

## AI Citation as Link Equivalent

Being cited by ChatGPT, Claude, Gemini, or Perplexity is the new backlink. LLM citations drive traffic and build authority in ways traditional links cannot:

- **Direct traffic:** Users click citation links in AI responses
- **Trust signal:** AI assistants cite authoritative, well-structured content
- **Competitive moat:** If you're cited and competitors aren't, you win the AI discovery channel

**How to earn AI citations:**
1. Structure content with clear, factual claims (LLMs prefer definitive statements)
2. Include specific data: numbers, statistics, prices, timelines
3. Use FAQ format — mirrors how users query LLMs
4. Add structured data (JSON-LD) — makes content machine-readable
5. Build topical authority — LLMs cite sites they see as authoritative on a topic
6. Keep content current — LLMs prefer recent, updated content

**Tracking:** Reference `ai-visibility` for systematic citation monitoring.

---

## AI-Optimized Content Structure

How to structure content that LLMs want to cite:

| Element | Why LLMs Prefer It | Example |
|---------|-------------------|---------|
| Clear topic sentence | Easy to extract as citation | "Emergency plumbing services in Austin typically cost $150-$400 for after-hours calls." |
| Specific statistics | Verifiable, authoritative | "Average response time: 45 minutes within city limits" |
| FAQ format | Matches user query patterns | "How much does a roof replacement cost?" → direct answer |
| Step-by-step guides | Structured, complete answers | "1. Turn off water main... 2. Call a licensed plumber..." |
| Comparison tables | Dense, organized information | Service tiers with pricing, features, timelines |
| Definition paragraphs | Perfect for AI snippet extraction | "A slab leak occurs when..." |

**Anti-patterns:** Vague marketing copy, walls of text without structure, content that talks around the topic without answering directly, outdated information.

Cross-reference: `content-strategy` for content planning, `ai-visibility` for citation monitoring.
