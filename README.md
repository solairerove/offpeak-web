# offpeak-web

Travel planning heatmap — visualizes city conditions across months by overlaying weather comfort, tourist crowds, holidays, and practical notes on a single timeline.

**Live:** https://offpeak-web-production.up.railway.app
**Local v7** http://localhost:5173/design/offpeak-v7-share-visa.html

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

- Сравнение городов — выбрать 2-3 города и видеть их рядом. Например "Nov в Бали vs Nov в Бангкоке"
- ~~Timeline view — горизонтальная полоска года, как Gantt. Видно лучшие окна одним взглядом, не надо читать таблицу~~
- Поделиться — ссылка с закодированными параметрами (город + пресет + год). Можно скинуть другу "вот я настроил под себя"
- Средняя цена перелёта — отдельно от отелей. Авиабилеты дорожают по-другому 
- Виза — простой индикатор: нужна / не нужна / visa-on-arrival для топ паспортов
- Year-over-year — показать как менялся трафик / цены по годам для выбранного месяца 
- Аномалии — отметить если этот месяц в {год} необычно дорогой или тихий vs исторически
- ~~Timeline view и heatmap технически простые — можно добавить как альтернативный вид прямо в v4.~~