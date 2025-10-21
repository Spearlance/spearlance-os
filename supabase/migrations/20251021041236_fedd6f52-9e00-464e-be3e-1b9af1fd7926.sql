-- Allow FMMs and Primary Contacts to update profiles within their client scope
CREATE POLICY "FMMs and Primary Contacts can update team member profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow if the updater is an FMM or Admin with access to any of the target user's clients
  (
    (has_role(auth.uid(), 'fmm') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1
      FROM unnest(associated_client_ids) AS client_id
      WHERE has_client_access(auth.uid(), client_id)
    )
  )
  OR
  -- Allow if the updater is a Primary Contact for any of the target user's clients
  (
    EXISTS (
      SELECT 1
      FROM unnest(associated_client_ids) AS target_client_id
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
  -- Same conditions for WITH CHECK
  (
    (has_role(auth.uid(), 'fmm') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1
      FROM unnest(associated_client_ids) AS client_id
      WHERE has_client_access(auth.uid(), client_id)
    )
  )
  OR
  (
    EXISTS (
      SELECT 1
      FROM unnest(associated_client_ids) AS target_client_id
      WHERE EXISTS (
        SELECT 1
        FROM public.client_primary_contacts cpc
        WHERE cpc.client_id = target_client_id
        AND cpc.user_id = auth.uid()
      )
    )
  )
);