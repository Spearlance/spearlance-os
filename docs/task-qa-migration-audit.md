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

Not built yet: the `task_qa_dispatch` trigger + `task-qa-run` edge function, and the agent
itself. Until then "Send to QA" parks the task at `ready_for_review` for a human or the
"Record verdict" form.

## Verdicts

| Step | Verdict | One-line reason |
|---|---|---|
| 1. `ALTER TYPE task_status ADD VALUE …` (6 values) | **NO-GO as written.** Conditional GO for `cancelled` (+ `blocked`) after the "open" predicates ship. NO-GO for the four QA pipeline values living in `status`. | `status` is *derived* from the kanban column and rewritten on every drawer save / drag, so a pipeline status with no matching column is silently reverted. The Campfire digest never reads `status`, so `cancelled` alone does not stop the nagging. One-way change. |
| 2. Context columns on `tasks` | **GO**, with one deviation | Nullable, unread, droppable. `origin_type/origin_ref` duplicates the existing `external_source/external_ref` pair, so the migration reuses those instead (flagged below). |
| 3. `task_qa_runs` | **GO**, with corrections | `tasks.id` is `uuid`, not `bigint`. Added FK + fill-trigger on `client_id`, FK on `submitted_by`, RLS (every table here has it), indexes. |

Files on the branch:

| File | Purpose |
|---|---|
| `supabase/migrations/20260902100001_tasks_qa_context.sql` | Step 2 (applies via normal path) |
| `supabase/migrations/20260902100002_task_qa_runs.sql` | Step 3 (applies via normal path) |
| `supabase/migrations/gated/20260902120000_task_status_add_values.sql` | Step 1, **gated** (subfolder is ignored by the CLI and by `applymig.sh`) |
| `supabase/migrations/gated/20260902120001_tasks_qa_state_alt.sql` | Fallback: `qa_state` column instead of enum values |
| `supabase/migrations/down/*.down.sql` + `down/README.md` | Down migrations for steps 2, 3 and the fallback; rebuild recipe for the enum |
| `src/integrations/supabase/types.ts` (separate commit) | Simulated `supabase gen types` output post-migration, used for the compile check in §5 |

Recommendation in one paragraph: ship steps 2 + 3 to dev now. Fix every "open = not done"
predicate (this repo, the edge functions, and the Campfire bridge) through one shared
`isTerminal(status)` helper. Then add **only** `cancelled` (and `blocked` if wanted) to the
enum and seed each client a "Cancelled" column mapped to it, which is how this app makes a
status reachable. Put the QA pipeline in a separate `qa_state` column (fallback file), fire
the QA agent from a trigger on `qa_state = 'ready_for_review'`, and show it as a badge plus a
"QA runs" section in the drawer. If the pipeline values must be enum values, the precondition
is per-client columns for each of them, and `qa_running` should not be a status at all (derive
it from an open `task_qa_runs` row).

---

## The finding that governs everything: state is column-first

A task's state lives in two places, `tasks.status` (enum) and `tasks.column_id` →
`task_columns.mapped_status`. The column wins everywhere:

- Board grouping is by `column_id`; `status` is only a fallback for tasks with no column.
  `src/pages/Tasks.tsx:61-85`
- Drag-and-drop writes `status = column.mapped_status`. `src/pages/Tasks.tsx:423-446`
- The drawer **normalises `status` back to the column's `mapped_status`** whenever a task
  opens, and Save writes that back. `src/components/tasks/TaskDrawer.tsx:71-82`, `:553-563`
- The "Status" select in the drawer is actually a column picker.
  `src/components/tasks/task-drawer/DetailsTab.tsx:103-113`
- Create dialogs take status from the chosen column. `src/components/tasks/CreateTaskDialog.tsx:110-131`,
  `src/components/marketing/CreateChannelTaskDialog.tsx:81-110`
- Checkbox completion resolves status *and* column together. `src/lib/taskCompletion.ts:22-31`
- "Done" for My Tasks means status **or** column. `src/lib/myTasksGrouping.ts:39-41`
- The Campfire bridge says it outright: *"SpearlanceOS tracks task state via kanban columns,
  NOT the status enum"* and excludes by column only. `../Campfire/bridge/src/columns.ts:4-9`,
  `handlers.ts:266-267`

