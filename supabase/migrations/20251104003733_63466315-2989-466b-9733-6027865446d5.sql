-- Create blog AI preferences table
CREATE TABLE public.blog_ai_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_voice TEXT,
  target_audience TEXT,
  topics_to_avoid TEXT,
  preferred_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  content_guidelines TEXT,
  industry_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.blog_ai_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view preferences for accessible clients"
  ON public.blog_ai_preferences
  FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert preferences for accessible clients"
  ON public.blog_ai_preferences
  FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update preferences for accessible clients"
  ON public.blog_ai_preferences
  FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete preferences for accessible clients"
  ON public.blog_ai_preferences
  FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER update_blog_ai_preferences_updated_at
  BEFORE UPDATE ON public.blog_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();