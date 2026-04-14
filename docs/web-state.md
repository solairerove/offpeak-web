# STATE.md

Project state snapshot. Source of truth is the code; this document describes what the code actually does.

---

## 1. Overview

offpeak-web is a single-page React + TypeScript frontend that visualizes when to visit a set of cities across the 12 months of the year. It shows a heatmap of precomputed scores (overall, comfort, crowds, rain days, typhoon risk, price index) and holiday markers per month, with a detail panel for the selected month. City and weather data are fetched at runtime from a separate backend API (offpeak-api). No data is hardcoded in this repo. Stack: React 18, TypeScript 5 (strict), Vite 5, Tailwind CSS 3, deployed as a Docker image (Node 20 build + Caddy 2 serve) on Railway.

All scoring is computed server-side and returned in `monthly_scores`. There is no client-side scoring logic.

---

## 2. How to run

Node version is not pinned (no `.nvmrc`, no `engines` field in `package.json`).

```bash
# Install
npm install

# Dev server (proxies /api/* to http://localhost:3000 — requires offpeak-api running locally)
npm run dev

# Type-check + production build → dist/
npm run build

# Preview production build
npm run preview
```

Tests: `src/lib/colors.test.ts` uses Vitest. Run with `npx vitest`. No lint script. TypeScript strict mode is on; `tsc` (run as part of `build`) is the only static check included in the build pipeline.

**Docker:**
```bash
docker build -t offpeak-web --build-arg BACKEND_URL=https://your-api.railway.app .
docker run -p 3000:3000 -e BACKEND_URL=https://your-api.railway.app offpeak-web
```

**Environment variables:**
- `VITE_API_URL` — base URL prefix for API calls in dev/preview. Defaults to `''` (relative), relying on Vite proxy or Caddy reverse proxy.

---

## 3. Type definitions

All types live in `src/types.ts`. Verbatim:

```typescript
export interface WeatherMonth {
  month: number;
  avg_high_c: number;
  avg_low_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  rain_days: number;
  heat_index_c: number;
  typhoon_risk: 'none' | 'low' | 'moderate' | 'high';
  notes: string;
}

export interface ArrivalDataPoint {
  year: number;
  month: number;
  visitors_thousands: number;
}

export interface MonthlyIndex {
  month: number;
  normalized: number;
}

export interface ArrivalsData {
  years: number[];
  data: ArrivalDataPoint[];
  monthly_index: MonthlyIndex[];
}

export interface MonthScore {
  month: number;
  comfort: number;
  crowd_index: number;
  typhoon_penalty: number;
  holiday_penalty: number;
  price_index: number | null;
  price_penalty: number | null;
  overall: number;
}

export interface CityListItem {
  slug: string;
  name: string;
}

export interface HolidayOccurrence {
  year: number;
  date_start: string;  // "YYYY-MM-DD"
  date_end: string;    // "YYYY-MM-DD"; may be year+1 for Dec→Jan events
  month_start: number;
  month_end: number;
}

export interface Holiday {
  id: string;
  name: string;
  crowd_impact: 'extreme' | 'very_high' | 'high' | 'moderate' | 'low' | 'none';
  price_impact: 'high' | 'moderate' | 'low' | 'none';
  closure_impact: 'significant' | 'minimal' | 'none';
  notes: string;
  occurrences: HolidayOccurrence[];
}

export interface Note {
  category: string;
  text: string;
}

export interface CityData {
  city: string;
  slug: string;
  weather: WeatherMonth[];
  arrivals: ArrivalsData;
  holidays: Holiday[];
  notes: Note[];
  monthly_scores: MonthScore[];
}
```

- `WeatherMonth` — one month of observed weather data for a city.
- `ArrivalDataPoint` — raw visitor arrival count (in thousands) for a specific city/year/month.
- `MonthlyIndex` — present in `ArrivalsData` but not used for rendering (scores come from `monthly_scores`).
- `ArrivalsData` — all arrival data for a city: available year list and raw points.
- `MonthScore` — server-precomputed scores for one month. `price_index` and `price_penalty` are nullable (not all cities have pricing data).
- `CityListItem` — the shape returned by `GET /api/v1/cities` (slug + display name).
- `HolidayOccurrence` — a single dated occurrence of a recurring holiday, with exact ISO date range and month span.
- `Holiday` — a recurring event with `id`, crowd/price/closure impact ratings, and a list of concrete `occurrences` per year. `crowd_impact` now includes `'none'`.
- `Note` — a city-level practical note tagged by category.
- `CityData` — top-level city object; root of all data passed to components. Includes `monthly_scores` with precomputed scores for all 12 months.

