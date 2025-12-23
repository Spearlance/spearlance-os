-- Create seo_reports table: One record per uploaded PDF
CREATE TABLE public.seo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  visibility_score NUMERIC(5,2),
  average_position NUMERIC(6,2),
  keywords_top_3 INTEGER DEFAULT 0,
  keywords_top_10 INTEGER DEFAULT 0,
  keywords_top_30 INTEGER DEFAULT 0,
  keywords_total INTEGER DEFAULT 0,
  pdf_url TEXT,
  raw_extraction JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create seo_keywords table: Individual keyword tracking per region
CREATE TABLE public.seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  seo_report_id UUID REFERENCES public.seo_reports(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  search_engine TEXT DEFAULT 'Google',
  region TEXT,
  position INTEGER,
  position_start INTEGER,
  position_change INTEGER,
  best_position INTEGER,
  ranking_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(seo_report_id, keyword, region)
);

-- Enable RLS
ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_reports using has_client_access function
CREATE POLICY "Users can view seo_reports for their clients" ON public.seo_reports
  FOR SELECT USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create seo_reports for their clients" ON public.seo_reports
  FOR INSERT WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update seo_reports for their clients" ON public.seo_reports
  FOR UPDATE USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete seo_reports for their clients" ON public.seo_reports
  FOR DELETE USING (public.has_client_access(auth.uid(), client_id));

-- RLS policies for seo_keywords using has_client_access function
CREATE POLICY "Users can view seo_keywords for their clients" ON public.seo_keywords
  FOR SELECT USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create seo_keywords for their clients" ON public.seo_keywords
  FOR INSERT WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update seo_keywords for their clients" ON public.seo_keywords
  FOR UPDATE USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete seo_keywords for their clients" ON public.seo_keywords
  FOR DELETE USING (public.has_client_access(auth.uid(), client_id));

-- Create indexes for performance
CREATE INDEX idx_seo_reports_client_id ON public.seo_reports(client_id);
CREATE INDEX idx_seo_reports_report_date ON public.seo_reports(report_date DESC);
CREATE INDEX idx_seo_keywords_client_id ON public.seo_keywords(client_id);
CREATE INDEX idx_seo_keywords_report_id ON public.seo_keywords(seo_report_id);
CREATE INDEX idx_seo_keywords_keyword ON public.seo_keywords(keyword);

-- Create storage bucket for SEO reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('seo-reports', 'seo-reports', false);

-- Storage RLS policies
CREATE POLICY "Users can view seo-reports files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'seo-reports' AND
    public.has_client_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can upload seo-reports files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'seo-reports' AND
    public.has_client_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can delete seo-reports files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'seo-reports' AND
    public.has_client_access(auth.uid(), (storage.foldername(name))[1]::uuid)
  );