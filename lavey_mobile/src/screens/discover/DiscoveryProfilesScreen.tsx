import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { discoverApi } from "../../api/services";
import { LoadingIndicator } from "../../components/common/LoadingIndicator";
import { theme } from "../../constants/theme";
import type { Profile } from "../../types";
import { sortProfilesNewestFirst } from "../../utils/sortDiscoverProfiles";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { ProfileFeedModal } from "../home/components/ProfileFeedModal";
import { ThemeSongDisc } from "../../components/common/ThemeSongDisc";
import { ThemeSongAutoPlayer } from "../../components/common/ThemeSongAutoPlayer";
import { CrushConfirmSheet } from "../home/components/CrushConfirmSheet";
import { CountryFilterSheet } from "./components/CountryFilterSheet";
import { PaidChatSheet } from "./components/PaidChatSheet";
import { navigateToForYou } from "../../utils/navigateToForYou";

type Filters = {
  /** null = no distance cap (worldwide). */
  maxDistanceKm: number | null;
  minAge: number;
  maxAge: number;
  hasProfilePhoto: boolean;
  verifiedOnly: boolean;
  gender: "woman" | "man" | "nonbinary";
  /** Country names — empty means worldwide. */
  countries: string[];
};
const initialFilters: Filters = {
  maxDistanceKm: null,
  minAge: 18,
  maxAge: 40,
  hasProfilePhoto: true,
  verifiedOnly: false,
  gender: "woman",
  countries: [],
};

