import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MousePointerClick, ArrowLeft, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClarityBehavioralCardProps {
  data?: {
    rageClicks: number;
    deadClicks: number;
    quickBacks: number;
    jsErrors: number;
    rageClickRate: number;
    deadClickRate: number;
    quickBackRate: number;
    totalSessions: number;
  } | null;
  isLoading?: boolean;
}

function getSeverity(rate: number): 'low' | 'medium' | 'high' {
  if (rate < 5) return 'low';
  if (rate < 15) return 'medium';
  return 'high';
}

function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const variants: Record<string, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Badge className={variants[severity]} variant="secondary">
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

export function ClarityBehavioralCard({ data, isLoading }: ClarityBehavioralCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Insights</CardTitle>
          <CardDescription>User frustration and engagement signals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Insights</CardTitle>
          <CardDescription>User frustration and engagement signals</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          No behavioral data available
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Rage Clicks',
      description: 'Rapid repeated clicks indicating frustration',
      count: data.rageClicks,
      rate: data.rageClickRate,
      icon: MousePointerClick,
      color: 'text-red-500',
    },
    {
      label: 'Dead Clicks',
      description: 'Clicks on non-interactive elements',
      count: data.deadClicks,
      rate: data.deadClickRate,
      icon: MousePointerClick,
      color: 'text-orange-500',
    },
    {
      label: 'Quick-backs',
      description: 'Users quickly returning to previous page',
      count: data.quickBacks,
      rate: data.quickBackRate,
      icon: ArrowLeft,
      color: 'text-yellow-500',
    },
    {
      label: 'JS Errors',
      description: 'JavaScript errors encountered by users',
      count: data.jsErrors,
      rate: data.totalSessions > 0 ? Math.round((data.jsErrors / data.totalSessions) * 100 * 10) / 10 : 0,
      icon: Bug,
      color: 'text-purple-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Behavioral Insights
        </CardTitle>
        <CardDescription>
          User frustration signals from {data.totalSessions.toLocaleString()} sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30"
            >
              <metric.icon className={`h-5 w-5 mt-0.5 ${metric.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{metric.label}</span>
                  <SeverityBadge severity={getSeverity(metric.rate)} />
                </div>
                <p className="text-2xl font-bold">{metric.count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.rate}% of sessions • {metric.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
