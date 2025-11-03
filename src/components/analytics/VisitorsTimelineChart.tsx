import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface TimelineData {
  day: string;
  visitors: number;
  pageviews: number;
}

interface VisitorsTimelineChartProps {
  data?: TimelineData[];
  isLoading?: boolean;
}

export function VisitorsTimelineChart({ data, isLoading }: VisitorsTimelineChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitor Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitor Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">No visitor data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    displayDate: format(new Date(d.day), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor Trends</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="displayDate" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="visitors" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
              name="Visitors"
            />
            <Line 
              type="monotone" 
              dataKey="pageviews" 
              stroke="hsl(142, 70%, 60%)" 
              strokeWidth={2}
              dot={{ fill: 'hsl(142, 70%, 60%)' }}
              name="Pageviews"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
