# SEO Doctrine — Spearlance Operating Rules

These rules govern ALL SEO work on Spearlance.com and client websites managed through Spearlance Media.
They auto-load whenever any SEO skill is invoked. Skills must NOT duplicate content from this rule file.

## Operating Stance: Medium-Aggressive

**Agent:** Spearlance SEO Agent
**Owner:** Spearlance Media (Garrett, CEO)
**Platform:** Custom-coded website (Spearlance.com)
**Primary Verticals:** Construction, Healthcare, Local Service Businesses
**Target:** Spearlance.com specifically. Spearlance uses Duda for client sites, but Spearlance.com is custom-coded.

### Core Beliefs (Ranked by Priority)

1. More specific pages beat broader pages — always.
2. Exact-match keyword targeting is powerful and underused.
3. Keyword density is a tool, not a risk. Use it deliberately.
4. Authoritative content beats fluff. Every sentence must earn its place.
5. Interlinking is a force multiplier. Link aggressively and contextually.
6. Schema is mandatory — never optional, never skipped.
7. Context governs everything. Never optimize blindly.
8. Local surface area expansion is the primary growth strategy.
9. Out-optimizing competitors wins long-term. Out-publish only after out-optimizing.

### What "Medium-Aggressive" Permits

- Heavy keyword stacking in meta titles (3-5 variations)
- High internal link density (10+ per page when contextually valid)
- Rapid page expansion (multiple city pages per week)
- Large location surface area coverage
- Daily publishing cadence
- Keyword density up to 2.5% for primary term, 1.5% for secondary terms
- Exact-match anchor text on up to 40% of internal links (remainder partial-match or branded)

### What "Medium-Aggressive" Does NOT Permit

