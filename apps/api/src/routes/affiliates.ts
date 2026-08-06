import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { cuid } from '../lib/cuid';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

async function getMerchantStore(merchantId: string) {
  const store = await prisma.store.findUnique({ where: { merchantId } });
  if (!store) throw { status: 404, message: 'Store not found' };
  return store;
}

// ── Affiliates CRUD ─────────────────────────────────────────────────────────

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const affiliates = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT a.*,
        CAST((SELECT COUNT(*) FROM AffiliateConversion c WHERE c.affiliateId = a.id) AS UNSIGNED) as conversions,
        (SELECT code FROM Coupon WHERE affiliateId = a.id LIMIT 1) as couponCode
      FROM Affiliate a
      WHERE a.storeId = ${store.id}
      ORDER BY a.createdAt DESC
    `;
    const data = affiliates.map(a => ({
      ...a,
      conversions: Number(a.conversions ?? 0),
      commissionRate: Number(a.commissionRate ?? 0),
      totalEarned: Number(a.totalEarned ?? 0),
      totalOrders: Number(a.totalOrders ?? 0),
      isActive: Boolean(a.isActive),
      followerCount: a.followerCount ? Number(a.followerCount) : null,
    }));
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const [affiliate] = await prisma.$queryRaw<object[]>`
      SELECT * FROM Affiliate WHERE id = ${req.params.id} AND storeId = ${store.id}
    `;
    if (!affiliate) { res.status(404).json({ success: false, error: 'Affiliate not found' }); return; }
    const conversions = await prisma.$queryRaw<object[]>`
      SELECT * FROM AffiliateConversion WHERE affiliateId = ${req.params.id} ORDER BY createdAt DESC LIMIT 50
    `;
    const coupons = await prisma.$queryRaw<object[]>`
      SELECT id, code, discountType, discountValue, isActive, usedCount FROM Coupon WHERE affiliateId = ${req.params.id}
    `;
    res.json({ success: true, data: { ...affiliate as object, conversions, coupons } });
  } catch (e) { next(e); }
});

router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const { name, email, phone, platform, handle, followerCount, commissionType, commissionRate, notes } = req.body;
    const id = cuid();
    await prisma.$executeRaw`
      INSERT INTO Affiliate (id, storeId, name, email, phone, platform, handle, followerCount, commissionType, commissionRate, notes, isActive, createdAt, updatedAt)
      VALUES (
        ${id}, ${store.id}, ${name}, ${email ?? null}, ${phone ?? null},
        ${platform ?? null}, ${handle ?? null}, ${followerCount ? Number(followerCount) : null},
        ${commissionType ?? 'percent'}, ${Number(commissionRate ?? 10)},
        ${notes ?? null}, 1, NOW(3), NOW(3)
      )
    `;
    res.status(201).json({ success: true, data: { id, name, email, platform, handle, commissionType: commissionType ?? 'percent', commissionRate: Number(commissionRate ?? 10) } });
  } catch (e) { next(e); }
});

router.patch('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const { name, email, phone, platform, handle, followerCount, commissionType, commissionRate, notes, isActive } = req.body;
    const fields: string[] = [];

    if (name !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET name=${name}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (email !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET email=${email}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (phone !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET phone=${phone}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (platform !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET platform=${platform}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (handle !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET handle=${handle}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (followerCount !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET followerCount=${Number(followerCount)}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (commissionType !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET commissionType=${commissionType}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (commissionRate !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET commissionRate=${Number(commissionRate)}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (notes !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET notes=${notes}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    if (isActive !== undefined) await prisma.$executeRaw`UPDATE Affiliate SET isActive=${isActive ? 1 : 0}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;

    void fields; // suppress unused warning
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.delete('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    await prisma.$executeRaw`UPDATE Coupon SET affiliateId=NULL WHERE affiliateId=${req.params.id} AND storeId=${store.id}`;
    await prisma.$executeRaw`DELETE FROM AffiliateConversion WHERE affiliateId=${req.params.id}`;
    await prisma.$executeRaw`DELETE FROM Affiliate WHERE id=${req.params.id} AND storeId=${store.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Create coupon linked to affiliate ────────────────────────────────────────

router.post('/:id/coupon', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, label } = req.body;
    const couponId = cuid();
    const upperCode = (code as string).toUpperCase().trim();
    await prisma.$executeRaw`
      INSERT INTO Coupon (id, storeId, affiliateId, code, label, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive, usedCount, createdAt, updatedAt)
      VALUES (
        ${couponId}, ${store.id}, ${req.params.id}, ${upperCode}, ${label ?? null},
        ${discountType ?? 'percent'}, ${Number(discountValue)},
        ${minOrderAmount ? Number(minOrderAmount) : null}, ${maxUses ? Number(maxUses) : null},
        ${expiresAt ? new Date(expiresAt) : null}, 1, 0, NOW(3), NOW(3)
      )
    `;
    res.status(201).json({ success: true, data: { id: couponId, code: upperCode, discountType, discountValue } });
  } catch (e) { next(e); }
});

// ── Affiliate conversions stats ──────────────────────────────────────────────

router.get('/:id/stats', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const [stats] = await prisma.$queryRaw<{totalOrders: bigint; totalRevenue: number; totalCommission: number}[]>`
      SELECT
        COUNT(*) as totalOrders,
        COALESCE(SUM(orderTotal), 0) as totalRevenue,
        COALESCE(SUM(commissionAmount), 0) as totalCommission
      FROM AffiliateConversion
      WHERE affiliateId = ${req.params.id} AND storeId = ${store.id}
    `;
    res.json({ success: true, data: { ...stats, totalOrders: Number(stats?.totalOrders ?? 0) } });
  } catch (e) { next(e); }
});

export default router;
