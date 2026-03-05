export async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('chat_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .gte('window_start', oneHourAgo.toISOString())
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    throw error;
  }

  if (!data) {
    // First request in this window
    await supabase.from('chat_rate_limits').insert({
      user_id: userId,
      request_count: 1,
      window_start: new Date().toISOString()
    });
    return true;
  }

  if (data.request_count >= 60) {
    return false; // Rate limit exceeded
  }

  // Increment count
  await supabase
    .from('chat_rate_limits')
    .update({
      request_count: data.request_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  return true;
}
