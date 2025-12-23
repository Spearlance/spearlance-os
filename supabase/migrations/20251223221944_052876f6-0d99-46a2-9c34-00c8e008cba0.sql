-- Create table for AI-generated reports
CREATE TABLE public.ai_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'performance_summary', 'channel_deep_dive', 'website_analytics', 'seo_report'
  report_name TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  selected_channels UUID[] DEFAULT '{}',
  report_content TEXT NOT NULL, -- Markdown content
  executive_summary TEXT,
  data_snapshot JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster client lookups
CREATE INDEX idx_ai_generated_reports_client_id ON public.ai_generated_reports(client_id);
CREATE INDEX idx_ai_generated_reports_created_at ON public.ai_generated_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_generated_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies using the existing has_client_access function
CREATE POLICY "Users can view AI reports for accessible clients"
  ON public.ai_generated_reports
  FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create AI reports for accessible clients"
  ON public.ai_generated_reports
  FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete AI reports for accessible clients"
  ON public.ai_generated_reports
  FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));