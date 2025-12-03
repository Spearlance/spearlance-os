-- Drop table if it was partially created
DROP TABLE IF EXISTS public.channel_weekly_kpis;

-- Create channel_weekly_kpis table for tracking weekly KPIs per channel
CREATE TABLE public.channel_weekly_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES marketing_flow_channels(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  kpi_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.channel_weekly_kpis ENABLE ROW LEVEL SECURITY;

-- Users can view KPIs for channels they have access to (channel -> stage -> flow -> client)
CREATE POLICY "Users can view channel KPIs for accessible clients"
ON public.channel_weekly_kpis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels mfc
    JOIN marketing_flow_stages mfs ON mfc.stage_id = mfs.id
    JOIN marketing_flows mf ON mfs.flow_id = mf.id
    WHERE mfc.id = channel_weekly_kpis.channel_id
    AND has_client_access(auth.uid(), mf.client_id)
  )
);

-- Admin and FMM can insert KPIs
CREATE POLICY "Admin and FMM can insert channel KPIs"
ON public.channel_weekly_kpis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels mfc
    JOIN marketing_flow_stages mfs ON mfc.stage_id = mfs.id
    JOIN marketing_flows mf ON mfs.flow_id = mf.id
    WHERE mfc.id = channel_weekly_kpis.channel_id
    AND has_client_access(auth.uid(), mf.client_id)
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'fmm'))
);

-- Admin and FMM can update KPIs
CREATE POLICY "Admin and FMM can update channel KPIs"
ON public.channel_weekly_kpis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels mfc
    JOIN marketing_flow_stages mfs ON mfc.stage_id = mfs.id
    JOIN marketing_flows mf ON mfs.flow_id = mf.id
    WHERE mfc.id = channel_weekly_kpis.channel_id
    AND has_client_access(auth.uid(), mf.client_id)
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'fmm'))
);

-- Admin and FMM can delete KPIs
CREATE POLICY "Admin and FMM can delete channel KPIs"
ON public.channel_weekly_kpis
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels mfc
    JOIN marketing_flow_stages mfs ON mfc.stage_id = mfs.id
    JOIN marketing_flows mf ON mfs.flow_id = mf.id
    WHERE mfc.id = channel_weekly_kpis.channel_id
    AND has_client_access(auth.uid(), mf.client_id)
  )
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'fmm'))
);

-- Create trigger for updated_at
CREATE TRIGGER update_channel_weekly_kpis_updated_at
BEFORE UPDATE ON public.channel_weekly_kpis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();