---
model: claude-sonnet-4-6
name: review-management
description: Use when building a review generation strategy, monitoring reviews, creating response templates, or implementing review schema. Also use when auditing review health, setting up Google review links, or managing reputation.
---

# Review Management

## Overview

Reviews are the single highest-trust conversion signal for mid-to-high ticket service businesses. A prospect choosing between two HVAC companies, attorneys, or remodelers will almost always call the one with more recent, higher-rated, responded-to reviews. This skill covers the full lifecycle: audit, generation, response, schema, monitoring, and platform rules.

```
Section 1: Review Audit
Section 2: Generation Strategy
Section 3: Response Templates
Section 4: Schema Implementation
Section 5: Monitoring
Section 6: Platform-Specific Rules
──► Actionable outputs with health thresholds
```

---

## Section 1: Review Audit

Start with an honest picture of current review health across all relevant platforms.

### Review Landscape

| Platform | Reviews | Avg Rating | Last Review | Response Rate |
|----------|---------|-----------|-------------|---------------|
| Google | | | | |
| Yelp | | | | |
| Facebook | | | | |
| [Industry] | | | | |

Fill this table before doing anything else. Data sources:
- Google Business Profile dashboard (most accurate for Google)
- Platform-native dashboards (Yelp for Business, Facebook Business Suite)
- Manual spot-check for industry-specific platforms (Houzz, Avvo, Healthgrades, Angi, etc.)

### Health Indicators

| Indicator | Threshold | Status |
|-----------|-----------|--------|
| Google review count | < 20 = critical gap | ○ |
| Average rating (any platform) | < 4.5 = needs attention | ○ |
| Most recent review | > 30 days = velocity dying | ○ |
| Response rate (all platforms) | < 80% = missed engagement | ○ |
| Industry platform presence | 0 platforms = missing audience | ○ |

**◆ Critical:** < 20 Google reviews — competitors with 50+ will dominate the local pack and first impression.
**◆ Critical:** Rating < 4.0 — most prospects filter results below 4.0 stars.
**⚠ Warning:** No reviews in 30+ days — signals to both users and Google that the business is inactive or declining.

### Competitor Comparison

Pull top 3 local competitors' Google profiles. Compare:

| Competitor | Google Reviews | Avg Rating | Last Review |
|------------|---------------|------------|-------------|
| [Business Name] | | | |
| [Competitor 1] | | | |
| [Competitor 2] | | | |
| [Competitor 3] | | | |

This is the competitive gap. If the business has 30 reviews and a competitor has 180 at 4.9 — that's the target.

---

## Section 2: Generation Strategy

Getting reviews is a system, not a one-time ask. The goal is a steady, consistent flow that platforms recognize as organic.

### Timing

**24-48 hours after service completion.** This is the window.

- Too soon (same day): Client hasn't experienced the full result yet
- Too late (1 week+): Forgotten. Moved on. Goodwill evaporated.

For recurring services (cleaning, HVAC maintenance plans, lawn care): ask after the 3rd or 4th service, not the first. Let the relationship establish.

### Ask Flows

**1. Post-Service Email/SMS**

Simple, direct, frictionless:

```
Subject: Quick favor, [Name]?

Hi [Name],

Thanks for choosing [Business] — glad we could help with [specific service].

If we exceeded your expectations, we'd really appreciate 60 seconds of your time:
[Google Review Link]

— [Team/Owner Name]
```

Rules for this message:
- Personalize with the specific service (not generic "your recent service")
- One link. Google only. Don't split attention across platforms.
- No star rating request ("Please leave us 5 stars") — platform violation.
- Short. People don't read long emails.

**2. NPS-Gated Flow (Recommended)**

Send NPS survey first. Route based on score.

```
Score 9-10 → "Glad to hear it! Would you mind sharing that on Google?"
             [Google Review Link]

Score 1-8  → "We're sorry to hear that. What could we have done better?"
             [Internal feedback form]
```

