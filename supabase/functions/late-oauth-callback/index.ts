import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const connected = url.searchParams.get('connected');
  const username = url.searchParams.get('username');
  const profileId = url.searchParams.get('profileId');
  const error = url.searchParams.get('error');
  const platform = url.searchParams.get('platform');

  console.log('OAuth callback received:', { connected, username, profileId, error, platform });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${error ? 'Connection Failed' : 'Connection Successful'}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: ${error ? '#fee2e2' : '#dcfce7'};
        }
        .message {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="message">
        <div class="icon">${error ? '❌' : '✅'}</div>
        <h1>${error ? 'Connection Failed' : 'Connected Successfully!'}</h1>
        <p>${error ? `Error: ${error}` : `Connected ${connected} as @${username}`}</p>
        <p><small>This window will close automatically...</small></p>
      </div>
      <script>
        // Log for debugging
        console.log('OAuth callback:', ${JSON.stringify({ connected, username, profileId, error, platform })});
        
        // Close window after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
});
