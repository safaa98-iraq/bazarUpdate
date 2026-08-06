import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { cuid } from '../lib/cuid';
import { loyaltyService } from '../services/loyalty.service';

const router = Router();
const adminMW = [verifyToken, requireRole('SUPER_ADMIN')];

// ── PUBLIC: Customer account ──────────────────────────────────────────────────

router.get('/account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ success: false, error: 'Email required' }); return; }
    const account = await loyaltyService.getOrCreate(email);
    res.json({ success: true, data: loyaltyService.formatAccount(account) });
  } catch (e) { next(e); }
});

router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ success: false, error: 'Email required' }); return; }
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM LoyaltyTransaction WHERE customerEmail = ${email}
      ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) as total FROM LoyaltyTransaction WHERE customerEmail = ${email}
    `;
    res.json({
      success: true,
      data: rows.map(r => ({ ...r, points: Number(r.points) })),
      pagination: { page, limit, total: Number(total) },
    });
  } catch (e) { next(e); }
});

// ── ADMIN: Rules ──────────────────────────────────────────────────────────────

router.get('/admin/rules', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT lr.*, s.name as storeName FROM LoyaltyRule lr
      LEFT JOIN Store s ON s.id = lr.storeId
      ORDER BY lr.storeId IS NOT NULL, lr.createdAt DESC
    `;
    res.json({
      success: true,
      data: rules.map(r => ({
        ...r,
        pointsPerUnit: Number(r.pointsPerUnit),
        multiplier: Number(r.multiplier),
        minOrderAmount: r.minOrderAmount ? Number(r.minOrderAmount) : null,
        isActive: Boolean(r.isActive),
      })),
    });
  } catch (e) { next(e); }
});

router.post('/admin/rules', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, eventType, pointsPerUnit, multiplier, minOrderAmount, isActive } = req.body;
    const id = cuid();
    await prisma.$executeRaw`
      INSERT INTO LoyaltyRule (id, storeId, eventType, pointsPerUnit, multiplier, minOrderAmount, isActive, createdAt, updatedAt)
      VALUES (${id}, ${storeId ?? null}, ${eventType ?? 'purchase'}, ${Number(pointsPerUnit ?? 1)},
        ${Number(multiplier ?? 1)}, ${minOrderAmount ? Number(minOrderAmount) : null}, ${isActive !== false ? 1 : 0}, NOW(3), NOW(3))
    `;
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
});

router.patch('/admin/rules/:id', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pointsPerUnit, multiplier, minOrderAmount, isActive } = req.body;
    if (pointsPerUnit !== undefined) await prisma.$executeRaw`UPDATE LoyaltyRule SET pointsPerUnit=${Number(pointsPerUnit)}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    if (multiplier !== undefined) await prisma.$executeRaw`UPDATE LoyaltyRule SET multiplier=${Number(multiplier)}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    if (minOrderAmount !== undefined) await prisma.$executeRaw`UPDATE LoyaltyRule SET minOrderAmount=${Number(minOrderAmount)}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    if (isActive !== undefined) await prisma.$executeRaw`UPDATE LoyaltyRule SET isActive=${isActive ? 1 : 0}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.delete('/admin/rules/:id', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$executeRaw`DELETE FROM LoyaltyRule WHERE id=${req.params.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── ADMIN: Accounts ───────────────────────────────────────────────────────────

router.get('/admin/accounts', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const accounts = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM LoyaltyAccount
      ${search ? Prisma.sql`WHERE customerEmail LIKE ${`%${search}%`}` : Prisma.sql``}
      ORDER BY totalPoints DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) as total FROM LoyaltyAccount
      ${search ? Prisma.sql`WHERE customerEmail LIKE ${`%${search}%`}` : Prisma.sql``}
    `;
    res.json({
      success: true,
      data: accounts.map(a => ({
        ...a,
        totalPoints: Number(a.totalPoints),
        lifetimePoints: Number(a.lifetimePoints),
      })),
      pagination: { page, limit, total: Number(total) },
    });
  } catch (e) { next(e); }
});

// ── ADMIN: Give bonus points ──────────────────────────────────────────────────

router.post('/admin/bonus', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, points, description } = req.body;
    if (!email || !points) { res.status(400).json({ success: false, error: 'email and points required' }); return; }
    const account = await loyaltyService.getOrCreate(email);
    const pts = Number(points);
    const txId = cuid();
    await prisma.$executeRaw`
      INSERT INTO LoyaltyTransaction (id, loyaltyAccountId, customerEmail, points, type, description, createdAt)
      VALUES (${txId}, ${account.id}, ${email}, ${pts}, 'bonus', ${description ?? 'نقاط مكافأة من الإدارة'}, NOW(3))
    `;
    await prisma.$executeRaw`
      UPDATE LoyaltyAccount
      SET totalPoints = totalPoints + ${pts},
          lifetimePoints = lifetimePoints + ${pts},
          lastActivityAt = NOW(3), updatedAt = NOW(3)
      WHERE customerEmail = ${email}
    `;
    res.json({ success: true, data: { pointsAdded: pts } });
  } catch (e) { next(e); }
});

// ── ADMIN: Analytics ──────────────────────────────────────────────────────────

router.get('/admin/analytics', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [stats] = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        CAST(COUNT(*) AS UNSIGNED) as totalAccounts,
        COALESCE(SUM(totalPoints), 0) as totalPointsOutstanding,
        COALESCE(SUM(lifetimePoints), 0) as totalPointsEverEarned,
        CAST(SUM(tier = 'PLATINUM') AS UNSIGNED) as platinum,
        CAST(SUM(tier = 'GOLD') AS UNSIGNED) as gold,
        CAST(SUM(tier = 'SILVER') AS UNSIGNED) as silver,
        CAST(SUM(tier = 'BRONZE') AS UNSIGNED) as bronze
      FROM LoyaltyAccount
    `;
    const [txStats] = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        COALESCE(SUM(CASE WHEN type='earn' THEN points ELSE 0 END), 0) as totalEarned,
        COALESCE(SUM(CASE WHEN type='redeem' THEN ABS(points) ELSE 0 END), 0) as totalRedeemed,
        COALESCE(SUM(CASE WHEN type='bonus' THEN points ELSE 0 END), 0) as totalBonus
      FROM LoyaltyTransaction
    `;
    res.json({
      success: true,
      data: {
        totalAccounts: Number(stats?.totalAccounts ?? 0),
        totalPointsOutstanding: Number(stats?.totalPointsOutstanding ?? 0),
        totalPointsEverEarned: Number(stats?.totalPointsEverEarned ?? 0),
        tiers: {
          PLATINUM: Number(stats?.platinum ?? 0),
          GOLD: Number(stats?.gold ?? 0),
          SILVER: Number(stats?.silver ?? 0),
          BRONZE: Number(stats?.bronze ?? 0),
        },
        totalEarned: Number(txStats?.totalEarned ?? 0),
        totalRedeemed: Number(txStats?.totalRedeemed ?? 0),
        totalBonus: Number(txStats?.totalBonus ?? 0),
      },
    });
  } catch (e) { next(e); }
});

export default router;
