import type { Profile } from "../types";

export const FAR_DISTANCE_KM = 40;

const PURPOSE_LABELS: Record<string, string> = {
  dating: "Dating",
  friendship: "Friendship",
  both: "Dating & friendship",
};

const ORIENTATION_LABELS: Record<string, string> = {
  straight: "Straight",
  gay: "Gay",
  lesbian: "Lesbian",
  bisexual: "Bisexual",
  pansexual: "Pansexual",
  queer: "Queer",
};

const INTERESTED_IN_LABELS: Record<string, string> = {
  men: "Men",
  women: "Women",
  nonbinary: "Non-binary people",
  everyone: "Everyone",
};

const GENDER_LABELS: Record<string, string> = {
  man: "Man",
  woman: "Woman",
  nonbinary: "Non-binary",
};

export function profileGenderLabel(gender?: string | null): string | null {
  if (!gender || gender === "prefer-not-to-say") return null;
  return GENDER_LABELS[gender] ?? gender.replace(/-/g, " ");
}

export function profilePurposeLabel(purpose?: string | null): string | null {
  if (!purpose?.trim()) return null;
  return PURPOSE_LABELS[purpose] ?? purpose.replace(/-/g, " ");
}

export function profileOrientationLabel(orientation?: string | null): string | null {
  if (!orientation || orientation === "prefer-not-to-say") return null;
  return ORIENTATION_LABELS[orientation] ?? orientation.replace(/-/g, " ");
}

export function profileInterestedInLabel(interestedIn?: string | null): string | null {
  if (!interestedIn?.trim()) return null;
  const keys = interestedIn.split(",").map((part) => part.trim()).filter(Boolean);
  if (keys.includes("everyone")) return "Everyone";
  const labels = keys.map((key) => INTERESTED_IN_LABELS[key]).filter(Boolean);
  if (!labels.length) return null;
  return labels.join(", ");
}

export function profileInterestedInShort(interestedIn?: string | null): string | null {
  const label = profileInterestedInLabel(interestedIn);
  if (!label) return null;
  if (label === "Everyone") return "Into everyone";
  return `Into ${label.toLowerCase()}`;
}

export function profileDistanceDisplay(profile: Pick<Profile, "distance" | "distanceKm">): string {
  if (typeof profile.distanceKm === "number" && profile.distanceKm > FAR_DISTANCE_KM) {
    return "Far away";
  }
  if (typeof profile.distanceKm === "number" && Number.isFinite(profile.distanceKm)) {
    const km = profile.distanceKm;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }
  const match = profile.distance?.match(/([\d.]+)\s*km/i);
  if (match) return `${match[1]} km`;
  if (profile.distance?.trim()) return profile.distance.trim();
  return "";
}

export function profileFeedMetaLine(profile: Profile): string {
  const parts = [
    `${profile.vibeScore}%`,
    profile.locationName?.trim() || null,
    profileDistanceDisplay(profile) || null,
  ].filter(Boolean);
  return parts.join(" · ");
}

const RELIGION_LABELS: Record<string, string> = {
  christian: "Christian",
  muslim: "Muslim",
  hindu: "Hindu",
  buddhist: "Buddhist",
  jewish: "Jewish",
  atheist: "Atheist",
  agnostic: "Agnostic",
  spiritual: "Spiritual",
  other: "Other",
};

export function profileReligionLabel(religion?: string | null): string | null {
  if (!religion || religion === "prefer-not-to-say") return null;
  return RELIGION_LABELS[religion] ?? religion.replace(/-/g, " ");
}

export type ProfileDetailRow = { key: string; label: string; value: string };

export function profileDetailRows(profile: Profile): ProfileDetailRow[] {
  const rows: ProfileDetailRow[] = [];
  const add = (key: string, label: string, value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) rows.push({ key, label, value: trimmed });
  };

  add("gender", "Gender", profileGenderLabel(profile.gender));
  add("orientation", "Orientation", profileOrientationLabel(profile.orientation));
  add("interested", "Interested in", profileInterestedInLabel(profile.interestedIn));
  add("purpose", "Looking for", profilePurposeLabel(profile.purpose));
  add("religion", "Religion", profileReligionLabel(profile.religion));
  add("location", "Location", profile.locationName);
  add("distance", "Distance", profileDistanceDisplay(profile));
  if (profile.languages?.length) {
    add("languages", "Languages", profile.languages.join(", "));
  }
  if (profile.interests.length) {
    add(
      "interests",
      "Interests",
      profile.interests.map((interest) => interest.replace(/^#/, "")).join(", "),
    );
  }
  if (profile.occupation) {
    add(
      "occupation",
      "Work",
      profile.company ? `${profile.occupation} at ${profile.company}` : profile.occupation,
    );
  }
  if (profile.school) {
    add("education", "Education", profile.degree ? `${profile.degree}, ${profile.school}` : profile.school);
  }
  add("hometown", "Hometown", profile.hometown ? `From ${profile.hometown}` : null);
  if (profile.themeSong) {
    add("themeSong", "Theme song", `${profile.themeSong.title} · ${profile.themeSong.artist}`);
  }
  add("match", "Match", `${profile.vibeScore}%`);
  if (profile.verified) add("verified", "Verified", "Photo verified");

  return rows;
}

export function profileFeedIdentityItems(profile: Profile): { key: string; label: string }[] {
  const items: { key: string; label: string }[] = [];
  const gender = profileGenderLabel(profile.gender);
  if (gender) items.push({ key: "gender", label: gender });
  const orientation = profileOrientationLabel(profile.orientation);
  if (orientation) items.push({ key: "orientation", label: orientation });
  const interested = profileInterestedInShort(profile.interestedIn);
  if (interested) items.push({ key: "interested", label: interested });
  const purpose = profilePurposeLabel(profile.purpose);
  if (purpose) items.push({ key: "purpose", label: `Looking for ${purpose.toLowerCase()}` });
  return items;
}

export function profileFeedIdentityLine(profile: Profile): string {
  return profileFeedIdentityItems(profile)
    .map((item) => item.label)
    .join(" · ");
}
