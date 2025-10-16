-- Add DELETE policy for assets table
CREATE POLICY "Users can delete assets for accessible clients"
ON assets
FOR DELETE
USING (has_client_access(auth.uid(), client_id));