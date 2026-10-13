/** @type {import('@expo/config').ExpoConfig} */
const appJson = require('./app.json');

/** Web client registered with this Android app's signing certificates. Public — not a secret. */
const GOOGLE_WEB_CLIENT_ID = '932812160359-t7hnq6svmg97k4ro94re3h05l0c24qum.apps.googleusercontent.com';
const googleWebClientId = GOOGLE_WEB_CLIENT_ID;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      googleWebClientId,
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
        || 'https://laveybackend-3.onrender.com/api',
    },
  },
};
