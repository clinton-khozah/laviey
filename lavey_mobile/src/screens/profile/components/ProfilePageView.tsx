import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import type { Profile } from "../../../types";
import { ThemeSongDisc } from "../../../components/common/ThemeSongDisc";
import {
  formatProfileActivityStatus,
  isProfileActivityOnline,
} from "../../../utils/profileActivityStatus";
import {
  profileDistanceDisplay,
  profileFeedIdentityItems,
} from "../../../utils/profileIdentityLabels";

const H_PADDING = 20;
const GRID_GAP = 4;
const COLUMNS = 3;

function profileLocationLabel(profile: Profile): string {
  return profile.locationName?.trim() || "—";
}

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
}: {
  profile: Profile;
  onAvatarPress?(): void;
  onPostPress(index: number): void;
  onThemeSongPress?(): void;
  themeSongPlaying?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const avatarSize = Math.min(200, Math.round(screenWidth * 0.48));
  const ringSize = avatarSize + 6;
  const discSize = Math.round(avatarSize * 0.34);
  const discGap = 14;
  const contentWidth = screenWidth - H_PADDING * 2;
  const statsWidth = Math.round(screenWidth * 0.72);
  const tileWidth = Math.floor((contentWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
  const tileHeight = Math.round(tileWidth / 0.75);

  const posts = profile.posts.filter((p) => Boolean(p.src || p.poster));
  const hasThemeSong = Boolean(profile.themeSong);
  const identityItems = profileFeedIdentityItems(profile);
  const activityStatus = formatProfileActivityStatus(profile.lastActiveAt, profile.isOnline);
  const activityOnline = isProfileActivityOnline(profile.lastActiveAt, profile.isOnline);

  const stats = [
    { value: `${profile.vibeScore}%`, label: "Match", icon: "heart" as const, iconColor: theme.colors.coral },
    { value: profileLocationLabel(profile), label: "Location", icon: "location-sharp" as const, iconColor: "#8B7FA8" },
    { value: profileDistanceLabel(profile), label: "Distance", icon: "navigate-outline" as const, iconColor: "#6B8FAD" },
  ];

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
              <Image
                source={{ uri: profile.avatar }}
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
                contentFit="cover"
              />
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

      {identityItems.length > 0 ? (
        <View style={[styles.identityBar, { width: statsWidth }]}>
          {identityItems.map((item, index) => (
            <View
              key={item.key}
              style={[styles.identityCell, index < identityItems.length - 1 && styles.identityCellDivider]}
            >
              <Text style={styles.identityCellText} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.statsBar, { width: statsWidth }]}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={[styles.statCell, index < stats.length - 1 && styles.statCellDivider]}
          >
            <View style={styles.statIconWrap}>
              <Ionicons name={stat.icon} size={15} color={stat.iconColor} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

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

      {(profile.languages?.length ?? 0) > 0 ? (
        <View style={[styles.languagesSection, { width: contentWidth }]}>
          <View style={styles.languagesRow}>
            {profile.languages!.slice(0, 3).map((language, index) => (
              <View key={language} style={styles.languageItemWrap}>
                {index > 0 ? <View style={styles.languageDot} /> : null}
                <Text style={styles.languageText}>{language}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
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
  identityBar: {
    marginTop: 12,
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E4",
  },
  identityCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  identityCellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E4",
  },
  identityCellText: {
    fontFamily: theme.typography.medium,
    fontSize: 9.5,
    lineHeight: 12,
    color: "#333333",
    textAlign: "center",
  },
  statsBar: {
    marginTop: 12,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E4",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 3,
  },
  statIconWrap: {
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statCellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E4",
  },
  statValue: {
    fontFamily: theme.typography.bold,
    fontSize: 14,
    color: "#111111",
    textAlign: "center",
  },
  statLabel: {
    marginTop: 2,
    fontFamily: theme.typography.medium,
    fontSize: 10,
    color: "#999999",
  },
  postsSection: {
    marginTop: 24,
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
  languagesSection: {
    marginTop: 16,
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ECECEC",
  },
  languagesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  languageItemWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#888888",
    marginHorizontal: 9,
  },
  languageText: {
    fontFamily: theme.typography.medium,
    fontSize: 11,
    color: "#333333",
    textAlign: "center",
  },
});
