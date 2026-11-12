/**
 * Subscription billing (2026-11 pricing):
 *  - Paid plans are bought monthly, yearly or lifetime (one payment, or 3 installments).
 *  - Lifetime is limited to the first LIFETIME_SEATS merchants.
 *  - New merchants get a TRIAL_DAYS Business trial, then fall back to Free.
 *  - Expired periods are swept back to Free.
 * Payments are manual (bank transfer / ZainCash) and approved by the super admin.
 */
import prisma from '@storebuilder/database';
import {
  PLAN_CONFIGS, BILLING_CYCLE_DAYS, TRIAL_DAYS, LIFETIME_SEATS, LIFETIME_INSTALLMENTS,
  LEGACY_LIFETIME_DISCOUNT_PERCENT, USD_TO_IQD, formatUSD, type PlanKey,
} from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';
import { notifyUser } from './notify';

export type RequestCycle = 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'LIFETIME_INSTALLMENT' | 'LIFETIME_UPGRADE';
type PaidPlan = Exclude<PlanKey, 'FREE'>;

const DAY = 864e5;
const PLAN_RANK: Record<PlanKey, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
/** Yearly payment made in the last N days counts towards lifetime. */
const YEARLY_CREDIT_AFTER_PAY_DAYS = 60;
/** …or when the yearly period ends within N days. */
const YEARLY_CREDIT_BEFORE_RENEWAL_DAYS = 30;

const fmt = (n: number) => formatUSD(n);
/** Installment size: whole dollars, rounded up. */
const installmentOf = (total: number) => Math.ceil(total / LIFETIME_INSTALLMENTS);

type BillingUser = {
  id: string; plan: PlanKey | string; billingCycle: string | null; planExpiresAt: Date | null;
  legacyPricing: boolean; lifetimeTarget: string | null; lifetimeInstallmentsPaid: number; lifetimeTotal: number | null;
};

async function loadUser(userId: string): Promise<BillingUser> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, plan: true, billingCycle: true, planExpiresAt: true, legacyPricing: true, lifetimeTarget: true, lifetimeInstallmentsPaid: true, lifetimeTotal: true },
  });
  if (!u) throw new AppError(404, 'المستخدم غير موجود');
  return u;
}

export async function lifetimeSeatsLeft(): Promise<number> {
  const taken = await prisma.user.count({
    where: { OR: [{ billingCycle: 'LIFETIME' }, { lifetimeInstallmentsPaid: { gt: 0 } }] },
  });
  return Math.max(0, LIFETIME_SEATS - taken);
}

/** Credit towards lifetime from this year's yearly payment (if inside the allowed window). */
async function yearlyCredit(u: BillingUser): Promise<{ amount: number; note: string } | null> {
  if (u.billingCycle !== 'YEARLY' || u.lifetimeInstallmentsPaid > 0) return null;
  const last = await prisma.paymentRequest.findFirst({
    where: { userId: u.id, status: 'APPROVED', cycle: 'YEARLY' },
    orderBy: { reviewedAt: 'desc' },
    select: { amount: true, currency: true, reviewedAt: true },
  });
  if (!last?.reviewedAt) return null;
  const now = Date.now();
  const recent = now - last.reviewedAt.getTime() <= YEARLY_CREDIT_AFTER_PAY_DAYS * DAY;
  const nearRenewal = !!u.planExpiresAt && u.planExpiresAt.getTime() - now <= YEARLY_CREDIT_BEFORE_RENEWAL_DAYS * DAY && u.planExpiresAt.getTime() > now;
  if (!recent && !nearRenewal) return null;
  // Payments made before the switch to dollars were in IQD.
  const amount = last.currency === 'IQD' ? Math.round(Number(last.amount) / USD_TO_IQD) : Number(last.amount);
  return { amount, note: `خُصم ${fmt(amount)} دفعتها للسنوي هذا العام` };
}

export interface Quote {
  plan: PaidPlan;
  cycle: RequestCycle;
  amount: number;
  installment?: number;
  installmentsTotal?: number;
  note?: string;
}

/**
 * Work out what a merchant pays for a plan + cycle. Throws a user-facing error when the
 * purchase is not allowed (lifetime sold out, downgrade from lifetime, …).
 */
