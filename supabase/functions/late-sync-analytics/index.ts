import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { lateFetch } from "../_shared/lateClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncAnalyticsRequest {
  post_id?: string;      // Single post sync
  client_id?: string;    // Bulk sync for client
  platform?: string;     // Filter by platform
  from_date?: string;    // ISO date
  to_date?: string;      // ISO date
  limit?: number;
  page?: number;
}

interface LateAnalyticsPost {
  postId: string;
  platform: string;
  externalId?: string;
  publishedAt?: string;
  analytics: {
    impressions?: number;
    reach?: number;
    engagement?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
  };
}

interface LateAnalyticsResponse {
  posts?: LateAnalyticsPost[];
  post?: LateAnalyticsPost;
  overview?: any;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const body: SyncAnalyticsRequest = await req.json();
    console.log('Sync analytics request:', body);

    // If post_id provided, fetch single post analytics
    if (body.post_id) {
      return await syncSinglePost(supabase, body.post_id, user.id);
    }

    // If client_id provided, bulk sync for client
    if (body.client_id) {
      return await syncClientPosts(supabase, body, user.id);
    }

    throw new Error('Either post_id or client_id must be provided');

  } catch (error: any) {
    console.error('Error in late-sync-analytics:', error);
    
    // Handle specific Late API errors
    if (error.message?.includes('402')) {
      return new Response(
        JSON.stringify({
          error: 'Analytics add-on required',
          message: 'The Late Analytics add-on is required to access analytics data.',
          code: 'analytics_addon_required'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error.message?.includes('429')) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Late API rate limit exceeded (30 requests per hour). Please try again later.',
          code: 'rate_limit_exceeded'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncSinglePost(supabase: any, postId: string, userId: string) {
  // Get post details from database
  const { data: post, error: postError } = await supabase
    .from('social_media_posts')
    .select('*, clients!inner(id)')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    throw new Error('Post not found');
  }

  if (!post.late_post_id) {
    throw new Error('Post does not have a Late post ID');
  }

  // Check user has access to this client
  const hasAccess = await checkClientAccess(supabase, userId, post.client_id);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // Fetch analytics from Late API
  const analyticsData = await lateFetch(`/analytics?postId=${post.late_post_id}`);
  
  if (!analyticsData.post) {
    throw new Error('No analytics data returned from Late API');
  }

  // Store analytics in database
  await storeAnalytics(supabase, post, analyticsData.post);

  return new Response(
    JSON.stringify({
      success: true,
      post_id: postId,
      analytics: analyticsData.post
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncClientPosts(supabase: any, params: SyncAnalyticsRequest, userId: string) {
  const { client_id, platform = 'all', from_date, to_date, limit = 50, page = 1 } = params;

  // Check user has access to this client
  const hasAccess = await checkClientAccess(supabase, userId, client_id!);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // Build query parameters for Late API
  const queryParams = new URLSearchParams({
    platform,
    limit: limit.toString(),
    page: page.toString(),
    sortBy: 'date',
    order: 'desc'
  });

  if (from_date) queryParams.append('fromDate', from_date);
  if (to_date) queryParams.append('toDate', to_date);

  // Fetch analytics from Late API
  const analyticsData: LateAnalyticsResponse = await lateFetch(`/analytics?${queryParams.toString()}`);

  if (!analyticsData.posts || analyticsData.posts.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        synced_count: 0,
        message: 'No analytics data available'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get all posts for this client that have late_post_ids
  const { data: clientPosts, error: postsError } = await supabase
    .from('social_media_posts')
    .select('id, late_post_id, client_id')
    .eq('client_id', client_id)
    .not('late_post_id', 'is', null);

  if (postsError) {
    throw new Error('Failed to fetch client posts');
  }

  // Create a map of late_post_id to post
  const postMap = new Map(clientPosts.map((p: any) => [p.late_post_id, p]));

  // Store analytics for each post
  let syncedCount = 0;
  for (const analyticsPost of analyticsData.posts) {
    const post = postMap.get(analyticsPost.postId);
    if (post) {
      await storeAnalytics(supabase, post, analyticsPost);
      syncedCount++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      synced_count: syncedCount,
      total_available: analyticsData.posts.length,
      pagination: analyticsData.pagination
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function storeAnalytics(supabase: any, post: any, analyticsPost: LateAnalyticsPost) {
  const analyticsData = {
    post_id: post.id,
    late_post_id: analyticsPost.postId,
    client_id: post.client_id,
    platform: analyticsPost.platform,
    impressions: analyticsPost.analytics.impressions || 0,
    reach: analyticsPost.analytics.reach || 0,
    engagement: analyticsPost.analytics.engagement || 0,
    likes: analyticsPost.analytics.likes || 0,
    comments: analyticsPost.analytics.comments || 0,
    shares: analyticsPost.analytics.shares || 0,
    saves: analyticsPost.analytics.saves || 0,
    clicks: analyticsPost.analytics.clicks || 0,
    external_id: analyticsPost.externalId,
    published_at: analyticsPost.publishedAt,
    raw_analytics: analyticsPost,
    synced_at: new Date().toISOString(),
  };

  // Upsert analytics (update if exists, insert if not)
  const { error } = await supabase
    .from('social_post_analytics')
    .upsert(analyticsData, {
      onConflict: 'late_post_id,platform',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error storing analytics:', error);
    throw new Error('Failed to store analytics data');
  }
}

async function checkClientAccess(supabase: any, userId: string, clientId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, associated_client_ids')
    .eq('id', userId)
    .single();

  if (!profile) return false;

  // Admins have access to all clients
  if (profile.role === 'admin') return true;

  // Check if client_id is in associated_client_ids
  return profile.associated_client_ids?.includes(clientId) || false;
}
