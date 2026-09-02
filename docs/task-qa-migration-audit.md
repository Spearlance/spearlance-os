# Task QA migration audit

Date: 2026-09-02. Branch: `feat/task-qa-workflow` (cut from `origin/main` @ `bcc4587`).
Scope: Viktor's "QA migration audit" brief. The audit below was written before anything
was applied; the section right after it records what has since shipped to **dev**.
Production has not been touched or queried.

## Status: applied to dev (2026-09-02, after Garrett's go)

Decisions taken (Garrett: "whatever is best that won't break anything"):

- **Terminal statuses are `done` and `cancelled`.** `blocked` is open: it stays on boards
  and in digests, it just reads "Blocked".
- **Enum gets `cancelled` + `blocked` only.** The QA pipeline lives in `tasks.qa_state`
  (`ready_for_review` / `qa_running` / `revisions_required` / `qa_approved`), not in
  `task_status`. The four pipeline enum values stay in `migrations/gated/`, unapplied.
- Every client got a **"Cancelled" column** (pinned after Done, collapsible on the board);
  dragging a task into it is what sets `status = 'cancelled'`.

Applied to dev (`zlljsdaxsggkasvympku`) and recorded in `schema_migrations`:
`20260902100001` context columns · `20260902100002` `task_qa_runs` · `20260902120000`
enum `blocked`/`cancelled` · `20260902120001` `qa_state` · `20260902120002` Cancelled column
seed + channel-progress fix. `dev` branch fast-forwarded to `main` first (it had nothing unique).

Code shipped on the branch (all "any route" items from the change list below, plus the
Cancelled-column UI): shared `src/lib/taskStatus.ts` and `supabase/functions/_shared/taskStatus.ts`;
every "open = not done" predicate in §1 rows 1–17; column manager widened to all five
statuses with Done/Cancelled pinned; board renders terminal columns through
`CollapsibleTaskColumn`; status labels via `taskStatusLabel()`; chat-assistant tool enums and
prompt; `types.ts` regenerated from dev. Edge functions redeployed to dev:
`send-daily-task-summary`, `send-weekly-task-summary`, `generate-daily-action-plan`,
`recommend-tasks`, `chat-assistant`.

Campfire bridge (`../Campfire/bridge`, not a git repo): digest query now excludes
`status IN (done, cancelled)` and Cancelled columns count as closed
(`src/handlers.ts`, `src/columns.ts`, `src/supabase.ts`). **Not deployed to the droplet.**

QA UI shipped to dev (same day, PR after #51): a **QA tab** in the task drawer with
acceptance criteria, QA target URL + editor/published, the pipeline state with
**Send to QA** / **Remove from QA**, a **Record verdict** form that appends a
`task_qa_runs` row and advances `qa_state` (manual QA, and a stand-in for the agent), and the
run log with findings. `QaStateBadge` on board cards and My Tasks cards; a QA section in the
create-task dialog. The drawer re-reads the QA fields from the row on open so callers that
pass a partial task (My Tasks, Marketing Flowchart, build pages) can't blank them on Save.

Dispatch wired on dev (same day): `task_qa_dispatch` trigger (Vault-backed `net.http_post`) → `task-qa-dispatch` edge function (push to `QA_AGENT_WEBHOOK_URL` if set, else wait) and the agent endpoint `task-qa-agent` (`/queue`, `/task/:id`, `/claim`, `/verdict`, shared `x-qa-secret`). Contract for Viktor: `docs/task-qa-agent-integration.md`. Verified end to end on dev with curl. Also fixed `notify_embed_knowledge()` to use Vault instead of the hard-coded prod URL (`20260902140001`): dev edits had been posting to prod's embed function.

Not built yet: the agent itself.
