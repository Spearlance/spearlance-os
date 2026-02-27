---
model: claude-sonnet-4-6
name: local-growth
description: Use when running a local business growth pipeline — local SEO, reviews, content, links, AI presence, and conversion optimization. Also use when onboarding a local service business or planning a local growth strategy.
---

# Local Growth

## Overview

The comprehensive local business growth pipeline. Designed for service-based businesses with a physical location or defined service area that need to dominate their local market. Think HVAC, plumbers, dentists, attorneys, home services, medical practices, auto repair, landscaping.

This is an orchestrator — it chains 6 phases of specialized skills into a single structured growth campaign. Run it top-to-bottom for a new client onboarding. Run individual phases for targeted improvement.

```
Phase 1: Local Foundation    → NAP, GBP, schema — get the basics airtight
Phase 2: Reputation Engine   → reviews — build trust at scale
Phase 3: Local Content       → content strategy — own local search topics
Phase 4: Local Authority     → links + citations — build domain authority
Phase 5: AI Presence         → AI search — get cited by LLMs
Phase 6: Conversion          → CRO — turn traffic into calls and leads
──► Deliverables + KPI dashboard at completion
```

**Target audience:** Service businesses competing in a defined geographic area — city, metro, or regional service zones.

---

## Prerequisites

Before starting, confirm:

| Item | Required | Notes |
|------|----------|-------|
| Business name, address, phone | Yes | Must be exact canonical form |
| Google Business Profile access | Yes | Admin or owner access |
| Website CMS access | Yes | For on-page changes and schema |
| Google Search Console access | Recommended | For index and ranking data |
| Analytics access (GA4 or equivalent) | Recommended | For traffic and conversion data |
| Review platform credentials | Recommended | Google, Yelp, Facebook, industry directories |

If `business.json` does not exist in the project root, Phase 1 will create it via `nap-ninja`. All subsequent phases assume it exists.

---

## Phase 1: Local Foundation

**Time: 60-90 min**

The foundation phase locks in NAP consistency, optimizes the Google Business Profile, and implements the structured data layer. Nothing else matters until these are correct — citation building on broken NAP is actively harmful.

### Step 1.1 — Full Local SEO Audit

Invoke `local-seo-audit`.

It will audit:

- NAP consistency across website, GBP, and top citation sources
- Google Business Profile completeness (categories, description, photos, posts, Q&A, services)
- Location page uniqueness (60%+ unique content threshold)
- LocalBusiness schema — presence, accuracy, validation
- On-page local optimization (title tags, H1s, URL structure, internal links)
- Review health — volume, recency, response rate, platform diversity
- Citation gaps vs competitors
- AI citation status across ChatGPT, Claude, Gemini, Perplexity
- Local pack position for primary service keywords

**Output:** Prioritized findings list with CRITICAL / IMPORTANT / SUGGESTION severity.

Fix all CRITICAL findings before proceeding to Step 1.2.

### Step 1.2 — Centralize Business Info

Invoke `nap-ninja`.

If `business.json` does not exist, `nap-ninja` will:

1. Scan the codebase for all hardcoded business data (name, address, phone, hours, social links)
2. Create `business.json` with centralized, canonical business info
3. Replace all hardcoded instances with references to `business.json`
4. Verify zero remaining hardcoded NAP data in source files

If `business.json` already exists, verify it reflects the canonical NAP form that will be used across all citations going forward.

**Gate:** `business.json` must exist and be accurate before proceeding.

### Step 1.3 — Schema Implementation

Invoke `schema-markup`.

For local service businesses, implement the full schema stack:

| Schema Type | Pages | Priority |
|-------------|-------|----------|
| `LocalBusiness` + specific subtype | Homepage, all location pages | Critical |
| `ServiceArea` with `geoContains` | Homepage, location pages | Critical |
| `AggregateRating` (from live data) | Homepage, location pages | Critical |
| `Service` schema | Each service page | High |
| `FAQPage` | Service pages, location pages | High |
| `Review` | Pages with testimonials | Medium |

**Subtype selection — use the most specific applicable type:**

| Business Type | Schema Subtype |
|---------------|---------------|
| HVAC | `HVACBusiness` |
| Plumber | `Plumber` |
| Electrician | `Electrician` |
| Dentist | `Dentist` |
| Attorney | `Attorney` or `LegalService` |
| Physician | `Physician` |
| Veterinarian | `Veterinary` |
| Auto repair | `AutoRepair` |
| Locksmith | `Locksmith` |
| Roofing / General contractor | `HomeAndConstructionBusiness` |
| Landscaping | `LandscapingService` |
| Moving company | `MovingCompany` |

