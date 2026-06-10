# Backend repo setup

A copy of the backend is on your Desktop: `lavey-backend/`

## Create GitHub repo and push

1. Create an empty repo on GitHub, e.g. `clintonkhozah/lavey-backend`
2. In PowerShell:

```powershell
cd C:\Users\clint\Desktop\lavey-backend
git init
git add .
git commit -m "Initial Lavey API"
git branch -M main
git remote add origin https://github.com/clintonkhozah/lavey-backend.git
git push -u origin main
```

3. On **Render**: connect `lavey-backend` repo (root = `.`), branch `main`
4. Set env vars from `.env.example` and deploy

## Connect frontend (Netlify)

```env
VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api
```
