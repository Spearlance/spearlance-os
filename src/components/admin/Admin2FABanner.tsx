import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { Link } from "react-router-dom";

export function Admin2FABanner() {
  const [show, setShow] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkEnrollmentStatus();
  }, []);

  const checkEnrollmentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('admin_2fa_status')
        .select('is_enrolled')
        .eq('user_id', user.id)
        .maybeSingle();

      const enrolled = data?.is_enrolled || false;
      setIsEnrolled(enrolled);
      
      // Show banner if not enrolled and not dismissed
      const dismissed = localStorage.getItem('2fa-banner-dismissed');
      if (!enrolled && !dismissed) {
        setShow(true);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('2fa-banner-dismissed', 'true');
  };

  if (!show || isEnrolled) return null;

  return (
    <Alert className="mb-6 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 items-start flex-1">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <strong className="font-semibold">Enable Two-Factor Authentication</strong>
              <p className="mt-1 text-muted-foreground">
                Protect your admin account with an extra layer of security. Set up 2FA using an authenticator app.
              </p>
              <Link to="/admin/2fa-setup">
                <Button variant="outline" size="sm" className="mt-3">
                  Set Up 2FA
                </Button>
              </Link>
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}