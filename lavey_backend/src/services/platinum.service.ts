import { supabase } from '../lib/supabase.js';
import { STATIC_PLATINUM_CATALOG, type PlatinumCatalogDto } from '../data/platinumCatalog.static.js';
import { AppError } from '../utils/appError.js';

interface CatalogRow {
  sheet_title: string;
  hero_title: string;
  hero_tagline: string;
  star_emoji: string;
  one_time_fine_print: string;
  recurring_fine_print: string;
}

interface PlanRow {
  plan_key: string;
  label: string;
  price_display: string;
  period_display: string;
  badge: string | null;
  is_popular: boolean;
  is_default: boolean;
  sort_order: number;
}

interface FeatureRow {
  feature_key: string;
  title: string;
  description: string;
  icon_key: string;
  sort_order: number;
}

export async function getPlatinumCatalog(): Promise<PlatinumCatalogDto> {
  const { data: catalog, error: catalogError } = await supabase
    .from('platinum_catalog')
    .select('sheet_title, hero_title, hero_tagline, star_emoji, one_time_fine_print, recurring_fine_print')
    .eq('is_active', true)
    .eq('id', 1)
    .maybeSingle();

  if (catalogError) {
    throw new AppError(500, 'PLATINUM_CATALOG_READ_FAILED', catalogError.message);
  }

  const { data: plans, error: plansError } = await supabase
    .from('platinum_plans')
    .select('plan_key, label, price_display, period_display, badge, is_popular, is_default, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (plansError) {
    throw new AppError(500, 'PLATINUM_PLANS_READ_FAILED', plansError.message);
  }

  const { data: features, error: featuresError } = await supabase
    .from('platinum_features')
    .select('feature_key, title, description, icon_key, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (featuresError) {
    throw new AppError(500, 'PLATINUM_FEATURES_READ_FAILED', featuresError.message);
  }

  const planRows = (plans ?? []) as PlanRow[];
  const featureRows = (features ?? []) as FeatureRow[];

  if (!catalog || planRows.length === 0 || featureRows.length === 0) {
    return STATIC_PLATINUM_CATALOG;
  }

  const catalogRow = catalog as CatalogRow;
  const defaultPlan =
    planRows.find((plan) => plan.is_default) ?? planRows[planRows.length - 1];

  return {
    sheetTitle: catalogRow.sheet_title,
    heroTitle: catalogRow.hero_title,
    heroTagline: catalogRow.hero_tagline,
    starEmoji: catalogRow.star_emoji,
    defaultPlanId: defaultPlan.plan_key,
    oneTimeFinePrint: catalogRow.one_time_fine_print,
    recurringFinePrint: catalogRow.recurring_fine_print,
    plans: planRows.map((plan) => ({
      id: plan.plan_key,
      label: plan.label,
      price: plan.price_display,
      period: plan.period_display,
      badge: plan.badge ?? undefined,
      popular: plan.is_popular || undefined,
    })),
    features: featureRows.map((feature) => ({
      id: feature.icon_key || feature.feature_key,
      title: feature.title,
      description: feature.description,
    })),
  };
}
