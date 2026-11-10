/**
 * Settings for the newer store features, mounted at /api/stores/my/features
 * (the /api/stores prefix means staff need the "settings" permission to write).
 */
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getMerchantContext, assertPlan } from '../lib/plan';
import { publicWhatsappSettings, readWhatsappSettings, DEFAULT_CONFIRM_MESSAGE } from '../lib/whatsapp';
import { publicShippingSettings, readShippingSettings, CARRIERS } from '../lib/couriers';

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
        whatsapp: publicWhatsappSettings(store.whatsappSettings),
        shipping: { ...publicShippingSettings(store.shippingSettings), carriers: CARRIERS },
        languages: Array.isArray(store.storefrontLanguages) ? store.storefrontLanguages : ['ar'],
        slug: store.slug,
        // Owner-only hint so the UI can hide credentials from staff
        canEditCredentials: !isStaff,
      },
    });
  } catch (err) { next(err); }
});

router.put('/whatsapp', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    assertPlan(plan, 'PRO', 'تأكيد الطلبات عبر واتساب');
    const cur = readWhatsappSettings(store.whatsappSettings);
    const b = req.body ?? {};
    const nextSettings = {
      ...cur,
      autoConfirm: typeof b.autoConfirm === 'boolean' ? b.autoConfirm : !!cur.autoConfirm,
      message: str(b.message, 1000) || cur.message || DEFAULT_CONFIRM_MESSAGE,
      ...(req.user!.staffId ? {} : {
        phoneNumberId: str(b.phoneNumberId, 50) ?? cur.phoneNumberId,
        templateName: str(b.templateName, 100) ?? cur.templateName,
        templateLang: str(b.templateLang, 10) ?? cur.templateLang,
        // Empty string keeps the stored token; "__clear__" removes it.
        accessToken: b.accessToken === '__clear__' ? undefined : (str(b.accessToken, 1000) || cur.accessToken),
      }),
    };
    if (!nextSettings.message.includes('{link}')) throw new AppError(400, 'يجب أن تحتوي الرسالة على {link}');
    await prisma.store.update({ where: { id: store.id }, data: { whatsappSettings: nextSettings as never } });
    res.json({ success: true, data: publicWhatsappSettings(nextSettings) });
  } catch (err) { next(err); }
});

router.put('/shipping', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    const cur = readShippingSettings(store.shippingSettings);
    const b = req.body ?? {};
    const carrier = b.carrier === 'alwaseet' ? 'alwaseet' : 'manual';
    if (carrier !== 'manual') assertPlan(plan, 'PRO', 'الربط مع شركات التوصيل');
    const nextSettings = {
      ...cur, carrier,
      senderName: str(b.senderName, 100) ?? cur.senderName,
      senderPhone: str(b.senderPhone, 20) ?? cur.senderPhone,
      pickupAddress: str(b.pickupAddress, 250) ?? cur.pickupAddress,
      ...(req.user!.staffId ? {} : {
        username: str(b.username, 100) ?? cur.username,
        password: str(b.password, 200) || cur.password,
      }),
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
