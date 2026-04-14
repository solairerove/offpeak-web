import type { CityData } from '../types';
import { getHolidaysForMonth } from '../lib/holidays';
import { MONTH_SHORT, MONTH_FULL } from '../lib/constants';

interface Props {
  city: CityData;
  month: number;
  activeYears: number[];
  planningYear: number;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const parts = iso.split('-');
  return `${MONTH_SHORT[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

const CROWD_LABEL: Record<string, string> = {
  extreme:  'Extreme',
  very_high: 'Very High',
  high:     'High',
  moderate: 'Moderate',
  low:      'Low',
};

const CROWD_COLOR: Record<string, string> = {
  extreme:  'text-rose-400',
  very_high: 'text-orange-400',
  high:     'text-amber-400',
  moderate: 'text-yellow-400',
  low:      'text-teal-400',
};

const CATEGORY_ICONS: Record<string, string> = {
  visa: '🛂',
  transport: '🚇',
  accommodation: '🏨',
  tips: '💡',
  weather: '🌤',
  aviation: '✈️',
};

function WeatherItem({ label, value, highlight, span }: {
  label: string; value: string; highlight?: string; span?: boolean;
}) {
  return (
    <div className={`bg-slate-800/50 rounded-lg p-2.5 ${span ? 'col-span-2' : ''}`}>
      <div className="text-[10px] text-slate-600 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${highlight ?? 'text-white'}`}>{value}</div>
    </div>
  );
}

