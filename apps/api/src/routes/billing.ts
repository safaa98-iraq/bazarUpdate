import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { PLAN_CONFIGS, PLAN_ORDER, LIFETIME_SEATS, LIFETIME_INSTALLMENTS, type PlanKey, type PlanConfig } from '@storebuilder/types';
import { quote, applyApprovedPayment, lifetimeSeatsLeft, daysLeft } from '../lib/billing';
import { ordersThisMonth } from '../lib/limits';
import { randomBytes } from 'crypto';
const createId = () => randomBytes(12).toString('hex');

const router = Router();

const HIDDEN_PUBLIC_TEXT_PATTERNS = [
  'ذكاء',
  'الذكاء',
  'اصطناعي',
  'الاصطناعي',
  'AI',
  'OpenAI',
  'ChatGPT',
  'توليد',
  'اقتراح سعر',
  'رصيد',
  'أوصاف المنتجات',
  'وصف المنتجات',
  'Google AdSense',
];

function isPublicPlanText(value: string): boolean {
  const normalized = value.toLowerCase();
  return !HIDDEN_PUBLIC_TEXT_PATTERNS.some(pattern => normalized.includes(pattern.toLowerCase()));
}

function publicPlanConfig(plan: PlanConfig): PlanConfig {
  return {
    ...plan,
    features: plan.features.filter(isPublicPlanText),
  };
}

const PUBLIC_PLAN_CONFIGS = Object.fromEntries(
  PLAN_ORDER.map((key) => [key, publicPlanConfig(PLAN_CONFIGS[key])])
) as Record<PlanKey, PlanConfig>;

const PLAN_NAMES = Object.fromEntries(PLAN_ORDER.map(k => [k, PLAN_CONFIGS[k].nameAr])) as Record<PlanKey, string>;
const PLAN_FEATURES = Object.fromEntries(PLAN_ORDER.map(k => [k, PUBLIC_PLAN_CONFIGS[k].features])) as Record<PlanKey, string[]>;

async function notifyAdmins(title: string, body: string, meta?: object) {
  const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map(a => ({
      id: createId(),
      userId: a.id,
      type: 'PAYMENT_REQUEST',
      title,
      body,
      meta: meta ?? {},
    })),
  });
}

async function notifyUser(userId: string, type: string, title: string, body: string, meta?: object) {
  await prisma.notification.create({
    data: { id: createId(), userId, type, title, body, meta: meta ?? {} },
  });
}

// GET /api/billing/plans
router.get('/plans', (_req, res) => {
  res.json({
    success: true,
    data: PUBLIC_PLAN_CONFIGS,
  });
});

// GET /api/billing/lifetime-seats — public counter for the pricing page
router.get('/lifetime-seats', async (_req, res, next) => {
  try { res.json({ success: true, data: { left: await lifetimeSeatsLeft(), of: LIFETIME_SEATS } }); }
  catch (err) { next(err); }
});

// GET /api/billing/payment-config
router.get('/payment-config', (_req, res) => {
  res.json({
    success: true,
    data: {
      qrImageUrl:    process.env.QR_IMAGE_URL ?? null,
      bankName:      process.env.PAYMENT_BANK_NAME      ?? 'المصرف الأهلي العراقي',
      accountName:   process.env.PAYMENT_ACCOUNT_NAME   ?? 'StoreBuilder Iraq',
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER ?? 'يرجى التواصل مع الدعم',
      instructions:  process.env.PAYMENT_INSTRUCTIONS   ?? 'حوّل المبلغ بالتحويل المصرفي أو ZainCash، ثم اضغط "دفعت الآن".',
      zainCashNumber: process.env.PAYMENT_ZAINCASH_NUMBER ?? null,
      zainCashName:   process.env.PAYMENT_ZAINCASH_NAME ?? null,
    },
  });
});

