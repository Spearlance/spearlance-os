-- Make 'cancelled' reachable from the UI and keep channel progress honest.
-- Must run in a transaction AFTER 20260902120000 committed (new enum values
-- cannot be used in the transaction that added them).
--
-- 1) Every client gets a "Cancelled" column mapped to status 'cancelled'.
--    The board treats the column as the source of truth, so dragging a dead
--    task into it is what sets status = 'cancelled'. No "Blocked" column is
--    seeded: blocked stays an optional column a client can add themselves.

CREATE OR REPLACE FUNCTION initialize_default_task_columns(p_client_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO task_columns (client_id, name, key, color, display_order, is_default, mapped_status)
  VALUES
    (p_client_id, 'To Do', 'to_do', '#3B82F6', 0, true, 'to_do'),
    (p_client_id, 'In Progress', 'in_progress', '#8B5CF6', 1, true, 'in_progress'),
    (p_client_id, 'Done', 'done', '#10B981', 2, true, 'done'),
    (p_client_id, 'Cancelled', 'cancelled', '#9CA3AF', 3, true, 'cancelled')
  ON CONFLICT (client_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing clients: append after their highest display_order so the
-- UNIQUE(client_id, display_order) constraint is never violated.
INSERT INTO task_columns (client_id, name, key, color, display_order, is_default, mapped_status)
SELECT c.id,
       'Cancelled',
       'cancelled',
       '#9CA3AF',
       COALESCE((SELECT max(display_order) FROM task_columns tc WHERE tc.client_id = c.id), -1) + 1,
       true,
       'cancelled'
FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM task_columns tc WHERE tc.client_id = c.id AND tc.key = 'cancelled'
);

-- 2) Channel progress = done / (all linked tasks that were not cancelled).
--    Without this, a cancelled task keeps a channel from ever reaching 100%.
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
  FROM tasks t
  INNER JOIN marketing_flow_task_links l ON t.id = l.task_id
  WHERE l.channel_id = v_channel_id AND t.status <> 'cancelled';

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
