import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole, resolveStoreId } from '../middleware/auth';
import { orderService } from '../services/order.service';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const page  = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await orderService.listByStore(storeId, {
      status: req.query.status as string,
      page,
      limit,
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

router.patch('/:id/status', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const order = await orderService.updateStatus(req.params.id, storeId, req.body.status);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

export default router;
