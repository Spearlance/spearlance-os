import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, apiToken } = await req.json();

    if (!projectId || !apiToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing projectId or apiToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing Clarity connection for project: ${projectId}`);

    // Microsoft Clarity Analytics API endpoint
    // The API token is project-specific, so we use project-live-insights
    const clarityApiUrl = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1`;

    const response = await fetch(clarityApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    console.log(`Clarity API response status: ${response.status}`);
    const responseText = await response.text();
    console.log('Clarity API response body:', responseText);

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = {};
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          projectName: data.projectName || projectId,
          message: 'Connection successful',
          hasData: !!data.totalSessionCount || !!data.distinctUserCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific error codes
    if (response.status === 401) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid API token. Please check your token and ensure it has the correct permissions.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 403) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Access forbidden. Your API token may not have permission to access analytics data.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Clarity API error:', responseText);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Clarity API error: ${response.status}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Clarity API';
    console.error('Error testing Clarity connection:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
