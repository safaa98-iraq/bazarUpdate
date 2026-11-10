/**
 * Super-admin management of branded store apps, mounted at /api/admin/apps.
 * Only the super admin can create / edit an app; merchants can only request one.
 */
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { readAppSettings, rawAppSettings, STORE_APP_STATUSES, StoreAppStatus } from '../lib/storeApp';

const router = Router();
router.use(verifyToken, requireRole('SUPER_ADMIN'));

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const url = (v: unknown) => {
  const s = str(v, 500);
  if (s === undefined) return undefined;
  if (s === '') return null;
  if (!/^https?:\/\/\S+$/i.test(s)) throw new AppError(400, 'رابط التطبيق يجب أن يبدأ بـ https://');
  return s;
};

const storeSelect = {
  id: true, name: true, slug: true, logo: true, theme: true, appSettings: true,
  merchant: { select: { id: true, name: true, email: true, plan: true } },
} as const;

type Row = { id: string; name: string; slug: string; logo: string | null; theme: string; appSettings: unknown; merchant: { id: string; name: string; email: string; plan: string } };
const shape = (s: Row) => ({
  storeId: s.id, storeName: s.name, slug: s.slug, logo: s.logo,
  merchant: s.merchant, eligible: s.merchant.plan === 'ENTERPRISE',
  app: readAppSettings(s),
});

/** Every Business-plan store (eligible) plus any store that already has app data. */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stores = await prisma.store.findMany({
      where: { merchant: { plan: 'ENTERPRISE' } },
      select: storeSelect,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const rows = (stores as unknown as Row[]).map(shape);
    const order: Record<StoreAppStatus, number> = { REQUESTED: 0, IN_PROGRESS: 1, READY: 2, NONE: 3 };
    rows.sort((a, b) => order[a.app.status] - order[b.app.status]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.put('/:storeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.storeId }, select: storeSelect });
    if (!store) throw new AppError(404, 'المتجر غير موجود');
    if (store.merchant.plan !== 'ENTERPRISE') throw new AppError(403, 'تطبيق المتجر متاح فقط لباقة الأعمال');

    const cur = rawAppSettings(store);
    const b = req.body ?? {};
    const color = str(b.themeColor, 9);
    const status = STORE_APP_STATUSES.includes(b.status) ? (b.status as StoreAppStatus) : undefined;
    const androidUrl = url(b.androidUrl);
    const iosUrl = url(b.iosUrl);

    const nextSettings: Record<string, unknown> = {
      ...cur,
      adminCreated: true,
      appName: str(b.appName, 45) || cur.appName,
      shortName: str(b.shortName, 12) || cur.shortName,
      icon: b.icon === '' ? null : str(b.icon, 500) ?? cur.icon,
      themeColor: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : cur.themeColor,
      enabled: typeof b.enabled === 'boolean' ? b.enabled : cur.enabled ?? false,
      installPrompt: typeof b.installPrompt === 'boolean' ? b.installPrompt : cur.installPrompt ?? true,
      androidUrl: androidUrl === undefined ? cur.androidUrl : androidUrl,
      iosUrl: iosUrl === undefined ? cur.iosUrl : iosUrl,
      adminNote: str(b.adminNote, 300) ?? cur.adminNote,
      status: status ?? (cur.status as string | undefined) ?? 'IN_PROGRESS',
      updatedByAdminAt: new Date().toISOString(),
    };
    if (nextSettings.status === 'READY' && !nextSettings.androidUrl && !nextSettings.iosUrl) {
      throw new AppError(400, 'أضف رابط أندرويد أو آيفون قبل تحويل الحالة إلى "جاهز"');
    }

    const fresh = await prisma.store.update({ where: { id: store.id }, data: { appSettings: nextSettings as never }, select: storeSelect });
    res.json({ success: true, data: shape(fresh as unknown as Row) });
  } catch (err) { next(err); }
});

export default router;
