import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  triggerEvent: string;
  uid: string;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  organizer: {
    email: string;
    name: string;
  };
  attendees: Array<{
    email: string;
    name: string;
  }>;
  metadata?: {
    videoCallUrl?: string;
  };
  status?: string;
  timeZone?: string;
}

// Verify webhook signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return signatureHex === signature;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let webhookLog;
  
  try {
    const signature = req.headers.get('x-cal-signature-256');
    const rawBody = await req.text();
    const payload: WebhookPayload = JSON.parse(rawBody);
    
    console.log('Received webhook:', payload.triggerEvent);

    // Log webhook event
    const { data: logData } = await supabase
      .from('cal_webhook_logs')
      .insert({
        event_type: payload.triggerEvent,
        payload: payload,
        processed: false
      })
      .select()
      .single();
    
    webhookLog = logData;

    // Verify signature if secret is configured
    const webhookSecret = Deno.env.get('CAL_WEBHOOK_SECRET');
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Map attendee email to client
    let clientId = '00000000-0000-0000-0000-000000000000'; // Default "Unassigned"
    
    if (payload.attendees && payload.attendees.length > 0) {
      const attendeeEmail = payload.attendees[0].email;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('associated_client_ids')
        .eq('email', attendeeEmail)
        .single();
      
      if (profile?.associated_client_ids && profile.associated_client_ids.length > 0) {
        clientId = profile.associated_client_ids[0];
      }
    }

    // Extract attendee emails and names
    const attendeeEmails = payload.attendees?.map(a => a.email) || [];
    const attendeeNames = payload.attendees?.map(a => a.name).join(', ') || '';

    // Handle different event types
    switch (payload.triggerEvent) {
      case 'BOOKING_CREATED': {
        await supabase.from('meetings').insert({
          cal_booking_id: payload.uid,
          cal_event_id: payload.eventTypeId.toString(),
          cal_event_type_id: payload.eventTypeId.toString(),
          cal_organizer_email: payload.organizer.email,
          cal_attendee_emails: attendeeEmails,
          client_id: clientId,
          date_time: payload.startTime,
          summary: payload.title || 'Cal.com Meeting',
          attendees: attendeeNames,
          join_url: payload.metadata?.videoCallUrl,
          status: 'scheduled',
          source_system: 'cal.com',
          timezone: payload.timeZone || 'UTC'
        });
        console.log('Created meeting for booking:', payload.uid);
        break;
      }

      case 'BOOKING_RESCHEDULED': {
        await supabase
          .from('meetings')
          .update({
            date_time: payload.startTime,
            status: 'scheduled'
          })
          .eq('cal_booking_id', payload.uid);
        console.log('Rescheduled meeting:', payload.uid);
        break;
      }

      case 'BOOKING_CANCELLED': {
        await supabase
          .from('meetings')
          .update({ status: 'cancelled' })
          .eq('cal_booking_id', payload.uid);
        console.log('Cancelled meeting:', payload.uid);
        break;
      }

      default:
        console.log('Unhandled event type:', payload.triggerEvent);
    }

    // Mark webhook as processed
    if (webhookLog) {
      await supabase
        .from('cal_webhook_logs')
        .update({ processed: true })
        .eq('id', webhookLog.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    // Log error
    if (webhookLog) {
      await supabase
        .from('cal_webhook_logs')
        .update({ 
          processed: false,
          error_message: errorMessage
        })
        .eq('id', webhookLog.id);
    }

    // Always return 200 to prevent Cal.com retries
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
