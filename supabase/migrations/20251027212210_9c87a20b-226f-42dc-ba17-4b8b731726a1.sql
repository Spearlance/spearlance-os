-- Create leads table for structured lead data
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.website_form_submissions(id) ON DELETE SET NULL,
  
  -- Contact information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  
  -- Business information
  industry TEXT,
  business_type TEXT,
  budget TEXT,
  timeline TEXT,
  pain_points TEXT[],
  additional_notes TEXT,
  
  -- AI-generated intelligence
  ai_summary TEXT,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  next_action TEXT,
  
  -- Lead management
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policies for leads
CREATE POLICY "Users can view leads for their clients"
  ON public.leads FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create leads for their clients"
  ON public.leads FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update leads for their clients"
  ON public.leads FOR UPDATE
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete leads for their clients"
  ON public.leads FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));

-- Add updated_at trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_leads_client_id ON public.leads(client_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_urgency ON public.leads(urgency);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_submission_id ON public.leads(submission_id);