Dev data agrees: all 23 top-level tasks have `status == column.mapped_status` (post the
2026-07-29 repair migration). Consequence: an agent setting `status = 'revisions_required'`
while the task sits in "In Progress" will be flipped back to `in_progress` the next time a
human opens the drawer and clicks Save, or drags the card. New statuses are only stable if a
column maps to them, or if they live outside `status`.

---

## 1. Every "open = absence of done" predicate

"Needs fix" = will count `cancelled` (and `blocked`) as open after step 1.

| # | Location | Predicate | Needs fix | Note |
|---|---|---|---|---|
| 1 | `src/hooks/useMyTasks.ts:97` | `.neq("status","done")` | **Yes** | My Tasks list; cancelled tasks would appear as open. Change to `.not("status","in","(done,cancelled)")`. |
| 2 | `src/lib/myTasksGrouping.ts:39-41` | `isTaskDone` = status `done` or column `done` | **Yes** | Rename/extend to `isTaskClosed`: `done`/`cancelled` on either side. Test: `src/hooks/__tests__/useMyTasks.grouping.test.ts:174-189`. |
| 3 | `src/hooks/useSuccessHub.ts:296` | `.neq('status','done')` | **Yes** | "This week" card on Client Success Hub. |
| 4 | `src/pages/admin/DesignerWorkload.tsx:156,159` | `t.status !== 'done'` | **Yes** | Overdue / due-this-week counts per designer. |
| 5 | `src/pages/admin/DesignerWorkload.tsx:346` | `t.status !== 'done'` | **Yes** | "active tasks" list. |
| 6 | `src/pages/MarketingFlowchart.tsx:480` | `t.status !== "done"` | **Yes** | Channel task list. |
| 7 | `src/components/tasks/WeeklyPlanView.tsx:134` | `complete = currentStatus !== "done"` | Low | Toggling a cancelled task marks it done. Acceptable, but make explicit. |
| 8 | `src/components/tasks/SubtaskList.tsx:35` | `=== "done" ? "to_do" : "done"` | Low | Same toggle pattern. |
| 9 | `supabase/functions/send-daily-task-summary/index.ts:109,119` | `t.status !== 'done'` | **Yes** | Daily email digest (overdue + due today). |
| 10 | `supabase/functions/send-weekly-task-summary/index.ts:150,157` | `t.status !== 'done'` | **Yes** | Weekly email (overdue + upcoming). Also `:145` counts only `in_progress` as active. |
| 11 | `supabase/functions/generate-daily-action-plan/index.ts:126,201,403` | `t.status !== 'done'` | **Yes** | AI action plan feeds cancelled tasks to the model as overdue. `:127,404` count only `to_do` as backlog. |
| 12 | `supabase/functions/chat-assistant/tools/queries/tasks.ts:61,77` | `.neq('status','done')` / `!== 'done'` | **Yes** | `get_tasks({overdue:true})` for the chat assistant. |
| 13 | `supabase/functions/chat-assistant/prompts/snapshot.ts:39` | open = `to_do + in_progress` | Inverse | Undercounts new *open* states (blocked, ready_for_review…). |
| 14 | `supabase/functions/recommend-tasks/index.ts:108` | `.in('status',['to_do','in_progress'])` | Inverse | Duplicate-avoidance misses tasks in new open states. |
| 15 | `supabase/functions/chat-assistant/tools/queries/client-info.ts:63-65` | three fixed buckets | Inverse | Metrics ignore new states. |
| 16 | `src/pages/Dashboard.tsx:64-65` | counts `to_do`, `in_progress` only | Inverse | Dashboard tiles ignore new open states. |
| 17 | `supabase/migrations/20251015183528…sql:20-27` `update_channel_progress()` | done ÷ total | **Yes** | Cancelled tasks stay in the denominator: channel progress can never reach 100 %. Add `AND t.status <> 'cancelled'` to the total. |
| 18 | `../Campfire/bridge/src/handlers.ts:253-267` `runDigest` | excludes by Done **column** only | **Yes** | The Campfire digest. See §2. |
| 19 | `../Campfire/bridge/src/handlers.ts:117-118` | `wasDone/nowDone` by column or status | No | Completion ping; cancelled should not ping "Completed" and won't. |
| 20 | `supabase/functions/duda-comments-webhook/index.ts:284` | `existing.status === 'done'` | No | Reopen-from-Duda only reopens done tasks; a cancelled one stays cancelled. Fine. |