This protects average rating by preventing unhappy customers from hitting public review platforms. It also surfaces service recovery opportunities before they become 1-star reviews.

**3. QR Code (Physical)**

For businesses with a location (dental, salon, auto repair, vet):
- Card at reception / checkout counter
- Receipt footer
- Window decal (avoid for Yelp — see Section 6)

QR code destination: Google review link shortcut.

**4. Google Review Link**

Every ask needs a direct link. Format:

```
https://search.google.com/local/writereview?placeid=[PLACE_ID]
```

Find Place ID via [Google's Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id) or the GBP dashboard.

Test the link before deploying. Confirm it opens the review compose dialog without requiring multiple clicks.

### Volume Targets

| Business Type | Monthly Target | Rationale |
|--------------|---------------|-----------|
| High-ticket (legal, home remodel, financial) | 2-4 reviews | Fewer clients — each review carries more weight |
| Mid-ticket (HVAC, dental, auto, med spa) | 5-10 reviews | Regular client flow — build steady momentum |
| Recurring (salon, cleaning, pest control) | 8-15 reviews | High volume — leverage the relationship |

Hitting these targets consistently over 6 months compounds into a dominant review presence.

### What Not to Do

- Never offer discounts, gifts, or payment in exchange for reviews — platform violation on all major platforms
- Never ask for a specific star rating ("Please leave us 5 stars") — Google's guidelines explicitly prohibit this
- Never create fake reviews or have employees review the business — Google's spam detection is sophisticated
- Never review-gate (only send review requests to pre-screened happy customers via off-platform survey) — technically a Google policy violation when done to manipulate average ratings; the NPS flow above is compliant because it sends genuine feedback to both paths

---

## Section 3: Response Templates

**Every review gets a response. Every. One.**

Response rate is a ranking signal for Google local pack. It also signals to every future prospect reading reviews that the business is attentive and professional.

### Positive Review Response (4-5 stars)

**Rules:**
- Thank by name
- Reference the specific service they mentioned — shows it's not a template
- Keep it 2-3 sentences
- No generic phrases ("Thanks for the kind words!" is the fast food of review responses)
- Include a soft CTA or relationship reinforcer when natural

**Template:**

```
Thanks, [Name]! Glad we could get your [specific service] handled right.
We appreciate you trusting us — looking forward to helping you again whenever you need us.
```

**Variation for referral-building:**

```
[Name], thank you so much — this means a lot to the team.
If you ever know someone who needs [service], we'd love the chance to help them just as well.
```

### Negative Review Response (1-3 stars)

**Rules:**
- Acknowledge the experience — don't dismiss or minimize
- Apologize without excuses or deflection
- Take it offline immediately — provide phone or email
- Never argue publicly — even if the review is factually wrong
- Keep it brief — long defensive responses look worse

**Template:**

```
[Name], we're sorry your experience didn't meet our standards — that's not how we operate.
Please reach out to [Owner/Manager Name] directly at [phone] so we can make this right.
```

**If the details are factually wrong (but not fake):**

```
We're sorry to hear this, [Name]. Our records show [brief factual context], but we'd still like
to understand what happened. Please call us at [phone] — we take every experience seriously.
```

### Fake or Fraudulent Review Response

**First:** Flag the review in Google Business Profile (Settings → Reviews → Flag as inappropriate). Document your evidence (no service record, competitor IP, etc.) before responding.

**Response:**

```
We have no record of a visit or service matching this account.
If there's been a mix-up, please contact us at [phone] so we can look into it.
```

Do NOT:
- Publicly accuse them of being fake (even if obvious)
- Tag competitors or speculate about motives
- Engage in back-and-forth responses

### Yelp Response Note

Yelp responses follow the same principles, but Yelp's audience skews toward consumer reviews of the response itself. Keep it professional. Yelp users are particularly attuned to defensive or dismissive business responses — they will downvote businesses that argue publicly.

---

## Section 4: Schema Implementation

Review schema helps search engines surface star ratings in organic results and reinforces trust signals. Two schema types matter: `AggregateRating` (summary) and `Review` (individual reviews).

### CRITICAL: No Hardcoded Values

**NEVER hardcode review counts or average ratings in schema.** They go stale the moment you add a new review. A schema showing "127 reviews / 4.8 stars" that was accurate 6 months ago is now misleading and can confuse schema validators.

Use live data from:
- Google Places API (via `google-business-profile-api` skill)
- CMS review integration that pulls from the source of truth
- A scheduled job that updates the values on a defined interval (weekly minimum)

### AggregateRating Schema

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Business Name]",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[LIVE_VALUE]",
    "reviewCount": "[LIVE_COUNT]",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

