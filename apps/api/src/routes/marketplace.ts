import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { cuid } from '../lib/cuid';
import { loyaltyService } from '../services/loyalty.service';

const router = Router();
const merchantMW = [verifyToken, requireRole('MERCHANT')];
const adminMW = [verifyToken, requireRole('SUPER_ADMIN')];

async function getMerchantStore(merchantId: string) {
  const store = await prisma.store.findUnique({ where: { merchantId } });
  if (!store) throw { status: 404, message: 'Store not found' };
  return store;
}

function buildProductConditions(
  search?: string, categoryTag?: string, storeId?: string,
  minPrice?: number, maxPrice?: number
): Prisma.Sql {
  const conds: Prisma.Sql[] = [
    Prisma.sql`ml.approvalStatus = 'approved'`,
    Prisma.sql`s.isActive = 1`,
    Prisma.sql`mss.isOptedIn = 1`,
    Prisma.sql`p.isActive = 1`,
  ];
  if (search) conds.push(Prisma.sql`MATCH(p.name, p.description) AGAINST(${search} IN BOOLEAN MODE)`);
  if (categoryTag) conds.push(Prisma.sql`ml.categoryTag = ${categoryTag}`);
  if (storeId) conds.push(Prisma.sql`ml.storeId = ${storeId}`);
  if (minPrice !== undefined) conds.push(Prisma.sql`COALESCE(ml.marketplacePrice, p.price) >= ${minPrice}`);
  if (maxPrice !== undefined) conds.push(Prisma.sql`COALESCE(ml.marketplacePrice, p.price) <= ${maxPrice}`);
  return Prisma.join(conds, ' AND ');
}

// ── PUBLIC: Browse products ───────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const categoryTag = req.query.categoryTag as string | undefined;
    const qStoreId = req.query.storeId as string | undefined;
    const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const sort = req.query.sort as string || 'newest';

    const where1 = buildProductConditions(search, categoryTag, qStoreId, minPrice, maxPrice);
    const where2 = buildProductConditions(search, categoryTag, qStoreId, minPrice, maxPrice);

    const orderSql = sort === 'price_asc'
      ? Prisma.sql`COALESCE(ml.marketplacePrice, p.price) ASC`
      : sort === 'price_desc'
      ? Prisma.sql`COALESCE(ml.marketplacePrice, p.price) DESC`
      : sort === 'featured'
      ? Prisma.sql`ml.isFeatured DESC, ml.sortOrder ASC, ml.createdAt DESC`
      : Prisma.sql`ml.createdAt DESC`;

    const [products, countRows] = await Promise.all([
      prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT ml.id as listingId, p.id, p.name, p.description,
          CAST(COALESCE(ml.marketplacePrice, p.price) AS DECIMAL(12,2)) as price,
          p.images, p.stock, p.unitType, p.unitLabel,
          ml.isFeatured, ml.categoryTag,
          s.id as storeId, s.name as storeName, s.logo as storeLogo, s.slug as storeSlug
        FROM MarketplaceListing ml
        JOIN Product p ON p.id = ml.productId
        JOIN Store s ON s.id = ml.storeId
        JOIN MarketplaceStoreSetting mss ON mss.storeId = ml.storeId
        WHERE ${where1}
        ORDER BY ${orderSql}
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) as total
        FROM MarketplaceListing ml
        JOIN Product p ON p.id = ml.productId
        JOIN Store s ON s.id = ml.storeId
        JOIN MarketplaceStoreSetting mss ON mss.storeId = ml.storeId
        WHERE ${where2}
      `,
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    res.json({
      success: true,
      data: products.map(p => ({
        ...p, price: Number(p.price),
        isFeatured: Boolean(p.isFeatured),
        images: p.images ?? [],
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) { next(e); }
});

// ── PUBLIC: Stores ────────────────────────────────────────────────────────────

router.get('/stores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stores = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT s.id, s.name, s.slug, s.logo, s.description,
        CAST(COUNT(ml.id) AS UNSIGNED) as productCount
      FROM MarketplaceStoreSetting mss
      JOIN Store s ON s.id = mss.storeId
      LEFT JOIN MarketplaceListing ml ON ml.storeId = s.id AND ml.approvalStatus = 'approved'
      WHERE mss.isOptedIn = 1 AND mss.applicationStatus = 'approved' AND s.isActive = 1
      GROUP BY s.id
      ORDER BY productCount DESC
    `;
    res.json({ success: true, data: stores.map(s => ({ ...s, productCount: Number(s.productCount) })) });
  } catch (e) { next(e); }
});

