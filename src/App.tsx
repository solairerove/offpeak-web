import { useState, useMemo, useEffect } from 'react';
import { fetchCities, fetchCity } from './api';
import { computeMonthlyIndex } from './lib/scoring';
import CitySelector from './components/CitySelector';
import YearRangeSelector from './components/YearRangeSelector';
import PlanningYearSelector from './components/PlanningYearSelector';
import Heatmap from './components/Heatmap';
import MonthDetail from './components/MonthDetail';
import type { CityData } from './types';

export default function App() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [planningYear, setPlanningYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        for (const o of h.occurrences) {
          yearSet.add(o.year);
        }
      }
    }
    return Array.from(yearSet).sort();
  }, [cities]);

  const cityWithDynamicArrivals = useMemo(() => {
    if (!city) return null;
    const monthly_index = computeMonthlyIndex(city.arrivals.data, selectedYears);
    return { ...city, arrivals: { ...city.arrivals, monthly_index } };
  }, [city, selectedYears]);

  function handleCityChange(slug: string) {
    setSelectedCitySlug(slug);
    setSelectedMonth(null);
    const newCity = cities.find(c => c.slug === slug)!;
    setSelectedYears(newCity.arrivals.years);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tighter text-white mb-3">offpeak</div>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !city || !cityWithDynamicArrivals) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tighter text-white mb-3">offpeak</div>
          <p className="text-red-400 text-sm">{error ?? 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  const sharedMonthDetailProps = {
    city: cityWithDynamicArrivals,
    month: selectedMonth!,
    activeYears: selectedYears,
    planningYear,
    onClose: () => setSelectedMonth(null),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-16">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-3xl font-black tracking-tighter text-white">offpeak</h1>
            <span className="text-[10px] text-gray-700 border border-gray-800 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">
              beta
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Weather, crowds &amp; holidays — find your window
          </p>

          <div className="flex flex-wrap items-center gap-y-3 gap-x-4">
            <CitySelector
              cities={cities}
              selected={selectedCitySlug}
              onSelect={handleCityChange}
            />
            <div className="h-4 w-px bg-gray-800 hidden sm:block" />
            <YearRangeSelector
              years={city.arrivals.years}
              selected={selectedYears}
              onSelect={setSelectedYears}
            />
            <PlanningYearSelector
              years={availablePlanningYears}
              selected={planningYear}
              onSelect={setPlanningYear}
            />
          </div>
        </header>

        {/* Desktop layout */}
        <div className="hidden lg:flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <Heatmap
              city={cityWithDynamicArrivals}
              planningYear={planningYear}
              selectedMonth={selectedMonth}
              onSelectMonth={m => setSelectedMonth(prev => prev === m ? null : m)}
            />
          </div>
          {selectedMonth !== null && (
            <div className="w-80 shrink-0">
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-y-auto max-h-[calc(100vh-10rem)]">
                <MonthDetail {...sharedMonthDetailProps} />
              </div>
            </div>
          )}
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden">
          <Heatmap
            city={cityWithDynamicArrivals}
            planningYear={planningYear}
            selectedMonth={selectedMonth}
            onSelectMonth={m => setSelectedMonth(prev => prev === m ? null : m)}
          />
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {selectedMonth !== null && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
            onClick={() => setSelectedMonth(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-900 rounded-t-2xl border-t border-gray-800/60 max-h-[88vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-8 h-1 bg-gray-700 rounded-full" />
            </div>
            <div className="overflow-y-auto flex-1 pb-safe">
              <MonthDetail {...sharedMonthDetailProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
