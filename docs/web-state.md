# STATE.md

Project state snapshot. Source of truth is the code; this document describes what the code actually does.

---

## 1. Overview

offpeak-web is a single-page React + TypeScript frontend that visualizes when to visit a set of cities across the 12 months of the year. It shows a heatmap of computed scores (overall, comfort, crowds, rain days, typhoon risk) and holiday markers per month, with a detail panel for the selected month. City and weather data are fetched at runtime from a separate backend API (offpeak-api). No data is hardcoded in this repo. Stack: React 18, TypeScript 5 (strict), Vite 5, Tailwind CSS 3, deployed as a Docker image (Node 20 build + Caddy 2 serve) on Railway.

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

No test script. No lint script. TypeScript strict mode is on; `tsc` (run as part of `build`) is the only static check.

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

export interface Holiday {
  name: string;
  typical_month_start: number;
  typical_month_end: number;
  crowd_impact: 'extreme' | 'very_high' | 'high' | 'moderate' | 'low';
  price_impact: 'high' | 'moderate' | 'low' | 'none';
  closure_impact: 'significant' | 'minimal' | 'none';
  notes: string;
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
}
```

- `WeatherMonth` — one month of observed weather data for a city.
- `ArrivalDataPoint` — raw visitor arrival count (in thousands) for a specific city/year/month.
- `MonthlyIndex` — precomputed crowd index (1–10) for one month; sent by the API but overwritten client-side.
- `ArrivalsData` — all arrival data for a city: available year list, raw points, and the (overwritten) monthly index.
- `Holiday` — a recurring event with crowd, price, and closure impact ratings.
- `Note` — a city-level practical note tagged by category (visa, transport, etc.).
- `CityData` — top-level city object; root of all data passed to components.

---

## 4. Data source

All data is fetched from a remote REST API at startup. No local data files exist.

**Endpoints** (`src/api.ts`):

```
GET /api/v1/cities          → string[]    (list of city slugs)
GET /api/v1/cities/{slug}   → CityData
```

**Fetch flow** (`src/App.tsx`, `useEffect` on mount):
1. `fetchCities()` returns an array of slug strings.
2. `Promise.all(slugs.map(fetchCity))` fetches all cities in parallel.
3. First city in the list becomes the default selection.
4. `selectedYears` is initialised to `allCities[0].arrivals.years` (all years for the first city).

**Error handling:**
- Both `fetchCities` and `fetchCity` throw `Error` on non-OK HTTP status.
- A top-level `try/catch` in `init()` sets `error` state on failure.
- On error, the app renders a full-screen red error message and nothing else.
- There is no retry, no per-city error handling, and no partial loading state.

**The API-provided `monthly_index`** is discarded immediately. `App.tsx` calls `computeMonthlyIndex(city.arrivals.data, selectedYears)` via `useMemo` and replaces `arrivals.monthly_index` in `cityWithDynamicArrivals` before passing it to child components. The API value is never read for rendering.

---

## 5. Component tree

```
main.tsx
└── App                          src/App.tsx
    ├── CitySelector             src/components/CitySelector.tsx
    ├── YearRangeSelector        src/components/YearRangeSelector.tsx
    ├── Heatmap                  src/components/Heatmap.tsx
    │   ├── HolidayBadge (×12)   src/components/HolidayBadge.tsx
    │   └── HeatmapCell (×60)    src/components/HeatmapCell.tsx
    └── MonthDetail (conditional) src/components/MonthDetail.tsx
```

---

### App `src/App.tsx`

**State owned:**
```typescript
cities: CityData[]
selectedCitySlug: string
selectedYears: number[]
selectedMonth: number | null
loading: boolean
error: string | null
```

**Derived (useMemo):**
```typescript
cityWithDynamicArrivals: CityData | null
// Replaces arrivals.monthly_index with client-side recomputed index
// using selectedYears filter.
```

Renders loading/error screens, then the main layout: header (CitySelector + YearRangeSelector), heatmap area, and conditionally MonthDetail. MonthDetail toggles: clicking the same month again deselects it (`prev === m ? null : m`). Switching cities resets `selectedMonth` to null and `selectedYears` to all years for the new city.

---

### CitySelector `src/components/CitySelector.tsx`

**Props:**
```typescript
interface Props {
  cities: CityData[];
  selected: string;
  onSelect: (slug: string) => void;
}
```

Tab-strip of buttons (one per city). Active city gets `bg-white text-gray-900`; others get `text-gray-400`. Owns no state.

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

Toggle buttons for each available year. Prevents deselecting the last selected year (`selected.length > 1` guard). Owns no state.

---

### Heatmap `src/components/Heatmap.tsx`

**Props:**
```typescript
interface Props {
  city: CityData;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}
