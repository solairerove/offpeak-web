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
  { key: 'overall',   label: 'Overall',   hint: '/10',   lowerIsBetter: false },
  { key: 'comfort',   label: 'Comfort',   hint: '/10',   lowerIsBetter: false },
  { key: 'crowds',    label: 'Crowds',    hint: '/10',   lowerIsBetter: true  },
  { key: 'rain_days', label: 'Rain days', hint: 'days',  lowerIsBetter: true  },
  { key: 'typhoon',   label: 'Typhoon',   hint: 'risk',  lowerIsBetter: true  },
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

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="min-w-[640px]">

        {/* Column headers */}
        <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-1">
          <div />
          {MONTH_LABELS.map((label, i) => {
            const isSelected = selectedMonth === i + 1;
            return (
              <button
                key={label}
                onClick={() => onSelectMonth(i + 1)}
                className={`
                  text-xs font-semibold text-center py-1.5 rounded transition-colors
                  ${isSelected
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-300'
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Holiday row */}
        <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-2">
          <div className="flex items-start pt-0.5">
            <span className="text-[10px] text-gray-700 uppercase tracking-widest font-medium">Holidays</span>
          </div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <div
              key={month}
              className="px-0.5 cursor-pointer"
              onClick={() => onSelectMonth(month)}
            >
              <HolidayBadge holidays={getHolidaysForMonth(city.holidays, month, planningYear)} />
            </div>
          ))}
        </div>

        {/* Metric rows */}
        {METRICS.map(metric => (
          <div key={metric.key} className="grid grid-cols-[100px_repeat(12,1fr)] mb-px">
            <div className="flex flex-col justify-center pr-3">
              <span className={`text-xs font-medium ${metric.key === 'overall' ? 'text-white font-semibold' : 'text-gray-500'}`}>
                {metric.label}
              </span>
              <span className="text-[10px] text-gray-700">{metric.hint}</span>
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
        <div className="flex items-center gap-2.5 mt-5 ml-[100px]">
          <span className="text-[10px] text-gray-700 uppercase tracking-widest">Better</span>
          <div
            className="h-1.5 w-24 rounded-full"
            style={{
              background: 'linear-gradient(to right, rgb(69,117,180), rgb(247,247,247), rgb(215,48,39))'
            }}
          />
          <span className="text-[10px] text-gray-700 uppercase tracking-widest">Worse</span>
        </div>
      </div>
    </div>
  );
}
