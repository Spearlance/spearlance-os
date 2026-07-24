import { describe, expect, it } from "vitest";
import {
  aggregateGscDimension,
  buildDailySeries,
  computeDelta,
  previousPeriod,
  sumAdsRows,
  sumGscRows,
} from "@/lib/windsorAggregate";

describe("computeDelta", () => {
  it("computes percent change and direction", () => {
    expect(computeDelta(120, 100)).toEqual({ pct: 20, direction: "up" });
    expect(computeDelta(80, 100)).toEqual({ pct: -20, direction: "down" });
    expect(computeDelta(100, 100)).toEqual({ pct: 0, direction: "flat" });
  });

  it("returns null pct when previous is zero", () => {
    expect(computeDelta(50, 0)).toEqual({ pct: null, direction: "up" });
    expect(computeDelta(0, 0)).toEqual({ pct: null, direction: "flat" });
  });

  it("rounds to one decimal", () => {
    expect(computeDelta(3, 7).pct).toBe(-57.1);
  });
});

describe("sumGscRows", () => {
  it("returns zeros/nulls for empty input", () => {
    expect(sumGscRows([])).toEqual({ clicks: 0, impressions: 0, ctr: null, position: null });
  });

  it("sums clicks/impressions and computes weighted ctr and position", () => {
    const totals = sumGscRows([
      { clicks: 10, impressions: 100, position: 5 },
      { clicks: 0, impressions: 300, position: 20 },
    ]);
    expect(totals.clicks).toBe(10);
    expect(totals.impressions).toBe(400);
    expect(totals.ctr).toBeCloseTo(0.025);
    // (5*100 + 20*300) / 400
    expect(totals.position).toBeCloseTo(16.25);
  });

  it("ignores null positions without dropping the row's clicks", () => {
    const totals = sumGscRows([
      { clicks: 5, impressions: 50, position: null },
      { clicks: 5, impressions: 50, position: 10 },
    ]);
    expect(totals.clicks).toBe(10);
    expect(totals.position).toBe(10);
  });
});

describe("aggregateGscDimension", () => {
  const rows = [
    { query: "web design", clicks: 3, impressions: 100, position: 4 },
    { query: "web design", clicks: 2, impressions: 100, position: 6 },
    { query: "seo company", clicks: 4, impressions: 50, position: 2 },
    { query: "", clicks: 99, impressions: 999, position: 1 },
  ];

  it("groups by dimension, sums, and sorts by clicks", () => {
    const result = aggregateGscDimension(rows, "query", 10);
    expect(result.map((r) => r.key)).toEqual(["web design", "seo company"]);
    expect(result[0].clicks).toBe(5);
    expect(result[0].impressions).toBe(200);
    expect(result[0].position).toBeCloseTo(5);
  });

  it("applies the limit", () => {
    expect(aggregateGscDimension(rows, "query", 1)).toHaveLength(1);
  });

  it("skips rows with an empty dimension value", () => {
    const keys = aggregateGscDimension(rows, "query", 10).map((r) => r.key);
    expect(keys).not.toContain("");
  });
});

describe("sumAdsRows", () => {
  it("returns nulls for ratios on empty input", () => {
    const totals = sumAdsRows([]);
    expect(totals.spend).toBe(0);
    expect(totals.costPerConversion).toBeNull();
    expect(totals.ctr).toBeNull();
    expect(totals.cpc).toBeNull();
  });

  it("computes derived ratios from summed totals", () => {
    const totals = sumAdsRows([
      { spend: 100, clicks: 20, impressions: 1000, conversions: 4 },
      { spend: 50, clicks: 5, impressions: 500, conversions: 1 },
    ]);
    expect(totals.spend).toBe(150);
    expect(totals.costPerConversion).toBe(30);
    expect(totals.ctr).toBeCloseTo(25 / 1500);
    expect(totals.cpc).toBe(6);
  });
});

describe("buildDailySeries", () => {
  it("sums multiple accounts per day and zero-fills gaps", () => {
    const series = buildDailySeries(
      [
        { metric_date: "2026-07-01", clicks: 3 },
        { metric_date: "2026-07-01", clicks: 2 },
        { metric_date: "2026-07-03", clicks: 7 },
      ],
      "2026-07-01",
      "2026-07-03",
      ["clicks"],
    );
    expect(series).toEqual([
      { date: "2026-07-01", clicks: 5 },
      { date: "2026-07-02", clicks: 0 },
      { date: "2026-07-03", clicks: 7 },
    ]);
  });

  it("returns empty for invalid dates", () => {
    expect(buildDailySeries([], "not-a-date", "2026-07-03", ["clicks"])).toEqual([]);
  });
});

describe("previousPeriod", () => {
  it("returns the equal-length period immediately before", () => {
    expect(previousPeriod("2026-07-11", "2026-07-20")).toEqual({
      from: "2026-07-01",
      to: "2026-07-10",
    });
  });

  it("handles single-day ranges", () => {
    expect(previousPeriod("2026-07-20", "2026-07-20")).toEqual({
      from: "2026-07-19",
      to: "2026-07-19",
    });
  });
});
