-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_user_created ON public.user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_user_activity_logs_action_type ON public.user_activity_logs(action_type);

-- Add last_login_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read policy using the has_role function
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own activity (for client-side tracking)
CREATE POLICY "Users can insert own activity"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE public.user_activity_logs IS 'Tracks user actions in the system for admin monitoring';