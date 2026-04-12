import type { ArrivalDataPoint, Holiday } from '../types';

export function computeComfortScore(heatIndex: number, rainDays: number): number {
  let heatPoints: number;
  if (heatIndex <= 25) heatPoints = 5;
  else if (heatIndex <= 28) heatPoints = 4;
  else if (heatIndex <= 31) heatPoints = 3;
  else if (heatIndex <= 34) heatPoints = 2;
  else heatPoints = 1;

  let rainPoints: number;
  if (rainDays <= 7) rainPoints = 5;
  else if (rainDays <= 12) rainPoints = 4;
  else if (rainDays <= 16) rainPoints = 3;
  else if (rainDays <= 20) rainPoints = 2;
  else rainPoints = 1;

  return heatPoints + rainPoints; // 2–10
}

export function computeMonthlyIndex(
  data: ArrivalDataPoint[],
  selectedYears: number[],
): { month: number; normalized: number }[] {
  const filtered = data.filter(d => selectedYears.includes(d.year));

  const byMonth: Record<number, number[]> = {};
  for (const d of filtered) {
    (byMonth[d.month] ??= []).push(d.visitors_thousands);
  }

  const avgs: { month: number; avg: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const vals = byMonth[m] ?? [];
    avgs.push({ month: m, avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 });
  }

  const values = avgs.map(a => a.avg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return avgs.map(a => ({
    month: a.month,
    normalized: Math.round((1 + 9 * (a.avg - min) / range) * 10) / 10,
  }));
}

export function getHolidaysForMonth(holidays: Holiday[], month: number, year: number): Holiday[] {
  // Use filter (not find) so holidays with multiple occurrences in the same year
  // (e.g. Galungan twice on a 210-day Pawukon cycle) are each checked independently.
  return holidays.filter(h =>
    h.occurrences
      .filter(o => o.year === year)
      .some(({ month_start: s, month_end: e }) => {
        if (s <= e) return month >= s && month <= e;
        return month >= s || month <= e; // Dec→Jan wrap
      })
  );
}

export function getWorstHolidayPenalty(holidays: Holiday[]): number {
  if (holidays.length === 0) return 0;
  let worst = 0;
  for (const h of holidays) {
    const p = h.crowd_impact === 'extreme' ? 3
      : h.crowd_impact === 'very_high' ? 2
      : h.crowd_impact === 'high' ? 2
      : h.crowd_impact === 'moderate' ? 1 : 0;
    worst = Math.max(worst, p);
  }
  return worst; // 0, 1, 2, 3
}

// overall = 0.4*comfort + 0.4*(11-crowd) + 0.2*(10-penalty)
// max: 0.4*10 + 0.4*10 + 0.2*10 = 10
// min: 0.4*2  + 0.4*1  + 0.2*7  ≈ 2.6
export function computeOverallScore(
  comfort: number,        // 2–10
  crowd: number,          // 1–10
  holidayPenalty: number, // 0–3 (0=none, 3=extreme)
): number {
  const raw = 0.4 * comfort + 0.4 * (11 - crowd) + 0.2 * (10 - holidayPenalty);
  return Math.round(Math.max(1, Math.min(10, raw)) * 10) / 10;
}

export function typhoonRiskToScore(risk: string): number {
  switch (risk) {
    case 'none':     return 1;
    case 'low':      return 3;
    case 'moderate': return 6;
    case 'high':     return 9;
    default:         return 1;
  }
}
