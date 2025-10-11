-- Add Cal.com Platform fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cal_managed_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cal_event_type_id TEXT,
ADD COLUMN IF NOT EXISTS cal_username TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_cal_managed_user_id ON public.profiles(cal_managed_user_id);

-- Create Cal.com Platform tokens table for secure token management
CREATE TABLE IF NOT EXISTS public.cal_platform_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_type TEXT NOT NULL CHECK (token_type IN ('access_token', 'refresh_token')),
  token_value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on platform tokens
ALTER TABLE public.cal_platform_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage platform tokens
CREATE POLICY "Admins can manage platform tokens"
ON public.cal_platform_tokens
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_cal_platform_tokens_updated_at
BEFORE UPDATE ON public.cal_platform_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();