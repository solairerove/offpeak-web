import { describe, it, expect } from 'vitest';
import {
  computeComfortScore,
  computeOverallScore,
  computeMonthlyIndex,
  getHolidaysForMonth,
  getWorstHolidayPenalty,
  typhoonRiskToScore,
} from './scoring';
import type { ArrivalDataPoint, Holiday } from '../types';

// ─── computeComfortScore ────────────────────────────────────────

describe('computeComfortScore', () => {
  it('returns max score for cool, dry conditions', () => {
    // heat_index ≤ 25, rain_days ≤ 7 → 5+5 = 10
    expect(computeComfortScore(22, 3)).toBe(10);
    expect(computeComfortScore(25, 7)).toBe(10);
  });

  it('returns min score for extreme heat and heavy rain', () => {
    // heat_index > 34, rain_days > 20 → 1+1 = 2
    expect(computeComfortScore(38, 25)).toBe(2);
  });

  it('scores heat and rain independently', () => {
    // heat_index ≤ 25 (5pts) + rain_days 13–16 (3pts) = 8
    expect(computeComfortScore(24, 14)).toBe(8);
    // heat_index 29–31 (3pts) + rain_days ≤ 7 (5pts) = 8
    expect(computeComfortScore(30, 5)).toBe(8);
  });

  it('covers each heat bracket', () => {
    expect(computeComfortScore(25, 0)).toBe(10); // 5+5
    expect(computeComfortScore(27, 0)).toBe(9);  // 4+5
    expect(computeComfortScore(30, 0)).toBe(8);  // 3+5
    expect(computeComfortScore(33, 0)).toBe(7);  // 2+5
    expect(computeComfortScore(36, 0)).toBe(6);  // 1+5
  });

  it('covers each rain bracket', () => {
    expect(computeComfortScore(0, 7)).toBe(10);  // 5+5
    expect(computeComfortScore(0, 10)).toBe(9);  // 5+4
    expect(computeComfortScore(0, 14)).toBe(8);  // 5+3
    expect(computeComfortScore(0, 18)).toBe(7);  // 5+2
    expect(computeComfortScore(0, 21)).toBe(6);  // 5+1
  });
});

// ─── computeOverallScore ────────────────────────────────────────

