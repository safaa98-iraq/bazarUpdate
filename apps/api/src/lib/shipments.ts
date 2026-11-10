import crypto from 'crypto';
import prisma from '@storebuilder/database';
import type { ShipmentEvent, ShipmentPublic, ShipmentStatus } from '@storebuilder/types';
import { restockOrder } from './fulfillment';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Sender details printed on every waybill (Store.shippingSettings). Shipping is manual: the merchant prints and updates. */
export interface ShippingSettings { senderName?: string; senderPhone?: string; pickupAddress?: string }
export function readShippingSettings(raw: unknown): ShippingSettings {
  return raw && typeof raw === 'object' ? (raw as ShippingSettings) : {};
}
export function publicShippingSettings(raw: unknown) {
  const s = readShippingSettings(raw);
  return { senderName: s.senderName ?? '', senderPhone: s.senderPhone ?? '', pickupAddress: s.pickupAddress ?? '' };
}

function newTrackingCode(): string {
  const bytes = crypto.randomBytes(8);
  return 'BZ' + Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shipmentToPublic(s: any): ShipmentPublic {
  return {
    id: s.id, orderId: s.orderId, trackingCode: s.trackingCode,
    status: s.status as ShipmentStatus, events: (Array.isArray(s.events) ? s.events : []) as ShipmentEvent[],
    createdAt: s.createdAt.toISOString(),
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

/** Create the waybill for an order (the merchant prints it and updates its status by hand). */
export async function createShipment(orderId: string, storeId: string): Promise<ShipmentPublic> {
  const existing = await prisma.shipment.findUnique({ where: { orderId } });
  if (existing) return shipmentToPublic(existing);
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId } });
  if (!order) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  if (order.status === 'CANCELLED' || order.status === 'DRAFT') throw Object.assign(new Error('لا يمكن شحن طلب ملغي أو مسودة'), { status: 400 });

  const now = new Date().toISOString();
  let created;
  for (let attempt = 0; ; attempt++) {
    try {
      created = await prisma.shipment.create({
        data: { orderId, storeId, trackingCode: newTrackingCode(), events: [{ status: 'CREATED', at: now }] as never },
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
