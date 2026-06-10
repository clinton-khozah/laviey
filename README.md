# Lavey — Frontend

TikTok-style dating app UI. Production: [loviey.netlify.app](https://loviey.netlify.app).

The **API is a separate repository** (`lavey-backend` on Render or similar).

## Run locally

```bash
cd lavey_frontend
npm install
cp .env.example .env
npm run dev
```

Or from repo root: `npm run dev` (same thing).

Start the backend from its own repo and set in `lavey_frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_API=false
VITE_USE_REAL_AUTH=true
```

## Deploy (Netlify)

`netlify.toml` is configured for `lavey_frontend/`. Set `VITE_API_BASE_URL` to your hosted API, e.g.:

```env
VITE_API_BASE_URL=https://your-api.onrender.com/api
```

See `lavey_frontend/ARCHITECTURE.md` for code layout.
