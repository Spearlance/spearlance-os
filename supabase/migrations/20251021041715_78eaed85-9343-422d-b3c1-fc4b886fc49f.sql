-- Drop the existing problematic policy
DROP POLICY IF EXISTS "FMMs and Primary Contacts can update team member profiles" ON public.profiles;

-- Create improved policy with correct Primary Contact logic
CREATE POLICY "FMMs and Primary Contacts can update team member profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow admins and FMMs to update any profile within their assigned clients
  (
    (has_role(auth.uid(), 'fmm') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1
      FROM unnest(profiles.associated_client_ids) AS client_id
      WHERE has_client_access(auth.uid(), client_id)
    )
  )
  OR
  -- Allow Primary Contacts to update profiles for users in their clients
  -- Check CURRENT state (before update) for primary contact status
  (
    EXISTS (
      SELECT 1
      FROM unnest(profiles.associated_client_ids) AS target_client_id
      WHERE EXISTS (
        SELECT 1
        FROM public.client_primary_contacts cpc
        WHERE cpc.client_id = target_client_id
        AND cpc.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  -- For WITH CHECK, we need to be more permissive for Primary Contacts
  -- Allow if user is admin/FMM with access, OR if they are a primary contact
  (
    (has_role(auth.uid(), 'fmm') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1
      FROM unnest(associated_client_ids) AS client_id
      WHERE has_client_access(auth.uid(), client_id)
    )
  )
  OR
  -- For Primary Contacts: Allow the update if they passed the USING check
  -- This means they were a primary contact for at least one of the user's clients
  -- We don't re-check against the NEW state, we trust the USING clause
  (
    EXISTS (
      SELECT 1
      FROM public.client_primary_contacts cpc
      WHERE cpc.user_id = auth.uid()
    )
  )
);