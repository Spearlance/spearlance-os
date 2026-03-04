import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw, Eye, EyeOff, Loader2, Link2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AssetShareSettingsProps {
  clientId: string;
  assetShareEnabled: boolean;
  assetShareToken: string | null;
  assetShareExpiresAt: string | null;
  onUpdate: () => void;
}

function generateToken(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function AssetShareSettings({ 
  clientId, 
  assetShareEnabled, 
  assetShareToken, 
  assetShareExpiresAt,
  onUpdate 
}: AssetShareSettingsProps) {
  const [enabled, setEnabled] = useState(assetShareEnabled);
  const [token, setToken] = useState(assetShareToken);
  const [expiresAt, setExpiresAt] = useState(assetShareExpiresAt?.split('T')[0] || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shareUrl = token 
    ? `${window.location.origin}/assets/share/${token}`
    : null;

  const handleToggleEnabled = async (newEnabled: boolean) => {
    setIsLoading(true);
    try {
      const updates: Record<string, unknown> = { asset_share_enabled: newEnabled };
      
      // Generate token if enabling for first time
      if (newEnabled && !token) {
        const newToken = generateToken();
        updates.asset_share_token = newToken;
        setToken(newToken);
      }

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId);

      if (error) throw error;

      setEnabled(newEnabled);
      onUpdate();
      
      toast.success(newEnabled ? "Asset sharing enabled" : "Asset sharing disabled", {
        description: newEnabled
          ? "Set a password to allow access to the asset portal"
          : "The share link is now inactive"
      });
    } catch (error) {
      toast.error("Error", { description: "Failed to update sharing settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!password || password.length < 6) {
      toast.error("Invalid password", { description: "Password must be at least 6 characters" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('set-asset-share-password', {
        body: { clientId, password }
      });

      if (error) throw error;

      setPassword('');
      onUpdate();

      toast.success("Password set", { description: "Users can now access the asset portal with this password" });
    } catch (error) {
      toast.error("Error", { description: "Failed to set password" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    setIsLoading(true);
    try {
      const newToken = generateToken();
      
      const { error } = await supabase
        .from('clients')
        .update({ asset_share_token: newToken })
        .eq('id', clientId);

      if (error) throw error;

      setToken(newToken);
      onUpdate();
      
      toast.success("New link generated", { description: "The old share link is now invalid" });
    } catch (error) {
      toast.error("Error", { description: "Failed to generate new link" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExpiration = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ 
          asset_share_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null 
        })
        .eq('id', clientId);

      if (error) throw error;

      onUpdate();
      
      toast.success("Expiration updated", {
        description: expiresAt
          ? `Link will expire on ${new Date(expiresAt).toLocaleDateString()}`
          : "Link will not expire"
      });
    } catch (error) {
      toast.error("Error", { description: "Failed to update expiration" });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Copied!", { description: "Share link copied to clipboard" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Asset Sharing Portal
        </CardTitle>
        <CardDescription>
          Allow clients to upload and view assets without logging in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="share-enabled">Enable sharing</Label>
            <p className="text-sm text-muted-foreground">
              Create a password-protected link to share
            </p>
          </div>
          <Switch
            id="share-enabled"
            checked={enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={isLoading}
          />
        </div>

        {enabled && (
          <>
            {/* Share URL */}
            {shareUrl && (
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleRegenerateToken}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="share-password">Set/Change Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="share-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button 
                  onClick={handleSetPassword} 
                  disabled={isLoading || !password}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Set'
                  )}
                </Button>
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label htmlFor="share-expires">Expiration Date (optional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="share-expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={handleUpdateExpiration} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
