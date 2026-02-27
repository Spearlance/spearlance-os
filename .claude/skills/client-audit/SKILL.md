---
model: claude-sonnet-4-6
name: client-audit
description: Use when onboarding a new client site, running a comprehensive audit, or creating a full-scope deliverable covering tracking, SEO, performance, CRO, content, and authority. Also use when a client says "audit my site" or "what needs to be done".
---

# Client Audit

## Overview

New client onboarding orchestrator. Chains 14 skills across 6 phases — tracking, SEO, performance, CRO, content + authority — into a single deliverable. One skill to start them all.

Duration: 2–4 hours with parallel subagents in phases 2 and 5.

```
Phase 1: Foundation     [████░░░░░░░░]  30–60 min
Phase 2: SEO           [████████░░░░]  60–90 min
Phase 3: Performance   [█████████░░░]  30–45 min
Phase 4: CRO           [██████████░░]  45–60 min
Phase 5: Content       [███████████░]  60–90 min
Phase 6: Deliverable   [████████████]  30 min
```

---

## Briefing — Before Any Phase Runs

Collect client context before invoking any skill:

| Item | Collect |
|------|---------|
| Business type | Local service / e-commerce / SaaS / publisher |
| Primary location(s) | City, state — multi-location? |
| Target keywords | What do they think they rank for? |
| Current tools | GA4? GSC verified? GTM installed? |
| Competitors | 2–3 named competitors |
| Goals | More calls? More form fills? More revenue? |
| Is local business? | Physical address + GBP relevant? → gates Phase 2 local path |

Store answers — they gate conditional paths in phases 2 and 5.

---

## Phase 1: Foundation Check

**Rule: data quality before analysis.** No point auditing conversion rates if analytics are broken.

### Step 1.1 — Tracking Stack

Invoke `server-side-tracking`:

- GA4 / GTM firing on all key pages
- Conversion events flowing (forms, calls, bookings)
- Server-side events (if any) matching client-side data
- No duplicate events, no missed conversions
- Consent handling — any GPC or cookie consent flags interfering?

### Step 1.2 — Tag Manager Config

Reference `google-tag-manager`:

- GTM container present and loading
- Data layer firing on key events
- No duplicate tags or conflicting triggers
- Conversion tags have correct trigger conditions

### Hard Gate

```
Tracking broken?
  ↳ Fix it NOW before continuing.
  ↳ Bad data = wrong conclusions on every phase that follows.
  ↳ Document the fix and data reliability window in the audit.
```

If tracking is fundamentally broken (no GA4, no GTM, not firing), pause the audit. Fix tracking first — then restart from Phase 2. If tracking has minor gaps (some events missing, some duplicate), document the reliability window and continue with caveats in the report.

**Output:** Tracking health status — PASS / PARTIAL / BROKEN — with specific findings.

---

## Phase 2: SEO Audit

Parallelizable: `seo-audit` and `schema-markup` are independent. Run them concurrently if dispatching subagents.

### Step 2.1 — Full SEO Pipeline

Invoke `seo-audit` — 8-phase technical SEO pipeline:

- Codebase inventory (every page: title, meta, H1, canonical, schema, OG)
- GSC data pull — top keywords, near-page-1 positions, index coverage
- AI citation check — which LLMs cite the site
- Technical audit — robots.txt, sitemap, E-E-A-T signals, mobile-first
- Core Web Vitals via Lighthouse (lab scores per key page)
- Content and keyword gap analysis
- Phase 6 approval gate (internal to seo-audit — follow its gate)

**Pass to `seo-audit`:** client URL, business type, target keywords from briefing.

### Step 2.2 — Structured Data Deep Dive

Invoke `schema-markup` in parallel with `seo-audit`:

- Audit all JSON-LD on site
- Validate against schema.org spec
- Identify missing types by page category
- Flag invalid or hardcoded AggregateRating (must come from real review data)

**Output from this step:** Schema health table — type, pages present, valid/invalid, gaps.

### Step 2.3 — Local SEO (Conditional)

Invoke `local-seo-audit` if ALL of the following are true:
- Business has a physical address (collected in briefing)
- `business.json` exists OR client confirms GBP is relevant
- Business competes in a geographic area (not pure SaaS/national e-commerce)

`local-seo-audit` covers:
- Google Business Profile completeness and accuracy
- NAP consistency across directories
- Local citation gap vs competitors
- Local keyword positions (Map Pack + organic)
- Review volume, recency, and response rate

If `business.json` exists, verify NAP data matches. If inconsistencies found, note them — `nap-ninja` can enforce consistency post-audit.

If local SEO is NOT applicable, document the reason and skip.

**Output:** Local opportunity list with citation gaps, GBP gaps, and review gaps prioritized.

---

## Phase 3: Performance

### Step 3.1 — Core Web Vitals Diagnosis

Invoke `web-performance`:

- CWV deep dive: LCP, CLS, INP — lab and field data
- Identify LCP element per key page (usually hero image or heading)
- Render-blocking resource analysis
- Image optimization opportunities
- Server response time (TTFB)
- Prioritized fix plan by impact

**Pass to `web-performance`:** key page URLs (homepage, top 3 service/product pages, contact, top 2 blog posts), tech stack from briefing.

### Step 3.2 — Field Data Baseline

Reference `crux-api`:

- Pull Chrome User Experience Report P75 field data (28-day rolling)
- Compare lab scores vs real-user field data
- Large gap between lab and field = real-world variance (third-party scripts, device mix, geography)
- Baseline established here — use for before/after comparison after fixes

**Output:** CWV status table — metric, lab value, field P75, threshold, pass/fail — per key page.

---

## Phase 4: CRO Baseline

Parallelizable: `cro-audit` and `landing-page-cro` are independent analyses.

### Step 4.1 — Conversion Analysis

Invoke `cro-audit`:

- Pull GA4 funnel data — find the primary drop-off point
- Session recording analysis (Clarity) on the leaking page
- Funnel gaps: where are users abandoning?
- Hypothesis list: 3–5 ranked test candidates with estimated impact
- CTA effectiveness, form friction, trust signal gaps, social proof placement

### Step 4.2 — Top Landing Pages

Invoke `landing-page-cro` for the top 3 landing pages by traffic (from GSC data pulled in Phase 2):

- Headline clarity and keyword alignment
- Value proposition above the fold
- CTA specificity and placement
- Form length vs conversion ask
- Trust signals: reviews, testimonials, certifications

**Output:** Conversion health snapshot — funnel drop-off point, top 3 page scores, ranked test hypotheses.

---

## Phase 5: Content & Authority

All four steps are fully independent — parallelize with subagents for maximum speed.

### Step 5.1 — Content Gap Analysis

Invoke `content-strategy`:

