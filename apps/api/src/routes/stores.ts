import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth';
import { storeService } from '../services/store.service';
import prisma from '@storebuilder/database';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: errors.array()[0]?.msg });
    return;
  }
  next();
};

// GET /api/stores/my — get merchant's own store
router.get(
  '/my',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.getByMerchant(req.user!.userId);
      res.json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/stores — create store
router.post(
  '/',
  verifyToken,
  requireRole('MERCHANT'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Store name must be at least 2 characters'),
    body('slug')
      .trim()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/stores/my — update merchant's store
router.patch(
  '/my',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.update(req.user!.userId, req.body);
      res.json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/stores/my/verify-domain — check DNS TXT record and mark custom domain verified
router.post(
  '/my/verify-domain',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.verifyDomain(req.user!.userId);
      res.json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/stores/my/onboarding — returns which setup steps are done
router.get(
  '/my/onboarding',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { merchantId: req.user!.userId },
        select: { id: true, name: true, logo: true, isPublished: true },
      });

      if (!store) {
        res.json({ success: true, data: { store: false, logo: false, product: false, category: false, published: false } });
        return;
      }

      const [productCount, categoryCount] = await Promise.all([
        prisma.product.count({ where: { storeId: store.id } }),
        prisma.category.count({ where: { storeId: store.id } }),
      ]);

      res.json({
        success: true,
        data: {
          store: Boolean(store.name),
          logo: Boolean(store.logo),
          product: productCount > 0,
          category: categoryCount > 0,
          published: store.isPublished,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