// ── PUBLIC: Category tags ─────────────────────────────────────────────────────

router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<{ categoryTag: string; count: bigint }[]>`
      SELECT ml.categoryTag, COUNT(*) as count
      FROM MarketplaceListing ml
      JOIN MarketplaceStoreSetting mss ON mss.storeId = ml.storeId
      WHERE ml.approvalStatus = 'approved' AND mss.isOptedIn = 1 AND ml.categoryTag IS NOT NULL
      GROUP BY ml.categoryTag
      ORDER BY count DESC
    `;
    res.json({ success: true, data: rows.map(r => ({ tag: r.categoryTag, count: Number(r.count) })) });
  } catch (e) { next(e); }
});

// ── PUBLIC: Product detail ────────────────────────────────────────────────────

router.get('/products/:listingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT ml.id as listingId, p.id, p.name, p.description,
        CAST(COALESCE(ml.marketplacePrice, p.price) AS DECIMAL(12,2)) as price,
        CAST(p.price AS DECIMAL(12,2)) as originalPrice,
        p.images, p.stock, p.unitType, p.unitLabel,
        ml.isFeatured, ml.categoryTag,
        s.id as storeId, s.name as storeName, s.logo as storeLogo, s.slug as storeSlug, s.description as storeDescription
      FROM MarketplaceListing ml
      JOIN Product p ON p.id = ml.productId
      JOIN Store s ON s.id = ml.storeId
      JOIN MarketplaceStoreSetting mss ON mss.storeId = ml.storeId
      WHERE ml.id = ${req.params.listingId}
        AND ml.approvalStatus = 'approved'
        AND mss.isOptedIn = 1
        AND s.isActive = 1
        AND p.isActive = 1
    `;
    if (!rows[0]) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    const p = rows[0];
    res.json({ success: true, data: { ...p, price: Number(p.price), originalPrice: Number(p.originalPrice), isFeatured: Boolean(p.isFeatured), images: p.images ?? [] } });
  } catch (e) { next(e); }
});

// ── PUBLIC: Place order ───────────────────────────────────────────────────────

router.post('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerEmail, customerName, customerPhone, shippingAddress, items, pointsToRedeem } = req.body;
    if (!customerEmail || !customerName || !items?.length) {
      res.status(400).json({ success: false, error: 'بيانات الطلب غير مكتملة' }); return;
    }

    // Verify listings and get prices
    const listingIds = items.map((i: { listingId: string }) => i.listingId);
    const listings = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT ml.id as listingId, ml.storeId, ml.productId,
        CAST(COALESCE(ml.marketplacePrice, p.price) AS DECIMAL(12,2)) as price,
        p.name, p.images, p.stock
      FROM MarketplaceListing ml
      JOIN Product p ON p.id = ml.productId
      WHERE ml.id IN (${Prisma.join(listingIds)}) AND ml.approvalStatus = 'approved' AND p.isActive = 1
    `;

    const listingMap = Object.fromEntries(listings.map(l => [l.listingId as string, l]));

    // Handle loyalty points redemption
    let discountAmount = 0;
    let pointsUsed = 0;
    if (pointsToRedeem && pointsToRedeem > 0 && customerEmail) {
      const result = await loyaltyService.redeemPoints(customerEmail, pointsToRedeem);
      discountAmount = result.discount;
      pointsUsed = result.pointsUsed;
    }

    // Calculate totals
    let subtotal = 0;
    const itemsWithPrices = items.map((item: { listingId: string; quantity: number }) => {
      const listing = listingMap[item.listingId];
      if (!listing) throw { status: 400, message: `منتج غير موجود: ${item.listingId}` };
      const itemTotal = Number(listing.price) * item.quantity;
      subtotal += itemTotal;
      return { ...item, listing, itemTotal };
    });

    const totalAmount = Math.max(0, subtotal - discountAmount);

    // Get commission rate
    const [commRow] = await prisma.$queryRaw<{ commissionRate: number }[]>`
      SELECT commissionRate FROM MarketplaceCommission
      WHERE categoryTag = 'all' OR categoryTag IS NULL
      LIMIT 1
    `;
    const commissionRate = Number(commRow?.commissionRate ?? 10) / 100;

    // Create marketplace order
    const orderId = cuid();
    await prisma.$executeRaw`
      INSERT INTO MarketplaceOrder (id, customerEmail, customerName, customerPhone, shippingAddress, totalAmount, discountAmount, pointsUsed, pointsEarned, status, paymentStatus, createdAt, updatedAt)
      VALUES (${orderId}, ${customerEmail}, ${customerName}, ${customerPhone ?? null},
        ${JSON.stringify(shippingAddress ?? {})}, ${totalAmount}, ${discountAmount}, ${pointsUsed}, 0,
        'pending', 'pending', NOW(3), NOW(3))
    `;

    // Group items by store
    const byStore = new Map<string, typeof itemsWithPrices>();
    for (const item of itemsWithPrices) {
      const sid = item.listing.storeId as string;
      if (!byStore.has(sid)) byStore.set(sid, []);
      byStore.get(sid)!.push(item);
    }

    // Create sub-orders
    for (const [storeId, storeItems] of byStore.entries()) {
      const storeTotal = storeItems.reduce((s: number, i: { itemTotal: number }) => s + i.itemTotal, 0);
      const platformFee = storeTotal * commissionRate;
      const storeNet = storeTotal - platformFee;
      const subOrderId = cuid();

      await prisma.$executeRaw`
        INSERT INTO SubOrder (id, marketplaceOrderId, storeId, storeTotal, platformFee, storeNet, status, createdAt, updatedAt)
        VALUES (${subOrderId}, ${orderId}, ${storeId}, ${storeTotal}, ${platformFee}, ${storeNet}, 'pending', NOW(3), NOW(3))
      `;

      for (const item of storeItems) {
        const listing = item.listing;
        const images = (listing.images ?? []) as string[];
        await prisma.$executeRaw`
          INSERT INTO SubOrderItem (id, subOrderId, productId, productName, productImage, quantity, price, total)
          VALUES (${cuid()}, ${subOrderId}, ${listing.productId}, ${listing.name}, ${images[0] ?? null}, ${item.quantity}, ${Number(listing.price)}, ${item.itemTotal})
        `;
        // Decrease stock
        await prisma.product.update({
          where: { id: listing.productId as string },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Award loyalty points
    const pointsEarned = await loyaltyService.awardPoints(customerEmail, totalAmount, orderId);
    if (pointsEarned > 0) {
      await prisma.$executeRaw`
        UPDATE MarketplaceOrder SET pointsEarned = ${pointsEarned} WHERE id = ${orderId}
      `;
    }

    res.status(201).json({
      success: true,
      data: { orderId, totalAmount, discountAmount, pointsUsed, pointsEarned },
    });
  } catch (e) { next(e); }
});

// ── PUBLIC: Track order ───────────────────────────────────────────────────────

router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [order] = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM MarketplaceOrder WHERE id = ${req.params.id}
    `;
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }

    const subOrders = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT so.*, s.name as storeName, s.logo as storeLogo
      FROM SubOrder so
      JOIN Store s ON s.id = so.storeId
      WHERE so.marketplaceOrderId = ${req.params.id}
    `;

    const subOrdersWithItems = await Promise.all(
      subOrders.map(async so => {
        const items = await prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT * FROM SubOrderItem WHERE subOrderId = ${so.id}
        `;
        return { ...so, storeTotal: Number(so.storeTotal), items };
      })
    );

    res.json({
      success: true,
      data: {
        ...order,
        totalAmount: Number(order.totalAmount),
        discountAmount: Number(order.discountAmount),
        subOrders: subOrdersWithItems,
      },
    });
  } catch (e) { next(e); }
});

// ── MERCHANT: Settings ────────────────────────────────────────────────────────

router.get('/merchant/settings', ...merchantMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM MarketplaceStoreSetting WHERE storeId = ${store.id}
    `;
    const setting = rows[0] ?? { storeId: store.id, isOptedIn: false, applicationStatus: 'none' };
    res.json({ success: true, data: { ...setting, isOptedIn: Boolean(setting.isOptedIn) } });
  } catch (e) { next(e); }
});

router.put('/merchant/settings', ...merchantMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const { applyNow } = req.body;

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM MarketplaceStoreSetting WHERE storeId = ${store.id}
    `;

    if (existing[0]) {
      if (applyNow) {
        await prisma.$executeRaw`
          UPDATE MarketplaceStoreSetting SET applicationStatus='pending', updatedAt=NOW(3) WHERE storeId=${store.id}
        `;
      }
    } else {
      const id = cuid();
      await prisma.$executeRaw`
        INSERT INTO MarketplaceStoreSetting (id, storeId, isOptedIn, applicationStatus, createdAt, updatedAt)
        VALUES (${id}, ${store.id}, 0, ${applyNow ? 'pending' : 'none'}, NOW(3), NOW(3))
      `;
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── MERCHANT: Listings ────────────────────────────────────────────────────────

router.get('/merchant/listings', ...merchantMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const listings = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT ml.*, p.name, p.images, CAST(p.price AS DECIMAL(12,2)) as originalPrice
      FROM MarketplaceListing ml
      JOIN Product p ON p.id = ml.productId
      WHERE ml.storeId = ${store.id}
      ORDER BY ml.createdAt DESC
    `;
    res.json({
      success: true,
      data: listings.map(l => ({
        ...l,
        originalPrice: Number(l.originalPrice),
        marketplacePrice: l.marketplacePrice ? Number(l.marketplacePrice) : null,
        isFeatured: Boolean(l.isFeatured),
      })),
    });
  } catch (e) { next(e); }
});

