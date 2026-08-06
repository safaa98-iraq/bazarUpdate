import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth';
import { aiService } from '../services/ai.service';
import { recommendationsService } from '../services/recommendations.service';
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

// ─── POST /api/ai/generate-description ───────────────────────────────────────

router.post(
  '/generate-description',
  verifyToken,
  requireRole('MERCHANT'),
  [
    body('productName').trim().notEmpty().withMessage('productName is required'),
    body('category').trim().notEmpty().withMessage('category is required'),
    body('keyFeatures').isArray({ min: 1 }).withMessage('keyFeatures must be a non-empty array'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.generateDescription(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/ai/suggest-price ──────────────────────────────────────────────

router.post(
  '/suggest-price',
  verifyToken,
  requireRole('MERCHANT'),
  [
    body('productName').trim().notEmpty().withMessage('productName is required'),
    body('category').trim().notEmpty().withMessage('category is required'),
    body('competitorPrices').isArray().withMessage('competitorPrices must be an array'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.suggestPrice(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/ai/generate-seo ───────────────────────────────────────────────

router.post(
  '/generate-seo',
  verifyToken,
  requireRole('MERCHANT'),
  [body('name').trim().notEmpty().withMessage('name is required')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiService.generateSEO(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/ai/credits ─────────────────────────────────────────────────────

router.get(
  '/credits',
  verifyToken,
  requireRole('MERCHANT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credits = await aiService.getCredits(req.user!.userId);
      res.json({ success: true, data: credits });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/ai/recommendations/:storeId ────────────────────────────────────

router.get(
  '/recommendations/:storeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = (req.query.sessionId as string) || req.headers['x-session-id'] as string;
      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId is required' });
        return;
      }

      const recommendations = await recommendationsService.getRecommendations(
        req.params.storeId,
        sessionId,
        4
      );
      res.json({ success: true, data: recommendations });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/ai/track-view ─────────────────────────────────────────────────

router.post(
  '/track-view',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, sessionId, customerId } = req.body as {
        productId: string;
        sessionId: string;
        customerId?: string;
      };

      if (!productId || !sessionId) {
        res.status(400).json({ success: false, error: 'productId and sessionId are required' });
        return;
      }

      await recommendationsService.trackView(productId, sessionId, customerId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Admin AI routes ──────────────────────────────────────────────────────────

// GET /api/ai/admin/usage — AI usage per merchant
router.get(
  '/admin/usage',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const skip = (page - 1) * limit;

      const where = {
        ...(req.query.merchantId ? { merchantId: req.query.merchantId as string } : {}),
        ...(req.query.feature ? { feature: req.query.feature as string } : {}),
      };

      const [logs, total] = await Promise.all([
        prisma.aIUsageLog.findMany({
          where,
          include: { merchant: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.aIUsageLog.count({ where }),
      ]);

      // Aggregate cost and tokens per merchant
      const merchantStats = await prisma.aIUsageLog.groupBy({
        by: ['merchantId'],
        _sum: { tokensUsed: true, cost: true },
        _count: { id: true },
        orderBy: { _sum: { cost: 'desc' } },
        take: 10,
      });

      res.json({
        success: true,
        data: logs,
        merchantStats: merchantStats.map((s) => ({
          merchantId: s.merchantId,
          totalRequests: s._count.id,
          totalTokens: s._sum.tokensUsed ?? 0,
          totalCost: Number(s._sum.cost ?? 0),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/ai/admin/cost — total AI cost dashboard
router.get(
  '/admin/cost',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [totals, byFeature, dailyCost] = await Promise.all([
        prisma.aIUsageLog.aggregate({
          _sum: { tokensUsed: true, cost: true },
          _count: { id: true },
        }),
        prisma.aIUsageLog.groupBy({
          by: ['feature'],
          _sum: { tokensUsed: true, cost: true },
          _count: { id: true },
          orderBy: { _sum: { cost: 'desc' } },
        }),
        // Last 7 days cost
        (async () => {
          const days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            const agg = await prisma.aIUsageLog.aggregate({
              where: { createdAt: { gte: d, lte: end } },
              _sum: { cost: true, tokensUsed: true },
              _count: { id: true },
            });
            days.push({
              date: d.toISOString().slice(0, 10),
              cost: Number(agg._sum.cost ?? 0),
              tokens: agg._sum.tokensUsed ?? 0,
              requests: agg._count.id,
            });
          }
          return days;
        })(),
      ]);

      res.json({
        success: true,
        data: {
          totalRequests: totals._count.id,
          totalTokens: totals._sum.tokensUsed ?? 0,
          totalCost: Number(totals._sum.cost ?? 0),
          byFeature: byFeature.map((f) => ({
            feature: f.feature,
            requests: f._count.id,
            tokens: f._sum.tokensUsed ?? 0,
            cost: Number(f._sum.cost ?? 0),
          })),
          dailyCost,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/ai/admin/limits/:merchantId — set custom AI limit
router.patch(
  '/admin/limits/:merchantId',
  verifyToken,
  requireRole('SUPER_ADMIN'),
  [body('limit').isInt({ min: 0, max: 10000 }).withMessage('limit must be 0-10000')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchant = await prisma.user.update({
        where: { id: req.params.merchantId },
        data: { aiRequestLimit: req.body.limit },
        select: { id: true, name: true, email: true, aiRequestLimit: true },
      });
      res.json({ success: true, data: merchant });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