DB triggers comparing to literals (`set_task_timestamps`, `create_task_completion_notification`)
are exact-match on `'done'`/`'in_progress'` and are unaffected; see §6 for side effects.

## 2. The Campfire digest

**It is not in this repo.** It lives in the Campfire bridge, `../Campfire/bridge` (Node,
runs on the Campfire droplet), and the Campfire Rails fork calls back into it.

- Scheduler: `node-cron`, `DIGEST_CRON` default `0 8 * * 1-5` in `America/New_York`.
  `bridge/src/index.ts:36-49`, `config.ts:52-53`
- Query: `bridge/src/handlers.ts:253-262`: `tasks` where `due_date IS NOT NULL AND due_date <= today`,
  ordered by due date, then `handlers.ts:266-267` drops tasks whose `column_id` is a "Done"
  column (`columns.ts:21,37-42`: column *name* matches `^(done|complete|completed|closed|shipped)$`
  or `mapped_status = 'done'`). Grouped by client, posted to each client's room with
  @mentions (`formatters.ts:80-88`).
- **What it does with an unknown status: nothing.** `status` is never read for exclusion.
  The `TaskRow` type at `bridge/src/supabase.ts:39` is the 3-value union, type-only. So after
  step 1 a task set to `cancelled` that still sits in "To Do" is nagged exactly as before. The
  brief's fear is correct, and the fix has to land in the bridge, not here.
- Required change: `handlers.ts:267` → also exclude `status IN ('done','cancelled')` (and
  `blocked` if that is the decision), and widen `TaskRow.status`. Simplest is to push the
  filter into the query: `.not("status","in","(done,cancelled)")`.
- Second consumer: the Rails per-person "good morning" DM (`Campfire/.src/app/models/personal_digest.rb:57-63`)
  fetches `GET /internal/user-tasks` from the bridge. **That route does not exist in the local
  bridge checkout** (`bridge/src/api.ts` has `/internal/clients`, `/internal/client-members`,
  `/internal/channels` only). The deployed bridge is newer than the copy on disk; audit the
  deployed code before relying on this list.
- Assumption: the "daily/overdue Campfire digest" in the brief is `runDigest`. The two email
  digests in this repo (`send-daily-task-summary`, `send-weekly-task-summary`) have no
  schedule in any migration (the only `cron.schedule` calls are trial-expiration, lighthouse,
  windsor-sync); they are either dashboard-scheduled or dormant. They need the same fix either way.

## 3. Exhaustive status matches with no default

