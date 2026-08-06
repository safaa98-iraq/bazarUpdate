import prisma from '@storebuilder/database';
import { cuid } from '../lib/cuid';

type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

const TIER_THRESHOLDS = { PLATINUM: 10000, GOLD: 2000, SILVER: 500, BRONZE: 0 };
const TIER_MULTIPLIERS: Record<Tier, number> = { BRONZE: 1, SILVER: 1.2, GOLD: 1.5, PLATINUM: 2 };
const POINTS_PER_REDEEM = 100;    // 100 points
const REDEEM_VALUE = 1000;         // = 1000 IQD discount

function getTier(lifetimePoints: number): Tier {
  if (lifetimePoints >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (lifetimePoints >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (lifetimePoints >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

type LoyaltyAccountRow = {
  id: string; customerEmail: string;
  totalPoints: number | bigint; lifetimePoints: number | bigint;
  tier: Tier; lastActivityAt: Date | null;
};

export class LoyaltyService {
  async getOrCreate(email: string): Promise<LoyaltyAccountRow> {
    const rows = await prisma.$queryRaw<LoyaltyAccountRow[]>`
      SELECT * FROM LoyaltyAccount WHERE customerEmail = ${email}
    `;
    if (rows[0]) return rows[0];
    const id = cuid();
    await prisma.$executeRaw`
      INSERT INTO LoyaltyAccount (id, customerEmail, totalPoints, lifetimePoints, tier, lastActivityAt, createdAt, updatedAt)
      VALUES (${id}, ${email}, 0, 0, 'BRONZE', NOW(3), NOW(3), NOW(3))
    `;
    return { id, customerEmail: email, totalPoints: 0, lifetimePoints: 0, tier: 'BRONZE', lastActivityAt: null };
  }

  async awardPoints(email: string, orderTotal: number, orderId: string, storeId?: string): Promise<number> {
    const rules = await prisma.$queryRaw<{ pointsPerUnit: number; multiplier: number; minOrderAmount: number | null }[]>`
      SELECT pointsPerUnit, multiplier, minOrderAmount FROM LoyaltyRule
      WHERE isActive = 1 AND eventType = 'purchase'
        AND (storeId IS NULL OR storeId = ${storeId ?? null})
      ORDER BY storeId IS NOT NULL DESC
      LIMIT 1
    `;
    const rule = rules[0];
    if (!rule) return 0;
    if (rule.minOrderAmount && orderTotal < Number(rule.minOrderAmount)) return 0;

    const account = await this.getOrCreate(email);
    const lifetimePoints = Number(account.lifetimePoints ?? 0);
    const tier = getTier(lifetimePoints);
    const multiplier = Number(rule.multiplier ?? 1) * TIER_MULTIPLIERS[tier];
    const basePoints = Math.floor((orderTotal / 1000) * Number(rule.pointsPerUnit ?? 1));
    const points = Math.floor(basePoints * multiplier);
    if (points <= 0) return 0;

    const txId = cuid();
    await prisma.$executeRaw`
      INSERT INTO LoyaltyTransaction (id, loyaltyAccountId, customerEmail, points, type, orderId, storeId, description, createdAt)
      VALUES (${txId}, ${account.id}, ${email}, ${points}, 'earn', ${orderId}, ${storeId ?? null}, ${`مشتريات - ${orderId}`}, NOW(3))
    `;
    const newLifetime = lifetimePoints + points;
    await prisma.$executeRaw`
      UPDATE LoyaltyAccount
      SET totalPoints = totalPoints + ${points},
          lifetimePoints = lifetimePoints + ${points},
          tier = ${getTier(newLifetime)},
          lastActivityAt = NOW(3), updatedAt = NOW(3)
      WHERE customerEmail = ${email}
    `;
    return points;
  }

  async redeemPoints(email: string, pointsToRedeem: number): Promise<{ discount: number; pointsUsed: number }> {
    const account = await this.getOrCreate(email);
    const available = Number(account.totalPoints ?? 0);
    const toUse = Math.min(Math.floor(pointsToRedeem / POINTS_PER_REDEEM) * POINTS_PER_REDEEM, available);
    if (toUse <= 0) return { discount: 0, pointsUsed: 0 };
    const discount = (toUse / POINTS_PER_REDEEM) * REDEEM_VALUE;
    const txId = cuid();
    await prisma.$executeRaw`
      INSERT INTO LoyaltyTransaction (id, loyaltyAccountId, customerEmail, points, type, description, createdAt)
      VALUES (${txId}, ${account.id}, ${email}, ${-toUse}, 'redeem', 'استبدال نقاط بخصم', NOW(3))
    `;
    await prisma.$executeRaw`
      UPDATE LoyaltyAccount
      SET totalPoints = totalPoints - ${toUse}, lastActivityAt = NOW(3), updatedAt = NOW(3)
      WHERE customerEmail = ${email}
    `;
    return { discount, pointsUsed: toUse };
  }

  formatAccount(row: LoyaltyAccountRow) {
    const tier = row.tier as Tier;
    const totalPoints = Number(row.totalPoints ?? 0);
    const lifetimePoints = Number(row.lifetimePoints ?? 0);
    const nextTier = tier === 'BRONZE' ? 'SILVER' : tier === 'SILVER' ? 'GOLD' : tier === 'GOLD' ? 'PLATINUM' : null;
    const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
    return {
      ...row,
      totalPoints,
      lifetimePoints,
      tier,
      multiplier: TIER_MULTIPLIERS[tier],
      nextTier,
      pointsToNextTier: nextThreshold ? nextThreshold - lifetimePoints : null,
      redeemableDiscount: Math.floor(totalPoints / POINTS_PER_REDEEM) * REDEEM_VALUE,
    };
  }
}

export const loyaltyService = new LoyaltyService();