// GET /api/billing/status — current subscription, pending request, lifetime seats
router.get('/status', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { plan: true, billingCycle: true, planExpiresAt: true, planChangedAt: true, trialUsed: true, legacyPricing: true, lifetimeTarget: true, lifetimeInstallmentsPaid: true, lifetimeTotal: true, freeMonthsCredit: true },
    });
    const pending = await prisma.paymentRequest.findFirst({
      where: { userId: req.user!.userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, planTarget: true, cycle: true, installment: true, amount: true, status: true, createdAt: true },
    });
    const lastYearly = await prisma.paymentRequest.findFirst({
      where: { userId: req.user!.userId, status: 'APPROVED', cycle: 'YEARLY' },
      orderBy: { reviewedAt: 'desc' },
      select: { reviewedAt: true },
    });
    const monthlyPaid = await prisma.paymentRequest.count({ where: { userId: req.user!.userId, status: 'APPROVED', cycle: 'MONTHLY' } });
    res.json({
      success: true,
      data: {
        plan: user?.plan ?? 'FREE',
        billingCycle: user?.billingCycle ?? null,
        planExpiresAt: user?.planExpiresAt ?? null,
        daysLeft: daysLeft(user?.planExpiresAt ?? null),
        trialUsed: user?.trialUsed ?? false,
        legacyPricing: user?.legacyPricing ?? false,
        monthlyPaymentsCount: monthlyPaid,
        lastYearlyPaidAt: lastYearly?.reviewedAt ?? null,
        lifetime: user?.lifetimeTarget ? { target: user.lifetimeTarget, paid: user.lifetimeInstallmentsPaid, of: LIFETIME_INSTALLMENTS, total: user.lifetimeTotal } : null,
        lifetimeSeatsLeft: await lifetimeSeatsLeft(),
        lifetimeSeats: LIFETIME_SEATS,
        freeMonthsCredit: user?.freeMonthsCredit ?? 0,
        pendingRequest: pending ? { ...pending, amount: Number(pending.amount) } : null,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/billing/usage — what the merchant has used of their plan (dashboard nudges)
router.get('/usage', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await prisma.store.findUnique({ where: { merchantId: req.user!.userId }, select: { id: true } });
    if (!store) { res.json({ success: true, data: null }); return; }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { plan: true, billingCycle: true, planExpiresAt: true } });
    const plan = (user?.plan ?? 'FREE') as PlanKey;
    const cfg = PLAN_CONFIGS[plan];
    const [orders, products, abandoned] = await Promise.all([
      ordersThisMonth(store.id),
      prisma.product.count({ where: { storeId: store.id } }),
      prisma.cart.count({ where: { storeId: store.id, updatedAt: { lt: new Date(Date.now() - 3 * 3600000) }, items: { some: {} } } }),
    ]);
    res.json({
      success: true,
      data: {
        plan, billingCycle: user?.billingCycle ?? null, daysLeft: daysLeft(user?.planExpiresAt ?? null),
        orders: { used: orders, limit: cfg.ordersPerMonth },
        products: { used: products, limit: cfg.products },
        abandonedCarts: abandoned,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/billing/quote?plan=PRO&cycle=YEARLY&installments=1 — exact price for this merchant
router.get('/quote', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycle = String(req.query.cycle ?? 'MONTHLY') as 'MONTHLY' | 'YEARLY' | 'LIFETIME';
    if (!['MONTHLY', 'YEARLY', 'LIFETIME'].includes(cycle)) { res.status(400).json({ success: false, error: 'مدة غير صالحة' }); return; }
    const q = await quote(req.user!.userId, String(req.query.plan) as PlanKey, cycle, Number(req.query.installments) === 3 ? 3 : 1);
    res.json({ success: true, data: q });
  } catch (err) { next(err); }
});

// POST /api/billing/pay-request — { plan, cycle, installments?, method?, txRef? }; the server prices it
router.post('/pay-request', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.staffId) { res.status(403).json({ success: false, error: 'الاشتراك لصاحب المتجر فقط' }); return; }
    const { plan, cycle = 'MONTHLY', installments, method, txRef } = req.body as { plan: string; cycle?: string; installments?: number; method?: string; txRef?: string };
    if (!['MONTHLY', 'YEARLY', 'LIFETIME'].includes(cycle)) { res.status(400).json({ success: false, error: 'مدة غير صالحة' }); return; }

    const existing = await prisma.paymentRequest.findFirst({ where: { userId: req.user!.userId, status: 'PENDING' } });
    if (existing) {
      res.status(409).json({ success: false, error: 'لديك طلب دفع معلق بالفعل — يرجى الانتظار حتى تتم المراجعة.' });
      return;
    }

    const q = await quote(req.user!.userId, plan as PlanKey, cycle as 'MONTHLY' | 'YEARLY' | 'LIFETIME', installments === 3 ? 3 : 1);
    const merchant = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, email: true } });

    const request = await prisma.paymentRequest.create({
      data: {
        userId: req.user!.userId, planTarget: q.plan, cycle: q.cycle, installment: q.installment ?? null,
        amount: q.amount, currency: 'IQD', status: 'PENDING',
        method: method === 'ZAINCASH' ? 'ZAINCASH' : 'BANK',
        txRef: typeof txRef === 'string' ? txRef.slice(0, 255) : null,
        priceNote: q.note?.slice(0, 255) ?? null,
      },
    });

    const cycleAr: Record<string, string> = { MONTHLY: 'شهري', YEARLY: 'سنوي', LIFETIME: 'أبدي', LIFETIME_INSTALLMENT: `أبدي — دفعة ${q.installment}/${LIFETIME_INSTALLMENTS}`, LIFETIME_UPGRADE: 'ترقية أبدي' };
    await notifyAdmins(
      `💳 طلب ترقية جديد`,
      `${merchant?.name ?? 'تاجر'} يطلب ${PLAN_NAMES[q.plan as PlanKey]} (${cycleAr[q.cycle]}) — ${q.amount.toLocaleString()} د.ع`,
      { requestId: request.id, merchantName: merchant?.name, merchantEmail: merchant?.email, plan: q.plan, cycle: q.cycle, amount: q.amount, currency: 'IQD' },
    );

    res.status(201).json({ success: true, data: { ...request, amount: q.amount } });
  } catch (err) { next(err); }
});

