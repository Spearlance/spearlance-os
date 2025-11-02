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

    const collectorUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-collector`;

    const baseCode = `<script>
/**
 * SpearlanceOS Analytics Tracker (SOS) - Inline Version
 * Version 1.0.0
 */
(function() {
  'use strict';
  
  if (window.sos) {
    return;
  }
  
  const config = {
    version: '1.0.0',
    collectorUrl: '${collectorUrl}',
    workspaceKey: '${workspaceKey}',
    enablePopupConsent: false,
    policyUrl: '/privacy',
    autoTrackPageViews: true,
    autoTrackScroll: true,
    autoTrackEngagement: true
  };
  
  let sessionId = null;
  let userId = null;
  let consentGranted = false;
  let eventQueue = [];
  let scrollTracked = {};
  let engagedStart = null;
  let engagedTotal = 0;
  let sessionFirstPath = null;
  
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  function getStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  
  function setStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }
  
  function isOptedOut() {
    return getStorage('sos_optout') === 'true';
  }
  
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content')
    };
  }
  
  function classifyReferrer(ref) {
    if (!ref || ref === '' || ref.indexOf(window.location.hostname) !== -1) {
      return { source: 'direct', medium: 'none' };
    }
    
    try {
      const url = new URL(ref);
      const host = url.hostname.toLowerCase();
      
      if (host.includes('google')) return { source: 'google', medium: 'organic' };
      if (host.includes('bing')) return { source: 'bing', medium: 'organic' };
      if (host.includes('duckduckgo')) return { source: 'duckduckgo', medium: 'organic' };
      if (host.includes('brave')) return { source: 'brave', medium: 'organic' };
      if (host.includes('yahoo')) return { source: 'yahoo', medium: 'organic' };
      
      if (host.includes('chatgpt') || host.includes('openai')) {
        return { source: 'chatgpt', medium: 'referral' };
      }
      if (host.includes('claude') || host.includes('anthropic')) {
        return { source: 'claude', medium: 'referral' };
      }
      
      if (host.includes('facebook') || host.includes('fb.com')) return { source: 'facebook', medium: 'social' };
      if (host.includes('twitter') || host.includes('t.co')) return { source: 'twitter', medium: 'social' };
      if (host.includes('linkedin')) return { source: 'linkedin', medium: 'social' };
      if (host.includes('instagram')) return { source: 'instagram', medium: 'social' };
      if (host.includes('youtube')) return { source: 'youtube', medium: 'social' };
      if (host.includes('tiktok')) return { source: 'tiktok', medium: 'social' };
      if (host.includes('pinterest')) return { source: 'pinterest', medium: 'social' };
      
      return { source: host.replace('www.', ''), medium: 'referral' };
    } catch (e) {
      return { source: 'direct', medium: 'none' };
    }
  }
    
    function send(eventData) {
      if (!config.collectorUrl || !config.workspaceKey) {
      console.error('[SOS] Missing config - collectorUrl or workspaceKey');
      return;
    }
    
    if (!consentGranted || isOptedOut()) {
      return;
    }
    
    const payload = {
      workspaceKey: config.workspaceKey,
      ts: Date.now(),
      sid: sessionId,
      uid: userId,
      ...eventData
      };
    
      const data = JSON.stringify(payload);
      
      try {
        fetch(config.collectorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
          credentials: 'omit',
          mode: 'cors'
        }).catch(function(err) {
        console.error('[SOS] Fetch error:', err);
      });
    } catch (e) {
      console.error('[SOS] Send error:', e);
    }
    }
    
    function trackPageView() {
      try {
      const isEntry = sessionFirstPath === null;
      
      if (isEntry) {
        sessionFirstPath = window.location.pathname;
        try {
          sessionStorage.setItem('sos_first_path', sessionFirstPath);
        } catch (e) {}
      }
      
      const utm = getUTMParams();
      const ref = classifyReferrer(document.referrer);
      
      send({
        type: 'page_view',
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        source: ref.source,
        medium: ref.medium,
        ...utm,
        entry: isEntry,
        userAgent: navigator.userAgent.substring(0, 200)
      });
      
      scrollTracked = {};
    } catch (e) {
      console.error('[SOS] trackPageView error:', e);
    }
  }
  
  function trackScrollDepth() {
    try {
      const scrollPercentage = Math.round(
        (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100
      );
      
      [25, 50, 75, 100].forEach(function(threshold) {
        if (scrollPercentage >= threshold && !scrollTracked[threshold]) {
          scrollTracked[threshold] = true;
          send({
            type: 'scroll_depth',
            path: window.location.pathname,
            value: threshold
          });
        }
      });
    } catch (e) {}
  }
  
  function trackEngagedTime() {
    try {
      if (engagedStart !== null) {
        engagedTotal += Date.now() - engagedStart;
      }
      engagedStart = Date.now();
      
      if (engagedTotal >= 15000) {
        const seconds = Math.round(engagedTotal / 1000);
        send({
          type: 'engaged_time',
          path: window.location.pathname,
          value: seconds
        });
        engagedTotal = 0;
      }
    } catch (e) {}
  }
  
  window.sos = {
    version: config.version,
    
    init: function(opts) {
    },
    
    consent: function(state) {
      try {
        if (state === 'granted') {
          consentGranted = true;
          setStorage('sos_consent', 'granted');
          window.sos._startTracking();
        } else if (state === 'denied') {
          consentGranted = false;
          setStorage('sos_consent', 'denied');
        }
      } catch (e) {}
    },
    
    identify: function(id) {
      try {
        userId = id;
        setStorage('sos_uid', id);
      } catch (e) {}
    },
    
    page: function() {
      trackPageView();
    },
    
    track: function(evt) {
      try {
        send(evt);
      } catch (e) {}
    },
    
    _startTracking: function() {
      if (config.autoTrackPageViews) {
        trackPageView();
      }
      
      if (config.autoTrackScroll) {
        let scrollTimeout;
        window.addEventListener('scroll', function() {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(trackScrollDepth, 200);
        }, { passive: true });
      }
      
      if (config.autoTrackEngagement) {
        engagedStart = Date.now();
        
        let engageTimeout;
        function throttledEngage() {
          clearTimeout(engageTimeout);
          engageTimeout = setTimeout(trackEngagedTime, 500);
        }
        
        window.addEventListener('mousemove', throttledEngage, { passive: true });
        window.addEventListener('keydown', throttledEngage, { passive: true });
        window.addEventListener('touchstart', throttledEngage, { passive: true });
        window.addEventListener('click', throttledEngage, { passive: true });
        
        window.addEventListener('blur', function() {
          if (engagedStart !== null) {
            engagedTotal += Date.now() - engagedStart;
            engagedStart = null;
          }
        });
        window.addEventListener('focus', function() {
          engagedStart = Date.now();
        });
      }
      
      const pushState = history.pushState;
      history.pushState = function() {
        pushState.apply(history, arguments);
        setTimeout(trackPageView, 100);
      };
      
      window.addEventListener('popstate', function() {
        setTimeout(trackPageView, 100);
      });
    }
  };
  
  // Auto-initialize
  sessionId = getStorage('sos_sid') || generateId();
  setStorage('sos_sid', sessionId);
  userId = getStorage('sos_uid');
  
  const storedConsent = getStorage('sos_consent');
  if (storedConsent === 'granted') {
    consentGranted = true;
  }
  
  try {
    sessionFirstPath = sessionStorage.getItem('sos_first_path');
  } catch (e) {}
  
  window.sos.consent('granted');
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
            <div className="py-8 space-y-4">
              <p className="text-muted-foreground">
                No workspace key generated yet. Click below to create one.
              </p>
              <div className="flex justify-start">
                <Button onClick={generateWorkspaceKey} disabled={loading} size="default">
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Workspace Key'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
