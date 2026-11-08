import { Request } from 'express';
import prisma from '@storebuilder/database';
import { PLAN_ORDER, PLAN_CONFIGS, type PlanKey } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

/** The signed-in merchant's store + plan (works for staff tokens too: userId is the owner). */
export async function getMerchantContext(req: Request) {
  const store = await prisma.store.findUnique({
    where: { merchantId: req.user!.userId },
    include: { merchant: { select: { plan: true } } },
  });
  if (!store) throw new AppError(404, 'المتجر غير موجود');
  return { store, plan: store.merchant.plan as PlanKey };
}

export function planAtLeast(plan: PlanKey, min: PlanKey): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);
}

export function assertPlan(plan: PlanKey, min: PlanKey, feature: string): void {
  if (!planAtLeast(plan, min)) {
    throw new AppError(403, `${feature} متاحة في باقة ${PLAN_CONFIGS[min].nameAr} فأعلى`);
  }
}
