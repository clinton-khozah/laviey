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
  await Notifications.setNotificationCategoryAsync("incoming-call", [
    {
      identifier: "answer",
      buttonTitle: "Answer",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "decline",
      buttonTitle: "Decline",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]).catch(() => undefined);

  if (Platform.OS !== "android") return;

  const channels: Array<{ id: string; name: string }> = [
    { id: "default", name: "General" },
    { id: "messages", name: "Messages" },
    { id: "matches", name: "Matches" },
    { id: "calls", name: "Calls" },
  ];

  await Promise.all(
    channels.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 120, 250],
        lightColor: "#FF5271",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableVibrate: true,
        bypassDnd: channel.id === "calls",
      }),
    ),
  );
}
