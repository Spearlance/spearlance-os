import { sanitizeDataForPrompt } from '../../validation/sanitize.ts';

export async function getCommunicationLogs(supabase: any, params: any, clientId: string, userRole: string) {
  let query = supabase
    .from('communication_logs')
    .select('id, subject_line, type, participants, last_message_at, tags, source, front_conversation_url, message_thread, internal_notes, attachments', { count: 'exact' })
    .eq('client_id', clientId);

  if (params.status) query = query.eq('status', params.status);
  if (params.tags && params.tags.length > 0) {
    query = query.contains('tags', params.tags);
  }
  if (params.date_from) query = query.gte('last_message_at', params.date_from);
  if (params.date_to) query = query.lte('last_message_at', params.date_to);
  if (params.query) {
    query = query.or(`subject_line.ilike.%${params.query}%,internal_notes.ilike.%${params.query}%`);
  }

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('last_message_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  // Process message threads for better AI context
  const processedData = (data || []).map((log: any) => {
    let messagePreview = '';

    // Extract text from message_thread (assuming it's an array of message objects)
    if (Array.isArray(log.message_thread) && log.message_thread.length > 0) {
      // Get last 3 messages or entire thread if shorter
      const recentMessages = log.message_thread.slice(-3);
      messagePreview = recentMessages
        .map((msg: any) => `[${msg.sender || 'Unknown'}]: ${msg.body || msg.text || ''}`)
        .join('\n');

      // Truncate if extremely long
      if (messagePreview.length > 2000) {
        messagePreview = messagePreview.substring(0, 2000) + '... [conversation continues]';
      }
    }

    return {
      id: log.id,
      subject_line: log.subject_line,
      type: log.type,
      participants: log.participants,
      last_message_at: log.last_message_at,
      tags: log.tags,
      source: log.source,
      front_conversation_url: log.front_conversation_url,
      message_preview: messagePreview,
      message_count: Array.isArray(log.message_thread) ? log.message_thread.length : 0,
      has_attachments: log.attachments && Object.keys(log.attachments).length > 0,
      // Only include internal_notes for FMM/Admin roles
      internal_notes: (userRole === 'admin' || userRole === 'fmm') ? log.internal_notes : undefined
    };
  });

  return {
    items: sanitizeDataForPrompt(processedData),
    result_count: processedData.length,
    total_count: count || 0,
    next_offset: processedData.length >= limit ? offset + limit : null
  };
}

export async function getTickets(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('tickets')
    .select('id, title, status, priority, category, updated_at', { count: 'exact' })
    .eq('client_id', clientId);

  if (params.status) query = query.eq('status', params.status);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0,
    total_count: count || 0,
    next_offset: (data?.length || 0) >= limit ? offset + limit : null
  };
}
