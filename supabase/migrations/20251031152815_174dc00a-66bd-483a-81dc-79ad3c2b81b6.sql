-- Phase 1: Add recurring task columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern jsonb,
ADD COLUMN IF NOT EXISTS parent_recurring_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS next_occurrence_date date,
ADD COLUMN IF NOT EXISTS is_recurring_instance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_due_date date;

-- Create task_recurrence_history table
CREATE TABLE IF NOT EXISTS task_recurrence_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  generated_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  scheduled_for date NOT NULL,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on task_recurrence_history
ALTER TABLE task_recurrence_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_recurrence_history
CREATE POLICY "Users can view recurrence history for accessible tasks"
ON task_recurrence_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_recurrence_history.recurring_task_id
    AND has_client_access(auth.uid(), t.client_id)
  )
);

CREATE POLICY "System can insert recurrence history"
ON task_recurrence_history FOR INSERT
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks(next_occurrence_date) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_recurring ON tasks(parent_recurring_task_id) WHERE parent_recurring_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurrence_history_recurring_task ON task_recurrence_history(recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_history_scheduled ON task_recurrence_history(scheduled_for);

-- Add constraint to prevent circular references
ALTER TABLE tasks
ADD CONSTRAINT check_no_recurring_instance_template 
CHECK (NOT (is_recurring = true AND parent_recurring_task_id IS NOT NULL));

COMMENT ON COLUMN tasks.is_recurring IS 'Marks if this task is a recurring template';
COMMENT ON COLUMN tasks.recurrence_pattern IS 'JSON pattern for recurrence: {frequency, interval, days_of_week, day_of_month, end_date, max_occurrences}';
COMMENT ON COLUMN tasks.parent_recurring_task_id IS 'Links generated instances back to the recurring template';
COMMENT ON COLUMN tasks.next_occurrence_date IS 'When to generate the next instance (for templates only)';
COMMENT ON COLUMN tasks.is_recurring_instance IS 'Marks tasks that were auto-generated from a recurring template';
COMMENT ON COLUMN tasks.original_due_date IS 'Preserves the originally scheduled date for instances';