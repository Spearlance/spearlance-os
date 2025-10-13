import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token parameter", { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find user by ical token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, associated_client_ids")
      .eq("ical_feed_token", token)
      .single();

    if (profileError || !profile) {
      console.error("Invalid token:", profileError);
      return new Response("Invalid or expired token", { 
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Get all meetings for clients this user has access to
    let meetingsQuery = supabase
      .from("meetings")
      .select(`
        id,
        date_time,
        summary,
        attendees,
        join_url,
        status,
        decisions,
        next_steps,
        client_id
      `);

    // Filter based on user role
    if (profile.role === "client") {
      meetingsQuery = meetingsQuery.in("client_id", profile.associated_client_ids || []);
    }

    const { data: meetings, error: meetingsError } = await meetingsQuery
      .order("date_time", { ascending: false });

    if (meetingsError) {
      console.error("Error fetching meetings:", meetingsError);
      return new Response("Error fetching meetings", { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // Generate iCal format
    const icalLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Spearlance//Client Meetings//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Spearlance Client Meetings",
      "X-WR-TIMEZONE:UTC",
    ];

    for (const meeting of meetings || []) {
      const startDate = new Date(meeting.date_time);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      const formatICalDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };

      // Extract title from summary (first line if it starts with #)
      const summaryLines = meeting.summary?.split("\n") || [];
      let title = "Client Meeting";
      let description = meeting.summary || "";

      if (summaryLines[0]?.startsWith("#")) {
        title = summaryLines[0].replace(/^#+\s*/, "");
        description = summaryLines.slice(1).join("\n").trim();
      }

      // Build description with decisions and next steps
      let fullDescription = description;
      if (meeting.decisions && meeting.decisions.length > 0) {
        fullDescription += "\n\nDecisions:\n" + meeting.decisions.map((d: string) => `- ${d}`).join("\n");
      }
      if (meeting.next_steps && meeting.next_steps.length > 0) {
        fullDescription += "\n\nNext Steps:\n" + meeting.next_steps.map((s: string) => `- ${s}`).join("\n");
      }

      icalLines.push("BEGIN:VEVENT");
      icalLines.push(`UID:meeting-${meeting.id}@spearlance.app`);
      icalLines.push(`DTSTAMP:${formatICalDate(new Date())}`);
      icalLines.push(`DTSTART:${formatICalDate(startDate)}`);
      icalLines.push(`DTEND:${formatICalDate(endDate)}`);
      icalLines.push(`SUMMARY:${title}`);
      
      // Escape special characters in description
      const escapedDescription = fullDescription
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
      icalLines.push(`DESCRIPTION:${escapedDescription}`);

      if (meeting.join_url) {
        icalLines.push(`LOCATION:${meeting.join_url}`);
      }
      if (meeting.attendees) {
        icalLines.push(`ATTENDEES:${meeting.attendees}`);
      }
      
      const statusMap: { [key: string]: string } = {
        scheduled: "CONFIRMED",
        completed: "CONFIRMED",
        cancelled: "CANCELLED",
      };
      icalLines.push(`STATUS:${statusMap[meeting.status] || "CONFIRMED"}`);
      
      icalLines.push("END:VEVENT");
    }

    icalLines.push("END:VCALENDAR");

    const icalContent = icalLines.join("\r\n");

    return new Response(icalContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="spearlance-meetings.ics"',
      },
    });
  } catch (error) {
    console.error("iCal generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
