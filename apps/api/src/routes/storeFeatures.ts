/**
 * Settings for the newer store features, mounted at /api/stores/my/features
 * (the /api/stores prefix means staff need the "settings" permission to write).
 */
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getMerchantContext, assertPlan } from '../lib/plan';
import { publicShippingSettings, readShippingSettings } from '../lib/shipments';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];
const LANGS = ['ar', 'ckb'];

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    const isStaff = !!req.user!.staffId;
    res.json({
      success: true,
      data: {
        plan,
        shipping: publicShippingSettings(store.shippingSettings),
        languages: Array.isArray(store.storefrontLanguages) ? store.storefrontLanguages : ['ar'],
        slug: store.slug,
        // Owner-only hint so the UI can hide credentials from staff
        canEditCredentials: !isStaff,
      },
    });
  } catch (err) { next(err); }
});

router.put('/shipping', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const cur = readShippingSettings(store.shippingSettings);
    const b = req.body ?? {};
    const nextSettings = {
      senderName: str(b.senderName, 100) ?? cur.senderName,
      senderPhone: str(b.senderPhone, 20) ?? cur.senderPhone,
      pickupAddress: str(b.pickupAddress, 250) ?? cur.pickupAddress,
    };
    await prisma.store.update({ where: { id: store.id }, data: { shippingSettings: nextSettings as never } });
    res.json({ success: true, data: publicShippingSettings(nextSettings) });
  } catch (err) { next(err); }
});

router.put('/languages', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    const langs: string[] = Array.isArray(req.body?.languages) ? req.body.languages.filter((l: string) => LANGS.includes(l)) : [];
    const unique = [...new Set(langs)];
    if (!unique.length) throw new AppError(400, 'اختر لغة واحدة على الأقل');
    if (unique.some(l => l !== 'ar')) assertPlan(plan, 'ENTERPRISE', 'لغات المتجر الإضافية');
    await prisma.store.update({ where: { id: store.id }, data: { storefrontLanguages: unique } });
    res.json({ success: true, data: unique });
  } catch (err) { next(err); }
});

export default router;
