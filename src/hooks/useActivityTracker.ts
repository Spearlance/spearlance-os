import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ActivityEvent {
  action_type: string;
  action_details?: Record<string, any>;
  client_id?: string;
}

export function useActivityTracker(clientId?: string) {
  const location = useLocation();
  const lastPath = useRef<string>('');
  const userId = useRef<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userId.current = user?.id || null;
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      userId.current = session?.user?.id || null;
    });

    return () => subscription.unsubscribe();
  }, []);

  // Log activity to database
  const logActivity = useCallback(async (event: ActivityEvent) => {
    if (!userId.current) return;

    try {
      await supabase.from('user_activity_logs').insert({
        user_id: userId.current,
        action_type: event.action_type,
        action_details: event.action_details || {},
        client_id: event.client_id || clientId || null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [clientId]);

  // Track page views
  useEffect(() => {
    if (location.pathname !== lastPath.current && userId.current) {
      lastPath.current = location.pathname;
      logActivity({
        action_type: 'page_view',
        action_details: { 
          path: location.pathname,
          search: location.search,
        },
      });
    }
  }, [location.pathname, location.search, logActivity]);

  // Public method to track custom actions
  const trackAction = useCallback((actionType: string, details?: Record<string, any>) => {
    logActivity({
      action_type: actionType,
      action_details: details,
    });
  }, [logActivity]);

  return { trackAction };
}

// Track login event - call this after successful login
export async function trackLoginEvent(userId: string) {
  try {
    // Update last_login_at in profiles
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    // Log the login activity
    await supabase.from('user_activity_logs').insert({
      user_id: userId,
      action_type: 'login',
      action_details: { 
        timestamp: new Date().toISOString(),
      },
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to track login:', error);
  }
}
