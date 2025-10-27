-- Create website_form_submissions table
CREATE TABLE website_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Form submission data
  form_name text,
  submitted_at timestamp with time zone NOT NULL,
  form_data jsonb NOT NULL,
  
  -- Optional metadata
  submission_source text DEFAULT 'duda',
  ip_address text,
  user_agent text,
  page_url text,
  
  -- Status tracking
  status text DEFAULT 'unread',
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_form_submissions_site_id ON website_form_submissions(site_id);
CREATE INDEX idx_form_submissions_client_id ON website_form_submissions(client_id);
CREATE INDEX idx_form_submissions_status ON website_form_submissions(status);

-- Enable RLS
ALTER TABLE website_form_submissions ENABLE ROW LEVEL SECURITY;

-- Admins and FMMs can view all submissions
CREATE POLICY "Admins and FMMs can view all form submissions"
  ON website_form_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
  );

-- Clients can only view submissions for their site_id
CREATE POLICY "Clients can view own form submissions"
  ON website_form_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.site_id = website_form_submissions.site_id
      AND has_client_access(auth.uid(), clients.id)
    )
  );

-- Admins and FMMs can manage all submissions
CREATE POLICY "Admins and FMMs can manage form submissions"
  ON website_form_submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
  );

-- Update trigger
CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON website_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();