import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Android heads-up banners when the app is backgrounded or closed. */
export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  const channels: Array<{ id: string; name: string }> = [
    { id: "default", name: "General" },
    { id: "messages", name: "Messages" },
    { id: "matches", name: "Matches" },
  ];

  await Promise.all(
    channels.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 120, 250],
        lightColor: "#FF5271",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableVibrate: true,
        showBadge: true,
      }),
    ),
  );
}
