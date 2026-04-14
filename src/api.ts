import type { CityData, CityListItem } from './types';

// In dev, Vite proxies /api → localhost:3000 (see vite.config.ts).
// In production, set VITE_API_URL to the deployed backend URL.
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchCities(signal?: AbortSignal): Promise<CityListItem[]> {
  const res = await fetch(`${BASE}/api/v1/cities`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
  return res.json();
}

// Deduplicate concurrent requests for the same (slug, planningYear, years).
const inflight = new Map<string, Promise<CityData>>();

export function fetchCity(
  slug: string,
  planningYear: number,
  years?: number[],
  signal?: AbortSignal,
): Promise<CityData> {
  const yearsStr = years && years.length > 0 ? years.join(',') : '';
  const key = `${slug}:${planningYear}:${yearsStr}`;
  if (inflight.has(key)) return inflight.get(key)!;

  const params = new URLSearchParams({ planning_year: String(planningYear) });
  if (yearsStr) params.set('years', yearsStr);

  const promise = fetch(`${BASE}/api/v1/cities/${slug}?${params}`, { signal })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch city "${slug}": ${res.status}`);
      return res.json() as Promise<CityData>;
    })

    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
