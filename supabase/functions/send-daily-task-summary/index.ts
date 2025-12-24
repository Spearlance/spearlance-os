import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDuration = (startedAt: string | null, completedAt: string | null): string => {
  if (!startedAt || !completedAt) return '';
  
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily task summary email generation...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const appUrl = "https://app.spearlance.com";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

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

      if (taskIds.length === 0) {
        console.log(`No tasks for user ${user.name}, skipping`);
        continue;
      }

      // Fetch all relevant tasks with client info
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id, title, status, priority, due_date, started_at, completed_at, created_at,
          clients:client_id (name)
        `)
        .in("id", taskIds);

      if (!tasks || tasks.length === 0) continue;

      // Categorize tasks
      const overdueTasks = tasks.filter(t => 
        t.due_date && 
        new Date(t.due_date) < today && 
        t.status !== 'done'
      ).map(t => ({
        title: t.title,
        due_date: new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        client_name: (t.clients as any)?.name || 'Unknown'
      }));

      const dueTodayTasks = tasks.filter(t => 
        t.due_date && 
        t.due_date.startsWith(todayStr) && 
        t.status !== 'done'
      ).map(t => ({
        title: t.title,
        client_name: (t.clients as any)?.name || 'Unknown'
      }));

      const completedYesterday = tasks.filter(t => 
        t.completed_at && 
        t.completed_at.startsWith(yesterdayStr)
      ).map(t => ({
        title: t.title,
        duration: formatDuration(t.started_at, t.completed_at),
        client_name: (t.clients as any)?.name || 'Unknown'
      }));

      // Get new assignments from yesterday
      const { data: newAssignments } = await supabase
        .from("task_assignees")
        .select(`
          task_id,
          created_at,
          tasks:task_id (
            id, title,
            clients:client_id (name),
            profiles:creator_user_id (name)
          )
        `)
        .eq("user_id", user.id)
        .gte("created_at", yesterdayStr)
        .lt("created_at", todayStr);

      const newAssignmentsList = (newAssignments || []).map(a => ({
        title: (a.tasks as any)?.title || 'Unknown Task',
        assigned_by: (a.tasks as any)?.profiles?.name || 'Someone',
        client_name: (a.tasks as any)?.clients?.name || 'Unknown'
      }));

      // Skip if nothing to report
      if (overdueTasks.length === 0 && dueTodayTasks.length === 0 && 
          completedYesterday.length === 0 && newAssignmentsList.length === 0) {
        console.log(`No tasks to report for ${user.name}`);
        continue;
      }

      // Build email HTML
      let htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; margin-bottom: 8px;">Your Daily Task Summary</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">Hi ${user.name},</p>
      `;

      if (overdueTasks.length > 0) {
        htmlBody += `
          <h2 style="color: #ef4444; font-size: 18px; margin-top: 24px;">⚠️ Overdue Tasks (${overdueTasks.length})</h2>
          <ul style="padding-left: 20px;">
            ${overdueTasks.map(t => `<li style="margin-bottom: 8px;"><strong>${t.title}</strong> - Due: ${t.due_date} (${t.client_name})</li>`).join('')}
          </ul>
        `;
      }

      if (dueTodayTasks.length > 0) {
        htmlBody += `
          <h2 style="color: #f59e0b; font-size: 18px; margin-top: 24px;">📅 Due Today (${dueTodayTasks.length})</h2>
          <ul style="padding-left: 20px;">
            ${dueTodayTasks.map(t => `<li style="margin-bottom: 8px;"><strong>${t.title}</strong> (${t.client_name})</li>`).join('')}
          </ul>
        `;
      }

      if (newAssignmentsList.length > 0) {
        htmlBody += `
          <h2 style="color: #3b82f6; font-size: 18px; margin-top: 24px;">🆕 New Assignments (${newAssignmentsList.length})</h2>
          <ul style="padding-left: 20px;">
            ${newAssignmentsList.map(t => `<li style="margin-bottom: 8px;"><strong>${t.title}</strong> - Assigned by ${t.assigned_by} (${t.client_name})</li>`).join('')}
          </ul>
        `;
      }

      if (completedYesterday.length > 0) {
        htmlBody += `
          <h2 style="color: #10b981; font-size: 18px; margin-top: 24px;">✅ Completed Yesterday (${completedYesterday.length})</h2>
          <ul style="padding-left: 20px;">
            ${completedYesterday.map(t => `<li style="margin-bottom: 8px;"><strong>${t.title}</strong>${t.duration ? ` - ${t.duration}` : ''} (${t.client_name})</li>`).join('')}
          </ul>
        `;
      }

      htmlBody += `
          <p style="margin-top: 32px;">
            <a href="${appUrl}/tasks" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View All Tasks</a>
          </p>
          <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">Have a productive day!</p>
        </div>
      `;

      // Send email
      try {
        const emailResult = await resend.emails.send({
          from: "Spearlance <notifications@spearlance.com>",
          to: [user.email],
          subject: `📋 Your Tasks for Today - ${formatDate(today)}`,
          html: htmlBody,
        });

        console.log(`Email sent to ${user.email}:`, emailResult);
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
      }
    }

    console.log(`Daily task summary complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-daily-task-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
