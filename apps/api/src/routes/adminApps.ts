/**
 * Super-admin management of branded store apps, mounted at /api/admin/apps.
 * Only the super admin can create / edit an app; merchants can only request one.
 */
import crypto from 'crypto';
import express, { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { readAppSettings, rawAppSettings, hasDownloads, STORE_APP_STATUSES, StoreAppStatus, AppPlatform } from '../lib/storeApp';

const router = Router();
router.use(verifyToken, requireRole('SUPER_ADMIN'));

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const MAX_BUILD_MB = 150;

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

    const nextSettings: Record<string, unknown> = {
      ...cur,
      adminCreated: true,
      appName: str(b.appName, 45) || cur.appName,
      shortName: str(b.shortName, 12) || cur.shortName,
      icon: b.icon === '' ? null : str(b.icon, 500) ?? cur.icon,
      themeColor: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : cur.themeColor,
      enabled: typeof b.enabled === 'boolean' ? b.enabled : cur.enabled ?? false,
      installPrompt: typeof b.installPrompt === 'boolean' ? b.installPrompt : cur.installPrompt ?? true,
      adminNote: str(b.adminNote, 300) ?? cur.adminNote,
      status: status ?? (cur.status as string | undefined) ?? 'IN_PROGRESS',
      updatedByAdminAt: new Date().toISOString(),
    };
    if (nextSettings.status === 'READY' && !hasDownloads(readAppSettings({ ...store, appSettings: nextSettings }))) {
      throw new AppError(400, 'ارفع ملف أندرويد (APK) أو آيفون (IPA) أو فعّل نسخة الويب قبل تحويل الحالة إلى "جاهز"');
    }

    const fresh = await prisma.store.update({ where: { id: store.id }, data: { appSettings: nextSettings as never }, select: storeSelect });
    res.json({ success: true, data: shape(fresh as unknown as Row) });
  } catch (err) { next(err); }
});

/** Load an ENTERPRISE store or fail. */
async function eligibleStore(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: storeSelect });
  if (!store) throw new AppError(404, 'المتجر غير موجود');
  if (store.merchant.plan !== 'ENTERPRISE') throw new AppError(403, 'تطبيق المتجر متاح فقط لباقة الأعمال');
  return store;
}

const platformOf = (p: string): AppPlatform => {
  if (p !== 'android' && p !== 'ios') throw new AppError(400, 'المنصة يجب أن تكون android أو ios');
  return p;
};

/**
 * Upload the app file itself (raw bytes in the request body):
 * PUT /api/admin/apps/:storeId/builds/android?fileName=app.apk&version=1.0.0
 * PUT /api/admin/apps/:storeId/builds/ios?fileName=app.ipa&version=1.0.0&bundleId=iq.bazar.store
 * The file is saved in the database (StoreAppBuild) — no Google Play / App Store.
 */
router.put(
  '/:storeId/builds/:platform',
  express.raw({ type: () => true, limit: `${MAX_BUILD_MB}mb` }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const platform = platformOf(req.params.platform);
      const store = await eligibleStore(req.params.storeId);
      const data = req.body as Buffer;
      if (!Buffer.isBuffer(data) || data.length < 1024) throw new AppError(400, 'الملف فارغ أو غير صالح');

      // Both APK and IPA are ZIP archives ("PK\x03\x04")
      if (data[0] !== 0x50 || data[1] !== 0x4b) throw new AppError(400, platform === 'android' ? 'الملف ليس APK صالحاً' : 'الملف ليس IPA صالحاً');
      const ext = platform === 'android' ? '.apk' : '.ipa';
      const fileName = (str(req.query.fileName, 200) || `app${ext}`).replace(/[\\/]/g, '_');
      if (!fileName.toLowerCase().endsWith(ext)) throw new AppError(400, `يجب أن يكون الملف بامتداد ${ext}`);
      const version = str(req.query.version, 40) || '1.0.0';
      const bundleId = platform === 'ios' ? str(req.query.bundleId, 200) || null : null;
      if (platform === 'ios' && (!bundleId || !/^[A-Za-z0-9.-]+$/.test(bundleId))) throw new AppError(400, 'أدخل معرّف حزمة الآيفون (Bundle ID) مثل iq.bazar.mystore');
      const sha256 = crypto.createHash('sha256').update(data).digest('hex');

      await prisma.storeAppBuild.upsert({
        where: { storeId_platform: { storeId: store.id, platform } },
        create: { storeId: store.id, platform, fileName, version, bundleId, size: data.length, sha256, data },
        update: { fileName, version, bundleId, size: data.length, sha256, data, downloads: 0 },
      });

      const cur = rawAppSettings(store);
      const builds = { ...((cur.builds as Record<string, unknown>) ?? {}), [platform]: { fileName, version, size: data.length, bundleId, uploadedAt: new Date().toISOString() } };
      const nextSettings = { ...cur, adminCreated: true, builds, status: cur.status === 'READY' ? 'READY' : 'IN_PROGRESS' };
      const fresh = await prisma.store.update({ where: { id: store.id }, data: { appSettings: nextSettings as never }, select: storeSelect });
      res.json({ success: true, data: shape(fresh as unknown as Row) });
    } catch (err) { next(err); }
  }
);

router.delete('/:storeId/builds/:platform', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = platformOf(req.params.platform);
    const store = await eligibleStore(req.params.storeId);
    await prisma.storeAppBuild.deleteMany({ where: { storeId: store.id, platform } });
    const cur = rawAppSettings(store);
    const builds = { ...((cur.builds as Record<string, unknown>) ?? {}) };
    delete builds[platform];
    let nextSettings: Record<string, unknown> = { ...cur, builds };
    if (nextSettings.status === 'READY' && !hasDownloads(readAppSettings({ ...store, appSettings: nextSettings }))) {
      nextSettings = { ...nextSettings, status: 'IN_PROGRESS' };
    }
    const fresh = await prisma.store.update({ where: { id: store.id }, data: { appSettings: nextSettings as never }, select: storeSelect });
    res.json({ success: true, data: shape(fresh as unknown as Row) });
  } catch (err) { next(err); }
});

export default router;
