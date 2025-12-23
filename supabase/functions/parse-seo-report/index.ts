import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedKeyword {
  keyword: string;
  search_volume: number | null;
  clicks: number | null;
  ranking_url: string | null;
  position: number | null;
  position_start: number | null;
  position_change: number | null;
  best_position: number | null;
}

interface ParsedData {
  region: string;
  keywords: ParsedKeyword[];
  summary: {
    visibility_score: number;
    average_position: number;
    keywords_total: number;
    keywords_top_3: number;
    keywords_top_10: number;
    keywords_top_30: number;
  };
}

function parseCSV(csvText: string): ParsedData {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 3) {
    throw new Error('CSV file appears to be empty or invalid');
  }

  // Line 1: Region info - e.g., "Google USA (Jacksonville, Florida, United States), interface language: English"
  const regionLine = lines[0];
  const regionMatch = regionLine.match(/"?([^"]+)"?/);
  const region = regionMatch ? regionMatch[1].replace(/, interface language:.*$/, '').trim() : 'Unknown';

  console.log('Parsed region:', region);

  // Line 2: Headers - find date columns dynamically
  const headerLine = lines[1];
  const headers = parseCSVLine(headerLine);
  
  console.log('Headers:', headers);

  // Find column indices
  const keywordIdx = headers.findIndex(h => h.toLowerCase() === 'keyword');
  const searchVolIdx = headers.findIndex(h => h.toLowerCase().includes('search vol'));
  const clicksIdx = headers.findIndex(h => h.toLowerCase() === 'clicks');
  
  // Find date columns (format: YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const dateColumns: { index: number; date: string }[] = [];
  headers.forEach((h, idx) => {
    if (dateRegex.test(h.trim())) {
      dateColumns.push({ index: idx, date: h.trim() });
    }
  });

  // Find URL columns (usually after each date column or labeled "URL")
  const urlColumns: number[] = [];
  headers.forEach((h, idx) => {
    if (h.toLowerCase() === 'url' && idx > 0) {
      urlColumns.push(idx);
    }
  });

  console.log('Date columns:', dateColumns);
  console.log('URL columns:', urlColumns);

  const keywords: ParsedKeyword[] = [];

  // Parse data rows (starting from line 3)
  for (let i = 2; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;

    const keyword = row[keywordIdx]?.trim();
    if (!keyword) continue;

    const searchVolume = parseIntSafe(row[searchVolIdx]);
    const clicks = parseIntSafe(row[clicksIdx]);

    // Get positions from date columns
    const positions: (number | null)[] = dateColumns.map(dc => {
      const val = row[dc.index]?.trim();
      if (!val || val === '-' || val === '') return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    });

    // Get ranking URL (last URL column with a value)
    let rankingUrl: string | null = null;
    for (const urlIdx of [...urlColumns].reverse()) {
      const url = row[urlIdx]?.trim();
      if (url && url !== '-' && url !== '') {
        rankingUrl = url.replace(/\\/g, ''); // Remove escape characters
        break;
      }
    }

    // Calculate metrics
    const validPositions = positions.filter((p): p is number => p !== null);
    const position = validPositions.length > 0 ? validPositions[validPositions.length - 1] : null; // Latest position
    const positionStart = validPositions.length > 0 ? validPositions[0] : null; // First position
    const positionChange = (positionStart !== null && position !== null) ? positionStart - position : null; // Positive = improved
    const bestPosition = validPositions.length > 0 ? Math.min(...validPositions) : null;

    keywords.push({
      keyword,
      search_volume: searchVolume,
      clicks,
      ranking_url: rankingUrl,
      position,
      position_start: positionStart,
      position_change: positionChange,
      best_position: bestPosition,
    });
  }

  console.log(`Parsed ${keywords.length} keywords`);

  // Calculate summary metrics
  const keywordsWithPosition = keywords.filter(k => k.position !== null);
  const positionSum = keywordsWithPosition.reduce((sum, k) => sum + (k.position || 0), 0);
  const averagePosition = keywordsWithPosition.length > 0 
    ? Math.round((positionSum / keywordsWithPosition.length) * 10) / 10 
    : 0;

  const keywordsTop3 = keywordsWithPosition.filter(k => k.position !== null && k.position <= 3).length;
  const keywordsTop10 = keywordsWithPosition.filter(k => k.position !== null && k.position <= 10).length;
  const keywordsTop30 = keywordsWithPosition.filter(k => k.position !== null && k.position <= 30).length;

  // Calculate visibility score (weighted by position and search volume)
  let totalWeight = 0;
  let weightedScore = 0;
  for (const kw of keywords) {
    if (kw.position !== null && kw.position <= 100) {
      const weight = kw.search_volume || 1;
      // CTR approximation: position 1 = ~30%, position 10 = ~2%, drops off after
      const ctr = kw.position <= 1 ? 0.30 :
                  kw.position <= 2 ? 0.15 :
                  kw.position <= 3 ? 0.10 :
                  kw.position <= 10 ? 0.05 - ((kw.position - 4) * 0.005) :
                  kw.position <= 20 ? 0.01 :
                  0.005;
      weightedScore += ctr * weight;
      totalWeight += weight;
    }
  }
  const visibilityScore = totalWeight > 0 
    ? Math.round((weightedScore / totalWeight) * 1000) / 10 
    : 0;

  return {
    region,
    keywords,
    summary: {
      visibility_score: visibilityScore,
      average_position: averagePosition,
      keywords_total: keywords.length,
      keywords_top_3: keywordsTop3,
      keywords_top_10: keywordsTop10,
      keywords_top_30: keywordsTop30,
    },
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function parseIntSafe(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received SEO report upload request');

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse form data
    const formData = await req.formData();
    const csvFile = formData.get('csv') as File;
    const clientId = formData.get('client_id') as string;

    if (!csvFile) {
      return new Response(
        JSON.stringify({ error: 'No CSV file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'No client_id provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing CSV file: ${csvFile.name}, size: ${csvFile.size} bytes`);

    // Read CSV content
    const csvText = await csvFile.text();
    
    // Parse CSV
    const parsedData = parseCSV(csvText);

    console.log('Summary:', parsedData.summary);

    // Upload CSV to storage for reference
    const fileName = `${clientId}/${Date.now()}-${csvFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('seo-reports')
      .upload(fileName, csvFile, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue even if storage fails - the data is what matters
    }

    const { data: { publicUrl } } = supabase.storage
      .from('seo-reports')
      .getPublicUrl(fileName);

    // Create SEO report record
    const reportDate = new Date().toISOString().split('T')[0];
    
    const { data: reportData, error: reportError } = await supabase
      .from('seo_reports')
      .insert({
        client_id: clientId,
        report_date: reportDate,
        visibility_score: parsedData.summary.visibility_score,
        average_position: parsedData.summary.average_position,
        keywords_top_3: parsedData.summary.keywords_top_3,
        keywords_top_10: parsedData.summary.keywords_top_10,
        keywords_top_30: parsedData.summary.keywords_top_30,
        keywords_total: parsedData.summary.keywords_total,
        pdf_url: fileName,
      })
      .select()
      .single();

    if (reportError) {
      console.error('Report insert error:', reportError);
      throw new Error(`Failed to create report: ${reportError.message}`);
    }

    console.log('Created report:', reportData.id);

    // Insert keywords
    const keywordRecords = parsedData.keywords.map(kw => ({
      client_id: clientId,
      seo_report_id: reportData.id,
      keyword: kw.keyword,
      search_engine: 'Google',
      region: parsedData.region,
      position: kw.position,
      position_start: kw.position_start,
      position_change: kw.position_change,
      best_position: kw.best_position,
      ranking_url: kw.ranking_url,
      search_volume: kw.search_volume,
      clicks: kw.clicks,
    }));

    const { error: keywordsError } = await supabase
      .from('seo_keywords')
      .insert(keywordRecords);

    if (keywordsError) {
      console.error('Keywords insert error:', keywordsError);
      throw new Error(`Failed to insert keywords: ${keywordsError.message}`);
    }

    console.log(`Inserted ${keywordRecords.length} keywords`);

    // Create a summary entry in the reports table (optional, non-critical)
    const { error: summaryError } = await supabase
      .from('reports')
      .insert({
        client_id: clientId,
        name: `SE Ranking Report - ${reportDate}`,
        type: 'seo',
      });

    if (summaryError) {
      console.warn('Summary report insert error (non-critical):', summaryError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id: reportData.id,
        keywords_count: keywordRecords.length,
        summary: parsedData.summary,
        region: parsedData.region,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process report';
    console.error('Error processing SEO report:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
