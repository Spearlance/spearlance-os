-- Allow clients to update their own logo_url
CREATE POLICY "Clients can update own logo"
ON clients
FOR UPDATE
USING (has_client_access(auth.uid(), id))
WITH CHECK (has_client_access(auth.uid(), id));