import { useMemo } from 'react';
import type { CityData } from '../types';
import { getHolidaysForMonth } from '../lib/holidays';
import { getMetricColor } from '../lib/colors';
import HolidayBadge from './HolidayBadge';
import { MONTH_FULL } from '../lib/constants';

function crowdLabel(score: number): string {
  if (score <= 3)   return 'Low crowds';
  if (score <= 5.5) return 'Moderate';
  if (score <= 7.5) return 'High crowds';
  return 'Very busy';
}

function crowdColor(score: number): string {
  if (score <= 3)   return 'text-teal-400';
  if (score <= 5.5) return 'text-yellow-400';
  if (score <= 7.5) return 'text-amber-400';
  return 'text-orange-400';
}

function formatPriceIndex(value: number): { label: string; className: string } {
  const delta = Math.round(value - 100);
  if (delta === 0) return { label: 'avg price', className: 'text-slate-500' };
  if (delta > 0)   return { label: `+${delta}% price`, className: 'text-rose-400/80' };
  return { label: `${delta}% price`, className: 'text-teal-400/80' };
}

interface Props {
  city: CityData;
  planningYear: number;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}

export default function MobileMonthList({ city, planningYear, selectedMonth, onSelectMonth }: Props) {
  const rows = useMemo(() => {
    return city.monthly_scores.map(ms => {
      const w = city.weather.find(w => w.month === ms.month)!;
      const monthHolidays = getHolidaysForMonth(city.holidays, ms.month, planningYear);
      return { month: ms.month, overall: ms.overall, crowd: ms.crowd_index, priceIndex: ms.price_index ?? null, weather: w, holidays: monthHolidays };
    });
  }, [city, planningYear]);

  const overallValues = rows.map(r => r.overall);

  return (
    <div className="space-y-1.5">
      {rows.map(r => {
        const accentColor = getMetricColor(r.overall, overallValues, false);
        const isSelected = selectedMonth === r.month;

        return (
          <div
            key={r.month}
            onClick={() => onSelectMonth(r.month)}
            className={`
              rounded-xl cursor-pointer transition-all
              border border-l-[3px] border-transparent
              ${isSelected
                ? 'bg-slate-800/70 border-slate-700/50 ring-1 ring-teal-500/30'
                : 'bg-slate-800/30 active:bg-slate-800/60'
              }
            `}
            style={{ borderLeftColor: accentColor }}
          >
            <div className="px-4 py-3">
              {/* Line 1: month name + score */}
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className={`text-sm font-semibold leading-none ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {MONTH_FULL[r.month - 1]}
                </span>
                <span
                  className="text-base font-black tabular-nums leading-none shrink-0"
                  style={{ color: accentColor }}
                >
                  {r.overall}
                </span>
              </div>

              {/* Line 2: weather + crowd + holidays */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 tabular-nums">
                  {r.weather.avg_high_c}°
                  <span className="text-slate-700">/</span>
                  {r.weather.avg_low_c}°
                </span>
                <span className="text-slate-700 text-[10px]">·</span>
                <span className="text-[10px] text-slate-500">
                  {r.weather.rain_days} rain
                </span>
                <span className="text-slate-700 text-[10px]">·</span>
                <span className={`text-[10px] font-medium ${crowdColor(r.crowd)}`}>
                  {crowdLabel(r.crowd)}
                </span>
                {r.priceIndex !== null && (() => {
                  const { label, className } = formatPriceIndex(r.priceIndex);
                  return (
                    <>
                      <span className="text-slate-700 text-[10px]">·</span>
                      <span className={`text-[10px] font-medium ${className}`}>{label}</span>
                    </>
                  );
                })()}
                {r.holidays.length > 0 && (
                  <div className="shrink-0">
                    <HolidayBadge holidays={r.holidays} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
