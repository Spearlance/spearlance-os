import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { AnimatedCarousel } from "@/components/auth/AnimatedCarousel";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { MagicLinkLogin } from "@/components/auth/MagicLinkLogin";
import { trackLoginEvent } from "@/hooks/useActivityTracker";

const signupSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name must be less than 200 characters")
});

const signinSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Load remembered email if exists
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate inputs
    const validation = signupSchema.safeParse({ email, password, name, companyName });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name,
            role: 'client'
          }
        }
      });

      if (error) throw error;

      // Call edge function to create self-service client
      if (data.user) {
        const { error: clientError } = await supabase.functions.invoke(
          'create-self-service-client',
          {
            body: {
              userId: data.user.id,
              companyName: companyName,
              userEmail: email,
              userName: name
            }
          }
        );

        if (clientError) {
          console.error('Error creating client company:', clientError);
        }
      }

      toast({
        title: "Welcome to Spearlance!",
        description: "Your 90-day free trial has started. Redirecting...",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate inputs
    const validation = signinSchema.safeParse({ email, password });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Track login event
      if (data.user) {
        trackLoginEvent(data.user.id);
      }

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setSendingReset(true);
    try {
      // Call custom edge function instead of native Supabase method
      const { data, error } = await supabase.functions.invoke('forgot-password', {
        body: { email: resetEmail }
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setSendingReset(false);
    }
  };

  return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Logo - Fixed top-left, 200x200px */}
        <div className="absolute top-4 left-4 z-10">
          <img 
            src="/spearlance-logo.png"
            alt="Spearlance Logo" 
            className="h-[200px] w-[200px] object-contain"
          />
        </div>
  
        {/* Left Column - Login/Signup Form */}
        <div className="flex items-center justify-center p-8 lg:pl-16 lg:pr-8 bg-background">
        <div className="w-full max-w-md pt-56">
          {showMagicLink ? (
            <MagicLinkLogin onBack={() => setShowMagicLink(false)} />
          ) : !isSignUp ? (
            // Sign In Form
            <>
              <h1 className="text-4xl font-bold mb-8">Log in</h1>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationErrors(prev => ({ ...prev, email: "" }));
                    }}
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-destructive">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors(prev => ({ ...prev, password: "" }));
                    }}
                    required
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-destructive">{validationErrors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe} 
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label 
                      htmlFor="remember" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm px-0"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log in
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMagicLink(true)}
                >
                  ✨ Login with Magic Link
                </Button>

                <div className="text-center mt-6">
                  <span className="text-muted-foreground">No account? </span>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() => {
                      setIsSignUp(true);
                      setValidationErrors({});
                    }}
                  >
                    Sign up here
                  </Button>
                </div>
              </form>
            </>
          ) : (
            // Sign Up Form
            <>
              <h1 className="text-4xl font-bold mb-8">Create Account</h1>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setValidationErrors(prev => ({ ...prev, name: "" }));
                    }}
                    required
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive">{validationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-company">Company Name</Label>
                  <Input
                    id="signup-company"
                    type="text"
                    placeholder="Acme Inc"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setValidationErrors(prev => ({ ...prev, companyName: "" }));
                    }}
                    required
                  />
                  {validationErrors.companyName && (
                    <p className="text-sm text-destructive">{validationErrors.companyName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationErrors(prev => ({ ...prev, email: "" }));
                    }}
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-destructive">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors(prev => ({ ...prev, password: "" }));
                    }}
                    required
                    minLength={8}
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-destructive">{validationErrors.password}</p>
                  )}
                  <PasswordStrengthIndicator password={password} />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>

                <div className="text-center mt-6">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() => {
                      setIsSignUp(false);
                      setValidationErrors({});
                    }}
                  >
                    Sign in
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

        {/* Right Column - Animated AI Features Carousel */}
        <div className="hidden lg:flex flex-col relative bg-gradient-to-br from-gray-900 via-black to-gray-950 overflow-hidden h-screen">
          {/* Top section - Future hero content area */}
          <div className="flex-1 flex items-center justify-center">
            {/* Placeholder for future images/content */}
          </div>
          
          {/* Bottom section - Carousel */}
          <div className="h-[35vh] relative">
            <AnimatedCarousel />
          </div>
        </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="email@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleForgotPassword}
              disabled={sendingReset}
              className="w-full"
            >
              {sendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
