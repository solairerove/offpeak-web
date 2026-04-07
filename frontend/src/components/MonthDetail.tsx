import type { CityData } from '../types';
import { computeComfortScore, getHolidaysForMonth } from '../lib/scoring';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

interface Props {
  city: CityData;
  month: number;
  activeYears: number[];
  onClose: () => void;
}

const CROWD_LABEL: Record<string, string> = {
  extreme: '🔴 Extreme',
  very_high: '🟠 Very High',
  high: '🟡 High',
  moderate: '🟡 Moderate',
  low: '🟢 Low',
};

const CATEGORY_ICONS: Record<string, string> = {
  visa: '🛂',
  transport: '🚇',
  accommodation: '🏨',
  tips: '💡',
  weather: '🌤',
  aviation: '✈️',
};

export default function MonthDetail({ city, month, activeYears, onClose }: Props) {
  const w = city.weather.find(m => m.month === month);
  if (!w) return null;

  const comfort = computeComfortScore(w.heat_index_c, w.rain_days);
  const crowdEntry = city.arrivals.monthly_index.find(m => m.month === month);
  const crowd = crowdEntry?.normalized ?? 0;

  const yearlyVisitors = city.arrivals.data
    .filter(d => d.month === month && activeYears.includes(d.year))
    .sort((a, b) => a.year - b.year);

  const holidays = getHolidaysForMonth(city.holidays, month);

  const typhoonLabel: Record<string, string> = {
    none: '—',
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 text-sm h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">
          {MONTHS[month - 1]}
          <span className="text-gray-400 font-normal ml-2 text-sm">{city.city}</span>
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Weather */}
      <section className="mb-5">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Weather</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-gray-300">
          <div><span className="text-gray-500">High</span> <span className="font-medium text-white">{w.avg_high_c}°C</span></div>
          <div><span className="text-gray-500">Low</span> <span className="font-medium text-white">{w.avg_low_c}°C</span></div>
          <div><span className="text-gray-500">Humidity</span> <span className="font-medium text-white">{w.humidity_pct}%</span></div>
          <div><span className="text-gray-500">Rainfall</span> <span className="font-medium text-white">{w.rainfall_mm}mm</span></div>
          <div><span className="text-gray-500">Rain days</span> <span className="font-medium text-white">{w.rain_days}</span></div>
          <div><span className="text-gray-500">Heat index</span> <span className="font-medium text-white">{w.heat_index_c}°C</span></div>
          <div className="col-span-2"><span className="text-gray-500">Typhoon</span> <span className="font-medium text-white">{typhoonLabel[w.typhoon_risk] ?? w.typhoon_risk}</span></div>
        </div>
        {w.notes && (
          <p className="mt-2 text-gray-400 italic text-xs">{w.notes}</p>
        )}
      </section>

      {/* Scores */}
      <section className="mb-5">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Scores</h3>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{comfort}</div>
            <div className="text-xs text-gray-500">Comfort</div>
            <div className="text-xs text-gray-600">/10</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{crowd.toFixed(1)}</div>
            <div className="text-xs text-gray-500">Crowds</div>
            <div className="text-xs text-gray-600">/10</div>
          </div>
        </div>
      </section>

      {/* Arrivals by year */}
      {yearlyVisitors.length > 0 && (
        <section className="mb-5">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Visitors</h3>
          <div className="space-y-1">
            {yearlyVisitors.map(d => (
              <div key={d.year} className="flex items-center gap-2">
                <span className="text-gray-500 w-10">{d.year}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-sky-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.round(d.visitors_thousands / Math.max(...yearlyVisitors.map(v => v.visitors_thousands)) * 100)}%`
                    }}
                  />
                </div>
                <span className="text-gray-300 text-xs w-16 text-right">
                  {d.visitors_thousands >= 1000
                    ? `${(d.visitors_thousands / 1000).toFixed(1)}M`
                    : `${d.visitors_thousands}k`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Holidays */}
      {holidays.length > 0 && (
        <section className="mb-5">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Holidays</h3>
          <div className="space-y-3">
            {holidays.map(h => (
              <div key={h.name} className="border-l-2 border-gray-600 pl-3">
                <div className="font-medium text-white">{h.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                  <div>Crowds: {CROWD_LABEL[h.crowd_impact] ?? h.crowd_impact}</div>
                  {h.price_impact !== 'none' && <div>Prices: {h.price_impact}</div>}
                  {h.closure_impact !== 'none' && <div>Closures: {h.closure_impact}</div>}
                  {h.notes && <div className="italic mt-1 text-gray-500">{h.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {city.notes.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Notes</h3>
          <div className="space-y-2">
            {city.notes.map((n, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0">{CATEGORY_ICONS[n.category] ?? '📌'}</span>
                <p className="text-gray-400 text-xs leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
