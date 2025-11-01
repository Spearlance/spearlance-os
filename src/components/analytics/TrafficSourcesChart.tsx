import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = {
  'google / organic': '#4285F4',
  'facebook / social': '#1877F2',
  'twitter / social': '#1DA1F2',
  'linkedin / social': '#0A66C2',
  'instagram / social': '#E4405F',
  'direct / none': '#9E9E9E',
  'other': '#E0E0E0',
};

interface TrafficSourcesChartProps {
  data?: Array<{ name: string; sessions: number }>;
  isLoading?: boolean;
}

export function TrafficSourcesChart({ data, isLoading }: TrafficSourcesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No traffic data available</p>
        </CardContent>
      </Card>
    );
  }

  // Take top 7 sources, group rest as "Other"
  const topSources = data.slice(0, 7);
  const otherSessions = data.slice(7).reduce((sum, item) => sum + item.sessions, 0);
  
  const chartData = [...topSources];
  if (otherSessions > 0) {
    chartData.push({ name: 'other', sessions: otherSessions });
  }

  const getColor = (name: string) => {
    const lowercaseName = name.toLowerCase();
    return COLORS[lowercaseName as keyof typeof COLORS] || 
           COLORS[lowercaseName.split(' / ')[0] as keyof typeof COLORS] || 
           '#9E9E9E';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="sessions"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} sessions`, 'Sessions']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
