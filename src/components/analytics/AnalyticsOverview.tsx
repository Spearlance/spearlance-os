import { Card, CardContent } from "@/components/ui/card";
import { Users, Eye, MousePointerClick, Clock, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
  };
  format?: 'number' | 'time';
}

function MetricCard({ title, value, icon, trend, format = 'number' }: MetricCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (format === 'time') {
      const minutes = Math.floor(val / 60);
      const seconds = val % 60;
      return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }
    return val.toLocaleString();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold">{formatValue(value)}</div>
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : null}
              <span className={trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-destructive' : 'text-muted-foreground'}>
                {trend.value}%
              </span>
              <span className="text-muted-foreground">vs previous period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AnalyticsOverviewProps {
  data?: {
    uniqueVisitors: number;
    pageviews: number;
    leadSubmissions: number;
    avgEngagedTime: number;
    avgPagesPerSession: number;
  };
  isLoading?: boolean;
  comparisonData?: {
    uniqueVisitors: number;
    pageviews: number;
    leadSubmissions: number;
    avgEngagedTime: number;
    avgPagesPerSession: number;
  };
}

export function AnalyticsOverview({ data, isLoading, comparisonData }: AnalyticsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || !comparisonData) return undefined;
    if (previous === 0) return current > 0 ? { direction: 'up' as const, value: 100 } : undefined;
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
      value: Math.round(Math.abs(change)),
    };
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Unique Visitors"
        value={data.uniqueVisitors}
        icon={<Users className="h-4 w-4" />}
        trend={calculateTrend(data.uniqueVisitors, comparisonData?.uniqueVisitors)}
      />
      <MetricCard
        title="Total Pageviews"
        value={data.pageviews}
        icon={<Eye className="h-4 w-4" />}
        trend={calculateTrend(data.pageviews, comparisonData?.pageviews)}
      />
      <MetricCard
        title="Avg. Session Duration"
        value={data.avgEngagedTime}
        icon={<Clock className="h-4 w-4" />}
        format="time"
        trend={calculateTrend(data.avgEngagedTime, comparisonData?.avgEngagedTime)}
      />
      <MetricCard
        title="Lead Submissions"
        value={data.leadSubmissions}
        icon={<FileText className="h-4 w-4" />}
        trend={calculateTrend(data.leadSubmissions, comparisonData?.leadSubmissions)}
      />
      <MetricCard
        title="Pages per Session"
        value={data.avgPagesPerSession}
        icon={<MousePointerClick className="h-4 w-4" />}
        trend={calculateTrend(data.avgPagesPerSession, comparisonData?.avgPagesPerSession)}
      />
    </div>
  );
}
