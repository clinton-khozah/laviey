# App store assets

Place source images here, then generate Android/iOS icons and splash screens:

```bash
npm install -D @capacitor/assets
npx @capacitor/assets generate --android
npm run cap:sync
```

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024×1024 | Launcher icon |
| `splash.png` | 2732×2732 (optional) | Splash screen |

Until you add these, the default Capacitor icons are used.
