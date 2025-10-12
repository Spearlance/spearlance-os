-- Create services table
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  differentiators text,
  target_audience text,
  service_areas text[],
  pricing_model text,
  price_range text,
  key_benefits text[],
  common_objections text,
  ideal_client_profile text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view services for accessible clients"
  ON public.services FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create services for accessible clients"
  ON public.services FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update services for accessible clients"
  ON public.services FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete services for accessible clients"
  ON public.services FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();