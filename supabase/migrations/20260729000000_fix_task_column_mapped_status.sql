-- Fix systemic mapped_status misconfiguration on task_columns.
--
-- Root cause: mapped_status was added (2025-11-20) with DEFAULT 'in_progress',
-- but initialize_default_task_columns() and the TaskColumnManager insert never
-- set it explicitly — so every client onboarded since then got Done/To Do
-- columns mapped to 'in_progress'. Consequences:
--   * Tasks completed by drag into "Done" kept status 'in_progress'
--     (still counted as open in My Tasks and reports).
--   * Checkbox completion (markTaskComplete) found no done-mapped column, so
--     it set status='done' but left the task stranded in its old column
--     (shown as open on the client board).

-- 1) Seed default columns with explicit mapped_status from now on
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

-- 2) Repair mis-mapped default columns
UPDATE task_columns SET mapped_status = 'done' WHERE key = 'done' AND mapped_status <> 'done';
UPDATE task_columns SET mapped_status = 'to_do' WHERE key = 'to_do' AND mapped_status <> 'to_do';

-- 3) Move checkbox-completed tasks stranded outside a Done column into the
--    client's Done column (they were completed while no done-mapped column
--    existed, so column_id was never updated)
UPDATE tasks t
SET column_id = dc.id
FROM task_columns cur,
     (SELECT DISTINCT ON (client_id) client_id, id
        FROM task_columns
       WHERE mapped_status = 'done'
       ORDER BY client_id, display_order) dc
WHERE cur.id = t.column_id
  AND cur.mapped_status <> 'done'
  AND dc.client_id = t.client_id
  AND t.status = 'done';

-- 4) Align task status with the column each task sits in (the board treats the
--    column as source of truth). Completion-notification trigger is disabled
--    so this backfill doesn't fire a burst of stale "task completed" pings.
--    Guard: never flip an already-done task back to open.
ALTER TABLE tasks DISABLE TRIGGER task_completion_notification;

UPDATE tasks t
SET status = tc.mapped_status
FROM task_columns tc
WHERE tc.id = t.column_id
  AND t.status <> tc.mapped_status
  AND NOT (t.status = 'done' AND tc.mapped_status <> 'done');

ALTER TABLE tasks ENABLE TRIGGER task_completion_notification;
