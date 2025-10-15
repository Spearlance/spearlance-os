-- Create admin_rate_limits table
CREATE TABLE public.admin_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_rate_limits_lookup 
ON admin_rate_limits(admin_user_id, operation, window_start);

ALTER TABLE admin_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own rate limits"
ON admin_rate_limits FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

CREATE POLICY "Service role can manage rate limits"
ON admin_rate_limits FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create admin_2fa_status table
CREATE TABLE public.admin_2fa_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enrolled BOOLEAN NOT NULL DEFAULT false,
  enrollment_required_by TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_2fa_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own 2FA status"
ON admin_2fa_status FOR ALL
TO authenticated
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));