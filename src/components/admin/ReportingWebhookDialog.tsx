import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, EyeOff, Loader2, Webhook } from "lucide-react";

interface ReportingConfig {
  base_url: string;
  webhook_secret: string;
  client: {
    id: string;
    name: string;
    slug: string;
    site_id: string | null;
  };
}

interface ReportingWebhookDialogProps {
  client: {
    id: string;
    name: string;
  };
}

function CopyBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied", { description: label });
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={copy}>
          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
        </Button>
      </div>
      <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{value}</pre>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ReportingWebhookDialog({ client }: ReportingWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ReportingConfig | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (open && !config) loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reporting-config", {
        body: { client_id: client.id },
      });
      if (error) throw error;
      setConfig(data as ReportingConfig);
    } catch (error: any) {
      toast.error("Failed to load webhook config", {
        description: error?.message || "Unexpected error",
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const leadPayload = (slug: string) =>
    JSON.stringify(
      {
        client: slug,
        source: "zapier",
        channel: "Google Ads",
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "555-123-4567",
        message: "Looking for a quote",
      },
      null,
      2,
    );

  const lovablePrompt = (cfg: ReportingConfig) =>
    `When a visitor submits the lead form, send the lead to our reporting API.

IMPORTANT: make this request from a backend edge function, never from the
browser. Store the API key as a backend secret named SPEARLANCE_WEBHOOK_KEY —
do not put it in frontend code or environment variables exposed to the client.

POST ${cfg.base_url}/ingest-lead
Headers:
  x-spearlance-key: <SPEARLANCE_WEBHOOK_KEY secret>
  Content-Type: application/json
Body (JSON):
  {
    "client": "${cfg.client.slug}",
    "source": "lovable_lp",
    "channel": "<marketing channel, e.g. Google Ads — or omit and include
                 utm_source/utm_medium/gclid from the page URL instead>",
    "name": "<form name field>",
    "email": "<form email field>",
    "phone": "<form phone field>",
    "message": "<form message field>",
    "landing_url": "<full page URL including query string>"
  }
The endpoint responds { ok: true, lead_id, action }. Treat non-200 as failure
and still show the visitor a success state (queue and retry server-side).`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          title="Reporting webhook config"
        >
          <Webhook className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" /> Reporting webhook — {client.name}
          </DialogTitle>
          <DialogDescription>
            Copy-paste config for wiring Zapier, Lovable, CallRail, or any webhook-capable tool
            into the reporting layer for this client. One shared endpoint serves every client —
            the <code>client</code> field in the payload routes the data.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {config && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">client: {config.client.slug}</Badge>
              {config.client.site_id && <Badge variant="outline">site_id: {config.client.site_id}</Badge>}
              <Badge variant="outline">uuid: {config.client.id}</Badge>
            </div>

            <CopyBlock
              label="Lead webhook URL (Zapier · CallRail · Lovable)"
              value={`${config.base_url}/ingest-lead`}
              hint="POST JSON. Also available: /ingest-metric (daily aggregates) and /hubspot-status (lifecycle changes)."
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Auth header (all endpoints)
                </span>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(config.webhook_secret);
                      toast.success("Copied", { description: "Webhook secret" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy secret
                  </Button>
                </div>
              </div>
              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto break-all">
                x-spearlance-key: {showSecret ? config.webhook_secret : "••••••••••••••••••••••••"}
              </pre>
              <p className="text-xs text-muted-foreground">
                Server-side use only. In Zapier this goes in the Webhooks action's Headers section.
              </p>
            </div>

            <Separator />

            <CopyBlock
              label="Sample lead payload (Zapier body)"
              value={leadPayload(config.client.slug)}
              hint={`"channel" is the marketing channel reports group by ("Google Ads", "Facebook Ads", "Email", ...) — set it per zap. Omit it and pass utm_source/utm_medium/gclid to auto-derive. Add "source_ref" (e.g. the CallRail call id) to make retries idempotent.`}
            />

            <CopyBlock
              label="Lovable prompt (builds the form integration server-side)"
              value={lovablePrompt(config)}
              hint="Paste into Lovable, then add the secret in Lovable Cloud as a backend secret named SPEARLANCE_WEBHOOK_KEY. Lovable Cloud sends server-to-server, so the key is never exposed in the browser."
            />

            <Separator />

            <CopyBlock
              label="Report endpoint (dashboards read this)"
              value={`${config.base_url}/report?client=${config.client.slug}&from=2026-01-01&to=2026-12-31`}
              hint="GET with the same x-spearlance-key header. Returns funnel, daily series, channel + source breakdowns, MQL→SQL conversion, and metrics in one JSON object."
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
