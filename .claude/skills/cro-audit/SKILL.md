---
model: claude-sonnet-4-6
name: cro-audit
description: Use when running a conversion rate optimization audit, analyzing funnels, identifying conversion blockers, or creating a prioritized CRO action plan. Also use when analyzing behavior data from Clarity/PostHog or measuring conversion baselines.
---

# CRO Audit

## Overview

Diagnostic-first conversion rate optimization — 8-phase pipeline from baseline measurement to prioritized execution. Pull the data, watch real sessions, map the funnel, audit trust signals, and surface the highest-impact fixes. Never guess what to change — every recommendation is backed by data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 1: Conversion Baseline

Pull from GA4 via `ga4-api`. Capture before touching anything else — this is the ground truth every improvement gets measured against.

### Metrics to Pull

| Metric | GA4 Location |
|--------|-------------|
| Overall site conversion rate | Conversions → Overview |
| Conversion rate by page | Engagement → Pages and Screens |
| Conversion rate by traffic source | Acquisition → Traffic Acquisition |
| Conversion rate by device | Demographics → Overview → Device |
| Goal completions by type | Conversions → Events |
| Avg sessions before first conversion | Monetization → User Journey |

### Industry Benchmarks (Service Businesses)

Compare captured rates against vertical averages:

| Vertical | Benchmark Range | Notes |
|----------|----------------|-------|
| HVAC | 3–5% | Seasonal spikes in summer/winter |
| Legal | 2–4% | High-intent queries convert higher |
| Dental | 4–6% | New patient forms drive conversions |
| Home Services | 3–5% | Includes plumbing, electrical, roofing |
| Medical / Clinics | 3–5% | HIPAA friction suppresses mobile |
| Pest Control | 4–6% | Emergency intent = fast decisions |
| Landscaping | 2–4% | Seasonal, quote-heavy funnel |

**Gap analysis:** Calculate `benchmark midpoint − actual rate` for each page. Pages with the largest negative gap are the primary audit targets.

Verify data quality via `server-side-tracking` before acting on GA4 numbers — misconfigured tracking produces misleading baselines.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 2: Behavior Analysis

Reference `microsoft-clarity` for heatmaps and session recordings on the target pages identified in Phase 1.

### Session Replay Checklist

Review 10–20 sessions minimum per page. Pattern recognition, not anecdotes.

**Rage Clicks**
- [ ] Users rage-clicking non-interactive elements (phone number text, image, icon)
- [ ] Users rage-clicking CTA that appears broken or sluggish
- [ ] Users rage-clicking form fields that won't focus on mobile

**Dead Clicks**
- [ ] Clicking decorative images expecting navigation
- [ ] Clicking section headers expecting expand/collapse
- [ ] Clicking logos or certifications expecting more info

**Scroll Abandonment**
- [ ] What % of users reach the CTA / form?
- [ ] Where does the scroll heatmap show the sharp drop-off?
- [ ] Is the CTA above the fold on mobile for the average viewport?

**Confusing UI Patterns**
- [ ] Users hesitating on form fields (hovering, clicking away, returning)
- [ ] Back-button behavior immediately after page load (intent mismatch)
- [ ] Users opening and abandoning the phone dialer on mobile
- [ ] Excessive scrolling up and down (user hunting for information)

### Heatmap Analysis

| Heatmap Type | What to Look For |
|-------------|-----------------|
| Click | CTA click rate, non-CTA clicks, footer/nav clicks indicating navigation confusion |
| Scroll | 50th and 75th percentile scroll depth vs CTA placement |
| Attention | Which content blocks get most dwell time — is it the right content? |

### Behavior Findings Format

Document each finding before proceeding to Phase 3:

```
Finding: [description]
Type: rage click / dead click / scroll abandon / UI confusion
Evidence: Clarity session #[id] at [timestamp] — seen in [N]/[total] sessions
Impact: ◆ Critical / ⚠ Warning / ◇ Suggestion
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 3: Funnel Analysis

Map the full conversion funnel using PostHog funnels + GA4 path analysis.

### Standard Service Business Funnel

```
Landing Page → Engagement (service page / about) → Intent (contact / pricing page) → Contact (form / phone) → Confirmation (thank you page)
```

### PostHog Funnel Setup

In PostHog: Insights → Funnels → New Funnel

```
Step 1: $pageview (URL matches /landing or homepage)
Step 2: $pageview (URL matches /services or /about)
Step 3: $pageview (URL matches /contact or /pricing)
Step 4: form_submitted OR phone_click event
Step 5: $pageview (URL matches /thank-you)
```

Set conversion window to 7 days for service businesses (multi-session consideration is common).

Segment by:
- Device type (mobile often shows 2–3x higher drop-off than desktop at the form step)
- Traffic source (paid traffic drop-off patterns differ from organic)
- New vs returning visitors

### Funnel Drop-off Interpretation

| Drop-off Stage | Common Root Causes |
|---------------|-------------------|
| Landing → Engagement | Headline/message mismatch with traffic source, slow page load |
| Engagement → Intent | Not enough social proof, no clear next step, unclear pricing |
| Intent → Contact | Form too long, no trust signals near form, no phone number visible |
| Contact → Confirmation | Form errors, technical friction, field validation issues |

### Form Abandonment

If form analytics are available (PostHog form events or Clarity session replays):
- Which field causes most abandonment?
- Is the phone field causing drop-off? (Users wary of calls)
- Is the required field count above 4? (Each additional field reduces completion ~10%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 4: Trust & Persuasion Audit

Manually audit the site for trust signals and persuasion elements. Work through each section below.

### Social Proof Inventory

| Element | Present | Location | Quality |
|---------|---------|----------|---------|
| Google review count + rating | ✓/✗ | Above fold / below fold / footer | Star rating visible? |
| Written testimonials | ✓/✗ | Which pages? | With name + photo? |
| Video testimonials | ✓/✗ | Which pages? | Real customer or stock? |
| Case studies / project galleries | ✓/✗ | Service pages? | Before/after? |
| Logos (partners, brands served) | ✓/✗ | Where? | Recognizable brands? |
| Certifications / licenses | ✓/✗ | Where? | With badge or text only? |
| Awards / accreditations | ✓/✗ | Where? | BBB, Angi, HomeAdvisor? |

### CTA Quality Audit

Score each primary CTA on the target page:

| Dimension | Check |
|-----------|-------|
| Clarity | Does the CTA say exactly what happens when clicked? |
| Value communication | Does it communicate benefit, not just action? ("Get Free Estimate" vs "Submit") |
| Contrast | Does the CTA button visually stand out from the background? |
| Placement | Above the fold on mobile? Near the point of decision? |
| Repetition | Appears at top, middle, and bottom of long pages? |
| Urgency | Any time-limited or scarcity elements? (authentic only) |

### Objection Handling

Identify the top 3 objections a prospect has before contacting this business. Check if each is addressed on the page:

Common objections by vertical:
- "How much does it cost?" → Pricing page, price range, or "free estimate" messaging
- "Are they licensed and insured?" → License numbers, insurance badge, visible certifications
- "Will they show up?" → Photos of real team, local presence signals, reviews mentioning reliability
- "Is this a scam / fly-by-night?" → Years in business, physical address, Google Business profile link
- "I'm not ready to commit" → Soft CTA options (free quote, no-obligation consultation)

### Risk Reversal Signals

| Signal | Present | Notes |
|--------|---------|-------|
| Free estimate / consultation | ✓/✗ | Prominently displayed? |
| Satisfaction guarantee | ✓/✗ | Specific terms or vague? |
| Licensed & insured mention | ✓/✗ | Near CTA or form? |
| No-obligation language | ✓/✗ | Reduces commitment friction |
| Response time promise | ✓/✗ | "We call back within 2 hours" |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 5: Technical Friction

### Page Speed Impact

Reference `web-performance` for full audit. Key conversion thresholds:

| Load Time | Conversion Impact |
|-----------|-----------------|
| < 2s | Baseline — minimal friction |
| 2–4s | ~10–15% conversion loss |
| 4–6s | ~25–30% conversion loss |
| > 6s | Up to 50% bounce before load |

Pull Core Web Vitals for target pages:
- LCP (Largest Contentful Paint): target < 2.5s
- CLS (Cumulative Layout Shift): target < 0.1 (layout shifts break trust)
- INP (Interaction to Next Paint): target < 200ms

Mobile page speed is the priority — service businesses commonly see 60–80% mobile traffic.

### Mobile UX Audit

Manually test on a real mobile device (not just browser DevTools):

- [ ] CTA button minimum 44×44px tap target
- [ ] Phone number is `tel:` linked and tappable
- [ ] Form fields auto-zoom on focus (font-size ≥ 16px prevents iOS zoom)
- [ ] No horizontal scroll
- [ ] Images load at correct resolution (no oversized desktop images on mobile)
- [ ] Sticky header doesn't obscure content
- [ ] Modal / popup usable on mobile (not covering entire screen)

### Form UX Audit

| Dimension | Check |
|-----------|-------|
| Field count | How many required fields? Target ≤ 4 for first contact |
| Field labels | Always visible (not placeholder-only labels) |
| Input types | Phone field uses `type="tel"`, email uses `type="email"` |
| Error messages | Inline, specific, and appear immediately on blur |
| Autocomplete | `autocomplete` attributes set correctly |
| Success state | Clear confirmation after submission (not just blank form) |
| Multi-step option | Forms > 4 fields should consider multi-step with progress indicator |

### Third-Party Script Impact

Check for scripts that block rendering or fire on load:

```
▸ Open DevTools → Network → filter by JS → sort by Size
```

Common culprits:
- Chat widgets loading synchronously
- Retargeting pixels blocking LCP
- Tag Manager containers firing excessive scripts
- Video embeds loading full player on page load

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 6: Prioritized Recommendations

**APPROVAL GATE — present findings and get confirmation before proceeding to execution.**

### Impact vs. Effort Matrix

Assign each finding to a quadrant:

```
High Impact │  Quick Wins  │  High Impact Projects
            │  (ship now)  │  (plan a sprint)
