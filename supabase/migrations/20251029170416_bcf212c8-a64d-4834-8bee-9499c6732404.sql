-- Add subtasks support
ALTER TABLE tasks ADD COLUMN parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN subtask_order integer DEFAULT 0;
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add color field for visual organization
ALTER TABLE tasks ADD COLUMN color varchar(7) DEFAULT '#6B7280';

-- Create junction table for many-to-many relationship (multiple assignees)
CREATE TABLE task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);

-- Enable RLS for task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task assignees for accessible clients"
  ON task_assignees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND has_client_access(auth.uid(), t.client_id)
    )
  );

CREATE POLICY "Users can manage task assignees for accessible clients"
  ON task_assignees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND has_client_access(auth.uid(), t.client_id)
    )
  );

-- Add category/tag support
CREATE TABLE task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color varchar(7) DEFAULT '#6B7280',
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, client_id)
);

CREATE TABLE task_tag_links (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Enable RLS for task_tags
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for accessible clients"
  ON task_tags FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can manage tags for accessible clients"
  ON task_tags FOR ALL
  USING (has_client_access(auth.uid(), client_id));

-- Enable RLS for task_tag_links
ALTER TABLE task_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tag links for accessible tasks"
  ON task_tag_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tag_links.task_id
      AND has_client_access(auth.uid(), t.client_id)
    )
  );

CREATE POLICY "Users can manage tag links for accessible tasks"
  ON task_tag_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tag_links.task_id
      AND has_client_access(auth.uid(), t.client_id)
    )
  );