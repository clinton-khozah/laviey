export interface PlatinumPlan {
  id: string;
  label: string;
  price: string;
  period: string;
  badge?: string;
  popular?: boolean;
}

export interface PlatinumFeature {
  id: string;
  title: string;
  description: string;
}

export interface PlatinumCatalog {
  sheetTitle: string;
  heroTitle: string;
  heroTagline: string;
  starEmoji: string;
  defaultPlanId: string;
  oneTimeFinePrint: string;
  recurringFinePrint: string;
  displayCurrency: string;
  billingCurrency: string;
  pricingNote?: string | null;
  plans: PlatinumPlan[];
  features: PlatinumFeature[];
}
