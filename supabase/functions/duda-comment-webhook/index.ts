import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Received Duda comment webhook:', JSON.stringify(payload, null, 2));

    const { event_type, site_name, resource_data } = payload;

    if (!site_name || !resource_data) {
      console.error('Missing required fields:', { site_name, resource_data });
      return new Response(
        JSON.stringify({ error: 'Missing site_name or resource_data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up client by site_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('site_id', site_name)
      .single();

    if (clientError || !client) {
      console.error('Client not found for site_id:', site_name, clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found for site_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = client.id;

    // Handle different event types
    switch (event_type) {
      case 'NEW_CONVERSATION': {
        const { conversation_uuid, page_uuid, conversation_number, device, created_by, comment } = resource_data;
        
        // Upsert conversation
        const { data: conversation, error: convError } = await supabase
          .from('duda_conversations')
          .upsert({
            client_id: clientId,
            site_id: site_name,
            duda_conversation_uuid: conversation_uuid,
            duda_page_uuid: page_uuid,
            conversation_number: conversation_number,
            device: device,
            status: 'open',
            deleted: false,
            created_by_account: created_by,
          }, { onConflict: 'duda_conversation_uuid' })
          .select()
          .single();

        if (convError) {
          console.error('Error upserting conversation:', convError);
          throw convError;
        }

        // Insert first comment
        if (comment) {
          const { error: commentError } = await supabase
            .from('duda_conversation_comments')
            .insert({
              conversation_id: conversation.id,
              duda_comment_uuid: comment.comment_uuid,
              comment_text: comment.comment_text,
              author_account: comment.author_account,
              is_internal_reply: false,
            });

          if (commentError) {
            console.error('Error inserting comment:', commentError);
          }
        }

        // Create notifications
        await createNotifications(supabase, clientId, conversation.id, 'new_conversation', {
          page_uuid: page_uuid,
          conversation_number: conversation_number,
          created_by: created_by,
        });

        break;
      }

      case 'NEW_COMMENT': {
        const { conversation_uuid, comment } = resource_data;

        // Find conversation
        const { data: conversation } = await supabase
          .from('duda_conversations')
          .select('id')
          .eq('duda_conversation_uuid', conversation_uuid)
          .single();

        if (!conversation) {
          console.error('Conversation not found:', conversation_uuid);
          return new Response(
            JSON.stringify({ error: 'Conversation not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert comment
        const { error: commentError } = await supabase
          .from('duda_conversation_comments')
          .upsert({
            conversation_id: conversation.id,
            duda_comment_uuid: comment.comment_uuid,
            comment_text: comment.comment_text,
            author_account: comment.author_account,
            is_internal_reply: false,
          }, { onConflict: 'duda_comment_uuid' });

        if (commentError) {
          console.error('Error inserting comment:', commentError);
          throw commentError;
        }

        // Create notifications
        await createNotifications(supabase, clientId, conversation.id, 'new_comment', {
          author: comment.author_account,
        });

        break;
      }

      case 'CONVERSATION_UPDATED': {
        const { conversation_uuid, status, deleted } = resource_data;

        const updateData: any = { updated_at: new Date().toISOString() };
        if (status) updateData.status = status;
        if (deleted !== undefined) updateData.deleted = deleted;
        if (status === 'resolved') updateData.resolved_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('duda_conversations')
          .update(updateData)
          .eq('duda_conversation_uuid', conversation_uuid);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
          throw updateError;
        }

        // Create notification for status change
        if (status) {
          const { data: conversation } = await supabase
            .from('duda_conversations')
            .select('id')
            .eq('duda_conversation_uuid', conversation_uuid)
            .single();

          if (conversation) {
            await createNotifications(supabase, clientId, conversation.id, 'status_changed', { status });
          }
        }

        break;
      }

      case 'COMMENT_EDITED': {
        const { comment_uuid, comment_text } = resource_data;

        const { error: editError } = await supabase
          .from('duda_conversation_comments')
          .update({
            comment_text: comment_text,
            updated_at: new Date().toISOString(),
          })
          .eq('duda_comment_uuid', comment_uuid);

        if (editError) {
          console.error('Error editing comment:', editError);
          throw editError;
        }

        break;
      }

      default:
        console.log('Unhandled event type:', event_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createNotifications(
  supabase: any,
  clientId: string,
  conversationId: string,
  type: string,
  metadata: any
) {
  try {
    // Get conversation details
    const { data: conversation } = await supabase
      .from('duda_conversations')
      .select('conversation_number, duda_page_uuid')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    // Get admin and FMM users
    const { data: adminFmmUsers } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'fmm'])
      .contains('associated_client_ids', [clientId]);

    // Get client primary contacts
    const { data: primaryContacts } = await supabase
      .from('client_primary_contacts')
      .select('user_id')
      .eq('client_id', clientId);

    const userIds = [
      ...(adminFmmUsers?.map((u: any) => u.id) || []),
      ...(primaryContacts?.map((c: any) => c.user_id) || []),
    ];

    if (userIds.length === 0) return;

    let title = '';
    let description = '';
    let notifType = '';

    switch (type) {
      case 'new_conversation':
        title = '🗨️ New Site Comment';
        description = `New comment #${conversation.conversation_number} on page ${metadata.page_uuid || 'unknown'}`;
        notifType = 'site_comment_new';
        break;
      case 'new_comment':
        title = '💬 Reply on Site Comment';
        description = `${metadata.author} replied to comment #${conversation.conversation_number}`;
        notifType = 'site_comment_reply';
        break;
      case 'status_changed':
        title = metadata.status === 'resolved' ? '✅ Site Comment Resolved' : '🔄 Site Comment Reopened';
        description = `Comment #${conversation.conversation_number} was ${metadata.status}`;
        notifType = 'site_comment_status';
        break;
    }

    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      client_id: clientId,
      type: notifType,
      title: title,
      description: description,
      action_url: `/website/comments/${conversationId}`,
      payload_json: {
        conversation_id: conversationId,
        conversation_number: conversation.conversation_number,
        ...metadata,
      },
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Error creating notifications:', error);
  }
}
