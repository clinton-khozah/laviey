# Lavey Android app (Google Play)

The mobile app is your existing **React + Vite** frontend wrapped with [Capacitor](https://capacitorjs.com/). The `android/` folder is a full **Android Studio** project you can build, test on a device, and upload to the **Google Play Console**.

| Item | Value |
|------|--------|
| App name | Lavey |
| Package ID | `app.loviey.mobile` |
| Min Android | 6.0 (API 23) |
| Target SDK | 35 |

## Prerequisites

1. **Android Studio** (latest stable) — [developer.android.com/studio](https://developer.android.com/studio)
2. During setup, install **Android SDK**, **SDK Platform 35**, and **Android SDK Build-Tools**
3. **JDK 17** (bundled with Android Studio)
4. A **Google Play Developer** account ($25 one-time) — [play.google.com/console](https://play.google.com/console)

## One-time: production env for the build

Mobile builds bundle the same env vars as Netlify. Copy your production values:

```bash
cd lavey_frontend
# Use your real Supabase + API keys (see .env.mobile.example)
cp .env.mobile.example .env.production
# Edit .env.production with real values, then:
npm run build:mobile
```

Required for a working app:

- `VITE_API_BASE_URL` — e.g. `https://laveybackend-3.onrender.com/api`
- `VITE_USE_MOCK_API=false`
- `VITE_USE_REAL_AUTH=true`
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`

## Sign-in on Android (required once)

The app runs at `https://localhost` inside the WebView. Your **Render** backend must allow that origin.

### 1. Render → Environment → `CORS_ORIGIN`

Add mobile origins (comma-separated, keep your existing Netlify URL):

```env
CORS_ORIGIN=https://loviey.netlify.app,http://localhost:3000,https://localhost,http://localhost,capacitor://localhost
```

Save and **redeploy** the backend on Render.

### 2. Supabase → Authentication → URL configuration

Under **Redirect URLs**, add:

```
https://localhost/**
capacitor://localhost/**
```

### 3. Rebuild the Android app

```bash
cd lavey_frontend
npm run cap:sync
```

Then **Run** again in Android Studio.

Email sign-in uses **Capacitor native HTTP** (bypasses browser CORS). Google sign-in uses a redirect through your backend — the steps above must be done for Google to return to the app.

### Why login opened the website instead of the app

After Google sign-in, the backend must send you back to `https://localhost/auth/callback` (the Capacitor app). If it does not recognize that origin, it falls back to **Netlify** (`FRONTEND_URL`) and you leave the app.

The backend update in `oauthFrontendOrigin.ts` fixes this. **Redeploy lavey-backend on Render** after pulling the latest code.

## Daily workflow

From repo root:

```bash
npm run mobile:sync    # build web app + copy into android/
npm run mobile:open    # open project in Android Studio
```

Or from `lavey_frontend/`:

```bash
npm run cap:sync
npm run cap:open
```

After changing frontend code, always run **`cap:sync`** before rebuilding in Android Studio.

## Run on a phone or emulator

1. `npm run mobile:sync`
2. `npm run mobile:open`
3. In Android Studio: **Run** (green play) with a connected device (USB debugging on) or an emulator

Command line (device/emulator must already be running):

```bash
cd lavey_frontend
npm run cap:run
```

## App icon & splash

Default Capacitor launcher icons are placeholders. Replace them before store release:

1. Add a **1024×1024 PNG** logo at `lavey_frontend/resources/icon.png`
2. Optional: `resources/splash.png` (2732×2732)
3. Run: `npx @capacitor/assets generate --android`
4. `npm run cap:sync`

Or use Android Studio: **File → New → Image Asset** and point at your logo.

## Release build (AAB for Play Store)

Google Play requires an **Android App Bundle** (`.aab`), signed with your upload key.

### 1. Create a signing key (once)

```bash
keytool -genkey -v -keystore lavey-upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias lavey
```

Store the `.jks` file and passwords somewhere safe (password manager). **If you lose the key, you cannot update the app on Play Store.**

### 2. Configure signing in Android Studio

1. Open `lavey_frontend/android` in Android Studio
2. **Build → Generate Signed App Bundle / APK**
3. Choose **Android App Bundle**
4. Select your keystore, alias, and passwords
5. Build variant: **release**
6. Output: `android/app/release/app-release.aab`

Alternatively, add signing to `android/app/build.gradle` via `keystore.properties` (do not commit secrets).

### 3. Bump version before each upload

In `android/app/build.gradle`:

```gradle
versionCode 2        // integer, must increase every upload
versionName "1.0.1"  // user-visible version
```

## Upload to Google Play Console

1. [play.google.com/console](https://play.google.com/console) → **Create app**
2. Complete **Store listing**: title, short/full description, screenshots (phone 1080×1920 or similar), feature graphic (1024×500)
3. **App content**: privacy policy URL (required), content rating questionnaire, target audience
4. **Release → Production → Create new release** → upload `app-release.aab`
5. Submit for review (first review can take several days)

### Privacy policy

You need a public privacy policy URL covering data collection (accounts, photos, location, messages). Host it on your site or Notion and link it in Play Console.

### Data safety form

Declare what you collect (email, photos, location, messages, etc.) to match your backend and Supabase usage.

## Permissions

The app requests:

- **Internet** — API and Supabase
- **Camera** — post photos, identity verification
- **Microphone** — meetups / video features

Users are prompted at runtime when those features are used.

## Google Sign-In on Android (optional)

Web Google OAuth needs an **Android OAuth client** in Google Cloud Console:

1. Package name: `app.loviey.mobile`
2. SHA-1 from your upload/debug keystore:  
   `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
3. Add the Android client ID to your auth config (backend + `VITE_GOOGLE_CLIENT_ID` if used)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on launch | Run `npm run cap:sync` after `npm run build:mobile` |
| API errors in app | Check `.env.production` was set **before** `build:mobile` |
| Gradle sync failed | Android Studio → **File → Sync Project with Gradle Files** |
| Device not listed | Enable **Developer options** + **USB debugging** on the phone |

## Project layout

```
lavey_frontend/
  capacitor.config.ts    # App ID, plugins
  android/               # Android Studio project (open this folder)
  src/mobile/            # Native shell hooks (status bar, back button)
  dist/                  # Built web app (synced into android/)
```

## Updating the live app

1. Change frontend code
2. `npm run mobile:sync`
3. Bump `versionCode` / `versionName`
4. Generate signed AAB
5. Upload new release in Play Console

No separate “mobile codebase” — the Play Store app is the same Lavey UI, packaged for Android.
