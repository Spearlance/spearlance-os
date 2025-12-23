import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, Clock, Layers, ArrowDown } from "lucide-react";

interface ClarityOverviewProps {
  data?: {
    sessions: number;
    users: number;
    avgEngagementTime: number;
    avgPagesPerSession: number;
    avgScrollDepth: number;
  } | null;
  comparisonData?: {
    sessions: number;
    users: number;
    avgEngagementTime: number;
    avgPagesPerSession: number;
    avgScrollDepth: number;
  } | null;
  isLoading?: boolean;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return null;
  
  const isPositive = change > 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  
  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}

export function ClarityOverview({ data, comparisonData, isLoading }: ClarityOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Sessions',
      value: data?.sessions || 0,
      previous: comparisonData?.sessions,
      icon: Eye,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Users',
      value: data?.users || 0,
      previous: comparisonData?.users,
      icon: Users,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Avg. Engagement',
      value: data?.avgEngagementTime || 0,
      previous: comparisonData?.avgEngagementTime,
      icon: Clock,
      format: formatTime,
    },
    {
      label: 'Pages / Session',
      value: data?.avgPagesPerSession || 0,
      previous: comparisonData?.avgPagesPerSession,
      icon: Layers,
      format: (v: number) => v.toFixed(1),
    },
    {
      label: 'Scroll Depth',
      value: data?.avgScrollDepth || 0,
      previous: comparisonData?.avgScrollDepth,
      icon: ArrowDown,
      format: (v: number) => `${Math.round(v)}%`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const change = metric.previous !== undefined 
          ? calculateChange(metric.value, metric.previous) 
          : null;
        
        return (
          <Card key={metric.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <metric.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {metric.format(metric.value)}
                </span>
                <ChangeIndicator change={change} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
