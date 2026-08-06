import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { PLAN_CONFIGS, type PlanKey } from '@storebuilder/types';

const router = Router();

async function getStore(merchantId: string) {
  return prisma.store.findUnique({ where: { merchantId } });
}

// GET /api/banners
router.get('/', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    const banners = await prisma.storeBanner.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: banners });
  } catch (e) { next(e); }
});

// POST /api/banners
router.post('/', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { plan: true } });
    const maxBanners = PLAN_CONFIGS[(user?.plan as PlanKey) ?? 'FREE'].maxBanners;
    if (maxBanners !== -1) {
      const count = await prisma.storeBanner.count({ where: { storeId: store.id } });
      if (count >= maxBanners) {
        res.status(403).json({ success: false, error: `خطتك الحالية تسمح بـ ${maxBanners} بانر كحد أقصى. ارفع خطتك لإضافة المزيد.` });
        return;
      }
    }

    const { title, subtitle, imageUrl, linkUrl, bgColor = '#432E54', textColor = '#ffffff', sortOrder = 0 } = req.body;
    if (!title) { res.status(400).json({ success: false, error: 'title required' }); return; }
    const banner = await prisma.storeBanner.create({
      data: { storeId: store.id, title, subtitle, imageUrl, linkUrl, bgColor, textColor, sortOrder },
    });
    res.status(201).json({ success: true, data: banner });
  } catch (e) { next(e); }
});

// PUT /api/banners/:id
router.patch('/:id', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    const existing = await prisma.storeBanner.findFirst({ where: { id: req.params.id, storeId: store.id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    const updated = await prisma.storeBanner.update({
      where: { id: req.params.id },
      data: { title: req.body.title, subtitle: req.body.subtitle, imageUrl: req.body.imageUrl, linkUrl: req.body.linkUrl, bgColor: req.body.bgColor, textColor: req.body.textColor, isActive: req.body.isActive, sortOrder: req.body.sortOrder },
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

// DELETE /api/banners/:id
router.delete('/:id', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    await prisma.storeBanner.deleteMany({ where: { id: req.params.id, storeId: store.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Public: GET /api/banners/storefront/:storeId
router.get('/storefront/:storeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await prisma.storeBanner.findMany({
      where: { storeId: req.params.storeId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: banners });
  } catch (e) { next(e); }
});

export default router;