export function DiscoveryProfilesScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "DiscoveryProfiles">) {
  const { height } = useWindowDimensions();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(route.params?.openFilters),
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [crushProfile, setCrushProfile] = useState<Profile | null>(null);
  const [crushSending, setCrushSending] = useState(false);
  const [coinsProfile, setCoinsProfile] = useState<Profile | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.key === "string") setActiveProfileId(first.key);
  }).current;
  // This screen stays mounted underneath anything pushed on top of it (profile details, chat,
  // etc.), so without this the last-viewed card's theme song just keeps playing after you leave.
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setIsScreenFocused(true);
    return () => setIsScreenFocused(false);
  }, []));
  const activeThemeSong = isScreenFocused
    ? profiles.find((p) => p.id === activeProfileId)?.themeSong ?? null
    : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        filter: "nearby",
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        hasProfilePhoto: filters.hasProfilePhoto,
        verifiedOnly: filters.verifiedOnly,
        gender: filters.gender,
      };
      if (filters.maxDistanceKm === null) params.distanceTierKm = "any";
      else params.maxDistanceKm = filters.maxDistanceKm;
      if (filters.countries.length) params.countries = filters.countries.join(",");
      const result = await discoverApi.list(params);
      setProfiles(sortProfilesNewestFirst(result.profiles));
      if (result.myLikedProfileIds?.length) {
        const alreadyLiked = result.myLikedProfileIds;
        setLikedIds((prev) => new Set([...prev, ...alreadyLiked]));
      }
    } catch (error) {
      Alert.alert(
        "Could not load Discovery",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    void load();
  }, [load]);

  const likeProfile = useCallback(
    async (profileId: string) => {
      if (likedIds.has(profileId)) return;
      setLikedIds((prev) => new Set(prev).add(profileId));
      try {
        await discoverApi.like(profileId);
      } catch (e) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
        Alert.alert("Like not sent", e instanceof Error ? e.message : "Please try again.");
      }
    },
    [likedIds],
  );

  const confirmCrush = useCallback(async () => {
    if (!crushProfile) return;
    const profile = crushProfile;
    setCrushSending(true);
    try {
      await discoverApi.crush(profile.id);
    } catch (e) {
      Alert.alert("Crushy not sent", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setCrushSending(false);
      setCrushProfile(null);
    }
  }, [crushProfile]);

  return (
    <View style={styles.root}>
      {loading ? (
        <LoadingIndicator fullScreen transparent />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <DiscoveryCard
              profile={item}
              height={height}
              liked={likedIds.has(item.id)}
              isActive={item.id === activeProfileId}
              onProfile={() => setSelected(item)}
              onLike={() => void likeProfile(item.id)}
              onCrush={() => setCrushProfile(item)}
              onChat={() => setCoinsProfile(item)}
            />
          )}
          ListEmptyComponent={
            <View style={[styles.empty, { height }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="options-outline" size={28} color="#7c3aed" />
              </View>
              <Text style={styles.emptyTitle}>No profiles match these filters</Text>
              <Text style={styles.emptyCopy}>Try widening your distance or age range to discover more people nearby.</Text>
              <Pressable style={styles.emptyBtn} onPress={() => setFiltersOpen(true)}>
                <Text style={styles.emptyBtnText}>Change filters</Text>
              </Pressable>
            </View>
          }
        />
      )}
      <View style={styles.top}>
        <Pressable style={styles.circle} onPress={() => navigateToForYou(navigation)}>
          <Ionicons name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Discovery</Text>
        <View style={styles.topSpacer} />
        <Pressable style={styles.circle} onPress={() => setSearchOpen(true)}>
          <Ionicons name="search" size={20} />
        </Pressable>
        <Pressable style={styles.circle} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options" size={20} />
          {filters.maxDistanceKm !== null || filters.countries.length > 0 ? (
            <View style={styles.redDot} />
          ) : null}
        </Pressable>
      </View>
      <ThemeSongAutoPlayer track={activeThemeSong} />
      <FilterSheet
        visible={filtersOpen}
        value={filters}
        change={setFilters}
        close={() => setFiltersOpen(false)}
        apply={() => {
          setFiltersOpen(false);
          void load();
        }}
      />
      <SearchSheet
        visible={searchOpen}
        close={() => setSearchOpen(false)}
        openProfile={async (id) => {
          const profile = await discoverApi.profile(id);
          setSelected(profile);
          setSearchOpen(false);
        }}
      />
      {selected ? (
        <ProfileFeedModal
          profile={selected}
          visible
          profileLiked={likedIds.has(selected.id)}
          onClose={() => setSelected(null)}
          onLikeProfile={() => void likeProfile(selected.id)}
          onChat={() => setCoinsProfile(selected)}
        />
      ) : null}
      <CrushConfirmSheet
        visible={Boolean(crushProfile)}
        profileName={crushProfile?.name ?? ""}
        sending={crushSending}
        onCancel={() => (crushSending ? null : setCrushProfile(null))}
        onConfirm={() => void confirmCrush()}
      />
      <PaidChatSheet
        visible={Boolean(coinsProfile)}
        profileId={coinsProfile?.id ?? null}
        profileName={coinsProfile?.name ?? ""}
        profileAvatar={coinsProfile?.avatar}
        onClose={() => setCoinsProfile(null)}
        onUnlocked={(conversationId) => {
          const profile = coinsProfile;
          setCoinsProfile(null);
          navigation.navigate("ChatDetail", {
            conversationId,
            conversation: conversationId.startsWith("icrush-")
              ? {
                  id: conversationId,
                  participantProfileId: profile?.id ?? "",
                  participantName: profile?.name ?? "",
                  participantAvatar: profile?.avatar ?? "",
                  lastMessage: "",
                  lastMessageAt: new Date().toISOString(),
                  unreadCount: 0,
                  isOnline: false,
                  matchedAt: new Date().toISOString(),
                  vibeScore: 0,
                  conversationKind: "chat_request_outgoing",
                }
              : undefined,
          });
        }}
      />
    </View>
  );
}

