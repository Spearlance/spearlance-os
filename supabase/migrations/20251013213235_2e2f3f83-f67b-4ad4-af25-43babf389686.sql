-- Create chat audit logs table
CREATE TABLE public.chat_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  parameters JSONB,
  result_count INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on chat_audit_logs
ALTER TABLE public.chat_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.chat_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create chat rate limits table
CREATE TABLE public.chat_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, window_start)
);

-- Enable RLS on chat_rate_limits
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limits
CREATE POLICY "Users can view own rate limits"
ON public.chat_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own rate limits
CREATE POLICY "Users can insert own rate limits"
ON public.chat_rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own rate limits
CREATE POLICY "Users can update own rate limits"
ON public.chat_rate_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster rate limit lookups
CREATE INDEX idx_chat_rate_limits_user_window ON public.chat_rate_limits(user_id, window_start);

-- Create index for audit log queries
CREATE INDEX idx_chat_audit_logs_user ON public.chat_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_chat_audit_logs_client ON public.chat_audit_logs(client_id, created_at DESC);

-- Trigger for updated_at on chat_rate_limits
CREATE TRIGGER update_chat_rate_limits_updated_at
BEFORE UPDATE ON public.chat_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();