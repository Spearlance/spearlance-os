import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import logo from "@/assets/spearlance-logo.png";
import { getRecoveryError, hasRecoveryTokensInHash, hasUsableRecoverySession } from "@/lib/authRecovery";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestingReset, setRequestingReset] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let resolved = false;
    const recoveryError = getRecoveryError();
    if (recoveryError?.description) {
      setLinkError(recoveryError.description);
    }

    const finalizeMissingSession = (message: string) => {
      if (resolved) return;
      resolved = true;
      setLinkError(message);
      setCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (hasUsableRecoverySession(session)) {
        resolved = true;
        setLinkError(null);
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hasUsableRecoverySession(session)) {
        resolved = true;
        setLinkError(null);
        setCheckingSession(false);
        return;
      }

      if (!hasRecoveryTokensInHash()) {
        finalizeMissingSession("This password reset link is invalid or has expired. Request a new one below.");
      }
    });

    const timer = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      setCheckingSession(false);
      setLinkError((current) => current ?? "This password reset link is invalid or has expired. Request a new one below.");
    }, 1500);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const handleRequestReset = async () => {
    if (!requestEmail.trim()) {
      toast.error("Email required", { description: "Please enter your email address" });
      return;
    }

    setRequestingReset(true);
    try {
      const { error } = await supabase.functions.invoke("forgot-password", {
        body: { email: requestEmail.trim() },
      });

      if (error) throw error;

      toast.success("Check your email", { description: "If an account exists, a new reset link has been sent." });
      setRequestEmail("");
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to send reset email" });
    } finally {
      setRequestingReset(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match", { description: "Please ensure both passwords are identical." });
      return;
    }

    if (password.length < 6) {
      toast.error("Password too short", { description: "Password must be at least 6 characters long." });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      
      toast.success("Password updated!", { description: "Your password has been successfully reset." });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to reset password" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-center">Password Reset Successful</CardTitle>
            <CardDescription className="text-center">
              Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardContent className="py-10 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validating your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-amber-500" />
            </div>
            <CardTitle className="text-2xl text-center">Reset Link Unavailable</CardTitle>
            <CardDescription className="text-center">{linkError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-request-email">Email</Label>
              <Input
                id="reset-request-email"
                type="email"
                placeholder="email@example.com"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleRequestReset}
              disabled={requestingReset}
              className="w-full"
            >
              {requestingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="Spearlance" className="h-12" />
          </div>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
