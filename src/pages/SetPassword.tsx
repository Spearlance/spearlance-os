import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestingNewLink, setRequestingNewLink] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in and not in password recovery
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !window.location.hash) {
        navigate("/");
      }
    });

    // Check for expired/invalid token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (error || errorDescription?.toLowerCase().includes('expired') || errorDescription?.toLowerCase().includes('invalid')) {
      setTokenExpired(true);
    }
  }, [navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password set successfully!",
        description: "Welcome! Redirecting you to your dashboard...",
      });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      // Check if error is due to expired/invalid session
      if (error.message?.toLowerCase().includes('session') || 
          error.message?.toLowerCase().includes('token') ||
          error.message?.toLowerCase().includes('expired')) {
        setTokenExpired(true);
        toast({
          title: "Link expired",
          description: "Your setup link has expired. Please request a new one below.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error setting password",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setRequestingNewLink(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-new-invitation', {
        body: { email: requestEmail }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Check your email",
          description: data.message || "A new invitation link has been sent to your email",
        });
        setRequestEmail("");
      } else {
        toast({
          title: "Notice",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send new link. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setRequestingNewLink(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Password Set Successfully!
            </h2>
            <p className="text-muted-foreground mb-4">
              Welcome! Redirecting you to your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (tokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-8">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              Invitation Link Expired
            </h2>
            <p className="text-muted-foreground mb-6 text-center">
              Your invitation link has expired or is invalid. No worries - we can send you a fresh one!
            </p>

            <Alert className="mb-6">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Enter your email address below and we'll send you a new link to complete your account setup.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleRequestNewLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request-email">Email Address</Label>
                <Input
                  id="request-email"
                  type="email"
                  placeholder="email@example.com"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  required
                  disabled={requestingNewLink}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={requestingNewLink}
              >
                {requestingNewLink ? "Sending..." : "Send New Invitation Link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Need help? Contact your administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Set Your Password
            </h1>
            <p className="text-muted-foreground">
              Welcome! Let's get your account set up
            </p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Setting password..." : "Set Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
