import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { productService } from '../services/product.service';
import { storeService } from '../services/store.service';
import { couponService } from '../services/coupon.service';
import { giftCardService } from '../services/giftcard.service';
import { promotionService } from '../services/promotion.service';
import { loyaltyService } from '../services/loyalty.service';
import { Decimal } from '@prisma/client/runtime/library';
import { notifyNewOrder } from '../lib/notify';
import { optionalToken } from '../middleware/auth';
import { cuid } from '../lib/cuid';

const router = Router();

// GET /api/storefront/resolve-domain?host=shop.mystore.com — used by web middleware
router.get('/resolve-domain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const host = String(req.query.host ?? '');
    if (!host) { res.json({ success: true, data: { slug: null } }); return; }
    const slug = await storeService.getSlugByVerifiedDomain(host);
    res.json({ success: true, data: { slug } });
  } catch (err) {
    next(err);
  }
});

// GET /api/storefront/cross-ads?excludeStoreId=X&limit=4
// Returns random products from active PRO/ENTERPRISE stores (for showing ads in FREE stores)
router.get(
  '/cross-ads',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const excludeStoreId = req.query.excludeStoreId as string | undefined;
      const limit = Math.min(Number(req.query.limit ?? 4), 8);

      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          stock: { gt: 0 },
          store: {
            isActive: true,
            isPublished: true,
            ...(excludeStoreId ? { id: { not: excludeStoreId } } : {}),
            merchant: { plan: { in: ['PRO', 'ENTERPRISE'] } },
          },
        },
        select: {
          id: true, name: true, price: true, comparePrice: true, images: true,
          store: { select: { id: true, name: true, slug: true } },
        },
        take: limit * 3, // fetch more for random sampling
      });

      // Fisher–Yates shuffle then take limit
      for (let i = products.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [products[i], products[j]] = [products[j], products[i]];
      }

      const result = products.slice(0, limit).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        images: p.images as string[],
        storeId: p.store.id,
        storeName: p.store.name,
        storeSlug: p.store.slug,
      }));

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug — public store info
router.get(
  '/:slug',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { slug: req.params.slug },
        select: {
          id: true, name: true, slug: true, description: true,
          logo: true, theme: true, template: true,
          isActive: true, isPublished: true,
          suspendedAt: true, suspendReason: true,
          builderConfig: true, socialLinks: true, deliveryZones: true,
          defaultSizeGuide: true,
          merchant: { select: { plan: true } },
        },
      });

      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      if (!store.isActive) {
        res.status(503).json({
          success: false,
          error: 'Store suspended',
          suspendReason: store.suspendReason ?? 'This store is currently unavailable',
          suspendedAt: store.suspendedAt,
        });
        return;
      }

      if (!store.isPublished) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }

      const { merchant, ...storeData } = store as typeof store & { merchant?: { plan: string } };
      res.json({ success: true, data: { ...storeData, merchantPlan: merchant?.plan ?? 'FREE' } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug/products
router.get(
  '/:slug/products',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { slug: req.params.slug },
        select: { id: true, isActive: true, isPublished: true },
      });

      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
      if (!store.isActive) { res.status(503).json({ success: false, error: 'Store unavailable' }); return; }

      const result = await productService.list(store.id, {
        activeOnly: true,
        categoryId: req.query.categoryId as string,
        search: req.query.search as string,
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 20),
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: Number(req.query.page ?? 1),
          limit: Number(req.query.limit ?? 20),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(req.query.limit ?? 20)),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug/products/:productId
router.get(
  '/:slug/products/:productId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { slug: req.params.slug },
        select: { id: true, isActive: true },
      });

      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
      if (!store.isActive) { res.status(503).json({ success: false, error: 'Store unavailable' }); return; }

      const product = await productService.getById(req.params.productId, store.id);
      if (!product.isActive) { res.status(404).json({ success: false, error: 'Product not found' }); return; }

      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug/categories