| Location | Shape | On a new value |
|---|---|---|
| `src/components/tasks/TaskColumnManager.tsx:522-531` | `<select>` with exactly `to_do / in_progress / done` | New statuses are **unreachable from the UI**: no column can be mapped to them. `:123-127` infers only the three. `:30` state union. |
| `src/pages/Tasks.tsx:54` · `src/components/tasks/TaskDrawer.tsx:68` · `task-drawer/DetailsTab.tsx:32` · `CreateTaskDialog.tsx:40,63` · `marketing/CreateChannelTaskDialog.tsx:32,51` · `src/lib/taskCompletion.ts:3` | Hard-coded `'to_do' \| 'in_progress' \| 'done'` unions | Three become compile errors after types regen (§5); the rest are hidden by `as` casts (`CreateTaskDialog.tsx:111`, `CreateChannelTaskDialog.tsx:88`, `taskCompletion.ts:48`). |
| `src/pages/admin/DesignerWorkload.tsx:420-421` | `=== 'in_progress' ? 'In Progress' : 'To Do'` | Every new status is **labelled "To Do"**. Wrong, not blank. |
| `src/components/website-builds/BuildLinkedTasksTab.tsx:19-23` + `:153` | `statusColors[status]` record, no default | `className={undefined}`: plain outline badge, text still shown via `:155`. Cosmetic. |
| `src/components/success-hub/WeeklyPlanCard.tsx:19-23` + `:37,49` | `statusConfig[status]` | Guarded with `?.icon \|\| Circle`; className undefined. Cosmetic. |
| `src/pages/MarketingFlowchart.tsx:301-309` | record with default (already has `blocked`) | OK. `:503` and `PageTasksTab.tsx:241` use `replace("_"," ")` which only replaces the first underscore: "ready for_review". Cosmetic. |
| `src/components/tasks/TaskTableView.tsx:93-96` | column name, falls back to raw status | OK (raw `ready_for_review` shown). |
| `src/components/tasks/TaskListView.tsx:50-56` | groups by column, fallback by `mapped_status` | Task with no matching column is **dropped from the list** silently. |
| `src/pages/Tasks.tsx:75-81` | fallback by `mapped_status` | Task with no `column_id` and no mapped column: `console.warn` and **vanishes from the board**. |
| `supabase/functions/chat-assistant/tools/registry.ts:208,227,310,326` | JSON-schema `enum: ["to_do","in_progress","done"]` | The assistant cannot set or filter new statuses; prompt at `prompts/system.ts:1163-1165` lists the three. |
| `../Campfire/bridge/src/supabase.ts:39` | TS union | Type-only. |
| `e2e/seed.setup.ts:31-32` | looks up columns by key | OK. |

No `switch (status)` without default exists for tasks.

## 4. `task_columns.mapped_status`

- Type is the enum itself: `mapped_status task_status DEFAULT 'in_progress'`
  (`20251120184932…sql:2-3`). **No CHECK constraint, no DB allowlist.** After step 1 the DB
  accepts the new values on columns immediately; the only allowlist is app-side (§3, row 1).
- Board behaviour with a status that has no column: if the task has a `column_id` it renders in
  that column whatever `status` says (`Tasks.tsx:67-73`). If `column_id` is null, the fallback
  by `mapped_status` fails, a `console.warn` fires, and the card **renders nowhere**
  (`Tasks.tsx:75-81`). List view: same (`TaskListView.tsx:50-56`). Table view shows the raw
  enum text. Drawer shows the raw enum text in the select (`DetailsTab.tsx:119-131`).
- Practical path for a new status: extend `initialize_default_task_columns()`
  (`20260729000000…sql:14-24`) and backfill existing clients with the column, then extend the
  manager select. That is how "Cancelled" should ship.

## 5. Generated Supabase types

Docker is not running locally and the brief forbids applying the migration, so the types were
not regenerated from a database. Instead `src/integrations/supabase/types.ts` was hand-edited
to the exact shape `supabase gen types` emits for this schema (enum union and `Constants`
array, the four `tasks` columns in Row/Insert/Update, the `task_qa_runs` table with its three
relationships). It is a separate commit, `chore(types): simulate post-migration generated
types`, so it can be dropped if step 1 is held.

`npx tsc --noEmit -p tsconfig.app.json`:

| | Errors |
|---|---|
| Baseline on `main` (pre-existing, unrelated: GSC/Windsor/analytics typings) | 59 |
| With simulated types | 62 |

The three new errors, all from the enum widening (steps 2 and 3 add none):

- `src/pages/Tasks.tsx(215,20)`: `setTaskColumns(data)` vs the union at `:54`
- `src/components/tasks/TaskDrawer.tsx(249,20)`: same vs `:68`
- `src/components/tasks/TaskColumnManager.tsx(170,25)`: `setEditMappedStatus` vs `:30`

Coverage limits: the Deno edge functions are untyped against the schema, so tsc gives zero
coverage there, and the `as` casts listed in §3 hide four more mismatches. Vitest baseline:
219/219 pass on `main`.

## 6. RLS, views, triggers, rollups, ordinal order

- **RLS on `tasks`**: four policies (`20251011164405…sql:345-355`, delete in
  `20251023011502…sql:2-4`), all `has_client_access(auth.uid(), client_id)`. None reference
  `status`. `task_columns`, `task_watchers`, `task_comments` likewise.
