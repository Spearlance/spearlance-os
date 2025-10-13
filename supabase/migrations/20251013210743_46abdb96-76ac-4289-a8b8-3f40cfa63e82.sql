-- Create reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  oviond_url text NOT NULL,
  date_range_start date,
  date_range_end date,
  tags text[] DEFAULT ARRAY[]::text[],
  summary text,
  owner_user_id uuid REFERENCES profiles(id),
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Admins and FMMs can insert reports
CREATE POLICY "Admins and FMMs can insert reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
  has_client_access(auth.uid(), client_id) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm'))
);

-- Admins and FMMs can update reports
CREATE POLICY "Admins and FMMs can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (
  has_client_access(auth.uid(), client_id) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm'))
);

-- Admins and FMMs can delete reports
CREATE POLICY "Admins and FMMs can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (
  has_client_access(auth.uid(), client_id) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm'))
);

-- All users can view reports for accessible clients
CREATE POLICY "Users can view reports for accessible clients"
ON public.reports FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));