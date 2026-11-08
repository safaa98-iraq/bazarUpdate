import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import type { WarehousePublic } from '@storebuilder/types';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getMerchantContext, assertPlan } from '../lib/plan';
import { syncProductStock } from '../lib/fulfillment';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT')];
const MAX_WAREHOUSES = 30;

function govList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 30) : [];
}

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const list = await prisma.warehouse.findMany({
      where: { storeId: store.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { _count: { select: { orders: true } } },
    });
    const sums = await prisma.warehouseStock.groupBy({
      by: ['warehouseId'], where: { warehouseId: { in: list.map(w => w.id) } }, _sum: { quantity: true },
    });
    const data: WarehousePublic[] = list.map(w => ({
      id: w.id, name: w.name, governorate: w.governorate, address: w.address, phone: w.phone,
      servesGovernorates: govList(w.servesGovernorates), isDefault: w.isDefault, isActive: w.isActive,
      totalUnits: sums.find(s => s.warehouseId === w.id)?._sum.quantity ?? 0,
      ordersCount: w._count.orders,
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    assertPlan(plan, 'ENTERPRISE', 'الفروع والمخازن');
    const { name, governorate, address, phone, servesGovernorates } = req.body ?? {};
    if (!name?.trim()) throw new AppError(400, 'اسم الفرع مطلوب');
    const count = await prisma.warehouse.count({ where: { storeId: store.id } });
    if (count >= MAX_WAREHOUSES) throw new AppError(400, `الحد الأقصى ${MAX_WAREHOUSES} فرعاً`);

    const isFirst = count === 0;
    const wh = await prisma.$transaction(async (tx) => {
      const created = await tx.warehouse.create({
        data: {
          storeId: store.id, name: name.trim().slice(0, 100),
          governorate: governorate || null, address: address || null, phone: phone || null,
          servesGovernorates: govList(servesGovernorates), isDefault: isFirst,
        },
      });
      // The first branch takes over the store's existing stock so totals stay the same.
      if (isFirst) {
        const products = await tx.product.findMany({ where: { storeId: store.id }, select: { id: true, stock: true } });
        if (products.length) {
          await tx.warehouseStock.createMany({
            data: products.map(p => ({ warehouseId: created.id, productId: p.id, quantity: p.stock })),
          });
        }
      }
      return created;
    });
    res.status(201).json({ success: true, data: { id: wh.id } });
  } catch (err) { next(err); }
});

router.patch('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const wh = await prisma.warehouse.findFirst({ where: { id: req.params.id, storeId: store.id } });
    if (!wh) throw new AppError(404, 'الفرع غير موجود');
    const { name, governorate, address, phone, servesGovernorates, isActive, isDefault } = req.body ?? {};
    await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.warehouse.updateMany({ where: { storeId: store.id }, data: { isDefault: false } });
      }
      await tx.warehouse.update({
        where: { id: wh.id },
        data: {
          ...(name?.trim() ? { name: name.trim().slice(0, 100) } : {}),
          ...(governorate !== undefined ? { governorate: governorate || null } : {}),
          ...(address !== undefined ? { address: address || null } : {}),
          ...(phone !== undefined ? { phone: phone || null } : {}),
          ...(servesGovernorates !== undefined ? { servesGovernorates: govList(servesGovernorates) } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(isDefault === true ? { isDefault: true } : {}),
        },
      });
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const wh = await prisma.warehouse.findFirst({ where: { id: req.params.id, storeId: store.id } });
    if (!wh) throw new AppError(404, 'الفرع غير موجود');
    const others = await prisma.warehouse.findMany({ where: { storeId: store.id, id: { not: wh.id } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    await prisma.$transaction(async (tx) => {
      const target = others[0];
      if (target) {
        // Move this branch's stock into the remaining default branch.
        const stocks = await tx.warehouseStock.findMany({ where: { warehouseId: wh.id } });
        for (const s of stocks) {
          await tx.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId: target.id, productId: s.productId } },
            create: { warehouseId: target.id, productId: s.productId, quantity: s.quantity },
            update: { quantity: { increment: s.quantity } },
          });
        }
        if (wh.isDefault) await tx.warehouse.update({ where: { id: target.id }, data: { isDefault: true } });
      }
      await tx.warehouse.delete({ where: { id: wh.id } });
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** Stock matrix: products × branches. */
router.get('/stock', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const [warehouses, products] = await Promise.all([
      prisma.warehouse.findMany({ where: { storeId: store.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }], select: { id: true, name: true } }),
      prisma.product.findMany({
        where: { storeId: store.id, ...(search ? { name: { contains: search } } : {}) },
        select: { id: true, name: true, stock: true, images: true },
        orderBy: { createdAt: 'desc' }, take: 200,
      }),
    ]);
    const stocks = await prisma.warehouseStock.findMany({
      where: { productId: { in: products.map(p => p.id) } }, select: { productId: true, warehouseId: true, quantity: true },
    });
    res.json({
      success: true,
      data: {
        warehouses,
        products: products.map(p => ({
          id: p.id, name: p.name, total: p.stock,
          image: Array.isArray(p.images) ? (p.images[0] as string | undefined) ?? null : null,
          stock: Object.fromEntries(stocks.filter(s => s.productId === p.id).map(s => [s.warehouseId, s.quantity])),
        })),
      },
    });
  } catch (err) { next(err); }
});

/** Set one cell of the matrix; the product's total stock is recomputed. */
router.put('/stock', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const { productId, warehouseId } = req.body ?? {};
    const quantity = Math.max(0, Math.floor(Number(req.body?.quantity)));
    if (!Number.isFinite(quantity)) throw new AppError(400, 'كمية غير صالحة');
    const [product, wh] = await Promise.all([
      prisma.product.findFirst({ where: { id: productId, storeId: store.id } }),
      prisma.warehouse.findFirst({ where: { id: warehouseId, storeId: store.id } }),
    ]);
    if (!product || !wh) throw new AppError(404, 'المنتج أو الفرع غير موجود');
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      create: { warehouseId, productId, quantity },
      update: { quantity },
    });
    const total = await syncProductStock(productId);
    res.json({ success: true, data: { total } });
  } catch (err) { next(err); }
});

/** Move units between branches (total unchanged). */
router.post('/transfer', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const { productId, fromId, toId } = req.body ?? {};
    const quantity = Math.floor(Number(req.body?.quantity));
    if (!quantity || quantity < 1 || fromId === toId) throw new AppError(400, 'بيانات النقل غير صالحة');
    const whs = await prisma.warehouse.findMany({ where: { storeId: store.id, id: { in: [fromId, toId] } } });
    if (whs.length !== 2) throw new AppError(404, 'الفرع غير موجود');
    const from = await prisma.warehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: fromId, productId } } });
    if (!from || from.quantity < quantity) throw new AppError(400, 'الكمية غير متوفرة في الفرع المصدر');
    await prisma.$transaction([
      prisma.warehouseStock.update({ where: { id: from.id }, data: { quantity: { decrement: quantity } } }),
      prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: toId, productId } },
        create: { warehouseId: toId, productId, quantity },
        update: { quantity: { increment: quantity } },
      }),
    ]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
