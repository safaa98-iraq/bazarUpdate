import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import storeRoutes from './routes/stores';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import orderRoutes from './routes/orders';
import cartRoutes from './routes/cart';
import checkoutRoutes from './routes/checkout';
import storefrontRoutes from './routes/storefront';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import couponRoutes from './routes/coupons';
import chatRoutes from './routes/chat';
import affiliateRoutes from './routes/affiliates';
import loyaltyRoutes from './routes/loyalty';
import bannerRoutes from './routes/banners';
import billingRoutes from './routes/billing';
import notificationRoutes from './routes/notifications';
import trackRoutes from './routes/track';
import widgetRoutes from './routes/widget';
import attributeRoutes from './routes/attributes';
import brandRoutes from './routes/brands';
import reviewRoutes from './routes/reviews';
import articleRoutes from './routes/articles';
import customerRoutes from './routes/customer';
import giftCardRoutes from './routes/giftcards';
import promotionRoutes from './routes/promotions';

const isProd = process.env.NODE_ENV === 'production';
const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads';
const uploadsDir = path.isAbsolute(uploadRoot)
  ? uploadRoot
  : path.join(process.cwd(), uploadRoot);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX ?? (isProd ? 5 : 100));
const authRateLimitWindowMs = Number(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? (isProd ? 15 * 60 * 1000 : 60 * 1000)
);

// Allowed origins — from env or defaults for local dev
const allowedOrigins: string[] = isProd
  ? (process.env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean)
  : [];
const isAllowedDevOrigin = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

export function createApp() {
  const app = express();

  // ── Trust proxy (needed behind nginx/load balancer) ─────────────────
  app.set('trust proxy', 1);

  // ── Security headers ─────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow widget images
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      contentSecurityPolicy: false, // managed by Next.js frontend
    })
  );

  // ── CORS ─────────────────────────────────────────────────────────────
  app.use(
    cors((req, callback) => {
      // /api/widget/* is a public, embeddable API meant to be called from
      // arbitrary third-party merchant sites — never restrict its origin.
      if (req.path.startsWith('/api/widget')) {
        callback(null, {
          origin: true,
          methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          maxAge: 86400,
        });
        return;
      }

      callback(null, {
        origin: (origin, cb) => {
          // Allow requests with no origin (mobile apps, Postman, server-to-server)
          if (!origin) return cb(null, true);
          if (allowedOrigins.includes(origin)) return cb(null, true);
          if (!isProd && isAllowedDevOrigin(origin)) return cb(null, true);
          cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
        maxAge: 86400, // preflight cache 24h
      });
    })
  );

  // ── Rate limiting ────────────────────────────────────────────────────
  // Strict: auth endpoints (5 attempts / 15 min)
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: authRateLimitWindowMs,
      max: authRateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'محاولات كثيرة جداً، حاول لاحقاً' },
      skipSuccessfulRequests: true, // only count failed attempts
    })
  );

  // Moderate: public storefront
  app.use(
    '/api/storefront',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // General API
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // ── Body parsing ─────────────────────────────────────────────────────
  // Stripe webhook needs raw body — mount before json()
  app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(compression());

  // ── Logging ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(isProd ? 'combined' : 'dev'));
  }

  // ── Static uploads (no directory listing) ────────────────────────────
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      index: false,          // disable directory listing
      dotfiles: 'deny',      // block hidden files
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );

  // ── Health check ─────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Routes ───────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/stores', storeRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/storefront', storefrontRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/affiliates', affiliateRoutes);
  app.use('/api/loyalty', loyaltyRoutes);
  app.use('/api/banners', bannerRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/track', trackRoutes);
  app.use('/api/widget', widgetRoutes);
  app.use('/api/attributes', attributeRoutes);
  app.use('/api/brands', brandRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/gift-cards', giftCardRoutes);
  app.use('/api/promotions', promotionRoutes);

  // ── 404 ──────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
