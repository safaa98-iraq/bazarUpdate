import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { getSpecsMapForProducts } from '../services/product.service';
import type { OrderPublic, OrderStatusType } from '@storebuilder/types';

const router = Router();
const customer = [verifyToken, requireRole('CUSTOMER')];

// GET /api/customer/orders — the logged-in customer's own order history, across all stores
router.get('/orders', ...customer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user!.userId },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        store: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productIds = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))];
    const specsMap = await getSpecsMapForProducts(productIds);

    const data: OrderPublic[] = orders.map(o => ({
      id: o.id,
      storeId: o.storeId,
      customerId: o.customerId,
      customerEmail: o.customerEmail,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      total: Number(o.total),
      shippingFee: Number(o.shippingFee),
      status: o.status as OrderStatusType,
      shippingAddress: o.shippingAddress as OrderPublic['shippingAddress'],
      stripePaymentId: o.stripePaymentId,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map(i => ({
        id: i.id, productId: i.productId, quantity: i.quantity, price: Number(i.price),
        product: i.product ? { name: i.product.name, images: (i.product.images as string[]) ?? [], specs: specsMap[i.productId] ?? [] } : undefined,
      })),
      store: o.store ?? undefined,
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
