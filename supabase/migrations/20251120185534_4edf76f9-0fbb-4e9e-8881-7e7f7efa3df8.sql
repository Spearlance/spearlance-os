-- Add column_id to tasks table to track exact column placement
ALTER TABLE tasks 
ADD COLUMN column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL;

-- Backfill existing tasks: match status to first column with matching mapped_status
UPDATE tasks t
SET column_id = (
  SELECT tc.id
  FROM task_columns tc
  WHERE tc.client_id = t.client_id
    AND tc.mapped_status = t.status
  ORDER BY tc.display_order
  LIMIT 1
)
WHERE t.column_id IS NULL;

-- Create index for performance
CREATE INDEX idx_tasks_column_id ON tasks(column_id);