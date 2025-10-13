-- Update RLS policies to allow FMMs to manage templates

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can insert templates" ON marketing_flow_task_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON marketing_flow_task_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON marketing_flow_task_templates;

-- Create new policies allowing both Admin and FMM
CREATE POLICY "Admins and FMMs can insert templates"
ON marketing_flow_task_templates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'fmm')
  )
);

CREATE POLICY "Admins and FMMs can update templates"
ON marketing_flow_task_templates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'fmm')
  )
);

CREATE POLICY "Admins and FMMs can delete templates"
ON marketing_flow_task_templates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'fmm')
  )
);