describe('computeOverallScore', () => {
  it('returns ~10 for ideal conditions', () => {
    // comfort=10, crowd=1, penalty=0 → 0.4*10 + 0.4*10 + 0.2*10 = 10
    expect(computeOverallScore(10, 1, 0)).toBe(10);
  });

  it('clamps to min 1', () => {
    // worst possible: comfort=2, crowd=10, penalty=3 → 0.4*2 + 0.4*1 + 0.2*7 = 0.8+0.4+1.4 = 2.6
    const score = computeOverallScore(2, 10, 3);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });

  it('holiday penalty reduces overall score', () => {
    const noPenalty = computeOverallScore(7, 5, 0);
    const withPenalty = computeOverallScore(7, 5, 3);
    expect(withPenalty).toBeLessThan(noPenalty);
  });

  it('high crowds reduce overall score', () => {
    const lowCrowds = computeOverallScore(7, 2, 0);
    const highCrowds = computeOverallScore(7, 9, 0);
    expect(highCrowds).toBeLessThan(lowCrowds);
  });

  it('result is always within 1–10', () => {
    const cases: [number, number, number][] = [
      [10, 1, 0], [2, 10, 3], [5, 5, 1], [8, 3, 2], [1, 10, 3],
    ];
    for (const [c, cr, p] of cases) {
      const score = computeOverallScore(c, cr, p);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it('rounds to one decimal place', () => {
    const score = computeOverallScore(7, 4, 1);
    const decimals = score.toString().split('.')[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});

// ─── computeMonthlyIndex ───────────────────────────────────────

describe('computeMonthlyIndex', () => {
  const data: ArrivalDataPoint[] = [
    { year: 2023, month: 1, visitors_thousands: 100 },
    { year: 2023, month: 2, visitors_thousands: 200 },
    { year: 2023, month: 3, visitors_thousands: 300 },
    { year: 2024, month: 1, visitors_thousands: 200 },
    { year: 2024, month: 2, visitors_thousands: 400 },
    { year: 2024, month: 3, visitors_thousands: 600 },
  ];

  it('returns 12 entries', () => {
    const result = computeMonthlyIndex(data, [2023]);
    expect(result).toHaveLength(12);
  });

  it('month with highest avg gets score 10', () => {
    const result = computeMonthlyIndex(data, [2023]);
    const m3 = result.find(r => r.month === 3)!;
    expect(m3.normalized).toBe(10); // month 3 has highest avg (300k)
  });

  it('months with no data (avg=0) get score 1 as the true minimum', () => {
    // months 4–12 have no data → avg=0, which is the global min → normalized=1
    const result = computeMonthlyIndex(data, [2023]);
    const m6 = result.find(r => r.month === 6)!;
    expect(m6.normalized).toBe(1);
  });

  it('averages across selected years', () => {
    const result = computeMonthlyIndex(data, [2023, 2024]);
    const m1 = result.find(r => r.month === 1)!;
    const m2 = result.find(r => r.month === 2)!;
    // avg month1 = (100+200)/2=150, avg month2 = (200+400)/2=300
    // month1 should be lower than month2
    expect(m1.normalized).toBeLessThan(m2.normalized);
  });

  it('months with no data in selected years get 0 avg and score 1', () => {
    const result = computeMonthlyIndex(data, [2023]);
    // months 4–12 have no data → avg 0 → same as min (0)
    const m4 = result.find(r => r.month === 4)!;
    expect(m4.normalized).toBe(1);
  });

  it('handles single year selection', () => {
    const result = computeMonthlyIndex(data, [2024]);
    expect(result).toHaveLength(12);
    const m3 = result.find(r => r.month === 3)!;
    expect(m3.normalized).toBe(10); // highest in 2024
  });
});

// ─── getHolidaysForMonth ───────────────────────────────────────

describe('getHolidaysForMonth', () => {
  const holidays: Holiday[] = [
    {
      id: 'songkran',
      name: 'Songkran',
      crowd_impact: 'extreme',
      price_impact: 'high',
      closure_impact: 'significant',
      notes: '',
      occurrences: [
        { year: 2026, date_start: '2026-04-13', date_end: '2026-04-15', month_start: 4, month_end: 4 },
      ],
    },
    {
      id: 'nye',
      name: 'New Year',
      crowd_impact: 'very_high',
      price_impact: 'high',
      closure_impact: 'minimal',
      notes: '',
      occurrences: [
        { year: 2025, date_start: '2025-12-31', date_end: '2026-01-01', month_start: 12, month_end: 1 },
      ],
    },
  ];

  it('returns holidays whose occurrence overlaps the given month', () => {
    const result = getHolidaysForMonth(holidays, 4, 2026);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('songkran');
  });

  it('returns empty array when no holidays in that month', () => {
    expect(getHolidaysForMonth(holidays, 7, 2026)).toHaveLength(0);
  });

  it('filters by year', () => {
    // Songkran only has 2026 occurrence
    expect(getHolidaysForMonth(holidays, 4, 2025)).toHaveLength(0);
  });

  it('handles Dec→Jan wrap-around holiday', () => {
    // NYE occurrence: month_start=12, month_end=1 (wraps)
    const decResult = getHolidaysForMonth(holidays, 12, 2025);
    const janResult = getHolidaysForMonth(holidays, 1, 2025);
    expect(decResult).toHaveLength(1);
    expect(janResult).toHaveLength(1);
  });

  it('does not match mid-year months for a wrap-around holiday', () => {
    const junResult = getHolidaysForMonth(holidays, 6, 2025);
    expect(junResult).toHaveLength(0);
  });
});

// ─── getWorstHolidayPenalty ────────────────────────────────────

describe('getWorstHolidayPenalty', () => {
  const make = (impact: Holiday['crowd_impact']): Holiday => ({
    id: impact,
    name: impact,
    crowd_impact: impact,
    price_impact: 'none',
    closure_impact: 'none',
    notes: '',
    occurrences: [],
  });

  it('returns 0 for empty list', () => {
    expect(getWorstHolidayPenalty([])).toBe(0);
  });

  it('returns 0 for low-impact holidays', () => {
    expect(getWorstHolidayPenalty([make('low')])).toBe(0);
  });

  it('returns 1 for moderate impact', () => {
    expect(getWorstHolidayPenalty([make('moderate')])).toBe(1);
  });

  it('returns 2 for high and very_high impact', () => {
    expect(getWorstHolidayPenalty([make('high')])).toBe(2);
    expect(getWorstHolidayPenalty([make('very_high')])).toBe(2);
  });

  it('returns 3 for extreme impact', () => {
    expect(getWorstHolidayPenalty([make('extreme')])).toBe(3);
  });

  it('returns the worst penalty when multiple holidays', () => {
    expect(getWorstHolidayPenalty([make('low'), make('extreme'), make('moderate')])).toBe(3);
    expect(getWorstHolidayPenalty([make('moderate'), make('high')])).toBe(2);
  });
});

// ─── typhoonRiskToScore ────────────────────────────────────────

describe('typhoonRiskToScore', () => {
  it('maps known risk levels to scores', () => {
    expect(typhoonRiskToScore('none')).toBe(1);
    expect(typhoonRiskToScore('low')).toBe(3);
    expect(typhoonRiskToScore('moderate')).toBe(6);
    expect(typhoonRiskToScore('high')).toBe(9);
  });

  it('unknown risk level falls back to 1', () => {
    expect(typhoonRiskToScore('unknown')).toBe(1);
    expect(typhoonRiskToScore('')).toBe(1);
  });
});
