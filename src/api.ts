import type { CityData } from './types';

// In dev, Vite proxies /api → localhost:3000 (see vite.config.ts).
// In production, set VITE_API_URL to the deployed backend URL.
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchCities(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${BASE}/api/v1/cities`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
  return res.json();
}

// Module-level cache — city data never changes within a session.
const cityCache = new Map<string, CityData>();
// Deduplicate concurrent requests for the same slug.
const inflight = new Map<string, Promise<CityData>>();

export function fetchCity(slug: string, signal?: AbortSignal): Promise<CityData> {
  if (cityCache.has(slug)) return Promise.resolve(cityCache.get(slug)!);
  if (inflight.has(slug)) return inflight.get(slug)!;

  const promise = fetch(`${BASE}/api/v1/cities/${slug}`, { signal })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch city "${slug}": ${res.status}`);
      return res.json() as Promise<CityData>;
    })
    .then(data => {
      cityCache.set(slug, data);
      return data;
    })
    .finally(() => inflight.delete(slug));

  inflight.set(slug, promise);
  return promise;
}