---

## 4. Data source

All data is fetched from a remote REST API. No local data files exist.

**Endpoints** (`src/api.ts`):

```
GET /api/v1/cities                          → CityListItem[]
GET /api/v1/cities/{slug}?planning_year=YYYY[&years=Y1,Y2,...]  → CityData
```

`planning_year` controls which year's holiday occurrences are embedded in the response.
`years` filters the arrivals data used for crowd index computation on the server.

**Fetch flow** (`src/App.tsx`):

1. On mount: `fetchCities(signal)` fetches `CityListItem[]`. First city becomes the default selection.
2. On `selectedCitySlug` / `planningYear` / `selectedYears` change: `fetchCity(slug, planningYear, yearsParam, signal)` fetches the selected city's data. This is lazy — only the active city is loaded, not all cities upfront.
3. Results are cached by `cacheKey = \`${slug}:${planningYear}:${selectedYears.join(',')}\`` in `cityCache: Record<string, CityData>`.
4. `staleCity` holds the last successfully loaded data; shown at `opacity-40` while re-fetching on param changes so the UI never goes blank.
5. `selectedYears` is initialised from the first fetched city's `arrivals.years`.

**Deduplication:** `fetchCity` maintains an `inflight: Map<string, Promise<CityData>>` to prevent duplicate concurrent requests for the same key.

**Error handling:**
- Two separate error states: `initError` (city list fetch failed — fatal, blocks the whole app) and `cityError` (per-city fetch failed — shows an inline error, stale data can still be displayed).
- Both fetch effects use `AbortController`; component unmount / key change aborts in-flight requests.

---

## 5. Component tree

```
main.tsx
└── App                              src/App.tsx
    ├── CitySelector                 src/components/CitySelector.tsx
    ├── YearRangeSelector            src/components/YearRangeSelector.tsx
    ├── PlanningYearSelector         src/components/PlanningYearSelector.tsx
    ├── Heatmap (desktop only)       src/components/Heatmap.tsx
    │   ├── HolidayBadge (×12)       src/components/HolidayBadge.tsx
    │   └── HeatmapCell (×60–72)     src/components/HeatmapCell.tsx
    ├── MobileMonthList (mobile only) src/components/MobileMonthList.tsx
    │   └── HolidayBadge (per month)
    └── MonthDetail (conditional)    src/components/MonthDetail.tsx
        [desktop: full-width card below heatmap]
        [mobile: bottom sheet with backdrop overlay]
```

---

### App `src/App.tsx`

**State owned:**
```typescript
cities: CityListItem[]
cityCache: Record<string, CityData>     // keyed by slug:planningYear:years
selectedCitySlug: string
selectedYears: number[]
planningYear: number                    // defaults to current calendar year
selectedMonth: number | null
initialLoading: boolean                 // city list fetch
cityLoading: boolean                    // per-city fetch
initError: string | null
cityError: string | null
staleCity: CityData | undefined         // last good data, shown while re-fetching
```

**Derived (useMemo):**
```typescript
cityList: { slug: string; city: string }[]   // mapped from CityListItem[] for CitySelector
availablePlanningYears: number[]              // union of all occurrence years across cached cities
monthSummary: { best: string[]; avoid: string[] }  // top-3 / bottom-2 months by overall score
```

**Display logic:**
- `city = cityCache[cacheKey]` — freshly fetched data (may be undefined while loading)
- `displayCity = city ?? staleCity` — what actually renders; never blank if staleCity exists
- `isRefetching = !city && !!staleCity && cityLoading` — content shown at `opacity-40 pointer-events-none`
- `showSkeleton = cityLoading && !displayCity` — animated skeleton shown only on first load

**Loading states:**
- `initialLoading=true`: full-page animated skeleton (nav + hero + heatmap grid + mobile list)
- `initError`: centered error with app logo
- `showSkeleton`: per-city animated skeleton
- `cityError && !displayCity`: inline error message

**Supplementary effects:**
- Escape key: closes `selectedMonth`
- `detailRef`: smooth-scrolls to the detail panel when a month is selected
- `document.title`: updates to `offpeak — {city.city}` when `displayCity` changes

