---
model: claude-sonnet-4-6
name: ab-testing
description: Use when designing, implementing, monitoring, or analyzing A/B tests. Also use when calculating sample sizes, setting up PostHog experiments, checking statistical significance, or documenting experiment results.
---

# A/B Testing

## Overview

Full experiment lifecycle: hypothesis → sample size → implementation → monitoring → analysis → documentation. Built around PostHog experiments for service businesses (lower traffic = larger MDE requirements).

---

## Phase 1: Hypothesis

Every test starts with a structured hypothesis. No hypothesis = no test.

**Template:**
> "Changing [X] from [current] to [proposed] will increase [metric] by [Z]% because [reasoning based on data]."

Must have:
- Specific element being changed
- Measurable primary metric
- Expected lift (minimum detectable effect)
- Data-backed reasoning (heatmaps, session recordings, user feedback)

| Quality | Example |
|---------|---------|
| ✗ Bad | "Making the page better will increase conversions." |
| ✓ Good | "Changing the CTA from 'Contact Us' to 'Get Your Free Estimate' will increase form submissions by 15% because 'Contact Us' is vague and doesn't communicate the value proposition." |

---

## Phase 2: Sample Size Calculation

**Formula:** `n = (Zα/2 + Zβ)² × 2p(1-p) / δ²`

Where: `p` = baseline conversion rate, `δ` = absolute minimum detectable effect (MDE)

Default parameters: 95% significance (Zα/2 = 1.96), 80% power (Zβ = 0.84)

**Practical lookup table:**

| Baseline Rate | MDE (relative) | MDE (absolute) | Sample Per Variant | At 100/day |
|---------------|----------------|----------------|--------------------|------------|
| 3% | 20% | 0.6pp | ~16,500 | ~165 days |
| 3% | 50% | 1.5pp | ~2,700 | ~27 days |
| 5% | 20% | 1.0pp | ~9,500 | ~95 days |
| 5% | 50% | 2.5pp | ~1,600 | ~16 days |
| 10% | 20% | 2.0pp | ~4,300 | ~43 days |
| 10% | 50% | 5.0pp | ~700 | ~7 days |

**Service business reality:** Most local/service businesses see 50–200 daily sessions. If the math gives >60 days, either increase MDE (test a bolder change) or use qualitative research instead.

---

## Phase 3: Implementation

### Create PostHog Feature Flag

Via PostHog UI: Experiments → Create Experiment → configure variants and targeting.

Via API:
```typescript
// Create flag via PostHog REST API
const response = await fetch('https://us.i.posthog.com/api/projects/{project_id}/feature_flags/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    key: 'cta-experiment',
    name: 'CTA Copy Test',
    filters: {
      multivariate: {
        variants: [
          { key: 'control', rollout_percentage: 50 },
          { key: 'test', rollout_percentage: 50 },
        ],
      },
    },
  }),
})
```

### Variant Code Pattern

```typescript
// Client-side variant check
import { usePostHog } from 'posthog-js/react'

function CTAButton() {
  const posthog = usePostHog()
  const variant = posthog.getFeatureFlag('cta-experiment')
  const ctaText = variant === 'test' ? 'Get Your Free Estimate' : 'Contact Us'

  return <button>{ctaText}</button>
}
```

```typescript
// Server-side variant check (Next.js server component)
import { PostHog } from 'posthog-node'

const client = new PostHog(process.env.POSTHOG_KEY!)
const variant = await client.getFeatureFlag('cta-experiment', userId)
await client.shutdown()
```

### Track Goal Event

```typescript
// Fire on conversion — include experiment context
posthog.capture('form_submitted', {
  $feature_flag: 'cta-experiment',
  $feature_flag_response: variant,
  experiment: 'cta-experiment',
  variant,
})
```

PostHog automatically links flag exposures to downstream events for funnel analysis.

---

## Phase 4: Monitoring

### SRM Check (Sample Ratio Mismatch)

Run at 25%, 50%, 75% of target sample. If variant split deviates >2% from expected 50/50, stop immediately — something is broken.

```
Expected: 500 control / 500 test
Observed: 500 control / 430 test  →  SRM detected (14% deviation)
```

SRM causes: feature flag firing inconsistently, bots skewing one variant, caching serving stale content, JS errors preventing flag load.

Fix SRM before resuming. Results from an SRM-contaminated test are invalid.

### Interim Analysis Schedule

| Checkpoint | Action |
|------------|--------|
| 25% of target | Check SRM only. Do not look at conversion rates. |
| 50% of target | Check SRM. Review for obvious disasters only. |
| 75% of target | Check SRM. Still don't act on p-value. |
| 100% of target | Full analysis. Make decision. |

