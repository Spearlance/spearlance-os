import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { json, loadTaskContext, secretMatches } from '../_shared/taskQa.ts';

// Called by the task_qa_dispatch DB trigger (pg_net, service-role bearer) when
// a task enters qa_state = 'ready_for_review'.
//
//   PUSH mode (QA_AGENT_WEBHOOK_URL set): open a task_qa_runs row, move the
//     task to 'qa_running', POST the context bundle to the agent's webhook
//     with the shared secret in `x-qa-secret`. If delivery fails the run is
//     closed as 'error' and the task goes back to 'ready_for_review'.
//   PULL / manual mode (no webhook): do nothing. The task waits at
//     'ready_for_review' for the agent to pull it (task-qa-agent /queue +
//     /claim) or for a person to record a verdict in the drawer.
//
// Loop guard: a task whose latest run errored in the last 10 minutes is not
// re-dispatched (the 'error' verdict hands the task back to ready_for_review,
// which would otherwise fire this trigger again immediately).

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

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const webhookUrl = Deno.env.get('QA_AGENT_WEBHOOK_URL');
  const secret = Deno.env.get('QA_AGENT_SECRET');

  try {
    const ctx = await loadTaskContext(supabase, body.task_id);
    if (!ctx) return json(404, { error: 'Task not found' });
    const { task, client } = ctx;

    if (task.qa_state !== 'ready_for_review') {
      return json(200, { dispatched: false, reason: `qa_state is ${task.qa_state ?? 'null'}, not ready_for_review` });
    }

    // Loop guard
    const { data: lastRun } = await supabase
      .from('task_qa_runs')
      .select('id, verdict, finished_at')
      .eq('task_id', task.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      lastRun?.verdict === 'error' &&
      lastRun.finished_at &&
      Date.now() - new Date(lastRun.finished_at).getTime() < RECENT_ERROR_WINDOW_MS
    ) {
      console.warn(`task ${task.id}: last run errored recently, not re-dispatching`);
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

    const payload = {
      event: 'task.ready_for_review',
      run_id: run.id,
      dispatched_at: run.started_at,
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
      callback: {
        verdict_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/task-qa-agent/verdict`,
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
          findings: [{ summary: `Could not reach the QA agent: ${deliveryError}`, severity: 'blocker' }],
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