router.get(
  '/:slug/categories',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
      if (!store || !store.isActive) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const categories = await prisma.category.findMany({
        where: { storeId: store.id },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug/brands
router.get(
  '/:slug/brands',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
      if (!store || !store.isActive) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const brands = await prisma.brand.findMany({
        where: { storeId: store.id },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: brands });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/storefront/:slug/cart/share — snapshot the caller's cart into a shareable link (PRO/ENTERPRISE stores only)
router.post(
  '/:slug/cart/share',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { slug: req.params.slug },
        select: { id: true, merchant: { select: { plan: true } } },
      });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
      if (store.merchant?.plan === 'FREE') {
        res.status(403).json({ success: false, error: 'مشاركة السلة متاحة لعملاء المتاجر على خطة مدفوعة فقط' });
        return;
      }

      const items: { productId: string; quantity: number }[] = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) { res.status(400).json({ success: false, error: 'السلة فارغة' }); return; }

      const validProducts = await prisma.product.findMany({
        where: { id: { in: items.map(i => i.productId) }, storeId: store.id, isActive: true },
        select: { id: true },
      });
      const validIds = new Set(validProducts.map(p => p.id));
      const filtered = items.filter(i => validIds.has(i.productId) && i.quantity > 0);
      if (!filtered.length) { res.status(400).json({ success: false, error: 'لا توجد منتجات صالحة في السلة' }); return; }

      const cart = await prisma.cart.create({
        data: {
          storeId: store.id,
          sessionId: `share_${cuid()}`,
          items: { create: filtered.map(i => ({ productId: i.productId, quantity: i.quantity })) },
        },
      });

      res.status(201).json({ success: true, data: { shareId: cart.id } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug/cart/shared/:cartId — public read of a shared cart snapshot
router.get(
  '/:slug/cart/shared/:cartId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const cart = await prisma.cart.findFirst({
        where: { id: req.params.cartId, storeId: store.id },
        include: { items: true },
      });
      if (!cart) { res.status(404).json({ success: false, error: 'السلة المشتركة غير موجودة أو انتهت صلاحيتها' }); return; }

      const items = (await Promise.all(cart.items.map(async ci => {
        const product = await productService.getById(ci.productId, store.id).catch(() => null);
        return product ? { productId: ci.productId, quantity: ci.quantity, product } : null;
      }))).filter((i): i is { productId: string; quantity: number; product: NonNullable<typeof i>['product'] } => i !== null);

      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/storefront/:slug/analytics — store dashboard analytics
router.get(
  '/:slug/analytics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
      if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

      const [orderStats, topProducts, recentOrders] = await Promise.all([
        prisma.order.aggregate({
          where: { storeId: store.id, status: { not: 'CANCELLED' } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: { order: { storeId: store.id } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        prisma.order.findMany({
          where: { storeId: store.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, customerName: true, total: true, status: true, createdAt: true,
          },
        }),
      ]);

      const topProductIds = topProducts.map((p) => p.productId);
      const products = await prisma.product.findMany({ where: { id: { in: topProductIds } } });

      res.json({
        success: true,
        data: {
          totalRevenue: Number(orderStats._sum.total ?? 0),
          totalOrders: orderStats._count,
          topProducts: topProducts.map((tp) => ({
            product: products.find((p) => p.id === tp.productId),
            totalSold: tp._sum.quantity,
          })),
          recentOrders: recentOrders.map((o) => ({
            ...o,
            total: Number((o.total as Decimal).toString()),
            createdAt: o.createdAt.toISOString(),
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/storefront/:slug/checkout/preview — live discount/total preview, no side effects
router.post(
  '/:slug/checkout/preview',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
      if (!store || !store.isActive) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }

      const { items, shippingFee: shippingFeeInput, couponCode, giftCardCode } = req.body as {
        items: { productId: string; quantity: number; variantId?: string }[];
        shippingFee?: number; couponCode?: string; giftCardCode?: string;
      };

      if (!items?.length) {
        res.status(400).json({ success: false, error: 'السلة فارغة' });
        return;
      }

      const [products, variants] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: items.map(i => i.productId) }, storeId: store.id, isActive: true } }),
        prisma.productVariant.findMany({ where: { id: { in: items.filter(i => i.variantId).map(i => i.variantId as string) } } }),
      ]);

      let subtotal = 0;
      const promoItems = [];
      for (const item of items) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) continue;
        const variant = item.variantId ? variants.find(v => v.id === item.variantId) : null;
        const price = variant?.price ? Number(variant.price) : Number(prod.price);
        subtotal += price * item.quantity;
        promoItems.push({ productId: item.productId, categoryId: prod.categoryId, quantity: item.quantity, unitPrice: price });
      }

      const { discount: promoDiscount, applied: appliedPromotions } =
        await promotionService.computeDiscount(store.id, promoItems).catch(() => ({ discount: 0, applied: [] }));

      let total = Math.max(0, subtotal - promoDiscount);

      let couponDiscount = 0;
      let couponError: string | null = null;
      if (couponCode) {
        try {
          const result = await couponService.validate(store.id, couponCode, total);
          couponDiscount = result.discountAmount;
          total = result.finalTotal;
        } catch (e) {
          couponError = e instanceof Error ? e.message : 'كود الخصم غير صالح';
        }
      }

      const shippingFee = Math.max(0, Number(shippingFeeInput) || 0);
      total += shippingFee;

      let giftCardDeducted = 0;
      let giftCardError: string | null = null;
      if (giftCardCode) {
        try {
          const card = await giftCardService.peek(store.id, giftCardCode);
          giftCardDeducted = Math.min(card.remainingBalance, total);
          total = Math.max(0, total - giftCardDeducted);
        } catch (e) {
          giftCardError = e instanceof Error ? e.message : 'كود بطاقة الهدايا غير صالح';
        }
      }

      res.json({
        success: true,
        data: {
          subtotal, promoDiscount, appliedPromotions,
          couponDiscount, couponError,
          giftCardDeducted, giftCardError,
          shippingFee, total,
        },
      });
    } catch (err) { next(err); }
  }
);

// POST /api/storefront/:slug/checkout — guest or authenticated customer COD order
router.post(
  '/:slug/checkout',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
      if (!store || !store.isActive) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }

      const { customerName, customerPhone, governorate, city, address, notes, items, couponCode, giftCardCode } = req.body as {
        customerName: string; customerPhone: string;
        governorate: string; city: string; address: string; notes?: string;
        items: { productId: string; quantity: number; variantId?: string }[];
        couponCode?: string; giftCardCode?: string;
      };

      if (!customerName || !customerPhone || !governorate || !city || !address || !items?.length) {
        res.status(400).json({ success: false, error: 'بيانات الطلب غير مكتملة' });
        return;
      }

      const deliveryZones = Array.isArray(store.deliveryZones)
        ? (store.deliveryZones as unknown as { governorate: string; price: number }[])
        : [];
      let shippingFee = 0;
      if (deliveryZones.length > 0) {
        const zone = deliveryZones.find(z => z.governorate === governorate);
        if (!zone) {
          res.status(400).json({ success: false, error: 'التوصيل غير متاح لهذه المحافظة' });
          return;
        }
        shippingFee = Number(zone.price) || 0;
      }

      const [products, variants] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: items.map(i => i.productId) }, storeId: store.id, isActive: true } }),
        prisma.productVariant.findMany({ where: { id: { in: items.filter(i => i.variantId).map(i => i.variantId as string) } } }),
      ]);

      if (products.length !== items.length) {
        res.status(400).json({ success: false, error: 'بعض المنتجات غير متاحة' });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderItems: any[] = [];
      let subtotal = 0;
      for (const item of items) {
        const prod = products.find(p => p.id === item.productId)!;
        const variant = item.variantId ? variants.find(v => v.id === item.variantId) : null;
        if (item.variantId && !variant) {
          res.status(400).json({ success: false, error: `الخيار المحدد غير متاح: ${prod.name}` });
          return;
        }
        const availableStock = variant ? variant.stock : prod.stock;
        if (availableStock < item.quantity) {
          res.status(400).json({ success: false, error: `المخزون غير كافٍ: ${prod.name}` });
          return;
        }
        const price = variant?.price ? Number(variant.price) : Number(prod.price);
        subtotal += price * item.quantity;
        const variantLabel = variant ? Object.entries(variant.options as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join('، ') : null;
        orderItems.push({ productId: item.productId, variantId: variant?.id, variantLabel, quantity: item.quantity, price });
      }

      // Automatic promotions (BOGO / tiered)
      const promoItems = items.map(item => {
        const prod = products.find(p => p.id === item.productId)!;
        const variant = item.variantId ? variants.find(v => v.id === item.variantId) : null;
        return {
          productId: item.productId, categoryId: prod.categoryId,
          quantity: item.quantity,
          unitPrice: variant?.price ? Number(variant.price) : Number(prod.price),
        };
      });
      const { discount: promoDiscount, applied: appliedPromotions } = await promotionService.computeDiscount(store.id, promoItems).catch(() => ({ discount: 0, applied: [] }));

      let total = Math.max(0, subtotal - promoDiscount);

      // Coupon code
      let couponDiscount = 0;
      if (couponCode) {
        const result = await couponService.apply(store.id, couponCode, total);
        couponDiscount = result.discountAmount;
        total = result.finalTotal;
      }

      total += shippingFee;

      // Gift card (deducted last, cannot exceed remaining total)
      let giftCardDeducted = 0;
      if (giftCardCode) {
        giftCardDeducted = await giftCardService.redeem(store.id, giftCardCode, total);
        total = Math.max(0, total - giftCardDeducted);
      }

      const isCustomer = req.user?.role === 'CUSTOMER';
      const customerEmail = isCustomer ? req.user!.email : `${customerPhone.replace(/\s/g, '')}@checkout.bazar`;
      const order = await prisma.$transaction(async (tx) => {
        const o = await tx.order.create({
          data: {
            storeId: store.id,
            customerId: isCustomer ? req.user!.userId : null,
            customerName,
            customerPhone,
            customerEmail,
            total,
            shippingFee,
            shippingAddress: { governorate, city, address, notes: notes ?? '' } as import('@prisma/client').Prisma.InputJsonValue,
            status: 'PENDING',
            items: { create: orderItems },
          },
          select: { id: true, total: true, shippingFee: true },
        });
        await Promise.all(items.map(item => {
          if (item.variantId) {
            return tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
          }
          return tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        }));
        return o;
      });

      notifyNewOrder(store.id, { id: order.id, customerName, total: Number(order.total) }).catch(() => null);
      loyaltyService.awardPoints(customerEmail, Number(order.total), order.id, store.id).catch(() => null);

      // Clear the server-synced cart (if any) now that checkout completed — keeps abandoned-cart tracking accurate
      const sessionId = req.headers['x-session-id'] as string | undefined;
      if (isCustomer || sessionId) {
        prisma.cart.findFirst({
          where: { storeId: store.id, ...(isCustomer ? { customerId: req.user!.userId } : { sessionId }) },
        }).then(cart => cart && prisma.cartItem.deleteMany({ where: { cartId: cart.id } })).catch(() => null);
      }

      res.status(201).json({
        success: true,
        data: {
          id: order.id, total: Number(order.total), shippingFee: Number(order.shippingFee),
          promoDiscount, couponDiscount, giftCardDeducted, appliedPromotions,
        },
      });
    } catch (err) { next(err); }
  }
);

export default router;
