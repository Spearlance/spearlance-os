-- ============================================================
-- SOS Tracker v3 — Click IDs, bot flag, conversion events
-- ============================================================
-- Recovered into version control from deployed DB state (dev + prod).
-- This migration was applied directly during v3 development but its file
-- was never committed, causing `supabase db push` history drift.

-- Add click ID and bot columns to existing web_events table
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS gclid text;
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS fbclid text;
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS msclkid text;
ALTER TABLE web_events ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- Create index for bot filtering in dashboards
CREATE INDEX IF NOT EXISTS idx_web_events_is_bot ON web_events (client_id, is_bot, received_at DESC);

-- Conversion events table — form submissions, phone clicks with click IDs
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('form_submit', 'phone_click')),
  gclid text,
  fbclid text,
  msclkid text,
  li_fat_id text,
  page_url text,
  created_at timestamptz DEFAULT now(),
  form_name text,
  phone_number text,
  forwarded_to jsonb DEFAULT '{}'::jsonb,
  is_bot boolean DEFAULT false,
  engagement_score numeric
);

CREATE INDEX idx_conversion_events_client ON conversion_events (client_id, created_at DESC);
CREATE INDEX idx_conversion_events_gclid ON conversion_events (gclid) WHERE gclid IS NOT NULL;

-- RLS for conversion_events
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversion_events for their clients"
  ON conversion_events FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can insert conversion_events"
  ON conversion_events FOR INSERT
  WITH CHECK (true);
