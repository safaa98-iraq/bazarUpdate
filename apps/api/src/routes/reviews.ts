import { Router, Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';

const router = Router();

// GET /api/reviews/:productId — public
router.get('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await reviewService.list(req.params.productId);
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
});

// POST /api/reviews/:productId — public, guest reviews
router.post('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await reviewService.create(req.params.productId, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
});

export default router;
