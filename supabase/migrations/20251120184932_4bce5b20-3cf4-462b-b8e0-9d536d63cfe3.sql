-- Add mapped_status column to task_columns to map custom columns to valid enum values
ALTER TABLE task_columns 
ADD COLUMN mapped_status task_status DEFAULT 'in_progress';

-- Set sensible defaults for existing columns based on their names
UPDATE task_columns 
SET mapped_status = (CASE
  WHEN key = 'done' OR LOWER(name) LIKE '%done%' OR LOWER(name) LIKE '%complete%' THEN 'done'
  WHEN key = 'to_do' OR LOWER(name) LIKE '%todo%' OR LOWER(name) LIKE '%backlog%' THEN 'to_do'
  ELSE 'in_progress'
END)::task_status
WHERE mapped_status = 'in_progress';

COMMENT ON COLUMN task_columns.mapped_status IS 'Maps custom column names to valid task_status enum values for database storage';