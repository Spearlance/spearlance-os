import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  google: '#4285F4',
  direct: '#34A853',
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  bing: '#008373',
  yahoo: '#6001D2',
  referral: '#FF6B6B',
  organic: '#10B981',
  email: '#F59E0B',
  other: '#6B7280',
};

interface ClaritySourcesChartProps {
  data?: Array<{ name: string; sessions: number; users: number }>;
  isLoading?: boolean;
}

function getColor(sourceName: string): string {
  const lowerName = sourceName.toLowerCase();
  for (const [key, color] of Object.entries(COLORS)) {
    if (lowerName.includes(key)) return color;
  }
  return COLORS.other;
}

export function ClaritySourcesChart({ data, isLoading }: ClaritySourcesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No traffic data available
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data - top 7 + others
  const sortedData = [...data].sort((a, b) => b.sessions - a.sessions);
  const topSources = sortedData.slice(0, 7);
  const otherSources = sortedData.slice(7);

  const chartData = [
    ...topSources.map((source) => ({
      name: source.name,
      value: source.sessions,
      users: source.users,
    })),
  ];

  if (otherSources.length > 0) {
    const otherTotal = otherSources.reduce((sum, s) => sum + s.sessions, 0);
    const otherUsers = otherSources.reduce((sum, s) => sum + s.users, 0);
    chartData.push({ name: 'Other', value: otherTotal, users: otherUsers });
  }

  const totalSessions = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => 
                percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
              }
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const percent = ((data.value / totalSessions) * 100).toFixed(1);
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Sessions: {data.value.toLocaleString()} ({percent}%)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Users: {data.users.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