**City switching (`handleCityChange`):**
Resets `selectedMonth`. Looks for an exact cache hit for the new slug + current `planningYear`; if found, sets `staleCity` and `selectedYears` immediately (no flash). If no exact match but any cached entry for the slug exists, uses that as `staleCity` while loading. Otherwise sets `cityLoading=true` eagerly so the skeleton shows immediately.

**Layout:**
- Sticky nav: logo + CitySelector + (desktop) YearRangeSelector + PlanningYearSelector
- Mobile nav row 2: YearRangeSelector + PlanningYearSelector (scrollable, hidden scrollbar)
- Hero: large city name + "Best" / "Skip" month chips
- `max-w-6xl mx-auto px-4` centered content
- Desktop: `<Heatmap>` + conditional `<MonthDetail>` in a card below
- Mobile (`lg:hidden`): `<MobileMonthList>` + `<MonthDetail>` as a bottom sheet with backdrop

---

### CitySelector `src/components/CitySelector.tsx`

**Props:**
```typescript
interface Props {
  cities: { slug: string; city: string }[];
  selected: string;
  onSelect: (slug: string) => void;
  loadingSlug?: string | null;
}
```

Tab-strip of buttons. Active city: `bg-slate-800 text-white`; others: `text-slate-500 hover:text-slate-200`. When `loadingSlug` matches a city's slug, an animated dot (`animate-pulse`) appears next to its label. Owns no state.

---

### YearRangeSelector `src/components/YearRangeSelector.tsx`

**Props:**
```typescript
interface Props {
  years: number[];
  selected: number[];
  onSelect: (years: number[]) => void;
}
```

