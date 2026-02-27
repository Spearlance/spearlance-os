---
model: claude-sonnet-4-6
name: ai-visibility
description: Use when checking if a site is cited by AI assistants, optimizing content for LLM citation, implementing llms.txt, tracking AI referral traffic, or monitoring AI search visibility. Also use when adapting content strategy for the AI search era.
---

# AI Visibility

## Overview

AI visibility is the new frontier of search — being cited by ChatGPT, Claude, Gemini, and Perplexity when users ask about services, brands, and topics. By 2026, 25% of organic search traffic is projected to shift to AI chatbots. Cited pages earn 35% more organic clicks and 91% more paid clicks than uncited competitors. This skill covers citation checking, AI-optimized content strategy, llms.txt implementation, referral traffic tracking, and answer engine optimization.

```
Section 1: AI Citation Check
Section 2: AI-Optimized Content
Section 3: llms.txt / llms-full.txt
Section 4: AI Referral Tracking
Section 5: Answer Engine Optimization (AEO)
Section 6: Monitoring Cadence
──► Structured findings + action plan
```

---

## Quick Reference

| Platform | Citation Behavior | Browsing Mode |
|----------|-------------------|---------------|
| ChatGPT | Links in footnotes when browsing active; none from training data only | Requires Plus/Pro or web search enabled |
| Claude | Cites with URL + title + snippet when web search used; not by default | Web search mode or provided sources |
| Gemini | AI Overview source cards; increasingly prominent in Google results | Always live; real-time retrieval |
| Perplexity | Always cites — averages 21.87 citations per query vs ChatGPT's 7.92 | Core product — every query uses live retrieval |

---

## Invocation Options

```
ai-visibility              # Full audit (all 6 sections)
ai-visibility citation     # Section 1 only — citation spot check
ai-visibility content      # Section 2 only — content optimization audit
ai-visibility llmstxt      # Section 3 only — llms.txt implementation
ai-visibility tracking     # Section 4 only — referral traffic setup
ai-visibility aeo          # Section 5 only — AEO strategy review
ai-visibility monitor      # Section 6 only — monitoring cadence setup
```

---

## Section 1: AI Citation Check

Manual citation check across all major LLM platforms. Run monthly. Takes 20–30 minutes manually; faster with Perplexity (always cites) as the canary.

### Query Templates

Use these 5 intent categories for service businesses. Fill in `[service]` and `[city]`:

| Intent | Query Pattern | Why It Matters |
|--------|--------------|----------------|
| Local | `[service] near [city]` | High-volume, near-me queries |
| Reputation | `best [service] in [city]` | Recommendation queries |
| Pricing | `how much does [service] cost in [city]` | Commercial intent |
| Emergency | `[specific problem] — what to do` | Urgent, high-conversion |
| Brand | `[brand name]` | Brand awareness / accuracy check |

**Examples for a plumbing business in Austin:**
- `plumber near Austin`
- `best plumber in Austin`
- `how much does a water heater replacement cost in Austin`
- `slab leak — what to do`
- `Roto-Rooter Austin`

### How to Check Each Platform

**ChatGPT:**
1. Open ChatGPT with web browsing enabled (Plus/Pro required, or use ChatGPT Search)
2. Paste query — look for business name or domain URL in response or footnotes
3. If no browsing mode available, note: training-data-only responses won't cite local businesses

**Claude:**
1. Open Claude.ai with web search enabled
2. Paste query — citations appear as numbered superscripts with URL + title
3. Ask follow-up: "Where did you get that information?" to surface citation sources

**Gemini:**
1. Search in Google — check if AI Overview appears
2. For deeper check: open Gemini.google.com, paste query
3. Source cards appear on the right or below the answer — check which sites are linked

**Perplexity:**
1. Go to perplexity.ai — no special mode needed, all queries use live retrieval
2. Business/domain appears as a numbered citation in the response
3. Check "Sources" section for the full citation list — most transparent of all platforms

### Documentation Table

Run the same queries across all platforms. Capture:

| Query | ChatGPT | Claude | Gemini | Perplexity | Competitors Cited |
|-------|---------|--------|--------|------------|-------------------|
| [service] near [city] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [list] |
| best [service] in [city] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [list] |
| cost query | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [list] |
| emergency query | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [list] |
| brand name | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | [list] |

### Citation Cache

Save results at `.claude/agent-memory/ai-visibility/citation-log.json`:

```json
{
  "last_checked": "YYYY-MM-DD",
  "queries": [
    {
      "query": "best plumber in Austin",
      "chatgpt": { "cited": false, "competitors_cited": ["ABC Plumbing"] },
      "claude": { "cited": false, "competitors_cited": [] },
      "gemini": { "cited": true, "competitors_cited": ["ABC Plumbing"] },
      "perplexity": { "cited": true, "competitors_cited": [] }
    }
  ]
}
```

### Priority Flags

| Status | Flag | Action |
|--------|------|--------|
| Competitor cited, client not | ◆ Critical | Analyze competitor's cited content — Section 2 |
| Client not cited anywhere | ⚠ Warning | Full content + authority review |
| Client cited on 1–2 platforms | ◐ Partial | Expand to missing platforms |
| Client cited on all platforms | ✓ Monitor | Track for consistency |

---

## Section 2: AI-Optimized Content

LLMs prefer structured, factual, dense content with clear attributable claims. Marketing copy never gets cited. Authoritative data always does.

### Content Patterns LLMs Prefer

**1. Definitive opening statements**
Start every page and key paragraph with a clear, citable definition.

```
✗ "At ABC Plumbing, we're passionate about keeping your pipes healthy!"
✓ "A slab leak is a water leak in pipes running beneath a concrete slab foundation.
   Left undetected, slab leaks can cause structural damage costing $10,000–$100,000."
```

**2. Specific local data**
Include concrete numbers that only a local expert would know. LLMs cite specificity.

```
✗ "Our prices are competitive."
✓ "Emergency plumbing calls in Austin average $200–$450 for after-hours service.
   Standard daytime service calls run $85–$150 per hour."
```

**3. FAQ format**
Direct question → direct answer. Mirrors how users query LLMs; easy for LLMs to extract.

```
Q: How long does a water heater replacement take?
A: A standard tank water heater replacement takes 2–3 hours. Tankless
   unit installation takes 4–6 hours due to additional venting requirements.
```

**4. Structured lists**
Step-by-step processes, ranked lists, comparison tables. LLMs extract and cite these cleanly.

```
Signs you have a slab leak:
1. Unexplained spike in water bill (>20% above average)
2. Warm or wet spots on floors
3. Sound of running water with all fixtures off
4. Foundation cracks appearing suddenly
5. Low water pressure throughout the house
```

**5. Cited statistics with sources**
Attribution increases credibility with LLMs — they assess source quality.

```
"According to the EPA, a running toilet wastes up to 200 gallons per day —
 equivalent to 6,000 gallons per month."
```

**6. Expert attribution**
E-E-A-T signals help LLMs assess whether to trust and cite a source.

```
"Licensed master plumber John Martinez (Texas License #MP-12345, 20 years experience)
 recommends inspecting water heater anode rods every 3–5 years."
```

### Content Anti-Patterns

| Anti-Pattern | Why LLMs Ignore It |
|-------------|-------------------|
| "We provide the best service in town!" | No citable claim — pure marketing |
| "Our prices are competitive" | No data point to extract |
| Walls of text (500+ words, no structure) | Hard to extract specific claims |
| Outdated content (> 12 months for pricing/stats) | LLMs are increasingly freshness-aware |
| Generic industry descriptions | Not differentiating — no reason to cite this source over another |
| "Contact us for a free quote" as the main CTA buried in key paragraphs | Signals the page is a sales tool, not an information source |

### Pages to Prioritize for AI Optimization

Run through each page type and grade against the content patterns above:

| Page Type | AI Optimization Priority | Key Patterns Needed |
|-----------|------------------------|---------------------|
| Service pages | High | Definitions, pricing data, FAQ |
| Location pages | High | Local data, service area specifics |
| Blog / resource content | High | Stats with sources, step-by-step, lists |
| Homepage | Medium | Definitive brand description, core services |
| About page | Medium | Expert credentials, E-E-A-T signals |
| Contact page | Low | NAP accuracy (feeds schema) |

---

## Section 3: llms.txt / llms-full.txt

