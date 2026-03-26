import { describe, it, expect } from 'vitest';

interface MetricSnapshot {
  current: number;
  previous: number;
}

function detectThresholdBreaches(metrics: {
  conversionRate?: MetricSnapshot;
  lcpMs?: MetricSnapshot;
  clsScore?: MetricSnapshot;
  inpMs?: MetricSnapshot;
  rageClicks?: MetricSnapshot;
  rankingPosition?: MetricSnapshot;
}): Array<{ type: string; severity: string; message: string }> {
  const breaches: Array<{ type: string; severity: string; message: string }> = [];

  // Conversion rate drop >30%
  if (metrics.conversionRate !== undefined) {
    const { current, previous } = metrics.conversionRate;
    if (previous > 0) {
      const drop = (previous - current) / previous;
      if (drop > 0.3) {
        breaches.push({
          type: 'conversion_drop',
          severity: 'critical',
          message: `Conversion rate dropped ${(drop * 100).toFixed(1)}% (${previous.toFixed(2)}% → ${current.toFixed(2)}%)`,
        });
      }
    }
  }

  // LCP regression past 2500ms (was passing, now failing)
  if (metrics.lcpMs !== undefined) {
    const { current, previous } = metrics.lcpMs;
    if (previous <= 2500 && current > 2500) {
      breaches.push({
        type: 'cwv_lcp_fail',
        severity: 'high',
        message: `LCP regressed past 2500ms threshold (${previous}ms → ${current}ms)`,
      });
    }
  }

  // CLS regression past 0.1 (was passing, now failing)
  if (metrics.clsScore !== undefined) {
    const { current, previous } = metrics.clsScore;
    if (previous <= 0.1 && current > 0.1) {
      breaches.push({
        type: 'cwv_cls_fail',
        severity: 'high',
        message: `CLS regressed past 0.1 threshold (${previous} → ${current})`,
      });
    }
  }

  // INP regression past 200ms (was passing, now failing)
  if (metrics.inpMs !== undefined) {
    const { current, previous } = metrics.inpMs;
    if (previous <= 200 && current > 200) {
      breaches.push({
        type: 'cwv_inp_fail',
        severity: 'high',
        message: `INP regressed past 200ms threshold (${previous}ms → ${current}ms)`,
      });
    }
  }

  // Rage click spike >50% increase
  if (metrics.rageClicks !== undefined) {
    const { current, previous } = metrics.rageClicks;
    if (previous > 0) {
      const increase = (current - previous) / previous;
      if (increase > 0.5) {
        breaches.push({
          type: 'rage_click_spike',
          severity: 'medium',
          message: `Rage clicks spiked ${(increase * 100).toFixed(1)}% (${previous} → ${current})`,
        });
      }
    }
  }

  // Ranking drop >5 positions
  if (metrics.rankingPosition !== undefined) {
    const { current, previous } = metrics.rankingPosition;
    // Higher position number = worse ranking
    const drop = current - previous;
    if (drop > 5) {
      breaches.push({
        type: 'ranking_drop',
        severity: 'high',
        message: `Ranking dropped ${drop} positions (position ${previous} → ${current})`,
      });
    }
  }

  return breaches;
}

