---
model: claude-sonnet-4-6
name: cro-sprint
description: Use when running a CRO iteration cycle — diagnose top conversion bottleneck, design experiment, build variant, run A/B test, analyze results, ship or iterate. Also use when the user says "CRO sprint" or "conversion experiment".
---

# CRO Sprint

## Overview

A 4-week orchestrator for a single, disciplined CRO experiment — from bottleneck diagnosis to shipping or iterating. One sprint = one hypothesis, one test, one decision.

This is a repeating cycle. After each sprint closes, start the next with the next bottleneck from the `cro-audit` priority list.

```
Week 1:    Diagnose → behavior evidence → hypothesis
Week 1-2:  Design → sample size → success criteria
Week 2:    Build → variant implementation → flag setup
Week 2-4:  Run → monitor SRM → respect minimum sample
Week 4:    Decide → ship / iterate / abandon → document
           → next sprint
```

---

## Quick Reference

| Week | Phase | Skills Invoked | Output |
|------|-------|----------------|--------|
| 1 | Diagnose | `cro-audit`, `microsoft-clarity`, `landing-page-cro` | Hypothesis document |
| 1–2 | Design | `ab-testing` | Sample size, test duration, success criteria |
| 2 | Build | `ab-testing`, `posthog` | Variant live behind feature flag |
| 2–4 | Run | `ab-testing` | SRM checks, guardrail monitoring |
| 4 | Decide | `ab-testing` | Results document, next sprint |

---

## Week 1: Diagnose

### Step 1 — Find the bottleneck

Invoke `cro-audit`. It will:

- Pull GA4 funnel data to locate the highest drop-off point
- Produce a ranked list of bottlenecks by estimated revenue impact
- Return the top candidate for this sprint

**Sprint selection criteria (must meet all three):**

- Page has ≥ 50 daily sessions (minimum traffic for statistical power)
- Hypothesis is specific and falsifiable (not "make it look better")
- Variant can be built in < 1 day (surgical change, not redesign)

### Step 2 — Gather behavior evidence

Invoke `microsoft-clarity` for the bottleneck page. Capture:

- Session replay evidence showing the failure mode (rage clicks, dead zones, early exits)
- Heatmap data — where attention goes vs. where conversion CTAs live
- Scroll depth — does the CTA even get seen?

Invoke `landing-page-cro` for page-level audit. Capture:

- Copy clarity issues (headline, value prop, CTA language)
- Trust signal gaps (social proof, guarantees, credentials)
- Form friction (field count, error handling, perceived effort)
- Visual hierarchy problems

### Step 3 — Write the hypothesis

**Do not proceed to Week 2 without a written hypothesis.** Guessing without evidence is not CRO — it's decoration.

Save to `.claude/progress/experiments/[test-name]-hypothesis-[date].md`:

```markdown
## Experiment: [Name]

**Bottleneck:** [What's broken — e.g., "72% of users abandon the contact form at the phone field"]
**Evidence:**
- Clarity: [Specific session replay evidence — e.g., "8/10 replays show cursor hover on phone field then immediate exit"]
- Analytics: [Conversion data — e.g., "Contact form: 12% start rate, 4.3% completion rate — 64% drop between start and submit"]
- Page audit: [landing-page-cro findings — e.g., "No explanation of why phone number is required; no trust signal near the field"]

**Hypothesis:** If we [specific change], then [primary metric] will [increase/decrease] because [mechanism].
**Primary metric:** [e.g., form completion rate — measured as form_submit events / form_start events]
**Guardrail metrics:** [e.g., page load time < 3s, bounce rate does not increase > 10% relative]
**Minimum detectable effect:** [e.g., 15% relative improvement — from 4.3% to 4.9% completion rate]
```

**Hypothesis quality checklist:**

| Check | Requirement |
|-------|------------|
| Specific | Names the exact element being changed |
| Falsifiable | Has a metric that can pass or fail |
| Mechanistic | Explains WHY the change should work |
| Primary metric | Tied to actual conversion event, not a proxy |
| MDE set | Based on traffic volume and business impact |

If the hypothesis fails any check, revise it before proceeding.

