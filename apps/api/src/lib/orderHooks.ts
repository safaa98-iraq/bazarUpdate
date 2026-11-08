import { assignWarehouse } from './fulfillment';
import { autoSendConfirmation } from './whatsapp';

/** Everything that should happen once a real (non-draft) order exists. Never throws. */
export async function afterOrderCreated(orderId: string): Promise<void> {
  try { await assignWarehouse(orderId); } catch (e) { console.warn('assignWarehouse failed', orderId, (e as Error).message); }
  try { await autoSendConfirmation(orderId); } catch (e) { console.warn('confirmation failed', orderId, (e as Error).message); }
}
