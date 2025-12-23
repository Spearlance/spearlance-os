import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClarityMetrics {
  totalSessions: number;
  distinctUsers: number;
  pagesPerSession: number;
  scrollDepth: number;
  engagementTimeSeconds: number;
  rageClickCount: number;
  deadClickCount: number;
  quickBackCount: number;
  javascriptErrorCount: number;
}

async function fetchClarityData(
  projectId: string, 
  apiToken: string, 
  startDate: string, 
  endDate: string
): Promise<ClarityMetrics | null> {
  const url = `https://www.clarity.ms/export-data/api/v1/${projectId}/metrics?startDate=${startDate}&endDate=${endDate}`;
  
  console.log(`Fetching Clarity data: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Clarity API error: ${response.status} - ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    console.log('Clarity metrics received:', JSON.stringify(data));

    // Map Clarity API response to our schema
    return {
      totalSessions: data.totalSessions || data.sessions || 0,
      distinctUsers: data.distinctUsers || data.users || 0,
      pagesPerSession: data.pagesPerSession || 0,
      scrollDepth: data.scrollDepth || 0,
      engagementTimeSeconds: data.engagementTime || data.avgEngagementTime || 0,
      rageClickCount: data.rageClicks || data.rageClickCount || 0,
      deadClickCount: data.deadClicks || data.deadClickCount || 0,
      quickBackCount: data.quickBacks || data.quickBackCount || 0,
      javascriptErrorCount: data.jsErrors || data.javascriptErrorCount || 0,
    };
  } catch (error) {
    console.error('Error fetching Clarity data:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Starting Clarity daily sync...');

    // Get all active Clarity configs
    const { data: configs, error: configError } = await supabase
      .from('clarity_configs')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      throw new Error(`Error fetching configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('No active Clarity configurations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active configurations', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} active Clarity configuration(s)`);

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each config
    for (const config of configs) {
      try {
        console.log(`Processing client: ${config.client_id}, project: ${config.project_id}`);

        // Sync last 3 days of data
        const today = new Date();
        
        for (let i = 0; i < 3; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i - 1); // Yesterday, day before, etc.
          
          const dateStr = date.toISOString().split('T')[0];
          
          console.log(`Fetching data for date: ${dateStr}`);
          
          const metrics = await fetchClarityData(
            config.project_id,
            config.api_token,
            dateStr,
            dateStr
          );

          if (metrics) {
            // Upsert daily metrics
            const { error: upsertError } = await supabase
              .from('clarity_daily_metrics')
              .upsert(
                {
                  client_id: config.client_id,
                  metric_date: dateStr,
                  total_sessions: metrics.totalSessions,
                  distinct_users: metrics.distinctUsers,
                  pages_per_session: metrics.pagesPerSession,
                  scroll_depth: metrics.scrollDepth,
                  engagement_time_seconds: metrics.engagementTimeSeconds,
                  rage_click_count: metrics.rageClickCount,
                  dead_click_count: metrics.deadClickCount,
                  quick_back_count: metrics.quickBackCount,
                  javascript_error_count: metrics.javascriptErrorCount,
                  raw_response: metrics,
                  synced_at: new Date().toISOString(),
                },
                { onConflict: 'client_id,metric_date' }
              );

            if (upsertError) {
              console.error(`Error upserting metrics for ${dateStr}:`, upsertError);
            } else {
              console.log(`Successfully synced metrics for ${dateStr}`);
            }
          }
        }

        // Update last_synced_at
        await supabase
          .from('clarity_configs')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', config.id);

        results.synced++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing config ${config.id}:`, error);
        results.failed++;
        results.errors.push(`Client ${config.client_id}: ${errorMessage}`);
      }
    }

    console.log('Clarity daily sync completed:', results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in Clarity daily sync:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
