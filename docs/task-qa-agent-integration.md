# Task QA: agent integration

How the QA agent ("Viktor") gets work from SpearlanceOS and writes verdicts back.
Live on **prod** (`https://chikljxwgiskyjsnjelf.supabase.co`) and **dev**
(`https://zlljsdaxsggkasvympku.supabase.co`) since 2026-09-09; hardening pass (ack,
reaper, supersession, credential refs) 2026-09-10.

## The loop

1. A person opens a task, fills in **acceptance criteria** and a **QA target** (URL +
   published/editor) on the QA tab, and clicks **Send to QA**. Both fields are required and
   the criteria are refused if they look like they contain a login or key.
   `tasks.qa_state` becomes `ready_for_review`.
2. The database trigger `task_qa_dispatch` posts to the `task-qa-dispatch` edge function.
3. The agent gets the task one of two ways (below), **acknowledges the run**, checks the
   page, and posts a verdict to `task-qa-agent/verdict`.
4. The verdict is appended to `task_qa_runs` and `qa_state` moves to `qa_approved` or
   `revisions_required` (or back to `ready_for_review` on `error`). The drawer shows the run,
   the card shows the pill.
5. If the agent never acknowledges (5 min) or never returns a verdict (45 min), the reaper
   closes the run as `error`, bumps `tasks.qa_attempts` and re-queues the task. After the
   third stall the task goes to `revisions_required` with a system comment so a human sees it.

Nothing in the loop touches `tasks.status` or the kanban column. Completing the task after
approval is still a human action (drag to Done). Moving a task to Done or Cancelled clears
`qa_state` and closes any open run (`closed_by = task_closed`).

## Auth: one shared secret

Every call to `task-qa-agent` carries the header `x-qa-secret: <QA_AGENT_SECRET>`. In push
mode, the same header is sent *to* the agent so it can verify the call came from us. No
Supabase keys are given to the agent. The secret is an edge-function secret
(`supabase secrets set QA_AGENT_SECRET=...`); it is not in the repo.

## Credentials for the target

Logins never go in `acceptance_criteria` (the UI blocks it). A task may carry
`qa_credential_ref`, the name of a Vault secret matching `^qa_cred_[a-z0-9_]+$`:

```sql
select vault.create_secret('editor@acme.com / S3cret', 'qa_cred_acme_editor');
```

The agent gets the value **only** in the response to `/ack`, `/claim` and `/task/:id`, as
`credential: { ref, value }` (or `null`). It is never in the dispatch payload, never on the
task row, never logged. The dispatch payload says `has_credential: true` so the agent knows
to ack before it needs it.

## Option A: push (we call the agent)

Set `QA_AGENT_WEBHOOK_URL` on the edge functions. When a task enters `ready_for_review`,
`task-qa-dispatch` opens a run, sets `qa_running`, and POSTs:

```json
{
  "event": "task.ready_for_review",
  "run_id": "…uuid…",
  "dispatched_at": "2026-09-02T15:00:00Z",
  "attempt": 1,
  "task": {
    "id": "…uuid…",
    "title": "Fix hero headline on Concord page",
    "description": "<p>…html…</p>",
    "acceptance_criteria": "- Hero H2 reads \"Roof repair in Concord NH\"\n- Header phone matches client record",
    "qa_target_url": "https://www.acmeroofing.com/concord-nh",
    "qa_target_state": "published",
    "priority": "high",
    "due_date": "2026-09-05",
    "external_source": "duda_comment",
    "external_ref": "…",
    "thread_path": null,
    "url": "https://os.spearlance.com/tasks?client=…&selected=…"
  },
  "client": {
    "id": "…uuid…",
    "name": "Acme Roofing",
    "brand_name": "Acme",
    "website_url": "https://acmeroofing.com",
    "duda_site_id": "abc12345",
    "industry": "Construction",
    "hq_city": "Concord, NH",
    "service_areas": ["Concord", "Manchester"],
    "nap": {
      "location_id": "…uuid…",
      "label": "Main location",
      "business_name": "Acme Roofing",
      "phone": "(603) 555-0100",
      "phone_digits": "6035550100",
      "email": "office@acmeroofing.com",
      "address": { "line1": "123 Main St", "line2": null, "city": "Concord", "state": "NH", "postal_code": "03301", "country": "US" },
      "address_text": "123 Main St, Concord, NH 03301",
      "hours": { "mon": [{ "open": "08:00", "close": "17:00" }], "sat": [], "sun": [] },
      "hours_note": null,
      "google_place_id": "ChIJ…"
    },
    "locations": [ { "…every location on file, primary first…": true } ]
  },
  "has_credential": true,
  "callback": {
    "ack_url": "https://…/functions/v1/task-qa-agent/ack",
    "verdict_url": "https://…/functions/v1/task-qa-agent/verdict",
    "header": "x-qa-secret"
  }
}
```

