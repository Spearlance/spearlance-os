import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPIENTS = [
  'garrett@spearlance.com',
  'madeleine@spearlance.com'
];

interface ClientReport {
  clientId: string;
  clientName: string;
  reportContent: string;
  executiveSummary: string;
  keyWins: string;
  concerns: string;
  focusAreas: string;
  reportId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting weekly performance email generation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Parse optional request body for manual triggers
    let specificClientId: string | null = null;
    let testMode = false;
    
    try {
      const body = await req.json();
      specificClientId = body.client_id || null;
      testMode = body.test_mode || false;
    } catch {
      // No body provided, process all clients
    }

    // Calculate date range (previous week: Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - daysToLastSunday);
    lastSunday.setHours(23, 59, 59, 999);
    
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    lastMonday.setHours(0, 0, 0, 0);

    const dateRangeStart = lastMonday.toISOString().split('T')[0];
    const dateRangeEnd = lastSunday.toISOString().split('T')[0];
    
    const weekRangeFormatted = `${lastMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    console.log(`📅 Generating reports for week: ${weekRangeFormatted}`);

    // Fetch active clients
    let clientQuery = supabase
      .from('clients')
      .select('id, name, brand_name, industry, website_url')
      .eq('status', 'active');
    
    if (specificClientId) {
      clientQuery = clientQuery.eq('id', specificClientId);
    }

    const { data: clients, error: clientsError } = await clientQuery;

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    if (!clients || clients.length === 0) {
      console.log('ℹ️ No active clients found');
      return new Response(
        JSON.stringify({ message: 'No active clients found', clients_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${clients.length} client(s)...`);

    const processedReports: ClientReport[] = [];
    const errors: { clientId: string; clientName: string; error: string }[] = [];

    for (const client of clients) {
      try {
        console.log(`\n🔄 Processing: ${client.brand_name || client.name}`);
        
        // Gather data for the client
        let dataContext = '';
        const dataSnapshot: Record<string, any> = {};

        // Fetch Channel KPIs
        const { data: kpiData } = await supabase
          .from('channel_weekly_kpis')
          .select(`
            id,
            week_start_date,
            kpi_data,
            channel:marketing_flow_channels!inner(
              id,
              name,
              stage:marketing_flow_stages!inner(
                flow:marketing_flows!inner(client_id)
              )
            )
          `)
          .eq('channel.stage.flow.client_id', client.id)
          .gte('week_start_date', dateRangeStart)
          .lte('week_start_date', dateRangeEnd)
          .order('week_start_date', { ascending: false });

        if (kpiData && kpiData.length > 0) {
          dataSnapshot.channel_kpis = kpiData;
          
          const channelGroups: Record<string, any[]> = {};
          for (const kpi of kpiData) {
            const channelName = (kpi.channel as any)?.name || 'Unknown';
            if (!channelGroups[channelName]) channelGroups[channelName] = [];
            channelGroups[channelName].push(kpi);
          }

          dataContext += '\n\n## CHANNEL PERFORMANCE DATA:\n';
          for (const [channelName, kpis] of Object.entries(channelGroups)) {
            dataContext += `\n### ${channelName}:\n`;
            for (const kpi of kpis.slice(0, 4)) {
              const data = kpi.kpi_data || {};
              dataContext += `Week of ${kpi.week_start_date}:\n`;
              for (const [key, value] of Object.entries(data)) {
                if (value !== null && value !== undefined && value !== '') {
                  dataContext += `  - ${key}: ${value}\n`;
                }
              }
            }
          }
        } else {
          dataContext += '\n\n## CHANNEL PERFORMANCE DATA:\nNo channel KPI data available for this period.\n';
        }

        // Fetch Clarity/Website Analytics
        const { data: clarityData } = await supabase
          .from('clarity_weekly_reports')
          .select('*')
          .eq('client_id', client.id)
          .gte('week_start_date', dateRangeStart)
          .lte('week_end_date', dateRangeEnd)
          .order('week_start_date', { ascending: false });

        if (clarityData && clarityData.length > 0) {
          dataSnapshot.clarity_reports = clarityData;
          
          dataContext += '\n\n## WEBSITE ANALYTICS (Microsoft Clarity):\n';
          for (const report of clarityData.slice(0, 4)) {
            dataContext += `\nWeek: ${report.week_start_date} to ${report.week_end_date}:\n`;
            dataContext += `  - Total Sessions: ${report.total_sessions || 0}\n`;
            dataContext += `  - Distinct Users: ${report.total_distinct_users || 0}\n`;
            dataContext += `  - Avg Engagement Time: ${Math.round((report.avg_engagement_time_seconds || 0) / 60)} min\n`;
            dataContext += `  - Avg Pages/Session: ${(report.avg_pages_per_session || 0).toFixed(1)}\n`;
            dataContext += `  - Avg Scroll Depth: ${report.avg_scroll_depth || 0}%\n`;
            dataContext += `  - Rage Clicks: ${report.total_rage_clicks || 0}\n`;
            if (report.sessions_change_percent !== null) {
              dataContext += `  - Sessions WoW Change: ${report.sessions_change_percent > 0 ? '+' : ''}${report.sessions_change_percent}%\n`;
            }
          }
        } else {
          dataContext += '\n\n## WEBSITE ANALYTICS:\nNo website analytics data available for this period.\n';
        }

        // Fetch SEO Data
        const { data: seoKeywords } = await supabase
          .from('seo_keywords')
          .select('*')
          .eq('client_id', client.id)
          .order('position', { ascending: true })
          .limit(10);

        if (seoKeywords && seoKeywords.length > 0) {
          dataSnapshot.seo_keywords = seoKeywords;
          
          dataContext += '\n\n## TOP SEO KEYWORDS:\n';
          for (const kw of seoKeywords) {
            const trend = kw.position_change 
              ? (kw.position_change > 0 ? `↓${kw.position_change}` : kw.position_change < 0 ? `↑${Math.abs(kw.position_change)}` : '→')
              : '→';
            dataContext += `  - "${kw.keyword}": Position ${kw.position || 'N/A'} ${trend}\n`;
          }
        }

        // Generate AI report with structured sections for email
        const systemPrompt = `You are a senior marketing analyst creating a weekly email report for ${client.brand_name || client.name}.

Your task is to analyze the provided data and generate a concise, actionable weekly summary.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "executive_summary": "2-3 sentences summarizing the week's performance",
  "key_wins": "<ul><li>Win 1</li><li>Win 2</li><li>Win 3</li></ul>",
  "concerns": "<ul><li>Concern 1</li><li>Concern 2</li></ul>",
  "focus_areas": "<ul><li>Focus 1</li><li>Focus 2</li><li>Focus 3</li></ul>",
  "full_report": "Full markdown report with ## headings"
}

GUIDELINES:
- Be specific with numbers and percentages
- Focus on actionable insights
- If data is missing, note it briefly and provide general recommendations
- Keep each section concise but informative
- Use HTML list tags for wins, concerns, and focus_areas`;

        const userPrompt = `Create a weekly performance summary for ${client.brand_name || client.name} for the week of ${weekRangeFormatted}.

${dataContext}

Generate the JSON response with executive_summary, key_wins, concerns, focus_areas, and full_report.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI generation failed: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        let reportContent = aiData.choices[0].message.content;
        
        // Parse the JSON response
        let parsedReport: {
          executive_summary: string;
          key_wins: string;
          concerns: string;
          focus_areas: string;
          full_report: string;
        };

        try {
          // Extract JSON from potential markdown code blocks
          const jsonMatch = reportContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          const jsonString = jsonMatch ? jsonMatch[1] : reportContent;
          parsedReport = JSON.parse(jsonString.trim());
        } catch {
          // Fallback if JSON parsing fails
          parsedReport = {
            executive_summary: 'Weekly performance report generated. View full report for details.',
            key_wins: '<ul><li>Report generated successfully</li></ul>',
            concerns: '<ul><li>Unable to parse structured data - review full report</li></ul>',
            focus_areas: '<ul><li>Review the full report for actionable insights</li></ul>',
            full_report: reportContent
          };
        }

        // Save report to database
        const reportName = `Weekly Performance - ${weekRangeFormatted}`;
        const { data: savedReport, error: saveError } = await supabase
          .from('ai_generated_reports')
          .insert({
            client_id: client.id,
            report_type: 'performance_summary',
            report_name: reportName,
            date_range_start: dateRangeStart,
            date_range_end: dateRangeEnd,
            selected_channels: [],
            report_content: parsedReport.full_report,
            executive_summary: parsedReport.executive_summary,
            data_snapshot: { ...dataSnapshot, sent_via_email: true }
          })
          .select()
          .single();

        if (saveError) {
          throw new Error(`Failed to save report: ${saveError.message}`);
        }

        processedReports.push({
          clientId: client.id,
          clientName: client.brand_name || client.name,
          reportContent: parsedReport.full_report,
          executiveSummary: parsedReport.executive_summary,
          keyWins: parsedReport.key_wins,
          concerns: parsedReport.concerns,
          focusAreas: parsedReport.focus_areas,
          reportId: savedReport.id
        });

        console.log(`✅ Report generated for ${client.brand_name || client.name}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing ${client.brand_name || client.name}:`, errorMessage);
        errors.push({
          clientId: client.id,
          clientName: client.brand_name || client.name,
          error: errorMessage
        });
      }
    }

    // Send emails for each processed report
    console.log(`\n📧 Sending ${processedReports.length} email(s)...`);
    
    const emailsSent: { clientName: string; emailId: string }[] = [];
    const emailErrors: { clientName: string; error: string }[] = [];

    for (const report of processedReports) {
      try {
        const appUrl = Deno.env.get('APP_URL') || 'https://os.spearlance.com';
        const reportLink = `${appUrl}/reports?report=${report.reportId}`;

        // Fetch template
        const { data: template } = await supabase
          .from('email_templates')
          .select('*')
          .eq('template_key', 'weekly_performance_report')
          .eq('is_active', true)
          .single();

        if (!template) {
          throw new Error('Email template not found');
        }

        // Replace variables
        const variables: Record<string, string> = {
          client_name: report.clientName,
          week_range: weekRangeFormatted,
          executive_summary: report.executiveSummary,
          key_wins: report.keyWins,
          concerns: report.concerns,
          focus_areas: report.focusAreas,
          report_link: reportLink
        };

        let subject = template.subject;
        let htmlBody = template.html_body;

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, value);
          htmlBody = htmlBody.replace(regex, value);
        });

        // Send email
        const recipients = testMode ? ['garrett@spearlance.com'] : RECIPIENTS;
        
        const emailResponse = await resend.emails.send({
          from: 'Spearlance OS <reports@em.os.spearlance.com>',
          to: recipients,
          subject: subject,
          html: htmlBody,
        });

        if (emailResponse.data?.id) {
          emailsSent.push({
            clientName: report.clientName,
            emailId: emailResponse.data.id
          });
          console.log(`✅ Email sent for ${report.clientName}`);
        } else {
          throw new Error('No email ID returned');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Email error for ${report.clientName}:`, errorMessage);
        emailErrors.push({
          clientName: report.clientName,
          error: errorMessage
        });
      }
    }

    const summary = {
      success: true,
      week_range: weekRangeFormatted,
      clients_processed: processedReports.length,
      emails_sent: emailsSent.length,
      reports: processedReports.map(r => ({ clientName: r.clientName, reportId: r.reportId })),
      emails: emailsSent,
      errors: errors.length > 0 ? errors : undefined,
      email_errors: emailErrors.length > 0 ? emailErrors : undefined,
      test_mode: testMode
    };

    console.log('\n✅ Weekly performance emails completed!');
    console.log(`📊 Reports generated: ${processedReports.length}`);
    console.log(`📧 Emails sent: ${emailsSent.length}`);
    if (errors.length > 0) console.log(`⚠️ Errors: ${errors.length}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Fatal error in send-weekly-performance-emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
