import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildMetricGroups,
  type MetricDefinition,
  type MetricFamilyGroup,
  type MetricSeries,
} from "@/lib/metricSeries";
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
    // Optional so payloads from a not-yet-redeployed edge function still render.
    sale?: number;
    sale_value?: number;
    spam?: number;
  };
  call_lead_count?: number;
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
  // Optional so payloads from a not-yet-redeployed edge function still render
  // (labels then fall back to raw metric keys).
  metric_definitions?: MetricDefinition[];
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

const formatMetricValue = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1);

function MetricSeriesBlock({
  series,
  tooltipStyle,
}: {
  series: MetricSeries;
  tooltipStyle: React.CSSProperties;
}) {
  const data = series.points.map((p) => ({
    date: new Date(`${p.date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    value: p.value,
  }));
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{series.label}</span>
          {!series.defined && (
            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-500"
              title="No entry in reporting.metric_definitions — add one to set a label and unit.">
              undefined
            </Badge>
          )}
        </div>
        <span className="text-sm tabular-nums">
          <b>{formatMetricValue(series.total)}</b>
          {series.unit && <span className="text-xs text-muted-foreground"> {series.unit}</span>}
          {series.aggregation !== "sum" && (
            <span className="text-xs text-muted-foreground"> ({series.aggregation})</span>
          )}
        </span>
      </div>
      {series.description && (
        <p className="text-xs text-muted-foreground">{series.description}</p>
      )}
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={28} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [v, series.unit ?? series.label]}
          />
          <Bar dataKey="value" fill={MQL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricFamilyCard({
  group,
  callLeads,
  tooltipStyle,
}: {
  group: MetricFamilyGroup;
  callLeads: number;
  tooltipStyle: React.CSSProperties;
}) {
  // Call-intent reconciliation: click-to-call metrics count intent, and each
  // real call should surface as a phone lead. Keyed on family/unit from the
  // registry, not on metric names.
  const clickToCall = group.family === "calls"
    ? group.series.filter((s) => s.unit === "clicks").reduce((sum, s) => sum + s.total, 0)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{group.label}</CardTitle>
          <div className="text-right text-xs text-muted-foreground">
            {group.subtotal != null ? (
              <>
                <span className="font-semibold text-foreground text-sm">
                  {formatMetricValue(group.subtotal)}
                </span>{" "}
                {group.unit} total
              </>
            ) : group.series.length > 1 ? (
              <span title="These metrics use different units, so a combined total would be misleading.">
                not totaled — different units
              </span>
            ) : null}
            {group.family === "calls" && (
              <>
                {" · "}
                <span className="font-semibold text-foreground text-sm">{callLeads}</span> call leads logged
              </>
            )}
          </div>
        </div>
        {clickToCall > callLeads && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            The website drove {clickToCall} call click{clickToCall === 1 ? "" : "s"} in this
            period but only {callLeads} call lead{callLeads === 1 ? " is" : "s are"} logged in reporting —
            compare against the actual call log and report the missing calls so website-driven phone
            leads get counted.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {group.series.map((s) => (
          <MetricSeriesBlock key={s.metric} series={s} tooltipStyle={tooltipStyle} />
        ))}
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

  const metricGroups = buildMetricGroups(report.metrics, report.metric_definitions ?? []);
  const callLeads = report.call_lead_count ?? 0;

  const sales = funnel.sale ?? 0;
  const saleValue = funnel.sale_value ?? 0;
  const salesNote = funnel.total
    ? `${((sales / funnel.total) * 100).toFixed(1)}% of leads converted`
    : undefined;
  const revenueValue = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(saleValue);

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
        <StatTile label="Sales" value={String(sales)} note={sales ? salesNote : "no sales yet"} />
        <StatTile
          label="Sales value"
          value={revenueValue}
          note={sales ? `from ${sales} sale${sales === 1 ? "" : "s"}` : "mark leads as SALE with a value"}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Current status: <b className="text-foreground">{funnel.new}</b> new ·{" "}
        <b className="text-foreground">{funnel.mql}</b> MQL ·{" "}
        <b className="text-foreground">{funnel.sql}</b> SQL ·{" "}
        <b className="text-foreground">{sales}</b> sale{sales === 1 ? "" : "s"} ·{" "}
        <b className="text-foreground">{funnel.disqualified}</b> disqualified
        {(funnel.spam ?? 0) > 0 && <> · {funnel.spam} spam (not counted)</>}
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

      {metricGroups.map((group) => (
        <MetricFamilyCard
          key={group.family ?? "__other__"}
          group={group}
          callLeads={callLeads}
          tooltipStyle={tooltipStyle}
        />
      ))}

      {funnel.total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No leads recorded in this date range yet.
        </p>
      )}
    </div>
  );
}
