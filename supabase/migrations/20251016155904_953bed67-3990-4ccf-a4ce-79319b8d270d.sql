-- Add idea_type and target_avatar_id columns to marketing_ideas table
ALTER TABLE marketing_ideas 
ADD COLUMN idea_type TEXT NOT NULL DEFAULT 'offer',
ADD COLUMN target_avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL;

-- Add check constraint for idea_type
ALTER TABLE marketing_ideas 
ADD CONSTRAINT marketing_ideas_idea_type_check 
CHECK (idea_type IN ('offer', 'note'));

-- Create index for performance
CREATE INDEX idx_marketing_ideas_idea_type ON marketing_ideas(idea_type);
CREATE INDEX idx_marketing_ideas_target_avatar_id ON marketing_ideas(target_avatar_id);