```

**State owned:** none.

**Derived (useMemo):**
- `scores`: array of `{ month, overall, comfort, crowds, rain_days, typhoon }` for all 12 months.
- `valuesByMetric`: `Record<string, number[]>` used to compute relative color scaling per row.

Renders a CSS grid (`grid-cols-[120px_repeat(12,1fr)]`) with:
1. Month header buttons (Jan–Dec).
2. Holiday row: one `HolidayBadge` per month.
3. Five metric rows (Overall, Comfort, Crowds, Rain Days, Typhoon): one `HeatmapCell` per month.
4. A color legend bar.

Month headers and holiday cells are also clickable (call `onSelectMonth`). The typhoon row uses `typhoonRiskToScore` to produce a numeric value for color interpolation but displays the string label (`—`, `Low`, `Mod`, `High`).

---

### HeatmapCell `src/components/HeatmapCell.tsx`

**Props:**
```typescript
interface Props {
  value: string | number;
  bgColor: string;
  isSelected: boolean;
  onClick: () => void;
}
```

Single cell: fixed height `h-11`, background and text color applied via inline style. Selected state: `border-white scale-105 z-10 shadow-lg`. Owns no state.

---

### HolidayBadge `src/components/HolidayBadge.tsx`

**Props:**
```typescript
interface Props {
  holidays: Holiday[];
}
```

Renders one color-coded pill per holiday for the month. Empty month renders a `h-6` spacer div to maintain row height. Badge label is the impact level (e.g., `V.High`), not the holiday name. Full holiday name + notes appear in the `title` tooltip. Owns no state.

Impact → Tailwind class:
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

### MonthDetail `src/components/MonthDetail.tsx`

**Props:**
```typescript
interface Props {
  city: CityData;
  month: number;
  activeYears: number[];
  onClose: () => void;
}
```

**State owned:** none.

Fixed-width (`w-72`) right sidebar panel. Sections rendered (conditionally where noted):
1. Header: month name + city name + close button.
2. Weather: all `WeatherMonth` fields in a 2-column grid + optional italic notes string.
3. Scores: comfort (integer) and crowd index (1 decimal). **Does not show the overall score.**
4. Visitors: bar chart of raw `visitors_thousands` per selected year, filtered to `activeYears`. Section hidden if no data.
5. Holidays: list with crowd/price/closure impact + notes. Section hidden if none for the month.
6. Notes: city-level `Note[]` (all notes, not month-specific). Section hidden if `city.notes` is empty.

Notes are city-level — identical content appears regardless of which month is selected.

`CATEGORY_ICONS` map covers: `visa`, `transport`, `accommodation`, `tips`, `weather`, `aviation`. Unknown categories fall back to `📌`.

---

## 6. Scoring and derived values

All scoring logic is in `src/lib/scoring.ts`. Verbatim:

```typescript
export function computeComfortScore(heatIndex: number, rainDays: number): number {
  let heatPoints: number;
  if (heatIndex <= 25) heatPoints = 5;
  else if (heatIndex <= 28) heatPoints = 4;
  else if (heatIndex <= 31) heatPoints = 3;
  else if (heatIndex <= 34) heatPoints = 2;
  else heatPoints = 1;

  let rainPoints: number;
  if (rainDays <= 7) rainPoints = 5;
  else if (rainDays <= 12) rainPoints = 4;
  else if (rainDays <= 16) rainPoints = 3;
  else if (rainDays <= 20) rainPoints = 2;
  else rainPoints = 1;

  return heatPoints + rainPoints; // 2–10
}

