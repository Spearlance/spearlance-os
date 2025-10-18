-- Create the support_articles table
CREATE TABLE IF NOT EXISTS public.support_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  subcategory text,
  content text NOT NULL,
  excerpt text,
  tags text[] DEFAULT '{}',
  is_published boolean DEFAULT false,
  featured_order integer,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_support_articles_slug ON public.support_articles(slug);
CREATE INDEX idx_support_articles_category ON public.support_articles(category);
CREATE INDEX idx_support_articles_published ON public.support_articles(is_published);
CREATE INDEX idx_support_articles_featured ON public.support_articles(featured_order) WHERE featured_order IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER update_support_articles_updated_at
  BEFORE UPDATE ON public.support_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.support_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view published articles"
  ON public.support_articles
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all articles"
  ON public.support_articles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create articles"
  ON public.support_articles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update articles"
  ON public.support_articles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete articles"
  ON public.support_articles
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));