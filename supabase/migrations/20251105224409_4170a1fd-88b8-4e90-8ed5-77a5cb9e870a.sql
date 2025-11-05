-- Create feature_flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add some initial feature flags
INSERT INTO feature_flags (key, name, description, enabled, category) VALUES
  ('blog_writer', 'Blog Writer', 'AI-powered blog article generation and management', false, 'website'),
  ('social_media', 'Social Media', 'Social media post scheduling and management', true, 'brand'),
  ('analytics', 'Analytics', 'Website analytics and tracking', true, 'website'),
  ('meetings', 'Meetings', 'Calendar integration and meeting booking', true, 'communication'),
  ('marketing_flow', 'Marketing Flow', 'Marketing workflow and channel management', true, 'marketing'),
  ('brand_guide', 'Brand Guide', 'Brand identity and style guide builder', true, 'brand'),
  ('mood_board', 'Mood Board', 'AI-generated mood boards and brand inspiration', true, 'brand'),
  ('seo', 'SEO', 'SEO analysis and optimization tools', true, 'website'),
  ('launchpad', 'Launchpad', 'Onboarding wizard and setup assistant', true, 'onboarding'),
  ('support_tickets', 'Support Tickets', 'Internal support ticket system', true, 'support');

-- Add update trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for faster lookups
CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to feature flags"
  ON feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- All authenticated users can read feature flags
CREATE POLICY "Authenticated users can read feature flags"
  ON feature_flags
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags;