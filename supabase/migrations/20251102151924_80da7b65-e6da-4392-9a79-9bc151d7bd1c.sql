-- Create table to track materialized view refresh timestamps
CREATE TABLE IF NOT EXISTS public.materialized_view_refreshes (
  view_name TEXT PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.materialized_view_refreshes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view refresh times for their clients
CREATE POLICY "Users can view refresh times for their clients"
ON public.materialized_view_refreshes
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
  OR
  client_id IN (
    SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Only admins and FMMs can insert/update refresh times
CREATE POLICY "Admins and FMMs can manage refresh times"
ON public.materialized_view_refreshes
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'fmm')
  )
);