---

## Week 1–2: Design

Invoke `ab-testing` with:

- Baseline conversion rate (from `cro-audit` GA4 pull)
- Minimum detectable effect from hypothesis document
- Expected daily sessions on the test page
- Desired statistical confidence level (default: 95%) and power (default: 80%)

`ab-testing` will return:

- Required sample size per variant
- Estimated test duration at current traffic levels
- Recommended significance threshold

**Define success criteria before building:**

| Criterion | Definition |
|-----------|-----------|
| Primary metric win | Treatment significantly outperforms control on primary metric |
| Guardrails hold | No significant degradation on guardrail metrics |
| SRM clear | Sample ratio within ±5% of 50/50 split |
| Minimum sample reached | Both variants at or above required N |

**Variant scope rules:**

- Change ONE variable per test (CTA copy, headline, social proof placement, form field count)
- Do not run multiple changes in one test — you will not know what worked
- Surgical edits only — no page redesigns
- Control = current state, unmodified

---

## Week 2: Build

### Implement the variant

Invoke `ab-testing` for implementation guidance on the specific change type (copy, UI, form, layout).

**Build checklist:**

- [ ] Variant is a single focused change from the hypothesis
- [ ] Control is untouched — no "while we're at it" edits to control
- [ ] Both variants render correctly at mobile and desktop breakpoints
- [ ] No console errors in either variant
- [ ] Build passes — `npm run build` (or equivalent) succeeds

### Set up the experiment in PostHog

Invoke `posthog` to:

- Create a feature flag for the experiment (boolean, 50/50 split)
- Set up experiment goals (primary metric event)
- Configure guardrail metric tracking
- Verify flag is firing correctly in both variants
- Confirm events are tracking and attributing to correct variant

**Verification checklist (do not skip):**

| Check | How to verify |
|-------|--------------|
| Flag fires in control | PostHog → Feature Flags → test with flag OFF |
| Flag fires in treatment | PostHog → Feature Flags → test with flag ON |
| Primary metric event fires | Trigger conversion action — confirm event in PostHog live view |
| Variant assignment stable | Same user session always sees same variant |
| No data bleed | Control users never see treatment content |

**Do not start the timer until all checks pass.** A bad setup wastes weeks of traffic.

---

## Week 2–4: Run

### Anti-patterns to enforce

| Anti-Pattern | Why It's Wrong | Rule |
|-------------|---------------|------|
| Peeking at results before minimum N | Inflates false positive rate — p-hacking | Do not check results until minimum sample reached |
| Stopping early for a "winner" | Sequential testing without correction = unreliable results | Respect the timeline set in Week 1-2 |
| Stopping early for a "loser" | You may be underpowered — not enough to conclude | Reach minimum N before calling it |
| Changing the variant mid-test | Contaminates data — results are uninterpretable | Freeze both variants on day 1 |
| Adding pages to the test mid-run | Changes traffic composition | Scope is set before launch |
| Ignoring guardrail degradation | Winning primary metric while breaking experience | Stop test if guardrail breaches threshold |

### Weekly check-ins

Invoke `ab-testing` weekly to:

- Run SRM check — verify split is 50/50 ± 5%
- Check guardrail metrics — stop if any breach threshold
- Confirm minimum sample progress — track toward target N

**SRM (Sample Ratio Mismatch) protocol:**

If the split deviates > 5% from expected:

1. Stop the test immediately
2. Diagnose the cause (tracking bug, redirect asymmetry, bot traffic)
3. Fix the root cause
4. Restart the test with clean data (wipe existing results)
5. Do not analyze data from a test with SRM

SRM invalidates the entire dataset. There is no statistical correction for it.

**Guardrail breach protocol:**

If a guardrail metric degrades significantly:

1. Stop the test immediately
2. Ship control (revert treatment)
3. Document the degradation and mechanism in the results file
4. Redesign the variant to avoid the side effect

A test that wins on primary metric but degrades bounce rate or page speed is not a winner — it ships harm.

---

## Week 4: Decide

Invoke `ab-testing` for full statistical analysis once minimum sample size is reached.

### Decision framework