The llms.txt spec ([llmstxt.org](https://llmstxt.org/)) provides a standardized way to give AI systems a concise, curated summary of a site — analogous to robots.txt but for LLM context rather than crawler access.

### What It Is

A markdown file at `/llms.txt` that LLMs can retrieve when they need to understand what a site is about. Helps AI assistants correctly describe a business, cite the right pages, and avoid hallucinating incorrect information about the brand.

**Why it matters for local/service businesses:** LLMs often hallucinate business details (wrong phone, closed locations, outdated hours). `llms.txt` provides a canonical reference. If Claude or ChatGPT fetches it, they get accurate NAP data.

### llms.txt Format

Place at site root: `yourdomain.com/llms.txt`

```markdown
# [Business Name]

> [One-line description — who you are, what you do, where you operate]

## About
[2–3 sentences. What the business does, years in operation, service area, key differentiators.]

## Services
- [Service 1]: [Brief description — include what it includes and typical use case]
- [Service 2]: [Brief description]
- [Service 3]: [Brief description]

## Service Area
[Cities and regions served. Be specific — neighborhoods, surrounding cities, counties.]

## Contact
- Phone: [number]
- Email: [email]
- Address: [full address]
- Hours: [business hours]

## Key Pages
- [https://domain.com/services/[service]]: [Brief description of this page]
- [https://domain.com/about]: [Brief description]
- [https://domain.com/contact]: [Brief description]
- [https://domain.com/blog]: [Brief description]
```

### llms-full.txt Format

Extended version for businesses that want maximum LLM context. Place at `/llms-full.txt`.

```markdown
# [Business Name] — Full Reference

> [One-line description]

## About
[Full business description — history, ownership, certifications, awards, philosophy]

## Services (Detailed)

### [Service 1]
[Full description. What it is, when customers need it, what the service includes,
 typical duration, what to expect, pricing range if public]

### [Service 2]
[Same format]

## Frequently Asked Questions
Q: [Common question]
A: [Complete, accurate answer]

Q: [Common question]
A: [Complete, accurate answer]

## Service Area
[Full list of cities, neighborhoods, zip codes served]

## Pricing
[If published: pricing ranges, how quotes work, what factors affect price]

## Team
[Key team members, credentials, licenses, years of experience]

## Contact
- Phone: [number]
- Email: [email]
- Address: [full address]
- Hours: [full weekly schedule]
- Emergency line: [if applicable]

## External References
- [License verification URL]
- [BBB profile URL]
- [Google Business Profile URL]
- [Yelp profile URL]

## Key Pages
[Same as llms.txt but more comprehensive]
```

### Implementation

**If the site uses business.json** (NAP enforcement active): pull all contact/address/hours data from `business.json` rather than hardcoding — keeping llms.txt in sync with the canonical data source.

**For static sites:** Place `llms.txt` in the `public/` directory so it's served at the root.

**For Next.js / Astro:** Add a route or static file at `/public/llms.txt`.

**Verification:** After deploying, confirm the file is publicly accessible:
```
curl https://yourdomain.com/llms.txt
```

---

## Section 4: AI Referral Tracking

Track traffic originating from AI platforms. This channel is growing — AI traffic surged 527% in 2025 across tracked sites. Without explicit tracking, it's lumped into "direct" or "referral" and invisible.

### Microsoft Clarity — AI Chat Channel Groups

Clarity has native AI referral tracking (as of late 2025):

1. Navigate to: **Clarity Dashboard → Settings → Traffic → Channel Groups**
2. Enable "AI Chat" channel group — covers: ChatGPT, Claude, Gemini, Copilot, Perplexity
3. View in: **Traffic → Channel Groups → AI Chat**
4. Metrics available: sessions, pages/session, engagement time, scroll depth, rage clicks

This is the fastest setup — no code changes required.

### GA4 — Custom Channel Group

In GA4, AI referrers are often misclassified as "Referral" or "Direct". Create a custom channel group:

1. Go to: **Admin → Data Streams → [Stream] → Configure tag settings**
2. Navigate to: **Admin → Reporting → Channel Groups → Create new group**
3. Add a rule: **Referral source matches regex:**
   ```
   chat\.openai\.com|chatgpt\.com|claude\.ai|anthropic\.com|gemini\.google\.com|bard\.google\.com|perplexity\.ai|copilot\.microsoft\.com|you\.com|phind\.com|poe\.com
   ```
4. Name the channel: **AI Referral**
5. Place it above the default "Referral" rule so it takes priority

**Note:** GA4 channel groups are not retroactive — data starts from when the group is created.

### GA4 — Referral Exclusion Fix

If AI domains appear in "Referral" traffic and inflate referral sessions, add them to the referral exclusion list only if they should be treated as direct traffic instead. For most setups, the custom channel group above is sufficient and preferable.

### PostHog — AI Referral Custom Event

For PostHog users who want granular AI referral data:

```javascript
// Detect AI referral on page load — place in your analytics initialization
const AI_REFERRER_DOMAINS = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'anthropic.com',
  'perplexity.ai',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'you.com',
  'phind.com',
  'poe.com'
];

function detectAIReferral() {
  const referrer = document.referrer;
  if (!referrer) return;

  const referrerHost = new URL(referrer).hostname.replace('www.', '');
  const matchedDomain = AI_REFERRER_DOMAINS.find(domain => referrerHost.includes(domain));

  if (matchedDomain) {
    posthog.register({
      ai_referral: true,
      ai_referrer_domain: matchedDomain
    });

    // Capture a distinct event for funnel analysis
    posthog.capture('ai_referral_session', {
      referrer_domain: matchedDomain,
      landing_page: window.location.pathname
    });
  }
}

// Call on page load
detectAIReferral();
```

This registers `ai_referral: true` as a super property, so ALL subsequent events in that session are tagged with it. Enables filtering any PostHog report by "AI referral sessions."

### What to Track

Once tracking is set up, monitor monthly:

| Metric | Why It Matters |
|--------|---------------|
| AI referral sessions (MoM) | Growth signals your citation presence is increasing |
| AI referral → conversion rate | Confirms AI visitors have commercial intent |
| Top landing pages from AI | Shows which content is being cited |
| Which AI platform refers most | Focus citation-building efforts there |
| AI referral bounce rate | High bounce = landing page doesn't match query intent |

---

## Section 5: Answer Engine Optimization (AEO)

AEO is the content and authority strategy for appearing in AI-generated answers. It integrates traditional SEO, E-E-A-T, structured data, and earned media — all of which signal to LLMs that a source is trustworthy and citable.

### AEO vs Traditional SEO

| Aspect | Traditional SEO | AEO |
|--------|----------------|-----|
| Goal | Rank in SERP positions 1–10 | Be cited in AI-generated response |
| Content style | Keyword-optimized, comprehensive | Dense, factual, answer-first |
| Format | Long-form with keyword density | Structured: FAQ, lists, tables, definitions |
| Success metric | Position, CTR, impressions | Citation presence, AI referral sessions |
| Link building | Backlinks for domain authority | Earned media, PR, citable data sources |
| Key signal | PageRank, keyword relevance | E-E-A-T, topical authority, factual accuracy |

**Key data point:** 82% of links cited by AI are from earned media — journalistic coverage and third-party blogs. Links from press and directories matter more for AI citation than for traditional SEO.

### The 5 AEO Pillars

**1. Be the definitive source**
LLMs cite the most complete, accurate answer for a query. Comprehensive beats brief. A thorough service page beats a thin landing page.

Action: Audit each service page — does it fully answer every question a user might have? Add pricing ranges, timelines, FAQs, before/after considerations, and local context.

**2. Answer directly**
Don't bury the answer. First sentence of every section should address the query it targets.

Action: Restructure content so the first sentence of each H2 section is a citable claim, not a transition.

**3. Structured data**
JSON-LD helps LLMs understand page purpose and content relationships. `FAQPage` schema is especially powerful — it directly maps to question-answer extraction patterns LLMs use.

Action: Reference `schema-markup` for a full JSON-LD audit. Priority types for AI citation: `FAQPage`, `HowTo`, `Service`, `LocalBusiness`.

**4. Topical authority**
LLMs prefer citing sites with multiple related pages on a topic cluster over isolated pages. One good plumbing FAQ page → lower authority. Ten interconnected plumbing pages → topical authority.

Action: Reference `content-strategy` to plan a content cluster around core service topics.

**5. Freshness and E-E-A-T**
LLMs are increasingly aware of publication and modification dates. Stale content (> 12 months without updates) is at a citation disadvantage. E-E-A-T signals — author credentials, specific first-hand experience, verifiable claims — are the strongest quality signal LLMs use to decide citation worthiness.

Action: Add `dateModified` structured data. Add author pages with credentials. Update pricing and statistics annually.

### Google AI Overviews — Specific Factors

Google AI Overviews appear in 60%+ of all searches as of 2025. Key factors for citation:

| Factor | Correlation | What It Means |
|--------|-------------|---------------|
| E-E-A-T signals | r=0.81 | Strongest single factor — 96% of AI Overview content has verified E-E-A-T |
| Semantic completeness | 4.2× | Self-contained answers score above 8.5/10 are 4.2× more likely to appear |
| Multi-modal content | 156% higher | Pages combining text + images + structured data beat text-only |
| Traditional ranking position | r=0.18 | Declining — 47% of AI Overview content comes from pages ranked below position 5 |

The implication: strong E-E-A-T + great content can get a page cited in AI Overviews even when it doesn't rank #1 in traditional results.

### Earned Media Strategy

Since 82% of AI citations come from earned media sources:

1. **Local press** — target local news sites for business mentions, expert quotes, service-related stories
2. **Industry directories** — BBB, Angi, HomeAdvisor, Houzz, industry associations — these are authoritative citation sources LLMs trust
3. **Guest content** — write expert articles for local or industry publications with author bio linking back
4. **Podcast appearances** — transcripts from podcasts generate citable text content
5. **HARO / Qwoted** — respond to journalist queries as a local expert source

Each earned mention = one more authoritative source pointing to your brand, training LLMs to associate your brand with the service category.

---

## Section 6: Monitoring Cadence

| Cadence | Task | Time Estimate |
|---------|------|--------------|
| Monthly | Citation check — Section 1 (10 core queries) | 20–30 min |
| Weekly | AI referral traffic review in Clarity/GA4 | 5 min |
| Quarterly | Content audit for AI-optimization — Section 2 | 2–4 hours |
| Quarterly | llms.txt accuracy review — Section 3 | 30 min |
| As-needed | Update llms.txt when services/contact/hours change | 10 min |
| As-needed | Earned media push when citation gaps found | Ongoing |

### Competitive Citation Tracking

Track which competitors are cited for your target queries. If a competitor is consistently cited and you're not:

1. Note which platforms cite them (ChatGPT, Perplexity, etc.)
2. Identify the specific URLs being cited
3. Analyze that content against the patterns in Section 2
4. Identify what they have that you don't: reviews, FAQ depth, structured data, PR mentions, pricing data

This is the fastest path to closing a citation gap — reverse-engineer what works, then do it better.

### Monthly AI Visibility Report Output

```
## AI Visibility — [Month YYYY]

### Citation Status
| Query | ChatGPT | Claude | Gemini | Perplexity | Change |
|-------|---------|--------|--------|------------|--------|
| [query 1] | ✓ | ✗ | ✓ | ✓ | ↗ +Gemini |
| [query 2] | ✗ | ✗ | ✗ | ✗ | → No change |

### AI Referral Traffic
Sessions:        [N]  ([+/-]% MoM)
Top landing:     [URL] ([N] sessions)
Top platform:    [Platform]
Conversion rate: [N%]

### Action Items
HIGH    [specific action — e.g., "Add FAQ schema to /services/water-heater"]
MEDIUM  [specific action]
LOW     [specific action]
```

---

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| Checking citations without browsing mode active | ChatGPT without browsing uses training data — enable web search for accurate results |
| Running citation checks once and forgetting | Monthly cadence — citation presence fluctuates as LLMs retrain |
| Writing llms.txt with marketing language | Plain facts only — llms.txt is a data source, not a sales page |
| Hardcoding NAP data in llms.txt when business.json exists | Import from business.json to keep in sync |
| Assuming AI traffic is too small to track | 527% growth in 2025 — set up tracking now before it becomes a significant unmeasured channel |
| Treating AEO as separate from SEO | It's additive — E-E-A-T, structured data, and content quality benefit both |
| Focusing only on Perplexity | ChatGPT has 900M users; Gemini appears in all Google searches — all platforms matter |
| Ignoring earned media | 82% of AI citations come from third-party sources — PR and directories are a citation-building lever |
| Optimizing content without checking what's actually being cited | Always identify the cited URL first — fix that page, not a different one |

---

## Official References

- [llms.txt Specification](https://llmstxt.org/)
- [Google AI Overviews Documentation](https://developers.google.com/search/docs/appearance/ai-overviews)
- [Google E-E-A-T Guidelines](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#expertise)
- [Schema.org FAQPage](https://schema.org/FAQPage)
- [Microsoft Clarity AI Channel Groups](https://clarity.microsoft.com/docs)
- [Perplexity for Business](https://www.perplexity.ai)

---

## Related Skills

- `seo-audit` — AI citation check at Phase 2.5
- `seo-pulse` — AI citation pulse in monthly checks
- `local-seo-audit` — AI citations for local queries
- `search-rank` — AI search intent classification
- `link-analysis` — earned media and AI citation as link equivalent
- `microsoft-clarity` — AI Chat Channel Groups for referral tracking
- `content-strategy` — AI-optimized content planning and topical authority clusters
- `schema-markup` — structured data for machine readability (FAQPage, HowTo, Service)
- `monthly-pulse` — AI visibility section in monthly report
