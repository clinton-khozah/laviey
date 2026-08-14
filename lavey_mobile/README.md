# LaViey Mobile

React Native/Expo mobile client for LaViey. It uses the same REST API and response shapes as `../lavey_frontend` and `../lavey-backend`.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` (production defaults to `https://laveybackend-3.onrender.com/api`).
3. Run `npm install`, then `npm run android`.

The app uses Expo-native equivalents for cached images, photo picking, location, permissions, fonts, and icons. These work in Expo development builds and map cleanly to Android/iOS native projects via `npm run prebuild`.

## API alignment

- Bearer sessions: `/auth/login`, `/auth/register`, `/auth/verify-email`, `/auth/me`, `/auth/logout`
- Discovery: `/profiles/discover`, `/profiles/:id`, `/profiles/:id/view`
- Likes/matches: `/matches/flame`, `/matches`
- Chat: `/messages/conversations`, thread, send, read, typing, and presence endpoints
- Profile: `/users/me`, `/users/me/location`, `/users/me/avatar`

The current backend has no password-reset endpoint and no Socket.IO server. The app therefore labels password recovery as unavailable and uses the same REST + polling fallback as the web client. Set `EXPO_PUBLIC_SOCKET_URL` when a compatible Socket.IO gateway is deployed.

## Builds

- Android development: `npm run android`
- Native Android/iOS folders: `npm run prebuild`
- Internal Android APK: `npx eas-cli build --platform android --profile preview`
- Production Android AAB: `npx eas-cli build --platform android --profile production`
- iOS IPA: `npx eas-cli build --platform ios --profile production` (Apple developer credentials required)

Run `npm run typecheck` before building.
