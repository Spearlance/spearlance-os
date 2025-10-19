-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins and FMMs can delete task links" ON marketing_flow_task_links;

-- Create a new policy that allows users to delete links for accessible channels
CREATE POLICY "Users can delete task links for accessible channels"
ON marketing_flow_task_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM tasks
    JOIN marketing_flow_channels ON marketing_flow_channels.id = marketing_flow_task_links.channel_id
    JOIN marketing_flow_stages ON marketing_flow_stages.id = marketing_flow_channels.stage_id
    JOIN marketing_flows ON marketing_flows.id = marketing_flow_stages.flow_id
    WHERE tasks.id = marketing_flow_task_links.task_id
    AND has_client_access(auth.uid(), marketing_flows.client_id)
  )
);