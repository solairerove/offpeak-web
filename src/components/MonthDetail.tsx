import type { CityData } from '../types';
import {
  computeComfortScore,
  computeOverallScore,
  getHolidaysForMonth,
  getWorstHolidayPenalty,
} from '../lib/scoring';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

interface Props {
  city: CityData;
  month: number;
  activeYears: number[];
  planningYear: number;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const parts = iso.split('-');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${monthNames[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

const CROWD_LABEL: Record<string, string> = {
  extreme:  'Extreme',
  very_high: 'Very High',
  high:     'High',
  moderate: 'Moderate',
  low:      'Low',
};

const CATEGORY_ICONS: Record<string, string> = {
  visa: '🛂',
  transport: '🚇',
  accommodation: '🏨',
  tips: '💡',
  weather: '🌤',
  aviation: '✈️',
};

const CROWD_COLOR: Record<string, string> = {
  extreme:  'text-red-400',
  very_high: 'text-orange-400',
  high:     'text-amber-400',
  moderate: 'text-yellow-400',
  low:      'text-green-400',
};

export default function MonthDetail({ city, month, activeYears, planningYear, onClose }: Props) {
  const w = city.weather.find(m => m.month === month);
  if (!w) return null;

  const comfort = computeComfortScore(w.heat_index_c, w.rain_days);
  const crowdEntry = city.arrivals.monthly_index.find(m => m.month === month);
  const crowd = crowdEntry?.normalized ?? 0;
  const holidays = getHolidaysForMonth(city.holidays, month, planningYear);
  const penalty = getWorstHolidayPenalty(holidays);
  const overall = computeOverallScore(comfort, crowd, penalty);

  const yearlyVisitors = city.arrivals.data
    .filter(d => d.month === month && activeYears.includes(d.year))
    .sort((a, b) => a.year - b.year);

  const maxVisitors = Math.max(...yearlyVisitors.map(v => v.visitors_thousands), 1);

  const typhoonLabel: Record<string, string> = {
    none: '—',
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
  };

  const overallColor =
    overall >= 7.5 ? 'text-blue-400' :
    overall >= 5.5 ? 'text-gray-200' :
    'text-red-400';

  return (
    <div className="p-5 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">{MONTHS[month - 1]}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{city.city}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-gray-600 hover:text-white transition-colors p-1.5 -mr-1 -mt-0.5 rounded-lg hover:bg-gray-800"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" strokeLinecap="round">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75"/>
          </svg>
        </button>
      </div>

      {/* Score card */}
      <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className={`text-4xl font-black tabular-nums ${overallColor}`}>{overall}</div>
            <div className="text-[10px] text-gray-600 mt-1.5 uppercase tracking-widest">Overall</div>
          </div>
          <div className="w-px h-10 bg-gray-700/60" />
          <div className="text-center">
            <div className="text-2xl font-black text-gray-300 tabular-nums">{comfort}</div>
            <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">Comfort</div>
          </div>
          <div className="w-px h-10 bg-gray-700/60" />
          <div className="text-center">
            <div className="text-2xl font-black text-gray-300 tabular-nums">{crowd.toFixed(1)}</div>
            <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">Crowds</div>
          </div>
        </div>
      </div>

      {/* Weather */}
      <section className="mb-5">
        <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3 font-semibold">Weather</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 mb-1">High</div>
            <div className="text-sm font-semibold text-white">{w.avg_high_c}°</div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 mb-1">Low</div>
            <div className="text-sm font-semibold text-white">{w.avg_low_c}°</div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 mb-1">Feels like</div>
            <div className="text-sm font-semibold text-white">{w.heat_index_c}°</div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 mb-1">Humidity</div>
            <div className="text-sm font-semibold text-white">{w.humidity_pct}%</div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 mb-1">Rain days</div>
            <div className="text-sm font-semibold text-white">{w.rain_days}</div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 mb-1">Rainfall</div>
            <div className="text-sm font-semibold text-white">{w.rainfall_mm}mm</div>
          </div>
          {w.typhoon_risk !== 'none' && (
            <div className="col-span-3 bg-gray-800/40 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-600 mb-1">Typhoon risk</div>
              <div className={`text-sm font-semibold ${
                w.typhoon_risk === 'high' ? 'text-red-400' :
                w.typhoon_risk === 'moderate' ? 'text-orange-400' :
                'text-yellow-400'
              }`}>
                {typhoonLabel[w.typhoon_risk]}
              </div>
            </div>
          )}
        </div>
        {w.notes && (
          <p className="mt-2.5 text-gray-600 text-xs leading-relaxed">{w.notes}</p>
        )}
      </section>

      {/* Holidays */}
      {holidays.length > 0 && (
        <section className="mb-5">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3 font-semibold">
            Holidays {planningYear}
          </h3>
          <div className="space-y-2">
            {holidays.map(h => {
              const occs = h.occurrences.filter(o => {
                if (o.year !== planningYear) return false;
                const { month_start: s, month_end: e } = o;
                if (s <= e) return month >= s && month <= e;
                return month >= s || month <= e;
              });
              return (
                <div key={h.id} className="bg-gray-800/40 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-white text-xs leading-tight">{h.name}</span>
                    <span className={`text-[10px] font-semibold shrink-0 ${CROWD_COLOR[h.crowd_impact] ?? 'text-gray-500'}`}>
                      {CROWD_LABEL[h.crowd_impact] ?? h.crowd_impact}
                    </span>
                  </div>
                  {occs.map(o => (
                    <div key={o.date_start} className="text-[10px] text-gray-500 mt-1">
                      {o.date_start === o.date_end
                        ? formatDate(o.date_start)
                        : `${formatDate(o.date_start)} – ${formatDate(o.date_end)}`}
                    </div>
                  ))}
                  {h.price_impact !== 'none' && (
                    <div className="text-[10px] text-gray-600 mt-1">Prices: {h.price_impact}</div>
                  )}
                  {h.closure_impact !== 'none' && (
                    <div className="text-[10px] text-gray-600 mt-0.5">Closures: {h.closure_impact}</div>
                  )}
                  {h.notes && (
                    <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">{h.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Visitor trend */}
      {yearlyVisitors.length > 0 && (
        <section className="mb-5">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3 font-semibold">Visitor trend</h3>
          <div className="space-y-2">
            {yearlyVisitors.map(d => (
              <div key={d.year} className="flex items-center gap-2.5">
                <span className="text-gray-600 text-[10px] w-8 shrink-0 tabular-nums">{d.year}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-1">
                  <div
                    className="bg-sky-500/70 h-1 rounded-full"
                    style={{ width: `${Math.round(d.visitors_thousands / maxVisitors * 100)}%` }}
                  />
                </div>
                <span className="text-gray-500 text-[10px] w-12 text-right shrink-0 tabular-nums">
                  {d.visitors_thousands >= 1000
                    ? `${(d.visitors_thousands / 1000).toFixed(1)}M`
                    : `${d.visitors_thousands}k`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {city.notes.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3 font-semibold">Notes</h3>
          <div className="space-y-2">
            {city.notes.map((n, i) => (
              <div key={i} className="flex gap-2.5 text-xs leading-relaxed">
                <span className="shrink-0">{CATEGORY_ICONS[n.category] ?? '📌'}</span>
                <p className="text-gray-400">{n.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
