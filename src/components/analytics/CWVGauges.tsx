import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CWVData {
  lcp: number;
  cls: number;
  inp: number;
  fcp: number;
  ttfb: number;
  sampleCount: number;
}

interface CWVGaugesProps {
  data: CWVData | null | undefined;
  isLoading: boolean;
}

interface MetricConfig {
  label: string;
  key: keyof Omit<CWVData, 'sampleCount'>;
  unit: string;
  good: number;
  poor: number;
  description: string;
}

const metrics: MetricConfig[] = [
  { label: 'LCP', key: 'lcp', unit: 'ms', good: 2500, poor: 4000, description: 'Largest Contentful Paint' },
  { label: 'CLS', key: 'cls', unit: '', good: 0.1, poor: 0.25, description: 'Cumulative Layout Shift' },
  { label: 'INP', key: 'inp', unit: 'ms', good: 200, poor: 500, description: 'Interaction to Next Paint' },
  { label: 'FCP', key: 'fcp', unit: 'ms', good: 1800, poor: 3000, description: 'First Contentful Paint' },
  { label: 'TTFB', key: 'ttfb', unit: 'ms', good: 800, poor: 1800, description: 'Time to First Byte' },
];

function getStatus(value: number, good: number, poor: number) {
  if (value <= good) return { label: 'Good', variant: 'default' as const, color: 'text-green-600' };
  if (value <= poor) return { label: 'Needs Improvement', variant: 'secondary' as const, color: 'text-yellow-600' };
  return { label: 'Poor', variant: 'destructive' as const, color: 'text-red-600' };
}

function formatValue(value: number, unit: string) {
  if (unit === 'ms') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
  }
  return value.toFixed(3);
}

export function CWVGauges({ data, isLoading }: CWVGaugesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core Web Vitals (Field Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
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
          <CardTitle className="text-base">Core Web Vitals (Field Data)</CardTitle>
          <CardDescription>No CWV data collected yet. Data appears after the v2 tracker is installed.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Core Web Vitals (Field Data)</CardTitle>
        <CardDescription>p75 values from {data.sampleCount} real user samples (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map(metric => {
            const value = data[metric.key];
            const status = getStatus(value, metric.good, metric.poor);
            return (
              <div key={metric.key} className="border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{metric.description}</p>
                <p className={`text-2xl font-bold ${status.color}`}>
                  {formatValue(value, metric.unit)}
                </p>
                <Badge variant={status.variant} className="mt-2 text-xs">
                  {status.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
