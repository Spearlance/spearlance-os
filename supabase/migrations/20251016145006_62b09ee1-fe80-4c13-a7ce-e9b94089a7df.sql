-- Add foreign keys to link marketing ideas to their execution context
ALTER TABLE marketing_ideas 
ADD COLUMN marketing_stage_id UUID REFERENCES marketing_flow_stages(id) ON DELETE SET NULL,
ADD COLUMN marketing_channel_id UUID REFERENCES marketing_flow_channels(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_marketing_ideas_stage ON marketing_ideas(marketing_stage_id);
CREATE INDEX idx_marketing_ideas_channel ON marketing_ideas(marketing_channel_id);

-- Add helpful comments
COMMENT ON COLUMN marketing_ideas.marketing_stage_id IS 'Links this idea to a specific stage in the client marketing flowchart';
COMMENT ON COLUMN marketing_ideas.marketing_channel_id IS 'Links this idea to a specific channel within a stage';