- **Views**: none reference `tasks`. The `reporting_*` views are lead/metric only; the
  `page_daily`/`content_daily`/`sources_daily` matviews are analytics. No reporting rollup
  touches task status.
- **Triggers on `tasks` that read `status`**:
  - `set_task_timestamps_trigger` BEFORE UPDATE (`20260106150044…sql:15-31`): `started_at` only
    on `in_progress`; `completed_at` only on `done`, cleared when leaving `done`. With new
    values: `done → cancelled` clears `completed_at` (probably desired); a task that goes
    `to_do → ready_for_review → … → done` never gets `started_at` until `done`, which then
    back-fills it with `created_at`, inflating the "completed in" duration in notifications and
    the weekly email. Decide whether `ready_for_review` should also stamp `started_at`.
  - `task_completion_notification` AFTER UPDATE OF status (`20251224153158…sql:63-172`): fires
    only on `→ done`. Unaffected.
  - `update_channel_progress` AFTER UPDATE OF status WHEN status changed AND linked channel
    (`20251013192255…sql:365-367`, body `20251015183528…sql:2-41`): needs the cancelled
    exclusion (§1 row 17).
  - `embed_knowledge_tasks` AFTER INSERT OR UPDATE on **every column**
    (`20260305000003…sql:48-50`): every QA status flip re-embeds the task (cost only).
    Incidental, pre-existing: the function hard-codes the **prod** URL
    (`…sql:16`), so on dev it posts dev rows at prod's `embed-knowledge`.
- **Realtime**: `tasks` is in `supabase_realtime` (`20260728000000`), and the bridge needs
  `REPLICA IDENTITY FULL` (set outside this repo). New columns just widen payloads.
- **Enum ordinal ordering**: nothing sorts by `status` in `src/`, `supabase/functions/` or the
  migrations (no `.order('status')`, no `ORDER BY status`). Board order is
  `task_columns.display_order`. The gated migration still inserts the workflow values
  `BEFORE 'done'` and `cancelled` `AFTER 'done'` so the ordinal reads sensibly if that ever changes.

## 7. `tasks.id` type

`uuid` (`20251011164405…sql:77`; every FK to it, e.g. `parent_task_id`, `task_comments.task_id`,
is `uuid`). `task_qa_runs.task_id` is `uuid` in the migration.

## 8. Where tasks are created and assigned, and where to fire from

Creation (all write `status: 'to_do'` and, where they can, a `column_id`):

| Surface | Location |
|---|---|
| Task board "New task" dialog | `src/components/tasks/CreateTaskDialog.tsx:168-185` (+ assignees `:198`, watchers) |
| Marketing channel task dialog | `src/components/marketing/CreateChannelTaskDialog.tsx:122-150` |
| Apply marketing template | `src/components/marketing/ApplyTemplateDialog.tsx:175-190` |
| Recommended tasks (AI) | `src/components/tasks/RecommendedTasksDialog.tsx:64-75`, `:136` |
| Subtasks | `src/components/tasks/SubtaskList.tsx:52-60` |
| Meeting highlight → task | `src/pages/MeetingDetail.tsx:118-130` |
| Chat assistant `create_task_from_submission` / general / from meeting | `supabase/functions/chat-assistant/tools/queries/tasks.ts:145-210`, `:364`, `:442` |
| Recurring instances | `supabase/functions/generate-recurring-tasks/index.ts:97-110` (+ assignees `:132`) |
| Duda site comments | `supabase/functions/duda-comments-webhook/index.ts:151-165` (already fills `external_source`/`external_ref`) |

Assignment: `task_assignees` inserts at `CreateTaskDialog.tsx:198`,
`CreateChannelTaskDialog.tsx:149`, `TaskDrawer.tsx:590`, `generate-recurring-tasks/index.ts:132`;
plus the legacy `assignee_user_id` column with `task_assignment_notification`
(`20251023154159…sql:14-53`). Recommended population points: `CreateTaskDialog` and
`DetailsTab` get `acceptance_criteria`, `qa_target_url`, `qa_target_state` fields;
`duda-comments-webhook` sets `qa_target_url` from the editor link and `qa_target_state='editor'`;
`ApplyTemplateDialog` / recurring copy criteria from the template; the chat tool schema
(`registry.ts:136-215`) gains `acceptance_criteria`.

