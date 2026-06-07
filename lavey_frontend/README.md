# Lavey — Vibe-First Dating UI

TikTok-style vertical feed for discovering people through short videos and photos.

## Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:3000** (see the terminal if the port differs). Use mobile device mode in DevTools for the best experience.

**Blank page?** Stop all old `npm run dev` terminals, run `npm run dev` again from `lavey_frontend`, and hard-refresh the browser. Port `5173` is often used by other projects on the same machine.

Copy `.env.example` to `.env` and adjust API settings when connecting to the .NET backend.

## Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full folder layout, layering rules, and how to add new features.

### Quick map

| Layer | Location | Role |
|-------|----------|------|
| Services | `src/services/` | All HTTP / API calls |
| Hooks | `src/hooks/` | React state + service orchestration |
| Features | `src/features/` | Pages & smart containers per feature |
| Components | `src/components/` | Reusable presentational UI |

## API configuration

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_API=true
```

Set `VITE_USE_MOCK_API=false` when your ASP.NET Core API is running.
