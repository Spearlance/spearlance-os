---
model: claude-sonnet-4-6
name: test-debug
description: "Use when tests are failing unexpectedly — diagnoses root cause by reading test + code + imports, classifies failure type (CODE BUG / CODE GAP / TEST BUG / ENV), and applies targeted fix. Never brute-forces."
---

# Test Debug

Systematic test failure diagnosis. Reads test + code + imports, classifies failure type, applies targeted fix. Never brute-forces.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔍 test-debug ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line: which test(s) are failing]           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## When to Use

- Tests failing unexpectedly
- Test passes locally but fails in CI
- Need to understand WHY a specific test fails
- After refactoring causes test breakage

## 8-Step Diagnostic Process

### Step 1: Capture Full Output

Run the failing test and capture FULL error output — not just the summary line.

```bash
npm test -- [test-file] 2>&1
```

### Step 2: Read the Failing Test

Read the test file line by line. Understand:
- What is being tested (the behavior, not the implementation)
- What assertions are made
- What setup/teardown exists
- What mocks or fixtures are used

### Step 3: Read the Code Under Test

Read the implementation being tested. Understand:
- What it does
- What it returns
- What side effects it has
- What its edge cases are

### Step 4: Trace Dependencies

Read all imports and dependencies of both test and implementation. Check for:
- Breaking interface changes
- Mock mismatches (mock doesn't match real signature)
- Side effect conflicts between tests
- Shared state pollution

### Step 5: Classify the Failure

| Type | Meaning | Example |
|------|---------|---------|
| **CODE BUG** | Implementation has a logic error | Off-by-one, wrong condition |
| **CODE GAP** | Implementation missing expected behavior | Unhandled edge case |
| **TEST BUG** | Test assertion is wrong or outdated | Testing old interface |
| **ENV** | Config, dependency, or timing issue | Missing env var, race condition |

### Step 6: Verify Framework Behavior

If unclear, search official docs for the test framework to confirm expected behavior. Don't assume — verify.

### Step 7: Apply Root-Cause Fix

| Classification | Action |
|---------------|--------|
| CODE BUG | Fix the implementation |
| CODE GAP | Add the missing behavior |
| TEST BUG | Fix the test assertion |
| ENV | Fix config/setup |

### Step 8: Re-run and Verify

```bash
npm test -- [test-file]
```

**Max 3 diagnostic cycles.** If still failing after 3 rounds, escalate — you're likely missing something structural.

## Quick Reference

| Step | Action | Time |
|------|--------|------|
| 1 | Capture output | 30s |
| 2 | Read test | 1m |
| 3 | Read implementation | 1m |
| 4 | Trace imports | 1m |
| 5 | Classify | 30s |
| 6 | Verify framework | 1m |
| 7 | Fix root cause | 2-5m |
| 8 | Re-run | 30s |

## Anti-Patterns

| Never Do This | Do This Instead |
|---------------|----------------|
| Delete a failing test | Fix the root cause |
| Skip/disable tests | Document why if absolutely necessary |
| Change assertions to match wrong behavior | Fix the code, not the test |
| Retry the same fix hoping for different results | Re-classify the failure |
| Add try/catch to suppress errors | Fix the error source |
| Brute-force random changes | Follow the 8-step process |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Only reading the error message | Read the FULL test + implementation + imports |
| Guessing instead of classifying | Always complete Steps 1-5 before fixing |
| Fixing symptoms not root cause | Trace to the actual source of the problem |
| Not checking shared test state | Tests that share state can interfere — check isolation |
| Ignoring flaky tests | Flaky = timing or state issue — diagnose properly |
