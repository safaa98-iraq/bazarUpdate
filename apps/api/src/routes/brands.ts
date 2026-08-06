import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole, resolveStoreId } from '../middleware/auth';
import { brandService } from '../services/brand.service';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const brands = await brandService.list(storeId);
    res.json({ success: true, data: brands });
  } catch (err) { next(err); }
});

router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const brand = await brandService.create(storeId, req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (err) { next(err); }
});

router.patch('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const brand = await brandService.update(storeId, req.params.id, req.body);
    res.json({ success: true, data: brand });
  } catch (err) { next(err); }
});

router.delete('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    await brandService.delete(storeId, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
