import { useState, useMemo } from 'react';
import hongKongData from './data/hong-kong.json';
import daNangData from './data/da-nang.json';
import { computeMonthlyIndex } from './lib/scoring';
import CitySelector from './components/CitySelector';
import YearRangeSelector from './components/YearRangeSelector';
import Heatmap from './components/Heatmap';
import MonthDetail from './components/MonthDetail';
import type { CityData } from './types';

const ALL_CITIES = [hongKongData, daNangData] as CityData[];

export default function App() {
  const [selectedCitySlug, setSelectedCitySlug] = useState('hong-kong');
  const [selectedYears, setSelectedYears] = useState<number[]>([2018, 2019, 2023, 2024]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const city = ALL_CITIES.find(c => c.slug === selectedCitySlug)!;

  const cityWithDynamicArrivals = useMemo(() => {
    const monthly_index = computeMonthlyIndex(city.arrivals.data, selectedYears);
    return { ...city, arrivals: { ...city.arrivals, monthly_index } };
  }, [city, selectedYears]);

  function handleCityChange(slug: string) {
    setSelectedCitySlug(slug);
    setSelectedMonth(null);
    const newCity = ALL_CITIES.find(c => c.slug === slug)!;
    setSelectedYears(newCity.arrivals.years);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-xl font-bold text-white tracking-tight mb-1">Travel Tracker</h1>
          <p className="text-xs text-gray-500 mb-5">When to visit — weather, crowds, holidays at a glance</p>
          <div className="flex flex-wrap items-center gap-4">
            <CitySelector
              cities={ALL_CITIES}
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

        {/* Body */}
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