router.post('/merchant/listings', ...merchantMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const { productId, marketplacePrice, categoryTag } = req.body;

    // Verify product belongs to store
    const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }

    // Check if approved to list
    const [setting] = await prisma.$queryRaw<{ applicationStatus: string }[]>`
      SELECT applicationStatus FROM MarketplaceStoreSetting WHERE storeId = ${store.id}
    `;
    if (!setting || setting.applicationStatus !== 'approved') {
      res.status(403).json({ success: false, error: 'متجرك لم يُوافق عليه في السوق بعد' }); return;
    }

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM MarketplaceListing WHERE productId = ${productId} AND storeId = ${store.id}
    `;
    if (existing[0]) {
      res.status(409).json({ success: false, error: 'المنتج مدرج بالفعل' }); return;
    }

    const id = cuid();
    await prisma.$executeRaw`
      INSERT INTO MarketplaceListing (id, productId, storeId, approvalStatus, isFeatured, marketplacePrice, categoryTag, sortOrder, createdAt, updatedAt)
      VALUES (${id}, ${productId}, ${store.id}, 'pending', 0, ${marketplacePrice ? Number(marketplacePrice) : null}, ${categoryTag ?? null}, 0, NOW(3), NOW(3))
    `;
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
});

router.patch('/merchant/listings/:id', ...merchantMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const { marketplacePrice, categoryTag } = req.body;
    if (marketplacePrice !== undefined) {
      await prisma.$executeRaw`UPDATE MarketplaceListing SET marketplacePrice=${Number(marketplacePrice)}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    }
    if (categoryTag !== undefined) {
      await prisma.$executeRaw`UPDATE MarketplaceListing SET categoryTag=${categoryTag}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.delete('/merchant/listings/:id', ...merchantMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    await prisma.$executeRaw`DELETE FROM MarketplaceListing WHERE id=${req.params.id} AND storeId=${store.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── ADMIN: Store applications ─────────────────────────────────────────────────

router.get('/admin/applications', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string || 'pending';
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT mss.*, s.name as storeName, s.slug, s.logo, u.name as merchantName, u.email as merchantEmail
      FROM MarketplaceStoreSetting mss
      JOIN Store s ON s.id = mss.storeId
      JOIN User u ON u.id = s.merchantId
      WHERE mss.applicationStatus = ${status}
      ORDER BY mss.createdAt DESC
    `;
    res.json({ success: true, data: rows.map(r => ({ ...r, isOptedIn: Boolean(r.isOptedIn) })) });
  } catch (e) { next(e); }
});

router.post('/admin/applications/:id/approve', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$executeRaw`
      UPDATE MarketplaceStoreSetting
      SET applicationStatus='approved', isOptedIn=1, approvedAt=NOW(3), rejectedReason=NULL, updatedAt=NOW(3)
      WHERE id=${req.params.id}
    `;
    // Auto-approve pending listings for this store
    const [setting] = await prisma.$queryRaw<{ storeId: string }[]>`SELECT storeId FROM MarketplaceStoreSetting WHERE id=${req.params.id}`;
    if (setting) {
      await prisma.$executeRaw`UPDATE MarketplaceListing SET approvalStatus='approved', updatedAt=NOW(3) WHERE storeId=${setting.storeId} AND approvalStatus='pending'`;
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/admin/applications/:id/reject', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    await prisma.$executeRaw`
      UPDATE MarketplaceStoreSetting
      SET applicationStatus='rejected', isOptedIn=0, rejectedReason=${reason ?? null}, updatedAt=NOW(3)
      WHERE id=${req.params.id}
    `;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── ADMIN: Listings management ────────────────────────────────────────────────

router.get('/admin/listings', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT ml.*, p.name, p.images, s.name as storeName, CAST(p.price AS DECIMAL(12,2)) as originalPrice
      FROM MarketplaceListing ml
      JOIN Product p ON p.id = ml.productId
      JOIN Store s ON s.id = ml.storeId
      ORDER BY ml.isFeatured DESC, ml.createdAt DESC
    `;
    res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        originalPrice: Number(r.originalPrice),
        marketplacePrice: r.marketplacePrice ? Number(r.marketplacePrice) : null,
        isFeatured: Boolean(r.isFeatured),
      })),
    });
  } catch (e) { next(e); }
});