| Result | Condition | Action |
|--------|-----------|--------|
| Ship winner | p < 0.05, effect ≥ MDE, guardrails pass | Remove flag, make treatment the default, ship |
| Iterate | p ≥ 0.05, directional positive signal | Design bolder variant addressing same bottleneck |
| Iterate (loss) | Treatment clearly worse | Discard, test next hypothesis from `cro-audit` list |
| Abandon | Guardrail breach or SRM | Fix the problem exposed, redesign approach |
| Inconclusive | p < 0.05 but effect < MDE (not practically significant) | Determine if lift justifies effort — usually iterate |

**Shipping a winner:**

1. Merge treatment into production (remove feature flag split)
2. Verify primary metric in GA4 post-ship (7-day window)
3. Update the `cro-audit` priority list — re-rank remaining bottlenecks

### Document results

Save to `.claude/progress/experiments/[test-name]-results-[date].md`:

```markdown
## Results: [Experiment Name]

**Duration:** [start date] — [end date] ([N] days)
**Sample size:** Control: [N] | Treatment: [N]
**SRM check:** ✓ balanced ([actual split]%) / ✗ mismatch detected

### Primary Metric
| Variant | [Metric] | 95% CI | p-value | Significant? |
|---------|----------|--------|---------|-------------|
| Control | ...% | [lower, upper] | — | — |
| Treatment | ...% | [lower, upper] | 0.0XX | ✓/✗ |

**Relative lift:** [+/-X%]
**Practical significance:** [Above/below MDE of X%]

### Guardrail Metrics
| Metric | Control | Treatment | Delta | Status |
|--------|---------|-----------|-------|--------|
| Page load time | ...s | ...s | +/-X% | ✓ no degradation / ⚠ degraded |
| Bounce rate | ...% | ...% | +/-X% | ✓ no degradation / ⚠ degraded |
| [other guardrail] | ... | ... | ... | ✓/⚠ |

### Decision
**[Ship / Iterate / Abandon]** — [1-2 sentence reasoning]

### What we learned
[What the result tells us about user behavior, regardless of win/loss]

### Next Sprint
[Next bottleneck from cro-audit priority list + initial hypothesis direction]
```

---

## Loop: Starting the Next Sprint

After documenting results, invoke `cro-audit` to refresh the priority list. The previous bottleneck is either resolved (if shipped) or deprioritized (if abandoned).

Pick the next candidate and start Week 1 again.

**Velocity target:** One completed sprint every 4 weeks. Slower = wasted traffic. Faster = underpowered tests that mislead.

---

## Deliverables

| Deliverable | When | Location |
|-------------|------|----------|
| Hypothesis document | End of Week 1 | `.claude/progress/experiments/[test-name]-hypothesis-[date].md` |
| Experiment results | End of Week 4 | `.claude/progress/experiments/[test-name]-results-[date].md` |

Both files accumulate over sprints — they are the institutional memory of what worked, what didn't, and why.

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Running a test without a written hypothesis | Write the hypothesis first — hypothesis drives metric selection, not the other way around |
| Testing two changes at once | One variable per test — always |
| Checking results daily | Set a check schedule, resist interim peeks |
| Calling it a winner before minimum N | Reach the sample size set in Week 1-2 |
| Ignoring SRM | SRM = restart, no exceptions |
| Shipping a variant with guardrail degradation | Guardrail breach = stop, not "acceptable tradeoff" |
| Treating a loss as wasted time | Negative results teach user behavior — document what you learned |
| Skipping the PostHog verification checklist | A mis-configured experiment produces garbage data |
| "While we're at it" edits to control | Control must be identical to production on day 1 |
| Losing hypothesis documents | Save everything — even abandoned sprints |

---

## Related Skills

- `cro-audit` — Week 1 bottleneck diagnosis, priority list for future sprints
- `microsoft-clarity` — Week 1 behavior evidence (session replays, heatmaps)
- `landing-page-cro` — Week 1 page-level audit of bottleneck page
- `ab-testing` — Sample size, experiment setup, SRM monitoring, full analysis
- `posthog` — Feature flag management, event tracking, experiment goals
