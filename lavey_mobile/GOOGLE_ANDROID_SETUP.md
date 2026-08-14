# Google Sign-In on Android (EAS / APK)

## Why sign-in failed on build 7

The EAS **preview** build had **no `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`**, so the native Google SDK could not mint an **ID token**. The app now embeds the Web Client ID via `app.config.js` and `eas.json`.

## One-time Google Cloud Console setup

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) (same project as the Web client):

1. **Web client** (already used by website + backend):  
   `17132674984-klaq75k8d7k6kc0ke76d0dhp85bor8hd.apps.googleusercontent.com`

2. **Android OAuth client** — create or edit:
   - Package name: `za.co.brightbyte.lavey`
   - SHA-1: from your **EAS upload keystore** (not debug keystore)

### Get EAS SHA-1 fingerprint

```bash
cd lavey_mobile
npx eas credentials -p android
```

Choose **preview** (or production) → **Keystore** → copy **SHA-1 fingerprint**.

Or open: https://expo.dev/accounts/clinton48/projects/lavey-mobile/credentials

Add that SHA-1 to the Android OAuth client, click **Verify**, then **Save**.

## Rebuild APK

```bash
cd lavey_mobile
npx eas build --platform android --profile preview --non-interactive
```

## Verify locally (optional)

```bash
npx expo config --type public | findstr googleWebClientId
```

Should show the Web Client ID, not empty.
