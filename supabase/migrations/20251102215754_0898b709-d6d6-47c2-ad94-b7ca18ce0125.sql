-- Update user_invitation email template to simplified version (direct login)
UPDATE email_templates
SET 
  subject = 'Welcome to {{client_name}} on Spearlance!',
  html_body = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
    .credentials { background: white; border: 2px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .credential-row:last-child { border-bottom: none; }
    .credential-label { font-weight: 600; color: #6b7280; }
    .credential-value { font-family: monospace; color: #111827; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
    .note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #111827; margin: 0;">Welcome to Spearlance!</h1>
    </div>
    
    <div class="content">
      <p>Hi {{name}},</p>
      
      <p>You''ve been invited to join <strong>{{client_name}}</strong> on the Spearlance platform. Your account has been created and is ready to use!</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0; color: #111827;">Your Login Credentials</h3>
        <div class="credential-row">
          <span class="credential-label">Email:</span>
          <span class="credential-value">{{email}}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Temporary Password:</span>
          <span class="credential-value">{{password}}</span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="{{app_url}}" class="button">Login Now →</a>
      </div>
      
      <div class="note">
        <strong>💡 Tip:</strong> You can change your password anytime from Settings → Profile after logging in.
      </div>
    </div>
    
    <div class="footer">
      <p>Need help? Contact your administrator or visit our support center.</p>
      <p style="margin-top: 20px;">
        <strong>Spearlance</strong><br>
        Your Marketing Operations Platform
      </p>
    </div>
  </div>
</body>
</html>
  ',
  updated_at = now()
WHERE template_key = 'user_invitation';