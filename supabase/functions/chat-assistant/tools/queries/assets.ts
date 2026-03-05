import { sanitizeDataForPrompt } from '../../validation/sanitize.ts';

export async function searchAssets(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('assets')
    .select('id, title, type, file_url, preview_url, tags, created_at', { count: 'exact' })
    .eq('client_id', clientId);

  if (params.query) {
    query = query.or(`title.ilike.%${params.query}%,tags.cs.{${params.query}}`);
  }

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0,
    total_count: count || 0,
    next_offset: (data?.length || 0) >= limit ? offset + limit : null
  };
}

export async function getServices(supabase: any, clientId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, key_benefits')
    .eq('client_id', clientId)
    .order('name');

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0
  };
}

export async function getAvatars(supabase: any, clientId: string) {
  const { data, error } = await supabase
    .from('avatars')
    .select('id, avatar_name, demographics, firmographics, goals, pains, ai_summary')
    .eq('client_id', clientId)
    .order('avatar_name');

  if (error) throw error;

  // Truncate AI summary to 120 chars
  const truncated = (data || []).map((avatar: any) => ({
    ...avatar,
    ai_summary: avatar.ai_summary?.slice(0, 120) + (avatar.ai_summary?.length > 120 ? '...' : '')
  }));

  return {
    items: sanitizeDataForPrompt(truncated),
    result_count: data?.length || 0
  };
}

export async function getMarketingTools(supabase: any, clientId: string) {
  const { data, error } = await supabase
    .from('marketing_tools')
    .select('id, name, category, url, description, cost_per_month')
    .eq('client_id', clientId)
    .order('category, name');

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0
  };
}

export async function getMarketingChannels(supabase: any, params: any, clientId: string) {
  // First get the flow for this client
  const { data: flow } = await supabase
    .from('marketing_flows')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!flow) {
    return { items: [], result_count: 0, total_count: 0 };
  }

  let query = supabase
    .from('marketing_flow_channels')
    .select(`
      id,
      name,
      status,
      ownership,
      progress,
      stage:marketing_flow_stages!stage_id(name, order_index)
    `, { count: 'exact' })
    .eq('stage.flow_id', flow.id);

  if (params.stage) query = query.eq('stage.name', params.stage);
  if (params.ownership) query = query.eq('ownership', params.ownership);

  const limit = Math.min(params.limit || 50, 50);

  query = query.limit(limit);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0,
    total_count: count || 0
  };
}

export async function getMarketingIdeas(supabase: any, clientId: string) {
  const { data, error } = await supabase
    .from('marketing_ideas')
    .select('id, title, status, tags, offer_type, created_at, content')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(10); // Get last 10 ideas

  if (error) throw error;

  // Extract key info from each idea (title, offer type, score if available)
  const simplified = (data || []).map((idea: any) => {
    const content = idea.content;
    let offerScore = null;

    // Try to extract offer score from content
    if (typeof content === 'object' && content.markdown) {
      const scoreMatch = content.markdown.match(/Complete Offer Score[:\s]*(\d+)\/100/i);
      if (scoreMatch) offerScore = parseInt(scoreMatch[1]);
    }

    return {
      id: idea.id,
      title: idea.title,
      status: idea.status,
      tags: idea.tags,
      offer_type: idea.offer_type,
      created_at: idea.created_at,
      offer_score: offerScore
    };
  });

  return {
    items: sanitizeDataForPrompt(simplified),
    result_count: data?.length || 0
  };
}
