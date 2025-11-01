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

    // Inline the entire tracking script to avoid external file loading issues
    const baseCode = `<script>
console.log('[SOS] Initializing analytics...');
(function(){if(window.sos)return;var e={version:"1.0.0",collectorUrl:"${collectorUrl}",workspaceKey:"${workspaceKey}",enablePopupConsent:!1,policyUrl:"/privacy",autoTrackPageViews:!0,autoTrackScroll:!0,autoTrackEngagement:!0},t=null,n=null,o=!1,r=[],i={},c=null,a=0,s=null;function l(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=16*Math.random()|0;return("x"===e?t:3&t|8).toString(16)})}function u(e){try{return localStorage.getItem(e)}catch(e){return null}}function d(e,t){try{localStorage.setItem(e,t)}catch(e){}}function f(){return"true"===u("sos_optout")}function g(){var t=new URLSearchParams(window.location.search);return{utm_source:t.get("utm_source"),utm_medium:t.get("utm_medium"),utm_campaign:t.get("utm_campaign"),utm_term:t.get("utm_term"),utm_content:t.get("utm_content")}}function m(e){if(!e||""===e||-1!==e.indexOf(window.location.hostname))return{source:"direct",medium:"none"};try{var t=new URL(e).hostname.toLowerCase();return t.includes("google")?{source:"google",medium:"organic"}:t.includes("bing")?{source:"bing",medium:"organic"}:t.includes("duckduckgo")?{source:"duckduckgo",medium:"organic"}:t.includes("brave")?{source:"brave",medium:"organic"}:t.includes("yahoo")?{source:"yahoo",medium:"organic"}:t.includes("chatgpt")||t.includes("openai")?{source:"chatgpt",medium:"referral"}:t.includes("claude")||t.includes("anthropic")?{source:"claude",medium:"referral"}:t.includes("facebook")||t.includes("fb.com")?{source:"facebook",medium:"social"}:t.includes("twitter")||t.includes("t.co")?{source:"twitter",medium:"social"}:t.includes("linkedin")?{source:"linkedin",medium:"social"}:t.includes("instagram")?{source:"instagram",medium:"social"}:t.includes("youtube")?{source:"youtube",medium:"social"}:t.includes("tiktok")?{source:"tiktok",medium:"social"}:t.includes("pinterest")?{source:"pinterest",medium:"social"}:{source:t.replace("www.",""),medium:"referral"}}catch(e){return{source:"direct",medium:"none"}}}function p(r){if(e.collectorUrl&&e.workspaceKey&&(o&&!f())){var i=JSON.stringify(Object.assign({workspaceKey:e.workspaceKey,ts:Date.now(),sid:t,uid:n},r));try{if(navigator.sendBeacon){var c=new Blob([i],{type:"application/json"});navigator.sendBeacon(e.collectorUrl,c)}else fetch(e.collectorUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:i,keepalive:!0}).catch(function(){})}catch(e){}}}function v(){try{var e=null===s;e&&(s=window.location.pathname,sessionStorage.setItem("sos_first_path",s));var t=g(),n=m(document.referrer);p(Object.assign({type:"page_view",url:window.location.href,path:window.location.pathname,title:document.title,referrer:document.referrer,source:n.source,medium:n.medium},t,{entry:e,userAgent:navigator.userAgent.substring(0,200)})),i={}}catch(e){}}function h(){try{var e=Math.round(100*(window.scrollY+window.innerHeight)/document.body.scrollHeight);[25,50,75,100].forEach(function(t){e>=t&&!i[t]&&(i[t]=!0,p({type:"scroll_depth",path:window.location.pathname,value:t}))})}catch(e){}}function w(){try{null!==c&&(a+=Date.now()-c),c=Date.now(),a>=15e3&&(p({type:"engaged_time",path:window.location.pathname,value:Math.round(a/1e3)}),a=0)}catch(e){}}window.sos={version:e.version,init:function(o){try{e.collectorUrl=o.collectorUrl,e.workspaceKey=o.workspaceKey,e.enablePopupConsent=o.enablePopupConsent||!1,e.policyUrl=o.policyUrl||"/privacy",t=u("sos_sid")||l(),d("sos_sid",t),n=u("sos_uid");var r=u("sos_consent");"granted"===r&&(o=!0);try{s=sessionStorage.getItem("sos_first_path")}catch(e){}e.enablePopupConsent&&!r&&!f()?window.sos._showConsentPopup():o&&window.sos._startTracking()}catch(e){}},consent:function(e){try{"granted"===e?(o=!0,d("sos_consent","granted"),window.sos._startTracking()):"denied"===e&&(o=!1,d("sos_consent","denied"))}catch(e){}},identify:function(e){try{n=e,d("sos_uid",e)}catch(e){}},page:function(){v()},track:function(e){try{p(e)}catch(e){}},_startTracking:function(){e.autoTrackPageViews&&v(),e.autoTrackScroll&&window.addEventListener("scroll",function e(){clearTimeout(e.timeout),e.timeout=setTimeout(h,200)},{passive:!0}),e.autoTrackEngagement&&(c=Date.now(),window.addEventListener("mousemove",function e(){clearTimeout(e.timeout),e.timeout=setTimeout(w,500)},{passive:!0}),window.addEventListener("keydown",function e(){clearTimeout(e.timeout),e.timeout=setTimeout(w,500)},{passive:!0}),window.addEventListener("touchstart",function e(){clearTimeout(e.timeout),e.timeout=setTimeout(w,500)},{passive:!0}),window.addEventListener("click",function e(){clearTimeout(e.timeout),e.timeout=setTimeout(w,500)},{passive:!0}),window.addEventListener("blur",function(){null!==c&&(a+=Date.now()-c,c=null)}),window.addEventListener("focus",function(){c=Date.now()}));var t=history.pushState;history.pushState=function(){t.apply(history,arguments),setTimeout(v,100)},window.addEventListener("popstate",function(){setTimeout(v,100)})},_showConsentPopup:function(){try{var t=document.createElement("div");t.id="sos-consent-popup",t.style.cssText="position:fixed;bottom:20px;left:20px;right:20px;max-width:500px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,\\"Segoe UI\\",sans-serif;font-size:14px;line-height:1.5;",t.setAttribute("role","dialog"),t.setAttribute("aria-labelledby","sos-consent-title"),t.setAttribute("aria-modal","true"),t.innerHTML='<div id="sos-consent-title" style="font-weight:600;margin-bottom:8px;color:#111;">Cookie Consent</div><p style="margin:0 0 12px;color:#555;">We use cookies to understand how you use our site and improve your experience. <a href="'+e.policyUrl+'" style="color:#0066cc;text-decoration:underline;" target="_blank" rel="noopener">Learn more</a></p><div style="display:flex;gap:8px;"><button id="sos-accept" style="flex:1;background:#0066cc;color:#fff;border:none;border-radius:4px;padding:10px 16px;cursor:pointer;font-weight:500;font-size:14px;">Accept</button><button id="sos-decline" style="flex:1;background:#f0f0f0;color:#333;border:1px solid #ddd;border-radius:4px;padding:10px 16px;cursor:pointer;font-weight:500;font-size:14px;">Decline</button></div>',document.body.appendChild(t),document.getElementById("sos-accept").onclick=function(){window.sos.consent("granted"),t.remove()},document.getElementById("sos-decline").onclick=function(){window.sos.consent("denied"),t.remove()},document.getElementById("sos-accept").focus(),document.addEventListener("keydown",function e(n){"Escape"===n.key&&(window.sos.consent("denied"),t.remove(),document.removeEventListener("keydown",e))})}catch(e){}}},console.log('[SOS] Analytics ready, auto-starting...'),window.sos.consent('granted')})();
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
