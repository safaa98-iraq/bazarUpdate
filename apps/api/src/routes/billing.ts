import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { PLAN_CONFIGS, PLAN_ORDER, type PlanKey, type PlanConfig } from '@storebuilder/types';
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

const PLAN_PRICES = Object.fromEntries(PLAN_ORDER.filter(k => k !== 'FREE').map(k => [k, PLAN_CONFIGS[k].price])) as Record<Exclude<PlanKey, 'FREE'>, number>;
const PLAN_PRICES_IQD = Object.fromEntries(PLAN_ORDER.filter(k => k !== 'FREE').map(k => [k, PLAN_CONFIGS[k].priceIQD])) as Record<Exclude<PlanKey, 'FREE'>, number>;
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

// GET /api/billing/payment-config
router.get('/payment-config', (_req, res) => {
  res.json({
    success: true,
    data: {
      qrImageUrl:    process.env.QR_IMAGE_URL ?? null,
      bankName:      process.env.PAYMENT_BANK_NAME      ?? 'المصرف الأهلي العراقي',
      accountName:   process.env.PAYMENT_ACCOUNT_NAME   ?? 'StoreBuilder Iraq',
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER ?? 'يرجى التواصل مع الدعم',
      instructions:  process.env.PAYMENT_INSTRUCTIONS   ?? 'حوّل المبلغ عبر رمز QR، ثم اضغط "دفعت الآن".',
    },
  });
});

// GET /api/billing/status
router.get('/status', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { plan: true } });
    const pending = await prisma.paymentRequest.findFirst({
      where: { userId: req.user!.userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, planTarget: true, status: true, createdAt: true },
    });
    res.json({ success: true, data: { plan: user?.plan ?? 'FREE', pendingRequest: pending ?? null } });
  } catch (err) { next(err); }
});

// POST /api/billing/pay-request
router.post('/pay-request', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plan, currency = 'IQD' } = req.body as { plan: string; currency?: string };

    if (!['PRO', 'ENTERPRISE'].includes(plan)) {
      res.status(400).json({ success: false, error: 'خطة غير صالحة' });
      return;
    }

    const existing = await prisma.paymentRequest.findFirst({ where: { userId: req.user!.userId, status: 'PENDING' } });
    if (existing) {
      res.status(409).json({ success: false, error: 'لديك طلب دفع معلق بالفعل — يرجى الانتظار حتى تتم المراجعة.' });
      return;
    }

    const amount = currency === 'IQD'
      ? PLAN_PRICES_IQD[plan as Exclude<PlanKey, 'FREE'>]
      : PLAN_PRICES[plan as Exclude<PlanKey, 'FREE'>];
    const merchant = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true, email: true } });

    const request = await prisma.paymentRequest.create({
      data: { userId: req.user!.userId, planTarget: plan, amount, currency, status: 'PENDING' },
    });

    await notifyAdmins(
      `💳 طلب ترقية جديد`,
      `${merchant?.name ?? 'تاجر'} يطلب الترقية إلى خطة ${PLAN_NAMES[plan as PlanKey]} — ${Number(amount).toLocaleString()} ${currency}`,
      { requestId: request.id, merchantName: merchant?.name, merchantEmail: merchant?.email, plan, amount, currency },
    );

    res.status(201).json({ success: true, data: request });
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
      include: { user: { select: { name: true, email: true, whatsapp: true } } },
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
      await prisma.user.update({
        where: { id: payReq.userId },
        data: { plan: payReq.planTarget as 'PRO' | 'ENTERPRISE', planChangedAt: new Date() },
      });
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
    await prisma.user.update({ where: { id: req.user!.userId }, data: { plan: 'FREE', planChangedAt: new Date() } });
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
        id: true, name: true, email: true, whatsapp: true,
        plan: true, planChangedAt: true, isActive: true, createdAt: true,
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
      // PRO = 30-day cycle, ENTERPRISE = 365-day cycle
      const cycleDays = m.plan === 'ENTERPRISE' ? 365 : 30;
      const planExpiry = planStart && m.plan !== 'FREE'
        ? new Date(new Date(planStart).getTime() + cycleDays * 864e5)
        : null;
      const daysLeft = planExpiry
        ? Math.ceil((planExpiry.getTime() - Date.now()) / 864e5)
        : null;

      return {
        id: m.id, name: m.name, email: m.email, whatsapp: m.whatsapp ?? null,
        plan: m.plan, isActive: m.isActive,
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
    const { plan, reason } = req.body as { plan: 'FREE' | 'PRO' | 'ENTERPRISE'; reason?: string };
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
      data: { plan, planChangedAt: new Date() },
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
