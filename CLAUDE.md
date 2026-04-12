# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (proxies /api to localhost:3000)
npm run build     # tsc type-check + Vite production build → dist/
npm run preview   # Serve the dist/ build locally
```

No test or lint scripts are configured.

**Docker:**
```bash
docker build -t offpeak-web --build-arg BACKEND_URL=https://your-api.railway.app .
docker run -p 3000:3000 -e BACKEND_URL=https://your-api.railway.app offpeak-web
```

## Architecture

Single-page React + TypeScript app that visualizes travel conditions (weather, crowds, holidays) across cities and months. No routing library — the entire app is one view with local state.

**Stack:** React 18, TypeScript (strict), Vite, Tailwind CSS, deployed via Docker + Caddy on Railway.

### Data flow

1. On mount, `App.tsx` calls `fetchCities()` → `GET /api/v1/cities` to get city slugs
2. Then calls `fetchCity(slug)` → `GET /api/v1/cities/{slug}` for each city in parallel
3. All state lives in `App.tsx` (selected city, month, year filters) and flows down as props

The dev server proxies `/api/*` to `http://localhost:3000` (requires offpeak-api running locally). In production, Caddy handles the same proxy via `BACKEND_URL` env var.

### Key modules

- `src/api.ts` — two fetch functions (`fetchCities`, `fetchCity`); `VITE_API_URL` controls base URL
- `src/types.ts` — all TypeScript types (`CityData`, `WeatherMonth`, `ArrivalsData`, `Holiday`, etc.)
- `src/lib/scoring.ts` — scoring algorithms: comfort (heat + rain), crowds (normalized arrivals), overall (`0.4×comfort + 0.4×(11−crowd) + 0.2×(10−penalty)`)
- `src/lib/colors.ts` — RdWtBu diverging palette interpolation; blue = better, red = worse; auto text contrast via luminance
- `src/components/Heatmap.tsx` — 12-month grid showing Overall, Comfort, Crowds, Rain Days, Typhoon rows
- `src/components/MonthDetail.tsx` — right sidebar with expanded month data (weather, scores, visitor trends, holidays, notes)

### Deployment

Multi-stage Dockerfile: Node 20 Alpine builds `dist/`, then Caddy 2 Alpine serves it. Caddy routes `/api/*` to `$BACKEND_URL` and falls back to `index.html` for SPA navigation. Railway config is in `railway.toml`.
