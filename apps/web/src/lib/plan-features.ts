import { PLAN_CONFIGS, PLAN_ORDER, type PlanKey, type PlanConfig } from '@storebuilder/types';

export type Plan = PlanKey;

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: PLAN_CONFIGS.FREE.nameAr,
  PRO: PLAN_CONFIGS.PRO.nameAr,
  ENTERPRISE: PLAN_CONFIGS.ENTERPRISE.nameAr,
};

export const PLAN_COLORS: Record<Plan, { bg: string; text: string; border: string }> = {
  FREE:       { bg: '#F6F8FA', text: '#5B6B7B',  border: '#E6ECF1' },
  PRO:        { bg: '#F1ECFE', text: '#8B5CF6',  border: '#C2CDD8' },
  ENTERPRISE: { bg: '#FEF3E2', text: '#F59E0B',  border: '#FBBF24' },
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

/** -1 in PLAN_CONFIGS means unlimited → null here. */
const lim = (p: Plan, k: 'products' | 'ordersPerMonth' | 'categories' | 'maxCoupons' | 'maxBrands' | 'maxBanners' | 'maxAffiliates' | 'maxStaff' | 'maxBranches') => {
  const v = PLAN_CONFIGS[p][k];
  return v === -1 ? null : v;
};

export const FEATURE_LIMITS: FeatureLimit[] = [
  { feature: 'products', minPlan: 'FREE', limit: { FREE: lim('FREE', 'products'), PRO: lim('PRO', 'products'), ENTERPRISE: lim('ENTERPRISE', 'products') }, description: 'عدد المنتجات', upgradeHint: 'ارفع للاحترافية لإضافة منتجات بلا حد' },
  { feature: 'orders', minPlan: 'FREE', limit: { FREE: lim('FREE', 'ordersPerMonth'), PRO: lim('PRO', 'ordersPerMonth'), ENTERPRISE: lim('ENTERPRISE', 'ordersPerMonth') }, description: 'الطلبات الشهرية', upgradeHint: 'ارفع للاحترافية لتستقبل طلبات بلا حد' },
  { feature: 'categories', minPlan: 'FREE', limit: { FREE: lim('FREE', 'categories'), PRO: lim('PRO', 'categories'), ENTERPRISE: lim('ENTERPRISE', 'categories') }, description: 'التصنيفات', upgradeHint: 'ارفع باقتك لإضافة تصنيفات أكثر' },
  { feature: 'analytics', minPlan: 'PRO', description: 'تحليلات المتجر', upgradeHint: 'الإيرادات والأكثر مبيعاً وآخر الطلبات متاحة في الاحترافية' },
  { feature: 'affiliates', minPlan: 'PRO', limit: { FREE: lim('FREE', 'maxAffiliates'), PRO: lim('PRO', 'maxAffiliates'), ENTERPRISE: lim('ENTERPRISE', 'maxAffiliates') }, description: 'المسوقون بالعمولة', upgradeHint: 'اعرف أي مؤثر جلب لك المبيعات — متاح في الاحترافية' },
  { feature: 'coupons', minPlan: 'FREE', limit: { FREE: lim('FREE', 'maxCoupons'), PRO: lim('PRO', 'maxCoupons'), ENTERPRISE: lim('ENTERPRISE', 'maxCoupons') }, description: 'أكواد الخصم', upgradeHint: 'ارفع باقتك لإضافة أكواد خصم أكثر' },
  { feature: 'promotions', minPlan: 'PRO', description: 'العروض التلقائية', upgradeHint: '«اشترِ X واحصل على Y» والخصم المتدرج متاحة في الاحترافية' },
  { feature: 'gift_cards', minPlan: 'ENTERPRISE', description: 'بطاقات الهدايا', upgradeHint: 'بطاقات الهدايا متاحة في باقة الأعمال' },
  { feature: 'brands', minPlan: 'PRO', limit: { FREE: lim('FREE', 'maxBrands'), PRO: lim('PRO', 'maxBrands'), ENTERPRISE: lim('ENTERPRISE', 'maxBrands') }, description: 'الماركات التجارية', upgradeHint: 'ارفع للاحترافية لإضافة ماركات' },
  { feature: 'banners', minPlan: 'FREE', limit: { FREE: lim('FREE', 'maxBanners'), PRO: lim('PRO', 'maxBanners'), ENTERPRISE: lim('ENTERPRISE', 'maxBanners') }, description: 'البانرات الإعلانية', upgradeHint: 'ارفع باقتك لإضافة بانرات أكثر' },
  { feature: 'abandoned_carts', minPlan: 'PRO', description: 'تفاصيل السلال المتروكة', upgradeHint: 'اعرف من ترك سلته وتواصل معه — متاح في الاحترافية' },
  { feature: 'product_comments', minPlan: 'PRO', description: 'التعليق على المنتجات', upgradeHint: 'التعليقات النصية مع التقييم متاحة في الاحترافية' },
  { feature: 'chat', minPlan: 'PRO', description: 'المحادثة مع العملاء', upgradeHint: 'أجب على الزبون وهو داخل المتجر — متاح في الاحترافية' },
  { feature: 'custom_domain', minPlan: 'ENTERPRISE', description: 'نطاق مخصص', upgradeHint: 'زبائنك يرون علامتك أنت — الدومين الخاص في باقة الأعمال' },
  { feature: 'staff', minPlan: 'ENTERPRISE', limit: { FREE: lim('FREE', 'maxStaff'), PRO: lim('PRO', 'maxStaff'), ENTERPRISE: lim('ENTERPRISE', 'maxStaff') }, description: 'حسابات الموظفين', upgradeHint: 'أضف فريقك بصلاحيات محددة — في باقة الأعمال' },
  { feature: 'branches', minPlan: 'ENTERPRISE', limit: { FREE: lim('FREE', 'maxBranches'), PRO: lim('PRO', 'maxBranches'), ENTERPRISE: lim('ENTERPRISE', 'maxBranches') }, description: 'الفروع والمخازن', upgradeHint: 'وجّه الطلبات للفرع الأقرب — في باقة الأعمال' },
  { feature: 'languages', minPlan: 'ENTERPRISE', description: 'لغات المتجر', upgradeHint: 'بِع لزبائن أربيل والسليمانية ودهوك بلغتهم — في باقة الأعمال' },
  { feature: 'remove_branding', minPlan: 'ENTERPRISE', description: 'إزالة «مدعوم بـ بازار»', upgradeHint: 'متجرك باسمك فقط — في باقة الأعمال' },
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
