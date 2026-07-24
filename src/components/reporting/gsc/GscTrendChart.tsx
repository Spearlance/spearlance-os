import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtShortDate } from "@/components/reporting/formatters";

const CLICKS_COLOR = "hsl(217 71% 50%)";
const IMPRESSIONS_COLOR = "hsl(271 49% 54%)";

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

export function GscTrendChart({ data }: { data: ({ date: string } & Record<string, number>)[] }) {
  const chartData = data.map((d) => ({ ...d, label: fmtShortDate(d.date) }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Clicks and impressions</CardTitle>
        <p className="text-xs text-muted-foreground">Daily organic search performance (Google Search Console)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
            <YAxis
              yAxisId="clicks"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={34}
            />
            <YAxis
              yAxisId="impressions"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={40}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="clicks"
              type="monotone"
              dataKey="clicks"
              name="Clicks"
              stroke={CLICKS_COLOR}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="impressions"
              type="monotone"
              dataKey="impressions"
              name="Impressions"
              stroke={IMPRESSIONS_COLOR}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