describe('detectThresholdBreaches', () => {
  describe('conversion rate', () => {
    it('detects conversion rate drop >30%', () => {
      const result = detectThresholdBreaches({
        conversionRate: { previous: 5.0, current: 3.0 }, // 40% drop
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('conversion_drop');
      expect(result[0].severity).toBe('critical');
    });

    it('ignores conversion drop <30%', () => {
      const result = detectThresholdBreaches({
        conversionRate: { previous: 5.0, current: 4.0 }, // 20% drop
      });
      expect(result).toHaveLength(0);
    });

    it('ignores conversion drop exactly at 30%', () => {
      const result = detectThresholdBreaches({
        conversionRate: { previous: 5.0, current: 3.5 }, // exactly 30% drop
      });
      expect(result).toHaveLength(0);
    });

    it('ignores conversion rate improvement', () => {
      const result = detectThresholdBreaches({
        conversionRate: { previous: 3.0, current: 5.0 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('LCP', () => {
    it('detects LCP regression past 2500ms threshold', () => {
      const result = detectThresholdBreaches({
        lcpMs: { previous: 2200, current: 2800 },
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cwv_lcp_fail');
      expect(result[0].severity).toBe('high');
    });

    it('ignores LCP that was already failing (both above 2500ms)', () => {
      const result = detectThresholdBreaches({
        lcpMs: { previous: 3000, current: 3500 },
      });
      expect(result).toHaveLength(0);
    });

    it('ignores LCP improvement that stays above 2500ms', () => {
      const result = detectThresholdBreaches({
        lcpMs: { previous: 3500, current: 2800 },
      });
      expect(result).toHaveLength(0);
    });

    it('ignores LCP that stays within threshold', () => {
      const result = detectThresholdBreaches({
        lcpMs: { previous: 1800, current: 2200 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('CLS', () => {
    it('detects CLS regression past 0.1 threshold', () => {
      const result = detectThresholdBreaches({
        clsScore: { previous: 0.05, current: 0.15 },
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cwv_cls_fail');
      expect(result[0].severity).toBe('high');
    });

    it('ignores CLS that was already failing (both above 0.1)', () => {
      const result = detectThresholdBreaches({
        clsScore: { previous: 0.15, current: 0.25 },
      });
      expect(result).toHaveLength(0);
    });

    it('ignores CLS that stays within threshold', () => {
      const result = detectThresholdBreaches({
        clsScore: { previous: 0.02, current: 0.08 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('INP', () => {
    it('detects INP regression past 200ms threshold', () => {
      const result = detectThresholdBreaches({
        inpMs: { previous: 150, current: 250 },
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cwv_inp_fail');
      expect(result[0].severity).toBe('high');
    });

    it('ignores INP that was already failing (both above 200ms)', () => {
      const result = detectThresholdBreaches({
        inpMs: { previous: 250, current: 300 },
      });
      expect(result).toHaveLength(0);
    });

    it('ignores INP that stays within threshold', () => {
      const result = detectThresholdBreaches({
        inpMs: { previous: 100, current: 190 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('rage clicks', () => {
    it('detects rage click spike >50% increase', () => {
      const result = detectThresholdBreaches({
        rageClicks: { previous: 100, current: 160 }, // 60% increase
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('rage_click_spike');
      expect(result[0].severity).toBe('medium');
    });

    it('ignores normal rage click variation (<50% increase)', () => {
      const result = detectThresholdBreaches({
        rageClicks: { previous: 100, current: 140 }, // 40% increase
      });
      expect(result).toHaveLength(0);
    });

    it('ignores rage click spike exactly at 50%', () => {
      const result = detectThresholdBreaches({
        rageClicks: { previous: 100, current: 150 }, // exactly 50%
      });
      expect(result).toHaveLength(0);
    });

    it('ignores rage click decrease', () => {
      const result = detectThresholdBreaches({
        rageClicks: { previous: 100, current: 50 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('ranking position', () => {
    it('detects ranking drop >5 positions', () => {
      const result = detectThresholdBreaches({
        rankingPosition: { previous: 3, current: 10 }, // dropped 7 positions
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ranking_drop');
      expect(result[0].severity).toBe('high');
    });

    it('ignores small ranking fluctuations (≤5 positions)', () => {
      const result = detectThresholdBreaches({
        rankingPosition: { previous: 3, current: 7 }, // dropped 4 positions
      });
      expect(result).toHaveLength(0);
    });

    it('ignores ranking drop exactly 5 positions', () => {
      const result = detectThresholdBreaches({
        rankingPosition: { previous: 3, current: 8 }, // dropped exactly 5
      });
      expect(result).toHaveLength(0);
    });

    it('ignores ranking improvement', () => {
      const result = detectThresholdBreaches({
        rankingPosition: { previous: 10, current: 3 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('missing metrics', () => {
    it('handles missing metrics gracefully (undefined fields)', () => {
      const result = detectThresholdBreaches({});
      expect(result).toHaveLength(0);
    });

    it('handles partial metrics without errors', () => {
      const result = detectThresholdBreaches({
        lcpMs: { previous: 1800, current: 2200 },
        // no conversionRate, no rageClicks, etc.
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('all metrics healthy', () => {
    it('returns empty array when all metrics are healthy', () => {
      const result = detectThresholdBreaches({
        conversionRate: { previous: 5.0, current: 4.5 },
        lcpMs: { previous: 1800, current: 2000 },
        clsScore: { previous: 0.02, current: 0.05 },
        inpMs: { previous: 100, current: 150 },
        rageClicks: { previous: 100, current: 120 },
        rankingPosition: { previous: 3, current: 5 },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('multiple simultaneous breaches', () => {
    it('detects multiple breaches at once', () => {
      const result = detectThresholdBreaches({
        conversionRate: { previous: 5.0, current: 2.0 }, // 60% drop → critical
        lcpMs: { previous: 2000, current: 3000 },        // regression → high
        rankingPosition: { previous: 2, current: 10 },   // dropped 8 → high
      });
      expect(result).toHaveLength(3);
      const types = result.map(b => b.type);
      expect(types).toContain('conversion_drop');
      expect(types).toContain('cwv_lcp_fail');
      expect(types).toContain('ranking_drop');
    });
  });
});
