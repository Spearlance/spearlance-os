import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: "Spearlance Support <support@spearlance.co>", to, subject, html }),
  });
  return response.json();
}
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  ticketId: string;
  type: "created" | "assigned" | "status_changed" | "new_message";
  messageId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, type, messageId }: TicketNotificationRequest = await req.json();
    console.log(`Processing ${type} notification for ticket ${ticketId}`);

    // Fetch ticket details with related data
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        *,
        client:clients(name, id),
        requester:profiles!tickets_requester_user_id_fkey(email, full_name),
        owner:profiles!tickets_owner_user_id_fkey(email, full_name)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Error fetching ticket:", ticketError);
      throw new Error("Ticket not found");
    }

    const ticketUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/support`;

    // Handle different notification types
    switch (type) {
      case "created":
        // Email to requester
        await sendEmail([ticket.requester.email], `Support Ticket #${ticket.ticket_number} Created`,
          `
            <h2>Your support ticket has been created</h2>
            <p>Hi ${ticket.requester.full_name || 'there'},</p>
            <p>Thank you for contacting us. Your support ticket has been created and our team will respond within 48 hours.</p>
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
              <strong>Ticket #${ticket.ticket_number}</strong><br/>
              <strong>Subject:</strong> ${ticket.title}<br/>
              <strong>Category:</strong> ${ticket.category}<br/>
              <strong>Priority:</strong> ${ticket.priority}<br/>
              <strong>SLA:</strong> Response within 48 hours
            </div>
            <p><a href="${ticketUrl}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a></p>
            <p>Best regards,<br/>Spearlance Support Team</p>
          `
        );

        // Email to admins/FMMs
        const { data: admins } = await supabase
          .from("profiles")
          .select("email, full_name")
          .or("role.eq.admin,role.eq.fmm");

        if (admins && admins.length > 0) {
          await sendEmail(admins.map(a => a.email), `New Support Ticket #${ticket.ticket_number} - ${ticket.client.name}`, `
              <h2>New Support Ticket</h2>
              <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <strong>Ticket #${ticket.ticket_number}</strong><br/>
                <strong>Client:</strong> ${ticket.client.name}<br/>
                <strong>From:</strong> ${ticket.requester.full_name} (${ticket.requester.email})<br/>
                <strong>Subject:</strong> ${ticket.title}<br/>
                <strong>Category:</strong> ${ticket.category}<br/>
                <strong>Priority:</strong> ${ticket.priority}<br/>
                <strong>SLA:</strong> Response within 48 hours
              </div>
              <p><a href="${ticketUrl}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a></p>
            `
          );
        }
        break;

      case "assigned":
        if (ticket.owner) {
          await sendEmail([ticket.owner.email], `Support Ticket #${ticket.ticket_number} Assigned to You`, `
              <h2>A support ticket has been assigned to you</h2>
              <p>Hi ${ticket.owner.full_name || 'there'},</p>
              <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <strong>Ticket #${ticket.ticket_number}</strong><br/>
                <strong>Client:</strong> ${ticket.client.name}<br/>
                <strong>From:</strong> ${ticket.requester.full_name}<br/>
                <strong>Subject:</strong> ${ticket.title}<br/>
                <strong>Priority:</strong> ${ticket.priority}<br/>
                <strong>SLA:</strong> Response within 48 hours
              </div>
              <p><a href="${ticketUrl}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a></p>
            `
          );
        }
        break;

      case "status_changed":
        await sendEmail([ticket.requester.email], `Ticket #${ticket.ticket_number} Status Updated`, `
            <h2>Your support ticket status has been updated</h2>
            <p>Hi ${ticket.requester.full_name || 'there'},</p>
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
              <strong>Ticket #${ticket.ticket_number}</strong><br/>
              <strong>Subject:</strong> ${ticket.title}<br/>
              <strong>New Status:</strong> ${ticket.status}
            </div>
            <p><a href="${ticketUrl}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a></p>
            <p>Best regards,<br/>Spearlance Support Team</p>
          `
        );
        break;

      case "new_message":
        if (messageId) {
          const { data: message } = await supabase
            .from("ticket_messages")
            .select(`
              *,
              author:profiles!ticket_messages_author_user_id_fkey(email, full_name)
            `)
            .eq("id", messageId)
            .single();

          if (message) {
            // Determine recipient (if author is owner, send to requester, else send to owner)
            const isFromOwner = message.author_user_id === ticket.owner_user_id;
            const recipientEmail = isFromOwner ? ticket.requester.email : ticket.owner?.email;

            if (recipientEmail) {
              await sendEmail([recipientEmail], `New Message on Ticket #${ticket.ticket_number}`, `
                  <h2>New message on your support ticket</h2>
                  <p>Hi ${isFromOwner ? ticket.requester.full_name : ticket.owner?.full_name},</p>
                  <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                    <strong>Ticket #${ticket.ticket_number}</strong><br/>
                    <strong>From:</strong> ${message.author.full_name}<br/>
                    <strong>Message:</strong><br/>
                    <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px;">
                      ${message.body_richtext}
                    </div>
                  </div>
                  <p><a href="${ticketUrl}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View & Reply</a></p>
                `
              );
            }
          }
        }
        break;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