**Early stopping rule:** Only stop early if p < 0.005 (99.5% significance). The 95% threshold is calibrated for a single look at the end — peeking daily inflates false positive rate to ~30%.

---

## Phase 5: Analysis

### Statistical Significance (z-test for proportions)

```
z = (p1 - p2) / sqrt(p̄(1-p̄)(1/n1 + 1/n2))

where p̄ = (x1 + x2) / (n1 + n2)
```

PostHog's Experiment Results tab calculates this automatically. Use the built-in confidence interval display.

### Decision Framework

| Stat Sig | Practical Sig | Decision |
|----------|--------------|----------|
| ✓ (p < 0.05) | ✓ (≥ 1pp lift) | SHIP |
| ✓ (p < 0.05) | ✗ (< 0.5pp) | ITERATE (test a bolder change) |
| ✗ (p ≥ 0.05) | — | DISCARD (insufficient evidence) |

**Practical significance matters as much as statistical.** A 0.3pp lift that reaches p = 0.03 is real — but shipping it means permanent technical debt for a change that won't move revenue. Test something bolder instead.

### Segment Analysis

After primary decision, check if effect differs across:
- Device type (mobile vs desktop) — service businesses often see 70%+ mobile
- Traffic source (organic vs paid vs direct)
- New vs returning visitors
- Time on site quartiles

Segment wins can reveal a bigger opportunity: "test won for mobile but not desktop" → ship mobile-only or design a mobile-specific variant.

---

## Phase 6: Documentation

Archive every experiment. A failed test that isn't documented just gets re-run by the next person.

**Experiment archive template:**

```markdown
# A/B Test: [Name] — [Date]

## Hypothesis
Changing [element] from [control] to [variant] will increase [metric] by [MDE]%
because [reasoning based on data].

## Design
| Parameter | Value |
|-----------|-------|
| Metric | [primary metric] |
| Baseline rate | [current rate] |
| MDE | [minimum detectable effect] |
| Significance level | 95% |
| Statistical power | 80% |
| Sample needed | [n] per variant |
| Est. duration | [days] at [daily traffic] |
| PostHog flag | [flag-name] |

## Implementation
- Flag: `[posthog-flag-name]`
- Variants: control (current), test ([change description])
- Goal event: `[event_name]`
- Segment: [all users / mobile / new visitors / etc.]

## Monitoring Log
| Date | Control n | Test n | SRM Check | Notes |
|------|-----------|--------|-----------|-------|

## Results
| Variant | Sessions | Conversions | Rate | vs Control | CI (95%) |
|---------|----------|-------------|------|------------|----------|
| Control | | | | — | |
| Test | | | | | |

Statistical significance: [p-value] [✓/✗]
Practical significance: [pp lift] [✓/✗]

## Decision: [SHIP / ITERATE / DISCARD]
**Reasoning:** [why this decision]
**Next step:** [what to test next or how to ship]
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|-------------|---------------|------------|
| Peeking at results daily | Inflates false positive rate to ~30% | Set check schedule, honor sample size |
| Stopping early at p < 0.05 | Same peeking problem | Only early-stop at 99.5%+ |
| Changing primary metric mid-test | Invalidates statistical framework | Lock primary metric before start |
| Testing 5 variants at once | Need 4x sample, interaction effects | Max 2 variants (control + test) |
| Running with insufficient traffic | Tests take months, results inconclusive | Use larger MDE or qualitative research |
| Testing cosmetic changes | Won't move the needle | Test structural changes — CTA, headline, social proof, pricing, form length |
| No documentation | Same failed ideas get retested | Archive every experiment, win or loss |

---

## What to Test (Service Businesses)

High-impact test targets, ranked by expected lift potential:

1. **CTA copy** — "Contact Us" vs "Get Your Free Estimate" vs "Book Online Now"
2. **Headline** — Problem-focused vs solution-focused vs social proof-focused
3. **Social proof placement** — Above fold vs below CTA vs inline with form
4. **Form length** — 5 fields vs 3 fields vs 1 field (phone/email only)
5. **Pricing display** — Show pricing vs "Request Quote" vs price range
6. **Hero image** — Team photo vs job-site photo vs before/after
7. **Trust signals** — Badge placement, review count prominence, license numbers

---

## Cross-References

| Skill | Use |
|-------|-----|
| `posthog` | PostHog experiments API — flag creation, event capture, SDK setup |
| `cro-audit` | Identifies what to test based on analytics and heatmap data |
| `landing-page-cro` | Landing page changes ready to A/B test |
| `microsoft-clarity` | Session recordings to validate hypotheses pre-test |
| `cro-sprint` | Orchestrator that runs the full CRO cycle end-to-end |
