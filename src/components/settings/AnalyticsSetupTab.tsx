import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Eye, EyeOff, RefreshCw, CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface AnalyticsSetupTabProps {
  client: {
    id: string;
    name: string;
    website_unlocked?: boolean;
    website_url?: string | null;
  };
}

export function AnalyticsSetupTab({ client }: AnalyticsSetupTabProps) {
  const [workspaceKey, setWorkspaceKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentClientId, setCurrentClientId] = useState<string>(client.id);
  const [websiteUrl, setWebsiteUrl] = useState<string>(client.website_url || '');
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
  const [measurementId, setMeasurementId] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [ga4Loading, setGa4Loading] = useState(false);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);

  useEffect(() => {
    // Only reload if client actually changed
    if (client.id !== currentClientId) {
      setCurrentClientId(client.id);
      // Clear old data immediately
      setWorkspaceKey(null);
      setLastEventAt(null);
      setIsActive(false);
      setWebsiteUrl(client.website_url || '');
      
      // Load new client's data
      loadWorkspaceKey();
      checkConnectionStatus();
      loadGA4Config();
    }
  }, [client.id, currentClientId]);

  const loadWorkspaceKey = async () => {
    if (!client?.id) return;

    const { data, error } = await supabase
      .from('analytics_workspace_keys')
      .select('workspace_key')
      .eq('client_id', client.id)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error loading workspace key:', error);
    } else if (data) {
      setWorkspaceKey(data.workspace_key);
    }
  };

  const checkConnectionStatus = async () => {
    if (!client?.id) return;

    const { data, error } = await supabase
      .from('web_events')
      .select('received_at')
      .eq('client_id', client.id)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking status:', error);
    } else if (data) {
      const eventDate = new Date(data.received_at);
      setLastEventAt(eventDate);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setIsActive(eventDate > twentyFourHoursAgo);
    }
  };

  const updateWebsiteUrl = async () => {
    if (!client?.id || !websiteUrl.trim()) {
      toast.error("Error", { description: "Please enter a valid website URL" });
      return;
    }

    setIsUpdatingUrl(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ website_url: websiteUrl.trim() })
        .eq('id', client.id);

      if (error) throw error;

      toast.success("Website URL Saved", { description: "You can now generate a workspace key" });

      // Update local client object
      client.website_url = websiteUrl.trim();
    } catch (error) {
      toast.error("Error", { description: "Failed to save website URL" });
    } finally {
      setIsUpdatingUrl(false);
    }
  };

  const generateWorkspaceKey = async () => {
    if (!client?.id) {
      toast.error("Error", { description: "No client selected" });
      return;
    }

    if (!client.website_url) {
      toast.error("Error", { description: "Please add a website URL first" });
      return;
    }

    setLoading(true);
    try {
      const newKey = `wsk_${crypto.randomUUID().replace(/-/g, '')}`;

      // Deactivate any existing keys
      await supabase
        .from('analytics_workspace_keys')
        .update({ active: false })
        .eq('client_id', client.id);

      // Create new key
      const { error } = await supabase
        .from('analytics_workspace_keys')
        .insert({
          client_id: client.id,
          workspace_key: newKey,
          active: true,
        });

      if (error) throw error;

      setWorkspaceKey(newKey);
      setShowConfirmDialog(false);
      toast.success("Workspace Key Generated", { description: "Your analytics tracking key has been created" });
    } catch (error) {
      toast.error("Error", { description: "Failed to generate workspace key" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${'•'.repeat(key.length - 8)}`;
  };

  const getInstallationCode = () => {
    if (!workspaceKey) return '';
    const trackerUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sos-tracker?k=${workspaceKey}`;
    return `<!-- SpearlanceOS Analytics v2 -->\n<script async src="${trackerUrl}"></script>`;
  };

  const loadGA4Config = async () => {
    if (!client?.id) return;
    const { data } = await supabase
      .from('ga4_configs')
      .select('measurement_id, api_secret, is_active')
      .eq('client_id', client.id)
      .maybeSingle();
    if (data) {
      setMeasurementId(data.measurement_id || '');
      setApiSecret(data.api_secret || '');
      setGa4Connected(data.is_active || false);
    }
  };

  const saveGA4Config = async () => {
    if (!client?.id || !measurementId.trim() || !apiSecret.trim()) {
      toast.error("Error", { description: "Please enter both Measurement ID and API Secret" });
      return;
    }
    setGa4Loading(true);
    try {
      const { error } = await supabase
        .from('ga4_configs')
        .upsert({
          client_id: client.id,
          measurement_id: measurementId.trim(),
          api_secret: apiSecret.trim(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });
      if (error) throw error;
      setGa4Connected(true);
      toast.success("GA4 Config Saved", { description: "Page views will now be forwarded to GA4 server-side" });
    } catch (error) {
      toast.error("Error", { description: "Failed to save GA4 configuration" });
    } finally {
      setGa4Loading(false);
    }
  };

  const runLighthouseAudit = async () => {
    if (!client?.id) return;
    setAuditRunning(true);
    try {
      const { error } = await supabase.functions.invoke('lighthouse-audit', {
        body: { client_id: client.id },
      });
      if (error) throw error;
      toast.success("Lighthouse Audit Complete", { description: "Results are available on the Analytics page" });
    } catch (error) {
      toast.error("Error", { description: "Failed to run Lighthouse audit" });
    } finally {
      setAuditRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {!client.website_url && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Website URL Required</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              A website URL is required to validate analytics events and prevent unauthorized tracking.
              Please enter the website URL below before generating a workspace key.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="website-url">Website URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="website-url"
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    disabled={isUpdatingUrl}
                  />
                  <Button 
                    onClick={updateWebsiteUrl} 
                    disabled={isUpdatingUrl || !websiteUrl.trim()}
                  >
                    {isUpdatingUrl ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This URL will be used to validate incoming analytics events
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Analytics Tracking Setup</CardTitle>
          <CardDescription>
            Generate a workspace key to start tracking website visitors
            <div className="mt-2">
              <Badge variant="outline" className="font-semibold">
                Client: {client.name}
              </Badge>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {workspaceKey ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Workspace Key</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      readOnly
                      value={showKey ? workspaceKey : maskKey(workspaceKey)}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(workspaceKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Connection Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {isActive ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <Badge variant="default">Active</Badge>
                        {lastEventAt && (
                          <span className="text-sm text-muted-foreground">
                            Last event {formatDistanceToNow(lastEventAt, { addSuffix: true })}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary">Inactive</Badge>
                        {lastEventAt && (
                          <span className="text-sm text-muted-foreground">
                            Last event {formatDistanceToNow(lastEventAt, { addSuffix: true })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Installation Instructions</CardTitle>
                  <CardDescription>
                    Add this script tag to your site's &lt;head&gt;. Works on any platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    <code>{getInstallationCode()}</code>
                  </pre>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getInstallationCode())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Installation Code
                  </Button>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={checkConnectionStatus}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={loading}
                >
                  Regenerate Key
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No workspace key has been generated yet
              </p>
              <Button 
                onClick={() => setShowConfirmDialog(true)} 
                disabled={loading || !client.website_url}
              >
                Generate Workspace Key
              </Button>
              {!client.website_url && (
                <p className="text-xs text-muted-foreground mt-2">
                  Please add a website URL above to generate a key
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google Analytics (GA4) Integration</CardTitle>
          <CardDescription>
            Connect GA4 to receive page view data server-side via Measurement Protocol.
            No gtag.js needed on client sites.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ga4Connected && (
            <Badge variant="default" className="mb-2">Connected</Badge>
          )}
          <div>
            <Label>Measurement ID</Label>
            <Input
              placeholder="G-XXXXXXXXXX"
              value={measurementId}
              onChange={(e) => setMeasurementId(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>API Secret</Label>
            <Input
              type="password"
              placeholder="API secret from GA4 Admin"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={saveGA4Config} disabled={ga4Loading}>
            {ga4Loading ? "Saving..." : "Save GA4 Config"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lighthouse Performance Audits</CardTitle>
          <CardDescription>
            Weekly automated audits run every Sunday. You can also run one now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runLighthouseAudit} disabled={auditRunning}>
            {auditRunning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
            ) : (
              'Run Audit Now'
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Workspace Key?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to generate a new analytics workspace key for:
              <div className="mt-3 p-3 bg-muted rounded-md">
                <strong>{client.name}</strong>
              </div>
              {workspaceKey && (
                <div className="mt-2 text-destructive font-semibold">
                  Warning: This will deactivate any existing keys and break current installations.
                </div>
              )}
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generateWorkspaceKey} disabled={loading}>
              {loading ? "Generating..." : "Yes, Generate Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
