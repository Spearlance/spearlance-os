-- ============================================
-- PHASE 1: Email Templates System
-- ============================================

-- Email templates table for managing all email content
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL, -- e.g., 'user_invitation', 'magic_link'
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL, -- Full HTML with {{variables}}
  variables JSONB DEFAULT '[]'::jsonb, -- List of available variables
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- System defaults cannot be deleted
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PHASE 2: Auto-Generated Passwords
-- ============================================

-- Temporary passwords table for secure storage
CREATE TABLE IF NOT EXISTS public.temp_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.temp_passwords ENABLE ROW LEVEL SECURITY;

-- Service role only (edge functions)
CREATE POLICY "Service role can manage temp passwords"
  ON public.temp_passwords
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Index for lookups
CREATE INDEX idx_temp_passwords_user_id ON public.temp_passwords(user_id);
CREATE INDEX idx_temp_passwords_used ON public.temp_passwords(used, expires_at);

-- ============================================
-- PHASE 3: Magic Link Rate Limiting
-- ============================================

-- Magic link requests table for rate limiting
CREATE TABLE IF NOT EXISTS public.magic_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '15 minutes'),
  used BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.magic_link_requests ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role can manage magic link requests"
  ON public.magic_link_requests
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Index for rate limiting checks
CREATE INDEX idx_magic_link_email_time ON public.magic_link_requests(email, requested_at);

-- ============================================
-- Insert Default Email Templates
-- ============================================

INSERT INTO public.email_templates (template_key, template_name, subject, html_body, variables, is_default) VALUES
('user_invitation', 'User Invitation', '{{inviter_name}} invited you to join {{client_name}}', 
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 3px solid #13cf48;">
              <img src="https://os.spearlance.com/spearlance-logo.png" alt="Spearlance" style="height: 60px; max-width: 100%;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #000000; margin: 0 0 24px 0; font-size: 28px; font-weight: 600;">You''re invited to join {{client_name}}!</h1>
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;">Hi {{name}},</p>
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;"><strong>{{inviter_name}}</strong> has invited you to collaborate on <strong>{{client_name}}</strong>''s workspace.</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #13cf48; margin: 0 0 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;"><strong>Your Login Credentials:</strong></p>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #666666;">Email: {{email}}</p>
                <p style="margin: 0; font-size: 16px; color: #333333; font-weight: 600;">Password: {{password}}</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{app_url}}" style="display: inline-block; padding: 16px 40px; background-color: #13cf48; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Log In Now</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 0;">After logging in, you can change your password in Settings.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #000000; padding: 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #ffffff; font-weight: 600;">Garrett Handley</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #13cf48;">Founder, CEO</p>
              <p style="margin: 0; font-size: 14px; color: #cccccc;">Spearlance LLC</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
'["name", "email", "password", "client_name", "inviter_name", "app_url"]'::jsonb,
true),

('magic_link', 'Magic Link Login', 'Your magic link to log in to Spearlance', 
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 3px solid #13cf48;">
              <img src="https://os.spearlance.com/spearlance-logo.png" alt="Spearlance" style="height: 60px; max-width: 100%;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #000000; margin: 0 0 24px 0; font-size: 28px; font-weight: 600;">Your Magic Link</h1>
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 16px 0;">Hi {{name}},</p>
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 24px 0;">Click the button below to securely log in to your Spearlance account. No password needed!</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="{{action_link}}" style="display: inline-block; padding: 16px 40px; background-color: #13cf48; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Log In with Magic Link</a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fff3cd; padding: 16px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 0 0 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;"><strong>⏱️ Expires in 15 minutes</strong></p>
              </div>
              <p style="font-size: 14px; color: #999999; line-height: 1.6; margin: 0;">If you didn''t request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
'["name", "email", "action_link"]'::jsonb,
true),

('existing_user_added', 'Added to Client', '{{inviter_name}} added you to {{client_name}}', 
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 3px solid #13cf48;">
              <img src="https://os.spearlance.com/spearlance-logo.png" alt="Spearlance" style="height: 60px;">
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #000000; margin: 0 0 24px 0; font-size: 28px;">You''ve been added to {{client_name}}!</h1>
              <p style="font-size: 16px; color: #333333; line-height: 1.6;">Hi {{name}},</p>
              <p style="font-size: 16px; color: #333333; line-height: 1.6;"><strong>{{inviter_name}}</strong> has added you to <strong>{{client_name}}</strong>''s workspace.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="{{app_url}}" style="display: inline-block; padding: 16px 40px; background-color: #13cf48; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Go to Spearlance</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
'["name", "email", "client_name", "inviter_name", "app_url"]'::jsonb,
true);