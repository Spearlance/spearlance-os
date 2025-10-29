import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  ticketId: string;
  type: "created" | "assigned" | "status_changed" | "new_message";
  messageId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { ticketId, type, messageId }: TicketNotificationRequest = await req.json();

    console.log(`Processing ${type} notification for ticket ${ticketId}`);

    // Get ticket details with related data
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        *,
        client:clients(name, domain),
        requester:profiles!tickets_requester_user_id_fkey(name, email),
        owner:profiles!tickets_owner_user_id_fkey(name, email)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error(`Ticket not found: ${ticketError?.message}`);
    }

    const appUrl = `${supabaseUrl.replace('.supabase.co', '')}/support/${ticketId}`;
    
    switch (type) {
      case "created":
        // Email to client (requester)
        await resend.emails.send({
          from: "Spearlance Support <support@spearlance.com>",
          to: [ticket.requester.email],
          subject: `Support Ticket #${ticket.id.slice(0, 8)} Created - We'll respond within 48 hours`,
          html: `
            <h2>Your Support Ticket Has Been Created</h2>
            <p>Hi ${ticket.requester.name},</p>
            <p>We've received your support ticket and will respond within 48 hours.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${ticket.title}</h3>
              <p><strong>Category:</strong> ${ticket.category}</p>
              <p><strong>Priority:</strong> ${ticket.priority}</p>
              <p><strong>Status:</strong> ${ticket.status}</p>
            </div>

            <p><strong>Ticket ID:</strong> ${ticket.id.slice(0, 8)}</p>
            <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>

            <a href="${appUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Ticket
            </a>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              You can reply to updates directly from your dashboard or via email notifications.
            </p>
          `,
        });

        // Email to admins and assigned owner
        const adminEmails: string[] = [];
        const { data: admins } = await supabase
          .from("profiles")
          .select("email")
          .eq("role", "admin");
        
        if (admins) {
          adminEmails.push(...admins.map(a => a.email));
        }

        if (ticket.owner?.email && !adminEmails.includes(ticket.owner.email)) {
          adminEmails.push(ticket.owner.email);
        }

        if (adminEmails.length > 0) {
          await resend.emails.send({
            from: "Spearlance Support <support@spearlance.com>",
            to: adminEmails,
            subject: `🚨 New Support Ticket from ${ticket.client.name}`,
            html: `
              <h2>New Support Ticket Created</h2>
              <p><strong>Client:</strong> ${ticket.client.name}</p>
              <p><strong>Requester:</strong> ${ticket.requester.name}</p>
              
              <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <p style="margin: 0;"><strong>⏰ SLA Deadline:</strong> ${new Date(ticket.sla_due_at).toLocaleString()}</p>
                <p style="margin: 8px 0 0 0; color: #92400e;">Must respond within 48 hours</p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${ticket.title}</h3>
                <p><strong>Category:</strong> ${ticket.category}</p>
                <p><strong>Priority:</strong> ${ticket.priority}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
              </div>

              <a href="${appUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View & Respond
              </a>
            `,
          });
        }
        break;

      case "assigned":
        if (ticket.owner?.email) {
          const hoursRemaining = Math.round(
            (new Date(ticket.sla_due_at).getTime() - Date.now()) / (1000 * 60 * 60)
          );

          await resend.emails.send({
            from: "Spearlance Support <support@spearlance.com>",
            to: [ticket.owner.email],
            subject: `📋 Support Ticket Assigned: ${ticket.title}`,
            html: `
              <h2>A Support Ticket Has Been Assigned to You</h2>
              <p>Hi ${ticket.owner.name},</p>
              
              <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <p style="margin: 0;"><strong>⏰ Time Remaining:</strong> ${hoursRemaining} hours</p>
                <p style="margin: 8px 0 0 0; color: #92400e;">SLA Deadline: ${new Date(ticket.sla_due_at).toLocaleString()}</p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${ticket.title}</h3>
                <p><strong>Client:</strong> ${ticket.client.name}</p>
                <p><strong>Category:</strong> ${ticket.category}</p>
                <p><strong>Priority:</strong> ${ticket.priority}</p>
              </div>

              <a href="${appUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Ticket
              </a>
            `,
          });
        }
        break;

      case "status_changed":
        await resend.emails.send({
          from: "Spearlance Support <support@spearlance.com>",
          to: [ticket.requester.email],
          subject: `Support Ticket #${ticket.id.slice(0, 8)} Status Updated`,
          html: `
            <h2>Your Support Ticket Status Has Been Updated</h2>
            <p>Hi ${ticket.requester.name},</p>
            <p>The status of your support ticket has been updated.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${ticket.title}</h3>
              <p><strong>New Status:</strong> <span style="background: #e0e0e0; padding: 4px 12px; border-radius: 4px;">${ticket.status.replace("_", " ")}</span></p>
            </div>

            <a href="${appUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Ticket
            </a>
          `,
        });
        break;

      case "new_message":
        if (messageId) {
          const { data: message } = await supabase
            .from("ticket_messages")
            .select(`
              *,
              sender:profiles!ticket_messages_sender_user_id_fkey(name, email)
            `)
            .eq("id", messageId)
            .single();

          if (message && !message.is_internal) {
            // Determine recipient
            const isFromClient = message.sender_user_id === ticket.requester_user_id;
            const recipientEmail = isFromClient 
              ? ticket.owner?.email 
              : ticket.requester.email;
            const recipientName = isFromClient
              ? ticket.owner?.name
              : ticket.requester.name;

            if (recipientEmail) {
              await resend.emails.send({
                from: "Spearlance Support <support@spearlance.com>",
                to: [recipientEmail],
                subject: `💬 New Message on Ticket #${ticket.id.slice(0, 8)}`,
                html: `
                  <h2>New Message on Your Support Ticket</h2>
                  <p>Hi ${recipientName},</p>
                  <p><strong>${message.sender.name}</strong> replied to your ticket:</p>
                  
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000;">
                    <p style="margin: 0; white-space: pre-wrap;">${message.message}</p>
                  </div>

                  <p style="color: #666; font-size: 14px; margin-top: 10px;">
                    <strong>Ticket:</strong> ${ticket.title}
                  </p>

                  <a href="${appUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                    View & Respond
                  </a>
                `,
              });
            }
          }
        }
        break;
    }

    return new Response(
      JSON.stringify({ success: true, message: `${type} notification sent` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending ticket notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});