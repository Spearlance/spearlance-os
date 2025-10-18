-- Create support_article_views table for tracking article views
CREATE TABLE IF NOT EXISTS public.support_article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.support_articles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_article_views_article ON public.support_article_views(article_id);
CREATE INDEX idx_support_article_views_user ON public.support_article_views(user_id);

ALTER TABLE public.support_article_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (anonymous or authenticated)
CREATE POLICY "Anyone can insert article views"
  ON public.support_article_views
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all article views"
  ON public.support_article_views
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create support_article_feedback table for helpful/not helpful tracking
CREATE TABLE IF NOT EXISTS public.support_article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.support_articles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_article_feedback_article ON public.support_article_feedback(article_id);
CREATE INDEX idx_support_article_feedback_user ON public.support_article_feedback(user_id);

ALTER TABLE public.support_article_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (anonymous or authenticated)
CREATE POLICY "Anyone can insert article feedback"
  ON public.support_article_feedback
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all article feedback"
  ON public.support_article_feedback
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));