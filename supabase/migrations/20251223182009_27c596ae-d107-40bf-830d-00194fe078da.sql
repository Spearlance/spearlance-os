-- Create marketing_flow_campaigns table
CREATE TABLE public.marketing_flow_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES marketing_flow_channels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add campaign_id to channel_weekly_kpis for campaign-level KPI tracking
ALTER TABLE public.channel_weekly_kpis 
ADD COLUMN campaign_id uuid REFERENCES marketing_flow_campaigns(id) ON DELETE CASCADE;

-- Drop and recreate the unique constraint to include campaign_id
ALTER TABLE public.channel_weekly_kpis 
DROP CONSTRAINT IF EXISTS channel_weekly_kpis_channel_id_week_start_date_key;

ALTER TABLE public.channel_weekly_kpis
ADD CONSTRAINT channel_weekly_kpis_channel_campaign_week_unique 
UNIQUE (channel_id, campaign_id, week_start_date);

-- Create index for efficient queries
CREATE INDEX idx_campaigns_channel_id ON marketing_flow_campaigns(channel_id);
CREATE INDEX idx_channel_weekly_kpis_campaign_id ON channel_weekly_kpis(campaign_id);

-- Enable RLS on campaigns table
ALTER TABLE public.marketing_flow_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
-- Users can view campaigns for channels they have access to
CREATE POLICY "Users can view campaigns for accessible channels"
ON public.marketing_flow_campaigns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels mfc
    JOIN marketing_flow_stages mfs ON mfc.stage_id = mfs.id
    JOIN marketing_flows mf ON mfs.flow_id = mf.id
    WHERE mfc.id = marketing_flow_campaigns.channel_id
    AND has_client_access(auth.uid(), mf.client_id)
  )
);

-- Admins and FMMs can manage campaigns
CREATE POLICY "Admins and FMMs can insert campaigns"
ON public.marketing_flow_campaigns
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'fmm'::app_role)
);

CREATE POLICY "Admins and FMMs can update campaigns"
ON public.marketing_flow_campaigns
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'fmm'::app_role)
);

CREATE POLICY "Admins and FMMs can delete campaigns"
ON public.marketing_flow_campaigns
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'fmm'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_marketing_flow_campaigns_updated_at
BEFORE UPDATE ON public.marketing_flow_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();