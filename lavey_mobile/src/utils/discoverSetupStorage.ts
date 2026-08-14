import AsyncStorage from "@react-native-async-storage/async-storage";

const SKIP_PREFIX = "@lavey/discover_setup_skipped_";
const FINISHED_PREFIX = "@lavey/discover_setup_finished_";
const PEEK_PREFIX = "@lavey/discover_setup_peek_";

async function getFlag(prefix: string, userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`${prefix}${userId}`)) === "1";
  } catch {
    return false;
  }
}

async function setFlag(prefix: string, userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${prefix}${userId}`, "1");
  } catch {
    // Non-fatal — worst case the gate re-prompts next visit.
  }
}

export const hasSkippedDiscoverSetup = (userId: string) => getFlag(SKIP_PREFIX, userId);
export const markDiscoverSetupSkipped = (userId: string) => setFlag(SKIP_PREFIX, userId);
export const hasFinishedDiscoverSetup = (userId: string) => getFlag(FINISHED_PREFIX, userId);
export const markDiscoverSetupFinished = (userId: string) => setFlag(FINISHED_PREFIX, userId);
/** User has already seen the brief For You preview before the setup prompt. */
export const hasSeenDiscoverFeedPeek = (userId: string) => getFlag(PEEK_PREFIX, userId);
export const markDiscoverFeedPeek = (userId: string) => setFlag(PEEK_PREFIX, userId);
