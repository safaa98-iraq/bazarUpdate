import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { verifyToken, requireRole, resolveStoreId } from '../middleware/auth';
import { productService } from '../services/product.service';
import prisma from '@storebuilder/database';
import { PLAN_CONFIGS } from '@storebuilder/types';
import { parseCsv, stringifyCsv } from '../lib/csv';

const router = Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: errors.array()[0]?.msg });
    return;
  }
  next();
};

const merchant = [verifyToken, requireRole('MERCHANT')];

router.get('/', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const result = await productService.list(storeId, {
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
    });
    res.json({
      success: true, data: result.items,
      pagination: {
        page: Number(req.query.page ?? 1), limit: Number(req.query.limit ?? 20),
        total: result.total, totalPages: Math.ceil(result.total / Number(req.query.limit ?? 20)),
      },
    });
  } catch (err) { next(err); }
});

router.get('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await productService.getById(req.params.id, storeId);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

router.post('/', ...merchant,
  [
    body('name').trim().isLength({ min: 1 }).withMessage('اسم المنتج مطلوب'),
    body('price').isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
    body('stock').isInt({ min: 0 }).withMessage('الكمية يجب أن تكون رقماً صحيحاً'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = await resolveStoreId(req);
      const userId = req.user?.userId;
      const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }) : null;
      if (user?.plan === 'FREE') {
        const limit = PLAN_CONFIGS.FREE.products;
        const count = await prisma.product.count({ where: { storeId } });
        if (count >= limit) {
          res.status(403).json({ success: false, error: `وصلت إلى الحد الأقصى للخطة المجانية ${limit} منتج. ارفع خطتك لإضافة منتجات أكثر.` });
          return;
        }
      }
      const product = await productService.create(storeId, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) { next(err); }
  }
);

router.patch('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await productService.update(req.params.id, storeId, req.body);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

router.delete('/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    await productService.delete(req.params.id, storeId);
    res.json({ success: true, message: 'تم حذف المنتج' });
  } catch (err) { next(err); }
});

// ─── Variants ──────────────────────────────────────────────────────────────

function variantToPublic(v: { id: string; productId: string; options: unknown; sku: string | null; price: unknown; stock: number; imageUrl: string | null; isActive: boolean }) {
  return {
    id: v.id, productId: v.productId,
    options: v.options as Record<string, string>,
    sku: v.sku,
    price: v.price === null || v.price === undefined ? null : Number(v.price),
    stock: v.stock, imageUrl: v.imageUrl, isActive: v.isActive,
  };
}

router.get('/:id/variants', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId } });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    const variants = await prisma.productVariant.findMany({ where: { productId: req.params.id }, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: variants.map(variantToPublic) });
  } catch (err) { next(err); }
});

router.post('/:id/variants', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId } });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    const { options, sku, price, stock, imageUrl, isActive } = req.body;
    const variant = await prisma.productVariant.create({
      data: { productId: req.params.id, options: options ?? {}, sku, price: price ?? null, stock: stock ?? 0, imageUrl, isActive: isActive ?? true },
    });
    if (!product.hasVariants) {
      await prisma.product.update({ where: { id: product.id }, data: { hasVariants: true } });
    }
    res.status(201).json({ success: true, data: variantToPublic(variant) });
  } catch (err) { next(err); }
});

router.patch('/:id/variants/:variantId', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId } });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    const { options, sku, price, stock, imageUrl, isActive } = req.body;
    const variant = await prisma.productVariant.update({
      where: { id: req.params.variantId },
      data: { options, sku, price, stock, imageUrl, isActive },
    });
    res.json({ success: true, data: variantToPublic(variant) });
  } catch (err) { next(err); }
});

router.delete('/:id/variants/:variantId', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId } });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    await prisma.productVariant.delete({ where: { id: req.params.variantId } });
    const remaining = await prisma.productVariant.count({ where: { productId: req.params.id } });
    if (remaining === 0) {
      await prisma.product.update({ where: { id: req.params.id }, data: { hasVariants: false } });
    }
    res.json({ success: true, message: 'تم حذف المتغيّر' });
  } catch (err) { next(err); }
});

// ─── Import / Export (CSV, opens fine in Excel) ─────────────────────────────

const EXPORT_HEADERS = ['modelNumber', 'name', 'description', 'price', 'comparePrice', 'stock', 'category', 'brand', 'unitType', 'images', 'isActive'];

router.get('/export/csv', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    const products = await prisma.product.findMany({
      where: { storeId },
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });
    const rows = [
      EXPORT_HEADERS,
      ...products.map(p => [
        p.modelNumber ?? '',
        p.name,
        p.description ?? '',
        String(p.price),
        p.comparePrice ? String(p.comparePrice) : '',
        String(p.stock),
        p.category?.name ?? '',
        p.brand?.name ?? '',
        p.unitType,
        ((p.images as string[]) ?? []).join('|'),
        p.isActive ? '1' : '0',
      ]),
    ];
    const csv = '﻿' + stringifyCsv(rows); // BOM for Excel Arabic support
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (err) { next(err); }
});

router.post('/import/csv', ...merchant, csvUpload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!req.file) { res.status(400).json({ success: false, error: 'لم يتم إرفاق ملف' }); return; }

    const text = req.file.buffer.toString('utf-8').replace(/^﻿/, '');
    const rows = parseCsv(text);
    if (rows.length < 2) { res.status(400).json({ success: false, error: 'الملف فارغ' }); return; }

    const header = rows[0].map(h => h.trim());
    const idx = (col: string) => header.indexOf(col);
    const dataRows = rows.slice(1);

    const [categories, brands] = await Promise.all([
      prisma.category.findMany({ where: { storeId } }),
      prisma.brand.findMany({ where: { storeId } }),
    ]);
    const catByName = new Map(categories.map(c => [c.name.trim().toLowerCase(), c.id]));
    const brandByName = new Map(brands.map(b => [b.name.trim().toLowerCase(), b.id]));

    let created = 0, updated = 0, failed = 0;
    for (const row of dataRows) {
      try {
        const get = (col: string) => (idx(col) >= 0 ? row[idx(col)] ?? '' : '');
        const name = get('name').trim();
        if (!name) { failed++; continue; }
        const modelNumber = get('modelNumber').trim();
        const categoryId = catByName.get(get('category').trim().toLowerCase());
        const brandId = brandByName.get(get('brand').trim().toLowerCase());
        const data = {
          name,
          description: get('description') || undefined,
          price: Number(get('price')) || 0,
          comparePrice: get('comparePrice') ? Number(get('comparePrice')) : undefined,
          stock: Number(get('stock')) || 0,
          categoryId: categoryId ?? undefined,
          brandId: brandId ?? null,
          unitType: get('unitType') || 'piece',
          images: get('images') ? get('images').split('|').filter(Boolean) : [],
          isActive: get('isActive') !== '0',
        };

        const existing = modelNumber ? await prisma.product.findFirst({ where: { storeId, modelNumber } }) : null;
        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await productService.create(storeId, data);
          created++;
        }
      } catch { failed++; }
    }

    res.json({ success: true, data: { created, updated, failed, total: dataRows.length } });
  } catch (err) { next(err); }
});

export default router;
