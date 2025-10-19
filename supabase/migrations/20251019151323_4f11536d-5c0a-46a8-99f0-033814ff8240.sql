-- Add fields to social_media_posts for batch tracking
ALTER TABLE social_media_posts 
ADD COLUMN IF NOT EXISTS post_idea_json JSONB,
ADD COLUMN IF NOT EXISTS generation_batch_id UUID;

-- Create table for tracking batch generations
CREATE TABLE IF NOT EXISTS social_media_generation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_posts INTEGER DEFAULT 30,
  posts_with_captions INTEGER DEFAULT 0,
  posts_with_images INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(client_id, month, year)
);

-- Enable RLS for generation_batches
ALTER TABLE social_media_generation_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batches for accessible clients"
  ON social_media_generation_batches FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create batches for accessible clients"
  ON social_media_generation_batches FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update batches for accessible clients"
  ON social_media_generation_batches FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

-- Create table for user notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '09:00:00',
  notification_method TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, client_id, notification_type)
);

-- Enable RLS for notification preferences
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON user_notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();