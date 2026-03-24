import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface GA4StatusCardProps {
  clientId: string | undefined;
}

export function GA4StatusCard({ clientId }: GA4StatusCardProps) {
  const { data: ga4Config, isLoading: configLoading } = useQuery({
    queryKey: ['ga4-config', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('ga4_configs')
        .select('measurement_id, is_active, last_synced_at, updated_at')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: eventCount, isLoading: countLoading } = useQuery({
    queryKey: ['web-events-count', clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('web_events')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('received_at', thirtyDaysAgo);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!clientId,
  });

  const isLoading = configLoading || countLoading;
  const isConnected = ga4Config?.is_active;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GA4 Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">GA4 Integration</CardTitle>
        <CardDescription>
          Page view data is forwarded server-side via Measurement Protocol — no gtag.js needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Connected</p>
                <p className="text-sm text-muted-foreground">
                  Measurement ID: {ga4Config?.measurement_id}
                </p>
              </div>
              <Badge variant="default" className="ml-auto">Active</Badge>
            </>
          ) : (
            <>
              <Circle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Not Connected</p>
                <p className="text-sm text-muted-foreground">
                  Configure GA4 in Settings → Analytics Setup
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">Inactive</Badge>
            </>
          )}
        </div>

        {isConnected && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Events forwarded (30d)</span>
              <span className="font-medium">{eventCount?.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <a
                href={`https://analytics.google.com/analytics/web/#/p${ga4Config?.measurement_id?.replace('G-', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open GA4 Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
