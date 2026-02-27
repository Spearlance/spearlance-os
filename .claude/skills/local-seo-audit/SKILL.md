---
model: claude-sonnet-4-6
name: local-seo-audit
description: Use when auditing local SEO — NAP consistency, location page uniqueness, LocalBusiness schema, review signals, Google Business Profile alignment, citation audit, AI citation monitoring, or review management cross-reference. Also use when a business serves specific geographic areas and needs to rank in local search results and AI-generated answers.
---

# Local SEO Audit

## Overview

Comprehensive local SEO audit based on current local ranking factors. Local SEO is distinct from general SEO — it targets the local pack (map results), localized organic results, and increasingly, AI-generated answers (ChatGPT, Perplexity, Gemini, Claude). The primary signals are proximity (uncontrollable), relevance (your content), and prominence (your authority/reviews).

```
Section 1: NAP Consistency
Section 2: Location Page Uniqueness
Section 3: LocalBusiness Schema Markup
Section 4: On-Page Local Optimization
Section 5: Review Signals
Section 6: Google Business Profile Alignment
Section 7: Citation Audit
Section 8: AI Citation Monitoring
Section 9: Review Management
──► Structured report with severity levels
```

---

## Quick Reference

| Factor | Weight | What It Affects |
|--------|--------|----------------|
| Google Business Profile | High | Local pack ranking |
| NAP consistency | High | Trust signals across web |
| Reviews (volume + recency) | High | Local pack + click-through |
| Local content uniqueness | High | Organic local rankings |
| AI citations | High | LLM referral traffic — new frontier |
| On-page optimization | Medium | Organic + local |
| Schema markup | Medium | Rich results + trust |
| Citations | Medium | Authority signals |
| Backlinks | Lower | Domain authority |

---

## Invocation Options

```
local-seo-audit              # Full audit
local-seo-audit nap          # NAP consistency only
local-seo-audit locations    # Location pages only
local-seo-audit schema       # Schema markup only
local-seo-audit reviews      # Review signals only
local-seo-audit gbp          # GBP alignment only
local-seo-audit citations    # Citation audit only
local-seo-audit ai           # AI citation monitoring only
```

---

## Section 1: NAP Consistency

NAP = Name, Address, Phone. Inconsistency across the web erodes trust signals and confuses Google.

### Sources to Check

- Website footer (every page)
- Contact page
- Each location-specific page
- Schema markup (`LocalBusiness` JSON-LD)
- Google Business Profile
- Apple Business Connect listing
- Bing Places
- Nextdoor Business listing

### What to Verify

Exact string match — not approximate:

| Field | Common Errors |
|-------|--------------|
| Business name | Abbreviations ("St." vs "Street"), DBA variations |
| Address | Suite/Ste formatting, abbreviations |
| Phone | (555) 867-5309 vs 555-867-5309 vs +15558675309 |
| URL | With/without trailing slash, http vs https |

### Output Format

| Source | Name | Address | Phone | URL | Status |
|--------|------|---------|-------|-----|--------|
| Website footer | ✓ | ✓ | ✓ | ✓ | PASS |
| Contact page | ✓ | ✗ | ✓ | ✓ | FAIL |
| Schema markup | ✓ | ✓ | ✗ | ✓ | FAIL |

Flag any FAIL as CRITICAL — fix NAP before anything else.

---

## Section 2: Location Page Uniqueness

Thin, templated location pages are a known ranking killer. Google's Helpful Content guidance explicitly targets "pages made primarily for search engines."

### Uniqueness Targets

Location pages should have at minimum **60% unique content** per page. Generic content copied across location pages will not rank and may trigger thin-content penalties.

### Uniqueness Checklist Per Location Page

