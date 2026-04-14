import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { fetchCities, fetchCity } from './api';
import CitySelector from './components/CitySelector';
import YearRangeSelector from './components/YearRangeSelector';
import PlanningYearSelector from './components/PlanningYearSelector';
import Heatmap from './components/Heatmap';
import MobileMonthList from './components/MobileMonthList';
import MonthDetail from './components/MonthDetail';
import type { CityData, CityListItem } from './types';
import { MONTH_SHORT, MONTH_FULL } from './lib/constants';

export default function App() {
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [cityCache, setCityCache] = useState<Record<string, CityData>>({});
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [planningYear, setPlanningYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cityLoading, setCityLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  // Last successfully loaded data for the current slug — shown while re-fetching
  // new params so the UI never goes blank on planningYear / year-range changes.
  const [staleCity, setStaleCity] = useState<CityData | undefined>();
  const detailRef = useRef<HTMLDivElement>(null);

  // Ref-sync: lets effects read the latest cache without adding cityCache to deps
  const cityCacheRef = useRef<Record<string, CityData>>({});
  cityCacheRef.current = cityCache;

  // Derive year range params — undefined when no years selected (= all years on backend)
  const yearFrom = selectedYears.length > 0 ? Math.min(...selectedYears) : undefined;
  const yearTo   = selectedYears.length > 0 ? Math.max(...selectedYears) : undefined;
  const cacheKey = `${selectedCitySlug}:${planningYear}:${yearFrom ?? ''}:${yearTo ?? ''}`;

  // ── Fetch city list on mount ─────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function init() {
      try {
        const fetchedCities = await fetchCities(signal);
        if (fetchedCities.length === 0) throw new Error('No cities available');
        setCities(fetchedCities);
        setSelectedCitySlug(fetchedCities[0].slug);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setInitError(e instanceof Error ? e.message : 'Failed to load cities');
      } finally {
        if (!signal.aborted) setInitialLoading(false);
      }
    }

    init();
    return () => controller.abort();
  }, []);

  // ── Load city data; re-fetch when slug, planningYear, or year range changes ─
  useEffect(() => {
    if (!selectedCitySlug) return;

    if (cityCacheRef.current[cacheKey]) {
      // Cache hit — ensure selectedYears are populated if this is post-city-switch
      const cached = cityCacheRef.current[cacheKey];
      if (selectedYears.length === 0) setSelectedYears(cached.arrivals.years);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    setCityLoading(true);
    setCityError(null);

    fetchCity(selectedCitySlug, planningYear, yearFrom, yearTo, signal)
      .then(data => {
        if (signal.aborted) return;
        setCityCache(prev => {
          const next = { ...prev, [cacheKey]: data };
          // Pre-warm the full-range key so the second render (after selectedYears
          // populates) hits the cache instead of triggering another fetch.
          if (!yearFrom && !yearTo && data.arrivals.years.length > 0) {
            const yr = data.arrivals.years;
            const fullKey = `${selectedCitySlug}:${planningYear}:${Math.min(...yr)}:${Math.max(...yr)}`;
            next[fullKey] = data;
          }
          return next;
        });
        setStaleCity(data);
        if (selectedYears.length === 0) setSelectedYears(data.arrivals.years);
        setCityLoading(false);
      })
      .catch(e => {
        if (signal.aborted) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setCityError(e instanceof Error ? e.message : 'Failed to load city data');
        setCityLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // ── Escape to close detail ───────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedMonth(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Scroll to detail panel when month selected ───────────────
  useEffect(() => {
    if (selectedMonth !== null) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedMonth]);

  const city = selectedCitySlug ? cityCache[cacheKey] : undefined;
  // Show stale data while re-fetching so the UI never goes blank on param changes.
  const displayCity = city ?? staleCity;
  // True when we're refetching with new params but have old data to show.
  const isRefetching = !city && !!staleCity && cityLoading;
  // True only on the very first load for a slug (nothing to show yet).
  const showSkeleton  = cityLoading && !displayCity;

  // ── Dynamic page title ───────────────────────────────────────
  useEffect(() => {
    document.title = displayCity ? `offpeak — ${displayCity.city}` : 'offpeak';
  }, [displayCity]);

  const cityList = useMemo(
    () => cities.map(c => ({ slug: c.slug, city: c.name })),
    [cities],
  );

  const availablePlanningYears = useMemo(() => {
    const yearSet = new Set<number>();
    for (const cityData of Object.values(cityCache)) {
      for (const h of cityData.holidays) {
        for (const o of h.occurrences) yearSet.add(o.year);
      }
    }
    return Array.from(yearSet).sort();
  }, [cityCache]);

  const monthSummary = useMemo(() => {
    if (!displayCity) return { best: [] as string[], avoid: [] as string[] };
    const sorted = [...displayCity.monthly_scores].sort((a, b) => b.overall - a.overall);
    const best  = sorted.slice(0, 3).sort((a, b) => a.month - b.month).map(s => MONTH_SHORT[s.month - 1]);
    const avoid = sorted.slice(-2).sort((a, b) => a.month - b.month).map(s => MONTH_SHORT[s.month - 1]);
    return { best, avoid };
  }, [displayCity]);

  function handleCityChange(slug: string) {
    if (slug === selectedCitySlug) return;
    setSelectedCitySlug(slug);
    setSelectedMonth(null);
    setSelectedYears([]);
    // Seed staleCity with any previously loaded data for this slug so the UI
    // can show something immediately if we've visited it before; otherwise
    // clear it so the full skeleton renders.
    const prev = Object.entries(cityCacheRef.current).find(([k]) => k.startsWith(`${slug}:`));
    setStaleCity(prev?.[1]);
  }

  const handleSelectMonth = useCallback((m: number) => {
    setSelectedMonth(prev => prev === m ? null : m);
  }, []);

  // ── Initial loading (city list fetch) ────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 animate-pulse">
        {/* Nav skeleton */}
        <nav className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
          <div className="max-w-6xl mx-auto px-4">
            <div className="h-12 flex items-center gap-3">
              <div className="w-16 h-4 bg-slate-800 rounded" />
              <div className="w-px h-4 bg-slate-800 shrink-0" />
              <div className="flex gap-1.5">
                {[72, 56, 64, 80].map((w, i) => (
                  <div key={i} className="h-6 bg-slate-800 rounded-md" style={{ width: w }} />
                ))}
              </div>
              <div className="ml-auto hidden lg:flex items-center gap-1.5">
                {[36, 36, 36].map((w, i) => (
                  <div key={i} className="h-6 bg-slate-800 rounded-md" style={{ width: w }} />
                ))}
                <div className="w-px h-4 bg-slate-800 mx-1.5" />
                {[48, 48].map((w, i) => (
                  <div key={i} className="h-6 bg-slate-800 rounded-md" style={{ width: w }} />
                ))}
              </div>
            </div>
            <div className="lg:hidden border-t border-slate-800/40 h-10 flex items-center gap-1.5 overflow-hidden">
              {[36, 36, 36, 'px', 48, 48].map((w, i) =>
                w === 'px'
                  ? <div key={i} className="w-px h-4 bg-slate-800 shrink-0 mx-1" />
                  : <div key={i} className="h-5 bg-slate-800 rounded-md shrink-0" style={{ width: w as number }} />
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 pt-10 pb-20">
          {/* Hero skeleton */}
          <div className="flex items-end justify-between gap-4 mb-10">
            <div className="flex items-stretch gap-4 min-w-0">
              <div className="w-[3px] rounded-full bg-slate-800 self-stretch" />
              <div className="h-14 sm:h-16 w-56 bg-slate-800 rounded-lg" />
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0 pb-1">
              <div className="flex gap-1">
                {[1,2,3].map(i => <div key={i} className="w-9 h-5 bg-slate-800 rounded" />)}
              </div>
              <div className="flex gap-1">
                {[1,2].map(i => <div key={i} className="w-9 h-5 bg-slate-800 rounded" />)}
              </div>
            </div>
          </div>

          {/* Desktop heatmap skeleton */}
          <div className="hidden lg:block border border-slate-800/60 rounded-xl bg-slate-900/30 overflow-hidden p-5">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-1">
                <div />
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-6 mx-0.5 bg-slate-800 rounded" />
                ))}
              </div>
              <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-2">
                <div className="h-3 w-14 bg-slate-800 rounded self-center" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-4 mx-0.5 bg-slate-800/50 rounded" />
                ))}
              </div>
              {[1,2,3,4,5].map(row => (
                <div key={row} className="grid grid-cols-[100px_repeat(12,1fr)] mb-px">
                  <div className="flex flex-col gap-1 justify-center pr-3">
                    <div className="h-3 w-14 bg-slate-800 rounded" />
                    <div className="h-2 w-8 bg-slate-800/60 rounded" />
                  </div>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-10 mx-px bg-slate-800 rounded" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile month list skeleton */}
          <div className="lg:hidden space-y-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-800/30 rounded-xl border border-l-[3px] border-transparent border-l-slate-700" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Fatal error (city list could not be fetched) ─────────────
  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tighter text-white mb-3">offpeak</div>
          <p className="text-rose-400 text-sm">{initError}</p>
        </div>
      </div>
    );
  }

  const sharedProps = displayCity ? {
    city: displayCity,
    month: selectedMonth!,
    activeYears: selectedYears,
    planningYear,
    onClose: () => setSelectedMonth(null),
  } : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ─── Sticky nav ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4">
          {/* Row 1: logo + city selector + (desktop) year controls */}
          <div className="h-12 flex items-center gap-3">
            <span className="text-base font-black tracking-tighter text-white shrink-0">offpeak</span>
            <span className="text-[9px] text-teal-600 border border-teal-900/80 px-1.5 py-0.5 rounded-full font-medium tracking-widest uppercase shrink-0">
              beta
            </span>
            <div className="w-px h-4 bg-slate-800 shrink-0" />
            <CitySelector
              cities={cityList}
              selected={selectedCitySlug}
              onSelect={handleCityChange}
              loadingSlug={cityLoading ? selectedCitySlug : null}
            />
            {/* Desktop only — year selectors stay on the same row */}
            {displayCity && (
              <div className="ml-auto hidden lg:flex items-center gap-3">
                <YearRangeSelector years={displayCity.arrivals.years} selected={selectedYears} onSelect={setSelectedYears} />
                <div className="w-px h-4 bg-slate-800 shrink-0" />
                <PlanningYearSelector years={availablePlanningYears} selected={planningYear} onSelect={setPlanningYear} />
              </div>
            )}
          </div>
          {/* Row 2: mobile only — year selectors on their own scrollable row */}
          {displayCity && (
            <div className="lg:hidden border-t border-slate-800/40 h-10 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <YearRangeSelector years={displayCity.arrivals.years} selected={selectedYears} onSelect={setSelectedYears} />
              <div className="w-px h-4 bg-slate-800 shrink-0" />
              <PlanningYearSelector years={availablePlanningYears} selected={planningYear} onSelect={setPlanningYear} />
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-20">

        {showSkeleton ? (
          /* ─── Per-city loading skeleton (first load only) ────── */
          <div className="animate-pulse">
            <div className="flex items-end justify-between gap-4 mb-10">
              <div className="flex items-stretch gap-4 min-w-0">
                <div className="w-[3px] rounded-full bg-slate-800 self-stretch" />
                <div className="h-14 sm:h-16 w-56 bg-slate-800 rounded-lg" />
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0 pb-1">
                <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className="w-9 h-5 bg-slate-800 rounded" />)}
                </div>
                <div className="flex gap-1">
                  {[1,2].map(i => <div key={i} className="w-9 h-5 bg-slate-800 rounded" />)}
                </div>
              </div>
            </div>
            <div className="hidden lg:block border border-slate-800/60 rounded-xl bg-slate-900/30 overflow-hidden p-5">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-1">
                  <div />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-6 mx-0.5 bg-slate-800 rounded" />
                  ))}
                </div>
                <div className="grid grid-cols-[100px_repeat(12,1fr)] mb-2">
                  <div className="h-3 w-14 bg-slate-800 rounded self-center" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-4 mx-0.5 bg-slate-800/50 rounded" />
                  ))}
                </div>
                {[1,2,3,4,5].map(row => (
                  <div key={row} className="grid grid-cols-[100px_repeat(12,1fr)] mb-px">
                    <div className="flex flex-col gap-1 justify-center pr-3">
                      <div className="h-3 w-14 bg-slate-800 rounded" />
                      <div className="h-2 w-8 bg-slate-800/60 rounded" />
                    </div>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-10 mx-px bg-slate-800 rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:hidden space-y-1.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-800/30 rounded-xl border border-l-[3px] border-transparent border-l-slate-700" />
              ))}
            </div>
          </div>
        ) : cityError && !displayCity ? (
          /* ─── Per-city error (no stale data to fall back on) ─── */
          <div className="flex items-center justify-center py-20">
            <p className="text-rose-400 text-sm">{cityError}</p>
          </div>
        ) : displayCity && sharedProps ? (
          <div className={`transition-opacity duration-200 ${isRefetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            {/* ─── City hero ───────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 mb-10">
              <div className="flex items-stretch gap-4 min-w-0">
                <div className="w-[3px] rounded-full bg-teal-500 shrink-0 self-stretch" />
                <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none">
                  {displayCity.city}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium hidden sm:block">Best</span>
                  <div className="flex gap-1">
                    {monthSummary.best.map(m => (
                      <span key={m} className="text-[10px] font-bold text-teal-400 bg-teal-950/60 border border-teal-800/40 px-1.5 sm:px-2 py-0.5 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium hidden sm:block">Skip</span>
                  <div className="flex gap-1">
                    {monthSummary.avoid.map(m => (
                      <span key={m} className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 sm:px-2 py-0.5 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Desktop: heatmap ────────────────────────────── */}
            <div className="hidden lg:block">
              <Heatmap
                city={displayCity}
                planningYear={planningYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonth}
              />
            </div>

            {/* ─── Mobile: month cards ─────────────────────────── */}
            <div className="lg:hidden">
              <MobileMonthList
                city={displayCity}
                planningYear={planningYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonth}
              />
            </div>

            {/* ─── Desktop: full-width detail panel ────────────── */}
            {selectedMonth !== null && (
              <div ref={detailRef} className="hidden lg:block mt-6">
                <div className="border border-slate-800/60 rounded-2xl bg-slate-900/30 p-7">
                  <MonthDetail {...sharedProps} />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ─── Mobile: bottom sheet ────────────────────────────── */}
      {selectedMonth !== null && sharedProps !== null && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
            onClick={() => setSelectedMonth(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800/60 max-h-[88vh] flex flex-col">
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-0 shrink-0">
              <div className="w-8 h-1 bg-slate-700 rounded-full" />
            </div>
            {/* sticky sheet header */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-3">
              <span className="text-sm font-bold text-white">
                {MONTH_FULL[selectedMonth - 1]}
              </span>
              <button
                onClick={() => setSelectedMonth(null)}
                aria-label="Close"
                className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75"/>
                </svg>
              </button>
            </div>
            <div className="w-full h-px bg-slate-800/60 shrink-0" />
            {/* scrollable content */}
            <div className="overflow-y-auto flex-1 pb-safe">
              <MonthDetail {...sharedProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
