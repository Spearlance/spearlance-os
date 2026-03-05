export async function buildClientSnapshot(
  supabase: any,
  clientId: string,
): Promise<string> {
  try {
    const [
      clientResult,
      servicesResult,
      avatarsResult,
      goalsResult,
      taskCountsResult,
      recentMeetingsResult,
      recentLeadsResult,
      brandVoiceResult,
    ] = await Promise.all([
      supabase.from('clients').select('name, industry, website_url').eq('id', clientId).maybeSingle(),
      supabase.from('services').select('name, description').eq('client_id', clientId).limit(10),
      supabase.from('avatars').select('name, description').eq('client_id', clientId).limit(5),
      supabase.from('quarterly_goals').select('title, goal, status, target_metric').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('status').eq('client_id', clientId),
      supabase.from('meetings').select('summary, date_time').eq('client_id', clientId).order('date_time', { ascending: false }).limit(5),
      supabase.from('website_form_submissions').select('id, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20),
      supabase.from('client_brand_voice').select('voice_summary, tone_keywords').eq('client_id', clientId).maybeSingle(),
    ]);

    const client = clientResult.data;
    const services = servicesResult.data || [];
    const avatars = avatarsResult.data || [];
    const goals = goalsResult.data || [];
    const allTasks = taskCountsResult.data || [];
    const meetings = recentMeetingsResult.data || [];
    const leads = recentLeadsResult.data || [];
    const brandVoice = brandVoiceResult.data;

    const tasksByStatus: Record<string, number> = {};
    for (const t of allTasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    }
    const openTasks = (tasksByStatus['to_do'] || 0) + (tasksByStatus['in_progress'] || 0);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLeadCount = leads.filter((l: any) => new Date(l.created_at) > weekAgo).length;

    const parts: string[] = ['CLIENT KNOWLEDGE SNAPSHOT:'];

    if (client) {
      parts.push(`Business: "${client.name}"${client.industry ? ` — ${client.industry}` : ''}${client.website_url ? ` (${client.website_url})` : ''}`);
    }

    if (services.length > 0) {
      parts.push(`Services: ${services.map((s: any) => s.name).join(', ')}`);
    }

    if (avatars.length > 0) {
      parts.push(`Target Customers: ${avatars.map((a: any) => `${a.name}${a.description ? ` — ${a.description.slice(0, 80)}` : ''}`).join('; ')}`);
    }

    if (goals.length > 0) {
      parts.push(`Active Goals: ${goals.map((g: any) => `${g.title || g.goal}${g.status ? ` (${g.status})` : ''}`).join('; ')}`);
    }

    parts.push(`Tasks: ${allTasks.length} total, ${openTasks} open${tasksByStatus['in_progress'] ? `, ${tasksByStatus['in_progress']} in progress` : ''}`);

    if (meetings.length > 0) {
      parts.push(`Recent Meetings: ${meetings.slice(0, 3).map((m: any) => `"${(m.summary || 'Meeting').slice(0, 50)}" (${new Date(m.date_time).toLocaleDateString()})`).join('; ')}`);
    }

    if (recentLeadCount > 0) {
      parts.push(`Recent Leads: ${recentLeadCount} new this week`);
    }

    if (brandVoice?.voice_summary) {
      parts.push(`Brand Voice: ${brandVoice.voice_summary.slice(0, 150)}`);
    }

    parts.push('Use semantic_search tool for detailed information about any of the above.');

    return parts.join('\n');
  } catch (err: any) {
    console.error('[buildClientSnapshot] Error:', err);
    return 'CLIENT KNOWLEDGE SNAPSHOT: Error loading snapshot. Use tool calls for data.';
  }
}
