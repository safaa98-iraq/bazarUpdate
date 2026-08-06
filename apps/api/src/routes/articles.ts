import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { articleService } from '../services/article.service';

const router = Router();
const admin = [verifyToken, requireRole('SUPER_ADMIN')];

// ── Public ────────────────────────────────────────────────────────────────────

// GET /api/articles — published list
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await articleService.listPublished({
      category: req.query.category as string,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 12),
    });
    res.json({ success: true, data: result.items, pagination: { total: result.total } });
  } catch (err) { next(err); }
});

// GET /api/articles/:slug — published single article
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await articleService.getBySlug(req.params.slug, true);
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
});

// ── Admin (SUPER_ADMIN only) ───────────────────────────────────────────────────

router.get('/admin/all', ...admin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const articles = await articleService.listAll();
    res.json({ success: true, data: articles });
  } catch (err) { next(err); }
});

router.get('/admin/:id', ...admin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await articleService.getById(req.params.id);
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
});

router.post('/admin', ...admin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await articleService.create(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: article });
  } catch (err) { next(err); }
});

router.patch('/admin/:id', ...admin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await articleService.update(req.params.id, req.body);
    res.json({ success: true, data: article });
  } catch (err) { next(err); }
});

router.delete('/admin/:id', ...admin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await articleService.delete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