export default function MonthDetail({ city, month, activeYears, planningYear, onClose }: Props) {
  const w = city.weather.find(m => m.month === month);
  if (!w) return null;

  const ms = city.monthly_scores.find(s => s.month === month);
  const overall = ms?.overall ?? 0;
  const comfort = ms?.comfort ?? 0;
  const crowd = ms?.crowd_index ?? 0;
  const priceIndex = ms?.price_index ?? null;

  const holidays = getHolidaysForMonth(city.holidays, month, planningYear);

  const yearlyVisitors = city.arrivals.data
    .filter(d => d.month === month && activeYears.includes(d.year))
    .sort((a, b) => a.year - b.year);
  const maxVisitors = Math.max(...yearlyVisitors.map(v => v.visitors_thousands), 1);

  const typhoonLabel: Record<string, string> = {
    none: '—', low: 'Low', moderate: 'Moderate', high: 'High',
  };
  const typhoonColor: Record<string, string> = {
    high: 'text-rose-400', moderate: 'text-orange-400', low: 'text-yellow-400',
  };

  const overallColor =
    overall >= 7.5 ? 'text-teal-400' :
    overall >= 5.5 ? 'text-slate-100' :
    'text-rose-400';

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12 p-5 lg:p-0">

        {/* ── Col 1: Month + Score ─────────────────────────── */}
        <div className="mb-6 lg:mb-0">
          {/* header: desktop only (mobile has sticky header in the sheet) */}
          <div className="hidden lg:flex items-start justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">{MONTH_FULL[month - 1]}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{city.city} · {planningYear}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-600 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 shrink-0 ml-3"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75"/>
              </svg>
            </button>
          </div>

          <div className={`text-5xl lg:text-8xl font-black tabular-nums leading-none ${overallColor}`}>
            {overall.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-2 mb-6 lg:mb-8">
            Overall score
          </div>

          <div className="flex items-start gap-6">
            <div>
              <div className="text-2xl lg:text-3xl font-black text-slate-300 tabular-nums">{comfort}</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-1.5">Comfort</div>
            </div>
            <div className="w-px self-stretch bg-slate-800" />
            <div>
              <div className="text-2xl lg:text-3xl font-black text-slate-300 tabular-nums">{crowd.toFixed(1)}</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-1.5">Crowds</div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-800/60">
            {priceIndex !== null ? (() => {
              const delta = Math.round(priceIndex - 100);
              const deltaLabel = delta === 0 ? 'avg' : delta > 0 ? `+${delta}%` : `${delta}%`;
              const deltaClass = delta === 0 ? 'text-slate-500' : delta > 0 ? 'text-rose-400' : 'text-teal-400';
              return (
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <div className="text-2xl lg:text-3xl font-black text-slate-300 tabular-nums">
                      {Math.round(priceIndex)}
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${deltaClass}`}>
                      {deltaLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-widest mt-1.5">Price index</div>
                </div>
              );
            })() : (
              <div className="text-sm text-slate-600">Price: no data</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800/60 mb-6 lg:hidden" />

        {/* ── Col 2: Weather + Visitors ────────────────────── */}
        <div className="mb-6 lg:mb-0">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-600 mb-3 font-semibold">Weather</h3>
          <div className="grid grid-cols-2 gap-2">
            <WeatherItem label="High" value={`${w.avg_high_c}°C`} />
            <WeatherItem label="Low" value={`${w.avg_low_c}°C`} />
            <WeatherItem label="Feels like" value={`${w.heat_index_c}°C`} />
            <WeatherItem label="Humidity" value={`${w.humidity_pct}%`} />
            <WeatherItem label="Rain days" value={String(w.rain_days)} />
            <WeatherItem label="Rainfall" value={`${w.rainfall_mm}mm`} />
            {w.typhoon_risk !== 'none' && (
              <WeatherItem
                label="Typhoon risk"
                value={typhoonLabel[w.typhoon_risk]}
                highlight={typhoonColor[w.typhoon_risk]}
                span
              />
            )}
          </div>
          {w.notes && (
            <p className="mt-3 text-slate-600 text-xs leading-relaxed">{w.notes}</p>
          )}

          {yearlyVisitors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-600 mb-3 font-semibold">Visitor trend</h3>
              <div className="space-y-2">
                {yearlyVisitors.map(d => (
                  <div key={d.year} className="flex items-center gap-2.5">
                    <span className="text-slate-600 text-[10px] w-8 shrink-0 tabular-nums">{d.year}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1">
                      <div
                        className="bg-teal-500/50 h-1 rounded-full"
                        style={{ width: `${Math.round(d.visitors_thousands / maxVisitors * 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-500 text-[10px] w-12 text-right shrink-0 tabular-nums">
                      {d.visitors_thousands >= 1000
                        ? `${(d.visitors_thousands / 1000).toFixed(1)}M`
                        : `${d.visitors_thousands}k`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/60 mb-6 lg:hidden" />

        {/* ── Col 3: Holidays + Notes ──────────────────────── */}
        <div>
          {holidays.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-600 mb-3 font-semibold">
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
                    <div key={h.id} className="bg-slate-800/40 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-white text-xs leading-tight">{h.name}</span>
                        <span className={`text-[10px] font-semibold shrink-0 ${CROWD_COLOR[h.crowd_impact] ?? 'text-slate-500'}`}>
                          {CROWD_LABEL[h.crowd_impact] ?? h.crowd_impact}
                        </span>
                      </div>
                      {occs.map(o => (
                        <div key={o.date_start} className="text-[10px] text-slate-500 mt-1">
                          {o.date_start === o.date_end
                            ? formatDate(o.date_start)
                            : `${formatDate(o.date_start)} – ${formatDate(o.date_end)}`}
                        </div>
                      ))}
                      {h.price_impact !== 'none' && (
                        <div className="text-[10px] text-slate-600 mt-1">Prices: {h.price_impact}</div>
                      )}
                      {h.closure_impact !== 'none' && (
                        <div className="text-[10px] text-slate-600 mt-0.5">Closures: {h.closure_impact}</div>
                      )}
                      {h.notes && (
                        <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">{h.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {city.notes.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-widest text-slate-600 mb-3 font-semibold">Notes</h3>
              <div className="space-y-2">
                {city.notes.map((n, i) => (
                  <div key={i} className="flex gap-2.5 text-xs leading-relaxed">
                    <span className="shrink-0">{CATEGORY_ICONS[n.category] ?? '📌'}</span>
                    <p className="text-slate-400">{n.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}
