import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ClaritySetupTabProps {
  client: {
    id: string;
    name: string;
  };
}

export function ClaritySetupTab({ client }: ClaritySetupTabProps) {
  const [projectId, setProjectId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [configExists, setConfigExists] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [client.id]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clarity_configs')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProjectId(data.project_id);
        setApiToken(data.api_token);
        setIsActive(data.is_active ?? false);
        setLastSyncedAt(data.last_synced_at ? new Date(data.last_synced_at) : null);
        setConfigExists(true);
      } else {
        // Reset state for new client
        setProjectId("");
        setApiToken("");
        setIsActive(false);
        setLastSyncedAt(null);
        setConfigExists(false);
      }
    } catch (error) {
      console.error('Error loading Clarity config:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!projectId.trim() || !apiToken.trim()) {
      toast.error("Missing credentials", { description: "Please enter both Project ID and API Token" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('clarity-test-connection', {
        body: { projectId: projectId.trim(), apiToken: apiToken.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast.success("Connection successful", { description: "Your Clarity credentials are valid" });
      } else {
        setTestResult('error');
        toast.error("Connection failed", { description: data?.error || "Could not connect to Microsoft Clarity" });
      }
    } catch (error: any) {
      setTestResult('error');
      toast.error("Connection failed", { description: error.message || "Could not verify credentials" });
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!projectId.trim() || !apiToken.trim()) {
      toast.error("Missing credentials", { description: "Please enter both Project ID and API Token" });
      return;
    }

    setSaving(true);
    try {
      if (configExists) {
        const { error } = await supabase
          .from('clarity_configs')
          .update({
            project_id: projectId.trim(),
            api_token: apiToken.trim(),
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', client.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clarity_configs')
          .insert({
            client_id: client.id,
            project_id: projectId.trim(),
            api_token: apiToken.trim(),
            is_active: isActive,
          });

        if (error) throw error;
        setConfigExists(true);
      }

      toast.success("Configuration saved", { description: "Microsoft Clarity settings have been updated" });
    } catch (error: any) {
      toast.error("Error saving configuration", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!configExists) {
      setIsActive(!isActive);
      return;
    }

    const newState = !isActive;
    setIsActive(newState);

    try {
      const { error } = await supabase
        .from('clarity_configs')
        .update({ is_active: newState, updated_at: new Date().toISOString() })
        .eq('client_id', client.id);

      if (error) throw error;

      toast.success(newState ? "Clarity enabled" : "Clarity disabled", {
        description: newState ? "Daily data sync is now active" : "Daily data sync has been paused",
      });
    } catch (error: any) {
      setIsActive(!newState); // Revert on error
      toast.error("Error updating status", { description: error.message });
    }
  };

  const syncNow = async () => {
    if (!configExists) {
      toast.error("No configuration", { description: "Please save your Clarity configuration first" });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clarity-sync-daily', {
        body: { client_id: client.id }
      });

      if (error) throw error;

      if (data?.success) {
        setLastSyncedAt(new Date());
        toast.success("Sync completed", {
          description: data.metricDate ? `Successfully synced metrics for ${data.metricDate}` : "Successfully synced Clarity metrics",
        });
      } else {
        toast.error("Sync failed", { description: data?.error || "Could not sync Clarity data" });
      }
    } catch (error: any) {
      toast.error("Sync failed", { description: error.message || "Could not sync Clarity data" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading Clarity configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Microsoft Clarity
              {configExists && isActive && (
                <Badge variant="default" className="bg-green-600">Active</Badge>
              )}
              {configExists && !isActive && (
                <Badge variant="secondary">Paused</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect to Microsoft Clarity to track user behavior and get weekly insights
            </CardDescription>
          </div>
          {configExists && (
            <div className="flex items-center gap-2">
              <Label htmlFor="clarity-active" className="text-sm text-muted-foreground">
                {isActive ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="clarity-active"
                checked={isActive}
                onCheckedChange={toggleActive}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project ID */}
        <div className="space-y-2">
          <Label htmlFor="clarity-project-id">Project ID</Label>
          <Input
            id="clarity-project-id"
            placeholder="e.g., abc123xyz"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Found in your Clarity dashboard under Settings → Overview
          </p>
        </div>

        {/* API Token */}
        <div className="space-y-2">
          <Label htmlFor="clarity-api-token">API Access Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="clarity-api-token"
                type={showToken ? "text" : "password"}
                placeholder="Enter your API token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate a token in Clarity: Settings → API Access → Generate Token
          </p>
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult === 'success' ? 'default' : 'destructive'}>
            <div className="flex items-center gap-2">
              {testResult === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult === 'success'
                  ? "Connection verified successfully"
                  : "Could not connect. Please check your credentials."}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Last Synced */}
        {lastSyncedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>Last synced: {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing || !projectId.trim() || !apiToken.trim()}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button onClick={saveConfig} disabled={saving || !projectId.trim() || !apiToken.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
          {configExists && (
            <Button
              variant="secondary"
              onClick={syncNow}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a
              href="https://clarity.microsoft.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Open Clarity
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        {/* Help Text */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>How to get your API credentials:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Log in to <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">clarity.microsoft.com</a></li>
              <li>Select your project</li>
              <li>Go to Settings → Overview to find your Project ID</li>
              <li>Go to Settings → API Access → Generate a new token</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Automation Info */}
        {configExists && isActive && (
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Automation schedule:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Daily sync runs at 6 AM UTC every day</li>
                <li>Weekly report generated every Friday at 7 AM UTC</li>
                <li>Reports appear in the Reports tab with AI-generated insights</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
