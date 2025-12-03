-- Add persistent Outcomes & KPIs columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_outcomes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kpis jsonb DEFAULT '[]'::jsonb;

-- Create Quick Links table
CREATE TABLE IF NOT EXISTS client_quick_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  icon text,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_quick_links ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and FMMs can manage quick links
CREATE POLICY "Admins and FMMs can manage quick links" ON client_quick_links
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'fmm'::app_role)
  );

-- RLS: Users can view quick links for accessible clients
CREATE POLICY "Users can view quick links for accessible clients" ON client_quick_links
  FOR SELECT USING (has_client_access(auth.uid(), client_id));