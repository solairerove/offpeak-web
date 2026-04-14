import type { Holiday } from '../types';

export function getHolidaysForMonth(holidays: Holiday[], month: number, year: number): Holiday[] {
  return holidays.filter(h =>
    h.occurrences
      .filter(o => o.year === year)
      .some(({ month_start: s, month_end: e }) => {
        if (s <= e) return month >= s && month <= e;
        return month >= s || month <= e; // Dec→Jan wrap
      })
  );
}
