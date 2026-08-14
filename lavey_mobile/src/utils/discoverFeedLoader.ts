import { discoverApi } from "../api/services";
import type { Filters } from "../screens/discover/components/FilterModal";
import type { DiscoverPayload } from "../types";
import { applyForYouGenderFilter, buildForYouDiscoverParams } from "./forYouFeedFilters";
import { sortForYouFeedProfiles } from "./sortDiscoverProfiles";

/** Loads For You worldwide with gender (+ non-binary) as the only meaningful filter. */
export async function loadDiscoverFeedWithFallback(filters: Filters): Promise<DiscoverPayload> {
  const result = await discoverApi.list(buildForYouDiscoverParams(filters));
  const genderFiltered = applyForYouGenderFilter(result.profiles, filters);
  return {
    ...result,
    profiles: sortForYouFeedProfiles(genderFiltered),
  };
}