// GET /api/billing/my-requests
router.get('/my-requests', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.paymentRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

// GET /api/billing/admin/requests
router.get('/admin/requests', verifyToken, requireRole('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = (req.query.status as string) || 'PENDING';
    const requests = await prisma.paymentRequest.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

// PATCH /api/billing/admin/requests/:id — approve or reject
router.patch('/admin/requests/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, adminNote } = req.body as { action: 'APPROVE' | 'REJECT'; adminNote?: string };

    const payReq = await prisma.paymentRequest.findUnique({ where: { id: req.params.id } });
    if (!payReq) { res.status(404).json({ success: false, error: 'الطلب غير موجود' }); return; }
    if (payReq.status !== 'PENDING') { res.status(409).json({ success: false, error: 'الطلب تمت معالجته بالفعل' }); return; }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await prisma.paymentRequest.update({
      where: { id: req.params.id },
      data: { status: newStatus, adminNote: adminNote ?? null, reviewedBy: req.user!.userId, reviewedAt: new Date() },
    });

    if (action === 'APPROVE') {
      await applyApprovedPayment(payReq);
      await notifyUser(
        payReq.userId,
        'PLAN_APPROVED',
        'تمت الموافقة على خطتك!',
        `تم تفعيل خطة ${PLAN_NAMES[payReq.planTarget as PlanKey]} بنجاح — استمتع بالمزايا الجديدة`,
        { plan: payReq.planTarget, planAr: PLAN_NAMES[payReq.planTarget as PlanKey], features: PLAN_FEATURES[payReq.planTarget as PlanKey] ?? [] },
      );

      // Referral reward: after a referred merchant's 2nd approved paid payment,
      // grant their referrer one free month (once per referral).
      const referredUser = await prisma.user.findUnique({
        where: { id: payReq.userId },
        select: { referredById: true, referralRewardGiven: true },
      });
      if (referredUser?.referredById && !referredUser.referralRewardGiven) {
        const approvedCount = await prisma.paymentRequest.count({
          where: { userId: payReq.userId, status: 'APPROVED' },
        });
        if (approvedCount >= 2) {
          await prisma.user.update({
            where: { id: payReq.userId },
            data: { referralRewardGiven: true },
          });
          await prisma.user.update({
            where: { id: referredUser.referredById },
            data: { freeMonthsCredit: { increment: 1 } },
          });
          await notifyUser(
            referredUser.referredById,
            'REFERRAL_REWARD',
            'ربحت شهراً مجانياً!',
            'أحد التجار الذين دعوتهم جدّد اشتراكه للمرة الثانية — أضفنا لك شهراً مجانياً إلى رصيدك.',
            { freeMonthsCredit: 1 },
          );
        }
      }
    } else {
      await notifyUser(
        payReq.userId,
        'PLAN_REJECTED',
        'لم يتم تأكيد الدفع',
        adminNote ?? 'لم نتمكن من التحقق من عملية الدفع. يرجى التواصل مع الدعم أو المحاولة مجدداً.',
        { plan: payReq.planTarget, adminNote },
      );
    }

    res.json({ success: true, message: action === 'APPROVE' ? 'تم الموافقة وترقية الخطة' : 'تم رفض الطلب' });
  } catch (err) { next(err); }
});

// POST /api/billing/downgrade
router.post('/downgrade', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.staffId) { res.status(403).json({ success: false, error: 'الاشتراك لصاحب المتجر فقط' }); return; }
    await prisma.user.update({ where: { id: req.user!.userId }, data: { plan: 'FREE', billingCycle: null, planExpiresAt: null, lifetimeTarget: null, lifetimeInstallmentsPaid: 0, lifetimeTotal: null, planChangedAt: new Date() } });
    res.json({ success: true, message: 'تم التخفيض إلى الخطة المجانية' });
  } catch (err) { next(err); }
});