Replace `[LIVE_VALUE]` and `[LIVE_COUNT]` with dynamically fetched values.

### Individual Review Schema (Optional, High-Value)

Including individual `Review` objects boosts rich result eligibility. Only include reviews you have explicit permission to republish (e.g., reviews collected on your own platform, or embedded Google reviews via the Places API).

```json
{
  "@type": "Review",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5"
  },
  "author": {
    "@type": "Person",
    "name": "[Reviewer Name]"
  },
  "reviewBody": "[Review text]",
  "datePublished": "YYYY-MM-DD"
}
```

Do NOT embed Google, Yelp, or Facebook reviews in schema without verifying platform terms of service.

### Validation

1. Validate at `https://validator.schema.org`
2. Check rich results eligibility at `https://search.google.com/test/rich-results`
3. Confirm `ratingValue` and `reviewCount` match the live data source

Reference `schema-markup` for full LocalBusiness schema implementation context.
Reference `google-business-profile-api` for fetching live review data.

---

## Section 5: Monitoring

Reviews require active monitoring, not set-and-forget. A 1-star review sitting unresponded for a week is a conversion killer.

### Automated Alerts

**Minimum setup:**
- GBP notification settings → enable all review notifications (Settings → Notifications in Google Business Profile)
- Google Alerts for brand name: `"[Business Name]"` → receive email when the business is mentioned anywhere Google indexes
- Alert threshold: any new review below 3 stars → immediate response required

**Recommended additions:**
- Yelp for Business notification settings → enable new review alerts
- Facebook Business Suite → enable review notifications
- Industry platform alerts if applicable

### Weekly Pulse Check

Run this every Monday:

| Week | New Reviews | Avg Rating | Responded | Notable |
|------|------------|-----------|-----------|---------|
| | | | | |

Track the trend, not just the snapshot. Declining velocity (fewer new reviews per week than prior weeks) signals the ask flow has broken down somewhere.

### Alert Thresholds

| Signal | Action |
|--------|--------|
| Any review < 3 stars | Respond within 4 hours |
| Response rate drops below 80% | Audit unresponded reviews, catch up |
| No new reviews in 30 days | Audit and restart ask flow |
| Average rating drops below 4.5 | Review intake — check for operational pattern |
| Competitor review velocity spikes | Investigate their strategy |

### Monthly Review Report (Client Deliverable)

| Metric | This Month | Last Month | Delta |
|--------|-----------|-----------|-------|
| New reviews (Google) | | | |
| New reviews (all platforms) | | | |
| Current average rating | | | |
| Responses sent | | | |
| Response rate | | | |
| Negative reviews received | | | |
| Negative reviews resolved | | | |

Cross-reference `monthly-pulse` — review health is a standard section in the monthly client deliverable.

---

## Section 6: Platform-Specific Rules

Each platform has different norms, policies, and enforcement severity. Violating these can result in review removal, listing suspension, or filter removal (Yelp especially).

### Platform Rules Reference

