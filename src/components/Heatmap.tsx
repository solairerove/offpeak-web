import { useMemo, useCallback } from 'react';
import type { CityData } from '../types';
import {
  computeComfortScore,
  computeOverallScore,
  getHolidaysForMonth,
  getWorstHolidayPenalty,
  typhoonRiskToScore,
} from '../lib/scoring';
import { getMetricColor } from '../lib/colors';
import HeatmapCell from './HeatmapCell';
import HolidayBadge from './HolidayBadge';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPHOON_LABEL: Record<string, string> = {
  none: '—', low: 'Low', moderate: 'Mod', high: 'High',
};

interface MetricRow {
  key: string;
  label: string;
  hint: string;
  lowerIsBetter: boolean;
}

const METRICS: MetricRow[] = [
  { key: 'overall',   label: 'Overall',   hint: '/10',  lowerIsBetter: false },
  { key: 'comfort',   label: 'Comfort',   hint: '/10',  lowerIsBetter: false },
  { key: 'crowds',    label: 'Crowds',    hint: '/10',  lowerIsBetter: true  },
  { key: 'rain_days', label: 'Rain days', hint: 'days', lowerIsBetter: true  },
  { key: 'typhoon',   label: 'Typhoon',   hint: 'risk', lowerIsBetter: true  },
];

interface Props {
  city: CityData;
  planningYear: number;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}

export default function Heatmap({ city, planningYear, selectedMonth, onSelectMonth }: Props) {
  const scores = useMemo(() => {
    return city.weather.map(w => {
      const comfort = computeComfortScore(w.heat_index_c, w.rain_days);
      const crowdEntry = city.arrivals.monthly_index.find(m => m.month === w.month);
      const crowd = crowdEntry?.normalized ?? 5;
      const monthHolidays = getHolidaysForMonth(city.holidays, w.month, planningYear);
      const penalty = getWorstHolidayPenalty(monthHolidays);
      const overall = computeOverallScore(comfort, crowd, penalty);
      const typhoon = typhoonRiskToScore(w.typhoon_risk);
      return { month: w.month, overall, comfort, crowds: crowd, rain_days: w.rain_days, typhoon };
    });
  }, [city, planningYear]);

  const valuesByMetric = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const m of METRICS) {
      out[m.key] = scores.map(s => s[m.key as keyof typeof s] as number);
    }
    return out;
  }, [scores]);

  // Pre-compute every cell's bgColor + displayValue so the render path
  // only reads from this matrix — no Math.min/max or string formatting per render.
  // Keyed as cellMatrix[metricIndex][monthIndex].
  const cellMatrix = useMemo(() => {
    return METRICS.map(metric =>
      scores.map((s, si) => {
        const rawValue = s[metric.key as keyof typeof s] as number;
        const bgColor = getMetricColor(rawValue, valuesByMetric[metric.key], metric.lowerIsBetter);
        let displayValue: string;
        if (metric.key === 'typhoon') {
          displayValue = TYPHOON_LABEL[city.weather[si]?.typhoon_risk ?? 'none'] ?? '—';
        } else {
          displayValue = String(rawValue % 1 === 0 ? rawValue : rawValue.toFixed(1));
        }
        return { month: s.month, bgColor, displayValue };
      })
    );
  }, [scores, valuesByMetric, city.weather]);

  // Stable callback so React.memo on HeatmapCell can skip re-renders.
  const handleCellSelect = useCallback((month: number) => {
    onSelectMonth(month);
  }, [onSelectMonth]);

  return (
    <div className="border border-slate-800/60 rounded-xl bg-slate-900/30 overflow-hidden">
    <div className="overflow-x-auto p-4 sm:p-5">
      <div className="min-w-[600px]">

        {/* Month headers */}
        <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-1">
          <div />
          {MONTH_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => onSelectMonth(i + 1)}
              className={`
                text-xs font-semibold text-center py-1.5 rounded transition-colors
                ${selectedMonth === i + 1 ? 'text-teal-400' : 'text-slate-600 hover:text-slate-300'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Holiday row */}
        <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-2">
          <div className="flex items-start pt-0.5">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest font-medium">Holidays</span>
          </div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <div key={month} className="px-0.5 cursor-pointer" onClick={() => onSelectMonth(month)}>
              <HolidayBadge holidays={getHolidaysForMonth(city.holidays, month, planningYear)} />
            </div>
          ))}
        </div>

        {/* Metric rows */}
        {METRICS.map((metric, mi) => (
          <div key={metric.key} className="grid grid-cols-[100px_repeat(12,1fr)] mb-px">
            <div className="flex flex-col justify-center pr-3">
              <span className={`text-xs font-medium ${metric.key === 'overall' ? 'text-white font-semibold' : 'text-slate-500'}`}>
                {metric.label}
              </span>
              <span className="text-[10px] text-slate-700">{metric.hint}</span>
            </div>
            {cellMatrix[mi].map(cell => (
              <HeatmapCell
                key={cell.month}
                month={cell.month}
                value={cell.displayValue}
                bgColor={cell.bgColor}
                isSelected={selectedMonth === cell.month}
                onSelect={handleCellSelect}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2.5 mt-5 ml-[100px]">
          <span className="text-[10px] text-slate-700 uppercase tracking-widest">Better</span>
          <div
            className="h-1.5 w-24 rounded-full"
            style={{
              background: 'linear-gradient(to right, rgb(20,184,166), rgb(247,247,247), rgb(244,63,94))'
            }}
          />
          <span className="text-[10px] text-slate-700 uppercase tracking-widest">Worse</span>
        </div>
      </div>
    </div>
    </div>
  );
}