**Never hardcode `aggregateRating`.** Pull from real review data or omit.

Validate schema at `https://validator.schema.org` and `https://search.google.com/test/rich-results` before marking complete.

### Phase 1 Gate

| Check | Pass Criteria |
|-------|--------------|
| `business.json` exists | ✓ |
| All CRITICAL audit findings resolved | ✓ |
| LocalBusiness schema validated | ✓ |
| GBP matches canonical NAP | ✓ |
| No orphan location pages (all linked internally) | ✓ |

---

## Phase 2: Reputation Engine

**Time: 45-60 min**

Reviews are the highest-trust conversion signal for service businesses. A prospect choosing between two plumbers, attorneys, or remodelers will call the one with more recent, higher-rated, responded-to reviews. This phase builds the system that generates consistent weekly reviews.

### Step 2.1 — Review Strategy

Invoke `review-management`.

Build the full review lifecycle:

**Review Generation Flow:**

```
Service completed
     ↓
Post-service NPS survey (email or SMS — within 24 hours)
     ↓
Score 8-10 → Route to Google review link (direct compose URL)
Score 1-7  → Route to internal feedback form → trigger service recovery
     ↓
Follow-up at 7 days if no review submitted
```

**NPS gate is mandatory.** Never blast all customers with review requests — it tanks average rating when unhappy customers respond.

**Google Review Link Format:**
```
https://search.google.com/local/writereview?placeid=[PLACE_ID]
```

Get Place ID from GBP dashboard or `https://developers.google.com/maps/documentation/places/web-service/place-id`. Test the link before deploying.

### Step 2.2 — Response Templates

`review-management` will produce:

| Template Type | Use Case |
|---------------|----------|
| Positive — generic | Any 5-star review |
| Positive — detailed | Reviews mentioning specific team member or job |
| Neutral — 3-4 star | Mixed feedback |
| Negative — service issue | Complaint about work quality |
| Negative — pricing | Complaint about cost |
| Negative — communication | Complaint about responsiveness |
| Negative — can't verify | Review appears fraudulent |

**Response cadence:**

| Platform | Target Response Time |
|----------|---------------------|
| Google | Within 24 hours |
| Yelp | Within 48 hours |
| Facebook | Within 48 hours |
| Industry-specific | Within 72 hours |

### Step 2.3 — Review Monitoring Setup

Configure monitoring so no review goes unnoticed:

- Google Alerts: `"[Business Name]"` — daily digest
- GBP notifications: enable email alerts for new reviews
- Yelp Business: enable email notifications
- Third-party tools (optional): Birdeye, Podium, Grade.us for unified inbox

### Phase 2 Targets

| Metric | Target | Timeline |
|--------|--------|----------|
| Google review velocity | 10+ per month | Ongoing |
| Average Google rating | 4.5+ | Maintain |
| Total Google reviews | 50+ | 90-day target |
| Review response rate | >80% on all platforms | Ongoing |
| Multi-platform presence | 3+ platforms active | Month 1 |

---

## Phase 3: Local Content

**Time: 45-60 min**

Local content owns the long tail of local search — service + city modifier combinations, seasonal queries, cost questions, how-to lookups. This phase builds the content architecture and editorial calendar.

### Step 3.1 — Content Strategy

Invoke `content-strategy` with local business focus.

### Local Content Architecture

Every local service business needs these content types:

**Service Pages (one per service)**

- URL: `/{service}` or `/services/{service}`
- H1: `[Service] in [City, State]`
- 800-1,500 words, keyword-natural
- Include: pricing ranges, process explanation, FAQs, testimonials
- Schema: `Service`, `FAQPage`, link to `LocalBusiness`
- Internal links: → location pages, → related services

**Location Pages (one per city/area)**

- URL: `/{city}` or `/locations/{city}` or `/{service}/{city}`
- H1: `[Service] in [City] | [Business Name]`
- 60%+ unique content per page (not city-swapped templates)
- Include: local landmarks, neighborhood references, area-specific testimonials
- Schema: `LocalBusiness` with location-specific address/coordinates
- Internal links: → homepage, → service pages, ↔ nearby location pages

**Blog / Resource Content**

| Type | Examples | Keyword Pattern |
|------|---------|----------------|
| Cost guides | "How much does furnace replacement cost in [City]?" | "cost of X in [city]" |
| Seasonal | "Fall HVAC maintenance checklist for [State] homeowners" | seasonal + local |
| How-to | "How to know when to call a plumber vs DIY" | informational |
| Local topics | "Best neighborhoods in [City] for [service demand]" | purely local |
| Emergency guides | "What to do when your AC dies in [City] summer heat" | urgency + local |

