# Edge Function Deploy Script — Design

**Date:** 2026-05-01
**Branch:** feat/sos-tracker-v3
**Status:** approved

## Problem

`supabase/functions/` contains 118 edge functions. There is no automation that
deploys them when code merges to main. Functions are deployed manually via
`npx supabase functions deploy <name>` from local dev environments. Anything
that ships on a feature branch but isn't manually deployed never reaches
production.

This caused the 2026-05-01 admin breakage when 6 admin functions
(`admin-create-client`, `admin-update-user-role`, `admin-delete-client`,
`admin-delete-user`, `admin-assign-clients`, `admin-update-user-profile`)
existed in the repo but had never been deployed to Supabase Cloud (project
`chikljxwgiskyjsnjelf`). Browsers got CORS preflight failures because the
platform returned 404 for those URLs.

## Goal

Make it easy and safe to detect drift between repo and deployed function set,
and to deploy missing/changed functions intentionally — without introducing
GitHub Actions complexity, without auto-deploying on every merge, and without
touching any existing code paths.

## Non-goals

- Auto-deploy on push to main (deferred — npm script + PR checklist first).
- Auto-deletion of deployed functions absent from repo (always human review).
- Modifying function code, `_shared/`, or `supabase/config.toml`.
- Rebuilding the Supabase CLI's deploy logic.

## Approach

A single Node.js helper script + 3 npm scripts + a PR template checkbox.

### Files added

```
+ scripts/deploy-functions.mjs          New helper script
+ .github/pull_request_template.md      New PR checklist
~ package.json                          Add 3 entries to "scripts"
```

No edits to existing function code, `supabase/config.toml`, env files, or any
other file.

### Script behavior

`scripts/deploy-functions.mjs` modes:

| Flag | Behavior |
|------|----------|
| (none) | Interactive — show status, prompt before deploying |
| `--status` | Read-only report, no deploys, exit 0 |
| `--diff` | Deploy only functions changed in `git diff origin/main..HEAD supabase/functions/` |
| `--function <name>` | Deploy one specific function (validates name exists in repo) |
| `--all` | Deploy every function (requires `--yes` to skip giant confirmation) |
| `--dry-run` | Print what would deploy, do not actually deploy |

Default (no-flag) interactive output:

```
▸ Reading supabase/config.toml... project: chikljxwgiskyjsnjelf
▸ Listing remote functions via supabase CLI...

In repo, not deployed:    [list]
In repo, deployed:        [count]
Deployed, not in repo:    [list — flagged for review, never auto-deleted]
_shared/ changed since main:  yes/no

▸ Deploy 3 missing functions? (y/N): _
```

### Safety guarantees

- Project ref read from `supabase/config.toml` — cannot be overridden by flag.
- `SUPABASE_ACCESS_TOKEN` env var required — fails fast if missing.
- Default mode is read-only + prompt — no deploys without explicit `y`.
- Logs the full deploy list before deploying anything.
- If `_shared/` changed, warns and conservatively suggests `--all`.
- Never deletes remote functions — only flags drift.
- Each function deploy is independent — one failure does not cascade.

### npm scripts

```json
"deploy:functions": "node scripts/deploy-functions.mjs",
"deploy:functions:status": "node scripts/deploy-functions.mjs --status",
"deploy:functions:diff": "node scripts/deploy-functions.mjs --diff"
```

### PR template

`.github/pull_request_template.md` adds a section:

```markdown
## Edge functions
- [ ] This PR does not touch supabase/functions/
- [ ] OR: After merge, run `npm run deploy:functions:diff`
- [ ] OR: Functions listed below need manual deploy:
  - `function-name`
```

### Testing strategy (TDD)

Unit tests (vitest):

| Function | Test |
|----------|------|
| `parseConfigToml()` | Extracts `project_id` from `supabase/config.toml` |
| `getChangedFunctions()` | Parses `git diff` output into function name list |
| `detectSharedChanges()` | Returns true if `supabase/functions/_shared/` touched |
| `buildDeployList()` | Combines diff + shared logic into final deploy list |

Not unit tested:

- Actual `supabase functions deploy` invocation (CLI's responsibility).
- Interactive readline prompts (low value, high mock complexity for this size).

Manual integration check (one-time):

- `npm run deploy:functions:status` → confirms it lists remote functions.

### Error handling

| Failure | Behavior |
|---------|----------|
| Missing `SUPABASE_ACCESS_TOKEN` | exit 1, clear message |
| `config.toml` unreadable | exit 1, point to file |
| Supabase CLI not installed | exit 1, suggest `npm install` |
| `git diff` command fails | exit 1, fall back to suggesting `--all` |
| Single function deploy fails | log error, continue with rest, exit 1 at end |

## Skills involved

```
🧠 brainstorming                   — current
🧠 writing-plans                   — next
🔧 test-driven-development         — implementation
🚀 verification-before-completion  — before claiming done
🚀 finishing-a-development-branch  — to merge
📋 code-reviewer agent             — independent review of script
```

## Out of scope (deferred)

- GitHub Actions workflow that auto-deploys on push to main.
- Slack/email notification on deploy.
- Function-level rollback automation.
- Drift cleanup automation (deleting orphaned deployed functions).

These can be revisited if manual + checklist proves insufficient.
