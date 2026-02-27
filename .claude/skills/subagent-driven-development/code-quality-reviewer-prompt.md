# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes (including TDD compliance).**

```
Task tool (armadillo:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]

  ADDITIONAL CHECK: Verify TDD was followed — tests should exist and
  cover the implementation. If the verify-tdd-order.sh script exists
  at .claude/scripts/verify-tdd-order.sh, run it as part of the review.
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
