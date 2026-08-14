import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, InteractionManager, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from './src/context/AuthContext';
import { AppDataProvider } from './src/context/AppDataContext';
import { MatchProvider } from './src/context/MatchContext';
import { ChatProvider } from './src/context/ChatContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useEffect } from 'react';
import * as NativeSplashScreen from 'expo-splash-screen';
import { AppearanceProvider } from './src/context/AppearanceContext';
import { AccessModeProvider } from './src/context/AccessModeContext';
import { configureGoogleSignIn } from './src/config/googleAuth';

void NativeSplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void NativeSplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void NativeSplashScreen.hideAsync().catch(() => undefined);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !loaded) return;

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled || AppState.currentState !== 'active') return;
      void NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || cancelled) return;
      void NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
    });

    return () => {
      cancelled = true;
      task.cancel();
      subscription.remove();
    };
  }, [loaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaProvider>
        <AccessModeProvider>
          <AppearanceProvider>
            <AuthProvider>
              <AppDataProvider>
                <MatchProvider>
                  <ChatProvider>
                    <StatusBar hidden />
                    <AppNavigator />
                  </ChatProvider>
                </MatchProvider>
              </AppDataProvider>
            </AuthProvider>
          </AppearanceProvider>
        </AccessModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
