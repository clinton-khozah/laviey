import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator, type MainTabParamList } from '../components/navigation/BottomTabNavigator';
import { theme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { ChatDetailScreen } from '../screens/chat/ChatDetailScreen';
import { ChatOptionsScreen } from '../screens/chat/ChatOptionsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { SpotifyThemeSongScreen } from '../screens/profile/SpotifyThemeSongScreen';
import { VerifyIdentityScreen } from '../screens/profile/VerifyIdentityScreen';
import { SafetyPrivacyScreen } from '../screens/profile/SafetyPrivacyScreen';
import { BlockedUsersScreen } from '../screens/profile/BlockedUsersScreen';
import { LegalScreen } from '../screens/profile/LegalScreen';
import { SupportScreen } from '../screens/profile/SupportScreen';
import { VideoCallScreen } from '../screens/chat/VideoCallScreen';
import type { Conversation, UserProfile } from '../types';
import { AuthNavigator } from './AuthNavigator';
import { DiscoveryProfilesScreen } from '../screens/discover/DiscoveryProfilesScreen';
import { NearbyRadarScreen } from '../screens/nearby/NearbyRadarScreen';
// Group chats disabled — re-enable when the feature ships.
// import { GroupChatsScreen } from '../screens/groups/GroupChatsScreen';
// import { GroupChatDetailScreen } from '../screens/groups/GroupChatDetailScreen';
// import { GroupProfileScreen } from '../screens/groups/GroupProfileScreen';
// import { MemberProfileScreen } from '../screens/groups/MemberProfileScreen';
import { OnboardingQuizScreen } from '../screens/onboarding/OnboardingQuizScreen';
import { VideoMeetingRoomScreen } from '../screens/rooms/VideoMeetingRoomScreen';
import type { OnlineDate } from '../types';
import { usePushRegistration } from '../hooks/usePushRegistration';
import { useLocationSync } from '../hooks/useLocationSync';
import { NotificationPermissionSheet } from '../components/notifications/NotificationPermissionSheet';
import { useLanguageDetectionPrompt } from '../hooks/useLanguageDetectionPrompt';
import { LanguageDetectionSheet } from '../components/language/LanguageDetectionSheet';
import { isExpoGo } from '../utils/isExpoGo';

type ExpoNotification = import('expo-notifications').Notification;

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ChatDetail: { conversationId: string; conversation?: Conversation };
  ChatOptions: { conversationId: string; conversation?: Conversation };
  EditProfile: { profile: UserProfile };
  Settings: undefined;
  SpotifyThemeSong: undefined;
  VerifyIdentity: { profile: UserProfile };
  SafetyPrivacy: undefined;
  BlockedUsers: undefined;
  Legal: { variant: 'terms' | 'guidelines' };
  Support: undefined;
  VideoCall: { conversationId: string; conversation?: Conversation };
  DiscoveryProfiles: { openFilters?: boolean } | undefined;
  Nearby: undefined;
  // Group chats disabled — re-enable when the feature ships.
  // GroupChats: undefined;
  // GroupChatDetail: { groupId: string; group?: GroupChat };
  // GroupProfile: { group: GroupChat; myUserId: string | null };
  // MemberProfile: { userId: string; groupId: string; name?: string; avatar?: string };
  VideoMeetingRoom: { meetup: OnlineDate };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.surface, text: theme.colors.text, primary: theme.colors.primary, border: theme.colors.border },
};

