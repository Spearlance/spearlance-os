import { describe, expect, it } from "vitest";
import { buildMetricGroups, type MetricDefinition } from "../metricSeries";

const def = (over: Partial<MetricDefinition> & { metric: string }): MetricDefinition => ({
  label: over.metric,
  family: null,
  unit: "count",
  source: null,
  aggregation: "sum",
  description: null,
  display_order: 0,
  is_active: true,
  ...over,
});

const DEFS: MetricDefinition[] = [
  def({
    metric: "duda_calls", label: "Website Calls", family: "calls", unit: "clicks",
    description: "Click-to-call taps.", display_order: 10,
  }),
  def({
    metric: "google_calls", label: "Google Ads Calls", family: "calls", unit: "calls",
    display_order: 20,
  }),
  def({
    metric: "emails_sent", label: "Emails Sent", family: "outreach", unit: "emails",
    display_order: 30,
  }),
];

describe("buildMetricGroups", () => {
  it("renders one series per metric present in the data, in registry order", () => {
    const groups = buildMetricGroups(
      [
        { date: "2026-07-02", metric: "google_calls", value: 2 },
        { date: "2026-07-01", metric: "duda_calls", value: 3 },
        { date: "2026-07-03", metric: "duda_calls", value: "1" },
      ],
      DEFS,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].series.map((s) => s.metric)).toEqual(["duda_calls", "google_calls"]);
    expect(groups[0].series[0].label).toBe("Website Calls");
    expect(groups[0].series[0].points).toEqual([
      { date: "2026-07-01", value: 3 },
      { date: "2026-07-03", value: 1 },
    ]);
    expect(groups[0].series[0].total).toBe(4);
  });

  it("never subtotals a family whose members have different units", () => {
    const [calls] = buildMetricGroups(
      [
        { date: "2026-07-01", metric: "duda_calls", value: 3 },
        { date: "2026-07-01", metric: "google_calls", value: 23 },
      ],
      DEFS,
    );
    expect(calls.family).toBe("calls");
    expect(calls.subtotal).toBeNull();
    expect(calls.unit).toBeNull();
  });

  it("subtotals a family when every member shares one unit and sums", () => {
    const defs = [
      def({ metric: "a_leads", family: "leads", unit: "leads", display_order: 1 }),
      def({ metric: "b_leads", family: "leads", unit: "leads", display_order: 2 }),
    ];
    const [leads] = buildMetricGroups(
      [
        { date: "2026-07-01", metric: "a_leads", value: 2 },
        { date: "2026-07-02", metric: "b_leads", value: 5 },
      ],
      defs,
    );
    expect(leads.subtotal).toBe(7);
    expect(leads.unit).toBe("leads");
  });

  it("keeps metrics with no definition, flagged undefined, in a trailing Other group", () => {
    const groups = buildMetricGroups(
      [
        { date: "2026-07-01", metric: "mystery_metric", value: 9 },
        { date: "2026-07-01", metric: "duda_calls", value: 1 },
      ],
      DEFS,
    );
    expect(groups.map((g) => g.label)).toEqual(["Calls", "Other"]);
    const mystery = groups[1].series[0];
    expect(mystery.defined).toBe(false);
    expect(mystery.label).toBe("mystery_metric");
    expect(mystery.total).toBe(9);
    expect(groups[1].subtotal).toBeNull();
  });

  it("renders everything even with an empty registry", () => {
    const groups = buildMetricGroups(
      [{ date: "2026-07-01", metric: "anything", value: 1 }],
      [],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].series[0].defined).toBe(false);
  });

  it("aggregates avg/max/last over logged days only — absent days are not zeros", () => {
    const points = [
      { date: "2026-07-01", metric: "response_time", value: 10 },
      { date: "2026-07-05", metric: "response_time", value: 20 },
    ];
    const mk = (aggregation: MetricDefinition["aggregation"]) =>
      buildMetricGroups(points, [
        def({ metric: "response_time", family: "ops", unit: "hours", aggregation }),
      ])[0].series[0].total;
    expect(mk("avg")).toBe(15); // 2 logged days, not 5 calendar days
    expect(mk("max")).toBe(20);
    expect(mk("last")).toBe(20);
    expect(mk("sum")).toBe(30);
  });

  it("returns no groups for no data", () => {
    expect(buildMetricGroups([], DEFS)).toEqual([]);
  });
});
