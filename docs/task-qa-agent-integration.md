# Task QA: agent integration

How the QA agent ("Viktor") gets work from SpearlanceOS and writes verdicts back.
Everything here is live on **dev** (`https://zlljsdaxsggkasvympku.supabase.co`) as of
2026-09-02; prod gets it when the task-QA work is promoted.

## The loop

1. A person opens a task, fills in **acceptance criteria** and a **QA target** (URL +
   editor/published) on the QA tab, and clicks **Send to QA**. `tasks.qa_state` becomes
   `ready_for_review`.
2. The database trigger `task_qa_dispatch` posts to the `task-qa-dispatch` edge function.
3. The agent gets the task one of two ways (below), checks the page, and posts a verdict to
   `task-qa-agent/verdict`.
4. The verdict is appended to `task_qa_runs` and `qa_state` moves to `qa_approved` or
   `revisions_required` (or back to `ready_for_review` on `error`). The drawer shows the run,
   the card shows the pill.

Nothing in the loop touches `tasks.status` or the kanban column. Completing the task after
approval is still a human action (drag to Done).

## Auth: one shared secret

Every call to `task-qa-agent` carries the header `x-qa-secret: <QA_AGENT_SECRET>`. In push
mode, the same header is sent *to* the agent so it can verify the call came from us. No
Supabase keys are given to the agent. The secret is an edge-function secret
(`supabase secrets set QA_AGENT_SECRET=...`); it is not in the repo.

## Option A: push (we call the agent)

Set `QA_AGENT_WEBHOOK_URL` on the edge functions. When a task enters `ready_for_review`,
`task-qa-dispatch` opens a run, sets `qa_running`, and POSTs:

```json
{
  "event": "task.ready_for_review",
  "run_id": "…uuid…",
  "dispatched_at": "2026-09-02T15:00:00Z",
  "task": {
    "id": "…uuid…",
    "title": "Fix hero headline on Concord page",
    "description": "<p>…html…</p>",
    "acceptance_criteria": "- Hero H2 reads \"Roof repair in Concord NH\"\n- Header phone matches client record",
    "qa_target_url": "https://my.duda.co/site/abc12345",
    "qa_target_state": "editor",
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
    "industry": "Construction"
  },
  "callback": {
    "verdict_url": "https://zlljsdaxsggkasvympku.supabase.co/functions/v1/task-qa-agent/verdict",
    "header": "x-qa-secret"
  }
}
```

If the webhook is unreachable or returns non-2xx, the run is closed as `error` and the task
returns to `ready_for_review`. A task whose last run errored in the previous 10 minutes is
not re-dispatched, so a dead webhook cannot loop.

If `QA_AGENT_WEBHOOK_URL` is **not** set, dispatch does nothing and the task simply waits
(Option B or a human verdict).

## Option B: pull (the agent calls us)

No endpoint needed on the agent's side. Poll on whatever cadence suits:

```
GET  /functions/v1/task-qa-agent/queue          -> { count, tasks: [ {…task, client} ] }
GET  /functions/v1/task-qa-agent/task/<task_id> -> { task, client, runs }
POST /functions/v1/task-qa-agent/claim          { "task_id": "…" }
                                                -> { run_id, task, client }  (task -> qa_running)
```

`claim` is optional; posting a verdict with only `task_id` opens and closes a run in one call.

## Writing the verdict (both options)

```
POST /functions/v1/task-qa-agent/verdict
x-qa-secret: <QA_AGENT_SECRET>
Content-Type: application/json

{
  "run_id": "…",                     // from push payload or /claim; or "task_id" instead
  "verdict": "revisions_required",   // approved | approved_with_notes | revisions_required | error
  "findings": [
    { "summary": "Hero H2 reads 'Roofing Services', expected 'Roof repair in Concord NH'",
      "severity": "major",           // blocker | major | minor | note
      "location": "Home > hero",
      "detail": "Checked editor state; published site not compared." }
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

## Testing on dev without an agent

- Flip a task to Ready for review in the drawer, then in Supabase → Edge Functions →
  `task-qa-dispatch` → Logs you should see the trigger's call (`no_webhook_configured` until a
  webhook URL is set).
- Simulate the agent with curl:

```bash
SECRET=… ; BASE=https://zlljsdaxsggkasvympku.supabase.co/functions/v1/task-qa-agent
curl -s -H "x-qa-secret: $SECRET" $BASE/queue
curl -s -H "x-qa-secret: $SECRET" -H "content-type: application/json" \
  -d '{"task_id":"<id>","verdict":"approved_with_notes","findings":[{"summary":"Looks right","severity":"note"}]}' \
  $BASE/verdict
```

## Where things live

| Piece | Location |
|---|---|
| Trigger | `supabase/migrations/20260902140000_task_qa_dispatch_trigger.sql` (Vault-backed `net.http_post`) |
| Dispatch function | `supabase/functions/task-qa-dispatch/index.ts` |
| Agent endpoint | `supabase/functions/task-qa-agent/index.ts` |
| Shared vocabulary | `supabase/functions/_shared/taskQa.ts`, `src/lib/taskQa.ts` |
| Secrets | `QA_AGENT_SECRET` (required), `QA_AGENT_WEBHOOK_URL` (push mode only) |
| Down migration | `supabase/migrations/down/20260902140000_task_qa_dispatch_trigger.down.sql` |
