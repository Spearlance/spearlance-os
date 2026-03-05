-- Knowledge Base Webhook Triggers
-- Uses pg_net to call embed-knowledge edge function on INSERT/UPDATE
-- The edge function is deployed with --no-verify-jwt, so the anon key works.

-- Ensure pg_net extension is available (already enabled on Supabase hosted)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Generic trigger function that fires embed-knowledge via pg_net
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
  -- Build the webhook payload matching what embed-knowledge expects
  _payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Fire async HTTP POST via pg_net (non-blocking)
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

-- Create AFTER triggers on all 9 embeddable tables
CREATE TRIGGER embed_knowledge_meetings
  AFTER INSERT OR UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_tasks
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_quarterly_goals
  AFTER INSERT OR UPDATE ON public.quarterly_goals
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_website_form_submissions
  AFTER INSERT OR UPDATE ON public.website_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_reports
  AFTER INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_communication_logs
  AFTER INSERT OR UPDATE ON public.communication_logs
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_social_media_posts
  AFTER INSERT OR UPDATE ON public.social_media_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_blog_posts
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();

CREATE TRIGGER embed_knowledge_marketing_ideas
  AFTER INSERT OR UPDATE ON public.marketing_ideas
  FOR EACH ROW EXECUTE FUNCTION public.notify_embed_knowledge();
