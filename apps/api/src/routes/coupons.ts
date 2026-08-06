import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { couponService } from '../services/coupon.service';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    const coupons = await couponService.list(store.id);
    res.json({ success: true, data: coupons });
  } catch (e) { next(e); }
});

router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    const coupon = await couponService.create(store.id, req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.patch('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    const coupon = await couponService.toggle(store.id, req.params.id, req.body.isActive);
    res.json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.delete('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    await couponService.delete(store.id, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
});

// Public: apply coupon (called from storefront checkout)
router.post('/apply', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, code, orderTotal } = req.body;
    const result = await couponService.apply(storeId, code, Number(orderTotal));
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Helper
import prisma from '@storebuilder/database';
async function getStore(merchantId: string) {
  const store = await prisma.store.findUnique({ where: { merchantId } });
  if (!store) throw { status: 404, message: 'Store not found' };
  return store;
}

export default router;
