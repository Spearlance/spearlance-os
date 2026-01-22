import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import spearlanceLogo from "@/assets/spearlance-logo.png";

interface PasswordGateProps {
  shareToken: string;
  onAuthenticated: (sessionToken: string, clientName: string, expiresIn: number) => void;
}

export function PasswordGate({ shareToken, onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('public-assets-auth', {
        body: { token: shareToken, password }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Authentication failed');
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      onAuthenticated(data.session_token, data.client_name, data.expires_in);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img 
              src={spearlanceLogo} 
              alt="Spearlance" 
              className="h-10 w-auto"
            />
          </div>
          <div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Asset Portal
            </CardTitle>
            <CardDescription>
              Enter the password to access the asset library
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Assets'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
