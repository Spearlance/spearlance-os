import { sanitizeDataForPrompt } from '../../validation/sanitize.ts';

export async function getMeetings(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('meetings')
    .select('id, date_time, summary, attendees, status, decisions, next_steps, transcript_text, recording_url, tags', { count: 'exact' })
    .eq('client_id', clientId);

  if (params.date_from) query = query.gte('date_time', params.date_from);
  if (params.date_to) query = query.lte('date_time', params.date_to);
  if (params.status) query = query.eq('status', params.status);

  const limit = Math.min(params.limit || 50, 50);
  const offset = params.offset || 0;

  query = query.order('date_time', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  // Return full data without truncation for better AI context
  const fullData = (data || []).map((m: any) => ({
    ...m,
    has_transcript: !!m.transcript_text,
    has_recording: !!m.recording_url,
    // Only truncate transcript if extremely long (>5000 chars)
    transcript_text: m.transcript_text?.length > 5000
      ? m.transcript_text.substring(0, 5000) + '... [transcript truncated, full version available]'
      : m.transcript_text
  }));

  return {
    items: sanitizeDataForPrompt(fullData),
    result_count: fullData.length,
    total_count: count || 0,
    next_offset: fullData.length >= limit ? offset + limit : null
  };
}

export async function searchMeetingNotes(supabase: any, params: any, clientId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .select('id, date_time, summary, decisions, next_steps')
    .eq('client_id', clientId)
    .or(`summary.ilike.%${params.query}%`)
    .order('date_time', { ascending: false })
    .limit(Math.min(params.limit || 20, 20));

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0
  };
}
