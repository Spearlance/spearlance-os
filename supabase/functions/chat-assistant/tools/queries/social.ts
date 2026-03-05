import { sanitizeDataForPrompt } from '../../validation/sanitize.ts';

// Get social media posts from content calendar
export async function getSocialMediaPosts(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('social_media_posts')
    .select('id, status, scheduled_date, posted_at, platforms, topic_category, caption_text, hashtags, image_url, late_status, late_error_message', { count: 'exact' })
    .eq('client_id', clientId);

  // Apply filters
  if (params.status) query = query.eq('status', params.status);
  if (params.platform) {
    query = query.contains('platforms', [params.platform]);
  }
  if (params.topic_category) query = query.eq('topic_category', params.topic_category);
  if (params.date_from) query = query.gte('scheduled_date', params.date_from);
  if (params.date_to) query = query.lte('scheduled_date', params.date_to);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('scheduled_date', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  // Check which posts have analytics
  const postIds = (data || []).map((p: any) => p.id);
  const { data: analyticsData } = await supabase
    .from('social_post_analytics')
    .select('post_id')
    .in('post_id', postIds);

  const analyticsSet = new Set((analyticsData || []).map((a: any) => a.post_id));

  const processedPosts = (data || []).map((post: any) => ({
    id: post.id,
    status: post.status,
    scheduled_date: post.scheduled_date,
    posted_at: post.posted_at,
    platforms: post.platforms,
    topic_category: post.topic_category,
    caption_preview: post.caption_text?.substring(0, 150) || '',
    hashtags: post.hashtags,
    has_image: !!post.image_url,
    late_status: post.late_status,
    has_error: !!post.late_error_message,
    error_message: post.late_error_message,
    has_analytics: analyticsSet.has(post.id)
  }));

  return {
    items: sanitizeDataForPrompt(processedPosts),
    result_count: processedPosts.length,
    total_count: count || 0,
    next_offset: processedPosts.length >= limit ? offset + limit : null
  };
}

// Get social media post analytics
export async function getSocialPostAnalytics(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('social_post_analytics')
    .select(`
      id, post_id, platform, published_at, impressions, reach, engagement,
      likes, comments, shares, saves, clicks, synced_at,
      social_media_posts!inner(client_id, caption_text, topic_category, platforms)
    `, { count: 'exact' })
    .eq('social_media_posts.client_id', clientId);

  // Apply filters
  if (params.post_id) query = query.eq('post_id', params.post_id);
  if (params.platform) query = query.eq('platform', params.platform);
  if (params.date_from) query = query.gte('published_at', params.date_from);
  if (params.date_to) query = query.lte('published_at', params.date_to);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  // Default sort by published_at unless specified
  const sortBy = params.sort_by || 'published_at';
  query = query.order(sortBy, { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  const processedAnalytics = (data || []).map((item: any) => {
    const engagementRate = item.reach > 0 ? ((item.engagement / item.reach) * 100).toFixed(2) : '0.00';

    return {
      post_id: item.post_id,
      platform: item.platform,
      published_at: item.published_at,
      caption_preview: item.social_media_posts?.caption_text?.substring(0, 100) || '',
      topic_category: item.social_media_posts?.topic_category,
      metrics: {
        impressions: item.impressions || 0,
        reach: item.reach || 0,
        engagement: item.engagement || 0,
        engagement_rate: parseFloat(engagementRate),
        likes: item.likes || 0,
        comments: item.comments || 0,
        shares: item.shares || 0,
        saves: item.saves || 0,
        clicks: item.clicks || 0
      },
      synced_at: item.synced_at
    };
  });

  return {
    items: sanitizeDataForPrompt(processedAnalytics),
    result_count: processedAnalytics.length,
    total_count: count || 0,
    next_offset: processedAnalytics.length >= limit ? offset + limit : null
  };
}
