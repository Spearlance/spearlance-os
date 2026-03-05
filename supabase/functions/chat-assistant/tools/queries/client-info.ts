// Tool implementations - all enforce client_id scoping
export async function getClientInfo(supabase: any, clientId: string) {
  const { data: client } = await supabase
    .from('clients')
    .select('name, status, website_url')
    .eq('id', clientId)
    .single();

  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  const { count: reportsCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  return {
    name: client?.name,
    status: client?.status,
    website: client?.website_url,
    tasks_count: tasksCount || 0,
    reports_count: reportsCount || 0
  };
}

// Helper function to assess comprehensive account status
export async function assessAccountStatus(supabase: any, clientId: string) {
  try {
    // Gather comprehensive account status data in parallel
    const [
      clientInfo,
      avatars,
      tasks,
      channels,
      reports,
      meetings,
      assets,
      launchpad
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('avatars').select('*').eq('client_id', clientId),
      supabase.from('tasks').select('*').eq('client_id', clientId),
      supabase.from('marketing_flow_channels')
        .select(`
          *,
          stage:marketing_flow_stages!inner(
            flow:marketing_flows!inner(client_id)
          )
        `)
        .eq('stage.flow.client_id', clientId),
      supabase.from('reports').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
      supabase.from('meetings').select('*').eq('client_id', clientId).gte('date_time', new Date(Date.now() - 30*24*60*60*1000).toISOString()),
      supabase.from('assets').select('*').eq('client_id', clientId),
      supabase.from('launchpad_submissions').select('stage, completed_at').eq('client_id', clientId).maybeSingle()
    ]);

    // Calculate task metrics
    const taskList = tasks.data || [];
    const taskMetrics = {
      total: taskList.length,
      done: taskList.filter((t: any) => t.status === 'done').length,
      in_progress: taskList.filter((t: any) => t.status === 'in_progress').length,
      to_do: taskList.filter((t: any) => t.status === 'to_do').length
    };

    // Calculate channel metrics
    const channelList = channels.data || [];
    const channelMetrics = {
      total: channelList.length,
      active: channelList.filter((c: any) => c.status === 'active').length,
      avg_progress: channelList.length > 0
        ? Math.round(channelList.reduce((sum: number, c: any) => sum + (c.progress || 0), 0) / channelList.length)
        : 0
    };

    // Build comprehensive status object
    return {
      launchpad: {
        stage: launchpad.data?.stage || 'not_started',
        is_complete: launchpad.data?.stage === 'complete',
        completed_stages: launchpad.data?.completed_at ? Object.keys(launchpad.data.completed_at) : []
      },
      avatars: {
        count: avatars.data?.length || 0,
        has_avatars: (avatars.data?.length || 0) > 0
      },
      tasks: taskMetrics,
      channels: channelMetrics,
      reports: {
        total: reports.data?.length || 0,
        recent: reports.data || []
      },
      meetings: {
        recent_count: meetings.data?.length || 0
      },
      assets: {
        count: assets.data?.length || 0
      },
      client_info: clientInfo.data
    };
  } catch (error) {
    console.error('Error assessing account status:', error);
    return { error: 'Failed to assess account status' };
  }
}
