import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { verifyToken } from '../middleware/auth';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: errors.array()[0]?.msg });
    return;
  }
  next();
};

const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .matches(/[A-Z]/).withMessage('كلمة المرور يجب أن تحتوي على حرف كبير')
  .matches(/[a-z]/).withMessage('كلمة المرور يجب أن تحتوي على حرف صغير')
  .matches(/[0-9]/).withMessage('كلمة المرور يجب أن تحتوي على رقم');

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    passwordRules,
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و100 حرف'),
    body('whatsapp').optional().matches(/^\+?[0-9]{7,20}$/).withMessage('رقم واتساب غير صالح'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.post(
  '/customer-register',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    passwordRules,
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و100 حرف'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerCustomer(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.get('/me', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.get('/referrals', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await authService.getReferralStats(req.user!.userId);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

router.post(
  '/google',
  [body('credential').isString().notEmpty().withMessage('credential مطلوب')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.googleAuth(req.body.credential as string);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

export default router;
