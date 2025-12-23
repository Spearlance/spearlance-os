-- Create clarity_configs table for per-client Clarity configuration
CREATE TABLE public.clarity_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  api_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);

-- Create clarity_daily_metrics table for raw daily data
CREATE TABLE public.clarity_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  distinct_users INTEGER DEFAULT 0,
  pages_per_session NUMERIC(5,2) DEFAULT 0,
  scroll_depth NUMERIC(5,2) DEFAULT 0,
  engagement_time_seconds INTEGER DEFAULT 0,
  rage_click_count INTEGER DEFAULT 0,
  dead_click_count INTEGER DEFAULT 0,
  quick_back_count INTEGER DEFAULT 0,
  javascript_error_count INTEGER DEFAULT 0,
  raw_response JSONB,
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, metric_date)
);

-- Create clarity_weekly_reports table for aggregated weekly summaries
CREATE TABLE public.clarity_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_distinct_users INTEGER DEFAULT 0,
  avg_pages_per_session NUMERIC(5,2) DEFAULT 0,
  avg_scroll_depth NUMERIC(5,2) DEFAULT 0,
  avg_engagement_time_seconds INTEGER DEFAULT 0,
  total_rage_clicks INTEGER DEFAULT 0,
  total_dead_clicks INTEGER DEFAULT 0,
  total_quick_backs INTEGER DEFAULT 0,
  total_js_errors INTEGER DEFAULT 0,
  sessions_change_percent NUMERIC(6,2),
  users_change_percent NUMERIC(6,2),
  engagement_change_percent NUMERIC(6,2),
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, week_start_date)
);

-- Enable RLS on all tables
ALTER TABLE public.clarity_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarity_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarity_weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for clarity_configs (admin/FMM only for write, read for client access)
CREATE POLICY "Users with client access can view clarity configs"
ON public.clarity_configs
FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins and FMMs can insert clarity configs"
ON public.clarity_configs
FOR INSERT
TO authenticated
WITH CHECK (
  has_client_access(auth.uid(), client_id) 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'fmm')
  )
);

CREATE POLICY "Admins and FMMs can update clarity configs"
ON public.clarity_configs
FOR UPDATE
TO authenticated
USING (
  has_client_access(auth.uid(), client_id) 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'fmm')
  )
);

CREATE POLICY "Admins and FMMs can delete clarity configs"
ON public.clarity_configs
FOR DELETE
TO authenticated
USING (
  has_client_access(auth.uid(), client_id) 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'fmm')
  )
);

-- RLS policies for clarity_daily_metrics
CREATE POLICY "Users with client access can view clarity daily metrics"
ON public.clarity_daily_metrics
FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can insert clarity daily metrics"
ON public.clarity_daily_metrics
FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can update clarity daily metrics"
ON public.clarity_daily_metrics
FOR UPDATE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- RLS policies for clarity_weekly_reports
CREATE POLICY "Users with client access can view clarity weekly reports"
ON public.clarity_weekly_reports
FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can insert clarity weekly reports"
ON public.clarity_weekly_reports
FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can update clarity weekly reports"
ON public.clarity_weekly_reports
FOR UPDATE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- Create indexes for performance
CREATE INDEX idx_clarity_configs_client_id ON public.clarity_configs(client_id);
CREATE INDEX idx_clarity_configs_is_active ON public.clarity_configs(is_active) WHERE is_active = true;
CREATE INDEX idx_clarity_daily_metrics_client_date ON public.clarity_daily_metrics(client_id, metric_date);
CREATE INDEX idx_clarity_weekly_reports_client_week ON public.clarity_weekly_reports(client_id, week_start_date);

-- Add trigger for updated_at on clarity_configs
CREATE TRIGGER update_clarity_configs_updated_at
BEFORE UPDATE ON public.clarity_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();