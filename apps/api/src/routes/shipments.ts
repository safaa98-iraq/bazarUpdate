import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@storebuilder/types';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getMerchantContext } from '../lib/plan';
import { applyShipmentStatus, createShipment, shipmentToPublic, readShippingSettings } from '../lib/shipments';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

/** Create waybills for one or many orders. */
router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const ids: string[] = Array.isArray(req.body?.orderIds) ? req.body.orderIds.slice(0, 100) : [req.body?.orderId].filter(Boolean);
    if (!ids.length) throw new AppError(400, 'اختر طلباً واحداً على الأقل');
    const results = [];
    for (const id of ids) {
      try { results.push({ orderId: id, ok: true, shipment: await createShipment(id, store.id) }); }
      catch (e) { results.push({ orderId: id, ok: false, error: (e as Error).message }); }
    }
    res.status(201).json({ success: true, data: results });
  } catch (err) { next(err); }
});

/** Recent shipments with their order (shipping page). Branch staff see their branch only. */
router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
    const branch = req.user!.staffId ? req.user!.warehouseId ?? null : null;
    const list = await prisma.shipment.findMany({
      where: { storeId: store.id, ...(status ? { status } : {}), ...(branch ? { order: { warehouseId: branch } } : {}) },
      include: { order: { select: { id: true, customerName: true, customerPhone: true, total: true, shippingAddress: true, warehouse: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json({
      success: true,
      data: list.map(s => ({
        ...shipmentToPublic(s),
        order: {
          id: s.order.id, reference: s.order.id.slice(-6).toUpperCase(), customerName: s.order.customerName,
          customerPhone: s.order.customerPhone, total: Number(s.order.total),
          governorate: (s.order.shippingAddress as { governorate?: string } | null)?.governorate ?? '',
          branch: s.order.warehouse?.name ?? null,
        },
      })),
    });
  } catch (err) { next(err); }
});

/** Everything the waybill print page needs. */
router.get('/waybills', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const ids = String(req.query.orderIds ?? '').split(',').filter(Boolean).slice(0, 100);
    const orders = await prisma.order.findMany({
      where: { id: { in: ids }, storeId: store.id },
      include: { shipment: true, items: { include: { product: { select: { name: true } } } }, warehouse: { select: { name: true, phone: true, address: true } } },
    });
    const ship = readShippingSettings(store.shippingSettings);
    res.json({
      success: true,
      data: {
        store: { name: store.name, slug: store.slug, logo: store.logo },
        sender: {
          name: ship.senderName || store.name,
          phone: ship.senderPhone || '',
          address: ship.pickupAddress || '',
        },
        waybills: orders.filter(o => o.shipment).map(o => ({
          orderId: o.id,
          reference: o.id.slice(-6).toUpperCase(),
          createdAt: o.createdAt.toISOString(),
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          address: o.shippingAddress,
          codAmount: Number(o.total),
          shippingFee: Number(o.shippingFee),
          items: o.items.map(i => ({ name: i.product?.name ?? '', quantity: i.quantity, variant: i.variantLabel })),
          trackingCode: o.shipment!.trackingCode,
          branch: o.warehouse,
        })),
      },
    });
  } catch (err) { next(err); }
});

router.get('/order/:orderId', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const s = await prisma.shipment.findFirst({ where: { orderId: req.params.orderId, storeId: store.id } });
    res.json({ success: true, data: s ? shipmentToPublic(s) : null });
  } catch (err) { next(err); }
});

router.patch('/:id/status', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const status = req.body?.status as ShipmentStatus;
    if (!(status in SHIPMENT_STATUS_LABELS)) throw new AppError(400, 'حالة غير معروفة');
    const s = await prisma.shipment.findFirst({ where: { id: req.params.id, storeId: store.id } });
    if (!s) throw new AppError(404, 'الشحنة غير موجودة');
    await applyShipmentStatus(s.id, status, typeof req.body?.note === 'string' ? req.body.note : undefined);
    const fresh = await prisma.shipment.findUnique({ where: { id: s.id } });
    res.json({ success: true, data: shipmentToPublic(fresh) });
  } catch (err) { next(err); }
});

export default router;
