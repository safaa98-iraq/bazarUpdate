import prisma from '@storebuilder/database';
import { CreateOrderDto, OrderPublic, OrderStatusType, ProductSpecPublic } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';
import { notifyNewOrder } from '../lib/notify';
import { getSpecsMapForProducts } from './product.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublic(order: any, specsMap: Record<string, ProductSpecPublic[]> = {}): OrderPublic {
  return {
    id: order.id,
    storeId: order.storeId,
    customerId: order.customerId,
    customerEmail: order.customerEmail ?? null,
    customerName: order.customerName,
    customerPhone: order.customerPhone ?? null,
    total: Number(order.total),
    shippingFee: Number(order.shippingFee ?? 0),
    status: order.status as OrderStatusType,
    shippingAddress: order.shippingAddress as OrderPublic['shippingAddress'],
    stripePaymentId: order.stripePaymentId,
    draftNote: order.draftNote ?? null,
    createdAt: order.createdAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: order.items.map((i: any) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId ?? null,
      variantLabel: i.variantLabel ?? null,
      quantity: i.quantity,
      price: Number(i.price),
      product: i.product ? { ...i.product, specs: specsMap[i.productId] ?? [] } : undefined,
    })),
    store: order.store ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toPublicWithSpecs(order: any): Promise<OrderPublic> {
  const specsMap = await getSpecsMapForProducts(order.items.map((i: { productId: string }) => i.productId));
  return toPublic(order, specsMap);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toPublicManyWithSpecs(orders: any[]): Promise<OrderPublic[]> {
  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i: { productId: string }) => i.productId)))];
  const specsMap = await getSpecsMapForProducts(productIds);
  return orders.map((o) => toPublic(o, specsMap));
}

export class OrderService {
  /** Manual/draft order creation by the merchant — stock is NOT decremented until the draft is confirmed. */
  async createDraft(storeId: string, dto: CreateOrderDto): Promise<OrderPublic> {
    const productIds = dto.items.map((i) => i.productId);
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds }, storeId } })
      : [];
    if (products.length !== productIds.length) {
      throw new AppError(400, 'بعض المنتجات غير موجودة');
    }

    const itemsData = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { productId: item.productId, quantity: item.quantity, price: product.price };
    });
    const shippingFee = dto.shippingFee && dto.shippingFee > 0 ? dto.shippingFee : 0;
    const total = itemsData.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0) + shippingFee;

    const order = await prisma.order.create({
      data: {
        storeId,
        customerEmail: dto.customerEmail ?? null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone ?? null,
        total, shippingFee,
        shippingAddress: (dto.shippingAddress ?? {}) as unknown as import('@prisma/client').Prisma.InputJsonValue,
        status: 'DRAFT',
        draftNote: dto.draftNote ?? null,
        items: { create: itemsData },
      },
      include: { items: { include: { product: { select: { name: true, images: true } } } } },
    });

    return toPublic(order);
  }

  async create(dto: CreateOrderDto, customerId?: string): Promise<OrderPublic> {
    // Validate products and compute total
    const productIds = dto.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId: dto.storeId, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new AppError(400, 'One or more products are unavailable');
    }

    const itemsData = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        throw new AppError(400, `Insufficient stock for ${product.name}`);
      }
      return { productId: item.productId, quantity: item.quantity, price: product.price };
    });

    const shippingFee = dto.shippingFee && dto.shippingFee > 0 ? dto.shippingFee : 0;
    const total = itemsData.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0) + shippingFee;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          storeId: dto.storeId,
          customerId: customerId ?? null,
          customerEmail: dto.customerEmail,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone ?? null,
          total,
          shippingFee,
          shippingAddress: dto.shippingAddress as unknown as import('@prisma/client').Prisma.InputJsonValue,
          stripePaymentId: dto.stripePaymentId ?? null,
          items: { create: itemsData },
        },
        include: { items: { include: { product: { select: { name: true, images: true } } } } },
      });

      // Decrement stock
      await Promise.all(
        itemsData.map((i) =>
          tx.product.update({
            where: { id: i.productId },
            data: { stock: { decrement: i.quantity } },
          })
        )
      );

      return created;
    });

    notifyNewOrder(dto.storeId, { id: order.id, customerName: order.customerName, total: Number(order.total) }).catch(() => null);

    return toPublic(order);
  }

  /** Publish a DRAFT order: decrement stock and move it to PENDING. */
  async publishDraft(id: string, storeId: string): Promise<OrderPublic> {
    const order = await prisma.order.findFirst({ where: { id, storeId }, include: { items: true } });
    if (!order) throw new AppError(404, 'الطلب غير موجود');
    if (order.status !== 'DRAFT') throw new AppError(400, 'هذا الطلب ليس مسودة');

    const updated = await prisma.$transaction(async (tx) => {
      await Promise.all(order.items.map(i =>
        tx.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.quantity } } })
      ));
      return tx.order.update({
        where: { id },
        data: { status: 'PENDING' },
        include: { items: { include: { product: { select: { name: true, images: true } } } } },
      });
    });

    return toPublic(updated);
  }

  async listByStore(
    storeId: string,
    opts: { status?: string; page?: number; limit?: number }
  ): Promise<{ items: OrderPublic[]; total: number }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      storeId,
      ...(opts.status ? { status: opts.status as OrderStatusType } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: { select: { name: true, images: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { items: await toPublicManyWithSpecs(items), total };
  }

  async getById(id: string, storeId?: string): Promise<OrderPublic> {
    const order = await prisma.order.findFirst({
      where: { id, ...(storeId ? { storeId } : {}) },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        store: { select: { name: true, slug: true } },
      },
    });
    if (!order) throw new AppError(404, 'Order not found');
    return toPublicWithSpecs(order);
  }

  async updateStatus(
    id: string,
    storeId: string,
    status: OrderStatusType
  ): Promise<OrderPublic> {
    const order = await prisma.order.findFirst({ where: { id, storeId } });
    if (!order) throw new AppError(404, 'Order not found');

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: { select: { name: true, images: true } } } } },
    });
    return toPublic(updated);
  }
}

export const orderService = new OrderService();
