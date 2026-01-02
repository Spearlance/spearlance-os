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

interface LocationData {
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

interface ParsedResult {
  locations: LocationData[];
  totalKeywords: number;
}

function isLocationHeader(line: string): boolean {
  // Location headers start with "Google" and contain location/language info
  const trimmed = line.trim();
  return (trimmed.startsWith('"Google') || trimmed.startsWith('Google')) && 
         (trimmed.includes('interface language') || trimmed.includes('('));
}

function isColumnHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes('keyword') && (lower.includes('url') || lower.includes('search vol'));
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

function extractRegion(line: string): string {
  const match = line.match(/"?([^"]+)"?/);
  return match ? match[1].replace(/, interface language:.*$/, '').trim() : 'Unknown';
}

function calculateSummary(keywords: ParsedKeyword[]): LocationData['summary'] {
  const keywordsWithPosition = keywords.filter(k => k.position !== null);
  const positionSum = keywordsWithPosition.reduce((sum, k) => sum + (k.position || 0), 0);
  const averagePosition = keywordsWithPosition.length > 0 
    ? Math.round((positionSum / keywordsWithPosition.length) * 10) / 10 
    : 0;

  const keywordsTop3 = keywordsWithPosition.filter(k => k.position !== null && k.position <= 3).length;
  const keywordsTop10 = keywordsWithPosition.filter(k => k.position !== null && k.position <= 10).length;
  const keywordsTop30 = keywordsWithPosition.filter(k => k.position !== null && k.position <= 30).length;

  // Calculate visibility score
  let totalWeight = 0;
  let weightedScore = 0;
  for (const kw of keywords) {
    if (kw.position !== null && kw.position <= 100) {
      const weight = kw.search_volume || 1;
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
    visibility_score: visibilityScore,
    average_position: averagePosition,
    keywords_total: keywords.length,
    keywords_top_3: keywordsTop3,
    keywords_top_10: keywordsTop10,
    keywords_top_30: keywordsTop30,
  };
}

function parseKeywordsSection(
  lines: string[],
  headers: string[]
): ParsedKeyword[] {
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

  // Find URL columns
  const urlColumns: number[] = [];
  headers.forEach((h, idx) => {
    if (h.toLowerCase() === 'url' && idx > 0) {
      urlColumns.push(idx);
    }
  });

  const keywords: ParsedKeyword[] = [];

  for (const line of lines) {
    const row = parseCSVLine(line);
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

    // Get ranking URL
    let rankingUrl: string | null = null;
    for (const urlIdx of [...urlColumns].reverse()) {
      const url = row[urlIdx]?.trim();
      if (url && url !== '-' && url !== '') {
        rankingUrl = url.replace(/\\/g, '');
        break;
      }
    }

    // Calculate metrics
    const validPositions = positions.filter((p): p is number => p !== null);
    const position = validPositions.length > 0 ? validPositions[validPositions.length - 1] : null;
    const positionStart = validPositions.length > 0 ? validPositions[0] : null;
    const positionChange = (positionStart !== null && position !== null) ? positionStart - position : null;
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

  return keywords;
}

function deduplicateKeywords(keywords: ParsedKeyword[]): ParsedKeyword[] {
  const keywordMap = new Map<string, ParsedKeyword>();

  for (const kw of keywords) {
    const existing = keywordMap.get(kw.keyword);
    if (!existing) {
      keywordMap.set(kw.keyword, kw);
    } else {
      // Keep the one with better (lower) position
      const existingPos = existing.position ?? 999;
      const newPos = kw.position ?? 999;
      
      if (newPos < existingPos) {
        keywordMap.set(kw.keyword, {
          ...kw,
          search_volume: Math.max(existing.search_volume ?? 0, kw.search_volume ?? 0),
          clicks: (existing.clicks ?? 0) + (kw.clicks ?? 0),
        });
      } else {
        keywordMap.set(kw.keyword, {
          ...existing,
          clicks: (existing.clicks ?? 0) + (kw.clicks ?? 0),
        });
      }
    }
  }

  return Array.from(keywordMap.values());
}

function parseMultiLocationCSV(csvText: string): ParsedResult {
  const allLines = csvText.split('\n');
  const locations: LocationData[] = [];
  
  let currentRegion: string | null = null;
  let currentHeaders: string[] = [];
  let currentDataLines: string[] = [];

  const finalizeLocation = () => {
    if (currentRegion && currentHeaders.length > 0 && currentDataLines.length > 0) {
      const rawKeywords = parseKeywordsSection(currentDataLines, currentHeaders);
      const keywords = deduplicateKeywords(rawKeywords);
      
      if (rawKeywords.length !== keywords.length) {
        console.log(`Deduplicated ${rawKeywords.length} keywords to ${keywords.length} for ${currentRegion}`);
      }

      locations.push({
        region: currentRegion,
        keywords,
        summary: calculateSummary(keywords),
      });
      console.log(`Parsed location: ${currentRegion} with ${keywords.length} keywords`);
    }
  };

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Check if this is a location header
    if (isLocationHeader(trimmedLine)) {
      // Finalize previous location if exists
      finalizeLocation();
      
      // Start new location
      currentRegion = extractRegion(trimmedLine);
      currentHeaders = [];
      currentDataLines = [];
      console.log(`Found location header: ${currentRegion}`);
      continue;
    }

    // Check if this is a column header line
    if (isColumnHeader(trimmedLine) && currentRegion) {
      currentHeaders = parseCSVLine(trimmedLine);
      console.log(`Found headers for ${currentRegion}:`, currentHeaders.slice(0, 5).join(', ') + '...');
      continue;
    }

    // If we have a region and headers, this is a data line
    if (currentRegion && currentHeaders.length > 0) {
      currentDataLines.push(line);
    }
  }

  // Don't forget the last location
  finalizeLocation();

  const totalKeywords = locations.reduce((sum, loc) => sum + loc.keywords.length, 0);
  console.log(`Total: ${locations.length} locations, ${totalKeywords} keywords`);

  return { locations, totalKeywords };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received SEO report upload request');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const csvText = await csvFile.text();
    const parsedResult = parseMultiLocationCSV(csvText);

    if (parsedResult.locations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid location data found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload CSV to storage
    const fileName = `${clientId}/${Date.now()}-${csvFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('seo-reports')
      .upload(fileName, csvFile, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
    }

    const reportDate = new Date().toISOString().split('T')[0];
    const createdReports: Array<{ region: string; report_id: string; keywords_count: number }> = [];

    // Create a report for each location
    for (const location of parsedResult.locations) {
      const { data: reportData, error: reportError } = await supabase
        .from('seo_reports')
        .insert({
          client_id: clientId,
          report_date: reportDate,
          visibility_score: location.summary.visibility_score,
          average_position: location.summary.average_position,
          keywords_top_3: location.summary.keywords_top_3,
          keywords_top_10: location.summary.keywords_top_10,
          keywords_top_30: location.summary.keywords_top_30,
          keywords_total: location.summary.keywords_total,
          pdf_url: fileName,
        })
        .select()
        .single();

      if (reportError) {
        console.error(`Report insert error for ${location.region}:`, reportError);
        throw new Error(`Failed to create report for ${location.region}: ${reportError.message}`);
      }

      console.log(`Created report for ${location.region}: ${reportData.id}`);

      // Insert keywords for this location
      const keywordRecords = location.keywords.map(kw => ({
        client_id: clientId,
        seo_report_id: reportData.id,
        keyword: kw.keyword,
        search_engine: 'Google',
        region: location.region,
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
        console.error(`Keywords insert error for ${location.region}:`, keywordsError);
        throw new Error(`Failed to insert keywords for ${location.region}: ${keywordsError.message}`);
      }

      console.log(`Inserted ${keywordRecords.length} keywords for ${location.region}`);

      createdReports.push({
        region: location.region,
        report_id: reportData.id,
        keywords_count: keywordRecords.length,
      });
    }

    // Create summary entry
    const { error: summaryError } = await supabase
      .from('reports')
      .insert({
        client_id: clientId,
        name: `SE Ranking Report - ${reportDate} (${parsedResult.locations.length} locations)`,
        type: 'seo',
      });

    if (summaryError) {
      console.warn('Summary report insert error (non-critical):', summaryError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        locations_found: parsedResult.locations.length,
        total_keywords: parsedResult.totalKeywords,
        reports: createdReports,
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
