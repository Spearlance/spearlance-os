-- Stop the knowledge-embedding trigger from crossing environments.
--
-- 20260305000003 hard-coded the PROD functions URL inside
-- notify_embed_knowledge(). On the dev project (a branch of prod) every
-- INSERT/UPDATE on tasks, meetings, etc. therefore posted DEV rows to PROD's
-- embed-knowledge function, which writes into prod's client_knowledge_embeddings.
-- It only failed to land when the dev client didn't exist on prod (FK error);
-- for clients that exist in both projects, dev edits polluted prod's knowledge
-- base. Seen in net._http_response on dev, 2026-09-02.
--
-- Fix: resolve the URL and key from Vault ('project_url', 'service_role_key'),
-- the same secrets the cron jobs and the QA dispatch trigger use, so each
-- project calls its own functions. If the secrets are missing the trigger
-- logs a WARNING and skips instead of guessing.

CREATE OR REPLACE FUNCTION public.notify_embed_knowledge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _url TEXT;
  _key TEXT;
  _payload JSONB;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF _url IS NULL OR _key IS NULL THEN
    RAISE WARNING 'notify_embed_knowledge: vault secrets missing; % on % not embedded', TG_OP, TG_TABLE_NAME;
    RETURN COALESCE(NEW, OLD);
  END IF;

  _payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  PERFORM net.http_post(
    url := _url || '/functions/v1/embed-knowledge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := _payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
