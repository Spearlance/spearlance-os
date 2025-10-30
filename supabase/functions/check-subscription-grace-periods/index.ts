import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for expired grace periods...');

    // Find clients whose grace period has expired
    const { data: expiredClients, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id, name, subscription_status, grace_period_end')
      .eq('access_locked', false)
      .not('grace_period_end', 'is', null)
      .lt('grace_period_end', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired clients:', fetchError);
      throw fetchError;
    }

    if (!expiredClients || expiredClients.length === 0) {
      console.log('No expired grace periods found');
      return new Response(
        JSON.stringify({ message: 'No expired grace periods', count: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${expiredClients.length} clients with expired grace periods`);

    // Lock access for each expired client
    const lockResults = [];
    for (const client of expiredClients) {
      console.log(`Locking access for client: ${client.name} (${client.id})`);
      
      const { error: updateError } = await supabaseAdmin
        .from('clients')
        .update({ 
          access_locked: true,
          status: 'inactive'
        })
        .eq('id', client.id);

      if (updateError) {
        console.error(`Failed to lock client ${client.id}:`, updateError);
        lockResults.push({ clientId: client.id, success: false, error: updateError.message });
      } else {
        console.log(`Successfully locked client: ${client.name}`);
        lockResults.push({ clientId: client.id, clientName: client.name, success: true });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Grace period check completed',
        totalProcessed: expiredClients.length,
        results: lockResults
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in grace period check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