| Element | Present? | Notes |
|---------|----------|-------|
| Unique H1 with city/region | ○ | Not just "[City] + Service" |
| Local landmarks or neighborhoods | ○ | "Near the Riverwalk" etc. |
| Area-specific testimonials | ○ | Customer names + locations |
| Driving directions from landmarks | ○ | Not just an embedded map |
| Local statistics or context | ○ | Population served, local facts |
| Location-specific images | ○ | Not stock photos |
| Unique meta title and description | ○ | Not template-filled |
| LocalBusiness schema | ○ | See Section 3 |

### What to Flag

- Pages sharing the same body text with only city name swapped → CRITICAL
- Pages under 500 words → IMPORTANT
- Pages missing local landmarks → IMPORTANT
- Pages with no location-specific testimonials → SUGGESTION

---

## Section 3: LocalBusiness Schema Markup

Schema is required on homepage and location pages. For local service businesses, implement the full set: `LocalBusiness` (with subtype), `ServiceArea`, `AggregateRating`, and `FAQPage`.

Use the `schema-markup` skill for full implementation guidance.

### Required on Homepage + Location Pages

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "ST",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "telephone": "+15558675309",
  "url": "https://example.com",
  "openingHoursSpecification": [...],
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.8827,
    "longitude": -87.6233
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "127"
  },
  "areaServed": {
    "@type": "ServiceArea",
    "geoContains": [...]
  }
}
```

### Minimum Schema Set for Local Service Businesses

| Schema Type | Pages | Why |
|-------------|-------|-----|
| `LocalBusiness` + subtype | Homepage, location pages | Core trust signal |
| `ServiceArea` | Homepage, location pages | Geographic relevance |
| `AggregateRating` | Homepage, location pages | Review signals in rich results |
| `FAQPage` | Service pages, location pages | Featured snippet eligibility |

### Schema Validation Checklist

| Property | Required | Notes |
|----------|----------|-------|
| `@type` | Yes | `LocalBusiness` or more specific subtype (e.g., `Plumber`, `HVACBusiness`) |
| `name` | Yes | Must match NAP exactly |
| `address` | Yes | Full `PostalAddress` |
| `telephone` | Yes | Must match NAP exactly |
| `url` | Yes | Canonical URL |
| `openingHours` | Recommended | ISO 8601 format |
| `aggregateRating` | If reviews exist | Pull from real data, never hardcode |
| `geo` | Recommended | Exact lat/lng |
| `priceRange` | Recommended | "$" to "$$$$" |
| `image` | Recommended | Business photo |
| `areaServed` | Recommended | `ServiceArea` with geo coverage |

### Validation

1. Validate at `https://validator.schema.org`
2. Check rich results at `https://search.google.com/test/rich-results`
3. Verify `aggregateRating` matches actual review count (if hardcoded, flag as CRITICAL)

---

## Section 4: On-Page Local Optimization

### URL Structure

Best practice: `/{service}/{location}` or `/{location}/{service}`

Examples:
- `/plumbing/chicago` ✓
- `/chicago-plumbing` ✓
- `/services?city=chicago` ✗ (parameter URLs are harder to rank)

### Title Tag Pattern

`{Primary Service} in {City} | {Business Name}`

- Under 60 characters
- City name in title — not just in body text
- Unique per location page

### H1 Pattern

`{Service} in {City, State}` or `{City} {Service}`

One H1 per page. Must include the geographic modifier.

### Internal Linking

- Homepage → all location pages
- Each service page → relevant location pages
- Location pages ↔ cross-link related locations (hub-and-spoke)
- Location pages → relevant service pages

Orphan location pages (no internal links pointing to them) will not rank. Flag any.

---

## Section 5: Review Signals

Reviews are a top local ranking factor — volume, recency, and response rate all matter. For full review strategy, cross-reference the `review-management` skill (Section 9 here covers the audit layer).

### Review Audit

| Platform | Count | Avg Rating | Most Recent | Response Rate |
|----------|-------|------------|-------------|---------------|
| Google | ? | ? | ? | ? |
| Yelp | ? | ? | ? | ? |
| Facebook | ? | ? | ? | ? |
| Industry-specific | ? | ? | ? | ? |

