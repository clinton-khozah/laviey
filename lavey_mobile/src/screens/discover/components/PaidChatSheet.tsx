import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { paidChatApi } from "../../../api/services";
import { theme } from "../../../constants/theme";
import type { ChatCreditCatalog, ChatCreditPack, PayfastCheckoutResponse } from "../../../types";
import { GoldCoin } from "./GoldCoin";
import { PayfastCheckoutModal } from "./PayfastCheckoutModal";
import { useAccessMode } from "../../../context/AccessModeContext";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function CoinStack({ credits }: { credits: number }) {
  const count = credits >= 150 ? 3 : credits >= 50 ? 2 : 1;
  const offsets = [
    { translateX: 0, translateY: 0, rotate: "0deg" },
    { translateX: -10, translateY: 6, rotate: "-10deg" },
    { translateX: 10, translateY: 10, rotate: "10deg" },
  ];
  return (
    <View style={styles.coinStack}>
      {Array.from({ length: count }, (_, i) => (
        <GoldCoin
          key={i}
          size={46}
          style={[
            styles.coinStacked,
            {
              transform: [
                { translateX: offsets[i].translateX },
                { translateY: offsets[i].translateY },
                { rotate: offsets[i].rotate },
              ],
              zIndex: count - i,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function PaidChatSheet({
  profileId,
  profileName,
  profileAvatar,
  visible,
  onClose,
  onUnlocked,
}: {
  profileId: string | null;
  profileName: string;
  profileAvatar?: string;
  visible: boolean;
  onClose(): void;
  onUnlocked(conversationId: string): void;
}) {
  const { allFree } = useAccessMode();
  const [catalog, setCatalog] = useState<ChatCreditCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<PayfastCheckoutResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (visible) setRequestMessage("");
  }, [visible, profileId]);

  useEffect(() => {
    if (!visible || !profileId || allFree) return;
    cancelledRef.current = false;
    setError(null);
    setLoading(true);
    void paidChatApi
      .catalog()
      .then((next) => {
        if (!cancelledRef.current) setCatalog(next);
      })
      .catch((e) => {
        if (!cancelledRef.current) setError(e instanceof Error ? e.message : "Could not load chat credits.");
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });
    return () => {
      cancelledRef.current = true;
    };
  }, [visible, profileId, allFree]);

  if (!profileId) return null;

  const unlock = async () => {
    setBusyId("unlock");
    setError(null);
    try {
      const result = allFree
        ? await paidChatApi.requestFree(profileId, requestMessage)
        : await paidChatApi.unlock(profileId);
      onUnlocked(result.conversationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlock this chat.");
    } finally {
      setBusyId(null);
    }
  };

  const buy = async (pack: ChatCreditPack) => {
    setBusyId(pack.id);
    setError(null);
    try {
      const result = await paidChatApi.checkout(pack.id, profileId);
      setCheckout(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusyId(null);
    }
  };

  const handleCheckoutFinished = async (outcome: "success" | "cancel") => {
    const finishedCheckout = checkout;
    setCheckout(null);
    setBusyId(null);
    if (outcome === "cancel" || !finishedCheckout) return;

    setConfirming(true);
    setConfirmText("Confirming your chat credits…");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const status = await paidChatApi.checkoutStatus(finishedCheckout.mPaymentId);
        if (status.status === "complete") {
          if (status.conversationId && status.targetProfileId) {
            setConfirming(false);
            onUnlocked(status.conversationId);
            return;
          }
          setCatalog((prev) => (prev ? { ...prev, balance: status.balance } : prev));
          setConfirmText(`${status.credits} credits ready. Balance: ${status.balance}.`);
          setConfirming(false);
          return;
        }
        if (status.status === "failed" || status.status === "cancelled") break;
      } catch {
        // ITN may still be processing — keep polling.
      }
      await sleep(1500);
    }
    setConfirming(false);
    setConfirmText("Payment submitted. Credits will appear once PayFast confirms it.");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{allFree ? "Send a chat request" : "Chat now"}</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#888" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.heroAvatarWrap}>
                {profileAvatar ? (
                  <Image source={{ uri: profileAvatar }} style={styles.heroAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
                    <Ionicons name="person" size={22} color="#B0ACB4" />
                  </View>
                )}
                <View style={styles.heroAvatarBadge}>
                  <Ionicons name="chatbubble-ellipses" size={11} color="white" />
                </View>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Message {profileName} before matching</Text>
                <Text style={styles.heroSubtitle}>
                  {allFree ? "They'll receive your request and can view your profile, accept it, or decline it." : "One chat credit opens the conversation. They can reply, ignore, or block it."}
                </Text>
              </View>
            </View>

            {allFree ? (
              <View style={styles.requestCard}>
                <View style={styles.requestNotice}>
                  <Ionicons name="shield-checkmark" size={18} color="#20A66A" />
                  <Text style={styles.requestNoticeText}>Free and consent-based. Chat opens after {profileName.split(" ")[0]} accepts.</Text>
                </View>
                <View style={styles.messageComposer}>
                  <TextInput
                    value={requestMessage}
                    onChangeText={setRequestMessage}
                    placeholder={`Write a message to ${profileName.split(" ")[0]}…`}
                    placeholderTextColor="#AAA5AF"
                    multiline
                    maxLength={500}
                    style={styles.messageInput}
                    textAlignVertical="top"
                  />
                  <Text style={styles.messageCount}>{requestMessage.length}/500</Text>
                </View>
                <Pressable
                  style={[styles.requestButton, Boolean(busyId) && styles.disabled]}
                  disabled={Boolean(busyId)}
                  onPress={() => void unlock()}
                >
                  {busyId ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={17} color="white" />
                      <Text style={styles.requestButtonText}>
                        {requestMessage.trim() ? "Send request & message" : "Send chat request"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : loading ? (
              <ActivityIndicator style={styles.spinner} color={theme.colors.coral} />
            ) : confirming ? (
              <View style={styles.confirming}>
                <ActivityIndicator color={theme.colors.coral} />
                <Text style={styles.confirmingText}>{confirmText}</Text>
              </View>
            ) : catalog ? (
              <>
                <View style={styles.balance}>
                  <Text style={styles.balanceLabel}>Your balance</Text>
                  <View style={styles.balanceValue}>
                    <GoldCoin size={26} />
                    <Text style={styles.balanceText}>
                      {catalog.balance} {catalog.balance === 1 ? "credit" : "credits"}
                    </Text>
                  </View>
                </View>

                {catalog.balance > 0 ? (
                  <Pressable
                    style={[styles.unlockBtn, Boolean(busyId) && styles.disabled]}
                    disabled={Boolean(busyId)}
                    onPress={() => void unlock()}
                  >
                    <Text style={styles.unlockText}>
                      {busyId === "unlock" ? "Opening chat…" : `Use 1 credit to chat with ${profileName.split(" ")[0]}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.status}>Buy a credit pack to start this chat.</Text>
                )}
                {confirmText && !confirming ? <Text style={styles.status}>{confirmText}</Text> : null}

                <View style={styles.packs}>
                  {catalog.packs.map((pack) => (
                    <Pressable
                      key={pack.id}
                      style={[styles.pack, Boolean(busyId) && styles.disabled]}
                      disabled={Boolean(busyId)}
                      onPress={() => void buy(pack)}
                    >
                      <CoinStack credits={pack.credits} />
                      <View style={styles.packCopy}>
                        <Text style={styles.packLabel}>{pack.label}</Text>
                        <Text style={styles.packDescription} numberOfLines={1}>
                          {pack.description}
                        </Text>
                      </View>
                      <Text style={styles.packPrice}>
                        {busyId === pack.id ? "…" : `R${pack.amountZar.toFixed(2)}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!allFree ? <Text style={styles.fine}>Secure checkout via PayFast. Credits are added only after payment is confirmed.</Text> : null}
          </ScrollView>
        </View>
      </View>
      <PayfastCheckoutModal
        visible={Boolean(checkout)}
        checkout={checkout}
        onClose={() => {
          setCheckout(null);
          setBusyId(null);
        }}
        onFinished={(outcome) => void handleCheckoutFinished(outcome)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.58)" },
  sheet: { maxHeight: "88%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  title: { fontFamily: theme.typography.bold, fontSize: 18 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center" },
  content: { padding: 18, paddingBottom: 30, gap: 4 },
  hero: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F7F7FB",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    alignItems: "flex-start",
  },
  heroAvatarWrap: { width: 52, height: 52 },
  heroAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "white" },
  heroAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#EDEBEF" },
  heroAvatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF6670",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontFamily: theme.typography.bold, fontSize: 14.5, color: theme.colors.text },
  heroSubtitle: { fontFamily: theme.typography.regular, fontSize: 11, color: "#7A7580", marginTop: 4, lineHeight: 15 },
  spinner: { marginTop: 30 },
  confirming: { alignItems: "center", gap: 10, paddingVertical: 30 },
  confirmingText: { fontFamily: theme.typography.medium, fontSize: 12.5, color: "#5D5862", textAlign: "center" },
  requestCard: { marginTop: 14, gap: 12 },
  requestNotice: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 13, backgroundColor: "#EAF9F2", borderWidth: 1, borderColor: "#C7EEDD" },
  requestNoticeText: { flex: 1, fontFamily: theme.typography.medium, fontSize: 11, lineHeight: 16, color: "#35745A" },
  messageComposer: { minHeight: 122, padding: 13, paddingBottom: 27, borderRadius: 17, borderWidth: 1.5, borderColor: "#E2DDE5", backgroundColor: "#FBFAFC" },
  messageInput: { minHeight: 78, padding: 0, fontFamily: theme.typography.regular, fontSize: 13.5, lineHeight: 20, color: theme.colors.text },
  messageCount: { position: "absolute", right: 12, bottom: 8, fontFamily: theme.typography.medium, fontSize: 9.5, color: "#AAA5AF" },
  requestButton: {
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#303034",
  },
  requestButtonText: { color: "white", fontFamily: theme.typography.bold, fontSize: 14 },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 14,
  },
  balanceLabel: { fontFamily: theme.typography.medium, fontSize: 12.5, color: "#7A7580" },
  balanceValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceText: { fontFamily: theme.typography.bold, fontSize: 16, color: "#20C46A" },
  unlockBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6670",
  },
  unlockText: { color: "white", fontFamily: theme.typography.bold, fontSize: 14 },
  disabled: { opacity: 0.55 },
  status: {
    fontFamily: theme.typography.regular,
    fontSize: 11.5,
    color: "#7A7580",
    textAlign: "center",
    marginTop: 10,
  },
  packs: { marginTop: 16, gap: 8 },
  pack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 74,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FAFAFB",
    borderWidth: 1,
    borderColor: "#ECEAEC",
  },
  coinStack: { width: 60, height: 46, alignItems: "center", justifyContent: "center" },
  coinStacked: { position: "absolute" },
  packCopy: { flex: 1, gap: 2 },
  packLabel: { fontFamily: theme.typography.bold, fontSize: 13.5, color: theme.colors.text },
  packDescription: { fontFamily: theme.typography.regular, fontSize: 10.5, color: "#9A96A0" },
  packPrice: { fontFamily: theme.typography.bold, fontSize: 15, color: "#B8790E" },
  error: {
    fontFamily: theme.typography.medium,
    fontSize: 12,
    color: "#C33",
    textAlign: "center",
    marginTop: 14,
  },
  fine: {
    fontFamily: theme.typography.regular,
    fontSize: 9.5,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
  },
});
