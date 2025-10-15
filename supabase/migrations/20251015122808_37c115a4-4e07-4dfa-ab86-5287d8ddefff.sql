-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins and FMMs can insert channels" ON marketing_flow_channels;

-- Create new policy allowing all users with client access
CREATE POLICY "Users can insert channels for accessible flows"
ON marketing_flow_channels
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM marketing_flow_stages
    JOIN marketing_flows ON marketing_flows.id = marketing_flow_stages.flow_id
    WHERE marketing_flow_stages.id = stage_id
    AND has_client_access(auth.uid(), marketing_flows.client_id)
  )
);