**A 2xx from your webhook only proves delivery.** Your ingest endpoint should return 200
immediately and then, when the agent actually starts:

```
POST /functions/v1/task-qa-agent/ack
x-qa-secret: …
{ "run_id": "…" }
-> { run_id, started_at, acked_at, task, client, credential }
```

If `/ack` has not been called within 5 minutes of `dispatched_at`, the reaper closes the
run and re-dispatches (a fresh `run_id`; the old one returns 409 on `/ack` and `/verdict`).

If the webhook is unreachable or returns non-2xx, the run is closed as `error`
(`closed_by = dispatch`) and the task returns to `ready_for_review`. A task whose last
delivery failed in the previous 10 minutes is not re-dispatched, so a dead webhook cannot
loop. A task that already has an open run is never dispatched twice
(`{ dispatched: false, reason: "run_already_open" }`).

If `QA_AGENT_WEBHOOK_URL` is **not** set, dispatch does nothing and the task simply waits
(Option B or a human verdict).

## Option B: pull (the agent calls us)

No endpoint needed on the agent's side. Poll on whatever cadence suits:

```
GET  /functions/v1/task-qa-agent/queue                      -> { count, states, tasks: [ {…task, client, run} ] }
GET  /functions/v1/task-qa-agent/queue?state=ready_for_review,qa_running
GET  /functions/v1/task-qa-agent/task/<task_id>             -> { task, client, credential, open_run, runs }
POST /functions/v1/task-qa-agent/claim   { "task_id": "…" } -> { run_id, started_at, acked_at, task, client, credential, adopted }
```

`/queue` defaults to `ready_for_review`. Ask for `qa_running` too and each row carries
`run: { id, started_at, acked_at }` for its open run, so an orphaned run (pushed but never
picked up) can be adopted: `/claim` on a task with an open run acknowledges and returns
**that** run (`adopted: true`) instead of opening a second one. `/claim` acknowledges
implicitly, so a pull-mode agent never needs `/ack`.

`claim` is optional; posting a verdict with only `task_id` opens and closes a run in one call.

## Writing the verdict (both options)

```
POST /functions/v1/task-qa-agent/verdict
x-qa-secret: <QA_AGENT_SECRET>
Content-Type: application/json

{
  "run_id": "…",                     // from push payload, /ack or /claim; or "task_id" instead
  "verdict": "revisions_required",   // approved | approved_with_notes | revisions_required | error
  "findings": [
    { "summary": "Hero H2 reads 'Roofing Services', expected 'Roof repair in Concord NH'",
      "severity": "major",           // blocker | major | minor | note
      "location": "Home > hero",
      "detail": "Checked published site." }
  ],
  "evidence": [ { "type": "screenshot", "url": "https://…", "label": "hero" } ],
  "doctrine_version": "seo-doctrine@2026-08",
  "client_record_hash": "sha256:…",
  "agent_thread_path": "viktor/threads/2026-09-02/acme-hero"
}
```

Response: `{ ok, run_id, task_id, qa_state }`. A run can be closed once; a second verdict for
the same `run_id` returns 409. Findings are free-form JSON, but the drawer renders
`summary` / `severity` / `location` / `detail` when present.

