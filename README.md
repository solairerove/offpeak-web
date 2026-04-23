# offpeak-web

Travel planning heatmap — visualizes city conditions across months by overlaying weather comfort, tourist crowds, holidays, and practical notes on a single timeline.

**Live:** https://offpeak-web-production.up.railway.app

## Run locally

Requires [offpeak-api](https://github.com/solairerove/offpeak-api) running on `localhost:3000`.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Build & run with Docker

```bash
docker build -t offpeak-web --build-arg BACKEND_URL=https://your-api-url.railway.app .
docker run -p 3000:3000 -e BACKEND_URL=https://your-api-url.railway.app offpeak-web
```

## Deploy

Deployed on Railway via `Dockerfile` + Caddy. Set `BACKEND_URL` env var to the offpeak-api service URL.

## Backlog

- add score on month cards
- one column for mobile version
- Картинки месяца полупустые. Я бы сделала меньше и сам визуал месяцев, сменила бы на линию, типа графика. Сейчас очень пестро 
- Раздел crowd and cost - не ясно что значит comfort. Как он расчитан 
- Выбор года лучше перенести туда где ивенты. Так не ясно, это типа прогноз погоды по годам. Но она по идеи не меняется