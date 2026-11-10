import { assignWarehouse } from './fulfillment';
import { notifyOrderMilestone } from './limits';
import prisma from '@storebuilder/database';

/** Everything that should happen once a real (non-draft) order exists. Never throws. */
export async function afterOrderCreated(orderId: string): Promise<void> {
  try { await assignWarehouse(orderId); } catch (e) { console.warn('assignWarehouse failed', orderId, (e as Error).message); }
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: { storeId: true } });
    if (o) await notifyOrderMilestone(o.storeId);
  } catch (e) { console.warn('order milestone failed', orderId, (e as Error).message); }
}