Fire surface for `ready_for_review`. Three precedents exist in the repo:

1. `AFTER UPDATE OF status … WHEN (OLD.status IS DISTINCT FROM NEW.status …)` triggers
   (`20251013192255…sql:363-368`).
2. `pg_net` from a trigger: `notify_embed_knowledge()` (`20260305000003…sql:9-41`).
3. `pg_cron` + `net.http_post` with Vault-stored URL/key (`20260725110000_windsor_sync_cron.sql`).
   Do **not** copy the lighthouse cron's `current_setting('app.settings.*')`: those GUCs are
   unset on both projects.

Recommended: a `task_qa_dispatch` trigger, `AFTER UPDATE OF qa_state` (or `status` if the enum
route is chosen) `FOR EACH ROW WHEN (NEW.qa_state = 'ready_for_review' AND OLD.qa_state IS
DISTINCT FROM NEW.qa_state)`, calling `net.http_post` to a new `task-qa-run` edge function with
`url`/`Authorization` read from `vault.decrypted_secrets` (`project_url`, `service_role_key`,
already present on dev). The function inserts the `task_qa_runs` row, sets `qa_running`, runs
the check, and writes verdict + final state. Edge functions are not auto-deployed from this
repo; deploy it explicitly to dev and prod. Alternatives: a Supabase Dashboard webhook (not
reproducible from the repo) or a Realtime subscriber like the bridge.

---

## Required code changes

Grouped by the decision they depend on. "Any route" = needed whether or not step 1 ships.

**Any route (terminal-state handling; do these first)**

- `src/lib/myTasksGrouping.ts:39-41`: replace `isTaskDone` with `isTaskClosed(status, columnMappedStatus)` treating `done` and `cancelled` as closed; export `TERMINAL_TASK_STATUSES`. Update `src/hooks/__tests__/useMyTasks.grouping.test.ts:174-189`.
- `src/hooks/useMyTasks.ts:97,120`: `.not("status","in","(done,cancelled)")`, use `isTaskClosed`.
- `src/hooks/useSuccessHub.ts:296`: same predicate.
- `src/pages/admin/DesignerWorkload.tsx:152-159,346,420-421`: terminal exclusion; label via a shared `taskStatusLabel()`.
- `src/pages/MarketingFlowchart.tsx:480`: terminal exclusion.
- `src/pages/Dashboard.tsx:64-65`: count open = not terminal, not just two buckets.
- `src/components/tasks/WeeklyPlanView.tsx:134`, `src/components/tasks/SubtaskList.tsx:35`: make the toggle explicit about cancelled (either leave cancelled alone or reopen to `to_do`).
- `supabase/functions/_shared/taskStatus.ts` (new): `TERMINAL = ['done','cancelled']`, `isOpen()`, used by the five functions below.
- `supabase/functions/send-daily-task-summary/index.ts:109,119`; `send-weekly-task-summary/index.ts:145,150,157`; `generate-daily-action-plan/index.ts:126-128,201,403-404`; `chat-assistant/tools/queries/tasks.ts:61,77`; `chat-assistant/prompts/snapshot.ts:39`; `chat-assistant/tools/queries/client-info.ts:63-65`; `recommend-tasks/index.ts:108`: use the helper.
- New migration: `CREATE OR REPLACE FUNCTION update_channel_progress()` with `AND t.status <> 'cancelled'` on the total (`20251015183528…sql:20-22` is the current body).
- `../Campfire/bridge/src/handlers.ts:255-267`, `supabase.ts:39`: exclude terminal statuses in the digest query; widen the type. Plus whatever serves `/internal/user-tasks` in the deployed bridge.

**If `cancelled` (and `blocked`) enter the enum**

