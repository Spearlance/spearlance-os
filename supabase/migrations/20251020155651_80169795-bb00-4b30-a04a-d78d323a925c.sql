-- Create client_primary_contacts junction table
CREATE TABLE IF NOT EXISTS public.client_primary_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE public.client_primary_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_primary_contacts
CREATE POLICY "Admins can manage all primary contacts"
ON public.client_primary_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Primary contacts can view within their client"
ON public.client_primary_contacts
FOR SELECT
USING (
  has_client_access(auth.uid(), client_id)
);

CREATE POLICY "Admins and primary contacts can insert primary contacts"
ON public.client_primary_contacts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_client_access(auth.uid(), client_id) AND
    EXISTS (
      SELECT 1 FROM public.client_primary_contacts
      WHERE client_id = client_primary_contacts.client_id
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can delete primary contacts"
ON public.client_primary_contacts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing primary_contact_user_id values to the new table
INSERT INTO public.client_primary_contacts (client_id, user_id, created_by)
SELECT 
  id as client_id,
  primary_contact_user_id as user_id,
  primary_contact_user_id as created_by
FROM public.clients
WHERE primary_contact_user_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_primary_contacts_client_id ON public.client_primary_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_primary_contacts_user_id ON public.client_primary_contacts(user_id);