**FAQ Pages**

- Answers to the top 10-15 customer questions per service
- Schema: `FAQPage` on every FAQ page
- Target featured snippets and AI citations (LLMs love structured Q&A)

**Case Studies / Before-After**

- Actual project photos with location context ("replaced roof for a family in [Neighborhood]")
- High trust signal for mid-to-high ticket services
- Cross-link from relevant service and location pages

### Step 3.2 — 3-Month Editorial Calendar

Output from `content-strategy`:

| Month | Content Pieces | Priority |
|-------|---------------|----------|
| Month 1 | Core service pages (top 3-5 services) | Foundation |
| Month 1 | Primary location page (main city/area) | Foundation |
| Month 2 | Secondary service pages | Expansion |
| Month 2 | Secondary location pages (top service areas) | Expansion |
| Month 3 | Blog posts (cost guides + seasonal) | Authority |
| Month 3 | FAQ pages per service | Authority |

Ongoing: 2-4 blog posts per month to maintain freshness signals and capture long-tail queries.

---

## Phase 4: Local Authority

**Time: 30-45 min**

Authority signals — links and citations — tell Google and LLMs that the business is a recognized, trusted entity in the local market.

### Step 4.1 — Link Analysis

Invoke `link-analysis` with local focus.

Identify link opportunities in priority order:

| Source Type | Priority | Effort | Notes |
|-------------|----------|--------|-------|
| Chamber of Commerce | Critical | Low | Join if not a member — direct citation + link |
| Better Business Bureau (BBB) | High | Low | Accreditation = trust signal |
| Local news / press coverage | High | Medium | HARO, local journalist relationships |
| Sponsor local events | High | Medium | Sponsorship page links from events/charities |
| Industry associations | High | Low | ACCA, ABA, ADA, AGC, etc. |
| Partner businesses | Medium | Medium | Reciprocal links with non-competing complementary services |
| Local directories | Medium | Low | City/regional business directories |
| Guest posts on local sites | Medium | High | Local blogs, neighborhood sites |

### Step 4.2 — Citation Building

Build citations in priority tiers:

**Tier 1 — Data Aggregators (highest leverage)**

| Source | Why |
|--------|-----|
| Foursquare / Factual | Powers hundreds of downstream directories |
| Data Axle (InfoUSA) | Powers Yelp, YP, and others |
| Neustar Localeze | Powers local data for multiple platforms |

**Tier 2 — General Directories**

Yelp, BBB, Yellowpages, Manta, Alignable, Nextdoor Business, Apple Business Connect, Bing Places, Angi, HomeAdvisor, Thumbtack (for home services)

**Tier 3 — Industry-Specific**

| Industry | Key Directories |
|----------|----------------|
| Legal | Avvo, Martindale-Hubbell, FindLaw, Justia |
| Medical/Dental | Healthgrades, Zocdoc, WebMD Health, Vitals |
| Home Services | Houzz, Porch, Networx, BuildZoom |
| Auto | CarGurus, RepairPal, AutoMD |
| Real Estate | Zillow, Realtor.com |

**Process:**

1. Fix all NAP inconsistencies in existing listings before adding new ones
2. Submit to Tier 1 aggregators first — they populate downstream citations automatically
3. Build Tier 2 and Tier 3 manually, verifying NAP matches `business.json` exactly
4. Track in citation tracker spreadsheet (directory, URL, NAP accuracy, date submitted)

**Citation tracker format:**

| Directory | URL | Name ✓/✗ | Address ✓/✗ | Phone ✓/✗ | Status |
|-----------|-----|----------|------------|----------|--------|
| Google BP | ... | ✓ | ✓ | ✓ | Live |
| Yelp | ... | ✓ | ✗ | ✓ | Fix needed |
| BBB | ... | | | | Pending |

### Phase 4 Target

50 accurate citations across general + industry directories within 60 days.

---

## Phase 5: AI Presence

**Time: 30-45 min**

LLMs (ChatGPT, Gemini, Perplexity, Claude) increasingly surface business recommendations for local queries. "Best HVAC company in Denver" answered by an AI chatbot is now a real referral channel. This phase optimizes for AI citation.

### Step 5.1 — AI Citation Audit

Invoke `ai-visibility` with local business query patterns.

Test these query patterns across ChatGPT, Claude, Gemini, and Perplexity:

| Pattern | Example |
|---------|---------|
| `[service] near [city]` | "plumber near Austin" |
| `best [service] in [city]` | "best HVAC company in Denver" |
| `[specific service] [city]` | "emergency roof repair Chicago" |
| `[service] [neighborhood]` | "electrician Capitol Hill Seattle" |
| `[business name]` | Direct brand query |
| `[service] for [need] in [city]` | "dentist for kids in Phoenix" |

**Audit results format:**

| LLM | Query | Cited? | Position | Competitor Named |
|-----|-------|--------|----------|-----------------|
| ChatGPT | best plumber in Denver | ✗ | — | ABC Plumbing |
| Claude | plumber near Denver | ○ | Checking | — |
| Gemini | emergency plumber Denver | ✓ | #2 | — |
| Perplexity | best plumber in Denver | ✗ | — | XYZ Services |

### Step 5.2 — llms.txt Implementation

Implement `llms.txt` at `https://[domain]/llms.txt` with local business focus:

```
# [Business Name]

> [Business Name] is a [service type] serving [city/service area] since [year].

## Services
[List primary services with brief descriptions]

## Service Area
[List cities, neighborhoods, counties served]

## Contact
- Phone: [phone]
- Address: [address]
- Hours: [hours]

## About
[2-3 sentences on the business — experience, specialties, differentiators]

## Reviews
[Top review platforms and aggregate rating if available]
```

Submit `llms.txt` URL to LLM crawlers where possible and ensure it is not blocked by `robots.txt`.

### Step 5.3 — AI Referral Traffic Monitoring

Set up Microsoft Clarity AI Chat Channel Groups to track sessions originating from LLM interfaces:

1. In Clarity: **Filters > Traffic Source**
2. Create channel group for LLM referrers: `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`
3. Monitor: session volume, pages visited, conversion events
4. Track month-over-month growth — upward trend confirms citation is working

Cross-reference with `microsoft-clarity` skill for full setup.

### What Drives AI Citation for Local Businesses

| Factor | Action |
|--------|--------|
| Dense, consistent citations | Build citations — more data points = LLM confidence |
| Structured data (schema) | Schema markup — machines parse it reliably |
| Review volume + quality | Reviews build authority in LLM training data |
| Authoritative local content | FAQs, cost guides, how-to content — LLMs love it |
| Press and news mentions | High-authority inbound links from outlets LLMs trained on |
| Wikipedia / knowledge graph | Knowledge graph presence is a direct LLM signal |

---

## Phase 6: Conversion

**Time: 45-60 min**

Traffic without conversion is just analytics. This phase optimizes the local conversion funnel — turning website visits and GBP impressions into phone calls, form submissions, and booked jobs.

### Step 6.1 — Service Page CRO

Invoke `landing-page-cro` for primary service pages.

### Step 6.2 — Full Conversion Audit

Invoke `cro-audit` for the local conversion funnel.

### Local-Specific Conversion Elements

Every service business website needs these conversion elements present and functioning:

**Above the Fold (homepage + service pages)**

| Element | Requirement |
|---------|-------------|
| Click-to-call button | Phone number as `<a href="tel:...">` — tap to call on mobile |
| Primary CTA | "Request Estimate", "Book Appointment", "Get a Quote" |
| Trust signals | Review count + rating, years in business, licenses/certifications |
| Service area | Clear statement of where the business serves |

**Local Trust Signals**

| Signal | Placement |
|--------|-----------|
| Google review count + rating | Hero section, footer |
| Certifications and licenses | Hero or trust bar |
| BBB accreditation badge | Footer |
| Industry association logos | Trust bar |
| Before/after gallery | Service pages |
| Named testimonials with location | Throughout |

**Contact Friction Reduction**

| Element | Best Practice |
|---------|--------------|
| Phone number | Visible in header on every page, click-to-call on mobile |
| "Request Estimate" form | Short — name, phone, service, message. Never email-only. |
| Directions button | Link to Google Maps directions from business address |
| Chat widget | After-hours chatbot captures leads when office is closed |
| After-hours messaging | "We'll call you back first thing in the morning" — set expectations |

**Mobile Optimization (Critical)**

Local searches skew heavily mobile. Verify:
- [ ] Phone number tappable on all mobile breakpoints
- [ ] CTA button above fold on mobile
- [ ] Form fields are mobile-friendly (no tiny inputs)
- [ ] Page load time under 3 seconds on mobile
- [ ] Maps embed loads correctly on mobile

### Phase 6 Conversion Targets