router.patch('/admin/listings/:id', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { approvalStatus, isFeatured, featuredUntil, sortOrder } = req.body;
    if (approvalStatus !== undefined) await prisma.$executeRaw`UPDATE MarketplaceListing SET approvalStatus=${approvalStatus}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    if (isFeatured !== undefined) await prisma.$executeRaw`UPDATE MarketplaceListing SET isFeatured=${isFeatured ? 1 : 0}, featuredUntil=${featuredUntil ? new Date(featuredUntil) : null}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    if (sortOrder !== undefined) await prisma.$executeRaw`UPDATE MarketplaceListing SET sortOrder=${Number(sortOrder)}, updatedAt=NOW(3) WHERE id=${req.params.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── ADMIN: Commissions ────────────────────────────────────────────────────────

router.get('/admin/commissions', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM MarketplaceCommission ORDER BY categoryTag`;
    res.json({ success: true, data: rows.map(r => ({ ...r, commissionRate: Number(r.commissionRate) })) });
  } catch (e) { next(e); }
});

router.put('/admin/commissions/:category', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commissionRate } = req.body;
    const category = req.params.category;
    const existing = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM MarketplaceCommission WHERE categoryTag=${category}`;
    if (existing[0]) {
      await prisma.$executeRaw`UPDATE MarketplaceCommission SET commissionRate=${Number(commissionRate)}, updatedAt=NOW(3) WHERE categoryTag=${category}`;
    } else {
      await prisma.$executeRaw`INSERT INTO MarketplaceCommission (id, categoryTag, commissionRate, createdAt, updatedAt) VALUES (${cuid()}, ${category}, ${Number(commissionRate)}, NOW(3), NOW(3))`;
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── ADMIN: Orders ─────────────────────────────────────────────────────────────

router.get('/admin/orders', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const orders = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT mo.*,
        CAST((SELECT COUNT(*) FROM SubOrder so WHERE so.marketplaceOrderId = mo.id) AS UNSIGNED) as subOrderCount
      FROM MarketplaceOrder mo
      ORDER BY mo.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) as total FROM MarketplaceOrder`;
    res.json({
      success: true,
      data: orders.map(o => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        discountAmount: Number(o.discountAmount),
        subOrderCount: Number(o.subOrderCount),
      })),
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (e) { next(e); }
});

