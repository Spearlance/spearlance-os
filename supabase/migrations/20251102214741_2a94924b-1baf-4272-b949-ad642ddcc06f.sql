-- Seed default email templates for password reset flows
INSERT INTO email_templates (id, template_key, template_name, subject, html_body, variables, is_active) VALUES
(
  gen_random_uuid(),
  'password_reset',
  'Password Reset',
  'Reset Your Spearlance Password',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">Reset Your Password</h1>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi {{name}},</p>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
      We received a request to reset your password for your Spearlance account. Click the button below to create a new password:
    </p>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #4a5568; margin-bottom: 16px;">Click the button below to securely reset your password:</p>
      
      <a href="{{action_link}}" 
         style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>Important:</strong> This link will expire in 24 hours for security reasons.
      </p>
    </div>
    
    <p style="color: #718096; font-size: 14px; line-height: 1.5;">
      If you didn''t request this password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    
    <p style="color: #4a5568; margin-top: 32px;">
      Best regards,<br>
      <strong>The Spearlance Team</strong>
    </p>
  </div>',
  '["name", "email", "action_link"]'::jsonb,
  true
),
(
  gen_random_uuid(),
  'account_setup',
  'Account Setup',
  'Complete Your Spearlance Account Setup',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">Complete Your Account Setup</h1>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi {{name}},</p>
    
    <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">
      We noticed you haven''t completed your account setup yet. Click the button below to set your password and get started with Spearlance:
    </p>
    
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Set Your Password</h2>
      <p style="color: #4a5568; margin-bottom: 16px;">Click below to complete your account setup:</p>
      
      <a href="{{action_link}}" 
         style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Complete Setup
      </a>
    </div>
    
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>Important:</strong> This link will expire in 24 hours. Please complete your setup as soon as possible.
      </p>
    </div>
    
    <p style="color: #718096; font-size: 14px; line-height: 1.5;">
      If you didn''t request this, you can safely ignore this email.
    </p>
    
    <p style="color: #4a5568; margin-top: 32px;">
      Best regards,<br>
      <strong>The Spearlance Team</strong>
    </p>
  </div>',
  '["name", "email", "action_link"]'::jsonb,
  true
);