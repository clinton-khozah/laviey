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

## Deploy on Netlify (link GitHub repo)

Repo: **clinton-khozah/laviey** → connect to your existing **loviey** site (do not create a second site unless you mean to).

**Site configuration → Build & deploy → Build settings** — use exactly one of these setups:

| Setting | Option A (recommended) | Option B |
|--------|------------------------|----------|
| **Base directory** | *(leave empty)* | `lavey_frontend` |
| **Build command** | *(leave empty — uses `netlify.toml`)* | *(leave empty)* |
| **Publish directory** | *(leave empty — uses `netlify.toml`)* | `dist` |

Do **not** set Publish to `lavey_frontend/dist` when Base is already `lavey_frontend` (that double-paths and causes a 404).

After linking, open the latest deploy → **Deploy file explorer** and confirm `index.html` exists at the site root. If the folder is empty, the publish path is wrong.

Production branch: **main**. Then **Trigger deploy → Clear cache and deploy site**.

### “Page not found” / “Log in with a different user”

- **404 on a new `*.netlify.app` URL** — publish directory is wrong, or the build failed. Fix settings above and redeploy.
- **“Log in with a different user”** — you are on the wrong Netlify account or a protected deploy preview. Open [app.netlify.com](https://app.netlify.com), confirm you see the **loviey** site, and visit **loviey.netlify.app** (not an old preview URL). If GitHub login fails, sign in with email + password, then reconnect GitHub under User settings → Connected accounts.

## Deploy (optional: GitHub Actions)

Pushes to `main` deploy production. `testing` and `development` get branch deploys. If you use this, turn off Netlify’s own Git builds (Build settings → Stop builds) to avoid double deploys.

**Repository secrets** (Settings → Secrets and variables → Actions):

- `NETLIFY_AUTH_TOKEN` — from [Netlify user settings](https://app.netlify.com/user/applications)
- `NETLIFY_SITE_ID` — Site configuration → General → Site ID (loviey site)

**Repository variables** (optional; defaults match `netlify.toml`):

- `VITE_API_BASE_URL` — e.g. `https://laveybackend-3.onrender.com/api`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

See `lavey_frontend/ARCHITECTURE.md` for code layout.

## Android app (Google Play)

The frontend can be packaged as a native Android app with Capacitor. See **`lavey_frontend/MOBILE_ANDROID.md`** for Android Studio setup, signed release builds, and Play Store upload steps.

Quick start:

```bash
cd lavey_frontend
npm run cap:sync
npm run cap:open
```
