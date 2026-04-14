import type { CityData, CityListItem } from './types';

// In dev, Vite proxies /api → localhost:3000 (see vite.config.ts).
// In production, set VITE_API_URL to the deployed backend URL.
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchCities(signal?: AbortSignal): Promise<CityListItem[]> {
  const res = await fetch(`${BASE}/api/v1/cities`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
  return res.json();
}

// Deduplicate concurrent requests for the same (slug, year, yearFrom, yearTo).
const inflight = new Map<string, Promise<CityData>>();

export function fetchCity(
  slug: string,
  year: number,
  yearFrom?: number,
  yearTo?: number,
  signal?: AbortSignal,
): Promise<CityData> {
  const key = `${slug}:${year}:${yearFrom ?? ''}:${yearTo ?? ''}`;
  if (inflight.has(key)) return inflight.get(key)!;

  const params = new URLSearchParams({ year: String(year) });
  if (yearFrom !== undefined) params.set('year_from', String(yearFrom));
  if (yearTo   !== undefined) params.set('year_to',   String(yearTo));

  const promise = fetch(`${BASE}/api/v1/cities/${slug}?${params}`, { signal })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch city "${slug}": ${res.status}`);
      return res.json() as Promise<CityData>;
    })

    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
