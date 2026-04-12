import { useState, useMemo, useEffect, useRef } from 'react';
import { fetchCities, fetchCity } from './api';
import {
  computeMonthlyIndex,
  computeComfortScore,
  computeOverallScore,
  getHolidaysForMonth,
  getWorstHolidayPenalty,
} from './lib/scoring';
import CitySelector from './components/CitySelector';
import YearRangeSelector from './components/YearRangeSelector';
import PlanningYearSelector from './components/PlanningYearSelector';
import Heatmap from './components/Heatmap';
import MonthDetail from './components/MonthDetail';
import type { CityData } from './types';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [planningYear, setPlanningYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      try {
        const slugs = await fetchCities();
        const allCities = await Promise.all(slugs.map(fetchCity));
        setCities(allCities);
        setSelectedCitySlug(allCities[0].slug);
        setSelectedYears(allCities[0].arrivals.years);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const city = cities.find(c => c.slug === selectedCitySlug);

  const availablePlanningYears = useMemo(() => {
    const yearSet = new Set<number>();
    for (const c of cities) {
      for (const h of c.holidays) {
        for (const o of h.occurrences) yearSet.add(o.year);
      }
    }
    return Array.from(yearSet).sort();
  }, [cities]);

  const cityWithDynamicArrivals = useMemo(() => {
    if (!city) return null;
    const monthly_index = computeMonthlyIndex(city.arrivals.data, selectedYears);
    return { ...city, arrivals: { ...city.arrivals, monthly_index } };
  }, [city, selectedYears]);

  const monthSummary = useMemo(() => {
    if (!cityWithDynamicArrivals) return { best: [] as string[], avoid: [] as string[] };
    const scored = cityWithDynamicArrivals.weather.map(w => {
      const comfort = computeComfortScore(w.heat_index_c, w.rain_days);
      const crowdEntry = cityWithDynamicArrivals.arrivals.monthly_index.find(m => m.month === w.month);
      const crowd = crowdEntry?.normalized ?? 5;
      const monthHols = getHolidaysForMonth(cityWithDynamicArrivals.holidays, w.month, planningYear);
      const penalty = getWorstHolidayPenalty(monthHols);
      const overall = computeOverallScore(comfort, crowd, penalty);
      return { month: w.month, overall };
    }).sort((a, b) => b.overall - a.overall);
    const best = scored.slice(0, 3).sort((a, b) => a.month - b.month).map(s => MONTH_SHORT[s.month - 1]);
    const avoid = scored.slice(-2).sort((a, b) => a.month - b.month).map(s => MONTH_SHORT[s.month - 1]);
    return { best, avoid };
  }, [cityWithDynamicArrivals, planningYear]);

  function handleCityChange(slug: string) {
    setSelectedCitySlug(slug);
    setSelectedMonth(null);
    const newCity = cities.find(c => c.slug === slug)!;
    setSelectedYears(newCity.arrivals.years);
  }

  function handleSelectMonth(m: number) {
    const next = selectedMonth === m ? null : m;
    setSelectedMonth(next);
    if (next !== null) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tighter text-white mb-4">offpeak</div>
          <div className="flex gap-1.5 justify-center">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !city || !cityWithDynamicArrivals) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tighter text-white mb-3">offpeak</div>
          <p className="text-rose-400 text-sm">{error ?? 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  const sharedProps = {
    city: cityWithDynamicArrivals,
    month: selectedMonth!,
    activeYears: selectedYears,
    planningYear,
    onClose: () => setSelectedMonth(null),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ─── Sticky nav ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-3">
          <span className="text-base font-black tracking-tighter text-white shrink-0">offpeak</span>
          <span className="text-[9px] text-teal-600 border border-teal-900/80 px-1.5 py-0.5 rounded-full font-medium tracking-widest uppercase shrink-0">
            beta
          </span>
          <div className="w-px h-4 bg-slate-800 shrink-0" />
          <CitySelector cities={cities} selected={selectedCitySlug} onSelect={handleCityChange} />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <YearRangeSelector years={city.arrivals.years} selected={selectedYears} onSelect={setSelectedYears} />
            <div className="w-px h-4 bg-slate-800 shrink-0 hidden sm:block" />
            <PlanningYearSelector years={availablePlanningYears} selected={planningYear} onSelect={setPlanningYear} />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-20">

        {/* ─── City hero ───────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-4 mb-10">
          <div className="flex items-stretch gap-4 min-w-0">
            <div className="w-[3px] rounded-full bg-teal-500 shrink-0 self-stretch" />
            <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none">
              {city.city}
            </h2>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 pb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Best</span>
              <div className="flex gap-1">
                {monthSummary.best.map(m => (
                  <span key={m} className="text-[10px] font-bold text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Skip</span>
              <div className="flex gap-1">
                {monthSummary.avoid.map(m => (
                  <span key={m} className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Heatmap ─────────────────────────────────────────── */}
        <Heatmap
          city={cityWithDynamicArrivals}
          planningYear={planningYear}
          selectedMonth={selectedMonth}
          onSelectMonth={handleSelectMonth}
        />

        {/* ─── Desktop: full-width detail panel ────────────────── */}
        {selectedMonth !== null && (
          <div ref={detailRef} className="hidden lg:block mt-6">
            <div className="border border-slate-800/60 rounded-2xl bg-slate-900/30 p-7">
              <MonthDetail {...sharedProps} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile: bottom sheet ────────────────────────────── */}
      {selectedMonth !== null && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
            onClick={() => setSelectedMonth(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800/60 max-h-[88vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-8 h-1 bg-slate-700 rounded-full" />
            </div>
            <div className="overflow-y-auto flex-1 pb-safe">
              <MonthDetail {...sharedProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