export function computeMonthlyIndex(
  data: ArrivalDataPoint[],
  selectedYears: number[],
): { month: number; normalized: number }[] {
  const filtered = data.filter(d => selectedYears.includes(d.year));

  const byMonth: Record<number, number[]> = {};
  for (const d of filtered) {
    (byMonth[d.month] ??= []).push(d.visitors_thousands);
  }

  const avgs: { month: number; avg: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const vals = byMonth[m] ?? [];
    avgs.push({ month: m, avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 });
  }

  const values = avgs.map(a => a.avg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return avgs.map(a => ({
    month: a.month,
    normalized: Math.round((1 + 9 * (a.avg - min) / range) * 10) / 10,
  }));
}

export function getHolidaysForMonth(holidays: Holiday[], month: number): Holiday[] {
  return holidays.filter(h => {
    const s = h.typical_month_start;
    const e = h.typical_month_end;
    if (s <= e) return month >= s && month <= e;
    return month >= s || month <= e; // wraps Dec→Jan
  });
}

export function getWorstHolidayPenalty(holidays: Holiday[]): number {
  if (holidays.length === 0) return 0;
  let worst = 0;
  for (const h of holidays) {
    const p = h.crowd_impact === 'extreme' ? 3
      : h.crowd_impact === 'very_high' ? 2
      : h.crowd_impact === 'high' ? 2
      : h.crowd_impact === 'moderate' ? 1 : 0;
    worst = Math.max(worst, p);
  }
  return worst; // 0, 1, 2, 3
}

// overall = 0.4*comfort + 0.4*(11-crowd) + 0.2*(10-penalty)
// max: 0.4*10 + 0.4*10 + 0.2*10 = 10
// min: 0.4*2  + 0.4*1  + 0.2*7  ≈ 2.6
export function computeOverallScore(
  comfort: number,        // 2–10
  crowd: number,          // 1–10
  holidayPenalty: number, // 0–3 (0=none, 3=extreme)
): number {
  const raw = 0.4 * comfort + 0.4 * (11 - crowd) + 0.2 * (10 - holidayPenalty);
  return Math.round(Math.max(1, Math.min(10, raw)) * 10) / 10;
}

export function typhoonRiskToScore(risk: string): number {
  switch (risk) {
    case 'none':     return 1;
    case 'low':      return 3;
    case 'moderate': return 6;
    case 'high':     return 9;
    default:         return 1;
  }
}
```

**Notes on scoring:**
- `high` and `very_high` crowd impact both produce a penalty of 2. They are not distinguished in the overall score.
- `computeMonthlyIndex` normalises relative to the months in the currently selected year range; the crowd index is relative, not absolute. Changing the year filter recomputes all crowd scores.
- Colors in each metric row are scaled relative to that row's own min/max (not a fixed scale), so a "good" value is always blue relative to the worst month for that city/metric.

Color logic is in `src/lib/colors.ts`. Verbatim:

```typescript
// RdWtBu diverging palette (color-blind safe)
// t=0 → blue (good)   t=0.5 → white (neutral)   t=1 → red (bad)
const BLUE:  [number, number, number] = [69,  117, 180];
const WHITE: [number, number, number] = [247, 247, 247];
const RED:   [number, number, number] = [215,  48,  39];

function lerp(a: number, b: number, s: number): number {
  return Math.round(a + (b - a) * s);
}

export function interpolateColor(t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  let r: number, g: number, b: number;
  if (tc <= 0.5) {
    const s = tc * 2;
    r = lerp(BLUE[0], WHITE[0], s);
    g = lerp(BLUE[1], WHITE[1], s);
    b = lerp(BLUE[2], WHITE[2], s);
  } else {
    const s = (tc - 0.5) * 2;
    r = lerp(WHITE[0], RED[0], s);
    g = lerp(WHITE[1], RED[1], s);
    b = lerp(WHITE[2], RED[2], s);
  }
  return `rgb(${r},${g},${b})`;
}

// Returns background color for a cell value.
// lowerIsBetter=true means min value → blue (good), max → red (bad).
export function getMetricColor(
  value: number,
  allValues: number[],
  lowerIsBetter: boolean,
): string {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const normalized = max === min ? 0.5 : (value - min) / (max - min);
  const t = lowerIsBetter ? normalized : 1 - normalized;
  return interpolateColor(t);
}

export function getTextColor(bgRgb: string): string {
  const nums = bgRgb.match(/\d+/g);
  if (!nums || nums.length < 3) return '#111827';
  const [r, g, b] = nums.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#111827' : '#f9fafb';
}
```

Luminance threshold for text contrast: `> 0.55` → dark text (`#111827`), otherwise light text (`#f9fafb`).

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

**Global CSS** (`src/index.css`):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
No custom CSS rules beyond the three Tailwind directives.

**Color palette:**
- App background: `bg-gray-950`
- Primary text: `text-gray-100` / `text-white`
- Secondary text: `text-gray-400` / `text-gray-500`
- Panel background: `bg-gray-800`
- City selector background: `bg-gray-800`
- Active city tab: `bg-white text-gray-900`
- Active year button: `bg-sky-700 border-sky-500`
- Visitor bar: `bg-sky-500`
- Detail panel close button hover: `hover:text-white`

**Heatmap cell colors:** RdWtBu diverging palette via inline `style` attribute (not Tailwind). Blue `rgb(69,117,180)` = best, white `rgb(247,247,247)` = median, red `rgb(215,48,39)` = worst. Text color auto-selected by luminance.

**Heatmap grid layout:** `grid-cols-[120px_repeat(12,1fr)]` — fixed 120px label column, equal-width month columns. `min-w-[700px]` on the inner div forces horizontal scroll on narrow viewports.

**Selected cell:** `border-white scale-105 z-10 relative shadow-lg` — white border + slight scale.

---

## 8. Routes and views

There is no router. The entire application is a single view. Navigation is purely state-driven:

- **City selection:** clicking a city tab in `CitySelector` updates `selectedCitySlug`, resets `selectedMonth` and `selectedYears`.
- **Year filter:** clicking year buttons in `YearRangeSelector` toggles years in `selectedYears`, which recomputes crowd scores via `useMemo`.
- **Month detail panel:** clicking any month column header, holiday cell, or heatmap cell sets `selectedMonth`. Clicking the same month again, or the `×` button in `MonthDetail`, clears it. The panel appears as a `w-72` right column alongside the heatmap.

There is no URL routing, no browser history integration, and no deep-linkable state.

---

## 9. Architecture decisions

- **Decision: No router.** Reason: single view with no need for shareable URLs in current scope.
- **Decision: All state in App.tsx.** Reason: state is shallow and small enough that prop drilling is clear; no global state library was warranted.
- **Decision: Discard API's `monthly_index` and recompute client-side.** Reason: `monthly_index` must be recomputed when the user changes the year filter. The API-provided value is computed over all years and cannot be reused. The raw `data` array is kept; the index is derived from it.
- **Decision: `cityWithDynamicArrivals` as a derived value.** Reason: keeps the CityData shape consistent — child components always receive a complete `CityData` and never need to know whether the index was overridden.
- **Decision: Per-row relative color scaling.** Reason: each metric has different units and ranges; normalising within the row makes the best/worst month visually distinguishable regardless of the absolute range.
- **Decision: Fetch all cities in parallel on mount.** Reason: simplicity. No lazy loading per city; all data is loaded upfront and switching cities is instant.
- **Decision: Mobile layout via horizontal scroll.** Reason: `min-w-[700px]` on the heatmap container; no responsive reflow or collapsed views for small screens.
- **Decision: `MonthDetail` notes show city-level notes regardless of selected month.** Reason: notes are not month-tagged in the data model (`Note` has `category` and `text`, no `month` field).

---

## 10. What is NOT implemented

- No price data column or price score row in the heatmap.
- No overall score shown in the `MonthDetail` Scores section (only comfort and crowds are displayed there).
- No filtering or sorting of cities.
- No URL state / deep links.
- No mobile-optimised layout (horizontal scroll only).
- No dark/light mode toggle (dark only).
- No loading skeleton — full-screen "Loading..." text only.
- No per-city error recovery — one API failure aborts all data.
- No offline support or caching.
- The `typhoon` heatmap row is coloured by a numeric proxy score (1/3/6/9) rather than the actual string label; there is no distinct typhoon score visible to users beyond the cell label.
- `MonthDetail` does not use `HolidayBadge` — it reimplements crowd labels with emoji strings (`CROWD_LABEL` map) rather than reusing the badge component.

---

## 11. Known issues and TODOs

- `high` and `very_high` crowd impact are treated identically in `getWorstHolidayPenalty` (both → penalty 2). The distinction between them has no effect on the overall score.
- Notes in `MonthDetail` are city-level and identical for every month. A user clicking different months sees the same Notes section every time.
- `MonthDetail` Scores section shows comfort and crowds but not overall, even though overall is the primary heatmap row.
- No `aria-label` or accessibility attributes on heatmap cells, month header buttons, or the close button.
- `HeatmapCell` uses a `div` with `onClick` instead of a `button` — not keyboard-navigable.
- Holiday row cells use a `div` with `onClick` instead of a `button`.
- `MonthDetail` visitor bar chart: `Math.max(...yearlyVisitors.map(...))` is computed inline in JSX on every render.
- `MonthDetail` uses emoji characters inline in `CROWD_LABEL` and `CATEGORY_ICONS` maps — not icon components, not accessible.
- `tailwind.config.js` has no safelist; any dynamic class construction would be purged in production.
- `HolidayBadge` label for `very_high` is `'V.High'` (truncated); the full label `'Very High'` is only visible in the `MonthDetail` panel via `CROWD_LABEL`.
- On very narrow viewports the `MonthDetail` panel (`w-72`) wraps below the heatmap only if the parent flex container wraps — it does not, so on screens narrower than ~1000px the panel and heatmap compress against each other.
- No `key` on `Note` items in `MonthDetail`; uses array index `i` as key.

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
│   ├── MonthDetail.tsx
│   └── YearRangeSelector.tsx
├── index.css
├── lib/
│   ├── colors.ts
│   └── scoring.ts
├── main.tsx
└── types.ts
```
