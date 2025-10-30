-- Drop existing policy that allows all users to see all messages
DROP POLICY IF EXISTS "Users can access ticket_messages for accessible tickets" ON public.ticket_messages;

-- Policy for regular messages (visible to all users with ticket access)
CREATE POLICY "Users can view regular messages for accessible tickets"
ON public.ticket_messages 
FOR SELECT
USING (
  NOT is_internal_note
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

-- Policy for internal notes (visible only to admin/FMM)
CREATE POLICY "Admin and FMM can view internal notes"
ON public.ticket_messages 
FOR SELECT
USING (
  is_internal_note
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE t.id = ticket_id
    AND public.has_client_access(auth.uid(), t.client_id)
    AND p.role IN ('admin', 'fmm')
  )
);

-- Policy for inserting messages (all users with ticket access)
CREATE POLICY "Users can insert messages for accessible tickets"
ON public.ticket_messages 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
  AND author_user_id = auth.uid()
);

-- Policy for updating/deleting (only admin/FMM can update/delete)
CREATE POLICY "Admin and FMM can modify messages"
ON public.ticket_messages 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'fmm')
  )
);

CREATE POLICY "Admin and FMM can delete messages"
ON public.ticket_messages 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'fmm')
  )
);