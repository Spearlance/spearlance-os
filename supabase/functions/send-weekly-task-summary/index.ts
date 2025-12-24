import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const formatDateRange = (start: Date, end: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
};

const formatDuration = (startedAt: string | null, completedAt: string | null): string => {
  if (!startedAt || !completedAt) return 'N/A';
  
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  
  if (diffDays > 0) {
    return `${diffDays}d ${remainingHours}h`;
  }
  return `${diffHours}h`;
};

const calculateAverageDuration = (tasks: any[]): string => {
  const tasksWithDuration = tasks.filter(t => t.started_at && t.completed_at);
  if (tasksWithDuration.length === 0) return '';
  
  let totalMs = 0;
  for (const task of tasksWithDuration) {
    const start = new Date(task.started_at);
    const end = new Date(task.completed_at);
    totalMs += end.getTime() - start.getTime();
  }
  
  const avgMs = totalMs / tasksWithDuration.length;
  const avgHours = Math.floor(avgMs / (1000 * 60 * 60));
  const avgDays = Math.floor(avgHours / 24);
  const remainingHours = avgHours % 24;
  
  if (avgDays > 0) {
    return `${avgDays}d ${remainingHours}h`;
  }
  return `${avgHours}h`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly task summary email generation...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const appUrl = "https://app.spearlance.com";
    
    // Calculate week boundaries (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday - 7); // Last Monday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Last Sunday
    weekEnd.setHours(23, 59, 59, 999);
    
    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(today.getDate() + (7 - dayOfWeek));
    nextWeekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString();
    const weekEndStr = weekEnd.toISOString();

    console.log(`Processing week: ${weekStartStr} to ${weekEndStr}`);

    // Get all admin and FMM users
    const { data: internalUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .in("role", ["admin", "fmm"]);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    if (!internalUsers || internalUsers.length === 0) {
      console.log("No admin/fmm users found");
      return new Response(JSON.stringify({ message: "No recipients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${internalUsers.length} internal users to email`);

    let emailsSent = 0;

    for (const user of internalUsers) {
      if (!user.email) continue;

      console.log(`Processing tasks for user: ${user.name} (${user.email})`);

      // Get tasks assigned to this user
      const { data: assignedTaskIds } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id);

      const taskIds = assignedTaskIds?.map(t => t.task_id) || [];

      // Fetch all relevant tasks with client info
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id, title, status, priority, due_date, started_at, completed_at, created_at,
          clients:client_id (name)
        `)
        .in("id", taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']);

      const allTasks = tasks || [];

      // Categorize tasks
      const completedThisWeek = allTasks.filter(t => 
        t.completed_at && 
        new Date(t.completed_at) >= weekStart && 
        new Date(t.completed_at) <= weekEnd
      );

      const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');

      const overdueTasks = allTasks.filter(t => 
        t.due_date && 
        new Date(t.due_date) < today && 
        t.status !== 'done'
      );

      const upcomingTasks = allTasks.filter(t => 
        t.due_date && 
        new Date(t.due_date) > today && 
        new Date(t.due_date) <= nextWeekEnd &&
        t.status !== 'done'
      );

      // Calculate average duration
      const avgDuration = calculateAverageDuration(completedThisWeek);

      // Build email HTML
      let htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; margin-bottom: 8px;">Your Weekly Task Summary</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">Hi ${user.name}, here's your task performance for the week of ${formatDateRange(weekStart, weekEnd)}:</p>
          
          <table style="width: 100%; margin-bottom: 24px;" cellpadding="0" cellspacing="8">
            <tr>
              <td style="background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <div style="font-size: 32px; font-weight: bold; color: #10b981;">${completedThisWeek.length}</div>
                <div style="color: #6b7280; font-size: 14px;">Completed</div>
              </td>
              <td style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${inProgressTasks.length}</div>
                <div style="color: #6b7280; font-size: 14px;">In Progress</div>
              </td>
              <td style="background: #fef2f2; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${overdueTasks.length}</div>
                <div style="color: #6b7280; font-size: 14px;">Overdue</div>
              </td>
            </tr>
          </table>
      `;

      if (avgDuration) {
        htmlBody += `
          <p style="color: #374151; margin-bottom: 24px;"><strong>Average Task Completion Time:</strong> ${avgDuration}</p>
        `;
      }

      if (completedThisWeek.length > 0) {
        htmlBody += `
          <h2 style="color: #10b981; font-size: 18px; margin-top: 24px;">✅ Completed This Week</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="background: #f9fafb;">
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Task</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Client</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Duration</th>
            </tr>
            ${completedThisWeek.map(t => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.title}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${(t.clients as any)?.name || 'Unknown'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatDuration(t.started_at, t.completed_at)}</td>
              </tr>
            `).join('')}
          </table>
        `;
      }

      if (overdueTasks.length > 0) {
        htmlBody += `
          <h2 style="color: #ef4444; font-size: 18px; margin-top: 24px;">⚠️ Overdue Tasks</h2>
          <ul style="padding-left: 20px;">
            ${overdueTasks.map(t => `<li style="margin-bottom: 8px;"><strong>${t.title}</strong> - Due: ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${(t.clients as any)?.name || 'Unknown'})</li>`).join('')}
          </ul>
        `;
      }

      if (upcomingTasks.length > 0) {
        htmlBody += `
          <h2 style="color: #3b82f6; font-size: 18px; margin-top: 24px;">📅 Coming Up Next Week</h2>
          <ul style="padding-left: 20px;">
            ${upcomingTasks.map(t => `<li style="margin-bottom: 8px;"><strong>${t.title}</strong> - Due: ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${(t.clients as any)?.name || 'Unknown'})</li>`).join('')}
          </ul>
        `;
      }

      htmlBody += `
          <p style="margin-top: 32px;">
            <a href="${appUrl}/tasks" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View All Tasks</a>
          </p>
          <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">Keep up the great work!</p>
        </div>
      `;

      // Send email
      try {
        const emailResult = await resend.emails.send({
          from: "Spearlance <notifications@spearlance.com>",
          to: [user.email],
          subject: `📊 Weekly Task Summary - ${formatDateRange(weekStart, weekEnd)}`,
          html: htmlBody,
        });

        console.log(`Email sent to ${user.email}:`, emailResult);
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
      }
    }

    console.log(`Weekly task summary complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-task-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
