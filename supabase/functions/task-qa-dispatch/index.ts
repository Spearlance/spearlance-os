import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { json, loadOpenRun, loadTaskContext, secretMatches } from '../_shared/taskQa.ts';

// Called by the task_qa_dispatch DB trigger (pg_net, service-role bearer) when
// a task enters qa_state = 'ready_for_review'.
//
//   PUSH mode (QA_AGENT_WEBHOOK_URL set): open a task_qa_runs row, move the
//     task to 'qa_running', POST the context bundle to the agent's webhook
//     with the shared secret in `x-qa-secret`. If delivery fails the run is
//     closed as 'error' (closed_by = dispatch) and the task goes back to
//     'ready_for_review'.
//   PULL / manual mode (no webhook): do nothing. The task waits at
//     'ready_for_review' for the agent to pull it (task-qa-agent /queue +
//     /claim) or for a person to record a verdict in the drawer.
//
// A 2xx from the webhook proves delivery, nothing more. The agent must POST
// /task-qa-agent/ack { run_id } once it actually starts; task_qa_reap() (pg_cron,
// every 5 min) closes runs that were never acked or never got a verdict and
// re-queues the task, giving up after 3 attempts.
//
// Guards:
//   * run_already_open: a run with finished_at IS NULL exists -> nothing inserted.
//   * recent_error: the latest run is a DELIVERY failure (closed_by = dispatch)
//     from the last 10 minutes -> not re-dispatched, so a dead webhook cannot
//     loop. Reaper-closed runs are deliberate retries and are not blocked.
//
// The dispatch payload never carries the QA credential; the agent fetches it
// from /ack or /claim. Nothing in the payload is logged.

const RECENT_ERROR_WINDOW_MS = 10 * 60 * 1000;

function isServiceRoleJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // verify_jwt = true, so the gateway has already checked the signature; we
  // only need to confirm the caller is the service role (the DB trigger via
  // Vault), not an app user. Comparing raw key strings is brittle across key
  // rotations, so decode the JWT claims instead.
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!isServiceRoleJwt(bearer) && !secretMatches(bearer, serviceKey)) {
    return json(401, { error: 'Service role required' });
  }

  let body: { task_id?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  if (!body.task_id) return json(400, { error: 'task_id required' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const webhookUrl = Deno.env.get('QA_AGENT_WEBHOOK_URL');
  const secret = Deno.env.get('QA_AGENT_SECRET');

  try {
    const ctx = await loadTaskContext(supabase, body.task_id);
    if (!ctx) return json(404, { error: 'Task not found' });
    const { task, client } = ctx;

    if (task.qa_state !== 'ready_for_review') {
      return json(200, { dispatched: false, reason: `qa_state is ${task.qa_state ?? 'null'}, not ready_for_review` });
    }

    // Guard 1: never open a second run on a task that already has one open.
    const openRun = await loadOpenRun(supabase, task.id);
    if (openRun) {
      console.warn(`task ${task.id}: run ${openRun.id} already open, not dispatching`);
      return json(200, { dispatched: false, reason: 'run_already_open', run_id: openRun.id });
    }

    // Guard 2: a delivery failure in the last 10 minutes -> don't hammer a dead webhook.
    const { data: lastRun } = await supabase
      .from('task_qa_runs')
      .select('id, verdict, finished_at, closed_by')
      .eq('task_id', task.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastWasDeliveryFailure = lastRun?.verdict === 'error' && (lastRun.closed_by ?? 'dispatch') === 'dispatch';
    if (
      lastWasDeliveryFailure &&
      lastRun?.finished_at &&
      Date.now() - new Date(lastRun.finished_at).getTime() < RECENT_ERROR_WINDOW_MS
    ) {
      console.warn(`task ${task.id}: last delivery failed recently, not re-dispatching`);
      return json(200, { dispatched: false, reason: 'recent_error' });
    }

    if (!webhookUrl) {
      console.log(`task ${task.id} ready for review; no QA_AGENT_WEBHOOK_URL, waiting for pull/manual`);
      return json(200, { dispatched: false, reason: 'no_webhook_configured' });
    }

    // Open the run and mark the task as running
    const { data: run, error: runError } = await supabase
      .from('task_qa_runs')
      .insert({
        task_id: task.id,
        client_id: task.client_id,
        target_url: task.qa_target_url,
        target_state: task.qa_target_state,
        agent_thread_path: task.viktor_thread_path,
      })
      .select('id, started_at')
      .single();
    if (runError || !run) throw new Error(`open run: ${runError?.message}`);

    await supabase.from('tasks').update({ qa_state: 'qa_running' }).eq('id', task.id);

    const agentBase = `${supabaseUrl}/functions/v1/task-qa-agent`;
    const payload = {
      event: 'task.ready_for_review',
      run_id: run.id,
      dispatched_at: run.started_at,
      attempt: (task.qa_attempts ?? 0) + 1,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        acceptance_criteria: task.acceptance_criteria,
        qa_target_url: task.qa_target_url,
        qa_target_state: task.qa_target_state,
        priority: task.priority,
        due_date: task.due_date,
        external_source: task.external_source,
        external_ref: task.external_ref,
        thread_path: task.viktor_thread_path,
        url: `https://os.spearlance.com/tasks?client=${task.client_id}&selected=${task.id}`,
      },
      client: client
        ? {
            id: client.id,
            name: client.name,
            brand_name: client.brand_name,
            website_url: client.website_url,
            duda_site_id: client.site_id,
            industry: client.industry,
          }
        : null,
      // The login for the target, if any, is NOT in this payload. It comes
      // back from /ack (or /claim) as `credential`.
      has_credential: !!task.qa_credential_ref,
      callback: {
        ack_url: `${agentBase}/ack`,
        verdict_url: `${agentBase}/verdict`,
        header: 'x-qa-secret',
      },
    };

    let deliveryError: string | null = null;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-qa-secret': secret } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) deliveryError = `webhook responded ${res.status}`;
    } catch (e) {
      deliveryError = e instanceof Error ? e.message : String(e);
    }

    if (deliveryError) {
      console.error(`task ${task.id}: dispatch failed: ${deliveryError}`);
      await supabase
        .from('task_qa_runs')
        .update({
          verdict: 'error',
          finished_at: new Date().toISOString(),
          closed_by: 'dispatch',
          findings: [{ summary: `Could not reach the QA agent: ${deliveryError}`, severity: 'blocker', code: 'delivery_failed' }],
        })
        .eq('id', run.id);
      await supabase.from('tasks').update({ qa_state: 'ready_for_review' }).eq('id', task.id);
      return json(502, { dispatched: false, run_id: run.id, error: deliveryError });
    }

    return json(200, { dispatched: true, run_id: run.id });
  } catch (error) {
    console.error('task-qa-dispatch error:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
