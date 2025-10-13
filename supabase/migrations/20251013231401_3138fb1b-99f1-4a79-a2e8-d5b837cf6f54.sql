-- Phase 1: Add front_tag to clients table
ALTER TABLE clients
ADD COLUMN front_tag TEXT;

-- Create unique index to prevent duplicate tags
CREATE UNIQUE INDEX idx_clients_front_tag ON clients(front_tag) WHERE front_tag IS NOT NULL;

-- Backfill existing clients with generated tags
UPDATE clients
SET front_tag = 'client-' || LOWER(REGEXP_REPLACE(TRIM(BOTH '-' FROM REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')), '^-+|-+$', '', 'g'));

-- Make front_tag NOT NULL after backfill
ALTER TABLE clients ALTER COLUMN front_tag SET NOT NULL;

-- Function to generate front_tag from client name
CREATE OR REPLACE FUNCTION generate_front_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := 'client-' || LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness, append counter if needed
  WHILE EXISTS (SELECT 1 FROM clients WHERE front_tag = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.front_tag := final_slug;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate front_tag before insert
CREATE TRIGGER before_insert_client_generate_front_tag
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION generate_front_tag();

-- Trigger to regenerate front_tag if name changes
CREATE TRIGGER before_update_client_regenerate_front_tag
  BEFORE UPDATE OF name ON clients
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION generate_front_tag();

-- Phase 2: Create communication_type enum and communication_logs table
CREATE TYPE communication_type AS ENUM ('email', 'text', 'call');

CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  -- Type and subject
  type communication_type NOT NULL,
  subject_line TEXT NOT NULL,
  
  -- Front-specific data (nullable for manual entries)
  front_conversation_id TEXT UNIQUE,
  front_conversation_url TEXT,
  
  -- Participants as JSONB array
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Message content as JSONB array
  message_thread JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Attachments as JSONB array
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Internal notes (editable)
  internal_notes TEXT,
  
  -- Tags for categorization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Call-specific fields (nullable)
  call_duration_minutes INTEGER,
  call_recording_url TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ,
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual',
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      subject_line || ' ' || 
      COALESCE(internal_notes, '') || ' ' ||
      COALESCE(message_thread::text, '')
    )
  ) STORED,
  
  CONSTRAINT chk_front_data CHECK (
    (source = 'front_webhook' AND front_conversation_id IS NOT NULL) OR
    (source = 'manual' AND front_conversation_id IS NULL)
  )
);

-- Indexes for communication_logs
CREATE INDEX idx_comm_logs_client ON communication_logs(client_id);
CREATE INDEX idx_comm_logs_type ON communication_logs(type);
CREATE INDEX idx_comm_logs_created ON communication_logs(created_at DESC);
CREATE INDEX idx_comm_logs_front_id ON communication_logs(front_conversation_id) WHERE front_conversation_id IS NOT NULL;
CREATE INDEX idx_comm_logs_search ON communication_logs USING GIN(search_vector);
CREATE INDEX idx_comm_logs_tags ON communication_logs USING GIN(tags);

-- RLS Policies for communication_logs (FMM and Admin only)
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FMMs and Admins can view logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
    AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "FMMs and Admins can insert logs"
  ON communication_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
    AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "FMMs and Admins can update logs"
  ON communication_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
    AND has_client_access(auth.uid(), client_id)
  );

CREATE POLICY "FMMs and Admins can delete logs"
  ON communication_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
    AND has_client_access(auth.uid(), client_id)
  );

-- Phase 3: Create front_webhook_logs table for debugging
CREATE TABLE front_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  client_id UUID REFERENCES clients(id),
  communication_log_id UUID REFERENCES communication_logs(id)
);

CREATE INDEX idx_front_webhook_logs_created ON front_webhook_logs(created_at DESC);
CREATE INDEX idx_front_webhook_logs_processed ON front_webhook_logs(processed);

-- RLS for front_webhook_logs (Admin only)
ALTER TABLE front_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
  ON front_webhook_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Phase 4: Create storage bucket for communication attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('communication-attachments', 'communication-attachments', false, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "FMMs and Admins can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'communication-attachments' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "FMMs and Admins can read attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'communication-attachments' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "FMMs and Admins can delete attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'communication-attachments' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
  );