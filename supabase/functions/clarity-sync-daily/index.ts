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
  date?: string;
}

async function fetchClarityData(
  apiToken: string,
  numDays: number = 3
): Promise<ClarityDayData[] | null> {
  const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numDays}`;
  
  console.log(`Fetching Clarity data for last ${numDays} days`);
  
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
    
    // Parse the response - the API returns aggregated data for the requested period
    // We'll create daily entries based on the data
    const today = new Date();
    const dailyData: ClarityDayData[] = [];
    
    for (let i = 1; i <= numDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Distribute the totals across days (API returns aggregated totals)
      dailyData.push({
        date: dateStr,
        totalSessionCount: Math.round((data.totalSessionCount || 0) / numDays),
        distinctUserCount: Math.round((data.distinctUserCount || 0) / numDays),
        pagesPerSession: data.pagesPerSession || 0,
        scrollDepth: data.scrollDepth || 0,
        activeTime: data.activeTime || 0,
        rageClickCount: Math.round((data.rageClickCount || 0) / numDays),
        deadClickCount: Math.round((data.deadClickCount || 0) / numDays),
        quickbackCount: Math.round((data.quickbackCount || 0) / numDays),
        javascriptErrorCount: Math.round((data.javascriptErrorCount || 0) / numDays),
      });
    }
    
    return dailyData;
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
        console.log(`Processing client: ${config.client_id}`);

        // Fetch last 3 days of data using the API token
        const dailyData = await fetchClarityData(config.api_token, 3);

        if (dailyData && dailyData.length > 0) {
          for (const dayMetrics of dailyData) {
            // Upsert daily metrics
            const { error: upsertError } = await supabase
              .from('clarity_daily_metrics')
              .upsert(
                {
                  client_id: config.client_id,
                  metric_date: dayMetrics.date,
                  total_sessions: dayMetrics.totalSessionCount,
                  distinct_users: dayMetrics.distinctUserCount,
                  pages_per_session: dayMetrics.pagesPerSession,
                  scroll_depth: dayMetrics.scrollDepth,
                  engagement_time_seconds: dayMetrics.activeTime,
                  rage_click_count: dayMetrics.rageClickCount,
                  dead_click_count: dayMetrics.deadClickCount,
                  quick_back_count: dayMetrics.quickbackCount,
                  javascript_error_count: dayMetrics.javascriptErrorCount,
                  raw_response: dayMetrics,
                  synced_at: new Date().toISOString(),
                },
                { onConflict: 'client_id,metric_date' }
              );

            if (upsertError) {
              console.error(`Error upserting metrics for ${dayMetrics.date}:`, upsertError);
            } else {
              console.log(`Successfully synced metrics for ${dayMetrics.date}`);
            }
          }
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
