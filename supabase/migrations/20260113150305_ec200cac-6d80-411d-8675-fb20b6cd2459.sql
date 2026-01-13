-- Create website_builds table
CREATE TABLE public.website_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'launched')),
  target_launch_date DATE,
  dev_notes TEXT,
  scope_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create website_build_pages table
CREATE TABLE public.website_build_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id UUID NOT NULL REFERENCES public.website_builds(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  page_type TEXT DEFAULT 'content' CHECK (page_type IN ('landing', 'content', 'form', 'gallery', 'blog', 'contact')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'content_ready', 'designed', 'built', 'reviewed')),
  content_notes TEXT,
  ai_generated_content JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create website_build_tasks junction table
CREATE TABLE public.website_build_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id UUID NOT NULL REFERENCES public.website_builds(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(build_id, task_id)
);

-- Enable RLS on all tables
ALTER TABLE public.website_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_build_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_build_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for website_builds
CREATE POLICY "Users can view builds for their clients"
  ON public.website_builds FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create builds for their clients"
  ON public.website_builds FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update builds for their clients"
  ON public.website_builds FOR UPDATE
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete builds for their clients"
  ON public.website_builds FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));

-- RLS policies for website_build_pages
CREATE POLICY "Users can view pages for builds they have access to"
  ON public.website_build_pages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

CREATE POLICY "Users can create pages for builds they have access to"
  ON public.website_build_pages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

CREATE POLICY "Users can update pages for builds they have access to"
  ON public.website_build_pages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

CREATE POLICY "Users can delete pages for builds they have access to"
  ON public.website_build_pages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

-- RLS policies for website_build_tasks
CREATE POLICY "Users can view task links for builds they have access to"
  ON public.website_build_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

CREATE POLICY "Users can create task links for builds they have access to"
  ON public.website_build_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

CREATE POLICY "Users can delete task links for builds they have access to"
  ON public.website_build_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.website_builds wb
    WHERE wb.id = build_id AND public.has_client_access(auth.uid(), wb.client_id)
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_website_builds_updated_at
  BEFORE UPDATE ON public.website_builds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_build_pages_updated_at
  BEFORE UPDATE ON public.website_build_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();