| Platform | Can Solicit? | Key Rules | Hard Violations |
|----------|-------------|-----------|----------------|
| Google | Yes | No incentives, no star rating requests, no review-gating to manipulate average | Paying for reviews, coordinated fake reviews — can result in listing suspension |
| Yelp | NO | Never solicit reviews. Yelp's filter actively removes reviews they detect as solicited. The "People Love Us on Yelp" badge is NOT permission to ask. | Emailing asking for Yelp reviews, "Review us on Yelp" signage, QR codes pointing to Yelp — all detected and filtered |
| Facebook | Yes | Relatively lenient. Can ask directly. | Fake check-ins, coordinated review campaigns |
| BBB | Yes (complaints) | Accreditation improves trust signal. BBB complaints require formal response. | Ignoring BBB complaints — visible to prospects on the profile |
| Houzz | Yes | Can ask clients to leave a review. Common for home services. | Fake project photos attributed to the business |
| Avvo | Yes | Legal-specific — can email clients post-matter. | Fake attorney endorsements |
| Healthgrades | Yes | Medical — can ask patients (follow HIPAA in responses). | Revealing PHI in public responses |
| Angi (formerly Angie's List) | Yes | Verified service reviews. | Inflating project costs in submissions |

### Yelp — The Exception

Yelp deserves special attention because violations are irreversible and expensive.

**Yelp's filter is aggressive.** Reviews from accounts that:
- Registered recently
- Have few prior reviews
- Came from the same IP as the business
- Were written after a direct solicitation pattern

...will be removed by Yelp's recommendation software. They do NOT appear on the main profile — they're filed under "Not Recommended."

**The right Yelp strategy:**
- Provide excellent service
- Make it easy for satisfied customers to find you on Yelp organically (add Yelp to "Find Us Online" on your website)
- Never directly ask for a Yelp review
- Respond to all existing Yelp reviews promptly and professionally
- Claim and complete the Yelp Business page

**What NOT to do:**
- "Review us on Yelp" printed materials — violation
- QR code pointing to Yelp — treated as solicitation
- Email campaign asking for Yelp reviews — violation
- Offering incentives for Yelp reviews — violation

---

## Output Format

After completing a review audit, deliver:

```
# Review Management Audit — [Business] — [Date]

## Health Summary
Google reviews: [count] / [avg rating] / [last review date] / [response rate]
Status: [CRITICAL / NEEDS ATTENTION / HEALTHY]

## Platform Status
[platform table]

## Competitor Gap
[competitor table]

## Active Ask Flow
[YES / NO / PARTIAL — describe what exists]

## Schema Status
[implemented / not implemented / stale data]

## Monitoring Setup
[GBP alerts: ON/OFF] [Google Alerts: ON/OFF] [Yelp alerts: ON/OFF]

## Recommendations
◆ CRITICAL   [item]
⚠ WARNING    [item]
◇ SUGGESTION [item]
```

---

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| Sending review requests to all customers | NPS-gate: only send to score 9-10 |
| Generic response: "Thanks for the kind words!" | Reference the specific service by name |
| Arguing with a negative review publicly | Acknowledge, apologize, take it offline |
| Asking for Yelp reviews via email or signage | Never solicit Yelp reviews — period |
| Hardcoding review counts in schema | Pull from live API data |
| Not responding to 5-star reviews | Every review gets a response |
| Review link that's 3 clicks deep | Direct placeid link — opens compose immediately |
| Batch asking after months of silence | Steady weekly cadence looks more organic |
| Ignoring fake reviews | Flag + respond briefly + document evidence |

---

## Related Skills

- `schema-markup` — Review + AggregateRating JSON-LD implementation
- `google-business-profile-api` — Fetching live review data, reply API
- `local-seo-audit` — Reviews are a critical local ranking factor
- `local-growth` — Review management is Phase 2 of local growth
- `site-report` — Review health section in client deliverable
- `monthly-pulse` — Review pulse in monthly check
