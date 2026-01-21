-- Create API error logs table for tracking critical API failures
CREATE TABLE public.api_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  function_name text NOT NULL,
  error_message text NOT NULL,
  error_type text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  user_id uuid,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX idx_api_errors_created ON api_error_logs(created_at DESC);
CREATE INDEX idx_api_errors_unresolved ON api_error_logs(resolved) WHERE resolved = false;

-- RLS for admin-only access
ALTER TABLE api_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all API errors" ON api_error_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update API errors" ON api_error_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can insert API errors" ON api_error_logs
  FOR INSERT WITH CHECK (true);