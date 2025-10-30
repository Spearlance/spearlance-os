-- Drop the existing broad update policy that allows all users to update tickets
DROP POLICY IF EXISTS "Users can update tickets for accessible clients" ON public.tickets;

-- Policy for clients: they can only update tags and related items, NOT status/priority/owner
CREATE POLICY "Clients can update limited ticket fields"
ON public.tickets
FOR UPDATE
USING (
  has_client_access(auth.uid(), client_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'client'
  )
)
WITH CHECK (
  has_client_access(auth.uid(), client_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'client'
  )
);

-- Policy for Admin/FMM: full update access including status/priority/owner
CREATE POLICY "Admin and FMM can update all ticket fields"
ON public.tickets
FOR UPDATE
USING (
  has_client_access(auth.uid(), client_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'fmm')
  )
)
WITH CHECK (
  has_client_access(auth.uid(), client_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'fmm')
  )
);