import { type ReactNode, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import type { Profile } from "../../../types";
import { ThemeSongDisc } from "../../../components/common/ThemeSongDisc";
import { MatchProgressHeart } from "./MatchProgressHeart";
import { NameInitialCircle } from "../../../components/common/NameInitialCircle";
import { hasCustomProfileAvatar } from "../../../utils/discoverProfileReady";
import {
  formatProfileActivityStatus,
  isProfileActivityOnline,
} from "../../../utils/profileActivityStatus";
import {
  profileDistanceDisplay,
  profileGenderLabel,
  profileInterestedInLabel,
  profileOrientationLabel,
  profilePurposeLabel,
  profileReligionLabel,
} from "../../../utils/profileIdentityLabels";

const H_PADDING = 20;
const GRID_GAP = 4;
const COLUMNS = 3;

function profileDistanceLabel(profile: Profile): string {
  const distance = profileDistanceDisplay(profile);
  return distance || "—";
}

export function ProfilePageView({
  profile,
  onAvatarPress,
  onPostPress,
  onThemeSongPress,
  themeSongPlaying = false,
  actions,
}: {
  profile: Profile;
  onAvatarPress?(): void;
  onPostPress(index: number): void;
  onThemeSongPress?(): void;
  themeSongPlaying?: boolean;
  actions?: ReactNode;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [locationOpen, setLocationOpen] = useState(false);
  const fullLocation = profile.locationName?.trim() || "";
  const avatarSize = Math.min(200, Math.round(screenWidth * 0.48));
  const ringSize = avatarSize + 6;
  const discSize = Math.round(avatarSize * 0.34);
  const discGap = 14;
  const contentWidth = screenWidth - H_PADDING * 2;
  const tileWidth = Math.floor((contentWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
  const tileHeight = Math.round(tileWidth / 0.75);

  const posts = profile.posts.filter((p) => Boolean(p.src || p.poster));
  const hasThemeSong = Boolean(profile.themeSong);
  const activityStatus = formatProfileActivityStatus(profile.lastActiveAt, profile.isOnline);
  const activityOnline = isProfileActivityOnline(profile.lastActiveAt, profile.isOnline);
  const occupation = profile.occupation?.trim() || "";
  const company = profile.company?.trim() || "";
  const work = occupation && company ? `${occupation} at ${company}` : occupation || company;
  const education = [profile.degree?.trim(), profile.school?.trim()].filter(Boolean).join(", ");
  const distanceLabel = profileDistanceLabel(profile);
  const details: Array<{ key: string; label: string; value: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }> = [
    { key: "match", label: "Match", value: `${profile.vibeScore}%`, icon: "heart-outline" },
  ];
  if (fullLocation) {
    details.push({
      key: "location",
      label: "Location",
      value: fullLocation,
      icon: "location-outline",
      onPress: () => setLocationOpen(true),
    });
  }
  if (distanceLabel && distanceLabel !== "—") {
    details.push({ key: "distance", label: "Distance", value: distanceLabel, icon: "map-outline" });
  }
  if (work) details.push({ key: "work", label: "Work", value: work, icon: "briefcase-outline" });
  if (education) details.push({ key: "education", label: "Education", value: education, icon: "school-outline" });
  if (profile.hometown?.trim()) {
    details.push({ key: "hometown", label: "Hometown", value: profile.hometown.trim(), icon: "home-outline" });
  }
  const gender = profileGenderLabel(profile.gender);
  if (gender) details.push({ key: "gender", label: "Gender", value: gender, icon: "male-female-outline" });
  const orientation = profileOrientationLabel(profile.orientation);
  if (orientation) details.push({ key: "orientation", label: "Orientation", value: orientation, icon: "people-circle-outline" });
  const interested = profileInterestedInLabel(profile.interestedIn);
  if (interested) details.push({ key: "interested", label: "Interested in", value: interested, icon: "people-outline" });
  const purpose = profilePurposeLabel(profile.purpose);
  if (purpose) details.push({ key: "purpose", label: "Looking for", value: purpose, icon: "search-outline" });
  const religion = profileReligionLabel(profile.religion);
  if (religion) details.push({ key: "religion", label: "Religion", value: religion, icon: "book-outline" });
  if (profile.languages?.length) {
    details.push({ key: "languages", label: "Languages", value: profile.languages.join(", "), icon: "language-outline" });
  }

  return (
    <View style={styles.page}>
      <View style={styles.avatarCluster}>
        <Pressable
          onPress={onAvatarPress}
          disabled={!onAvatarPress}
          accessibilityRole={onAvatarPress ? "button" : undefined}
          accessibilityLabel={onAvatarPress ? "View profile photo" : undefined}
          style={({ pressed }) => [styles.avatarPress, pressed && onAvatarPress && styles.avatarPressed]}
        >
          <View style={[styles.avatarWrap, { width: ringSize, height: ringSize }]}>
            <View
              style={[
                styles.avatarRing,
                { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
              ]}
            >
              {hasCustomProfileAvatar(profile.avatar) ? (
                <Image
                  source={{ uri: profile.avatar }}
                  style={[
                    styles.avatar,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                  ]}
                  contentFit="cover"
                />
              ) : (
                <NameInitialCircle name={profile.name} size={avatarSize} />
              )}
            </View>
            {profile.verified ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            ) : null}
          </View>
        </Pressable>

        {hasThemeSong && onThemeSongPress ? (
          <Pressable
            style={[
              styles.themeDisc,
              { width: discSize, height: discSize, borderRadius: discSize / 2, marginLeft: discGap },
            ]}
            onPress={onThemeSongPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              themeSongPlaying
                ? `Pause ${profile.themeSong!.title}`
                : `Play ${profile.themeSong!.title}`
            }
          >
            <ThemeSongDisc
              albumArtUrl={profile.themeSong!.albumArtUrl}
              spinning={themeSongPlaying}
              size={discSize}
            />
            {!themeSongPlaying ? (
              <View style={[styles.playBadge, { width: discSize * 0.36, height: discSize * 0.36, borderRadius: discSize * 0.18 }]}>
                <Ionicons name="play" size={discSize * 0.16} color="white" style={styles.playIcon} />
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.name}, {profile.age}
          </Text>
        </View>
        {activityStatus ? (
          <View style={styles.activityRow}>
            {activityOnline ? <View style={styles.activityDot} /> : null}
            <Text style={[styles.activityText, activityOnline && styles.activityTextOnline]}>
              {activityStatus}
            </Text>
          </View>
        ) : null}
        {profile.isMatch ? <Text style={styles.matchText}>You matched</Text> : null}
      </View>

      {profile.bio?.trim() ? (
        <View style={[styles.bioSection, { width: contentWidth }]}>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      ) : null}

      {actions ? (
        <View style={[styles.actionsBlock, { width: screenWidth }]}>
          {actions}
          <View style={styles.actionsLine} />
        </View>
      ) : null}

      <View style={[styles.postsSection, { width: contentWidth }]}>
        <View style={styles.postsHeader}>
          <Text style={styles.postsTitle}>Posts</Text>
          <Text style={styles.postsCount}>{posts.length}</Text>
        </View>

        {posts.length > 0 ? (
          <View style={styles.grid}>
            {posts.map((post, index) => (
              <Pressable
                key={post.id}
                onPress={() => onPostPress(index)}
                style={[
                  styles.postTile,
                  {
                    width: tileWidth,
                    height: tileHeight,
                    marginRight: (index + 1) % COLUMNS === 0 ? 0 : GRID_GAP,
                    marginBottom: GRID_GAP,
                  },
                ]}
              >
                <Image source={{ uri: post.poster || post.src }} style={styles.postImage} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyPostsText}>No posts yet</Text>
        )}
      </View>

      <View style={[styles.detailsSection, { width: contentWidth }]}>
        <Text style={styles.postsTitle}>Details</Text>
        <View style={styles.detailsList}>
          {details.map((item, index) => {
            const row = (
              <>
                <View style={styles.detailIcon}>
                  {item.key === "match" ? (
                    <MatchProgressHeart percent={profile.vibeScore} />
                  ) : (
                    <Ionicons name={item.icon} size={18} color="#2C2C2C" />
                  )}
                </View>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              </>
            );
            if (!item.onPress) {
              return (
                <View key={item.key} style={[styles.detailRow, index > 0 && styles.detailRowBorder]}>
                  {row}
                </View>
              );
            }
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${item.value}`}
                onPress={item.onPress}
                style={[styles.detailRow, index > 0 && styles.detailRowBorder]}
              >
                {row}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal visible={locationOpen} transparent animationType="fade" onRequestClose={() => setLocationOpen(false)}>
        <Pressable style={styles.locationBackdrop} onPress={() => setLocationOpen(false)}>
          <View style={styles.locationCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.locationCardLabel}>Location</Text>
            <Text style={styles.locationCardValue}>{fullLocation}</Text>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    paddingBottom: 12,
  },
  avatarCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarPress: {
    alignItems: "center",
  },
  avatarPressed: {
    opacity: 0.94,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    padding: 3,
    backgroundColor: theme.colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "#EBEBEB",
  },
  verified: {
    position: "absolute",
    right: -2,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2686EA",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  themeDisc: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,.45)",
  },
  playIcon: {
    marginLeft: 2,
  },
  identity: {
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 24,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: theme.typography.bold,
    fontSize: 22,
    color: "#111111",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  activityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#3ECF63",
  },
  activityText: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#777777",
    textAlign: "center",
  },
  activityTextOnline: {
    color: "#2BA84A",
  },
  matchText: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#888888",
  },
  bioSection: {
    marginTop: 14,
    paddingHorizontal: 4,
    minHeight: 0,
  },
  bio: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#333333",
    textAlign: "center",
  },
  actionsBlock: {
    marginTop: 16,
  },
  actionsLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E4E4E4",
    marginTop: 12,
  },
  detailsSection: {
    marginTop: 18,
  },
  detailsList: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E4",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ECECEC",
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
  },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#8A8A8A",
  },
  detailValue: {
    marginTop: 2,
    fontFamily: theme.typography.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: "#171717",
  },
  locationBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,16,24,.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  locationCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  locationCardLabel: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#999999",
  },
  locationCardValue: {
    marginTop: 6,
    fontFamily: theme.typography.bold,
    fontSize: 18,
    lineHeight: 24,
    color: "#111111",
  },
  postsSection: {
    marginTop: 14,
  },
  postsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  postsTitle: {
    fontFamily: theme.typography.bold,
    fontSize: 15,
    color: "#111111",
  },
  postsCount: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: "#999999",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  postTile: {
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#EBEBEB",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  emptyPostsText: {
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    paddingVertical: 24,
  },
});
