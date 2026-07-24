// Pure aggregation helpers for the Windsor-synced reporting tabs (SEO /
// Google Ads). No Supabase imports so these stay trivially unit-testable.

export interface DeltaResult {
  /** Percent change vs the previous value, null when previous is 0/absent. */
  pct: number | null;
  direction: "up" | "down" | "flat";
}

export function computeDelta(current: number, previous: number): DeltaResult {
  if (!previous) return { pct: null, direction: current > 0 ? "up" : "flat" };
  const pct = ((current - previous) / previous) * 100;
  return {
    pct: Math.round(pct * 10) / 10,
    direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat",
  };
}

interface GscMetricRow {
  clicks: number;
  impressions: number;
  position: number | null;
}

export interface GscTotals {
  clicks: number;
  impressions: number;
  /** Weighted click-through rate: total clicks / total impressions. */
  ctr: number | null;
  /** Impression-weighted average position. */
  position: number | null;
}

export function sumGscRows(rows: GscMetricRow[]): GscTotals {
  let clicks = 0;
  let impressions = 0;
  let positionWeight = 0;
  let weightedPosition = 0;
  for (const row of rows) {
    clicks += row.clicks;
    impressions += row.impressions;
    if (row.position != null && row.impressions > 0) {
      positionWeight += row.impressions;
      weightedPosition += row.position * row.impressions;
    }
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : null,
    position: positionWeight > 0 ? weightedPosition / positionWeight : null,
  };
}

/** Re-aggregate per-day dimension rows (queries/pages) across a date range. */
export function aggregateGscDimension<T extends GscMetricRow>(
  rows: (T & Record<string, unknown>)[],
  dimension: string,
  limit: number,
): (GscTotals & { key: string })[] {
  const grouped = new Map<string, GscMetricRow[]>();
  for (const row of rows) {
    const key = String(row[dimension] ?? "");
    if (!key) continue;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  return [...grouped.entries()]
    .map(([key, groupRows]) => ({ key, ...sumGscRows(groupRows) }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);
}

export interface AdsTotals {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  costPerConversion: number | null;
  ctr: number | null;
  cpc: number | null;
}

export function sumAdsRows(
  rows: { spend: number; clicks: number; impressions: number; conversions: number }[],
): AdsTotals {
  let spend = 0;
  let clicks = 0;
  let impressions = 0;
  let conversions = 0;
  for (const row of rows) {
    spend += row.spend;
    clicks += row.clicks;
    impressions += row.impressions;
    conversions += row.conversions;
  }
  return {
    spend,
    clicks,
    impressions,
    conversions,
    costPerConversion: conversions > 0 ? spend / conversions : null,
    ctr: impressions > 0 ? clicks / impressions : null,
    cpc: clicks > 0 ? spend / clicks : null,
  };
}

/** Collapse multi-account rows into one row per day, zero-filling missing days. */
export function buildDailySeries<T extends { metric_date: string }>(
  rows: T[],
  from: string,
  to: string,
  sumFields: (keyof T & string)[],
): ({ date: string } & Record<string, number>)[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const acc = byDate.get(row.metric_date) ?? {};
    for (const field of sumFields) {
      acc[field] = (acc[field] ?? 0) + (Number(row[field]) || 0);
    }
    byDate.set(row.metric_date, acc);
  }

  const series: ({ date: string } & Record<string, number>)[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return series;
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400_000)) {
    const date = d.toISOString().slice(0, 10);
    const acc = byDate.get(date);
    const point: { date: string } & Record<string, number> = { date } as any;
    for (const field of sumFields) point[field] = acc?.[field] ?? 0;
    series.push(point);
  }
  return series;
}

/** The equal-length period immediately before [from, to], for delta baselines. */
export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const lengthDays = Math.max(1, Math.round((end - start) / 86400_000) + 1);
  const prevEnd = start - 86400_000;
  const prevStart = prevEnd - (lengthDays - 1) * 86400_000;
  return {
    from: new Date(prevStart).toISOString().slice(0, 10),
    to: new Date(prevEnd).toISOString().slice(0, 10),
  };
}
