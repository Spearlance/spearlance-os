# Testing Rules

## Philosophy: Diagnose, Don't Brute-Force

When tests fail, the goal is NEVER to tweak code blindly until green. Every failure is one of:

1. A **BUG in the code** — code doesn't do what it should
2. A **GAP in the code** — code is missing something the test expects
3. A **BUG in the test** — test itself is wrong or outdated
4. An **ENVIRONMENTAL issue** — missing env var, wrong config, external dependency

Diagnose which one it is, then fix the ROOT CAUSE.

## 7-Step Diagnostic Process

1. **READ the failing test.** Understand what it expects and why. Read the ENTIRE test file.
2. **READ the code under test** line by line. Trace actual execution path for the failing case.
3. **READ imports and dependencies.** Check shared state, utilities, side effects.
4. **DIAGNOSE the category.** Is it a code bug, code gap, test bug, or environmental?
5. **VERIFY framework behavior.** If unclear, search official docs for the test framework.
6. **APPLY the root-cause fix.** Fix the actual problem, not the symptom.
7. **RE-RUN and verify.** Run the specific test, then the FULL suite to catch regressions.

Maximum 3 diagnostic cycles per failure. If still stuck after 3 attempts, escalate to user with findings.

## Test Requirements by Task Type

| Task Type | Test Requirement |
|-----------|-----------------|
| Bug fix | Regression test proving the bug is fixed |
| New feature | Unit tests for core logic + integration for API/UI |
| Refactor | Existing tests must still pass (no behavior change) |
| API endpoint | Request/response validation, error cases, auth checks |
| Schema/content change | Build validation passes |

## Rules

- Every new feature or bugfix requires tests where applicable.
- Run the full test suite before committing. Fix all failures.
- NEVER skip, disable, or delete tests to make a commit pass.
- NEVER use `test.skip()` or `test.todo()` without a tracked TODO explaining why.
- Test edge cases: empty inputs, null/undefined, boundary values, error paths.
- Snapshot tests are a last resort. Prefer explicit assertions.
- Mock external services in unit tests.
- Use `describe` blocks to group related tests logically.

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|-------------|---------------|------------|
| Changing code randomly until tests pass | Hides real bug, creates new ones | Follow 7-step diagnostic process |
| Deleting a failing test | Removes safety net | Fix the root cause |
| Adding `// @ts-ignore` to pass type tests | Masks type errors | Fix the type issue |
| Testing implementation details | Breaks on refactor | Test behavior and outcomes |
| No assertions in test | False confidence | Every test must assert something |
