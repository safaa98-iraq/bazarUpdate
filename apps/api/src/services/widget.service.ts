import { prisma } from '@storebuilder/database';
import { cacheGet, cacheSet, cacheIncr } from '../lib/redis';
import { notifyNewOrder } from '../lib/notify';

function hourKey(storeId: string, ip: string): string {
  const h = new Date().toISOString().slice(0, 13);
  return `widget:rate:${storeId}:${ip}:${h}`;
}

function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  try { return JSON.parse(raw as string); } catch { return []; }
}

function parseDomains(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  try { return JSON.parse(raw as string); } catch { return []; }
}

function checkOrigin(store: { widgetDomains: unknown }, origin: string | null): boolean {
  const domains = parseDomains(store.widgetDomains);
  if (domains.length === 0) return true;
  if (!origin) return process.env.NODE_ENV !== 'production';
  try {
    const host = new URL(origin).hostname;
    return domains.some((d: string) => d === host || d === origin || origin.endsWith(d));
  } catch { return false; }
}

export const widgetService = {
  async resolveStore(slug: string) {
    const store = await prisma.store.findUnique({ where: { slug } });
    if (!store || !store.isActive) throw Object.assign(new Error('Store not found'), { status: 404 });
    if (!store.widgetEnabled) throw Object.assign(new Error('Widget not enabled for this store'), { status: 403 });
    return store;
  },

  async checkRateLimit(storeId: string, ip: string, limit: number): Promise<void> {
    const key = hourKey(storeId, ip);
    const count = await cacheIncr(key, 3600);
    if (count > limit) throw Object.assign(new Error('Rate limit exceeded'), { status: 429 });
  },

  async getProducts(slug: string, origin: string | null, ip: string) {
    const store = await this.resolveStore(slug);
    if (!checkOrigin(store, origin)) throw Object.assign(new Error('Origin not allowed'), { status: 403 });
    await this.checkRateLimit(store.id, ip, store.widgetRateLimit);

    const cacheKey = `widget:products:${store.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached as string);

    const products = await prisma.product.findMany({
      where: { storeId: store.id, isActive: true, stock: { gt: 0 } },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      images: parseImages(p.images),
      stock: p.stock,
      category: p.category,
    }));

    await cacheSet(cacheKey, JSON.stringify(result), 300);
    return result;
  },

  async getProduct(slug: string, productId: string, origin: string | null, ip: string) {
    const store = await this.resolveStore(slug);
    if (!checkOrigin(store, origin)) throw Object.assign(new Error('Origin not allowed'), { status: 403 });
    await this.checkRateLimit(store.id, ip, store.widgetRateLimit);

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      images: parseImages(product.images),
      stock: product.stock,
      category: product.category,
    };
  },

  async createOrder(slug: string, body: {
    customerName: string;
    customerEmail: string;
    items: { productId: string; quantity: number }[];
    shippingAddress: object;
    stripePaymentId?: string;
  }, origin: string | null) {
    const store = await prisma.store.findUnique({ where: { slug } });
    if (!store || !store.isActive) throw Object.assign(new Error('Store not found'), { status: 404 });
    if (!checkOrigin(store, origin)) throw Object.assign(new Error('Origin not allowed'), { status: 403 });

    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map(i => i.productId) }, storeId: store.id },
    });

    let total = 0;
    const orderItems = body.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
      if (prod.stock < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${prod.name}`), { status: 400 });
      const lineTotal = Number(prod.price) * item.quantity;
      total += lineTotal;
      return { productId: item.productId, quantity: item.quantity, price: Number(prod.price) };
    });

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          storeId: store.id,
          customerEmail: body.customerEmail,
          customerName: body.customerName,
          total,
          shippingAddress: body.shippingAddress,
          stripePaymentId: body.stripePaymentId,
          status: body.stripePaymentId ? 'PAID' : 'PENDING',
          items: { create: orderItems },
        },
        include: { items: true },
      });
      await Promise.all(
        orderItems.map(item =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );
      await tx.widgetEvent.create({
        data: { storeId: store.id, type: 'CONVERSION', meta: { orderId: o.id, total } },
      });
      return o;
    });

    notifyNewOrder(store.id, { id: order.id, customerName: order.customerName, total: Number(order.total) }).catch(() => null);

    return order;
  },

  async trackEvent(slug: string, type: string, sessionId?: string, ip?: string, meta?: object) {
    const store = await prisma.store.findUnique({ where: { slug }, select: { id: true } });
    if (!store) return;
    await prisma.widgetEvent.create({
      data: { storeId: store.id, type, sessionId, ip: ip?.slice(0, 45), meta: meta as never },
    }).catch(() => null);
  },

  async getSettings(merchantId: string) {
    const store = await prisma.store.findFirst({
      where: { merchantId },
      select: { id: true, slug: true, widgetEnabled: true, widgetDomains: true, widgetTheme: true, widgetRateLimit: true },
    });
    if (!store) return null;
    return {
      widgetEnabled: store.widgetEnabled,
      widgetDomains: parseDomains(store.widgetDomains),
      widgetTheme: store.widgetTheme,
      widgetRateLimit: store.widgetRateLimit,
      embedCode: `<div data-storebuilder data-store="${store.slug}" data-theme="${store.widgetTheme}"></div>\n<script src="${process.env.API_URL?.replace(':4000', ':3000') ?? 'http://localhost:3000'}/widget.js"></script>`,
    };
  },

  async updateSettings(merchantId: string, data: {
    widgetEnabled?: boolean;
    widgetDomains?: string[];
    widgetTheme?: string;
    widgetRateLimit?: number;
  }) {
    const store = await prisma.store.findFirst({ where: { merchantId } });
    if (!store) throw Object.assign(new Error('Store not found'), { status: 404 });
    await prisma.store.update({
      where: { id: store.id },
      data: {
        widgetEnabled: data.widgetEnabled,
        widgetDomains: data.widgetDomains ? JSON.stringify(data.widgetDomains) : undefined,
        widgetTheme: data.widgetTheme,
        widgetRateLimit: data.widgetRateLimit,
      },
    });
  },

  async getAdminStats() {
    const stores = await prisma.store.findMany({
      select: { id: true, name: true, slug: true, widgetEnabled: true },
    });

    const stats = await Promise.all(stores.map(async (s) => {
      const [impressions, clicks, conversions] = await Promise.all([
        prisma.widgetEvent.count({ where: { storeId: s.id, type: 'IMPRESSION' } }),
        prisma.widgetEvent.count({ where: { storeId: s.id, type: 'CLICK' } }),
        prisma.widgetEvent.count({ where: { storeId: s.id, type: 'CONVERSION' } }),
      ]);
      return { storeId: s.id, storeName: s.name, slug: s.slug, widgetEnabled: s.widgetEnabled, impressions, clicks, conversions };
    }));

    return stats;
  },

  async adminToggleWidget(storeId: string, enabled: boolean) {
    await prisma.store.update({ where: { id: storeId }, data: { widgetEnabled: enabled } });
  },
};
