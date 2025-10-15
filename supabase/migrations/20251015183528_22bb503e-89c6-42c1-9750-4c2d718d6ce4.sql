-- Phase 1.2: Fix database function search path
CREATE OR REPLACE FUNCTION public.update_channel_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_channel_id UUID;
  v_total_tasks INTEGER;
  v_done_tasks INTEGER;
  v_progress NUMERIC;
BEGIN
  v_channel_id := NEW.linked_channel_id;
  
  IF v_channel_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO v_total_tasks
  FROM marketing_flow_task_links
  WHERE channel_id = v_channel_id;
  
  SELECT COUNT(*) INTO v_done_tasks
  FROM tasks t
  INNER JOIN marketing_flow_task_links l ON t.id = l.task_id
  WHERE l.channel_id = v_channel_id AND t.status = 'done';
  
  IF v_total_tasks = 0 THEN
    v_progress := 0;
  ELSE
    v_progress := ROUND((100.0 * v_done_tasks / v_total_tasks)::NUMERIC, 0);
  END IF;
  
  UPDATE marketing_flow_channels
  SET progress = v_progress, updated_at = now()
  WHERE id = v_channel_id;
  
  RETURN NEW;
END;
$function$;

-- Phase 1.4: Create admin audit logs table
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_client_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert logs (for edge functions if needed)
CREATE POLICY "Service role can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_admin_user ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target_user ON public.admin_audit_logs(target_user_id);
CREATE INDEX idx_admin_audit_logs_target_client ON public.admin_audit_logs(target_client_id);