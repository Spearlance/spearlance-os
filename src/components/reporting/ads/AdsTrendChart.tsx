import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtShortDate } from "@/components/reporting/formatters";

const SPEND_COLOR = "hsl(217 71% 50%)";
const CONVERSIONS_COLOR = "hsl(120 100% 26%)";

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

export function AdsTrendChart({ data }: { data: ({ date: string } & Record<string, number>)[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: fmtShortDate(d.date),
    spend: Math.round(d.spend * 100) / 100,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Spend and conversions</CardTitle>
        <p className="text-xs text-muted-foreground">Daily Google Ads performance</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
            <YAxis
              yAxisId="spend"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={44}
              tickFormatter={(v: number) => `$${v}`}
            />
            <YAxis
              yAxisId="conversions"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={30}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) =>
                name === "Spend" ? [`$${value.toFixed(2)}`, name] : [value, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              yAxisId="spend"
              dataKey="spend"
              name="Spend"
              fill={SPEND_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Line
              yAxisId="conversions"
              type="monotone"
              dataKey="conversions"
              name="Conversions"
              stroke={CONVERSIONS_COLOR}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