**Editor targets.** `qa_target_state = "editor"` cannot be checked headless (my.duda.co
refuses non-browser clients and needs a login). Report it as unverifiable, never as a pass.

**Contact-info (NAP) checks.** `client.nap` is the canonical name / address / phone / hours
from `client_locations` (the primary location, edited on the client's Marketing Profile →
Overview → Locations). Compare against it: `phone_digits` for phone in any format,
`address_text` or the parts for the address, `hours` per day (`[]` = closed, missing key =
closed). When `nap` is `null` the client has no location on file: report the check as
**unverifiable**, never as passed. When `nap.hours` is `null` the hours are unknown: same rule
for hours only. Multi-location clients: `client.locations` has every location, primary first;
match the page against the location it is about, defaulting to the primary.

### Correcting a verdict

A closed run is immutable. To correct one, post a **new** run that supersedes it:

```json
{ "task_id": "…", "supersedes_run_id": "<old run_id>", "verdict": "approved", "findings": [] }
```

This opens and closes a fresh run, sets `supersedes` on it and `superseded_by` on the old
one, and moves `qa_state` per the new verdict. UIs hide superseded runs by default. A plain
re-post with the old `run_id` still returns 409 (the error message includes this recipe).

## Reaper (pg_cron, every 5 minutes)

`public.task_qa_reap()` closes stalled runs:

| Condition | Run finding | Then |
|---|---|---|
| not acked, `started_at` > 5 min ago | `agent never acknowledged the dispatch` (`code: no_ack`) | `qa_attempts += 1`, task -> `ready_for_review` (re-dispatch) |
| acked, no verdict, `started_at` > 45 min ago | `agent acknowledged but never returned a verdict` (`code: no_verdict`) | same |
| either, and `qa_attempts` reaches 3 | same | task -> `revisions_required` + system comment on the task |

`qa_attempts` resets when a run closes with a real verdict or a person sends the task to QA
again from outside `qa_running`. Run it by hand with `select * from task_qa_reap();`.

## Testing on dev without an agent

- Flip a task to Ready for review in the drawer, then in Supabase → Edge Functions →
  `task-qa-dispatch` → Logs you should see the trigger's call (`no_webhook_configured` until a
  webhook URL is set).
- Simulate the agent with curl:

```bash
SECRET=… ; BASE=https://zlljsdaxsggkasvympku.supabase.co/functions/v1/task-qa-agent
curl -s -H "x-qa-secret: $SECRET" "$BASE/queue?state=ready_for_review,qa_running"
curl -s -H "x-qa-secret: $SECRET" -H "content-type: application/json" \
  -d '{"run_id":"<id>"}' $BASE/ack
curl -s -H "x-qa-secret: $SECRET" -H "content-type: application/json" \
  -d '{"run_id":"<id>","verdict":"approved_with_notes","findings":[{"summary":"Looks right","severity":"note"}]}' \
  $BASE/verdict
```

## Where things live

| Piece | Location |
|---|---|
| Trigger | `supabase/migrations/20260902140000_task_qa_dispatch_trigger.sql` (Vault-backed `net.http_post`) |
| Reaper + attempts | `supabase/migrations/20260910100002_task_qa_attempts_reaper.sql` |
| Clear QA on close | `supabase/migrations/20260910100003_task_qa_clear_on_terminal.sql` |
| Credential ref + resolver | `supabase/migrations/20260910100000_task_qa_credential_ref.sql` |
| ack / closed_by / supersession | `supabase/migrations/20260910100001_task_qa_runs_ack_supersede.sql` |
| Dispatch function | `supabase/functions/task-qa-dispatch/index.ts` |
| Agent endpoint | `supabase/functions/task-qa-agent/index.ts` |
| Shared vocabulary | `supabase/functions/_shared/taskQa.ts`, `src/lib/taskQa.ts` |
| Secrets | `QA_AGENT_SECRET` (required), `QA_AGENT_WEBHOOK_URL` (push mode only) |
| Down migrations | `supabase/migrations/down/20260910*.down.sql` |
