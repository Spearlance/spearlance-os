import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Eye, EyeOff, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { formatDistanceToNow } from "date-fns";

export function AnalyticsSetupTab() {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const [workspaceKey, setWorkspaceKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadWorkspaceKey();
      checkConnectionStatus();
    }
  }, [selectedClient]);

  const loadWorkspaceKey = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from('analytics_workspace_keys')
      .select('workspace_key')
      .eq('client_id', selectedClient.id)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error loading workspace key:', error);
    } else if (data) {
      setWorkspaceKey(data.workspace_key);
    }
  };

  const checkConnectionStatus = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from('web_events')
      .select('received_at')
      .eq('client_id', selectedClient.id)
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

  const generateWorkspaceKey = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      const newKey = `wsk_${crypto.randomUUID().replace(/-/g, '')}`;

      // Deactivate any existing keys
      await supabase
        .from('analytics_workspace_keys')
        .update({ active: false })
        .eq('client_id', selectedClient.id);

      // Create new key
      const { error } = await supabase
        .from('analytics_workspace_keys')
        .insert({
          client_id: selectedClient.id,
          workspace_key: newKey,
          active: true,
        });

      if (error) throw error;

      setWorkspaceKey(newKey);
      toast({
        title: "Workspace Key Generated",
        description: "Your analytics tracking key has been created",
      });
    } catch (error) {
      console.error('Error generating key:', error);
      toast({
        title: "Error",
        description: "Failed to generate workspace key",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${'•'.repeat(key.length - 8)}`;
  };

  const getInstallationCode = (platform: string) => {
    if (!workspaceKey) return '';

    const baseCode = `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${window.location.origin}/sos.js';
  script.async = true;
  script.onload = function() {
    if (window.sos) {
      sos.init('${workspaceKey}');
    }
  };
  document.head.appendChild(script);
})();
</script>`;

    if (platform === 'duda') {
      return `<!-- Add this to Site-Wide HTML (Site Settings → Custom Code → Head) -->\n${baseCode}`;
    } else if (platform === 'wordpress') {
      return `<!-- Add this to Theme Header (Appearance → Theme Editor → header.php, before </head>) -->\n<?php\nif (!is_admin()) {\n  echo '${baseCode.replace(/'/g, "\\'")}';
}\n?>`;
    }
    return `<!-- Add this before the closing </head> tag -->\n${baseCode}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Tracking Setup</CardTitle>
          <CardDescription>
            Generate a workspace key to start tracking website visitors
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
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="duda">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="duda">Duda</TabsTrigger>
                      <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                      <TabsTrigger value="html">Generic HTML</TabsTrigger>
                    </TabsList>
                    {['duda', 'wordpress', 'html'].map((platform) => (
                      <TabsContent key={platform} value={platform} className="space-y-3">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                          <code>{getInstallationCode(platform)}</code>
                        </pre>
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(getInstallationCode(platform))}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Installation Code
                        </Button>
                      </TabsContent>
                    ))}
                  </Tabs>
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
                  onClick={() => {
                    if (confirm('Regenerating the key will break existing installations. Continue?')) {
                      generateWorkspaceKey();
                    }
                  }}
                >
                  Regenerate Key
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">
                No workspace key generated yet. Click below to create one.
              </p>
              <Button onClick={generateWorkspaceKey} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Workspace Key'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
