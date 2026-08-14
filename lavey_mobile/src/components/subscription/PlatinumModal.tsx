import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { subscriptionApi } from "../../api/services";
import { LoadingIndicator } from "../common/LoadingIndicator";
import { theme } from "../../constants/theme";
import type { PayfastCheckoutResponse, PlatinumCatalog } from "../../types";
import { PayfastCheckoutModal } from "../../screens/discover/components/PayfastCheckoutModal";
import { useAccessMode } from "../../context/AccessModeContext";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function PlatinumModal({ visible, close }: { visible: boolean; close(): void }) {
  const { allFree } = useAccessMode();
  const [catalog, setCatalog] = useState<PlatinumCatalog | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<PayfastCheckoutResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!visible || !catalog?.welcomeDiscount) return;
    const intervalId = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(intervalId);
  }, [visible, catalog?.welcomeDiscount]);

  useEffect(() => {
    if (!visible) return;
    cancelledRef.current = false;
    setError("");
    setSubscribed(false);
    void subscriptionApi
      .platinum()
      .then((data) => {
        if (cancelledRef.current) return;
        setCatalog(data);
        setSelected(data.defaultPlanId);
      })
      .catch((e) => {
        if (!cancelledRef.current) setError(e instanceof Error ? e.message : "Could not load Platinum.");
      });
    return () => {
      cancelledRef.current = true;
    };
  }, [visible]);

  const plan = catalog?.plans.find((item) => item.id === selected);

  const startCheckout = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await subscriptionApi.checkout(selected);
      setCheckout(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  const handleCheckoutFinished = async (outcome: "success" | "cancel") => {
    setCheckout(null);
    setBusy(false);
    if (outcome === "cancel") return;

    setConfirming(true);
    setConfirmText("Confirming your payment…");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const status = await subscriptionApi.status();
        if (status.isPremium) {
          setConfirming(false);
          setSubscribed(true);
          return;
        }
      } catch {
        // ITN may still be processing — keep polling.
      }
      await sleep(1500);
    }
    setConfirming(false);
    setConfirmText("Payment submitted. Platinum will activate once PayFast confirms it.");
  };

  if (allFree) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{catalog?.sheetTitle || "Platinum"}</Text>
            <Pressable style={styles.close} onPress={close}>
              <Ionicons name="close" size={20} color="#888" />
            </Pressable>
          </View>

          {!catalog && !error ? (
            <LoadingIndicator />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : subscribed ? (
                <View style={styles.successWrap}>
                  <View style={styles.successBadge}>
                    <Ionicons name="checkmark" size={30} color="white" />
                  </View>
                  <Text style={styles.successTitle}>You're Platinum!</Text>
                  <Text style={styles.successCopy}>Your perks are unlocked. Enjoy the app.</Text>
                  <Pressable style={styles.cta} onPress={close}>
                    <LinearGradient colors={["#FF4F72", "#FF825C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInner}>
                      <Text style={styles.ctaText}>Done</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : confirming ? (
                <View style={styles.confirming}>
                  <ActivityIndicator color={theme.colors.coral} />
                  <Text style={styles.confirmingText}>{confirmText}</Text>
                </View>
              ) : (
                <>
                  {catalog?.welcomeDiscount ? (
                    <View style={styles.discountBanner}>
                      <Ionicons name="pricetag" size={14} color="#B8860B" />
                      <Text style={styles.discountBannerText}>
                        {catalog.welcomeDiscount.percent}% welcome discount applied — expires in{" "}
                        {formatCountdown(new Date(catalog.welcomeDiscount.expiresAt).getTime() - now)}
                      </Text>
                    </View>
                  ) : null}
                  <LinearGradient colors={["#FFF8FC", "#F6EDFF", "#FFF4E8"]} style={styles.hero}>
                    <Image
                      source={require("../../../assets/heart-tight.png")}
                      style={styles.heroWatermark}
                      contentFit="contain"
                      tintColor="#A855F7"
                    />
                    <Text style={styles.popular}>MOST POPULAR</Text>
                    <Text style={styles.star}>{catalog?.starEmoji || "★"}</Text>
                    <Text style={styles.heroTitle}>{catalog?.heroTitle}</Text>
                    <Text style={styles.tagline}>{catalog?.heroTagline}</Text>
                    <View style={styles.heroPriceRow}>
                      {plan?.originalPrice ? <Text style={styles.heroPriceWas}>{plan.originalPrice}</Text> : null}
                      <Text style={styles.heroPrice}>
                        {plan?.price} {plan?.period}
                      </Text>
                    </View>
                  </LinearGradient>

                  <View style={styles.plans}>
                    {catalog?.plans.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setSelected(item.id)}
                        style={[styles.plan, item.id === selected && styles.planOn]}
                      >
                        <Text style={styles.planLabel}>{item.label}</Text>
                        {item.originalPrice ? <Text style={styles.planPriceWas}>{item.originalPrice}</Text> : null}
                        <Text style={styles.planPrice}>{item.price}</Text>
                        <Text style={styles.period}>{item.period}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.features}>
                    {catalog?.features.map((feature, index) => (
                      <View key={feature.id} style={styles.feature}>
                        <View style={styles.featureIcon}>
                          <Ionicons
                            name={(["heart", "flame", "eye", "options", "sparkles", "star", "cafe", "return-up-back"] as const)[index % 8]}
                            size={18}
                            color="#FF725D"
                          />
                        </View>
                        <View style={styles.featureCopy}>
                          <Text style={styles.featureTitle}>{feature.title}</Text>
                          <Text style={styles.featureText}>{feature.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <Pressable style={[styles.cta, busy && styles.ctaDisabled]} disabled={busy} onPress={() => void startCheckout()}>
                    <LinearGradient colors={["#FF4F72", "#FF825C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInner}>
                      {busy ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.ctaText}>
                          Start Platinum — {plan?.price}
                          {plan?.period}
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                  <Text style={styles.fine}>
                    {selected === "day" ? catalog?.oneTimeFinePrint : catalog?.recurringFinePrint}
                  </Text>
                  {catalog?.pricingNote ? <Text style={styles.fine}>{catalog.pricingNote}</Text> : null}
                  <Text style={styles.secure}>
                    <Ionicons name="lock-closed" size={10} color="#999" /> Secure checkout via PayFast
                  </Text>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      <PayfastCheckoutModal
        visible={Boolean(checkout)}
        checkout={checkout}
        onClose={() => {
          setCheckout(null);
          setBusy(false);
        }}
        onFinished={(outcome) => void handleCheckoutFinished(outcome)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.58)" },
  sheet: { height: "90%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { height: 62, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#EEE" },
  title: { fontFamily: theme.typography.bold, fontSize: 20 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F4F4F5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DDD" },
  content: { padding: 18, paddingBottom: 32 },
  hero: { borderRadius: 18, padding: 20, alignItems: "center", overflow: "hidden" },
  heroWatermark: {
    position: "absolute",
    width: 220,
    height: 220,
    right: -50,
    bottom: -60,
    opacity: 0.14,
    transform: [{ rotate: "-12deg" }],
  },
  popular: { fontFamily: theme.typography.bold, fontSize: 10, color: "#7C3AED", backgroundColor: "#EEE5FF", paddingHorizontal: 13, paddingVertical: 6, borderRadius: 14 },
  star: { fontSize: 25, marginTop: 8 },
  heroTitle: { fontFamily: theme.typography.bold, fontSize: 23, color: "#35213F" },
  tagline: { fontFamily: theme.typography.medium, fontSize: 12, color: "#77677F", textAlign: "center", marginTop: 5, maxWidth: 310 },
  heroPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  heroPriceWas: {
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    color: "#9D8CA5",
    textDecorationLine: "line-through",
  },
  heroPrice: { fontFamily: theme.typography.bold, fontSize: 15, color: "#6D28D9", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6D8F1", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18 },
  discountBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF7E0",
    borderWidth: 1,
    borderColor: "#F2D27A",
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  discountBannerText: { fontFamily: theme.typography.bold, fontSize: 11.5, color: "#8A6300" },
  plans: { flexDirection: "row", gap: 8, marginTop: 12 },
  plan: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: "#DDD", backgroundColor: "#FAFAFB" },
  planOn: { borderWidth: 2, borderColor: "#7B35FF" },
  planLabel: { fontFamily: theme.typography.bold, fontSize: 11 },
  planPriceWas: {
    fontFamily: theme.typography.medium,
    fontSize: 9.5,
    color: "#AFA9B5",
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  planPrice: { fontFamily: theme.typography.bold, fontSize: 12, color: "#FF755C", marginTop: 2 },
  period: { fontFamily: theme.typography.medium, fontSize: 9, color: "#999" },
  features: { marginTop: 14, gap: 11 },
  feature: { flexDirection: "row", gap: 10, alignItems: "center" },
  featureIcon: { width: 39, height: 39, borderRadius: 10, backgroundColor: "#FFF0F3", borderWidth: 1, borderColor: "#FFC0CA", alignItems: "center", justifyContent: "center" },
  featureCopy: { flex: 1 },
  featureTitle: { fontFamily: theme.typography.bold, fontSize: 12.5 },
  featureText: { fontFamily: theme.typography.regular, fontSize: 10.5, color: "#69646C", lineHeight: 15 },
  cta: { marginTop: 18 },
  ctaDisabled: { opacity: 0.7 },
  ctaInner: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: theme.typography.bold, fontSize: 14, color: "white" },
  fine: { fontFamily: theme.typography.regular, fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 10 },
  secure: { fontFamily: theme.typography.regular, fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 6 },
  error: { fontFamily: theme.typography.medium, color: "#C33", textAlign: "center", marginTop: 30 },
  confirming: { alignItems: "center", gap: 10, paddingVertical: 60 },
  confirmingText: { fontFamily: theme.typography.medium, fontSize: 12.5, color: "#5D5862", textAlign: "center" },
  successWrap: { alignItems: "center", paddingVertical: 40 },
  successBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#20C46A", alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: theme.typography.bold, fontSize: 20, color: theme.colors.text, marginTop: 16 },
  successCopy: { fontFamily: theme.typography.regular, fontSize: 13, color: "#7A7580", marginTop: 6, textAlign: "center" },
});
