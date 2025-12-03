-- Add new columns to clients table for Success Hub
ALTER TABLE clients ADD COLUMN IF NOT EXISTS segment text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meeting_cadence text DEFAULT 'weekly';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS csm_owner_id uuid REFERENCES profiles(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_owner_ids uuid[];

-- Create client_success_logs table for weekly hub data
CREATE TABLE public.client_success_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  health_status text DEFAULT 'green' CHECK (health_status IN ('green', 'yellow', 'red')),
  business_outcomes jsonb DEFAULT '[]'::jsonb,
  kpis jsonb DEFAULT '[]'::jsonb,
  manual_wins jsonb DEFAULT '[]'::jsonb,
  risks_blockers jsonb DEFAULT '[]'::jsonb,
  needs_from_client jsonb DEFAULT '[]'::jsonb,
  open_threads jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.client_success_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin and FMM only
CREATE POLICY "Admins can manage all success logs"
ON public.client_success_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "FMMs can manage success logs for their clients"
ON public.client_success_logs
FOR ALL
USING (
  has_role(auth.uid(), 'fmm'::app_role) 
  AND has_client_access(auth.uid(), client_id)
);

-- Create trigger for updated_at
CREATE TRIGGER update_client_success_logs_updated_at
BEFORE UPDATE ON public.client_success_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_client_success_logs_client_week ON public.client_success_logs(client_id, week_start_date DESC);