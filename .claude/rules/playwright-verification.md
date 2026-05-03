# Playwright Verification

## When This Rule Activates

Whenever about to claim a UI feature works, a UI bug is fixed, or no UI regression was introduced.

Vitest unit tests and component tests in jsdom DO NOT satisfy this rule — they verify code correctness, not feature correctness. A green vitest run is necessary but not sufficient.

## The Rule

Before claiming any of the following:

- "feature X works"
- "bug Y is fixed"
- "no regression"
- "UI is verified"
- "ready to ship"

…run the Playwright e2e suite (or a scoped subset that covers the change) and report the actual results — passes, failures, screenshots.

## How to Run

```bash
# Full e2e suite (auto-starts dev server via webServer config)
npm run test:e2e

# Headed mode (watch the browser)
npm run test:e2e:headed

# UI mode (interactive)
npm run test:e2e:ui

# Single test file
npx playwright test e2e/abc-company.spec.ts

# After a failure, view the report
npm run test:e2e:report
```

## Test Scope: ABC Company Only

The shared dev/staging Supabase instance contains real client data. Tests MUST be scoped to the **ABC Company** test client. Never click into another client's records, never create destructive operations against real data, never modify accounts other than the test account.

Credentials are in `.env`:
- `PLAYWRIGHT_TEST_EMAIL` — login email (dev test account)
- `PLAYWRIGHT_TEST_PASSWORD` — login password
- `PLAYWRIGHT_BASE_URL` — defaults to `http://localhost:8080`

If a flow requires acting on a different client, stop and ask before touching anything else.

## What "Verified" Means

A claim of UI verification must be backed by:

| Evidence | Required |
|----------|----------|
| Playwright run output (pass/fail counts) | ✓ always |
| Screenshot on failure | ✓ when failing |
| Trace / video on failure | ✓ when failing |
| Console error capture during the flow | ✓ for new features |

Without that evidence, the correct phrasing is "unit tests pass — UI not verified" — not "verified" or "works."

## When This Rule Is Inactive

- Pure backend/CLI changes that don't touch the UI
- Doc-only changes
- Test infrastructure changes that don't ship to users

Even then, if the change touches code paths consumed by the UI (e.g., shared lib, edge function called by frontend), prefer running the e2e suite anyway.

## Integration

| Skill / rule | How it pairs |
|--------------|--------------|
| `verification-before-completion` | This rule defines the UI-specific gate |
| `playwright` | Documents Playwright APIs + patterns |
| `visual-testing` | Adds screenshot baselines on top of functional verification |
| `test-driven-development` | RED → GREEN → e2e VERIFY → REFACTOR for UI work |