Toggle buttons for each available arrivals year (controls which years' data the server uses for crowd index computation). Prevents deselecting the last year (`selected.length > 1` guard). Active: `bg-teal-800/60 border-teal-700/60 text-teal-300`. Owns no state.

---

### PlanningYearSelector `src/components/PlanningYearSelector.tsx`

**Props:**
```typescript
interface Props {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}
```

Toggle buttons for the planning year (controls which year's holiday `occurrences` are displayed). Available years are derived from all occurrence years across cached cities. Active: `bg-violet-800/60 border-violet-700/60 text-violet-300`. Labelled "Visiting". Owns no state.

---

### Heatmap `src/components/Heatmap.tsx`

**Props:**
```typescript
interface Props {
  city: CityData;
  planningYear: number;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}
```

**Desktop only** (`hidden lg:block` in App). Owns no state.

**Derived (useMemo):**
- `scores`: mapped from `city.monthly_scores` — `{ month, overall, comfort, crowds, rain_days, typhoon }`. `crowds = ms.crowd_index`, `typhoon = ms.typhoon_penalty`, `rain_days` from weather.
- `valuesByMetric`: `Record<string, number[]>` for per-row color scaling.
- `cellMatrix`: pre-computed `{ month, bgColor, displayValue }` per metric row × 12 months. For the typhoon row, `displayValue` is the string label (`—`/`Low`/`Mod`/`High`) from `city.weather[i].typhoon_risk`; for all others, the numeric score formatted to 1 decimal if non-integer.
- `priceRowData`: an array of `{ month, bgColor, displayValue }` for the price row, or `null` if no month has `price_index !== null`. Color-scaled across non-null values only; months without data show `—` on a dark bg.

**Rows rendered:**
1. Month header buttons (Jan–Dec) — selected state: `text-teal-400`.
2. Holiday row: one `HolidayBadge` per month, holidays filtered by `getHolidaysForMonth(city.holidays, month, planningYear)`.
3. Five metric rows via `METRICS` array: Overall, Comfort, Crowds, Rain days, Typhoon.
4. Price row (conditional) — only when at least one month has pricing data.
5. Color legend: teal → white → rose gradient.

Grid: `grid-cols-[100px_repeat(12,1fr)]`, `min-w-[600px]` forces horizontal scroll on narrow viewports.

---

### HeatmapCell `src/components/HeatmapCell.tsx`

**Props:**
```typescript
interface Props {
  value: string | number;
  bgColor: string;
  month: number;
  isSelected: boolean;
  onSelect: (month: number) => void;
}
```

Wrapped in `React.memo`. Single cell: fixed height `h-11`, background and text color applied via inline style. Selected state: `border-teal-400 scale-105 z-10 relative shadow-lg shadow-teal-900/40`. Still a `div` with `onClick` (not a `button`). Owns no state.

---

### HolidayBadge `src/components/HolidayBadge.tsx`

**Props:**
```typescript
interface Props {
  holidays: Holiday[];
}
```

Empty month: renders a `h-5` spacer div. Non-empty: finds the worst-impact holiday (by `IMPACT_ORDER`) and renders a single pill. If there are multiple holidays, label is `×N`; otherwise the impact label (`Extreme`/`V.High`/`High`/`Mod`/`Low`). Full holiday names in `title` tooltip.

Impact → Tailwind class (same as before):
```typescript
const IMPACT_STYLES: Record<string, string> = {
  extreme:   'bg-red-600 text-white',
  very_high: 'bg-orange-500 text-white',
  high:      'bg-amber-500 text-white',
  moderate:  'bg-yellow-400 text-gray-900',
  low:       'bg-green-600 text-white',
};
```

---

### MobileMonthList `src/components/MobileMonthList.tsx`

**Props:**
```typescript
interface Props {
  city: CityData;
  planningYear: number;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}
```

**Mobile only** (`lg:hidden` in App). Renders a vertical list of month cards. Each card shows:
- Month name + overall score (both colored by `getMetricColor` on the overall score)
- Temp range (avg_high / avg_low), rain days, crowd label + color
- Price index delta (e.g. `+12% price` in rose, `-8% price` in teal) — only when `price_index !== null`
- `HolidayBadge` when holidays exist

Selected card: `bg-slate-800/70 border-slate-700/50 ring-1 ring-teal-500/30` + teal-colored left border. Left border color is always set to the `accentColor` from `getMetricColor`. `div` with `onClick` (not a `button`). Owns no state.

---

### MonthDetail `src/components/MonthDetail.tsx`

**Props:**
```typescript
interface Props {
  city: CityData;
  month: number;
  activeYears: number[];
  planningYear: number;
  onClose: () => void;
}
```

**State owned:** none.

Three-column grid on desktop (`lg:grid-cols-3 lg:gap-12`); stacked on mobile.

**Col 1 — Score:**
1. Desktop-only header: month name, city · planningYear, close button (SVG `×`).
2. Large overall score (color-coded: `text-teal-400` ≥ 7.5, `text-slate-100` ≥ 5.5, `text-rose-400` otherwise).
3. Comfort score (integer) + crowd index (1 decimal) side by side.
4. Price index block: shows rounded index value + delta vs 100 (e.g. `+12%` in rose / `-8%` in teal / `avg` neutral). Shown as "Price: no data" if `price_index` is null.

**Col 2 — Weather + Visitors:**
1. Weather grid (2 columns): High, Low, Feels like, Humidity, Rain days, Rainfall. Typhoon risk shown only if not `'none'` (spans 2 columns, colored by risk level).
2. Optional weather notes (italic-style, `text-slate-600`).
3. Visitor trend bar chart — filtered to `activeYears`, sorted by year. Bar is `bg-teal-500/50`; value formatted as `Mk` or `Nk`. Hidden if no data.

**Col 3 — Holidays + Notes:**
1. Holidays section (title: "Holidays {planningYear}"): lists holidays from `getHolidaysForMonth` filtered to `planningYear`. Each entry shows: holiday name, crowd impact (colored), exact date range from `occurrences`, price/closure impact if not `'none'`, notes. Hidden if none.
2. Notes section: city-level `Note[]` (identical for every month). Category icons via `CATEGORY_ICONS` map; unknown categories fall back to `📌`. Hidden if `city.notes` is empty.

`formatDate` helper: converts `"YYYY-MM-DD"` to `"Mon D"` (e.g. `"Jan 25"`).

---

## 6. Scoring and derived values

**All scoring is server-side.** `src/lib/scoring.ts` no longer exists. The API computes and returns `monthly_scores: MonthScore[]` as part of `CityData`. The client reads scores directly from this array; it does not compute comfort, crowd index, overall score, or holiday penalty.

The `monthly_index` field in `ArrivalsData` is present in the type but is not used for rendering — `crowd_index` in `MonthScore` is used instead.

**`src/lib/holidays.ts`:**
```typescript
export function getHolidaysForMonth(holidays: Holiday[], month: number, year: number): Holiday[] {
  return holidays.filter(h =>
    h.occurrences
      .filter(o => o.year === year)
      .some(({ month_start: s, month_end: e }) => {
        if (s <= e) return month >= s && month <= e;
        return month >= s || month <= e; // Dec→Jan wrap
      })
  );
}
```

Filters holidays to those with at least one occurrence in `year` that spans `month`. Year-awareness is required because holidays now have dated occurrences rather than static `typical_month_start/end` fields.

**Color logic** (`src/lib/colors.ts`):

Palette changed to **TealWtRose** (was RdWtBu):

```typescript
// t=0 → teal-500 (good)   t=0.5 → white (neutral)   t=1 → rose-500 (bad)
const BLUE:  [number, number, number] = [20,  184, 166]; // teal-500
const WHITE: [number, number, number] = [247, 247, 247];
const RED:   [number, number, number] = [244,  63,  94]; // rose-500
```

`getMetricColor`, `interpolateColor`, `getTextColor` are unchanged in API. Luminance threshold for text contrast: `> 0.55` → dark text (`#111827`), otherwise light text (`#f9fafb`).

**`src/lib/constants.ts`:**
```typescript
export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTH_FULL  = ['January','February',...,'December'];
```

---

## 7. Styling approach

**Tailwind config** — no customisations:
```javascript
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**Global CSS** (`src/index.css`): only the three Tailwind directives. No custom CSS rules.

**Color palette:**
- App background: `bg-slate-950`
- Primary text: `text-slate-100` / `text-white`
- Secondary text: `text-slate-400` / `text-slate-500` / `text-slate-600`
- Panel / nav background: `bg-slate-900`, `bg-slate-950/90 backdrop-blur-md`
- Active city tab: `bg-slate-800 text-white`
- Active year button (YearRangeSelector): `bg-teal-800/60 border-teal-700/60 text-teal-300`
- Active planning year (PlanningYearSelector): `bg-violet-800/60 border-violet-700/60 text-violet-300`
- Visitor bar: `bg-teal-500/50`
- Teal accent (hero bar, best months): `bg-teal-500`, `text-teal-400`
- Rose accent (skip months, price up): `text-rose-400`, `bg-rose-950/60`

**Heatmap cell colors:** TealWtRose diverging palette via inline `style`. Teal `rgb(20,184,166)` = best, white `rgb(247,247,247)` = neutral, rose `rgb(244,63,94)` = worst. Text color auto-selected by luminance. Legend gradient: `linear-gradient(to right, rgb(20,184,166), rgb(247,247,247), rgb(244,63,94))`.

**Heatmap grid layout:** `grid-cols-[100px_repeat(12,1fr)]` — fixed 100px label column. `min-w-[600px]` forces horizontal scroll on narrow viewports.

**Selected heatmap cell:** `border-teal-400 scale-105 z-10 relative shadow-lg shadow-teal-900/40`.

**MonthDetail layout:** full-width `lg:grid-cols-3` card (desktop) or bottom sheet with backdrop (mobile). No longer a `w-72` right sidebar.

---

## 8. Routes and views

There is no router. The entire application is a single view. Navigation is purely state-driven:

- **City selection:** clicking a tab in `CitySelector` calls `handleCityChange`, resets `selectedMonth`, triggers lazy city fetch.
- **Year filter:** clicking year buttons in `YearRangeSelector` updates `selectedYears`, which changes `cacheKey` and triggers a re-fetch with the new `years=` param.
- **Planning year:** clicking `PlanningYearSelector` updates `planningYear`, which changes `cacheKey` and triggers a re-fetch with the new `planning_year=` param. Also controls which holiday occurrences are shown.
- **Month detail panel:**
  - Desktop: clicking a month column header, holiday cell, or heatmap cell sets `selectedMonth`. The detail panel appears below the heatmap in a `border border-slate-800/60 rounded-2xl` card. Clicking the same month again or pressing Escape deselects.
  - Mobile: same triggers open a bottom sheet (`fixed inset-x-0 bottom-0`) with a backdrop overlay. Clicking the backdrop also closes it.

There is no URL routing, no browser history integration, and no deep-linkable state.

---

## 9. Architecture decisions

- **Decision: All scoring is server-side.** Reason: scores depend on server-held data and the `planning_year` context; keeping computation on the server keeps the client simple and the formula consistent.
- **Decision: Lazy per-city fetch (not all-at-once on mount).** Reason: avoids loading data for cities the user may never visit; the city list (`CityListItem[]`) is cheap to fetch, actual data is loaded on demand.
- **Decision: Cache keyed by `slug:planningYear:years`.** Reason: changing planningYear or year range changes the response content (different holiday occurrences, different crowd index), so each parameter combination is a distinct cache entry.
- **Decision: Stale-while-revalidate (`displayCity = city ?? staleCity`).** Reason: when planningYear or year range changes, there is still meaningful data to show; opacity-dimming signals re-fetch without a blank screen.
- **Decision: Two separate loading/error states (`initialLoading`/`cityLoading`, `initError`/`cityError`).** Reason: city-list failure is fatal; per-city failure is recoverable (stale data can still be displayed).
- **Decision: No router.** Reason: single view with no need for shareable URLs in current scope.
- **Decision: All state in App.tsx.** Reason: state is shallow and small enough that prop drilling is clear.
- **Decision: Per-row relative color scaling.** Reason: each metric has different units and ranges; normalising within the row makes best/worst month visually distinguishable regardless of absolute values.
- **Decision: `MobileMonthList` instead of horizontal-scroll heatmap on mobile.** Reason: the 12-column heatmap grid is not legible on small screens; a vertical card list with summary info is more usable.
- **Decision: `MonthDetail` as bottom sheet on mobile.** Reason: a fixed right sidebar (`w-72`) compresses the heatmap on narrow viewports; a bottom sheet uses full screen width.
- **Decision: `HeatmapCell` wrapped in `React.memo`.** Reason: 60–72 cells re-render whenever any state in App changes; memoisation skips unchanged cells.
- **Decision: `MonthDetail` notes show city-level notes regardless of selected month.** Reason: notes are not month-tagged in the data model (`Note` has `category` and `text`, no `month` field).

---

## 10. What is NOT implemented

- No URL state / deep links.
- No dark/light mode toggle (dark only).
- No loading skeleton granularity below row level — the animated skeleton is a fixed layout approximation, not derived from actual data shape.
- No per-city error recovery when stale data exists (error is shown inline but old data remains visible; there is no retry button).
- No offline support or caching beyond the in-memory `cityCache`.
- No filtering or sorting of cities.
- `HeatmapCell` uses a `div` with `onClick` instead of a `button` — not keyboard-navigable.
- Holiday row cells in `Heatmap` use a `div` with `onClick` instead of a `button`.
- `MobileMonthList` rows use a `div` with `onClick` instead of a `button`.
- No `aria-label` or accessibility attributes on heatmap cells, month header buttons, or close buttons (except the mobile sheet close button which has `aria-label="Close"`).
- `MonthDetail` does not reuse `HolidayBadge` — it renders holidays inline with its own layout.
- `CATEGORY_ICONS` and `CROWD_LABEL`/`CROWD_COLOR` maps use emoji strings inline — not icon components, not accessible.
- `tailwind.config.js` has no safelist; any dynamic class construction would be purged in production.

---

## 11. Known issues and TODOs

- `HolidayBadge` label for `very_high` is `'V.High'` (truncated); the full label `'Very High'` is only visible in `MonthDetail` via `CROWD_LABEL`.
- Notes in `MonthDetail` are city-level and identical for every month. A user clicking different months sees the same Notes section every time.
- `MonthDetail` col 1 shows comfort as an integer and crowd to 1 decimal — no label indicates the scale (e.g. "/10").
- No `key` on `Note` items in `MonthDetail`; uses array index `i` as key.
- `availablePlanningYears` is derived from `cityCache` which initially only contains the first loaded city; years for other cities appear only after those cities are loaded.
- On very narrow viewports the sticky nav's mobile row 2 uses `overflow-x-auto` with hidden scrollbar; there is no visual affordance that it scrolls.
- `PlanningYearSelector` years list depends on holiday occurrences in cached cities; if a city has no holidays (or no occurrences), it contributes no years.
- `HeatmapCell` `onSelect` is passed as a stable `useCallback` ref, but `HolidayBadge` click handlers in `Heatmap` are inline lambdas — those cells cannot benefit from `HeatmapCell`'s `React.memo`.

---

## 12. File tree

```
src/
├── App.tsx
├── api.ts
├── components/
│   ├── CitySelector.tsx
│   ├── HeatmapCell.tsx
│   ├── Heatmap.tsx
│   ├── HolidayBadge.tsx
│   ├── MobileMonthList.tsx
│   ├── MonthDetail.tsx
│   ├── PlanningYearSelector.tsx
│   └── YearRangeSelector.tsx
├── index.css
├── lib/
│   ├── colors.test.ts
│   ├── colors.ts
│   ├── constants.ts
│   └── holidays.ts
├── main.tsx
└── types.ts
```