────────────┼──────────────┼──────────────────────
Low Impact  │  Nice to Have│  Avoid
            │  (if easy)   │  (not worth the effort)
            └──────────────┴──────────────────────
               Low Effort      High Effort
```

### Priority Tiers

**◆ Quick Wins** — High impact, low effort. Ship immediately.
- CTA copy change
- Phone number placement
- Trust badge addition
- Form field reduction
- Mobile tap target fix

**◆ High Impact** — High impact, higher effort. Plan and prioritize.
- Page restructure to move social proof above fold
- Form redesign (multi-step, field reduction)
- New landing page variant
- Page speed optimization (image compression, script deferral)

**◇ Long-Term** — Medium impact or requires significant dev work.
- Full testimonial section redesign
- Pricing page creation
- Live chat integration
- CRM integration for lead tracking

### Recommendations Table Format

| # | Recommendation | Severity | Impact | Effort | Priority Tier |
|---|---------------|----------|--------|--------|--------------|
| 1 | ... | ◆/◇/⚠ | High/Med/Low | High/Med/Low | Quick Win / High Impact / Long-Term |

Present this table. Get approval. Then proceed to Phase 7.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 7: Execution (Post-Approval)

Execute in priority order. Each change gets its own test — never bundle multiple changes.

### Testable Changes → A/B Testing

For any change where baseline traffic supports a test (100+ sessions/day on the target page), route through `ab-testing`:
- Hypothesis documentation
- Sample size calculation
- PostHog experiment setup
- Variant implementation

### Page-Level Implementation → Landing Page CRO

For landing page restructure, CTA redesign, social proof addition, or form optimization, route through `landing-page-cro` for implementation guidance.

### Execution Tracking

| Recommendation | Status | Owner | Start Date | Test ID |
|---------------|--------|-------|-----------|---------|
| ... | ○ Pending / ● In Progress / ✓ Complete | | | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 8: Measurement

Every change must have a measurement plan before it ships.

### A/B Test Design (per change)

```
Change: [description]
Hypothesis: "Changing [X] from [control] to [variant] will increase [metric] by [Z]% because [data-backed reasoning]."
Primary metric: [form_submitted / phone_click / page_conversion_rate]
Baseline rate: [from Phase 1]
MDE: [minimum % lift worth shipping]
Sample needed: [calculated per ab-testing skill]
Duration estimate: [days at current traffic]
PostHog flag: [flag-name]
Statistical requirements: 95% confidence, 80% power
```

### Baseline → Post-Change Comparison

For non-A/B changes (speed improvements, mobile fixes, technical friction):

```
Before: [date] — [metric] = [value]
After:  [date] — [metric] = [value]
Change: [+/- pp] ([+/- %] relative)
Confounders: [seasonality, traffic mix changes, algorithm updates]
```

Compare same day-of-week and time period to minimize seasonal confounders. Use 2-week windows minimum.

### Statistical Significance Requirements

- Minimum 95% confidence (p < 0.05) for shipping
- Minimum 80% statistical power
- Practical significance: lift must be ≥ 0.5 percentage points to justify permanent change
- No early stopping unless p < 0.005 (peeking inflates false positive rate)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Output Template

Use this template to deliver the audit report:

```markdown
## CRO Audit Report — [Site Name]
**Date:** [YYYY-MM-DD]
**Auditor:** [name]
**Pages Audited:** [list]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Conversion Baseline