### Health Criteria

| Signal | Target |
|--------|--------|
| Total Google reviews | > 50 (competitive) |
| Average rating | ≥ 4.5 |
| Reviews in last 90 days | ≥ 5 |
| Owner response rate | > 80% |
| Review diversity (multi-platform) | ≥ 3 platforms |

### On-Site Review Display

- Are reviews displayed on the website?
- Is `Review` or `AggregateRating` schema present?
- Does the schema pull from live data (not hardcoded)?
- Are negative reviews responded to publicly on platforms?

---

## Section 6: Google Business Profile Alignment

GBP is the single highest-impact local SEO lever. Mismatches between GBP and website erode trust signals.

### GBP vs Website Consistency Check

| Field | GBP Value | Website Value | Match? |
|-------|-----------|---------------|--------|
| Business name | | | ○ |
| Primary category | | | ○ |
| Address | | | ○ |
| Phone | | | ○ |
| Hours | | | ○ |
| Website URL | | | ○ |
| Service areas | | | ○ |

### GBP Health Checklist

- [ ] All service categories claimed (primary + secondary)
- [ ] Business description written (750 chars, keyword-natural)
- [ ] Photos: exterior, interior, team, products/services (min 10)
- [ ] Services listed with descriptions and prices
- [ ] Q&A section populated with common questions
- [ ] Posts published in last 7 days
- [ ] Messaging enabled and monitored
- [ ] Service areas match website location pages

### GBP Post Tracking

Stale GBP = stale business signal to Google. Active posting correlates with local pack visibility.

| Post Type | Frequency | Key Elements |
|-----------|-----------|-------------|
| Updates | 1-2x/week | CTA button, keyword-natural copy |
| Offers | Event-driven | Expiration date, promo code |
| Events | As scheduled | Date, time, link |
| Products | Ongoing | Photo, price, description |

**Metrics to track per post:**
- Impressions
- Clicks
- CTA button clicks (call, book, order, etc.)

**Flag as IMPORTANT:** No posts in last 14 days
**Flag as CRITICAL:** No posts in last 30 days

Use `google-business-profile-api` skill for programmatic GBP data and posting automation.

---

## Section 7: Citation Audit

Citations = any mention of NAP on the web (directory listings, local sites, news).

### Priority Citation Sources

| Type | Sources |
|------|---------|
| Data aggregators | Foursquare, Data Axle, Neustar Localeze |
| General | Yelp, BBB, Yellowpages, Manta, Alignable |
| Google ecosystem | Google Business Profile, Google Maps |
| Apple | Apple Business Connect (replaced Apple Maps Connect — 2023) |
| Microsoft | Bing Places |
| Neighborhood | Nextdoor Business (high value for service businesses) |
| Industry-specific | Varies by vertical (HomeAdvisor, Houzz, Avvo, Healthgrades, etc.) |

### Apple Business Connect

Apple Business Connect replaced Apple Maps Connect in 2023. Verify the business has claimed and updated its listing — this affects Apple Maps results surfaced in iOS, Siri, Safari, Apple Pay, and Spotlight. NAP must match exactly.

Claim at: `businessconnect.apple.com`

### Nextdoor Business

Nextdoor is high-value for local service businesses — recommendations appear in neighborhood feeds and carry strong social trust signals. Verify the business has a Nextdoor Business Page and check for resident recommendations.

Claim at: `business.nextdoor.com`

### Citation Audit Process

1. Search `"[Business Name]" "[City]"` to find existing listings
2. Check each for NAP accuracy
3. Flag inconsistencies
4. Identify missing high-priority directories
5. Find duplicate listings (two GBP entries, etc.)

### Duplicate Listings

Duplicate GBP entries split authority and confuse Google. Check by searching business name in Google Maps. Flag any duplicates as CRITICAL.

---

