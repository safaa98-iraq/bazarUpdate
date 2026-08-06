import { Router, Request, Response, NextFunction } from 'express';
import { optionalToken, verifyToken, requireRole, resolveStoreId } from '../middleware/auth';
import prisma from '@storebuilder/database';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];
const ABANDONED_AFTER_HOURS = 3;

async function getOrCreateCart(storeId: string, customerId?: string, sessionId?: string) {
  if (customerId) {
    return prisma.cart.upsert({
      where: { customerId_storeId: { customerId, storeId } },
      create: { storeId, customerId },
      update: {},
      include: { items: { include: { product: true } } },
    });
  }
  if (sessionId) {
    const existing = await prisma.cart.findFirst({
      where: { sessionId, storeId },
      include: { items: { include: { product: true } } },
    });
    if (existing) return existing;
    return prisma.cart.create({
      data: { storeId, sessionId },
      include: { items: { include: { product: true } } },
    });
  }
  return null;
}

// PUT /api/cart/:storeId/replace — full-cart sync from the client's local cart (used for abandoned-cart tracking)
router.put(
  '/:storeId/replace',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const sessionId = req.headers['x-session-id'] as string;
      const items = (req.body?.items ?? []) as { productId: string; quantity: number }[];
      const cart = await getOrCreateCart(storeId, req.user?.userId, sessionId);
      if (!cart) { res.status(400).json({ success: false, error: 'Session ID required' }); return; }

      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (items.length) {
        const validProducts = await prisma.product.findMany({
          where: { id: { in: items.map(i => i.productId) }, storeId, isActive: true },
          select: { id: true },
        });
        const validIds = new Set(validProducts.map(p => p.id));
        const filtered = items.filter(i => validIds.has(i.productId) && i.quantity > 0);
        if (filtered.length) {
          await prisma.cartItem.createMany({
            data: filtered.map(i => ({ cartId: cart.id, productId: i.productId, quantity: i.quantity })),
          });
        }
      }
      await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

// GET /api/cart/abandoned — merchant view of stale carts with items (best-effort signal, not a guarantee)
router.get('/abandoned', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const threshold = new Date(Date.now() - ABANDONED_AFTER_HOURS * 3600000);
    const carts = await prisma.cart.findMany({
      where: { storeId, updatedAt: { lt: threshold }, items: { some: {} } },
      include: {
        items: { include: { product: { select: { id: true, name: true, price: true, images: true } } } },
        customer: { select: { name: true, email: true, whatsapp: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    const data = carts.map(c => ({
      id: c.id,
      customerName: c.customer?.name ?? null,
      customerEmail: c.customer?.email ?? null,
      customerPhone: c.customer?.whatsapp ?? null,
      updatedAt: c.updatedAt.toISOString(),
      itemCount: c.items.reduce((s, i) => s + i.quantity, 0),
      total: c.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0),
      items: c.items.map(i => ({ productId: i.productId, name: i.product.name, quantity: i.quantity, price: Number(i.product.price), image: (i.product.images as string[])?.[0] ?? null })),
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/cart/:storeId
router.get(
  '/:storeId',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const sessionId = req.headers['x-session-id'] as string;
      const cart = await getOrCreateCart(storeId, req.user?.userId, sessionId);
      res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/cart/:storeId/items
router.post(
  '/:storeId/items',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { productId, quantity = 1 } = req.body;
      const sessionId = req.headers['x-session-id'] as string;

      let cart = await getOrCreateCart(storeId, req.user?.userId, sessionId);
      if (!cart) { res.status(400).json({ success: false, error: 'Session ID required' }); return; }

      const product = await prisma.product.findFirst({ where: { id: productId, storeId, isActive: true } });
      if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }

      const existingItem = await prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });
      } else {
        await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
      }

      cart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: { include: { product: true } } },
      }) as typeof cart;

      res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/cart/:storeId/items/:itemId
router.patch(
  '/:storeId/items/:itemId',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quantity } = req.body;

      if (quantity <= 0) {
        await prisma.cartItem.delete({ where: { id: req.params.itemId } });
      } else {
        await prisma.cartItem.update({ where: { id: req.params.itemId }, data: { quantity } });
      }

      const { storeId } = req.params;
      const sessionId = req.headers['x-session-id'] as string;
      const cart = await getOrCreateCart(storeId, req.user?.userId, sessionId);
      res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/cart/:storeId/items/:itemId
router.delete(
  '/:storeId/items/:itemId',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.cartItem.delete({ where: { id: req.params.itemId } });
      const { storeId } = req.params;
      const sessionId = req.headers['x-session-id'] as string;
      const cart = await getOrCreateCart(storeId, req.user?.userId, sessionId);
      res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/cart/:storeId — clear cart
router.delete(
  '/:storeId',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const sessionId = req.headers['x-session-id'] as string;
      const cart = await getOrCreateCart(storeId, req.user?.userId, sessionId);
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
      res.json({ success: true, message: 'Cart cleared' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
