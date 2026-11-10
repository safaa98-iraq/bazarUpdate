import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole, resolveStoreId } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { orderService } from '../services/order.service';
import { ensureConfirmation, sendViaCloudApi, formatIQD } from '../lib/whatsapp';
import { reassignWarehouse } from '../lib/fulfillment';
import { getMerchantContext, assertPlan } from '../lib/plan';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const page  = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    // Branch staff only ever see their own branch's orders.
    const staffBranch = req.user!.staffId ? req.user!.warehouseId ?? null : null;
    const result = await orderService.listByStore(storeId, {
      status: req.query.status as string,
      page,
      limit,
      warehouseId: staffBranch ?? ((req.query.warehouseId as string) || null),
      confirmation: (req.query.confirmation as string) || undefined,
    });
    res.json({
      success: true,
      data: result.items,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (err) { next(err); }
});

router.get('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const order = await orderService.getById(req.params.id, storeId);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// Manual/draft order — merchant creates an order for a phone/social-media sale
router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const order = await orderService.createDraft(storeId, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
});

// Publish a draft order — decrements stock and moves it to PENDING
router.post('/:id/publish', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const order = await orderService.publishDraft(req.params.id, storeId);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

/**
 * Prepare the WhatsApp confirmation for an order.
 * Returns a wa.me link the merchant can open, and sends it automatically
 * through the WhatsApp Business API when the store has connected one.
 */
router.post('/:id/confirmation', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    assertPlan(plan, 'PRO', 'تأكيد الطلبات عبر واتساب');
    const owned = await prisma.order.findFirst({ where: { id: req.params.id, storeId: store.id }, select: { id: true, status: true } });
    if (!owned) throw new AppError(404, 'الطلب غير موجود');
    if (owned.status === 'DRAFT' || owned.status === 'CANCELLED') throw new AppError(400, 'لا يمكن طلب تأكيد لهذا الطلب');
    const c = await ensureConfirmation(owned.id);
    if (!c) throw new AppError(404, 'الطلب غير موجود');
    if (!c.phone) throw new AppError(400, 'رقم هاتف الزبون غير صالح');

    let sent = false; let sendError: string | null = null;
    if (req.body?.send === true) {
      assertPlan(plan, 'ENTERPRISE', 'الإرسال التلقائي عبر WhatsApp Business API');
      sendError = await sendViaCloudApi(c.settings, c.phone, c.text, { name: c.order.customerName, store: c.store.name, total: formatIQD(Number(c.order.total)), token: c.token });
      sent = !sendError;
    }
    await prisma.order.update({ where: { id: owned.id }, data: { confirmationSentAt: new Date() } });
    res.json({ success: true, data: { link: c.link, waLink: c.waLink, text: c.text, sent, sendError } });
  } catch (err) { next(err); }
});

/** Move an order to another branch (units go back to the old branch). */
router.patch('/:id/warehouse', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    if (req.user!.staffId && req.user!.warehouseId) throw new AppError(403, 'لا يمكن لموظف الفرع نقل الطلبات');
    await reassignWarehouse(req.params.id, storeId, req.body?.warehouseId);
    res.json({ success: true, data: await orderService.getById(req.params.id, storeId) });
  } catch (err) { next(err); }
});

router.patch('/:id/status', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const order = await orderService.updateStatus(req.params.id, storeId, req.body.status);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

export default router;
