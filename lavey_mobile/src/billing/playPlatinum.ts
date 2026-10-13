import type { Purchase } from "expo-iap";

export const PLAY_PLANS: Record<string, { productId: string; type: "in-app" | "subs" }> = {
  day: { productId: "platinum_day", type: "in-app" },
  week: { productId: "platinum_week", type: "subs" },
  month: { productId: "platinum_month", type: "subs" },
};

export class PlayBillingUnavailable extends Error {
  constructor() {
    super("Google Play billing is not available on this device.");
    this.name = "PlayBillingUnavailable";
  }
}

export class PlayPurchaseCancelled extends Error {
  constructor() {
    super("Purchase cancelled.");
    this.name = "PlayPurchaseCancelled";
  }
}

export interface PlayPlatinumPurchase {
  productId: string;
  purchaseToken: string;
  purchase: Purchase;
  consumable: boolean;
}

function isCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: string }).code ?? "").toLowerCase();
  return code.includes("cancel");
}

function isUnavailable(error: unknown): boolean {
  const code = String((error as { code?: string })?.code ?? "").toLowerCase();
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    code.includes("billing-unavailable") ||
    code.includes("not-prepared") ||
    code.includes("service-disconnected") ||
    /native module|cannot find native|expo-iap|nitro/i.test(message)
  );
}

function offerToken(product: object): string | null {
  const offers = (product as { subscriptionOffers?: Array<{ offerToken?: string | null }> | null }).subscriptionOffers;
  return offers?.find((offer) => offer.offerToken)?.offerToken ?? null;
}

export async function preparePlayBilling(): Promise<boolean> {
  try {
    const iap = await import("expo-iap");
    await iap.initConnection();
    return true;
  } catch {
    return false;
  }
}

export async function purchasePlayPlatinum(planId: string, userId: string): Promise<PlayPlatinumPurchase> {
  const spec = PLAY_PLANS[planId];
  if (!spec) throw new Error("That plan is not available.");

  let iap: typeof import("expo-iap");
  try {
    iap = await import("expo-iap");
    await iap.initConnection();
  } catch (error) {
    if (isUnavailable(error) || error instanceof Error) throw new PlayBillingUnavailable();
    throw new PlayBillingUnavailable();
  }

  const products = await iap.fetchProducts({ skus: [spec.productId], type: spec.type });
  const product = products?.find((item) => item.id === spec.productId);
  if (!product) {
    throw new Error("Google Play does not have this plan yet. Add it in Play Console, then try again.");
  }

  const token = spec.type === "subs" ? offerToken(product) : null;
  if (spec.type === "subs" && !token) {
    throw new Error("Google Play does not have a price for this plan yet.");
  }

  const purchase = await new Promise<Purchase>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Google Play did not finish the purchase. Try again."));
    }, 120_000);
    const updated = iap.purchaseUpdatedListener((next) => {
      const matches = next.productId === spec.productId || next.ids?.includes(spec.productId);
      if (!matches || !next.purchaseToken) return;
      cleanup();
      resolve(next);
    });
    const failed = iap.purchaseErrorListener((error) => {
      cleanup();
      reject(error);
    });
    const cleanup = () => {
      clearTimeout(timeout);
      updated.remove();
      failed.remove();
    };

    const request =
      spec.type === "subs"
        ? iap.requestPurchase({
            type: "subs",
            request: {
              google: {
                skus: [spec.productId],
                obfuscatedAccountId: userId,
                subscriptionOffers: [{ sku: spec.productId, offerToken: token! }],
              },
            },
          })
        : iap.requestPurchase({
            type: "in-app",
            request: {
              google: {
                skus: [spec.productId],
                obfuscatedAccountId: userId,
              },
            },
          });

    void Promise.resolve(request).catch((error: unknown) => {
      cleanup();
      reject(error);
    });
  }).catch((error: unknown) => {
    if (isCancelled(error)) throw new PlayPurchaseCancelled();
    if (isUnavailable(error)) throw new PlayBillingUnavailable();
    throw error instanceof Error ? error : new Error("Could not start Google Play checkout.");
  });

  return {
    productId: spec.productId,
    purchaseToken: purchase.purchaseToken!,
    purchase,
    consumable: spec.type === "in-app",
  };
}

export async function finishPlayPurchase(result: PlayPlatinumPurchase): Promise<void> {
  const iap = await import("expo-iap");
  await iap.finishTransaction({ purchase: result.purchase, isConsumable: result.consumable });
}