export async function quote(userId: string, plan: PlanKey, cycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME', installments = 1): Promise<Quote> {
  if (plan !== 'PRO' && plan !== 'ENTERPRISE') throw new AppError(400, 'خطة غير صالحة');
  const u = await loadUser(userId);
  const prices = PLAN_CONFIGS[plan].prices;

  // Already lifetime: only an upgrade PRO → ENTERPRISE (pay the difference) makes sense.
  if (u.billingCycle === 'LIFETIME') {
    if (u.plan === 'PRO' && plan === 'ENTERPRISE' && cycle === 'LIFETIME') {
      const amount = PLAN_CONFIGS.ENTERPRISE.prices.LIFETIME - PLAN_CONFIGS.PRO.prices.LIFETIME;
      return { plan, cycle: 'LIFETIME_UPGRADE', amount, note: 'ترقية من أبدي الاحترافية إلى أبدي الأعمال بدفع الفرق' };
    }
    throw new AppError(409, 'لديك اشتراك أبدي بالفعل');
  }

  // An unfinished installment plan: the only thing to buy is the next installment.
  if (u.lifetimeInstallmentsPaid > 0 && u.lifetimeTarget) {
    const total = u.lifetimeTotal ?? PLAN_CONFIGS[u.lifetimeTarget as PaidPlan].prices.LIFETIME;
    const n = u.lifetimeInstallmentsPaid + 1;
    const each = installmentOf(total);
    const amount = n === LIFETIME_INSTALLMENTS ? total - each * (LIFETIME_INSTALLMENTS - 1) : each;
    return { plan: u.lifetimeTarget as PaidPlan, cycle: 'LIFETIME_INSTALLMENT', amount, installment: n, installmentsTotal: LIFETIME_INSTALLMENTS, note: `الدفعة ${n} من ${LIFETIME_INSTALLMENTS} للأبدي` };
  }

  if (cycle === 'MONTHLY' || cycle === 'YEARLY') return { plan, cycle, amount: prices[cycle] };

  // Lifetime
  if ((await lifetimeSeatsLeft()) <= 0) throw new AppError(409, 'نفدت مقاعد الباقة الأبدية');
  let total = prices.LIFETIME;
  const notes: string[] = [];
  if (u.legacyPricing) {
    total = Math.round((total * (100 - LEGACY_LIFETIME_DISCOUNT_PERCENT)) / 100);
    notes.push(`خصم ${LEGACY_LIFETIME_DISCOUNT_PERCENT}% للمشتركين القدامى`);
  }
  const credit = await yearlyCredit(u);
  if (credit) { total = Math.max(0, total - credit.amount); notes.push(credit.note); }

  if (installments === LIFETIME_INSTALLMENTS) {
    const each = installmentOf(total);
    notes.push(`الدفعة 1 من ${LIFETIME_INSTALLMENTS} — المجموع ${fmt(total)}`);
    return { plan, cycle: 'LIFETIME_INSTALLMENT', amount: each, installment: 1, installmentsTotal: LIFETIME_INSTALLMENTS, note: notes.join(' · ') };
  }
  return { plan, cycle: 'LIFETIME', amount: total, note: notes.join(' · ') || undefined };
}

/** Total lifetime price stored when the first installment is approved (recomputed the same way). */
function installmentTotalFromFirst(amountOfFirst: number, planTarget: PaidPlan): number {
  // first = ceil(total/3) → the list price wins when it produces the same first installment.
  const list = PLAN_CONFIGS[planTarget].prices.LIFETIME;
  if (installmentOf(list) === amountOfFirst) return list;
  return amountOfFirst * LIFETIME_INSTALLMENTS;
}