| Page | Sessions | Conversions | Rate | Industry Avg | Gap |
|------|----------|-------------|------|-------------|-----|
| /    | ...      | ...         | ...% | ...%        | ... |
| /contact | ...  | ...         | ...% | ...%        | ... |
| /services | ... | ...         | ...% | ...%        | ... |

Overall site conversion: [X]%
Industry benchmark: [X–Y]%
Gap to benchmark midpoint: [+/- pp]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Behavior Insights

| Finding | Type | Impact | Evidence |
|---------|------|--------|----------|
| ... | rage click / dead click / scroll abandon | ◆/◇/⚠ | Clarity session #... |
| ... | | | |

Sessions reviewed: [N]
Key pattern: [one-sentence summary of dominant behavior]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Funnel Drop-off

| Step | Users | Drop-off % | Top Friction |
|------|-------|-----------|--------------|
| Landing | ... | — | — |
| Engagement | ... | ...% | ... |
| Intent | ... | ...% | ... |
| Contact | ... | ...% | ... |
| Confirmation | ... | ...% | ... |

Highest drop-off: [step] at [X]%
Root cause hypothesis: [one sentence]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Trust Signals Checklist

- [ ] Reviews visible above fold
- [ ] Star rating in hero or header
- [ ] Testimonials with photos and names
- [ ] Certifications / licenses displayed
- [ ] Insurance / guarantee mentioned
- [ ] Before/after examples (service businesses)
- [ ] Response time promise near CTA
- [ ] Local presence signals (address, service area)

Score: [N]/8 trust signals present

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Technical Friction

Mobile LCP: [Xs] [✓/✗ target < 2.5s]
Desktop LCP: [Xs] [✓/✗]
CLS: [X] [✓/✗ target < 0.1]
Form fields (required): [N] [✓/✗ target ≤ 4]
Phone linked as tel: [✓/✗]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Recommendations

| # | Recommendation | Severity | Impact | Effort | Priority |
|---|---------------|----------|--------|--------|----------|
| 1 | ... | ◆ | High | Low | Quick Win |
| 2 | ... | ◆ | High | Med | High Impact |
| 3 | ... | ⚠ | Med | Low | Quick Win |
| 4 | ... | ◇ | Med | High | Long-Term |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Next Steps

▸ Approve recommendations above to proceed to execution.
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Auditing without verified baseline data | Run `server-side-tracking` check first — bad tracking = bad data |
| Testing cosmetic changes (button color) | Test structural changes — CTA copy, form length, social proof placement, pricing display |
| Bundling multiple changes into one test | One change per test — you can't isolate the winner otherwise |
| Ignoring mobile behavior | Review Clarity sessions filtered to mobile separately — patterns differ significantly |
| Skipping session recordings | Heatmaps show where, recordings show why |
| Acting on < 2 weeks of data | Seasonality and day-of-week patterns distort short windows |
| Running tests with < 100 daily sessions | Extend MDE target or use qualitative research instead |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Cross-References

| Skill | Role in This Workflow |
|-------|----------------------|
| `microsoft-clarity` | Session recordings, heatmaps, rage click + scroll data (Phase 2) |
| `ga4-api` | Conversion data, funnel drop-off, device/source segmentation (Phase 1, 3) |
| `posthog` | Funnel setup, experiment configuration, goal event tracking (Phase 3, 8) |
| `web-performance` | Page speed audit, Core Web Vitals, script impact (Phase 5) |
| `ab-testing` | Experiment design, sample size, statistical analysis (Phase 7, 8) |
| `landing-page-cro` | Page-level implementation of audit recommendations (Phase 7) |
| `server-side-tracking` | Data quality verification before trusting baseline numbers (Phase 1) |