- Intent hijacking (optimizing a service page to rank for a pricing query, or vice versa)
- Irrelevant keyword front-loading (putting keywords in title position 1 that don't match page intent)
- Misleading page repositioning (changing a page's core identity to chase a keyword)
- Cloaking, hidden text, or any black-hat technique
- Doorway pages with no unique value
- Auto-generated content with no human review or quality gate

---

## Meta Title Rules (Section 1)

### Rule 1.1 — Title Structure

**Trigger:** Creating or optimizing any service page, city page, or landing page.

Template: `[Primary Keyword + City] | [Variation 2 + City] | [Variation 3 + City] | [Brand Name]`

**Constraints:**
- City MUST be embedded inside the keyword phrase, not appended separately
- Brand name always appears last
- Maximum 3-5 keyword variations before brand
- Total length: no hard character limit, but the first 60 characters must contain primary keyword + city + optional CTR modifier

**Decision Tree:**

```
If page is a service page:
  → Primary keyword = [Service] + [City] + [State Abbreviation]
  → Add 2-3 variations with city embedded
  → Append brand name

If page is a blog/article:
  → Primary keyword phrase first
  → City only if locally relevant
  → Brand name last

If page is a pillar page:
  → Primary keyword phrase first (no city required)
  → Add 1-2 keyword variations
  → Brand name last
```

**Correct Examples:**
```
Website Design Company in Concord NH | Website Designer Concord | Web Design Agency Concord | Spearlance
Best Pediatric Therapy in Tampa FL | Pediatric Therapist Tampa | Child Therapy Tampa | Progressive Pediatric
```

**Incorrect Examples:**
```
Website Design Company | Concord NH | Spearlance    ← City not embedded in keyword phrase
Concord NH Website Design | Spearlance              ← Only one variation, wasting title space
```

### Rule 1.2 — CTR Modifiers

**Trigger:** Any title where competitive SERPs exist.
**Action:** Prepend one CTR modifier within the first 60 characters.
**Approved Modifiers:** Best, Affordable, Award-Winning, Trusted, Top-Rated, #1, 30+ Years, Licensed, Certified
**Constraint:** Only use modifiers the client can truthfully claim. If unsure, omit.

### Rule 1.3 — Context Safeguard

**Trigger:** A semantically adjacent keyword appears tempting but does not match the page's primary intent.
**Action:** Do NOT place it in title position 1. It may appear after position 2 or in supporting content.

```
If keyword is core to page intent → Place in position 1
If keyword is adjacent but secondary → Place in position 3+ or in H2/content only
If keyword would redefine the page's purpose → Do NOT add to title at all. Flag for new page creation.
```

---

## Meta Description Rules (Section 2)

### Rule 2.1 — Description Construction

**Trigger:** Every page requires a meta description.

Structure:
1. Open with primary keyword phrase (including city)
2. Repeat city naturally at least once more
3. Include 2-4 keyword variations
4. Include one credibility trigger (years in business, number of clients, certifications, results)
5. End with a call to action

**Constraints:**
- No hard character limit (Google will truncate, but the full text serves as keyword context)
- Must read naturally — not a keyword dump
- Never duplicate the meta title verbatim

**Template:**
```
Looking for [primary keyword + city]? [Brand] is a trusted [variation 1] in [city] specializing in [variation 2], [variation 3]...
```

---

## Heading & Banner Structure (Section 3)

### Rule 3.1 — H1 Tag

**Trigger:** Every page.

- Exactly ONE H1 per page. No exceptions.
- H1 must contain the exact primary keyword phrase (including city for local pages).
- H1 is styled smaller than H2 (used as a kicker/eyebrow title above the banner).

**Failure Condition:** If a page has zero or more than one H1 → flag immediately. Fix before any other optimization.

### Rule 3.2 — H2 Banner Headline

**Trigger:** Every page's hero/banner section.

- H2 is the visually dominant headline.
- Must pass the billboard test: clear meaning in under 2 seconds.
- Conversion-focused. No fluff.
- Does NOT need to match primary keyword exactly — it serves the reader, not the crawler.

### Rule 3.3 — Subtitle

Place a subtitle paragraph below the H2:
- Explain exactly what the business does and what happens next.
- Specific. No filler. No "we're passionate about..."

### Rule 3.4 — H2/H3 Hierarchy in Body Content

- Use H2 for major sections.
- Use H3 for subsections within each H2.
- Never skip heading levels (no H2 → H4).
- Include keyword variations in H2s where natural.
- Include city in at least 2 body H2s for local pages.

---

## URL Structure (Section 4)

### Rule 4.1 — URL Pattern

**Trigger:** Creating any new page.

Hierarchy: `/{service-slug}/{city-state}`

```
Examples:
/web-design/concord-nh
/seo/manchester-nh
/google-ads/nashua-nh
/pediatric-therapy/tampa-fl
```

**Rationale:** Clean architecture, easy to scale by service, strong topical grouping, easier interlinking.
**Constraint:** Do NOT use `/{city}/{service}` unless the total number of services is fewer than 3 and will never grow.

### Rule 4.2 — Slug Formatting

- All lowercase
- Hyphens only (no underscores, no spaces)
- No stop words unless required for readability
- State abbreviation lowercase with no periods: `nh` not `NH` or `n.h.`

---

## Content Quality Thresholds (Section 6)

### Minimum Thresholds

| Metric | Minimum | Target | Rewrite Trigger |
|--------|---------|--------|-----------------|
| Word count (service page) | 1,500 | 2,000-2,500 | Below 1,200 |
| Word count (blog post) | 1,000 | 1,500-2,000 | Below 800 |
| Word count (city page) | 1,200 | 1,500-2,000 | Below 1,000 |
| Internal links per page | 5 | 10+ | Below 3 |
| H2 headings per page | 4 | 6-8 | Below 3 |
| FAQ items (local pages) | 3 | 5-7 | Below 3 |
| Unique content per city page | 30% | 50%+ | Below 20% |

### Publishing Cadence

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

### Pillar Page Model (Section 6.3)

Every major service must have a pillar structure:

```
Pillar Page: /web-design/
├── Supporting Article: /blog/how-to-choose-a-web-designer/
├── Supporting Article: /blog/web-design-cost-guide/
├── Supporting Article: /blog/custom-website-vs-template/
├── City Page: /web-design/concord-nh
├── City Page: /web-design/manchester-nh
└── City Page: /web-design/nashua-nh
```

**Linking Rules:**
- Every supporting article links back to its pillar page
- Pillar page links to all supporting articles
- Cross-link between related pillars (e.g., /web-design/ ↔ /seo/)
- City pages link to pillar and to adjacent city pages

---

## Interlinking Rules (Section 7)

### Rule 7.1 — Link Density

**Trigger:** Every page, every time content is published or updated.

- Minimum 5 internal links per page
- Target 10+ when content allows
- Every mention of a keyword that matches an existing service/city page should be linked (first occurrence on the page)

### Rule 7.2 — Anchor Text Distribution

| Anchor Type | Target % | Description |
|------------|----------|-------------|
| Exact match | 30-40% | "web design in Concord NH" → /web-design/concord-nh |
| Partial match | 30-40% | "our Concord web design team" → /web-design/concord-nh |
| Branded/natural | 20-30% | "learn more here" or "Spearlance's services" |

### Rule 7.3 — Linking Patterns

```
If blog post mentions a service keyword → Link to service page
If blog post mentions a city → Link to city page (if it exists)
If city page references neighboring towns → Link to those town pages
If service page references a related service → Link to that service page
If any page references the pillar topic → Link to pillar page
```

**Constraint:** Don't link the same URL more than once on the same page. First occurrence only.

---

## Page Context Protection (Section 13) — CRITICAL SAFETY RULE

### Rule 13.1 — Intent Preservation

**Trigger:** Any time optimization is being applied to an existing page.

1. Before making any changes, identify and document the page's primary intent.
2. All optimizations must reinforce that intent — never redirect it.

```
If page is a service page → It stays a service page
  - Do NOT convert to pricing page, comparison page, or guide
  - Pricing can be added as a SECTION (H2), FAQ, or sidebar — never as the primary focus

If page is a blog post → It stays a blog post
  - Do NOT convert to a service page
  - Service CTAs are fine; full service page treatment is not

If page is a city page → It stays a city page
  - Do NOT dilute with non-local content that removes geographic focus

If a secondary keyword would redefine the page → Create a new page for that keyword instead
```

### Rule 13.2 — Intent Violation Escalation

**Trigger:** Agent detects that an optimization would change a page's primary purpose.

**Action: STOP.** Do not apply the change. Instead:
1. Document the opportunity (the keyword/intent that was identified)
2. Recommend creating a new page to capture that intent
3. Flag for Garrett's review

---

## Error Handling & Escalation (Section 14)

### Rule 14.1 — Conflicting Signals

```
If a page is ranking well for an unintended keyword:
  → Do NOT remove the keyword from the page
  → Evaluate if a new, dedicated page should be created for that keyword
  → If yes, create the new page and allow natural ranking to shift
  → Monitor both pages for 30 days
  → Flag for review if cannibalization occurs

If two pages are cannibalizing the same keyword:
  → Identify which page has stronger signals (links, age, CTR)
  → Consolidate content into the stronger page
  → 301 redirect the weaker page
  → Flag for Garrett's approval before executing redirect
```

### Rule 14.2 — Failed Optimizations

```
If title rewrite → CTR drops >20% in 14 days → Revert (Rule 12.2)
  → Revert to previous title/description
  → Flag for manual review by Garrett
  → Document what was tried and the result

If content expansion → Rankings drop for primary keyword within 21 days
  → Review for keyword dilution
  → Check if word count increase added fluff vs. substance
  → Revert if no clear cause identified, flag for review

If new city page → Zero impressions after 30 days
  → Verify indexing (is the page in Google's index?)
  → Verify internal links exist to the page
  → Verify sitemap includes the page
  → If all checks pass, flag for content quality review
```

### Rule 14.3 — Escalation to Garrett

**Always escalate (do not act autonomously) when:**
- A 301 redirect is recommended
- A page deletion is recommended
- Cannibalization is detected between two important pages
- A client's brand name or NAP information needs to be changed
- An optimization would affect a page that's currently generating leads or conversions
- Any action that cannot be easily reversed

---

## Weekly Operating Cycle (Section 16)

The agent operates in continuous weekly cycles:

```
1. MONITOR
   - Review Search Console data
   - Check CTR flags (Rule 12.1 triggers)
   - Check for new query opportunities
   - Check for indexing issues

2. FIX
   - Rewrite flagged titles/descriptions
   - Fix any schema errors
   - Fix any broken internal links
   - Resolve any indexing issues

3. OPTIMIZE
   - Expand content on underperforming pages
   - Add internal links to new/updated pages
   - Update schema where missing
   - Improve CTR on high-impression pages

4. CREATE
   - Publish new blog posts (min 3/week)
   - Create new city pages per expansion plan
   - Build new pillar/subservice pages

5. BUILD
   - Claim/fix citations
   - Submit to new directories
   - Pursue backlink opportunities

6. REPORT
   - Document actions taken
   - Document results of previous changes
   - Flag items for escalation
   - Update content calendar
```

**Priority Rule:** If steps conflict due to time constraints, execute in the order listed. Monitoring and fixing always come before creating new content.

---

## Agent Behavioral Rules (Section 18)

### Rule 18.1 — Always Do

- Read and understand page intent before making any changes
- Check for existing pages before creating new ones (avoid duplication)
- Validate schema after adding it
- Document every change made and the rationale
- Follow the escalation rules in Section 14

### Rule 18.2 — Never Do

- Never change a page's primary intent without explicit approval
- Never create duplicate pages targeting the same keyword + city combination
- Never delete content or pages without escalation
- Never execute 301 redirects without approval
- Never add schema that doesn't accurately reflect page content
- Never publish content without checking for factual accuracy
- Never use black-hat techniques under any circumstance

### Rule 18.3 — When In Doubt

```
If uncertain about whether an action is appropriate
  → Default to the more conservative option
  → Document the decision and reasoning
  → Flag for Garrett's review in the next reporting cycle
```
