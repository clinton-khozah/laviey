import { useCallback, useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeScreen } from "../../screens/home/HomeScreen";
import { DiscoverScreen } from "../../screens/discover/DiscoverScreen";
import { MatchesScreen } from "../../screens/matches/MatchesScreen";
import { ChatListScreen } from "../../screens/chat/ChatListScreen";
import { ProfileScreen } from "../../screens/profile/ProfileScreen";
import { theme } from "../../constants/theme";
import { useAppearance } from "../../context/AppearanceContext";
import { useChat } from "../../context/ChatContext";
import { chatApi, roomApi } from "../../api/services";

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Matches: undefined;
  Chat: { conversationId?: string } | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const classic: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "flame",
  Discover: "compass",
  Matches: "heart",
  Chat: "chatbubble-ellipses",
  Profile: "person",
};
const web: typeof classic = {
  Home: "home",
  Discover: "videocam-outline",
  Matches: "add",
  Chat: "chatbox-outline",
  Profile: "person-outline",
};

export function BottomTabNavigator() {
  const { mode } = useAppearance();
  const { conversations } = useChat();
  const isWeb = mode === "web";
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 7);
  const baseHeight = isWeb ? 72 : 68;
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [pendingDateInvites, setPendingDateInvites] = useState(0);
  const conversationUnread = conversations.reduce((total, item) => total + item.unreadCount, 0);
  const chatBadge = conversationUnread + notificationUnread;

  const refreshBadges = useCallback(async () => {
    const [notifications, invites] = await Promise.all([
      chatApi.notifications().catch(() => []),
      roomApi.invites().catch(() => []),
    ]);
    setNotificationUnread(notifications.filter((item) => !item.read).length);
    setPendingDateInvites(invites.filter((item) => item.status === "pending").length);
  }, []);

  useEffect(() => {
    void refreshBadges();
    const timer = setInterval(() => void refreshBadges(), 10_000);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshBadges();
    });
    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [refreshBadges]);

  const badgeStyle = {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#20C46A",
    color: "#FFFFFF",
    fontFamily: theme.typography.bold,
    fontSize: 9,
    lineHeight: 17,
  } as const;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: isWeb ? "#111119" : theme.colors.coral,
        tabBarInactiveTintColor: "#898991",
        tabBarLabelStyle: {
          fontFamily: theme.typography.medium,
          fontSize: 9,
          marginBottom: 5,
        },
        tabBarStyle: {
          height: baseHeight + bottomInset,
          paddingTop: 7,
          paddingBottom: bottomInset,
          borderTopColor: isWeb ? "rgba(0,0,0,.05)" : theme.colors.border,
          backgroundColor: isWeb ? "#F9F9FC" : theme.colors.surface,
        },
        tabBarBadgeStyle: badgeStyle,
        tabBarIcon: ({ color, size, focused }) =>
          route.name === "Matches" && isWeb ? (
            <View
              style={{
                width: 54,
                height: 54,
                marginTop: -25,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FF646C",
                shadowColor: "#FF536E",
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 7,
              }}
            >
              <Ionicons name="add" size={29} color="white" />
            </View>
          ) : (
            <Ionicons
              name={(isWeb ? web : classic)[route.name]}
              size={focused ? size + 1 : size}
              color={color}
            />
          ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Explore" }} />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: "Dates",
          tabBarBadge: pendingDateInvites > 0 ? (pendingDateInvites > 99 ? "99+" : pendingDateInvites) : undefined,
        }}
      />
      <Tab.Screen name="Matches" component={MatchesScreen} options={{ tabBarLabel: isWeb ? "Post" : "Matches" }} />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{ tabBarBadge: chatBadge > 0 ? (chatBadge > 99 ? "99+" : chatBadge) : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: isWeb ? "You" : "Profile" }} />
    </Tab.Navigator>
  );
}
