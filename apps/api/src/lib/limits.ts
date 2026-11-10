/**
 * Plan limits that depend on usage (not just on a feature switch).
 * Count-type limits come from PLAN_CONFIGS (-1 = unlimited, 0 = not on this plan).
 */
import prisma from '@storebuilder/database';
import { PLAN_CONFIGS, type PlanKey, type PlanConfig } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';
import { notifyUser } from './notify';

type CountKey = 'products' | 'ordersPerMonth' | 'categories' | 'maxCoupons' | 'maxBrands' | 'maxBanners' | 'maxAffiliates' | 'maxStaff' | 'maxBranches';

export function planLimit(plan: PlanKey | string, key: CountKey): number {
  return (PLAN_CONFIGS[(plan as PlanKey)] ?? PLAN_CONFIGS.FREE)[key as keyof PlanConfig] as number;
}

/**
 * Throw a 403 when adding one more item would pass the plan's limit.
 * `label` is the Arabic noun shown to the merchant.
 */
export function assertUnderLimit(plan: PlanKey | string, key: CountKey, current: number, label: string) {
  const limit = planLimit(plan, key);
  if (limit === -1) return;
  if (limit === 0) throw new AppError(403, `${label} غير متاحة في باقتك الحالية. ارفع باقتك لتفعيلها.`);
  if (current >= limit) throw new AppError(403, `وصلت إلى الحد الأقصى لـ${label} في باقتك (${limit}). ارفع باقتك للمزيد.`);
}

export async function planOfStore(storeId: string): Promise<{ plan: PlanKey; merchantId: string }> {
  const s = await prisma.store.findUnique({ where: { id: storeId }, select: { merchantId: true, merchant: { select: { plan: true } } } });
  if (!s) throw new AppError(404, 'المتجر غير موجود');
  return { plan: s.merchant.plan as PlanKey, merchantId: s.merchantId };
}

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Real (non-draft) orders this calendar month. */
export async function ordersThisMonth(storeId: string): Promise<number> {
  return prisma.order.count({ where: { storeId, status: { not: 'DRAFT' }, createdAt: { gte: monthStart() } } });
}

export async function orderUsage(storeId: string) {
  const { plan } = await planOfStore(storeId);
  const limit = planLimit(plan, 'ordersPerMonth');
  const used = await ordersThisMonth(storeId);
  return { plan, used, limit, remaining: limit === -1 ? null : Math.max(0, limit - used) };
}

/** Customer-facing: the store cannot take more orders this month on the Free plan. */
export async function assertCanReceiveOrder(storeId: string, audience: 'customer' | 'merchant' = 'customer') {
  const { limit, used } = await orderUsage(storeId);
  if (limit !== -1 && used >= limit) {
    // Let the merchant know (once per month) even though the customer was turned away.
    notifyOrderMilestone(storeId, used).catch(() => null);
    throw new AppError(403, audience === 'merchant'
      ? `وصلت إلى حد الباقة المجانية (${limit} طلباً هذا الشهر). ارفع للاحترافية لتستقبل طلبات بلا حد.`
      : 'هذا المتجر لا يستقبل طلبات جديدة حالياً. تواصل مع المتجر مباشرة.');
  }
}

/** Upgrade nudges as the Free monthly order allowance runs out (40 → warning, 50 → limit). */
export async function notifyOrderMilestone(storeId: string, usedOverride?: number) {
  const { plan, merchantId } = await planOfStore(storeId);
  const limit = planLimit(plan, 'ordersPerMonth');
  if (limit === -1) return;
  const used = usedOverride ?? (await ordersThisMonth(storeId));
  const warnAt = Math.floor(limit * 0.8);
  const kind = used >= limit ? 'ORDER_LIMIT_REACHED' : used >= warnAt ? 'ORDER_LIMIT_NEAR' : null;
  if (!kind) return;
  const already = await prisma.notification.count({ where: { userId: merchantId, type: kind, createdAt: { gte: monthStart() } } });
  if (already) return;
  if (kind === 'ORDER_LIMIT_NEAR') {
    await notifyUser(merchantId, kind, 'متجرك ينمو 🎉', `بقي ${limit - used} طلبات هذا الشهر في الباقة المجانية. ارفع للاحترافية لتستقبل طلبات بلا حد.`, { used, limit, upgrade: 'PRO' });
  } else {
    await notifyUser(merchantId, kind, 'وصلت للحد الشهري من الطلبات', `استقبلت ${limit} طلباً هذا الشهر وهو حد الباقة المجانية — الطلبات الجديدة متوقفة حتى بداية الشهر القادم أو حتى ترقيتك.`, { used, limit, upgrade: 'PRO' });
  }
}

/** First cancelled or returned order on the Free plan → suggest WhatsApp confirmation. */
export async function notifyFirstLostOrder(storeId: string) {
  const { plan, merchantId } = await planOfStore(storeId);
  if (plan !== 'FREE') return;
  const already = await prisma.notification.count({ where: { userId: merchantId, type: 'UPSELL_CONFIRM' } });
  if (already) return;
  await notifyUser(merchantId, 'UPSELL_CONFIRM', 'أكّد الطلبات قبل الشحن ووفّر أجور التوصيل', 'طلب أُلغي أو رجع؟ في الاحترافية يؤكد الزبون طلبه على واتساب قبل أن تشحنه، فلا تدفع توصيلاً لطلب لن يُستلم.', { upgrade: 'PRO' });
}
