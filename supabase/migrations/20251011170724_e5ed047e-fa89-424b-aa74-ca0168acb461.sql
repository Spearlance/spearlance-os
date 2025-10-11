-- Add Cal.com fields to meetings table
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS cal_event_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cal_booking_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cal_event_type_id TEXT,
ADD COLUMN IF NOT EXISTS cal_organizer_email TEXT,
ADD COLUMN IF NOT EXISTS cal_attendee_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS join_url TEXT,
ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meetings_cal_booking_id ON public.meetings(cal_booking_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);

-- Create Cal webhook logs table for debugging
CREATE TABLE IF NOT EXISTS public.cal_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on webhook logs
ALTER TABLE public.cal_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
ON public.cal_webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create an "Unassigned" client for meetings that can't be mapped
INSERT INTO public.clients (id, name, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Unassigned', 'active')
ON CONFLICT (id) DO NOTHING;