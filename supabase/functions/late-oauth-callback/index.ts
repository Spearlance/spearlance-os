import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const connected = url.searchParams.get('connected');
  const username = url.searchParams.get('username');
  const profileId = url.searchParams.get('profileId');
  const error = url.searchParams.get('error');
  const platform = url.searchParams.get('platform');

  console.log('OAuth callback received:', { connected, username, profileId, error, platform });

  const message = error 
    ? `Connection failed: ${error}\n\nYou can close this popup.`
    : `Connection successful!\n\nConnected ${connected} as @${username}\n\nYou can close this popup.`;

  return new Response(message, {
    headers: { 'Content-Type': 'text/plain' }
  });
});
