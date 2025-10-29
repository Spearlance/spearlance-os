-- Create table for custom task columns (statuses) per client
CREATE TABLE task_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL, -- internal key like "to_do", "in_progress", etc.
  color varchar(7) DEFAULT '#6B7280',
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false, -- can't be deleted if true
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, key),
  UNIQUE(client_id, display_order)
);

-- Create index for faster queries
CREATE INDEX idx_task_columns_client_id ON task_columns(client_id);
CREATE INDEX idx_task_columns_display_order ON task_columns(client_id, display_order);

-- Enable RLS
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view task columns for accessible clients"
  ON task_columns FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage task columns for accessible clients"
  ON task_columns FOR ALL
  USING (has_client_access(auth.uid(), client_id))
  WITH CHECK (has_client_access(auth.uid(), client_id));

-- Function to initialize default columns for a client
CREATE OR REPLACE FUNCTION initialize_default_task_columns(p_client_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO task_columns (client_id, name, key, color, display_order, is_default)
  VALUES 
    (p_client_id, 'To Do', 'to_do', '#3B82F6', 0, true),
    (p_client_id, 'In Progress', 'in_progress', '#8B5CF6', 1, true),
    (p_client_id, 'Done', 'done', '#10B981', 2, true)
  ON CONFLICT (client_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize columns for all existing clients
DO $$
DECLARE
  client_record RECORD;
BEGIN
  FOR client_record IN SELECT id FROM clients LOOP
    PERFORM initialize_default_task_columns(client_record.id);
  END LOOP;
END $$;

-- Trigger to auto-initialize columns for new clients
CREATE OR REPLACE FUNCTION auto_initialize_task_columns()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_default_task_columns(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_initialize_task_columns
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_task_columns();