| Metric | Target |
|--------|--------|
| Overall conversion rate | 5%+ of local sessions |
| Phone call rate (mobile) | 8%+ of mobile sessions |
| Form submission rate | 2-3% of sessions |
| Chat engagement | 10%+ of sessions with chat widget active |

---

## Monthly Maintenance

After the 6-phase build-out, shift to monthly maintenance mode:

| Task | Skill | Cadence |
|------|-------|---------|
| Respond to new reviews | `review-management` | Weekly |
| GBP posts | Manual / GBP API | 1-2x per week |
| SEO health check | `seo-pulse` | Monthly |
| Full retainer report | `monthly-pulse` | Monthly |
| AI citation check | `ai-visibility` | Monthly |
| New blog content | `content-strategy` | 2-4x per month |
| Review velocity check | `review-management` | Monthly |
| Citation accuracy spot-check | Manual | Quarterly |

---

## Deliverables

| Deliverable | Phase | Description |
|-------------|-------|-------------|
| NAP report | 1 | `business.json` + consistency audit findings |
| Local audit report | 1 | Full local-seo-audit output with prioritized findings |
| Schema implementation | 1 | Validated LocalBusiness + Service + FAQ schema |
| Review playbook | 2 | NPS-gated generation flow + response templates |
| 3-month content calendar | 3 | Service pages, location pages, blog topics |
| Citation tracker | 4 | Directory list with status and NAP accuracy |
| AI citation audit | 5 | LLM query results + llms.txt + traffic setup |
| CRO recommendations | 6 | Conversion audit with prioritized fixes |
| Local growth action plan | All | Prioritized 30/60/90-day roadmap |
| KPI dashboard | All | Live tracking template (see below) |

---

## Local Growth KPI Dashboard

Set up tracking before starting. Baseline every metric on Day 1.

```
## Local Growth Dashboard — [Business Name]

### KPIs
| Metric                     | Baseline | Target | Current | Status |
|----------------------------|----------|--------|---------|--------|
| Google Reviews (total)     | ...      | 50+    | ...     | ○/◐/● |
| Avg Rating (Google)        | ...      | 4.5+   | ...     | ✓/✗   |
| GBP Views (monthly)        | ...      | +30%   | ...     | ↑/↓/→ |
| Local Pack Position        | ...      | Top 3  | ...     | ↑/↓/→ |
| Phone Calls (monthly)      | ...      | +40%   | ...     | ↑/↓/→ |
| Form Submissions (monthly) | ...      | +40%   | ...     | ↑/↓/→ |
| Website Sessions (local)   | ...      | +30%   | ...     | ↑/↓/→ |
| Conversion Rate            | ...      | 5%+    | ...     | ✓/✗   |
| AI Citations               | ...      | 3+ LLMs| ...    | ○/◐/● |
| Citation Count             | ...      | 50+    | ...     | ○/◐/● |
| Review Velocity            | ...      | 10/mo  | ...     | ↑/↓/→ |
| Review Response Rate       | ...      | 80%+   | ...     | ✓/✗   |

### 30-Day Actions
- [ ] ...
- [ ] ...

### 60-Day Actions
- [ ] ...
- [ ] ...

### 90-Day Actions
- [ ] ...
- [ ] ...
```

Measure at 30, 60, 90 days. Report via `monthly-pulse`.

---

## Timeline Summary

| Phase | Skills Invoked | Time |
|-------|---------------|------|
| 1. Local Foundation | `local-seo-audit`, `nap-ninja`, `schema-markup` | 60-90 min |
| 2. Reputation Engine | `review-management` | 45-60 min |
| 3. Local Content | `content-strategy` | 45-60 min |
| 4. Local Authority | `link-analysis` | 30-45 min |
| 5. AI Presence | `ai-visibility` | 30-45 min |
| 6. Conversion | `landing-page-cro`, `cro-audit` | 45-60 min |
| **Total** | | **4.5-6.5 hours** |

---

## Related Skills

- `local-seo-audit` — Phase 1 baseline audit
- `schema-markup` — LocalBusiness structured data
- `nap-ninja` — NAP centralization to business.json
- `review-management` — Phase 2 review generation and management
- `content-strategy` — Phase 3 local content architecture
- `link-analysis` — Phase 4 local link opportunities
- `ai-visibility` — Phase 5 AI citation monitoring
- `landing-page-cro` — Phase 6 service page conversion
- `cro-audit` — Phase 6 full conversion funnel audit
- `seo-pulse` — monthly SEO health check
- `monthly-pulse` — full monthly retainer report
- `search-rank` — local keyword position tracking
- `google-business-profile-api` — programmatic GBP updates and posting