- `supabase/migrations`: new migration after the enum one: extend `initialize_default_task_columns()` (`20260729000000…sql:14-24`) with `('Cancelled','cancelled',…,'cancelled')` and backfill `task_columns` for existing clients (`ON CONFLICT (client_id, key) DO NOTHING`, `display_order` = max+1 per client). Cannot be in the same transaction as the `ADD VALUE`.
- `src/components/tasks/TaskColumnManager.tsx:30,123-127,522-531`: widen union, add options, infer `cancelled`/`blocked` from names.
- `src/pages/Tasks.tsx:54`, `TaskDrawer.tsx:68`, `DetailsTab.tsx:32`, `CreateTaskDialog.tsx:40,63`, `CreateChannelTaskDialog.tsx:32,51`, `src/lib/taskCompletion.ts:3`: replace the literal unions with `Database["public"]["Enums"]["task_status"]`.
- `src/pages/Tasks.tsx:586-590`: decide whether "Cancelled" collapses like "Done" (currently only `key === 'done'` collapses).
- `supabase/functions/chat-assistant/tools/registry.ts:208,227,310,326` and `prompts/system.ts:1163-1165`: add the values.
- `src/components/website-builds/BuildLinkedTasksTab.tsx:19-23`, `src/components/success-hub/WeeklyPlanCard.tsx:19-23`, `src/pages/MarketingFlowchart.tsx:503`, `src/components/website-builds/PageTasksTab.tsx:241`: add entries / use `taskStatusLabel()`.

**If the QA pipeline goes in `qa_state` (recommended)**

- Apply `gated/20260902120001_tasks_qa_state_alt.sql` (move it up a directory).
- New migration: `task_qa_dispatch` trigger + Vault-backed `net.http_post` (see §8).
- New edge function `task-qa-run`; new UI: QA badge on `TaskCard`/`MyTaskCard`, "QA" section in `TaskDrawer` listing `task_qa_runs`, "Send to QA" action that sets `qa_state='ready_for_review'`.
- `src/hooks/useMyTasks.ts:73-94`, `src/pages/Tasks.tsx:290-310` selects: add `qa_state`.

**If the QA pipeline values go in `status` instead (not recommended)**

- Everything in the previous two blocks, plus per-client columns for `ready_for_review`,
  `revisions_required`, `qa_approved` (seed + backfill), and drop `qa_running` from the enum
  (derive from `task_qa_runs.finished_at IS NULL`). Without the columns the drawer/board will
  revert the status (see the governing finding).

## Flagged assumptions and deviations

1. **`origin_type` / `origin_ref` not added.** `tasks.external_source` / `external_ref` already
   exist for exactly this (`20260731000000…sql:28-37`, with a partial index). The step-2 file
   reuses them; the block is left commented out in the migration if a separate pair is wanted.
2. **Terminal set assumed `{done, cancelled}`.** `qa_approved` is not terminal (the task still
   moves to done). `blocked` is treated as open here; whether the digest should skip it is a
   product decision.
3. **`viktor_thread_path` kept as named.** Suggest `agent_thread_path` to match `task_qa_runs`
   and avoid a person's name in the schema; not changed because it is not a codebase conflict.
4. **The "33 dead tasks / 300 days" number is a prod observation.** Dev (a snapshot) shows
   15 overdue open tasks, oldest due 2026-06-27, and zero status/column disagreement. Prod was not queried.
5. **The Campfire bridge on disk is older than what is deployed** (missing `user-tasks` route).
6. **The email digests have no schedule in the repo.** Treated as needing the same fix.
7. **Types were simulated, not generated.** Regenerate against dev after steps 2 + 3 apply and
   diff against the committed simulation.
8. `dev` branch is 19 commits behind `main` with nothing unique; this branch was cut from
   `main` so it includes the 2026-07-29 column repair and the Duda webhook columns.

## Verification performed

- Steps 2, 3, the fallback, an insert into `task_qa_runs` (client_id auto-filled), and all
  three down files ran on **dev** inside one `BEGIN … ROLLBACK`; afterwards
  `enum_range(task_status) = {to_do,in_progress,done}`, zero `qa_*` columns, no `task_qa_runs`.
- Step 1 was also run inside a rolled-back transaction; it confirmed the Postgres rule the
  file documents (`55P04: unsafe use of new value … must be committed before they can be used`)
  when the same transaction tried to read the enum.
- `tsc` baseline vs simulated types: 59 → 62 errors, three listed in §5.
- `vitest`: 219/219 on `main`.