/** Activate what an approved payment request paid for. */
export async function applyApprovedPayment(req: { userId: string; planTarget: string; cycle: string; installment: number | null; amount: unknown; priceNote?: string | null }) {
  const u = await loadUser(req.userId);
  const plan = req.planTarget as PaidPlan;
  const now = new Date();

  switch (req.cycle as RequestCycle) {
    case 'MONTHLY':
    case 'YEARLY': {
      const days = BILLING_CYCLE_DAYS[req.cycle as 'MONTHLY' | 'YEARLY'];
      // Renewing the same plan before it ends extends from the current end date.
      const extend = u.plan === plan && u.planExpiresAt && u.planExpiresAt > now && (u.billingCycle === 'MONTHLY' || u.billingCycle === 'YEARLY' || u.billingCycle === 'LEGACY');
      const from = extend ? u.planExpiresAt!.getTime() : now.getTime();
      await prisma.user.update({
        where: { id: u.id },
        data: { plan, billingCycle: req.cycle, planExpiresAt: new Date(from + days * DAY), planChangedAt: now },
      });
      return;
    }
    case 'LIFETIME':
      await prisma.user.update({
        where: { id: u.id },
        data: { plan, billingCycle: 'LIFETIME', planExpiresAt: null, planChangedAt: now, lifetimeTarget: null, lifetimeInstallmentsPaid: 0, lifetimeTotal: null },
      });
      return;
    case 'LIFETIME_UPGRADE':
      await prisma.user.update({ where: { id: u.id }, data: { plan: 'ENTERPRISE', planChangedAt: now } });
      return;
    case 'LIFETIME_INSTALLMENT': {
      const n = req.installment ?? u.lifetimeInstallmentsPaid + 1;
      if (n >= LIFETIME_INSTALLMENTS) {
        await prisma.user.update({
          where: { id: u.id },
          data: { plan, billingCycle: 'LIFETIME', planExpiresAt: null, planChangedAt: now, lifetimeTarget: null, lifetimeInstallmentsPaid: 0, lifetimeTotal: null },
        });
        return;
      }
      if (n === 1) {
        // Until all installments are in, the subscription runs as yearly.
        const totalFromNote = Number(/المجموع \$?([\d,.]+)/.exec(req.priceNote ?? '')?.[1]?.replace(/,/g, '') ?? NaN);
        const total = Number.isFinite(totalFromNote) ? totalFromNote : installmentTotalFromFirst(Number(req.amount), plan);
        await prisma.user.update({
          where: { id: u.id },
          data: {
            plan, billingCycle: 'YEARLY', planExpiresAt: new Date(now.getTime() + BILLING_CYCLE_DAYS.YEARLY * DAY), planChangedAt: now,
            lifetimeTarget: plan, lifetimeInstallmentsPaid: 1, lifetimeTotal: total,
          },
        });
        return;
      }
      await prisma.user.update({ where: { id: u.id }, data: { lifetimeInstallmentsPaid: n } });
      return;
    }
  }
}

/**
 * Approve or reject a pending payment request (admin review or payment-gateway callback):
 * activates the plan, notifies the merchant and grants the referral reward. Idempotent.
 */
export async function settlePaymentRequest(
  id: string, approve: boolean,
  opts: { reviewedBy?: string | null; adminNote?: string | null; providerRef?: string | null } = {},
): Promise<boolean> {
  const claimed = await prisma.paymentRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status: approve ? 'APPROVED' : 'REJECTED', adminNote: opts.adminNote ?? null, reviewedBy: opts.reviewedBy ?? null,
      reviewedAt: new Date(), ...(opts.providerRef ? { txRef: opts.providerRef.slice(0, 255) } : {}),
    },
  });
  if (!claimed.count) return false; // already settled
  const payReq = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!payReq) return false;
  const planAr = PLAN_CONFIGS[payReq.planTarget as PlanKey]?.nameAr ?? payReq.planTarget;

  if (!approve) {
    await notifyUser(payReq.userId, 'PLAN_REJECTED', 'لم يتم تأكيد الدفع',
      opts.adminNote ?? 'لم نتمكن من التحقق من عملية الدفع. يرجى التواصل مع الدعم أو المحاولة مجدداً.',
      { plan: payReq.planTarget, adminNote: opts.adminNote });
    return true;
  }

  await applyApprovedPayment(payReq);
  await notifyUser(payReq.userId, 'PLAN_APPROVED', 'تمت الموافقة على خطتك!',
    `تم تفعيل خطة ${planAr} بنجاح — استمتع بالمزايا الجديدة`,
    { plan: payReq.planTarget, planAr, features: PLAN_CONFIGS[payReq.planTarget as PlanKey]?.features ?? [] });

  // Referral reward: after a referred merchant's 2nd approved payment, their referrer gets one free month.
  const referred = await prisma.user.findUnique({ where: { id: payReq.userId }, select: { referredById: true, referralRewardGiven: true } });
  if (referred?.referredById && !referred.referralRewardGiven) {
    const approvedCount = await prisma.paymentRequest.count({ where: { userId: payReq.userId, status: 'APPROVED' } });
    if (approvedCount >= 2) {
      await prisma.user.update({ where: { id: payReq.userId }, data: { referralRewardGiven: true } });
      await prisma.user.update({ where: { id: referred.referredById }, data: { freeMonthsCredit: { increment: 1 } } });
      await notifyUser(referred.referredById, 'REFERRAL_REWARD', 'ربحت شهراً مجانياً!',
        'أحد التجار الذين دعوتهم جدّد اشتراكه للمرة الثانية — أضفنا لك شهراً مجانياً إلى رصيدك.', { freeMonthsCredit: 1 });
    }
  }
  return true;
}

