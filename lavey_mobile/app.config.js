/** @type {import('@expo/config').ExpoConfig} */
const appJson = require('./app.json');

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
  || '17132674984-klaq75k8d7k6kc0ke76d0dhp85bor8hd.apps.googleusercontent.com';

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
