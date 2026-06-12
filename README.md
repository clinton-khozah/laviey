# Laviey — Frontend

TikTok-style dating app UI. Production: [loviey.netlify.app](https://loviey.netlify.app).

**Backend API:** deploy on Render (separate backend repository). **Frontend repo:** [github.com/clinton-khozah/laviey](https://github.com/clinton-khozah/laviey).

## Branches

| Branch | Purpose |
|--------|---------|
| `development` | Active feature work |
| `testing` | QA / staging before production |
| `main` | Production (auto-deploys to Netlify) |

**Flow:** push to `development` → open PR to `testing` → open PR to `main`.

## Run locally

```bash
cd lavey_frontend
npm install
cp .env.example .env
npm run dev
```

Or from repo root: `npm run dev`.

Set in `lavey_frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_API=false
VITE_USE_REAL_AUTH=true
```

## Deploy (Netlify via GitHub Actions)

Pushes to `main` deploy production. `testing` and `development` get branch deploys.

**Netlify site settings** (Site configuration → Build & deploy):

- Either leave **Base directory** empty and let root `netlify.toml` drive the build, **or** set Base directory to `lavey_frontend` (uses `lavey_frontend/netlify.toml`).
- **Publish directory** must end up as `lavey_frontend/dist` (root config) or `dist` (when base is `lavey_frontend`).
- If you use GitHub Actions to deploy, turn off Netlify’s own **Build** hook (Build settings → Stop builds) so only Actions uploads `dist`.

**Repository secrets** (Settings → Secrets and variables → Actions):

- `NETLIFY_AUTH_TOKEN` — from [Netlify user settings](https://app.netlify.com/user/applications)
- `NETLIFY_SITE_ID` — Site configuration → General → Site ID (loviey site)

**Repository variables** (optional; defaults match `netlify.toml`):

- `VITE_API_BASE_URL` — e.g. `https://laveybackend-3.onrender.com/api`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

See `lavey_frontend/ARCHITECTURE.md` for code layout.
