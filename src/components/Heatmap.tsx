import { useMemo } from 'react';
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
  none: '—',
  low: 'Low',
  moderate: 'Mod',
  high: 'High',
};

interface MetricRow {
  key: string;
  label: string;
  hint: string;
  lowerIsBetter: boolean;
}

const METRICS: MetricRow[] = [
  { key: 'overall',   label: 'Overall',   hint: '1–10',  lowerIsBetter: false },
  { key: 'comfort',   label: 'Comfort',   hint: '1–10',  lowerIsBetter: false },
  { key: 'crowds',    label: 'Crowds',    hint: '1–10',  lowerIsBetter: true  },
  { key: 'rain_days', label: 'Rain Days', hint: 'days',  lowerIsBetter: true  },
  { key: 'typhoon',   label: 'Typhoon',   hint: 'risk',  lowerIsBetter: true  },
];

interface Props {
  city: CityData;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}

export default function Heatmap({ city, selectedMonth, onSelectMonth }: Props) {
  const scores = useMemo(() => {
    return city.weather.map(w => {
      const comfort = computeComfortScore(w.heat_index_c, w.rain_days);
      const crowdEntry = city.arrivals.monthly_index.find(m => m.month === w.month);
      const crowd = crowdEntry?.normalized ?? 5;
      const monthHolidays = getHolidaysForMonth(city.holidays, w.month);
      const penalty = getWorstHolidayPenalty(monthHolidays);
      const overall = computeOverallScore(comfort, crowd, penalty);
      const typhoon = typhoonRiskToScore(w.typhoon_risk);
      return { month: w.month, overall, comfort, crowds: crowd, rain_days: w.rain_days, typhoon };
    });
  }, [city]);

  const valuesByMetric = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const m of METRICS) {
      out[m.key] = scores.map(s => s[m.key as keyof typeof s] as number);
    }
    return out;
  }, [scores]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Column headers */}
        <div className="grid grid-cols-[120px_repeat(12,1fr)] mb-1">
          <div /> {/* row label spacer */}
          {MONTH_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => onSelectMonth(i + 1)}
              className={`
                text-xs font-semibold text-center py-1 rounded-sm transition-colors
                ${selectedMonth === i + 1 ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Holiday row */}
        <div className="grid grid-cols-[120px_repeat(12,1fr)] mb-2">
          <div className="flex items-start pt-0.5">
            <span className="text-xs text-gray-600 uppercase tracking-wider">Holidays</span>
          </div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <div
              key={month}
              className="px-0.5 cursor-pointer"
              onClick={() => onSelectMonth(month)}
            >
              <HolidayBadge holidays={getHolidaysForMonth(city.holidays, month)} />
            </div>
          ))}
        </div>

        {/* Metric rows */}
        {METRICS.map(metric => (
          <div key={metric.key} className="grid grid-cols-[120px_repeat(12,1fr)] mb-0.5">
            <div className="flex flex-col justify-center pr-3">
              <span className="text-xs font-medium text-gray-300">{metric.label}</span>
              <span className="text-[10px] text-gray-600">{metric.hint}</span>
            </div>
            {scores.map(s => {
              const rawValue = s[metric.key as keyof typeof s] as number;
              const bg = getMetricColor(rawValue, valuesByMetric[metric.key], metric.lowerIsBetter);

              let displayValue: string;
              if (metric.key === 'typhoon') {
                const w = city.weather.find(w => w.month === s.month);
                displayValue = TYPHOON_LABEL[w?.typhoon_risk ?? 'none'] ?? '—';
              } else {
                displayValue = String(rawValue % 1 === 0 ? rawValue : rawValue.toFixed(1));
              }

              return (
                <HeatmapCell
                  key={s.month}
                  value={displayValue}
                  bgColor={bg}
                  isSelected={selectedMonth === s.month}
                  onClick={() => onSelectMonth(s.month)}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 ml-[120px]">
          <span className="text-xs text-gray-600">Better</span>
          <div
            className="h-2 w-32 rounded"
            style={{
              background: 'linear-gradient(to right, rgb(69,117,180), rgb(247,247,247), rgb(215,48,39))'
            }}
          />
          <span className="text-xs text-gray-600">Worse</span>
        </div>
      </div>
    </div>
  );
}