// ── ADMIN: Analytics ──────────────────────────────────────────────────────────

router.get('/admin/analytics', ...adminMW, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [stats] = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        CAST(COUNT(*) AS UNSIGNED) as totalOrders,
        COALESCE(SUM(totalAmount), 0) as totalRevenue,
        CAST(COUNT(DISTINCT customerEmail) AS UNSIGNED) as uniqueCustomers,
        COALESCE(AVG(totalAmount), 0) as avgOrderValue
      FROM MarketplaceOrder
      WHERE status != 'cancelled'
    `;
    const [storeStats] = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        CAST(COUNT(*) AS UNSIGNED) as totalStores,
        CAST(SUM(isOptedIn) AS UNSIGNED) as activeStores
      FROM MarketplaceStoreSetting WHERE applicationStatus = 'approved'
    `;
    const revenueByDay = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT DATE(createdAt) as date, COALESCE(SUM(totalAmount), 0) as revenue
      FROM MarketplaceOrder
      WHERE status != 'cancelled' AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `;
    res.json({
      success: true,
      data: {
        totalOrders: Number(stats?.totalOrders ?? 0),
        totalRevenue: Number(stats?.totalRevenue ?? 0),
        uniqueCustomers: Number(stats?.uniqueCustomers ?? 0),
        avgOrderValue: Number(stats?.avgOrderValue ?? 0),
        totalStores: Number(storeStats?.totalStores ?? 0),
        activeStores: Number(storeStats?.activeStores ?? 0),
        revenueByDay: revenueByDay.map(r => ({ date: r.date, revenue: Number(r.revenue) })),
      },
    });
  } catch (e) { next(e); }
});

export default router;
