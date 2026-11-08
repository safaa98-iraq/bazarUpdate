import crypto from 'crypto';
import prisma from '@storebuilder/database';
import type { ShipmentEvent, ShipmentPublic, ShipmentStatus } from '@storebuilder/types';
import { createCourierShipment, fetchCourierStatuses, mapCourierStatus, readShippingSettings } from './couriers';
import { restockOrder } from './fulfillment';

const FINAL: ShipmentStatus[] = ['DELIVERED', 'RETURNED', 'CANCELLED'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newTrackingCode(): string {
  const bytes = crypto.randomBytes(8);
  return 'BZ' + Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shipmentToPublic(s: any): ShipmentPublic {
  return {
    id: s.id, orderId: s.orderId, carrier: s.carrier, trackingNumber: s.trackingNumber, trackingCode: s.trackingCode,
    status: s.status as ShipmentStatus, events: (Array.isArray(s.events) ? s.events : []) as ShipmentEvent[],
    lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null, lastError: s.lastError ?? null, createdAt: s.createdAt.toISOString(),
  };
}

/** Apply a new shipment status: append the event and mirror it onto the order. */
export async function applyShipmentStatus(shipmentId: string, status: ShipmentStatus, note?: string): Promise<void> {
  const s = await prisma.shipment.findUnique({ where: { id: shipmentId }, include: { order: { select: { id: true, status: true } } } });
  if (!s || s.status === status) return;
  const events = (Array.isArray(s.events) ? s.events : []) as unknown as ShipmentEvent[];
  events.push({ status, at: new Date().toISOString(), ...(note ? { note: note.slice(0, 200) } : {}) });
  await prisma.shipment.update({ where: { id: s.id }, data: { status, events: events as never } });

  const orderStatus = status === 'DELIVERED' ? 'DELIVERED' : (status === 'RETURNED' || status === 'CANCELLED') ? 'CANCELLED' : 'SHIPPED';
  if (s.order.status !== orderStatus) {
    if (orderStatus === 'CANCELLED' && s.order.status !== 'CANCELLED') await restockOrder(s.order.id);
    await prisma.order.update({ where: { id: s.order.id }, data: { status: orderStatus } });
  }
}

/** Create the waybill for an order (and push it to the courier when one is connected). */
export async function createShipment(orderId: string, storeId: string): Promise<ShipmentPublic> {
  const existing = await prisma.shipment.findUnique({ where: { orderId } });
  if (existing) return shipmentToPublic(existing);
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId }, include: { items: true, store: { select: { shippingSettings: true } } } });
  if (!order) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  if (order.status === 'CANCELLED' || order.status === 'DRAFT') throw Object.assign(new Error('لا يمكن شحن طلب ملغي أو مسودة'), { status: 400 });

  const settings = readShippingSettings(order.store.shippingSettings);
  const carrier = settings.carrier === 'alwaseet' ? 'alwaseet' : 'manual';
  const now = new Date().toISOString();
  let trackingNumber: string | null = null;
  let lastError: string | null = null;
  if (carrier !== 'manual') {
    const addr = (order.shippingAddress ?? {}) as { governorate?: string; city?: string; address?: string; notes?: string };
    try {
      ({ trackingNumber } = await createCourierShipment(settings, {
        customerName: order.customerName, customerPhone: order.customerPhone ?? '',
        governorate: addr.governorate ?? '', city: addr.city ?? '', address: addr.address ?? '',
        itemsCount: order.items.reduce((n, i) => n + i.quantity, 0),
        codAmount: Number(order.total), note: addr.notes ?? '', reference: `#${order.id.slice(-6).toUpperCase()}`,
      }));
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'فشل إرسال الشحنة لشركة التوصيل';
    }
  }

  let created;
  for (let attempt = 0; ; attempt++) {
    try {
      created = await prisma.shipment.create({
        data: {
          orderId, storeId, carrier: lastError ? 'manual' : carrier, trackingNumber, lastError,
          trackingCode: newTrackingCode(),
          events: [{ status: 'CREATED', at: now }] as never,
        },
      });
      break;
    } catch (e) {
      if (attempt >= 3) throw e; // tracking code collision — retry
    }
  }
  if (order.status === 'PENDING' || order.status === 'PAID') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'SHIPPED' } });
  }
  return shipmentToPublic(created);
}

/** Pull statuses from couriers for every open API shipment. Safe to call on a timer. */
export async function syncShipments(storeId?: string): Promise<number> {
  const open = await prisma.shipment.findMany({
    where: { carrier: { not: 'manual' }, status: { notIn: FINAL }, trackingNumber: { not: null }, ...(storeId ? { storeId } : {}) },
    include: { store: { select: { shippingSettings: true } } },
    take: 500,
  });
  const byStore = new Map<string, typeof open>();
  for (const s of open) byStore.set(s.storeId, [...(byStore.get(s.storeId) ?? []), s]);

  let updated = 0;
  for (const list of byStore.values()) {
    const settings = readShippingSettings(list[0].store.shippingSettings);
    try {
      const statuses = await fetchCourierStatuses(settings, list.map(s => s.trackingNumber!));
      for (const s of list) {
        const text = statuses[s.trackingNumber!];
        await prisma.shipment.update({ where: { id: s.id }, data: { lastSyncedAt: new Date(), lastError: null } });
        if (!text) continue;
        const next = mapCourierStatus(text);
        if (next !== s.status) { await applyShipmentStatus(s.id, next, text); updated++; }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل التحديث من شركة التوصيل';
      await prisma.shipment.updateMany({ where: { id: { in: list.map(s => s.id) } }, data: { lastError: msg, lastSyncedAt: new Date() } });
    }
  }
  return updated;
}

let timer: NodeJS.Timeout | null = null;
/** Background courier sync every 15 minutes. */
export function startShipmentSync(): void {
  if (timer || process.env.DISABLE_SHIPMENT_SYNC === '1') return;
  timer = setInterval(() => { syncShipments().catch(err => console.warn('Shipment sync failed:', err?.message)); }, 15 * 60 * 1000);
  timer.unref();
}
