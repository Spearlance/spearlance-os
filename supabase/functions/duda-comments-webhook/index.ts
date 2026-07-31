import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// Receives Duda site-comment webhooks (NEW_CONVERSATION, NEW_COMMENT,
// CONVERSATION_UPDATED, COMMENT_EDITED, COMMENT_DELETED) and turns them into
// tasks on the client board bound to the request's webhook token.
// Also accepts flat payloads ({ comment, site_name, page_url, author }) so the
// sender can forward via Zapier/Make instead of Duda's native webhooks.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const EXTERNAL_SOURCE = 'duda_comment';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || req.headers.get('x-webhook-token');
    if (!token) {
      return json(401, { error: 'Missing webhook token' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokenRow } = await supabase
      .from('client_webhook_tokens')
      .select('id, client_id')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();

    if (!tokenRow) {
      console.warn('Rejected webhook call with invalid or inactive token');
      return json(401, { error: 'Invalid webhook token' });
    }
    const clientId = tokenRow.client_id;

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
    console.log('Duda comment webhook payload:', JSON.stringify(payload));

    supabase
      .from('client_webhook_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRow.id)
      .then(() => {});

    // ---- Normalize Duda native + flat payload shapes ----
    const eventType: string = (payload.event_type || '').toUpperCase();
    const siteName: string | null =
      payload.resource_data?.site_name || payload.site_name || payload.site_id || null;
    const commentText: string | null =
      payload.data?.comment?.text ?? payload.comment ?? payload.text ?? payload.message ?? null;
    const conversationUuid: string | null =
      payload.data?.conversation_uuid || payload.conversation_uuid || null;
    const author: string | null =
      payload.source?.account_name || payload.author || payload.email || null;
    const pageUuid: string | null = payload.data?.conversation_context?.page_uuid ?? null;
    const pageUrl: string | null = payload.page_url || null;
    const device: string | null = payload.data?.conversation_context?.device ?? null;
    const receivedAt = payload.event_timestamp
      ? new Date(payload.event_timestamp).toISOString()
      : new Date().toISOString();

    const findTask = async () => {
      if (!conversationUuid) return null;
      const { data } = await supabase
        .from('tasks')
        .select('id, description, status')
        .eq('client_id', clientId)
        .eq('external_source', EXTERNAL_SOURCE)
        .eq('external_ref', conversationUuid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    };

    const findColumn = async (mappedStatus: string) => {
      const { data } = await supabase
        .from('task_columns')
        .select('id, mapped_status')
        .eq('client_id', clientId)
        .eq('mapped_status', mappedStatus)
        .order('display_order')
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    };

    const appendToTask = async (taskId: string, existingDescription: string | null, html: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ description: (existingDescription || '') + html, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw new Error(`Failed to update task: ${error.message}`);
    };

    const authorLabel = author ? escapeHtml(author) : 'Unknown commenter';
    const timeLabel = new Date(receivedAt).toUTCString();

    const createTask = async () => {
      const text = commentText || '(no comment text)';
      const excerpt = text.length > 80 ? `${text.slice(0, 77)}...` : text;

      const metaParts: string[] = [];
      if (siteName) {
        metaParts.push(
          `Site: <strong>${escapeHtml(siteName)}</strong> (<a href="https://my.duda.co/home/site/${escapeHtml(siteName)}" target="_blank">open in Duda editor</a>)`
        );
      }
      if (pageUrl) metaParts.push(`Page: <a href="${escapeHtml(pageUrl)}" target="_blank">${escapeHtml(pageUrl)}</a>`);
      else if (pageUuid) metaParts.push(`Page ID: ${escapeHtml(pageUuid)}`);
      if (device) metaParts.push(`Device: ${escapeHtml(device)}`);
      if (conversationUuid) metaParts.push(`Conversation: ${escapeHtml(conversationUuid)}`);
      metaParts.push(`Received: ${timeLabel}`);

      const description =
        `<p><strong>Duda site comment</strong> from ${authorLabel}</p>` +
        `<blockquote>${escapeHtml(text)}</blockquote>` +
        `<p>${metaParts.join('<br/>')}</p>`;

      const columnId = (await findColumn('to_do')) ?? null;

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          client_id: clientId,
          title: `Duda comment: "${excerpt}"`,
          description,
          status: 'to_do',
          priority: 'normal',
          column_id: columnId,
          external_source: EXTERNAL_SOURCE,
          external_ref: conversationUuid,
        })
        .select('id')
        .single();
      if (error) throw new Error(`Failed to create task: ${error.message}`);

      // Notify admin/FMM users (comments come from the client, tasks are for the team)
      const { data: clientRow } = await supabase
        .from('clients')
        .select('name, company_name, brand_name')
        .eq('id', clientId)
        .single();
      const clientName =
        clientRow?.brand_name || clientRow?.company_name || clientRow?.name || 'a client';

      const { data: teamUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'fmm']);

      const userIds = [...new Set((teamUsers || []).map((u) => u.user_id))];
      if (userIds.length > 0) {
        const { error: notifError } = await supabase.from('notifications').insert(
          userIds.map((userId) => ({
            user_id: userId,
            type: 'comment_added',
            title: 'New Duda Comment',
            description: `${author || 'Someone'} commented on the ${clientName} website`,
            client_id: clientId,
            action_url: `/tasks?client=${clientId}&selected=${task.id}`,
            priority: 'normal',
            read_flag: false,
            payload_json: {
              task_id: task.id,
              site_name: siteName,
              conversation_uuid: conversationUuid,
              author,
            },
          }))
        );
        if (notifError) console.error('Error creating notifications:', notifError);
      }

      return task.id;
    };

    // ---- Route by event type ----
    // No event_type = flat/custom payload; treat any payload with text as a new comment.
    if (!eventType || eventType === 'NEW_CONVERSATION') {
      if (!commentText) {
        return json(400, { error: 'No comment text found in payload' });
      }
      const existing = await findTask();
      if (existing) {
        // Duda retries / duplicate delivery — don't create a second task
        return json(200, { success: true, task_id: existing.id, action: 'duplicate_ignored' });
      }
      const taskId = await createTask();
      return json(200, { success: true, task_id: taskId, action: 'task_created' });
    }

    if (eventType === 'NEW_COMMENT') {
      const existing = await findTask();
      if (existing) {
        await appendToTask(
          existing.id,
          existing.description,
          `<p><strong>Reply</strong> from ${authorLabel} (${timeLabel}):</p><blockquote>${escapeHtml(commentText || '')}</blockquote>`
        );
        return json(200, { success: true, task_id: existing.id, action: 'reply_appended' });
      }
      if (!commentText) return json(400, { error: 'No comment text found in payload' });
      const taskId = await createTask();
      return json(200, { success: true, task_id: taskId, action: 'task_created' });
    }

    if (eventType === 'COMMENT_EDITED') {
      const existing = await findTask();
      if (existing) {
        await appendToTask(
          existing.id,
          existing.description,
          `<p><strong>Comment edited</strong> by ${authorLabel} (${timeLabel}):</p><blockquote>${escapeHtml(commentText || '')}</blockquote>`
        );
        return json(200, { success: true, task_id: existing.id, action: 'edit_appended' });
      }
      return json(200, { success: true, action: 'ignored_no_matching_task' });
    }

    if (eventType === 'CONVERSATION_UPDATED') {
      const existing = await findTask();
      if (!existing) return json(200, { success: true, action: 'ignored_no_matching_task' });

      const status = (payload.data?.conversation_properties?.status || '').toLowerCase();
      const deleted = payload.data?.conversation_properties?.deleted === true;

      if (deleted) {
        await appendToTask(
          existing.id,
          existing.description,
          `<p><strong>Conversation deleted in Duda</strong> by ${authorLabel} (${timeLabel}).</p>`
        );
        return json(200, { success: true, task_id: existing.id, action: 'deletion_noted' });
      }

      if (status.startsWith('resolv')) {
        const doneColumnId = await findColumn('done');
        const { error } = await supabase
          .from('tasks')
          .update({
            status: 'done',
            column_id: doneColumnId ?? undefined,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw new Error(`Failed to complete task: ${error.message}`);
        return json(200, { success: true, task_id: existing.id, action: 'task_completed' });
      }

      // Reopened in Duda — move back to To Do unless someone already finished it here
      if (existing.status === 'done') {
        const todoColumnId = await findColumn('to_do');
        const { error } = await supabase
          .from('tasks')
          .update({
            status: 'to_do',
            column_id: todoColumnId ?? undefined,
            completed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw new Error(`Failed to reopen task: ${error.message}`);
        return json(200, { success: true, task_id: existing.id, action: 'task_reopened' });
      }
      return json(200, { success: true, task_id: existing.id, action: 'no_change' });
    }

    if (eventType === 'COMMENT_DELETED') {
      const existing = await findTask();
      if (existing) {
        await appendToTask(
          existing.id,
          existing.description,
          `<p><strong>A comment in this conversation was deleted in Duda</strong> (${timeLabel}).</p>`
        );
        return json(200, { success: true, task_id: existing.id, action: 'deletion_noted' });
      }
      return json(200, { success: true, action: 'ignored_no_matching_task' });
    }

    console.log(`Unhandled event_type: ${eventType}`);
    return json(200, { success: true, action: 'ignored_unhandled_event' });
  } catch (error) {
    console.error('Unexpected error processing Duda comment webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json(500, { error: 'Internal server error', details: message });
  }
});