- Topic gaps vs competitors (what they rank for, site doesn't cover)
- Keyword clustering — existing content missing internal links
- "People Also Ask" opportunities unanswered by current content
- Content quality assessment — thin pages, duplicate topics, outdated posts
- Editorial roadmap: 5–10 topics ranked by search volume × conversion relevance × effort

### Step 5.2 — Review Health

Invoke `review-management`:

- Review volume and recency across Google, Yelp, industry directories
- Response rate (% of reviews with owner responses)
- Sentiment analysis — recurring praise vs recurring complaints
- Review request workflow — is the client actively generating reviews?
- Target: > 10 new reviews/month, ≥ 4.5 average rating

**Note:** Review health directly impacts AI citation frequency — LLMs weight review quantity and recency when deciding which businesses to surface.

### Step 5.3 — Backlink Landscape

Invoke `link-analysis`:

- Current backlink profile — domain authority, linking root domains, anchor text distribution
- Toxic link identification
- Competitor backlink gap — what authoritative sites link to competitors but not this site
- Link building opportunities: local press, industry associations, partnerships

### Step 5.4 — AI Visibility Check

Invoke `ai-visibility`:

- Query ChatGPT, Claude, Perplexity, Gemini with "[service] near [city]" and "[business name] [service]"
- Document whether the site is cited, at what position, and which competitors are cited instead
- Identify AI citation drivers: reviews, schema, E-E-A-T signals, authoritative references
- Gap vs competitors in LLM visibility

**Output:** Authority health table — content gaps (count), review score, backlink profile summary, AI citation status (cited/not cited per LLM).

---

## Phase 6: Deliverable

### Step 6.1 — Full Report Generation

Invoke `site-report` with all findings from phases 1–5:

Pass context bundle:
- Phase 1: Tracking status + specific issues
- Phase 2: SEO findings + schema gaps + local gaps (if applicable)
- Phase 3: CWV table + field data baseline
- Phase 4: Conversion funnel gap + top page scores + hypothesis list
- Phase 5: Content gaps + review health + backlink profile + AI visibility

`site-report` assembles: `reports/client-audit-[YYYY-MM-DD].html`

Report structure:
- Executive summary (3–5 highest-impact bullets)
- Critical blockers section (tracking broken, penalties, major technical issues)
- Tracking health (Phase 1 findings + data reliability window)
- SEO health (technical, schema, local)
- Performance (CWV lab + field + prioritized fixes)
- Conversion baseline (funnel gap + top landing page scores)
- Content + authority (gaps, reviews, backlinks, AI visibility)
- Full findings appendix

### APPROVAL GATE

**STOP. Present the HTML report. Ask:**

```
▸ Report delivered. Approved to build the action plan? (yes/no)
```

Do NOT proceed to the action plan without explicit client or user approval.

### Step 6.2 — Prioritized Action Plan

After approval, build the action plan:

**Quick Wins (< 1 week, high impact):**
- Tracking gaps that are breaking conversion data
- Missing title tags or duplicate meta descriptions
- Schema validation errors
- GBP fields that are empty

**30-Day Plan:**
- CWV fixes from `web-performance` diagnosis
- Top 3 content opportunities (highest volume + conversion relevance)
- Review request workflow implementation
- Landing page CRO test #1 from hypothesis list

**60-Day Plan:**
- Structured data additions from `schema-markup` findings
- Link building outreach for top 3 competitor gap opportunities
- Content creation for top 5 editorial topics
- CRO test #2 if test #1 has run long enough

**90-Day Plan:**
- Full local citation build (if applicable)
- AI visibility improvements (FAQ content, E-E-A-T signals, schema completeness)
- Content cluster completion
- Review velocity target hit: > 10/month sustained

**Deliverables:**
- `reports/client-audit-[YYYY-MM-DD].html` — comprehensive HTML report
- Prioritized action plan with quick wins, 30/60/90-day timeline

---

## Orchestrator Rules

| Rule | Why |
|------|-----|
| Always fix tracking before analyzing metrics | Phase 1 hard gate — bad data = wrong conclusions |
| Parallelize phases 2 and 5 | Independent analyses — no shared state |
| Invoke skills, don't reimplement | Each skill has its own deep spec — delegate, don't inline |
| Approval gate before action plan | Client must see findings before committing to work |
| Document the data reliability window | If tracking was broken, the audit report must say when data became reliable |
| Skip local-seo-audit if not applicable | Conditional — don't run it for SaaS or pure national e-commerce |
| Store findings at `.claude/progress/client-audit-[client]-[date].md` | Each skill deposits findings here as it completes |

---

## Progress Tracking

Create `.claude/progress/client-audit-[client]-[date].md` at the start. Each phase appends its findings:

```
# Client Audit — [Client Name] — [Date]

## Phase 1: Foundation
- Tracking: [PASS/PARTIAL/BROKEN]
- GTM: [status]
- Notes: [any data reliability caveats]

## Phase 2: SEO
- seo-audit: [status]
- schema-markup: [status]
- local-seo-audit: [status / N/A]

## Phase 3: Performance
- CWV: [LCP/CLS/INP pass/fail]
- crux-api baseline: [field data]

## Phase 4: CRO
- cro-audit: [top funnel gap]
- landing-page-cro: [top 3 page scores]

## Phase 5: Content + Authority
- content-strategy: [gap count]
- review-management: [review score]
- link-analysis: [DR, linking domains]
- ai-visibility: [cited/not cited]

## Phase 6: Deliverable
- site-report: [path to HTML]
- action-plan: [approved/pending]
```

---

## Skills Invoked

| Phase | Skill | Conditional? |
|-------|-------|-------------|
| 1 | `server-side-tracking` | No — always |
| 1 | `google-tag-manager` | No — always |
| 2 | `seo-audit` | No — always |
| 2 | `schema-markup` | No — always |
| 2 | `local-seo-audit` | Yes — local businesses only |
| 3 | `web-performance` | No — always |
| 3 | `crux-api` | No — always |
| 4 | `cro-audit` | No — always |
| 4 | `landing-page-cro` | No — top 3 pages always |
| 5 | `content-strategy` | No — always |
| 5 | `review-management` | No — always |
| 5 | `link-analysis` | No — always |
| 5 | `ai-visibility` | No — always |
| 6 | `site-report` | No — always |

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Analyzing metrics before verifying tracking | Phase 1 is a hard gate — fix tracking first |
| Auditing without real field data | Always pull CrUX P75 — lab data alone is incomplete |
| Delivering findings without a roadmap | Clients need direction, not just a problem list |
| Running local-seo-audit on SaaS | Check business type in briefing — skip if not applicable |
| Treating all findings as equal priority | Sort by impact × effort — a tracking gap beats a missing alt tag |
| Skipping the approval gate | Always stop before action plan — always |
| Inlining skill logic | Invoke the skill — don't reimplement its spec here |

---

## Related Skills

- `server-side-tracking` — Phase 1 tracking verification
- `google-tag-manager` — Phase 1 GTM config
- `seo-audit` — Phase 2 full SEO pipeline
- `schema-markup` — Phase 2 structured data
- `local-seo-audit` — Phase 2 local layer (conditional)
- `web-performance` — Phase 3 CWV diagnosis
- `crux-api` — Phase 3 field data baseline
- `cro-audit` — Phase 4 conversion analysis
- `landing-page-cro` — Phase 4 top landing pages
- `content-strategy` — Phase 5 content gaps
- `review-management` — Phase 5 review health
- `link-analysis` — Phase 5 backlink landscape
- `ai-visibility` — Phase 5 LLM citation check
- `site-report` — Phase 6 HTML deliverable
- `nap-ninja` — Post-audit NAP consistency enforcement (if business.json exists)
- `monthly-pulse` — Ongoing monitoring after initial audit
- `cro-sprint` — Full CRO sprint after baseline established in Phase 4
