import { useState, useMemo, useEffect } from 'react';
import { fetchCities, fetchCity } from './api';
import { computeMonthlyIndex } from './lib/scoring';
import CitySelector from './components/CitySelector';
import YearRangeSelector from './components/YearRangeSelector';
import Heatmap from './components/Heatmap';
import MonthDetail from './components/MonthDetail';
import type { CityData } from './types';

export default function App() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
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
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !city || !cityWithDynamicArrivals) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error ?? 'Something went wrong'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight mb-1">Travel Tracker</h1>
          <p className="text-xs text-gray-500 mb-5">When to visit — weather, crowds, holidays at a glance</p>
          <div className="flex flex-wrap items-center gap-4">
            <CitySelector
              cities={cities}
              selected={selectedCitySlug}
              onSelect={handleCityChange}
            />
            <YearRangeSelector
              years={city.arrivals.years}
              selected={selectedYears}
              onSelect={setSelectedYears}
            />
          </div>
        </header>

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-lg font-semibold text-white">{city.city}</h2>
              <span className="text-xs text-gray-500">
                Click any month for details
              </span>
            </div>
            <Heatmap
              city={cityWithDynamicArrivals}
              selectedMonth={selectedMonth}
              onSelectMonth={m => setSelectedMonth(prev => prev === m ? null : m)}
            />
          </div>

          {selectedMonth !== null && (
            <div className="w-72 shrink-0">
              <MonthDetail
                city={cityWithDynamicArrivals}
                month={selectedMonth}
                activeYears={selectedYears}
                onClose={() => setSelectedMonth(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
