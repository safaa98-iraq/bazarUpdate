import prisma from '@storebuilder/database';
import type { Prisma } from '@prisma/client';
import { CreatePromotionDto, PromotionPublic } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

export interface PromoLineItem {
  productId: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
}

interface BogoConfig { buyQty: number; getQty: number; getDiscountPercent: number }
interface TieredConfig { tiers: { minQty: number; discountPercent: number }[] }

function toPublic(p: {
  id: string; storeId: string; type: string; name: string; isActive: boolean;
  scope: string; targetIds: unknown; config: unknown;
  startsAt: Date | null; endsAt: Date | null; createdAt: Date;
}): PromotionPublic {
  return {
    id: p.id, storeId: p.storeId, type: p.type as 'BOGO' | 'TIERED', name: p.name, isActive: p.isActive,
    scope: p.scope as 'ALL' | 'CATEGORY' | 'PRODUCT',
    targetIds: (p.targetIds as string[]) ?? [],
    config: (p.config as Record<string, unknown>) ?? {},
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

function inScope(promo: { scope: string; targetIds: string[] }, item: PromoLineItem): boolean {
  if (promo.scope === 'ALL') return true;
  if (promo.scope === 'CATEGORY') return !!item.categoryId && promo.targetIds.includes(item.categoryId);
  if (promo.scope === 'PRODUCT') return promo.targetIds.includes(item.productId);
  return false;
}

function computeBogo(config: BogoConfig, prices: number[]): number {
  const { buyQty, getQty, getDiscountPercent } = config;
  if (!buyQty || !getQty || buyQty <= 0 || getQty <= 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b); // cheapest discounted first
  const groupSize = buyQty + getQty;
  let discount = 0;
  let i = 0;
  // count full groups from the END (most expensive) working down isn't needed —
  // discount is applied to the cheapest `getQty` of every full group of `groupSize`
  const fullGroups = Math.floor(sorted.length / groupSize);
  for (let g = 0; g < fullGroups; g++) {
    for (let j = 0; j < getQty; j++) {
      discount += sorted[i + j] * (getDiscountPercent / 100);
    }
    i += groupSize;
  }
  return discount;
}

function computeTiered(config: TieredConfig, prices: number[]): number {
  if (!config.tiers?.length) return 0;
  const qty = prices.length;
  const subtotal = prices.reduce((s, p) => s + p, 0);
  const applicable = [...config.tiers]
    .filter(t => qty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  if (!applicable) return 0;
  return subtotal * (applicable.discountPercent / 100);
}

export class PromotionService {
  async list(storeId: string): Promise<PromotionPublic[]> {
    const promos = await prisma.promotion.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
    return promos.map(toPublic);
  }

  async create(storeId: string, dto: CreatePromotionDto): Promise<PromotionPublic> {
    if (!dto.name?.trim()) throw new AppError(400, 'اسم العرض مطلوب');
    if (!dto.config) throw new AppError(400, 'إعدادات العرض مطلوبة');
    const promo = await prisma.promotion.create({
      data: {
        storeId, type: dto.type, name: dto.name.trim(),
        isActive: dto.isActive ?? true,
        scope: dto.scope ?? 'ALL',
        targetIds: dto.targetIds ?? [],
        config: dto.config as Prisma.InputJsonValue,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
    return toPublic(promo);
  }

  async setActive(storeId: string, id: string, isActive: boolean): Promise<PromotionPublic> {
    const existing = await prisma.promotion.findFirst({ where: { id, storeId } });
    if (!existing) throw new AppError(404, 'العرض غير موجود');
    const promo = await prisma.promotion.update({ where: { id }, data: { isActive } });
    return toPublic(promo);
  }

  async delete(storeId: string, id: string): Promise<void> {
    const existing = await prisma.promotion.findFirst({ where: { id, storeId } });
    if (!existing) throw new AppError(404, 'العرض غير موجود');
    await prisma.promotion.delete({ where: { id } });
  }

  /** Computes the total automatic-promotion discount for a cart. Read-only, no side effects. */
  async computeDiscount(storeId: string, items: PromoLineItem[]): Promise<{ discount: number; applied: { name: string; amount: number }[] }> {
    const now = new Date();
    const promos = await prisma.promotion.findMany({
      where: {
        storeId, isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
    });
    const active = promos.filter(p => !p.endsAt || p.endsAt >= now);

    let discount = 0;
    const applied: { name: string; amount: number }[] = [];
    for (const promo of active) {
      const targetIds = (promo.targetIds as string[]) ?? [];
      const scoped = items.filter(i => inScope({ scope: promo.scope, targetIds }, i));
      if (!scoped.length) continue;
      const prices = scoped.flatMap(i => Array.from({ length: i.quantity }, () => i.unitPrice));

      let amount = 0;
      if (promo.type === 'BOGO') amount = computeBogo(promo.config as unknown as BogoConfig, prices);
      else if (promo.type === 'TIERED') amount = computeTiered(promo.config as unknown as TieredConfig, prices);

      if (amount > 0) {
        discount += amount;
        applied.push({ name: promo.name, amount: Math.round(amount) });
      }
    }
    return { discount: Math.round(discount), applied };
  }
}

export const promotionService = new PromotionService();