// GET /api/billing/admin/subscriptions — full subscription list for super admin
router.get('/admin/subscriptions', verifyToken, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const merchants = await prisma.user.findMany({
      where: { role: 'MERCHANT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true,
        plan: true, planChangedAt: true, isActive: true, createdAt: true, billingCycle: true, planExpiresAt: true, lifetimeInstallmentsPaid: true,
        paymentRequests: {
          where: { status: 'APPROVED' },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
          select: { planTarget: true, amount: true, currency: true, reviewedAt: true, createdAt: true },
        },
        _count: { select: { paymentRequests: { where: { status: 'PENDING' } } } },
      },
    });

    const data = merchants.map(m => {
      const lastPayment = m.paymentRequests[0] ?? null;
      const planStart = m.planChangedAt ?? lastPayment?.reviewedAt ?? null;
      const planExpiry = m.plan !== 'FREE' ? m.planExpiresAt : null;
      const daysLeft = planExpiry
        ? Math.ceil((planExpiry.getTime() - Date.now()) / 864e5)
        : null;

      return {
        id: m.id, name: m.name, email: m.email, phone: m.phone ?? null,
        plan: m.plan, isActive: m.isActive, billingCycle: m.billingCycle, lifetimeInstallmentsPaid: m.lifetimeInstallmentsPaid,
        joinedAt: m.createdAt,
        planChangedAt: planStart,
        planExpiry,
        daysLeft,
        hasPendingRequest: m._count.paymentRequests > 0,
        lastPayment: lastPayment ? {
          amount: lastPayment.amount, currency: lastPayment.currency,
          reviewedAt: lastPayment.reviewedAt,
        } : null,
      };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// PATCH /api/billing/admin/subscriptions/:userId — admin forces plan change
router.patch('/admin/subscriptions/:userId', verifyToken, requireRole('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plan, reason, cycle } = req.body as { plan: 'FREE' | 'PRO' | 'ENTERPRISE'; reason?: string; cycle?: 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'NONE' };
    if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      res.status(400).json({ success: false, error: 'خطة غير صالحة' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, plan: true },
    });
    if (!user) { res.status(404).json({ success: false, error: 'المستخدم غير موجود' }); return; }

    const oldPlan = user.plan;
    await prisma.user.update({
      where: { id: req.params.userId },
      data: plan === 'FREE'
        ? { plan, billingCycle: null, planExpiresAt: null, planChangedAt: new Date() }
        : cycle === 'LIFETIME'
          ? { plan, billingCycle: 'LIFETIME', planExpiresAt: null, planChangedAt: new Date() }
          : cycle === 'MONTHLY' || cycle === 'YEARLY'
            ? { plan, billingCycle: cycle, planExpiresAt: new Date(Date.now() + (cycle === 'YEARLY' ? 365 : 30) * 864e5), planChangedAt: new Date() }
            : { plan, billingCycle: 'MANUAL', planExpiresAt: null, planChangedAt: new Date() },
    });

    const isUpgrade = plan !== 'FREE';
    await notifyUser(
      req.params.userId,
      isUpgrade ? 'PLAN_APPROVED' : 'PLAN_REJECTED',
      isUpgrade ? `✅ تم تفعيل خطة ${PLAN_NAMES[plan as PlanKey] ?? plan}` : '📋 تم تعديل خطتك',
      reason ?? (isUpgrade
        ? `تم ترقية حسابك من ${oldPlan} إلى ${PLAN_NAMES[plan as PlanKey] ?? plan} من قبل الإدارة`
        : `تم تعديل خطتك إلى المجانية من قبل الإدارة`),
      { plan, oldPlan, reason },
    );

    res.json({ success: true, message: `تم تغيير الخطة إلى ${plan}` });
  } catch (err) { next(err); }
});

export default router;
