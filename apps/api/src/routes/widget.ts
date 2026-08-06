import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { widgetService } from '../services/widget.service';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Allow all origins for widget endpoints
router.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? '127.0.0.1';
}

// ── Public: Product listing ──────────────────────────────────────────────────
router.get('/:storeSlug/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await widgetService.getProducts(req.params.storeSlug, req.headers.origin ?? null, clientIp(req));
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.get('/:storeSlug/product/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await widgetService.getProduct(req.params.storeSlug, req.params.id, req.headers.origin ?? null, clientIp(req));
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

// ── Public: Event tracking ────────────────────────────────────────────────────
router.post('/:storeSlug/track', async (req: Request, res: Response) => {
  const { type, sessionId, meta } = req.body;
  await widgetService.trackEvent(req.params.storeSlug, type, sessionId, clientIp(req), meta);
  res.json({ success: true });
});

// ── Public: Create order from widget ─────────────────────────────────────────
router.post('/:storeSlug/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await widgetService.createOrder(req.params.storeSlug, req.body, req.headers.origin ?? null);
    res.status(201).json({ success: true, data: { id: order.id, total: Number(order.total), status: order.status } });
  } catch (err) { next(err); }
});

// ── Public: Create Stripe payment intent ─────────────────────────────────────
router.post('/payment/intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    if (!amount || amount < 50) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_your')) {
      res.json({ success: true, data: { clientSecret: 'demo_secret_no_stripe_configured' } });
      return;
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as never });
    const intent = await stripe.paymentIntents.create({ amount: Math.round(amount * 100), currency });
    res.json({ success: true, data: { clientSecret: intent.client_secret } });
  } catch (err) { next(err); }
});

// ── Merchant: Widget settings ─────────────────────────────────────────────────
router.get('/settings/me', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await widgetService.getSettings(req.user!.userId);
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

router.patch('/settings/me', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await widgetService.updateSettings(req.user!.userId, req.body);
    res.json({ success: true, message: 'Widget settings updated' });
  } catch (err) { next(err); }
});

// ── Admin: Widget stats ────────────────────────────────────────────────────────
router.get('/admin/stats', verifyToken, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await widgetService.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

router.patch('/admin/stores/:storeId', verifyToken, requireRole('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await widgetService.adminToggleWidget(req.params.storeId, req.body.widgetEnabled);
    res.json({ success: true, message: 'Widget status updated' });
  } catch (err) { next(err); }
});

export default router;
