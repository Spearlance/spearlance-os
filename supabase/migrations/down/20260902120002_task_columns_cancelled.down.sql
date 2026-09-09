-- DOWN for 20260902120002_task_columns_cancelled.sql.
-- Tasks sitting in a Cancelled column keep status 'cancelled' (the enum value
-- cannot be removed); their column_id becomes NULL via ON DELETE SET NULL.
DELETE FROM task_columns WHERE key = 'cancelled' AND is_default = true;

-- Restore the 3-column seed (body from 20260729000000).
CREATE OR REPLACE FUNCTION initialize_default_task_columns(p_client_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO task_columns (client_id, name, key, color, display_order, is_default, mapped_status)
  VALUES
    (p_client_id, 'To Do', 'to_do', '#3B82F6', 0, true, 'to_do'),
    (p_client_id, 'In Progress', 'in_progress', '#8B5CF6', 1, true, 'in_progress'),
    (p_client_id, 'Done', 'done', '#10B981', 2, true, 'done')
  ON CONFLICT (client_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore channel progress denominator (body from 20251015183528).
CREATE OR REPLACE FUNCTION public.update_channel_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_channel_id UUID;
  v_total_tasks INTEGER;
  v_done_tasks INTEGER;
  v_progress NUMERIC;
BEGIN
  v_channel_id := NEW.linked_channel_id;
  IF v_channel_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO v_total_tasks
  FROM marketing_flow_task_links
  WHERE channel_id = v_channel_id;
  SELECT COUNT(*) INTO v_done_tasks
  FROM tasks t
  INNER JOIN marketing_flow_task_links l ON t.id = l.task_id
  WHERE l.channel_id = v_channel_id AND t.status = 'done';
  IF v_total_tasks = 0 THEN
    v_progress := 0;
  ELSE
    v_progress := ROUND((100.0 * v_done_tasks / v_total_tasks)::NUMERIC, 0);
  END IF;
  UPDATE marketing_flow_channels
  SET progress = v_progress, updated_at = now()
  WHERE id = v_channel_id;
  RETURN NEW;
END;
$function$;
