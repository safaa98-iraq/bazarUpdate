import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from '../middleware/auth';
import prisma from '@storebuilder/database';

const router = Router();

// Auto-create table once
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS MerchantEvent (
      id         VARCHAR(36)  NOT NULL DEFAULT (UUID()),
      merchantId VARCHAR(255) NOT NULL,
      event      VARCHAR(100) NOT NULL,
      page       VARCHAR(100) DEFAULT NULL,
      meta       JSON         DEFAULT NULL,
      createdAt  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX idx_me_merchant (merchantId),
      INDEX idx_me_event    (event),
      INDEX idx_me_created  (createdAt)
    )
  `);
  tableReady = true;
}

// POST /api/track  — fire-and-forget, always 204
router.post(
  '/',
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    res.sendStatus(204); // respond immediately, don't await
    try {
      await ensureTable();
      const { event, page, meta } = req.body as { event: string; page?: string; meta?: Record<string, unknown> };
      if (!event) return;
      await prisma.$executeRaw`
        INSERT INTO MerchantEvent (merchantId, event, page, meta)
        VALUES (${req.user!.userId}, ${event}, ${page ?? null}, ${meta ? JSON.stringify(meta) : null})
      `;
    } catch (err) {
      // swallow — tracking must never break the app
      void next;
    }
  }
);

// GET /api/track/admin  — super admin only, returns aggregated data
router.get(
  '/admin',
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      await ensureTable();

      // ── 1. Onboarding funnel ──────────────────────────────────────────
      const [totalMerchants] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(*) AS cnt FROM User WHERE role = 'MERCHANT'
      `;

      const [storeCreated] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT merchantId) AS cnt FROM Store
      `;

      const [productAdded] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT s.merchantId) AS cnt
        FROM Product p
        JOIN Store s ON s.id = p.storeId
      `;

      const [categoryCreated] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT s.merchantId) AS cnt
        FROM Category c
        JOIN Store s ON s.id = c.storeId
      `;

      const [builderOpened] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT merchantId) AS cnt
        FROM MerchantEvent
        WHERE event = 'builder_opened'
      `;

      const [storePublished] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT merchantId) AS cnt FROM Store WHERE isPublished = TRUE
      `;

      const funnel = [
        { step: 'تسجيل حساب',      count: Number(totalMerchants.cnt) },
        { step: 'إنشاء المتجر',     count: Number(storeCreated.cnt) },
        { step: 'أضاف منتجاً',      count: Number(productAdded.cnt) },
        { step: 'أضاف تصنيفاً',     count: Number(categoryCreated.cnt) },
        { step: 'فتح المصمم',        count: Number(builderOpened.cnt) },
        { step: 'نشر المتجر',        count: Number(storePublished.cnt) },
      ];

      // ── 2. Feature usage (top events last 30 days) ───────────────────
      const featureUsage = await prisma.$queryRaw<{ event: string; uses: bigint; merchants: bigint }[]>`
        SELECT event,
               COUNT(*)                   AS uses,
               COUNT(DISTINCT merchantId) AS merchants
        FROM MerchantEvent
        WHERE createdAt >= NOW() - INTERVAL 30 DAY
        GROUP BY event
        ORDER BY uses DESC
        LIMIT 20
      `;

      // ── 3. Daily active merchants (last 14 days) ─────────────────────
      const dailyActive = await prisma.$queryRaw<{ day: string; merchants: bigint }[]>`
        SELECT DATE(createdAt) AS day,
               COUNT(DISTINCT merchantId) AS merchants
        FROM MerchantEvent
        WHERE createdAt >= NOW() - INTERVAL 14 DAY
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
      `;

      // ── 4. Merchants stuck at each funnel step ───────────────────────
      // "registered but no store" etc.
      const [noStore] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(*) AS cnt FROM User u
        WHERE u.role = 'MERCHANT'
          AND NOT EXISTS (SELECT 1 FROM Store s WHERE s.merchantId = u.id)
      `;
      const [noProduct] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT s.merchantId) AS cnt FROM Store s
        WHERE NOT EXISTS (
          SELECT 1 FROM Product p WHERE p.storeId = s.id
        )
      `;
      const [notPublished] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT s.merchantId) AS cnt FROM Store s
        WHERE s.isPublished = FALSE
      `;

      const dropOff = [
        { label: 'لم ينشئ متجراً بعد',   count: Number(noStore.cnt) },
        { label: 'لم يضف منتجاً',         count: Number(noProduct.cnt) },
        { label: 'المتجر غير منشور',       count: Number(notPublished.cnt) },
      ];

      // ── 5. Top pages visited ─────────────────────────────────────────
      const topPages = await prisma.$queryRaw<{ page: string; visits: bigint }[]>`
        SELECT page,
               COUNT(*) AS visits
        FROM MerchantEvent
        WHERE event = 'page_view' AND page IS NOT NULL
          AND createdAt >= NOW() - INTERVAL 30 DAY
        GROUP BY page
        ORDER BY visits DESC
        LIMIT 10
      `;

      // ── 6. Recently stale merchants (no activity 7+ days) ────────────
      const [stale] = await prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(DISTINCT u.id) AS cnt
        FROM User u
        WHERE u.role = 'MERCHANT'
          AND EXISTS (SELECT 1 FROM Store s WHERE s.merchantId = u.id)
          AND NOT EXISTS (
            SELECT 1 FROM MerchantEvent me
            WHERE me.merchantId = u.id
              AND me.createdAt >= NOW() - INTERVAL 7 DAY
          )
      `;

      res.json({
        success: true,
        data: {
          funnel,
          featureUsage: featureUsage.map(r => ({
            event: r.event,
            uses: Number(r.uses),
            merchants: Number(r.merchants),
          })),
          dailyActive: dailyActive.map(r => ({
            day: String(r.day),
            merchants: Number(r.merchants),
          })),
          dropOff,
          topPages: topPages.map(r => ({ page: r.page, visits: Number(r.visits) })),
          staleMerchants: Number(stale.cnt),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
