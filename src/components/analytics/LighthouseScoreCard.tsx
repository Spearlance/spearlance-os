import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface LighthouseAudit {
  id: string;
  strategy: string;
  performance_score: number;
  lcp_ms: number;
  cls: number;
  fcp_ms: number;
  ttfb_ms: number;
  tbt_ms: number;
  si_ms: number;
  created_at: string;
  audit_data: {
    opportunities?: Array<{
      id: string;
      title: string;
      description: string;
      savings_ms: number;
    }>;
  } | null;
}

interface LighthouseScoreCardProps {
  audits: LighthouseAudit[];
  isLoading: boolean;
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBadge(score: number) {
  if (score >= 90) return 'default' as const;
  if (score >= 50) return 'secondary' as const;
  return 'destructive' as const;
}

export function LighthouseScoreCard({ audits, isLoading }: LighthouseScoreCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lighthouse Scores (Lab Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lighthouse Scores (Lab Data)</CardTitle>
          <CardDescription>No audits yet. Run one from Settings or wait for the weekly Sunday audit.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get latest mobile and desktop audits
  const latestMobile = audits.find(a => a.strategy === 'mobile');
  const latestDesktop = audits.find(a => a.strategy === 'desktop');

  const renderScore = (audit: LighthouseAudit | undefined, label: string) => {
    if (!audit) return (
      <div className="border rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-muted-foreground mt-2">No data</p>
      </div>
    );

    const opportunities = audit.audit_data?.opportunities || [];

    return (
      <div className="border rounded-lg p-4">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-4xl font-bold mt-1 ${getScoreColor(audit.performance_score)}`}>
            {audit.performance_score}
          </p>
          <Badge variant={getScoreBadge(audit.performance_score)} className="mt-1">
            {audit.performance_score >= 90 ? 'Good' : audit.performance_score >= 50 ? 'Needs Work' : 'Poor'}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
          </p>
        </div>
        {opportunities.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="text-xs font-medium mb-2">Top Opportunities</p>
            <div className="space-y-1">
              {opportunities.slice(0, 5).map((opp) => (
                <div key={opp.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate mr-2">{opp.title}</span>
                  <span className="text-orange-600 whitespace-nowrap">-{Math.round(opp.savings_ms)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lighthouse Scores (Lab Data)</CardTitle>
        <CardDescription>Latest PageSpeed Insights audit results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderScore(latestMobile, 'Mobile')}
          {renderScore(latestDesktop, 'Desktop')}
        </div>
      </CardContent>
    </Card>
  );
}
