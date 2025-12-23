-- Create table for Clarity daily traffic sources
CREATE TABLE public.clarity_daily_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  source TEXT NOT NULL,
  medium TEXT,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for Clarity daily page performance
CREATE TABLE public.clarity_daily_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  scroll_depth NUMERIC(5,2),
  engagement_time_seconds INTEGER DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_clarity_daily_sources_client_date ON public.clarity_daily_sources(client_id, metric_date);
CREATE INDEX idx_clarity_daily_pages_client_date ON public.clarity_daily_pages(client_id, metric_date);

-- Add unique constraints to prevent duplicates
ALTER TABLE public.clarity_daily_sources 
  ADD CONSTRAINT clarity_daily_sources_unique UNIQUE (client_id, metric_date, source, medium);

ALTER TABLE public.clarity_daily_pages 
  ADD CONSTRAINT clarity_daily_pages_unique UNIQUE (client_id, metric_date, page_url);

-- Enable RLS
ALTER TABLE public.clarity_daily_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clarity_daily_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for sources - users can only see their client's data
CREATE POLICY "Users can view their client sources" ON public.clarity_daily_sources
  FOR SELECT USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can insert sources" ON public.clarity_daily_sources
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update sources" ON public.clarity_daily_sources
  FOR UPDATE USING (true);

-- RLS policies for pages - users can only see their client's data
CREATE POLICY "Users can view their client pages" ON public.clarity_daily_pages
  FOR SELECT USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can insert pages" ON public.clarity_daily_pages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update pages" ON public.clarity_daily_pages
  FOR UPDATE USING (true);