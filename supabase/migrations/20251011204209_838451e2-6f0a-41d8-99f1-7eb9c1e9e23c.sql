-- Create the storage bucket for client assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-assets', 'client-assets', true);

-- RLS policy: Users can upload files for accessible clients
CREATE POLICY "Users can upload files for accessible clients"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE has_client_access(auth.uid(), id)
  )
);

-- RLS policy: Users can view files for accessible clients
CREATE POLICY "Users can view files for accessible clients"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE has_client_access(auth.uid(), id)
  )
);

-- RLS policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-assets' AND
  owner = auth.uid()
);