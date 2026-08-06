import prisma from '@storebuilder/database';
import { CreateCouponDto, CouponPublic, ApplyCouponResult, PLAN_CONFIGS, PlanKey } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';
import { cuid } from '../lib/cuid';

function toPublic(c: {
  id: string; storeId: string; code: string; discountType: string;
  discountValue: { toNumber(): number }; minOrderAmount: { toNumber(): number } | null;
  maxUses: number | null; usedCount: number; expiresAt: Date | null;
  isActive: boolean; createdAt: Date;
  affiliateId?: string | null; label?: string | null;
}): CouponPublic {
  return {
    id: c.id, storeId: c.storeId, code: c.code,
    label: c.label ?? null,
    affiliateId: c.affiliateId ?? null,
    discountType: c.discountType as 'percent' | 'fixed',
    discountValue: c.discountValue.toNumber(),
    minOrderAmount: c.minOrderAmount ? c.minOrderAmount.toNumber() : null,
    maxUses: c.maxUses, usedCount: c.usedCount,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    isActive: c.isActive, createdAt: c.createdAt.toISOString(),
  };
}

export class CouponService {
  async list(storeId: string): Promise<CouponPublic[]> {
    const coupons = await prisma.coupon.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
    return coupons.map(toPublic);
  }

  async create(storeId: string, dto: CreateCouponDto): Promise<CouponPublic> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { merchant: { select: { plan: true } } },
    });
    if (!store) throw new AppError(404, 'Store not found');

    const plan = store.merchant.plan as PlanKey;
    const maxCoupons = PLAN_CONFIGS[plan].maxCoupons;
    if (maxCoupons === 0) {
      throw new AppError(403, 'أكواد الخصم متاحة في الخطط المدفوعة فقط. ارفع خطتك لإضافة كود خصم.');
    }
    if (maxCoupons > 0) {
      const count = await prisma.coupon.count({ where: { storeId } });
      if (count >= maxCoupons) {
        throw new AppError(403, `وصلت إلى الحد الأقصى لأكواد الخصم في خطتك (${maxCoupons}). ارفع خطتك لإضافة أكواد أكثر.`);
      }
    }

    const code = dto.code.toUpperCase().trim();
    const existing = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
    if (existing) throw new AppError(409, 'كود الخصم موجود مسبقاً');

    const coupon = await prisma.coupon.create({
      data: {
        storeId, code,
        label: (dto as CreateCouponDto & { label?: string }).label ?? null,
        affiliateId: (dto as CreateCouponDto & { affiliateId?: string }).affiliateId ?? null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount ?? null,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return toPublic(coupon);
  }

  async toggle(storeId: string, couponId: string, isActive: boolean): Promise<CouponPublic> {
    const coupon = await prisma.coupon.findFirst({ where: { id: couponId, storeId } });
    if (!coupon) throw new AppError(404, 'الكوبون غير موجود');
    const updated = await prisma.coupon.update({ where: { id: couponId }, data: { isActive } });
    return toPublic(updated);
  }

  async delete(storeId: string, couponId: string): Promise<void> {
    const coupon = await prisma.coupon.findFirst({ where: { id: couponId, storeId } });
    if (!coupon) throw new AppError(404, 'الكوبون غير موجود');
    await prisma.coupon.delete({ where: { id: couponId } });
  }

  /** Validate a code for a store and compute its discount, without spending it (no usedCount increment, no affiliate conversion). */
  async validate(storeId: string, code: string, orderTotal: number): Promise<ApplyCouponResult> {
    const coupon = await prisma.coupon.findUnique({
      where: { storeId_code: { storeId, code: code.toUpperCase().trim() } },
    });
    if (!coupon) throw new AppError(404, 'كود الخصم غير صالح');
    if (!coupon.isActive) throw new AppError(400, 'كود الخصم غير نشط');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError(400, 'انتهت صلاحية كود الخصم');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError(400, 'تم استخدام كود الخصم بالحد الأقصى');
    const minOrder = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (orderTotal < minOrder) throw new AppError(400, `الحد الأدنى للطلب هو ${minOrder} د.ع`);

    let discountAmount = 0;
    if (coupon.discountType === 'percent') {
      discountAmount = (orderTotal * Number(coupon.discountValue)) / 100;
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), orderTotal);
    }
    const finalTotal = Math.max(0, orderTotal - discountAmount);

    return { coupon: toPublic(coupon), discountAmount, finalTotal };
  }

  async apply(storeId: string, code: string, orderTotal: number, orderId?: string): Promise<ApplyCouponResult> {
    const { coupon: couponPublic, discountAmount, finalTotal } = await this.validate(storeId, code, orderTotal);
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: couponPublic.id } });

    // Record affiliate conversion if this is an affiliate coupon
    if (coupon.affiliateId && orderId) {
      const affiliate = await prisma.affiliate.findUnique({ where: { id: coupon.affiliateId } });
      if (affiliate) {
        let commissionAmount = 0;
        if (affiliate.commissionType === 'percent') {
          commissionAmount = (orderTotal * Number(affiliate.commissionRate)) / 100;
        } else {
          commissionAmount = Number(affiliate.commissionRate);
        }
        const convId = cuid();
        await prisma.$executeRaw`
          INSERT INTO AffiliateConversion (id, affiliateId, storeId, couponId, orderId, orderTotal, discountAmount, commissionAmount, createdAt)
          VALUES (${convId}, ${coupon.affiliateId}, ${storeId}, ${coupon.id}, ${orderId}, ${orderTotal}, ${discountAmount}, ${commissionAmount}, NOW(3))
        `;
        await prisma.$executeRaw`
          UPDATE Affiliate SET totalEarned = totalEarned + ${commissionAmount}, totalOrders = totalOrders + 1, updatedAt=NOW(3)
          WHERE id = ${coupon.affiliateId}
        `;
      }
    }

    // Increment usedCount
    await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });

    return { coupon: toPublic(coupon), discountAmount, finalTotal };
  }
}

export const couponService = new CouponService();
