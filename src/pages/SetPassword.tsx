import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getRecoveryError, hasRecoveryTokensInHash, hasUsableRecoverySession } from "@/lib/authRecovery";

const SetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestingNewLink, setRequestingNewLink] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let resolved = false;
    const recoveryError = getRecoveryError();
    if (recoveryError) {
      resolved = true;
      setTokenExpired(true);
      setCheckingSession(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (hasUsableRecoverySession(session)) {
        resolved = true;
        setTokenExpired(false);
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hasUsableRecoverySession(session)) {
        if (!hasRecoveryTokensInHash()) {
          resolved = true;
          navigate("/");
          return;
        }

        resolved = true;
        setTokenExpired(false);
        setCheckingSession(false);
        return;
      }

      if (!hasRecoveryTokensInHash()) {
        resolved = true;
        setTokenExpired(true);
        setCheckingSession(false);
      }
    });

    const timer = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      setCheckingSession(false);
      setTokenExpired(true);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match", { description: "Please make sure both passwords are identical." });
      return;
    }

    if (password.length < 6) {
      toast.error("Password too short", { description: "Password must be at least 6 characters long." });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Password set successfully!", { description: "Welcome! Redirecting you to your dashboard..." });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      // Check if error is due to expired/invalid session
      if (error.message?.toLowerCase().includes('session') || 
          error.message?.toLowerCase().includes('token') ||
          error.message?.toLowerCase().includes('expired')) {
        setTokenExpired(true);
        toast.error("Link expired", { description: "Your setup link has expired. Please request a new one below." });
      } else {
        toast.error("Error setting password", { description: error.message || "An unexpected error occurred. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestEmail.trim()) {
      toast.error("Email required", { description: "Please enter your email address" });
      return;
    }

    setRequestingNewLink(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-new-invitation', {
        body: { email: requestEmail }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Check your email", { description: data.message || "A new invitation link has been sent to your email" });
        setRequestEmail("");
      } else {
        toast.error("Notice", { description: data.message });
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to send new link. Please contact support." });
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

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-8 text-center">
            <p className="text-muted-foreground">Validating your setup link...</p>
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
