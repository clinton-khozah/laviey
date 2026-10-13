import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
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
import { chatApi } from '../api/services';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { useSignInLoader } from '../components/auth/SignInHeartOverlay';
import '../notifications/setupNotifications';

type ExpoNotification = import('expo-notifications').Notification;

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ChatDetail: { conversationId: string; conversation?: Conversation; profileId?: string };
  ChatOptions: { conversationId: string; conversation?: Conversation };
  EditProfile: { profile: UserProfile };
  Settings: undefined;
  SpotifyThemeSong: undefined;
  VerifyIdentity: { profile: UserProfile };
  SafetyPrivacy: undefined;
  BlockedUsers: undefined;
  Legal: { variant: 'terms' | 'guidelines' };
  Support: undefined;
  VideoCall: { conversationId: string; conversation?: Conversation; incoming?: boolean; callId?: string; autoAnswer?: boolean };
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
  const { active: signInLoaderActive, finish: finishSignInLoader } = useSignInLoader();
  const pushPrompt = usePushRegistration(Boolean(session) && onboardingChecked && !needsOnboardingQuiz);
  useLocationSync(Boolean(session) && onboardingChecked && !needsOnboardingQuiz);
  const languagePrompt = useLanguageDetectionPrompt(Boolean(session) && onboardingChecked && !needsOnboardingQuiz);
  const pendingNotification = useRef<ExpoNotification | null>(null);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBootTimedOut(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const openNotification = useCallback((notification: ExpoNotification, autoAnswer = false) => {
    if (!session || needsOnboardingQuiz || !navigationRef.isReady()) {
      pendingNotification.current = notification;
      return;
    }
    const data = notification.request.content.data ?? {};
    const conversationId = typeof data.conversationId === 'string' ? data.conversationId : null;
    const actorUserId = typeof data.actorUserId === 'string' ? data.actorUserId : null;
    const url = typeof data.url === 'string' ? data.url : '/messages';
    const kind = typeof data.kind === 'string' ? data.kind : null;
    const callId = typeof data.callId === 'string' ? data.callId : null;
    pendingNotification.current = null;
    if (kind === 'call' && conversationId) {
      navigationRef.navigate('VideoCall', { conversationId, incoming: true, callId: callId ?? undefined, autoAnswer });
      return;
    }
    if (conversationId) {
      navigationRef.navigate('ChatDetail', { conversationId });
    } else if (kind === 'match' && actorUserId) {
      navigationRef.navigate('ChatDetail', { conversationId: 'resolve', profileId: actorUserId });
    } else if (kind === 'date_invite' || url === '/rooms') {
      navigationRef.navigate('Main', { screen: 'Discover' });
    } else if (kind === 'like' || kind === 'post_like' || kind === 'crush' || url.includes('likes')) {
      navigationRef.navigate('Main', { screen: 'Home', params: { openLikes: true } });
    } else {
      navigationRef.navigate('Main', { screen: 'Chat' });
    }
  }, [needsOnboardingQuiz, session]);

  useEffect(() => {
    if (isExpoGo()) return;
    let subscription: { remove(): void } | undefined;
    void import('expo-notifications').then((Notifications) => {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const action = response.actionIdentifier;
        const data = response.notification.request.content.data ?? {};
        const callId = typeof data.callId === 'string' ? data.callId : null;
        if (action === 'decline' && callId) {
          void chatApi.updateCall(callId, 'decline');
          return;
        }
        if (action === 'answer' || action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          openNotification(response.notification, action === 'answer');
        }
      });
    }).catch(() => undefined);
    return () => subscription?.remove();
  }, [openNotification]);

  useEffect(() => {
    if (!session || needsOnboardingQuiz) return;
    let seenCallId = "";
    const look = async () => {
      if (navigationRef.getCurrentRoute()?.name === "VideoCall") return;
      try {
        const call = await chatApi.activeCall();
        if (!call || call.direction !== "incoming" || call.status !== "ringing" || call.id === seenCallId) return;
        seenCallId = call.id;
        if (!navigationRef.isReady()) return;
        navigationRef.navigate("VideoCall", { conversationId: call.conversationId, incoming: true, callId: call.id });
      } catch {
        // The next check can show the call.
      }
    };
    void look();
    const timer = setInterval(() => void look(), 4000);
    return () => clearInterval(timer);
  }, [needsOnboardingQuiz, session]);

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
  useEffect(() => {
    if (signInLoaderActive && session && onboardingChecked && needsOnboardingQuiz) finishSignInLoader();
  }, [finishSignInLoader, needsOnboardingQuiz, onboardingChecked, session, signInLoaderActive]);
  if ((isRestoring || (session && !onboardingChecked)) && (!session ? !bootTimedOut : true)) {
    if (signInLoaderActive) return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
    return <LoadingIndicator fullScreen />;
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
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile', headerShadowVisible: false, headerStyle: { backgroundColor: '#FFFFFF' }, contentStyle: { backgroundColor: '#FFFFFF' }, animation: 'slide_from_right' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="SpotifyThemeSong" component={SpotifyThemeSongScreen} options={{ title: 'Theme song', headerShadowVisible: false, headerStyle: { backgroundColor: '#FFFFFF' }, contentStyle: { backgroundColor: '#FFFFFF' } }} />
            <Stack.Screen name="VerifyIdentity" component={VerifyIdentityScreen} options={{ title: 'Verify identity', headerShadowVisible: false }} />
            <Stack.Screen name="SafetyPrivacy" component={SafetyPrivacyScreen} options={{ title: 'Safety and privacy', headerShadowVisible: false }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: 'Blocked users', headerShadowVisible: false }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={({ route }) => ({ title: route.params.variant === 'terms' ? 'Terms of service' : 'Community guidelines', headerShadowVisible: false })} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false, animation: 'fade' }} />
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
