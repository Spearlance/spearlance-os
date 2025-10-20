-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins and FMMs can insert notes" ON marketing_flow_channel_notes;
DROP POLICY IF EXISTS "Admins and FMMs can insert task links" ON marketing_flow_task_links;

-- Create new permissive policies based on client access
CREATE POLICY "Users with client access can insert notes"
ON marketing_flow_channel_notes
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels c
    JOIN marketing_flow_stages s ON s.id = c.stage_id
    JOIN marketing_flows f ON f.id = s.flow_id
    WHERE c.id = marketing_flow_channel_notes.channel_id
    AND has_client_access(auth.uid(), f.client_id)
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users with client access can insert task links"
ON marketing_flow_task_links
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM marketing_flow_channels c
    JOIN marketing_flow_stages s ON s.id = c.stage_id
    JOIN marketing_flows f ON f.id = s.flow_id
    WHERE c.id = marketing_flow_task_links.channel_id
    AND has_client_access(auth.uid(), f.client_id)
  )
  AND created_by = auth.uid()
);