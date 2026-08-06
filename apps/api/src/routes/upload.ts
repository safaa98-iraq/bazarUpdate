import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { verifyToken } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.post(
  '/',
  verifyToken,
  uploadMiddleware.array('images', 10),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        res.status(400).json({ success: false, error: 'No files uploaded' });
        return;
      }

      const apiUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
      const urls = files.map(
        (f) => `${apiUrl}/uploads/${path.basename(f.path)}`
      );

      res.json({ success: true, data: { urls } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
