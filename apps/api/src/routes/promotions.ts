import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole, resolveStoreId } from '../middleware/auth';
import { promotionService } from '../services/promotion.service';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const promos = await promotionService.list(storeId);
    res.json({ success: true, data: promos });
  } catch (err) { next(err); }
});

router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const promo = await promotionService.create(storeId, req.body);
    res.status(201).json({ success: true, data: promo });
  } catch (err) { next(err); }
});

router.patch('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const promo = await promotionService.setActive(storeId, req.params.id, !!req.body.isActive);
    res.json({ success: true, data: promo });
  } catch (err) { next(err); }
});

router.delete('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    await promotionService.delete(storeId, req.params.id);
    res.json({ success: true, message: 'تم حذف العرض' });
  } catch (err) { next(err); }
});

export default router;