## Section 8: AI Citation Monitoring

This is the new local SEO frontier. LLMs (ChatGPT, Gemini, Perplexity, Claude) increasingly surface business recommendations for local queries. Being the answer an LLM gives for "[service] in [city]" is now a distinct visibility channel.

### Why This Matters

LLM referral traffic is trackable and growing. Microsoft Clarity's AI Chat Channel Groups lets you identify sessions arriving from AI-generated answers. If LLMs aren't citing the business, that's a gap — and it's fixable through content authority, structured data, and citation density.

### Query Patterns to Test

For each LLM (ChatGPT, Claude, Gemini, Perplexity), run these query types:

| Pattern | Example |
|---------|---------|
| `[service] near [city]` | "plumber near Austin" |
| `best [service] in [city]` | "best HVAC company in Denver" |
| `[specific service] [city]` | "emergency roof repair Chicago" |
| `[service] [neighborhood]` | "electrician Capitol Hill Seattle" |
| `[service] for [need] in [city]` | "HVAC repair for old homes in Phoenix" |

### Audit Checklist

| LLM | Cited? | Ranking Position | Competitors Cited |
|-----|--------|-----------------|-------------------|
| ChatGPT | ○ | | |
| Claude | ○ | | |
| Gemini | ○ | | |
| Perplexity | ○ | | |

### Tracking LLM Referral Traffic

Use Microsoft Clarity's AI Chat Channel Groups to segment sessions originating from LLM interfaces:

1. In Clarity, go to **Filters > Traffic Source**
2. Create a channel group for known LLM referrers: `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`
3. Monitor session volume, pages visited, and conversion events from these sources
4. Month-over-month growth in AI referral traffic = signal the business is being cited

Cross-reference with `microsoft-clarity` skill for full setup guidance.

### What Drives AI Citation

LLMs cite businesses that have:

| Factor | Mechanism |
|--------|-----------|
| Dense, consistent citations | More data points = more confidence for LLMs |
| Structured data (schema) | Machines parse structured data more reliably |
| Reviews volume + quality | LLMs weight social proof |
| Authoritative content | Local guides, FAQs, how-to content |
| News and press mentions | High-authority links the LLM corpus ingested |
| Wikipedia or knowledge graph presence | Direct LLM training data source |

### AI Visibility Score (Qualitative)

| Status | Description | Action |
|--------|-------------|--------|
| CITED — Top 3 | Business named first or second | Maintain; monitor competitors |
| CITED — Listed | Business mentioned but not prominent | Improve citation density and content authority |
| NOT CITED | Business absent from LLM responses | Citation push, schema audit, content build-out |

For deep AI citation analysis, invoke the `ai-visibility` skill.

---

## Section 9: Review Management

Reviews are both a ranking signal and a trust signal. This section audits the review health and cross-references the `review-management` skill for full strategy and monitoring.

### Review Health Audit

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Total Google reviews | ? | > 50 | ○ |
| Average Google rating | ? | ≥ 4.5 | ○ |
| Reviews in last 90 days | ? | ≥ 5 | ○ |
| Response rate (all platforms) | ? | > 80% | ○ |
| Platforms with listings | ? | ≥ 3 | ○ |

### Google Review Link Setup

Every business needs a direct review link — a frictionless URL that drops customers into the review compose screen.

Format: `https://search.google.com/local/writereview?placeid=[PLACE_ID]`

Find the Place ID via Google's Place ID Finder or GBP dashboard. Verify the link works before deploying in post-service emails, SMS, or receipts.

### Review Response Cadence

| Platform | Response Target | Priority |
|----------|----------------|----------|
| Google | Within 24 hours | Critical — affects pack ranking |
| Yelp | Within 48 hours | High — visible in results |
| Facebook | Within 48 hours | Medium |
| Industry-specific | Within 72 hours | Medium |

**Negative review protocol:** Always respond publicly, acknowledge the concern, offer to resolve offline. Never argue. Never ignore.

