-- Allow users to view billing plans for their accessible clients
CREATE POLICY "Users can view billing plans for accessible clients"
ON billing_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM clients 
    WHERE clients.billing_plan_id = billing_plans.id 
    AND has_client_access(auth.uid(), clients.id)
  )
);