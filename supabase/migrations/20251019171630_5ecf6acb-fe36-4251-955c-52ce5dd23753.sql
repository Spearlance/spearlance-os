-- Create table for social post comments
CREATE TABLE social_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_media_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE social_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comments for accessible posts"
  ON social_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM social_media_posts p
      WHERE p.id = post_id AND has_client_access(auth.uid(), p.client_id)
    )
  );

CREATE POLICY "Users can insert comments for accessible posts"
  ON social_post_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_media_posts p
      WHERE p.id = post_id AND has_client_access(auth.uid(), p.client_id)
    )
  );

CREATE POLICY "Users can update own comments"
  ON social_post_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON social_post_comments FOR DELETE
  USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_social_post_comments_post_id ON social_post_comments(post_id);

-- Trigger for updated_at
CREATE TRIGGER update_social_post_comments_updated_at
  BEFORE UPDATE ON social_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();