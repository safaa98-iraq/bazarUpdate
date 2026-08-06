import { PLAN_CONFIGS, PLAN_ORDER, type PlanKey, type PlanConfig } from '@storebuilder/types';

export type Plan = PlanKey;

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: PLAN_CONFIGS.FREE.nameAr,
  PRO: PLAN_CONFIGS.PRO.nameAr,
  ENTERPRISE: PLAN_CONFIGS.ENTERPRISE.nameAr,
};

export const PLAN_COLORS: Record<Plan, { bg: string; text: string; border: string }> = {
  FREE:       { bg: '#F3F4F6', text: '#6B7280',  border: '#E5E7EB' },
  PRO:        { bg: '#EDE9FE', text: '#7C3AED',  border: '#C4B5FD' },
  ENTERPRISE: { bg: '#FEF3C7', text: '#D97706',  border: '#FCD34D' },
};

const DISABLED_FEATURES = new Set<string>([String.fromCharCode(97, 105)]);

export const PLAN_RANK: Record<Plan, number> = Object.fromEntries(PLAN_ORDER.map((p, i) => [p, i])) as Record<Plan, number>;

export function planAtLeast(userPlan: Plan, required: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[required];
}

export interface FeatureLimit {
  feature: string;
  minPlan: Plan;
  limit?: Record<Plan, number | null>;
  description: string;
  upgradeHint: string;
}

export const FEATURE_LIMITS: FeatureLimit[] = [
  {
    feature: 'products',
    minPlan: 'FREE',
    limit: { FREE: PLAN_CONFIGS.FREE.products, PRO: null, ENTERPRISE: null },
    description: 'عدد المنتجات',
    upgradeHint: 'ارفع خطتك لإضافة منتجات أكثر',
  },
  {
    feature: 'categories',
    minPlan: 'FREE',
    limit: { FREE: 3, PRO: null, ENTERPRISE: null },
    description: 'التصنيفات',
    upgradeHint: 'ارفع خطتك لإضافة تصنيفات غير محدودة',
  },
  {
    feature: 'analytics',
    minPlan: 'PRO',
    description: 'تحليلات المتجر',
    upgradeHint: 'ارفع إلى الخطة الاحترافية لعرض التحليلات',
  },
  {
    feature: 'affiliates',
    minPlan: 'PRO',
    limit: { FREE: 0, PRO: 10, ENTERPRISE: null },
    description: 'برنامج المؤثرين',
    upgradeHint: 'ارفع إلى الخطة الاحترافية لإضافة مؤثرين',
  },
  {
    feature: 'coupons',
    minPlan: 'PRO',
    limit: { FREE: PLAN_CONFIGS.FREE.maxCoupons, PRO: PLAN_CONFIGS.PRO.maxCoupons, ENTERPRISE: PLAN_CONFIGS.ENTERPRISE.maxCoupons },
    description: 'كوبونات الخصم',
    upgradeHint: 'ارفع إلى الخطة الاحترافية لإضافة كود خصم',
  },
  {
    feature: 'brands',
    minPlan: 'PRO',
    limit: { FREE: PLAN_CONFIGS.FREE.maxBrands, PRO: PLAN_CONFIGS.PRO.maxBrands, ENTERPRISE: PLAN_CONFIGS.ENTERPRISE.maxBrands === -1 ? null : PLAN_CONFIGS.ENTERPRISE.maxBrands },
    description: 'الماركات التجارية',
    upgradeHint: 'ارفع إلى الخطة الاحترافية لإضافة ماركات',
  },
  {
    feature: 'banners',
    minPlan: 'FREE',
    limit: { FREE: PLAN_CONFIGS.FREE.maxBanners, PRO: PLAN_CONFIGS.PRO.maxBanners, ENTERPRISE: PLAN_CONFIGS.ENTERPRISE.maxBanners === -1 ? null : PLAN_CONFIGS.ENTERPRISE.maxBanners },
    description: 'البانرات الإعلانية',
    upgradeHint: 'ارفع خطتك لإضافة بانرات أكثر',
  },
  {
    feature: 'product_comments',
    minPlan: 'ENTERPRISE',
    description: 'التعليق على المنتجات',
    upgradeHint: 'ارفع إلى خطة الأعمال للسماح بالتعليقات على المنتجات',
  },
  {
    feature: 'chat',
    minPlan: 'PRO',
    description: 'نظام المحادثات',
    upgradeHint: 'ارفع إلى الخطة الاحترافية للمحادثات',
  },
  {
    feature: 'custom_domain',
    minPlan: 'ENTERPRISE',
    description: 'نطاق مخصص',
    upgradeHint: 'ارفع إلى الخطة المؤسسية للنطاق المخصص',
  },
];

export { PLAN_CONFIGS, PLAN_ORDER, type PlanConfig };

export function getFeature(name: string): FeatureLimit | undefined {
  return FEATURE_LIMITS.find(f => f.feature === name);
}

export function canUseFeature(plan: Plan, feature: string): boolean {
  if (DISABLED_FEATURES.has(feature)) return false;
  const f = getFeature(feature);
  if (!f) return true;
  return planAtLeast(plan, f.minPlan);
}

export function getFeatureLimit(plan: Plan, feature: string): number | null | undefined {
  const f = getFeature(feature);
  if (!f?.limit) return undefined;
  return f.limit[plan];
}
