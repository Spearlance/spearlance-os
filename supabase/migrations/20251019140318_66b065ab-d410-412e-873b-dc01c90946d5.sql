-- Add assigned_to column to marketing_flow_channels table
ALTER TABLE marketing_flow_channels 
ADD COLUMN assigned_to uuid REFERENCES profiles(id);

-- Add index for better query performance
CREATE INDEX idx_marketing_flow_channels_assigned_to ON marketing_flow_channels(assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN marketing_flow_channels.assigned_to IS 'The team member assigned to this marketing channel';