export function AppNavigator() {
  const { session, isRestoring, needsOnboardingQuiz, onboardingChecked, completeOnboarding } = useAuth();
  const pushPrompt = usePushRegistration(Boolean(session) && onboardingChecked && !needsOnboardingQuiz);
  useLocationSync(Boolean(session) && onboardingChecked && !needsOnboardingQuiz);
  const languagePrompt = useLanguageDetectionPrompt(Boolean(session) && onboardingChecked && !needsOnboardingQuiz);
  const pendingNotification = useRef<ExpoNotification | null>(null);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBootTimedOut(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const openNotification = useCallback((notification: ExpoNotification) => {
    if (!session || needsOnboardingQuiz || !navigationRef.isReady()) {
      pendingNotification.current = notification;
      return;
    }
    const data = notification.request.content.data ?? {};
    const conversationId = typeof data.conversationId === 'string' ? data.conversationId : null;
    const url = typeof data.url === 'string' ? data.url : '/messages';
    pendingNotification.current = null;
    if (conversationId) {
      navigationRef.navigate('ChatDetail', { conversationId });
    } else if (url === '/rooms') {
      navigationRef.navigate('Main', { screen: 'Discover' });
    } else {
      navigationRef.navigate('Main', { screen: 'Chat' });
    }
  }, [needsOnboardingQuiz, session]);

  useEffect(() => {
    if (isExpoGo()) return;
    let subscription: { remove(): void } | undefined;
    void import('expo-notifications').then((Notifications) => {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          openNotification(response.notification);
        }
      });
    }).catch(() => undefined);
    return () => subscription?.remove();
  }, [openNotification]);

  const handleNavigationReady = useCallback(() => {
    if (isExpoGo()) return;
    const queued = pendingNotification.current;
    if (queued) openNotification(queued);
    void import('expo-notifications').then((Notifications) =>
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          openNotification(response.notification);
          void Notifications.clearLastNotificationResponseAsync();
        }
      }),
    ).catch(() => undefined);
  }, [openNotification]);

  useEffect(() => {
    if (!session || needsOnboardingQuiz || !pendingNotification.current || !navigationRef.isReady()) return;
    openNotification(pendingNotification.current);
  }, [needsOnboardingQuiz, openNotification, session]);
  if (isRestoring && !session && !bootTimedOut) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  const authSurfaceKey = session ? 'app' : 'auth';

  return (
    <NavigationContainer key={authSurfaceKey} ref={navigationRef} theme={navTheme} onReady={handleNavigationReady}>
      <NotificationPermissionSheet
        visible={pushPrompt.primerVisible}
        requesting={pushPrompt.requesting}
        onAllow={() => void pushPrompt.onAllow()}
        onDismiss={pushPrompt.onDismiss}
      />
      <LanguageDetectionSheet
        visible={languagePrompt.visible}
        languageLabel={languagePrompt.suggestedLabel}
        applying={languagePrompt.applying}
        onAccept={() => void languagePrompt.onAccept()}
        onDismiss={languagePrompt.onDismiss}
      />
      {session ? (
        needsOnboardingQuiz ? (
          <OnboardingQuizScreen onComplete={completeOnboarding} />
        ) : (
          <Stack.Navigator>
            <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="ChatOptions" component={ChatOptionsScreen} options={{ headerShown: false, animation: 'slide_from_left', contentStyle: { backgroundColor: '#FAFAFC' } }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile', headerShadowVisible: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="SpotifyThemeSong" component={SpotifyThemeSongScreen} options={{ title: 'Theme song', headerShadowVisible: false, contentStyle: { backgroundColor: '#F3F2F5' } }} />
            <Stack.Screen name="VerifyIdentity" component={VerifyIdentityScreen} options={{ title: 'Verify identity', headerShadowVisible: false }} />
            <Stack.Screen name="SafetyPrivacy" component={SafetyPrivacyScreen} options={{ title: 'Safety and privacy', headerShadowVisible: false }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: 'Blocked users', headerShadowVisible: false }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={({ route }) => ({ title: route.params.variant === 'terms' ? 'Terms of service' : 'Community guidelines', headerShadowVisible: false })} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="DiscoveryProfiles" component={DiscoveryProfilesScreen} options={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#111' } }} />
            <Stack.Screen name="Nearby" component={NearbyRadarScreen} options={{ headerShown: false, animation: 'fade' }} />
            {/* Group chats disabled — re-enable when the feature ships.
            <Stack.Screen name="GroupChats" component={GroupChatsScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="GroupChatDetail" component={GroupChatDetailScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="GroupProfile" component={GroupProfileScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="MemberProfile" component={MemberProfileScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            */}
            <Stack.Screen name="VideoMeetingRoom" component={VideoMeetingRoomScreen} options={{ headerShown: false, animation: 'fade' }} />
          </Stack.Navigator>
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
