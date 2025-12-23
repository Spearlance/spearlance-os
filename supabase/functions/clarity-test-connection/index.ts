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
    // Using the project info endpoint to verify credentials
    const clarityApiUrl = `https://www.clarity.ms/export-data/api/v1/${projectId}/project-info`;

    const response = await fetch(clarityApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Clarity API response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Clarity API response:', JSON.stringify(data));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          projectName: data.projectName || projectId,
          message: 'Connection successful' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific error codes
    if (response.status === 401 || response.status === 403) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid API token or insufficient permissions' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 404) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Project not found. Please check your Project ID' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errorText = await response.text();
    console.error('Clarity API error:', errorText);

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
