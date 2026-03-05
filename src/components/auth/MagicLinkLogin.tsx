import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

interface MagicLinkLoginProps {
  onBack: () => void;
}

export const MagicLinkLogin = ({ onBack }: MagicLinkLoginProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-magic-link', {
        body: { email: email.trim() }
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Magic link sent! ✨",
        description: "Check your email and click the link to log in",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-muted-foreground">
          We've sent a magic link to <strong>{email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link in the email to log in instantly. The link expires in 15 minutes.
        </p>
        <div className="pt-4 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setEmailSent(false)}
          >
            Send another link
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to password login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Login with Magic Link</h2>
        <p className="text-muted-foreground">
          No password needed - we'll email you a secure login link
        </p>
      </div>

      <form onSubmit={handleSendMagicLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="magic-email">Email address</Label>
          <Input
            id="magic-email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Magic Link
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to password login
        </Button>
      </form>

      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
        <p>💡 <strong>Tip:</strong> Magic links are perfect for quick access without remembering passwords!</p>
      </div>
    </div>
  );
};
