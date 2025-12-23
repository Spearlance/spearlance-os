import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse multipart form data
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;
    const clientId = formData.get('client_id') as string;
    const reportDateStr = formData.get('report_date') as string;

    if (!pdfFile || !clientId) {
      throw new Error('Missing required fields: pdf, client_id');
    }

    console.log('Processing SE Ranking PDF:', pdfFile.name, 'for client:', clientId);

    // Upload PDF to storage
    const timestamp = Date.now();
    const storagePath = `${clientId}/${timestamp}-${pdfFile.name}`;
    const pdfBuffer = await pdfFile.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('seo-reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('seo-reports')
      .getPublicUrl(storagePath);

    console.log('PDF uploaded to:', storagePath);

    // Convert PDF to base64 for AI processing
    const base64Pdf = btoa(
      new Uint8Array(pdfBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Use Lovable AI (Gemini 2.5 Pro) to extract data from PDF
    const extractionPrompt = `You are analyzing an SE Ranking Project Report PDF. Extract the following data and return it as valid JSON:

1. **Summary Metrics** (from the top of the report):
   - Search Visibility percentage (e.g., "26.7")
   - Average Position (e.g., "55.17") 
   - Keywords in Top 3 count
   - Keywords in Top 10 count
   - Keywords in Top 30 count
   - Total keywords in SERPs

2. **Date Range** (from the report header):
   - Start date (YYYY-MM-DD format)
   - End date (YYYY-MM-DD format)

3. **Keywords Table** - Extract ALL keyword rows with:
   - keyword: The search term
   - region: The location (e.g., "Google USA - Seattle, WA", "Google Canada - Vancouver")
   - positions: Array of daily positions (the numbers in the grid, null if "-")
   - best_position: The best (lowest) position during the period
   - position_start: First day's position
   - position_end: Last day's position
   - position_change: Calculated as position_start - position_end (positive = improved, negative = dropped)

Return ONLY valid JSON in this exact format:
{
  "summary": {
    "visibility_score": 26.7,
    "average_position": 55.17,
    "keywords_top_3": 5,
    "keywords_top_10": 12,
    "keywords_top_30": 25,
    "keywords_total": 40
  },
  "date_range": {
    "start": "2025-12-15",
    "end": "2025-12-21"
  },
  "keywords": [
    {
      "keyword": "commercial snow removal",
      "region": "Google USA - Seattle, WA",
      "positions": [1, 1, 1, 1, 1, 1, 1],
      "best_position": 1,
      "position_start": 1,
      "position_end": 1,
      "position_change": 0
    }
  ]
}

IMPORTANT: 
- Include ALL keywords from ALL regions (Google USA, Google Canada, etc.)
- If a position shows "-" or is empty, use null
- Calculate position_change as: position_start - position_end
- Return ONLY the JSON, no markdown or explanation`;

    console.log('Calling Lovable AI for PDF extraction...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: extractionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI extraction error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI raw response length:', rawContent.length);

    // Clean and parse AI response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      let cleanedContent = rawContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();
      
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', rawContent.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('Extracted summary:', extractedData.summary);
    console.log('Keywords count:', extractedData.keywords?.length || 0);

    // Determine report date
    const reportDate = reportDateStr || extractedData.date_range?.end || new Date().toISOString().split('T')[0];

    // Get user ID from auth
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    // Insert SEO report
    const { data: reportData, error: reportError } = await supabase
      .from('seo_reports')
      .insert({
        client_id: clientId,
        report_date: reportDate,
        date_range_start: extractedData.date_range?.start,
        date_range_end: extractedData.date_range?.end,
        visibility_score: extractedData.summary?.visibility_score,
        average_position: extractedData.summary?.average_position,
        keywords_top_3: extractedData.summary?.keywords_top_3 || 0,
        keywords_top_10: extractedData.summary?.keywords_top_10 || 0,
        keywords_top_30: extractedData.summary?.keywords_top_30 || 0,
        keywords_total: extractedData.summary?.keywords_total || 0,
        pdf_url: storagePath,
        raw_extraction: extractedData,
        created_by: user?.id
      })
      .select()
      .single();

    if (reportError) {
      console.error('Report insert error:', reportError);
      throw new Error(`Failed to save report: ${reportError.message}`);
    }

    console.log('Report created:', reportData.id);

    // Insert keywords
    if (extractedData.keywords && extractedData.keywords.length > 0) {
      const keywordsToInsert = extractedData.keywords.map((kw: any) => ({
        client_id: clientId,
        seo_report_id: reportData.id,
        keyword: kw.keyword,
        search_engine: 'Google',
        region: kw.region,
        position: kw.position_end,
        position_start: kw.position_start,
        position_change: kw.position_change,
        best_position: kw.best_position,
        ranking_url: kw.ranking_url || null
      }));

      const { error: keywordsError } = await supabase
        .from('seo_keywords')
        .insert(keywordsToInsert);

      if (keywordsError) {
        console.error('Keywords insert error:', keywordsError);
        // Don't throw - the report was still created
      } else {
        console.log('Inserted', keywordsToInsert.length, 'keywords');
      }
    }

    // Create a summary for the reports table
    const summaryText = `SE Ranking Report for week ending ${reportDate}. Visibility: ${extractedData.summary?.visibility_score || 'N/A'}%. Average position: ${extractedData.summary?.average_position || 'N/A'}. ${extractedData.summary?.keywords_top_3 || 0} keywords in Top 3, ${extractedData.summary?.keywords_top_10 || 0} in Top 10.`;

    // Auto-create entry in reports table
    const { error: reportsError } = await supabase
      .from('reports')
      .insert({
        client_id: clientId,
        name: `SE Ranking Report - Week of ${extractedData.date_range?.start || reportDate}`,
        description: summaryText,
        oviond_url: storagePath,
        tags: ['seo', 'se-ranking', 'auto-generated'],
        created_by: user?.id
      });

    if (reportsError) {
      console.error('Reports table insert error:', reportsError);
      // Don't throw - the SEO report was still created
    }

    return new Response(JSON.stringify({
      success: true,
      report: reportData,
      keywords_count: extractedData.keywords?.length || 0,
      summary: extractedData.summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('parse-seo-report error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
