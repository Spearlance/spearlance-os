import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CalendarPlatformCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Validate state (CSRF protection)
      const savedState = localStorage.getItem('cal_platform_oauth_state');
      if (state !== savedState) {
        toast({
          title: "Security Error",
          description: "Invalid OAuth state. Please try again.",
          variant: "destructive"
        });
        navigate('/admin');
        return;
      }
      localStorage.removeItem('cal_platform_oauth_state');

      if (error) {
        toast({
          title: "Platform OAuth Failed",
          description: error,
          variant: "destructive"
        });
        navigate('/admin');
        return;
      }

      if (code) {
        // Exchange code for tokens - pass origin for redirect_uri validation
        const { data, error: exchangeError } = await supabase.functions.invoke(
          'cal-oauth-exchange',
          { body: { action: 'exchange', code, origin: window.location.origin } }
        );

        if (exchangeError) {
          toast({
            title: "Token Exchange Failed",
            description: exchangeError.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Platform Initialized",
            description: "Cal.com Platform access configured successfully!"
          });
        }
      }

      navigate('/admin');
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Initializing Cal.com Platform...</p>
      </div>
    </div>
  );
}
