-- Drop trigger first, then functions, then recreate with proper search_path
DROP TRIGGER IF EXISTS trigger_auto_initialize_task_columns ON clients;
DROP FUNCTION IF EXISTS auto_initialize_task_columns();
DROP FUNCTION IF EXISTS initialize_default_task_columns(uuid);

-- Recreate functions with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION auto_initialize_task_columns()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_default_task_columns(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER trigger_auto_initialize_task_columns
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_task_columns();