import { CommonActions, type NavigationProp } from "@react-navigation/native";

/** Jump to the For You (Home) tab from any navigator level. */
export function navigateToForYou(navigation: NavigationProp<Record<string, unknown>>) {
  const routeNames = navigation.getState()?.routeNames ?? [];
  if (routeNames.includes("Home")) {
    navigation.navigate("Home" as never);
    return;
  }
  navigation.dispatch(
    CommonActions.navigate({
      name: "Main",
      params: { screen: "Home" },
    }),
  );
}
