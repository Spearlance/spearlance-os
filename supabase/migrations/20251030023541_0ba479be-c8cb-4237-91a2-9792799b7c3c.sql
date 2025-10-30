-- Create bug_report_status enum
CREATE TYPE bug_report_status AS ENUM (
  'submitted',
  'triaged',
  'in_progress',
  'fixed',
  'wont_fix',
  'duplicate'
);

-- Create bug_report_severity enum
CREATE TYPE bug_report_severity AS ENUM (
  'critical',
  'high',
  'medium',
  'low',
  'cosmetic'
);

-- Create bug_reports table
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  screenshot_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  browser_info JSONB,
  device_info JSONB,
  page_url TEXT,
  severity bug_report_severity DEFAULT 'medium',
  status bug_report_status DEFAULT 'submitted',
  assigned_to UUID,
  reward_points INTEGER DEFAULT 0,
  reward_awarded BOOLEAN DEFAULT false,
  related_ticket_id UUID REFERENCES tickets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- Create indexes
CREATE INDEX idx_bug_reports_client_id ON bug_reports(client_id);
CREATE INDEX idx_bug_reports_reporter ON bug_reports(reporter_user_id);
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_severity ON bug_reports(severity);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view bug reports for accessible clients"
  ON bug_reports FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create bug reports for accessible clients"
  ON bug_reports FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id) AND reporter_user_id = auth.uid());

CREATE POLICY "Admins can update bug reports"
  ON bug_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for bug screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bug screenshots
CREATE POLICY "Users can upload bug screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Bug screenshots are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bug-screenshots');

CREATE POLICY "Users can update their own bug screenshots"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);