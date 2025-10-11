-- Create asset folders table
CREATE TABLE asset_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  parent_folder_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add folder_id to assets table
ALTER TABLE assets ADD COLUMN folder_id UUID REFERENCES asset_folders(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_asset_folders_client ON asset_folders(client_id);
CREATE INDEX idx_asset_folders_parent ON asset_folders(parent_folder_id);
CREATE INDEX idx_assets_folder ON assets(folder_id);

-- RLS Policies
ALTER TABLE asset_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders for accessible clients"
ON asset_folders FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create folders for accessible clients"
ON asset_folders FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update folders for accessible clients"
ON asset_folders FOR UPDATE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete folders for accessible clients"
ON asset_folders FOR DELETE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER update_asset_folders_updated_at
  BEFORE UPDATE ON asset_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();