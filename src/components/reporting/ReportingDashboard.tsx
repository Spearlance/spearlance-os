import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ReportPayload {
  client_id: string;
  from: string;
  to: string;
  funnel: {
    total: number;
    new: number;
    mql: number;
    sql: number;
    disqualified: number;
    reached_mql: number;
    reached_sql: number;
  };
  daily: { date: string; source: string; leads: number }[];
  sources: { source: string; leads: number }[];
  channels: { channel: string; leads: number }[];
  mql_to_sql: {
    month: string;
    mql_count: number;
    sql_count: number;
    conversion_rate: number | string | null;
    median_days: number | string | null;
  }[];
  metrics: { date: string; metric: string; value: number | string; meta: unknown }[];
}

const MQL_COLOR = "hsl(217 71% 50%)";
const SQL_COLOR = "hsl(120 100% 26%)";

const CHANNEL_LABELS: Record<string, string> = {
  website: "Website",
  google_ads: "Google Ads",
  facebook_ads: "Facebook Ads",
  microsoft_ads: "Microsoft Ads",
  email: "Email",
  phone: "Phone",
  organic: "Organic",
  referral: "Referral",
  unattributed: "Unattributed",
};

export const channelLabel = (c: string) =>
  CHANNEL_LABELS[c] ?? c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </CardContent>
    </Card>
  );
}

export function ReportingDashboard({ report }: { report: ReportPayload }) {
  const { funnel } = report;

  const monthly = report.mql_to_sql.map((r) => ({
    month: new Date(`${r.month}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    }),
    MQL: r.mql_count,
    SQL: r.sql_count,
    rate: r.conversion_rate == null ? null : Math.round(Number(r.conversion_rate) * 1000) / 10,
    median: r.median_days == null ? null : Number(r.median_days),
  }));

  const channels = report.channels.map((c) => ({
    name: channelLabel(c.channel),
    leads: c.leads,
    unattributed: c.channel === "unattributed",
  }));

  const callMetrics = report.metrics
    .filter((m) => m.metric === "duda_calls")
    .map((m) => ({
      date: new Date(`${m.date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      calls: Number(m.value),
    }));

  const latestCohort = [...report.mql_to_sql].reverse().find((r) => r.sql_count > 0);
  const conversionValue = latestCohort
    ? `${(Number(latestCohort.conversion_rate) * 100).toFixed(1)}%`
    : "—";
  const conversionNote = latestCohort
    ? `${latestCohort.sql_count} of ${latestCohort.mql_count} MQLs · ${new Date(`${latestCohort.month}T00:00:00`).toLocaleDateString(undefined, { month: "long" })} cohort`
    : "no SQL conversions yet";
  const medianValue = latestCohort?.median_days != null ? `${Number(latestCohort.median_days)} days` : "—";

  const tooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(var(--popover-foreground))",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label="Total leads" value={String(funnel.total)} note="all sources" />
        <StatTile
          label="Reached MQL"
          value={String(funnel.reached_mql)}
          note={funnel.total ? `${Math.round((funnel.reached_mql / funnel.total) * 100)}% of leads` : undefined}
        />
        <StatTile label="Reached SQL" value={String(funnel.reached_sql)} />
        <StatTile label="Conversion" value={conversionValue} note={conversionNote} />
        <StatTile label="Median MQL → SQL" value={medianValue} note={latestCohort ? "latest converting cohort" : undefined} />
      </div>

      <p className="text-sm text-muted-foreground">
        Current status: <b className="text-foreground">{funnel.new}</b> new ·{" "}
        <b className="text-foreground">{funnel.mql}</b> MQL ·{" "}
        <b className="text-foreground">{funnel.sql}</b> SQL ·{" "}
        <b className="text-foreground">{funnel.disqualified}</b> disqualified
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">MQLs and SQLs by month</CardTitle>
            <p className="text-xs text-muted-foreground">By the month the lead became an MQL</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} barGap={2}>
                <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={28} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [value, name]}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row?.rate != null ? `${label} — ${row.rate}% conversion` : label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="MQL" fill={MQL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="SQL" fill={SQL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads by channel</CardTitle>
            <p className="text-xs text-muted-foreground">Marketing channel attribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={channels} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={100}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "leads"]} />
                <Bar dataKey="leads" radius={[0, 4, 4, 0]} maxBarSize={16} label={{ position: "right", fontSize: 11 }}>
                  {channels.map((c) => (
                    <Cell key={c.name} fill={c.unattributed ? "hsl(var(--muted-foreground))" : MQL_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {callMetrics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Call clicks per day</CardTitle>
            <p className="text-xs text-muted-foreground">Daily call-click counts from the website</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={callMetrics}>
                <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={28} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "calls"]} />
                <Bar dataKey="calls" fill={MQL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {funnel.total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No leads recorded in this date range yet.
        </p>
      )}
    </div>
  );
}