### NPS-Gated Review Asking Flow

Never ask unhappy customers to leave a public review. Use an NPS gate:

1. Send post-service NPS survey ("How likely are you to recommend us?")
2. Score ≥ 8 → Route to Google review link automatically
3. Score ≤ 7 → Route to internal feedback form, trigger service recovery

This flow protects average rating while maximizing volume from promoters.

### Audit: Is an NPS-Gated Flow Active?

- [ ] Post-service survey exists
- [ ] Survey routes promoters (8-10) to Google review link
- [ ] Survey routes detractors (1-7) to internal feedback
- [ ] Negative feedback triggers service recovery workflow
- [ ] Review links are tested and working

For full review strategy, monitoring, and automation setup — invoke the `review-management` skill.

---

## Output Report Format

```
# Local SEO Audit — [Site] — [Date]

## Executive Summary
Score: [X/100]
Critical: N  |  Important: N  |  Pass: N

## NAP Consistency       [PASS / FAIL]
[table]

## Location Pages        [PASS / PARTIAL / FAIL]
[table per page]

## Schema Markup         [PASS / FAIL]
[validation results]

## On-Page Optimization  [PASS / PARTIAL]
[checklist]

## Review Signals        [status]
[platform table]

## GBP Alignment         [PASS / PARTIAL / FAIL]
[consistency table + post frequency]

## Citation Health       [status]
[directory list with status — includes Apple Business Connect, Nextdoor]

## AI Citation Status    [CITED / PARTIAL / NOT CITED]
[LLM audit table + traffic data if available]

## Review Management     [PASS / PARTIAL / FAIL]
[NPS gate status + response cadence]

## Recommendations
CRITICAL   [item] — fix immediately
IMPORTANT  [item] — fix this week
SUGGESTION [item] — when time allows
```

---

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| CRITICAL | Actively hurts rankings | Fix immediately |
| IMPORTANT | Suboptimal, leaving value on table | Fix this week |
| SUGGESTION | Could improve over time | Fix when capacity allows |

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Copy-pasting content across location pages | Write unique content per location — 60%+ unique |
| Hardcoding aggregate ratings in schema | Pull from real review data or omit entirely |
| Different phone formats across NAP sources | Pick one format, enforce everywhere |
| Ignoring GBP photo recency | Add new photos monthly — recency is a signal |
| Building citations without fixing NAP first | Fix NAP inconsistencies before adding new citations |
| Duplicate GBP entries left live | Merge or remove — duplicates split authority |
| No internal links to location pages | Orphan pages don't rank |
| Not claiming Apple Business Connect | Replaces Apple Maps Connect — required for Siri/Maps visibility |
| Ignoring AI citation monitoring | LLMs are a real referral channel — track and optimize |
| Asking all customers for reviews | NPS-gate to protect average rating |
| No GBP posts for 30+ days | Stale GBP signals inactive business to Google |

---

## Official References

- [Google Business Profile Help](https://support.google.com/business)
- [LocalBusiness Schema](https://schema.org/LocalBusiness)
- [Google's Guidelines for Local SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Apple Business Connect](https://businessconnect.apple.com)
- [Bing Places for Business](https://www.bingplaces.com)
- [Nextdoor Business](https://business.nextdoor.com)
- [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)

---

## Related Skills

- `google-search-console-api` — index status and local rankings
- `google-business-profile-api` — GBP data and posting automation
- `review-management` — review strategy, monitoring, and NPS-gated flows
- `schema-markup` — LocalBusiness structured data implementation
- `ai-visibility` — deep AI citation analysis and optimization
- `microsoft-clarity` — AI Chat Channel Groups for LLM referral tracking
- `content-strategy` — local content topics and editorial planning
- `local-growth` — orchestrator that chains all local skills end-to-end
- `seo-audit` — full site SEO pipeline
- `link-analysis` — local authority building
