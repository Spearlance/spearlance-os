-- Duda site-comments webhook support (duda-comments-webhook edge function)

-- 1) Per-client webhook tokens. Inbound webhooks carry ?token=<secret>; the
--    token row binds the request to exactly one client, so a client's Duda
--    comments can only ever create tasks on that client's board (no reliance
--    on payload-supplied site IDs, which the sender controls).
CREATE TABLE public.client_webhook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'duda_comments',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX idx_client_webhook_tokens_client_id ON public.client_webhook_tokens(client_id);

ALTER TABLE public.client_webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook tokens"
  ON public.client_webhook_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) External references on tasks so later webhook events (replies, resolved
--    status) can find the task created for a Duda conversation.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_ref text;

COMMENT ON COLUMN public.tasks.external_source IS 'Origin system for webhook-created tasks (e.g. duda_comment)';
COMMENT ON COLUMN public.tasks.external_ref IS 'Identifier in the origin system (e.g. Duda conversation_uuid)';

CREATE INDEX IF NOT EXISTS idx_tasks_external_ref
  ON public.tasks(client_id, external_source, external_ref)
  WHERE external_ref IS NOT NULL;
