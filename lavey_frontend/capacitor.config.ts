import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.loviey.mobile',
  appName: 'Lavey',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f4f4f8',
  },
  server: {
    androidScheme: 'https',
    // Keep Google OAuth inside the app WebView instead of opening Chrome → Netlify.
    allowNavigation: [
      'laveybackend-3.onrender.com',
      '*.onrender.com',
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      'google.com',
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 500,
      backgroundColor: '#f4f4f8',
      showSpinner: true,
      androidSpinnerStyle: 'small',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f4f4f8',
    },
  },
};

export default config;
