import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';

const router = Router();

router.get(
  '/',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { merchantId: req.user!.userId } });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const categories = await prisma.category.findMany({
        where: { storeId: store.id },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { merchantId: req.user!.userId } });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { plan: true } });
      if (user?.plan === 'FREE') {
        const count = await prisma.category.count({ where: { storeId: store.id } });
        if (count >= 3) {
          res.status(403).json({ success: false, error: 'وصلت إلى الحد الأقصى للخطة المجانية (3 تصنيفات). ارفع خطتك للمزيد.' });
          return;
        }
      }

      const category = await prisma.category.create({
        data: { storeId: store.id, name: req.body.name, slug: req.body.slug },
      });
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { merchantId: req.user!.userId } });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const { name } = req.body as { name: string };
      if (!name?.trim()) { res.status(400).json({ success: false, error: 'الاسم مطلوب' }); return; }

      const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w؀-ۿ-]/g, '');
      const category = await prisma.category.updateMany({
        where: { id: req.params.id, storeId: store.id },
        data: { name: name.trim(), slug },
      });
      if (!category.count) { res.status(404).json({ success: false, error: 'التصنيف غير موجود' }); return; }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { merchantId: req.user!.userId } });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      await prisma.category.deleteMany({ where: { id: req.params.id, storeId: store.id } });
      res.json({ success: true, message: 'Category deleted' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
