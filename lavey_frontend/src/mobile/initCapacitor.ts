import { Capacitor } from '@capacitor/core';
import { handleNativeOAuthReturnUrl } from '@/utils/mobile/nativeOAuth';

/** Native shell tweaks when running inside the Capacitor Android/iOS app. */
export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
  ]);

  const theme = document.documentElement.getAttribute('data-theme');
  const isNight = theme === 'night';

  try {
    await StatusBar.setStyle({ style: isNight ? Style.Light : Style.Dark });
    await StatusBar.setBackgroundColor({ color: isNight ? '#0a0a0f' : '#f4f4f8' });
  } catch {
    // Status bar plugin not available on some WebView builds.
  }

  void SplashScreen.hide();

  App.addListener('appUrlOpen', ({ url }) => {
    handleNativeOAuthReturnUrl(url);
  });

  const launch = await App.getLaunchUrl();
  if (launch?.url) {
    handleNativeOAuthReturnUrl(launch.url);
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void App.minimizeApp();
  });
}
