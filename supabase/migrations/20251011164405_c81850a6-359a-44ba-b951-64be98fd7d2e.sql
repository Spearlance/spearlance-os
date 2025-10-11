-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'fmm', 'client');
CREATE TYPE public.client_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE public.billing_status AS ENUM ('good', 'delinquent', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('to_do', 'in_progress', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.asset_type AS ENUM ('image', 'video', 'copy', 'doc', 'link', 'other');
CREATE TYPE public.storage_type AS ENUM ('upload', 'url');
CREATE TYPE public.ticket_category AS ENUM ('website', 'ads', 'seo', 'billing', 'other');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_client', 'resolved');
CREATE TYPE public.launchpad_stage AS ENUM ('discovery', 'access', 'assets', 'avatar', 'complete');

-- Create billing_plans table
CREATE TABLE public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_portal_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  primary_contact_user_id UUID,
  status client_status DEFAULT 'active',
  website_url TEXT,
  oviond_url TEXT,
  drive_folder_url TEXT,
  canva_folder_url TEXT,
  billing_plan_id UUID REFERENCES public.billing_plans(id),
  billing_status billing_status DEFAULT 'good',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  associated_client_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update clients foreign key
ALTER TABLE public.clients 
ADD CONSTRAINT clients_primary_contact_fkey 
FOREIGN KEY (primary_contact_user_id) 
REFERENCES public.profiles(id);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_time TIMESTAMPTZ NOT NULL,
  attendees TEXT,
  recording_url TEXT,
  transcript_text TEXT,
  summary TEXT NOT NULL,
  decisions TEXT[] DEFAULT ARRAY[]::TEXT[],
  next_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'to_do',
  priority task_priority DEFAULT 'normal',
  assignee_user_id UUID REFERENCES public.profiles(id),
  creator_user_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  related_asset_ids UUID[] DEFAULT ARRAY[]::UUID[],
  related_meeting_ids UUID[] DEFAULT ARRAY[]::UUID[],
  activity_log TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create meeting_tasks junction table
CREATE TABLE public.meeting_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, task_id)
);

-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type asset_type DEFAULT 'link',
  storage_type storage_type NOT NULL,
  file_url TEXT,
  upload_blob TEXT,
  preview_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  current_version_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create asset_versions table
CREATE TABLE public.asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  notes TEXT,
  file_url TEXT,
  upload_blob TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update assets foreign key for current_version_id
ALTER TABLE public.assets 
ADD CONSTRAINT assets_current_version_fkey 
FOREIGN KEY (current_version_id) 
REFERENCES public.asset_versions(id);

-- Create avatars table
CREATE TABLE public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  avatar_name TEXT NOT NULL,
  demographics TEXT,
  firmographics TEXT,
  goals TEXT,
  pains TEXT,
  objections TEXT,
  motivators TEXT,
  tone_voice TEXT,
  ad_hooks TEXT[] DEFAULT ARRAY[]::TEXT[],
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_summary TEXT,
  generated_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create avatar_evidence table
CREATE TABLE public.avatar_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  source_url TEXT,
  excerpt_text TEXT,
  uploaded_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload_json JSONB,
  read_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category ticket_category DEFAULT 'other',
  priority task_priority DEFAULT 'normal',
  status ticket_status DEFAULT 'open',
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id),
  owner_user_id UUID REFERENCES public.profiles(id),
  related_task_ids UUID[] DEFAULT ARRAY[]::UUID[],
  related_asset_ids UUID[] DEFAULT ARRAY[]::UUID[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ticket_messages table
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id),
  body_richtext TEXT NOT NULL,
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create launchpad_submissions table
CREATE TABLE public.launchpad_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  stage launchpad_stage DEFAULT 'discovery',
  responses_json JSONB,
  completed_at TIMESTAMPTZ,
  insights_summary TEXT,
  avatar_image_url TEXT,
  ideal_client_story TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table for security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchpad_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to check if user has access to client
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
    AND (
      p.role = 'admin'
      OR _client_id = ANY(p.associated_client_ids)
    )
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- RLS Policies for clients
CREATE POLICY "Admins can view all clients"
ON public.clients FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "FMMs can view assigned clients"
ON public.clients FOR SELECT
USING (public.has_client_access(auth.uid(), id));

CREATE POLICY "Client users can view their client"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'client'
    AND id = ANY(
      SELECT unnest(associated_client_ids)
    )
  )
);

CREATE POLICY "Admins can modify clients"
ON public.clients FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "FMMs can modify assigned clients"
ON public.clients FOR UPDATE
USING (public.has_client_access(auth.uid(), id));

-- RLS Policies for meetings
CREATE POLICY "Users can view meetings for accessible clients"
ON public.meetings FOR SELECT
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create meetings for accessible clients"
ON public.meetings FOR INSERT
WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update meetings for accessible clients"
ON public.meetings FOR UPDATE
USING (public.has_client_access(auth.uid(), client_id));

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for accessible clients"
ON public.tasks FOR SELECT
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create tasks for accessible clients"
ON public.tasks FOR INSERT
WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update tasks for accessible clients"
ON public.tasks FOR UPDATE
USING (public.has_client_access(auth.uid(), client_id));

-- RLS Policies for assets
CREATE POLICY "Users can view assets for accessible clients"
ON public.assets FOR SELECT
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create assets for accessible clients"
ON public.assets FOR INSERT
WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update assets for accessible clients"
ON public.assets FOR UPDATE
USING (public.has_client_access(auth.uid(), client_id));

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Users can access meeting_tasks for accessible meetings"
ON public.meeting_tasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id
    AND public.has_client_access(auth.uid(), m.client_id)
  )
);

CREATE POLICY "Users can access task_comments for accessible tasks"
ON public.task_comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

CREATE POLICY "Users can access asset_versions for accessible assets"
ON public.asset_versions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_id
    AND public.has_client_access(auth.uid(), a.client_id)
  )
);

CREATE POLICY "Users can access avatars for accessible clients"
ON public.avatars FOR ALL
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can access avatar_evidence for accessible avatars"
ON public.avatar_evidence FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.avatars av
    WHERE av.id = avatar_id
    AND public.has_client_access(auth.uid(), av.client_id)
  )
);

CREATE POLICY "Users can access tickets for accessible clients"
ON public.tickets FOR ALL
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can access ticket_messages for accessible tickets"
ON public.ticket_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

CREATE POLICY "Users can access launchpad for accessible clients"
ON public.launchpad_submissions FOR ALL
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing plans"
ON public.billing_plans FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify billing plans"
ON public.billing_plans FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at columns
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_launchpad_updated_at
BEFORE UPDATE ON public.launchpad_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
  );
  
  -- Also create user_roles entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();