function DiscoveryCard({
  profile,
  height,
  liked,
  isActive,
  onProfile,
  onLike,
  onCrush,
  onChat,
}: {
  profile: Profile;
  height: number;
  liked: boolean;
  isActive: boolean;
  onProfile(): void;
  onLike(): void;
  onCrush(): void;
  onChat(): void;
}) {
  return (
    <View style={{ height, backgroundColor: "#F7F7FB" }}>
      <Image
        source={{ uri: profile.avatar }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,.02)", "transparent", "rgba(0,0,0,.56)"]}
        locations={[0, 0.64, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.location}>
        <Ionicons name="location" size={13} color="white" />
        <Text style={styles.locationText}>
          {profile.locationName || profile.distance}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.cardName}>
          {profile.name}, {profile.age}
        </Text>
        <Text style={styles.cardMeta}>
          {profile.distance}　 {profile.vibeScore}% vibe match
        </Text>
        <View style={styles.tags}>
          {profile.interests.slice(0, 3).map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.rail}>
        <Pressable onPress={onProfile}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        </Pressable>
        <Pressable onPress={onLike} disabled={liked}>
          <Ionicons name="heart" size={30} color={liked ? "#FF3860" : "white"} />
        </Pressable>
        <Text style={[styles.railText, liked && styles.railTextLiked]}>{liked ? "Liked" : "Like"}</Text>
        <Pressable onPress={onCrush}>
          <Text style={styles.crushEmoji}>💋</Text>
        </Pressable>
        <Text style={styles.railText}>crushy</Text>
        <Pressable onPress={onChat}>
          <Ionicons name="chatbox-outline" size={27} color="white" />
        </Pressable>
        <Text style={styles.railText}>Chat now</Text>
        {profile.themeSong ? (
          <View style={styles.discWrap}>
            <ThemeSongDisc albumArtUrl={profile.themeSong.albumArtUrl} spinning={isActive} size={38} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function FilterSheet({
  visible,
  value,
  change,
  close,
  apply,
}: {
  visible: boolean;
  value: Filters;
  change(v: Filters): void;
  close(): void;
  apply(): void;
}) {
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <Header title="Filters" close={close} />
          <Text style={styles.label}>
            Maximum distance{" "}
            <Text style={styles.coral}>
              {value.maxDistanceKm === null ? "No limit" : `${value.maxDistanceKm} km`}
            </Text>
          </Text>
          <View style={styles.pills}>
            {[25, 50, 100].map((v) => (
              <Pressable
                key={v}
                onPress={() => change({ ...value, maxDistanceKm: v })}
                style={[
                  styles.pill,
                  value.maxDistanceKm === v && styles.pillOn,
                ]}
              >
                <Text>{v} km</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => change({ ...value, maxDistanceKm: null })}
              style={[styles.pill, value.maxDistanceKm === null && styles.pillOn]}
            >
              <Text>No limit</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>Countries</Text>
          <Pressable style={styles.countryRow} onPress={() => setCountryPickerOpen(true)}>
            <Ionicons name="globe-outline" size={16} color="#5D5862" />
            <Text style={styles.countryRowText} numberOfLines={1}>
              {value.countries.length === 0
                ? "Worldwide"
                : value.countries.slice(0, 4).join(", ") + (value.countries.length > 4 ? ` +${value.countries.length - 4}` : "")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#B0ACB4" />
          </Pressable>
          <Text style={styles.label}>Age range</Text>
          <View style={styles.pills}>
            {[
              [18, 24],
              [25, 34],
              [35, 50],
            ].map(([min, max]) => (
              <Pressable
                key={min}
                onPress={() => change({ ...value, minAge: min, maxAge: max })}
                style={[styles.pill, value.minAge === min && styles.pillOn]}
              >
                <Text>
                  {min}–{max}
                </Text>
              </Pressable>
            ))}
          </View>
          <Toggle
            label="Only with profile photos"
            value={value.hasProfilePhoto}
            onChange={(v) => change({ ...value, hasProfilePhoto: v })}
          />
          <Toggle
            label="Verified only"
            value={value.verifiedOnly}
            onChange={(v) => change({ ...value, verifiedOnly: v })}
          />
          <View style={styles.pills}>
            {(["woman", "man", "nonbinary"] as const).map((gender) => (
              <Pressable
                key={gender}
                onPress={() => change({ ...value, gender })}
                style={[
                  styles.pill,
                  value.gender === gender && styles.genderOn,
                ]}
              >
                <Text>
                  {gender === "nonbinary"
                    ? "Non-binary"
                    : gender[0].toUpperCase() + gender.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.apply} onPress={apply}>
            <Text style={styles.applyText}>Apply filters</Text>
          </Pressable>
        </View>
      </View>
      <CountryFilterSheet
        visible={countryPickerOpen}
        selected={value.countries}
        onChange={(countries) => change({ ...value, countries })}
        onClose={() => setCountryPickerOpen(false)}
      />
    </Modal>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange(v: boolean): void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#DDD", true: "#20C46A" }}
      />
    </View>
  );
}
function SearchSheet({
  visible,
  close,
  openProfile,
}: {
  visible: boolean;
  close(): void;
  openProfile(id: string): Promise<void>;
}) {
  const [kind, setKind] = useState<"phone" | "email">("phone");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const search = async () => {
    setBusy(true);
    try {
      const matches = await discoverApi.contactSearch(query.trim(), kind);
      if (!matches.length)
        Alert.alert("No profile found", "Only people who opted in can appear.");
      else await openProfile(matches[0].userId);
    } catch (e) {
      Alert.alert(
        "Search failed",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <Header title="Search Discovery" close={close} />
          <Text style={styles.intro}>
            Only people who agreed to be found by their cellphone number or
            email can appear.
          </Text>
          <View style={styles.modes}>
            <Pressable
              style={[styles.mode, kind === "phone" && styles.modeOn]}
              onPress={() => setKind("phone")}
            >
              <Text>Cellphone</Text>
            </Pressable>
            <Pressable
              style={[styles.mode, kind === "email" && styles.modeOn]}
              onPress={() => setKind("email")}
            >
              <Text>Email</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>
            {kind === "phone" ? "Cellphone number" : "Email address"}
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            keyboardType={kind === "phone" ? "phone-pad" : "email-address"}
            autoCapitalize="none"
            style={styles.searchInput}
          />
          <Text style={styles.privacy}>
            Your search is protected and is not added to your imported contacts.
          </Text>
          <Pressable
            disabled={!query.trim() || busy}
            style={[styles.apply, (!query.trim() || busy) && { opacity: 0.5 }]}
            onPress={() => void search()}
          >
            <Text style={styles.applyText}>
              {busy ? "Searching…" : "Search Discovery"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
function Header({ title, close }: { title: string; close(): void }) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>{title}</Text>
      <Pressable style={styles.close} onPress={close}>
        <Ionicons name="close" size={20} color="#888" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F7FB" },
  top: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  circle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.94)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  title: { fontFamily: theme.typography.bold, fontSize: 25, color: "white" },
  topSpacer: { flex: 1 },
  redDot: {
    position: "absolute",
    right: 7,
    top: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D91E45",
  },
  location: {
    position: "absolute",
    top: 95,
    left: 16,
    flexDirection: "row",
    gap: 5,
    backgroundColor: "rgba(25,25,25,.65)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 17,
  },
  locationText: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 11,
  },
  info: { position: "absolute", left: 13, right: 65, bottom: 85 },
  cardName: { color: "white", fontFamily: theme.typography.bold, fontSize: 21 },
  cardMeta: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    marginTop: 5,
  },
  tags: { flexDirection: "row", gap: 7, marginTop: 10 },
  tag: {
    color: "white",
    fontFamily: theme.typography.semibold,
    fontSize: 10,
    backgroundColor: "rgba(20,20,25,.72)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  rail: {
    position: "absolute",
    right: 10,
    bottom: 86,
    alignItems: "center",
    gap: 5,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "white",
    marginBottom: 8,
  },
  crushEmoji: { fontSize: 28, lineHeight: 32 },
  railText: {
    color: "white",
    fontFamily: theme.typography.bold,
    fontSize: 9,
    marginBottom: 8,
  },
  railTextLiked: { color: "#FF3860" },
  discWrap: { marginTop: 6, padding: 3, borderRadius: 24, backgroundColor: "rgba(0,0,0,.28)" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EEFF",
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: theme.typography.bold, fontSize: 20, color: "#101018", textAlign: "center" },
  emptyCopy: {
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#8C8798",
    textAlign: "center",
    maxWidth: 280,
  },
  emptyBtn: {
    marginTop: 8,
    height: 48,
    minWidth: 180,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101018",
  },
  emptyBtnText: { fontFamily: theme.typography.bold, fontSize: 14, color: "#FFFFFF" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.55)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#EEE",
    paddingBottom: 12,
  },
  sheetTitle: { fontFamily: theme.typography.bold, fontSize: 19 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: theme.typography.bold, fontSize: 13, color: "#24212A" },
  coral: { color: "#FF765C" },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F2F2F3",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  pillOn: { borderColor: "#FF765C", backgroundColor: "#FFF0EC" },
  genderOn: { backgroundColor: "#FF6372", borderColor: "#FF6372" },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F2F2F3",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  countryRowText: { flex: 1, fontFamily: theme.typography.medium, fontSize: 13, color: "#24212A" },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  apply: {
    height: 49,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6670",
  },
  applyText: {
    color: "white",
    fontFamily: theme.typography.bold,
    fontSize: 15,
  },
  intro: {
    fontFamily: theme.typography.regular,
    color: "#5D5862",
    lineHeight: 20,
  },
  modes: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F2F2F3",
  },
  mode: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 11,
  },
  modeOn: { backgroundColor: "#FF6B69" },
  searchInput: {
    height: 57,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FF9AA8",
    paddingHorizontal: 14,
    fontFamily: theme.typography.regular,
  },
  privacy: {
    fontFamily: theme.typography.regular,
    fontSize: 11,
    color: "#96919A",
  },
});
