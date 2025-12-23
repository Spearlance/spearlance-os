import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClarityDayData {
  totalSessionCount: number;
  distinctUserCount: number;
  pagesPerSession: number;
  scrollDepth: number;
  activeTime: number;
  rageClickCount: number;
  deadClickCount: number;
  quickbackCount: number;
  javascriptErrorCount: number;
}

async function fetchClarityData(apiToken: string): Promise<ClarityDayData | null> {
  // Fetch exactly 1 day of data for precise daily metrics
  const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1`;
  
  console.log('Fetching Clarity data for yesterday (numOfDays=1)');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Clarity API error: ${response.status}`);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('Clarity data received:', JSON.stringify(data).substring(0, 500));
    
    return {
      totalSessionCount: data.totalSessionCount || 0,
      distinctUserCount: data.distinctUserCount || 0,
      pagesPerSession: data.pagesPerSession || 0,
      scrollDepth: data.scrollDepth || 0,
      activeTime: data.activeTime || 0,
      rageClickCount: data.rageClickCount || 0,
      deadClickCount: data.deadClickCount || 0,
      quickbackCount: data.quickbackCount || 0,
      javascriptErrorCount: data.javascriptErrorCount || 0,
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

    // Check if a specific client_id was passed (for manual sync)
    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id || null;
    } catch {
      // No body or invalid JSON, continue with all clients
    }

    // Get Clarity configs (all active or specific one for manual sync)
    let query = supabase
      .from('clarity_configs')
      .select('*');
    
    if (targetClientId) {
      query = query.eq('client_id', targetClientId);
      console.log(`Manual sync requested for client: ${targetClientId}`);
    } else {
      query = query.eq('is_active', true);
    }

    const { data: configs, error: configError } = await query;

    if (configError) {
      throw new Error(`Error fetching configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('No Clarity configurations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No configurations found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} Clarity configuration(s)`);

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Calculate yesterday's date (the date we're syncing data for)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const metricDate = yesterday.toISOString().split('T')[0];

    // Process each config
    for (const config of configs) {
      try {
        console.log(`Processing client: ${config.client_id}`);

        // Fetch 1 day of data (yesterday's metrics)
        const dailyData = await fetchClarityData(config.api_token);

        if (dailyData) {
          // Upsert daily metrics for yesterday
          const { error: upsertError } = await supabase
            .from('clarity_daily_metrics')
            .upsert(
              {
                client_id: config.client_id,
                metric_date: metricDate,
                total_sessions: dailyData.totalSessionCount,
                distinct_users: dailyData.distinctUserCount,
                pages_per_session: dailyData.pagesPerSession,
                scroll_depth: dailyData.scrollDepth,
                engagement_time_seconds: dailyData.activeTime,
                rage_click_count: dailyData.rageClickCount,
                dead_click_count: dailyData.deadClickCount,
                quick_back_count: dailyData.quickbackCount,
                javascript_error_count: dailyData.javascriptErrorCount,
                raw_response: dailyData,
                synced_at: new Date().toISOString(),
              },
              { onConflict: 'client_id,metric_date' }
            );

          if (upsertError) {
            console.error(`Error upserting metrics for ${metricDate}:`, upsertError);
            throw upsertError;
          }
          
          console.log(`Successfully synced metrics for ${metricDate}: ${dailyData.totalSessionCount} sessions, ${dailyData.distinctUserCount} users`);
        } else {
          console.log(`No data returned for client ${config.client_id}`);
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
      JSON.stringify({ success: true, metricDate, ...results }),
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
