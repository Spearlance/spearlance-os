-- Add professional details columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN job_title TEXT,
ADD COLUMN department TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN expertise_level TEXT DEFAULT 'intermediate' CHECK (expertise_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN preferred_communication_style TEXT DEFAULT 'balanced' CHECK (preferred_communication_style IN ('concise', 'balanced', 'detailed')),
ADD COLUMN focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.job_title IS 'User job title (e.g., Marketing Director, CMO)';
COMMENT ON COLUMN public.profiles.department IS 'User department (e.g., Marketing, Sales, Operations)';
COMMENT ON COLUMN public.profiles.bio IS 'Short description about role and responsibilities (max ~500 chars)';
COMMENT ON COLUMN public.profiles.expertise_level IS 'Marketing expertise level for AI personalization';
COMMENT ON COLUMN public.profiles.preferred_communication_style IS 'Preferred response style from AI assistant';
COMMENT ON COLUMN public.profiles.focus_areas IS 'Array of focus areas/responsibilities for personalized suggestions';