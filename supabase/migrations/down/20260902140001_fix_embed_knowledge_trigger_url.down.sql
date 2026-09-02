-- DOWN for 20260902140001: restores the 20260305000003 body (hard-coded PROD
-- URL + supabase.anon_key GUC). Only do this on prod; on dev it re-introduces
-- the cross-environment leak the up migration fixes.
CREATE OR REPLACE FUNCTION public.notify_embed_knowledge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _url TEXT := 'https://chikljxwgiskyjsnjelf.supabase.co/functions/v1/embed-knowledge';
  _anon_key TEXT := current_setting('supabase.anon_key', true);
  _payload JSONB;
BEGIN
  _payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', _anon_key,
      'Authorization', 'Bearer ' || _anon_key
    ),
    body := _payload
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
