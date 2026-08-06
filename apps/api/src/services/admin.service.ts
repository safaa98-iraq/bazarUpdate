import prisma from '@storebuilder/database';
import { AnalyticsData, TopStore, MerchantIssue, StoreComparisonRow } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

const DAY_MS = 86_400_000;

export class AdminService {
  // ─── Merchants ─────────────────────────────────────────────────────────────

  async listMerchants(opts: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      role: 'MERCHANT' as const,
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search } },
              { email: { contains: opts.search } },
            ],
          }
        : {}),
    };

    const [merchants, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          isActive: true,
          createdAt: true,
          store: { select: { id: true, name: true, slug: true, isActive: true, isPublished: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { merchants, total };
  }

  async getMerchantById(id: string) {
    const merchant = await prisma.user.findFirst({
      where: { id, role: 'MERCHANT' },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isActive: true,
        createdAt: true,
        store: {
          include: {
            products: { select: { id: true, name: true, price: true, stock: true, isActive: true }, take: 10 },
            _count: { select: { orders: true, products: true } },
          },
        },
      },
    });
    if (!merchant) throw new AppError(404, 'Merchant not found');
    return merchant;
  }

  async setMerchantActive(id: string, isActive: boolean) {
    const merchant = await prisma.user.findFirst({ where: { id, role: 'MERCHANT' } });
    if (!merchant) throw new AppError(404, 'Merchant not found');

    return prisma.user.update({ where: { id }, data: { isActive } });
  }

  async deleteMerchant(id: string) {
    const merchant = await prisma.user.findFirst({ where: { id, role: 'MERCHANT' } });
    if (!merchant) throw new AppError(404, 'Merchant not found');

    await prisma.user.delete({ where: { id } });
  }

  async updateMerchantPlan(id: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
    const merchant = await prisma.user.findFirst({ where: { id, role: 'MERCHANT' } });
    if (!merchant) throw new AppError(404, 'Merchant not found');

    return prisma.user.update({ where: { id }, data: { plan } });
  }

  // ─── Stores ────────────────────────────────────────────────────────────────

  async listStores(opts: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: 'insensitive' as const } },
              { slug: { contains: opts.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true, email: true, plan: true } },
          _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.store.count({ where }),
    ]);

    return { stores, total };
  }

  async getStoreById(id: string) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true, email: true, plan: true } },
        products: { orderBy: { createdAt: 'desc' }, take: 20 },
        categories: true,
        _count: { select: { orders: true, products: true } },
      },
    });
    if (!store) throw new AppError(404, 'Store not found');
    return store;
  }

  async setStoreActive(id: string, isActive: boolean) {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) throw new AppError(404, 'Store not found');

    return prisma.store.update({ where: { id }, data: { isActive } });
  }

  // ─── Orders ────────────────────────────────────────────────────────────────

  async listAllOrders(opts: {
    page?: number;
    limit?: number;
    storeId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(opts.storeId ? { storeId: opts.storeId } : {}),
      ...(opts.status ? { status: opts.status as 'PENDING' } : {}),
      ...(opts.startDate || opts.endDate
        ? {
            createdAt: {
              ...(opts.startDate ? { gte: new Date(opts.startDate) } : {}),
              ...(opts.endDate ? { lte: new Date(opts.endDate) } : {}),
            },
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          store: { select: { name: true, slug: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async exportOrdersCsv(opts: { storeId?: string; status?: string }): Promise<string> {
    const orders = await prisma.order.findMany({
      where: {
        ...(opts.storeId ? { storeId: opts.storeId } : {}),
        ...(opts.status ? { status: opts.status as 'PENDING' } : {}),
      },
      include: { store: { select: { name: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Order ID,Store,Customer,Email,Total,Status,Date\n';
    const rows = orders.map((o) =>
      [
        o.id,
        o.store.name,
        o.customerName,
        o.customerEmail,
        Number(o.total).toFixed(2),
        o.status,
        o.createdAt.toISOString(),
      ].join(',')
    );
    return header + rows.join('\n');
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics(): Promise<AnalyticsData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMerchants,
      activeMerchants,
      totalStores,
      activeStores,
      newMerchantsThisMonth,
      revenueResult,
      totalOrdersCount,
      topStoresRaw,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'MERCHANT' } }),
      prisma.user.count({ where: { role: 'MERCHANT', isActive: true } }),
      prisma.store.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'MERCHANT', createdAt: { gte: startOfMonth } } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.count(),
      prisma.$queryRaw<
        { storeId: string; storeName: string; slug: string; totalRevenue: number; totalOrders: bigint }[]
      >`
        SELECT o.storeId as storeId, s.name as storeName, s.slug as slug,
               CAST(SUM(o.total) AS DECIMAL(12,2)) as totalRevenue,
               COUNT(o.id) as totalOrders
        FROM \`Order\` o
        JOIN \`Store\` s ON s.id = o.storeId
        WHERE o.status != 'CANCELLED'
        GROUP BY o.storeId, s.name, s.slug
        ORDER BY totalRevenue DESC
        LIMIT 5
      `,
    ]);

    // Monthly revenue for last 6 months
    const months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const res = await prisma.order.aggregate({
        where: { createdAt: { gte: d, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      });
      months.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: Number(res._sum.total ?? 0),
      });
    }

    const topStores: TopStore[] = topStoresRaw.map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      slug: s.slug,
      totalRevenue: Number(s.totalRevenue),
      totalOrders: Number(s.totalOrders),
    }));

    return {
      totalRevenue: Number(revenueResult._sum.total ?? 0),
      totalOrders: totalOrdersCount,
      totalMerchants,
      activeMerchants,
      inactiveMerchants: totalMerchants - activeMerchants,
      totalStores,
      activeStores,
      newMerchantsThisMonth,
      topStores,
      revenueByMonth: months,
    };
  }

  // ─── Audit Log ─────────────────────────────────────────────────────────────

  async getLogs(opts: {
    page?: number;
    limit?: number;
    action?: string;
    adminId?: string;
  }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;

    const where = {
      ...(opts.action ? { action: { contains: opts.action, mode: 'insensitive' as const } } : {}),
      ...(opts.adminId ? { adminId: opts.adminId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminLog.count({ where }),
    ]);

    return { logs, total };
  }

  // ─── Merchant health signals ─────────────────────────────────────────────────

  async getMerchantIssues(): Promise<MerchantIssue[]> {
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * DAY_MS);
    const fourteenDaysAgo = new Date(now - 14 * DAY_MS);
    const fortyEightHoursAgo = new Date(now - 2 * DAY_MS);

    const issues: MerchantIssue[] = [];

    // 1. Signed up 3+ days ago, still no store
    const noStoreMerchants = await prisma.user.findMany({
      where: { role: 'MERCHANT', isActive: true, createdAt: { lt: threeDaysAgo }, store: null },
      select: { id: true, name: true, email: true, whatsapp: true, createdAt: true },
    });
    for (const m of noStoreMerchants) {
      issues.push({
        merchantId: m.id, merchantName: m.name, merchantEmail: m.email, merchantWhatsapp: m.whatsapp,
        storeId: null, storeName: null, storeSlug: null,
        issueType: 'NO_STORE', detail: 'سجّل ولم ينشئ متجراً بعد', since: m.createdAt.toISOString(),
      });
    }

    // 2. Has a store 3+ days old with zero products
    const storesWithNoProducts = await prisma.store.findMany({
      where: { createdAt: { lt: threeDaysAgo }, isActive: true, products: { none: {} } },
      select: {
        id: true, name: true, slug: true, createdAt: true,
        merchant: { select: { id: true, name: true, email: true, whatsapp: true, isActive: true } },
      },
    });
    for (const s of storesWithNoProducts) {
      if (!s.merchant.isActive) continue;
      issues.push({
        merchantId: s.merchant.id, merchantName: s.merchant.name, merchantEmail: s.merchant.email, merchantWhatsapp: s.merchant.whatsapp,
        storeId: s.id, storeName: s.name, storeSlug: s.slug,
        issueType: 'NO_PRODUCTS', detail: 'أنشأ متجراً ولم يضف أي منتج بعد', since: s.createdAt.toISOString(),
      });
    }

    // 3. Published store, 14+ days old, zero orders ever
    const storesWithNoSales = await prisma.store.findMany({
      where: { isPublished: true, isActive: true, createdAt: { lt: fourteenDaysAgo }, orders: { none: {} } },
      select: {
        id: true, name: true, slug: true, createdAt: true,
        merchant: { select: { id: true, name: true, email: true, whatsapp: true, isActive: true } },
      },
    });
    for (const s of storesWithNoSales) {
      if (!s.merchant.isActive) continue;
      issues.push({
        merchantId: s.merchant.id, merchantName: s.merchant.name, merchantEmail: s.merchant.email, merchantWhatsapp: s.merchant.whatsapp,
        storeId: s.id, storeName: s.name, storeSlug: s.slug,
        issueType: 'NO_SALES', detail: 'متجر منشور منذ أكثر من أسبوعين بدون أي طلب', since: s.createdAt.toISOString(),
      });
    }

    // 4. Suspended stores
    const suspendedStores = await prisma.store.findMany({
      where: { suspendedAt: { not: null } },
      select: {
        id: true, name: true, slug: true, suspendedAt: true, suspendReason: true,
        merchant: { select: { id: true, name: true, email: true, whatsapp: true } },
      },
    });
    for (const s of suspendedStores) {
      issues.push({
        merchantId: s.merchant.id, merchantName: s.merchant.name, merchantEmail: s.merchant.email, merchantWhatsapp: s.merchant.whatsapp,
        storeId: s.id, storeName: s.name, storeSlug: s.slug,
        issueType: 'SUSPENDED', detail: s.suspendReason ?? 'المتجر موقوف', since: (s.suspendedAt ?? new Date()).toISOString(),
      });
    }

    // 5. Payment requests pending review for 48h+
    const stalePayments = await prisma.paymentRequest.findMany({
      where: { status: 'PENDING', createdAt: { lt: fortyEightHoursAgo } },
      select: {
        createdAt: true, planTarget: true,
        user: { select: { id: true, name: true, email: true, whatsapp: true } },
      },
    });
    for (const p of stalePayments) {
      issues.push({
        merchantId: p.user.id, merchantName: p.user.name, merchantEmail: p.user.email, merchantWhatsapp: p.user.whatsapp,
        storeId: null, storeName: null, storeSlug: null,
        issueType: 'PAYMENT_PENDING', detail: `طلب ترقية لخطة ${p.planTarget} بانتظار المراجعة منذ أكثر من يومين`, since: p.createdAt.toISOString(),
      });
    }

    return issues.sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());
  }

  // ─── Cross-store comparison reports ───────────────────────────────────────

  async compareStores(): Promise<StoreComparisonRow[]> {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [stores, revenueRows, thisMonthRows, lastMonthRows, categoryRows] = await Promise.all([
      prisma.store.findMany({
        select: {
          id: true, name: true, slug: true, isActive: true, createdAt: true,
          merchant: { select: { name: true, plan: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.groupBy({
        by: ['storeId'], where: { status: { not: 'CANCELLED' } },
        _sum: { total: true }, _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['storeId'], where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfThisMonth } },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['storeId'], where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
        _sum: { total: true },
      }),
      prisma.$queryRaw<{ storeId: string; categoryName: string | null; qty: bigint }[]>`
        SELECT p.storeId as storeId, c.name as categoryName, SUM(oi.quantity) as qty
        FROM OrderItem oi
        JOIN \`Order\` o ON o.id = oi.orderId
        JOIN Product p ON p.id = oi.productId
        LEFT JOIN Category c ON c.id = p.categoryId
        WHERE o.status != 'CANCELLED'
        GROUP BY p.storeId, c.name
      `,
    ]);

    const revenueMap = new Map(revenueRows.map(r => [r.storeId, { revenue: Number(r._sum.total ?? 0), orders: r._count._all }]));
    const thisMonthMap = new Map(thisMonthRows.map(r => [r.storeId, Number(r._sum.total ?? 0)]));
    const lastMonthMap = new Map(lastMonthRows.map(r => [r.storeId, Number(r._sum.total ?? 0)]));

    const topCategoryMap = new Map<string, { name: string; qty: number }>();
    for (const row of categoryRows) {
      if (!row.categoryName) continue;
      const qty = Number(row.qty);
      const current = topCategoryMap.get(row.storeId);
      if (!current || qty > current.qty) topCategoryMap.set(row.storeId, { name: row.categoryName, qty });
    }

    return stores.map((s): StoreComparisonRow => {
      const rev = revenueMap.get(s.id) ?? { revenue: 0, orders: 0 };
      const thisMonth = thisMonthMap.get(s.id) ?? 0;
      const lastMonth = lastMonthMap.get(s.id) ?? 0;
      const growthPercent = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : null;
      return {
        storeId: s.id, storeName: s.name, slug: s.slug,
        merchantName: s.merchant.name, plan: s.merchant.plan,
        isActive: s.isActive, createdAt: s.createdAt.toISOString(),
        productCount: s._count.products,
        totalOrders: rev.orders, totalRevenue: rev.revenue,
        avgOrderValue: rev.orders > 0 ? Math.round((rev.revenue / rev.orders) * 100) / 100 : 0,
        revenueThisMonth: thisMonth, revenueLastMonth: lastMonth, growthPercent,
        topCategory: topCategoryMap.get(s.id)?.name ?? null,
      };
    });
  }
}

export const adminService = new AdminService();
