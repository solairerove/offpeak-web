import type { CityData } from './types';

// In dev, Vite proxies /api → localhost:3000 (see vite.config.ts).
// In production, set VITE_API_URL to the deployed backend URL.
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchCities(): Promise<string[]> {
  const res = await fetch(`${BASE}/api/v1/cities`);
  if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`);
  return res.json();
}

// Module-level cache — city data never changes within a session.
const cityCache = new Map<string, CityData>();

export async function fetchCity(slug: string): Promise<CityData> {
  if (cityCache.has(slug)) return cityCache.get(slug)!;
  const res = await fetch(`${BASE}/api/v1/cities/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch city "${slug}": ${res.status}`);
  const data: CityData = await res.json();
  cityCache.set(slug, data);
  return data;
}