/** Give a brand-new merchant the Business trial. */
export async function startTrial(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { plan: 'ENTERPRISE', billingCycle: 'TRIAL', planExpiresAt: new Date(Date.now() + TRIAL_DAYS * DAY), trialUsed: true, planChangedAt: new Date() },
  });
}

/** Move expired subscriptions and trials back to Free. Returns how many were changed. */
export async function expireSubscriptions(): Promise<number> {
  const expired = await prisma.user.findMany({
    where: { plan: { not: 'FREE' }, planExpiresAt: { lt: new Date() }, NOT: { billingCycle: 'LIFETIME' } },
    select: { id: true, billingCycle: true, plan: true },
  });
  for (const u of expired) {
    await prisma.user.update({ where: { id: u.id }, data: { plan: 'FREE', billingCycle: null, planExpiresAt: null, planChangedAt: new Date() } });
    const trial = u.billingCycle === 'TRIAL';
    await notifyUser(
      u.id, 'PLAN_EXPIRED',
      trial ? 'انتهت تجربة باقة الأعمال' : 'انتهى اشتراكك',
      trial
        ? 'متجرك الآن على الباقة المجانية. اشترك لتستعيد الميزات التي جرّبتها — بياناتك محفوظة كما هي.'
        : `انتهت مدة باقة ${PLAN_CONFIGS[u.plan as PlanKey]?.nameAr ?? ''} وعاد متجرك للمجانية. جدّد لتستعيد الميزات — بياناتك محفوظة.`,
      { plan: u.plan, trial },
    ).catch(() => null);
  }
  return expired.length;
}

/**
 * One-time move of merchants who were paying before this pricing: they keep their plan until the
 * end of the current period (old 30-day PRO / 365-day ENTERPRISE cycles) and get the lifetime discount.
 */
export async function migrateLegacySubscribers(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { role: 'MERCHANT', plan: { not: 'FREE' }, billingCycle: null },
    select: { id: true, plan: true, planChangedAt: true },
  });
  for (const u of users) {
    const days = u.plan === 'ENTERPRISE' ? 365 : 30;
    await prisma.user.update({
      where: { id: u.id },
      data: {
        billingCycle: 'LEGACY', legacyPricing: true,
        planExpiresAt: u.planChangedAt ? new Date(u.planChangedAt.getTime() + days * DAY) : null,
      },
    });
  }
  return users.length;
}

let timer: NodeJS.Timeout | null = null;
export function startBillingJobs() {
  if (timer || process.env.NODE_ENV === 'test') return;
  migrateLegacySubscribers().catch(err => console.warn('Legacy migration failed:', err?.message));
  const run = () => expireSubscriptions().catch(err => console.warn('Subscription expiry failed:', err?.message));
  setTimeout(run, 10_000);
  timer = setInterval(run, 60 * 60 * 1000);
}

/** Days left until a date (rounded up), or null. */
export function daysLeft(d: Date | null): number | null {
  return d ? Math.max(0, Math.ceil((d.getTime() - Date.now()) / DAY)) : null;
}

export { PLAN_RANK };
