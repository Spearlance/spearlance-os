-- Create brand_guides table
CREATE TABLE public.brand_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  primary_font TEXT,
  secondary_font TEXT,
  font_pairing_style TEXT,
  aesthetic TEXT,
  logo_usage_guidelines TEXT,
  color_usage_notes TEXT,
  typography_notes TEXT,
  imagery_style TEXT,
  brand_personality JSONB DEFAULT '[]'::jsonb,
  dos_and_donts JSONB DEFAULT '{"dos": [], "donts": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_guides ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_guides
CREATE POLICY "Users can view brand guides for accessible clients"
  ON public.brand_guides
  FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create brand guides for accessible clients"
  ON public.brand_guides
  FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update brand guides for accessible clients"
  ON public.brand_guides
  FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete brand guides for accessible clients"
  ON public.brand_guides
  FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Create mood_boards table
CREATE TABLE public.mood_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  brand_guide_id UUID REFERENCES public.brand_guides(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  generated_images JSONB DEFAULT '[]'::jsonb,
  inspiration_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  style_direction TEXT,
  color_palette_preview JSONB,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mood_boards ENABLE ROW LEVEL SECURITY;

-- RLS policies for mood_boards
CREATE POLICY "Users can view mood boards for accessible clients"
  ON public.mood_boards
  FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create mood boards for accessible clients"
  ON public.mood_boards
  FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update mood boards for accessible clients"
  ON public.mood_boards
  FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete mood boards for accessible clients"
  ON public.mood_boards
  FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Create updated_at trigger for brand_guides
CREATE TRIGGER update_brand_guides_updated_at
  BEFORE UPDATE ON public.brand_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for mood_boards
CREATE TRIGGER update_mood_boards_updated_at
  BEFORE UPDATE ON public.mood_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();