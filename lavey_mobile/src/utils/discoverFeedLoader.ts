import { discoverApi } from "../api/services";
import type { Filters } from "../screens/discover/components/FilterModal";
import type { DiscoverPayload } from "../types";
import { DEFAULT_DISCOVER_FILTERS } from "./discoverFiltersFromOnboarding";
import { hasManualDiscoverFilters, resolveDiscoverFilters } from "./discoverFilterStorage";
import { applyForYouFeedFilters, buildForYouDiscoverParams } from "./forYouFeedFilters";
import { sortForYouFeedProfiles } from "./sortDiscoverProfiles";

let prefetchedFeed: Promise<DiscoverPayload> | null = null;
let prefetchedFeedKey = "";
let loginFeedDone: Promise<void> = Promise.resolve();

function forYouFilters(filters: Filters, manual: boolean): Filters {
  return manual ? filters : { ...filters, hasProfilePhoto: false };
}

/** Starts a For You request for these filters so the first screen can reuse it. */
export function prefetchForYouFeed(filters: Filters, manual = false): void {
  const next = forYouFilters(filters, manual);
  const key = JSON.stringify({ filters: next, manual });
  if (prefetchedFeed && prefetchedFeedKey === key) return;
  prefetchedFeedKey = key;
  const pending = loadDiscoverFeedWithFallback(next, manual).catch((error: unknown) => {
    if (prefetchedFeedKey === key) prefetchedFeed = null;
    throw error;
  });
  prefetchedFeed = pending;
  loginFeedDone = pending.then(
    () => undefined,
    () => undefined,
  );
}

/** Uses the gender saved at signup until the member applies their own filter. */
export function prefetchResolvedForYouFeed(userId?: string): void {
  void (async () => {
    const manual = userId ? await hasManualDiscoverFilters(userId) : false;
    const resolved = userId ? await resolveDiscoverFilters(userId) : { ...DEFAULT_DISCOVER_FILTERS };
    prefetchForYouFeed(resolved, manual);
  })();
}

/** Other sign-in requests wait so they do not compete with the For You feed. */
export function waitForLoginForYouFeed(): Promise<void> {
  return loginFeedDone;
}

export function consumePrefetchedForYouFeed(filters: Filters, manual: boolean): Promise<DiscoverPayload> | null {
  const key = JSON.stringify({ filters: forYouFilters(filters, manual), manual });
  if (!prefetchedFeed || key !== prefetchedFeedKey) return null;
  const pending = prefetchedFeed;
  prefetchedFeed = null;
  return pending;
}

/** Loads For You worldwide. Gender follows signup until the member filters. */
export async function loadDiscoverFeedWithFallback(filters: Filters, manual = false): Promise<DiscoverPayload> {
  const result = await discoverApi.list(buildForYouDiscoverParams(filters, manual));
  const profiles = applyForYouFeedFilters(result.profiles, filters, manual);
  return {
    ...result,
    profiles: sortForYouFeedProfiles(profiles),
  };
}
