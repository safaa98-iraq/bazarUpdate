import prisma from '@storebuilder/database';

/** Product.stock is the sum of its branch stocks once a store uses branches. Returns the new total. */
export async function syncProductStock(productId: string): Promise<number> {
  const agg = await prisma.warehouseStock.aggregate({ where: { productId }, _sum: { quantity: true } });
  const total = Math.max(0, agg._sum.quantity ?? 0);
  await prisma.product.update({ where: { id: productId }, data: { stock: total } });
  return total;
}

/**
 * Called after the merchant edits a product's total stock directly (products page).
 * The difference is applied to the default branch so branch stocks keep adding up.
 */
export async function reconcileProductStock(storeId: string, productId: string, newTotal: number): Promise<void> {
  const def = await prisma.warehouse.findFirst({ where: { storeId, isDefault: true } });
  if (!def) return; // store doesn't use branches
  const agg = await prisma.warehouseStock.aggregate({ where: { productId }, _sum: { quantity: true } });
  const delta = newTotal - (agg._sum.quantity ?? 0);
  if (delta === 0) return;
  await prisma.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: def.id, productId } },
    create: { warehouseId: def.id, productId, quantity: Math.max(0, delta) },
    update: { quantity: { increment: delta } },
  });
}

/**
 * Pick the branch that fulfils an order and take the units out of its stock.
 * Preference: an active branch that serves the order's governorate and has every item
 * in stock → any active branch with every item → the default branch.
 */
export async function assignWarehouse(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, storeId: true, warehouseId: true, status: true, shippingAddress: true, items: { select: { productId: true, quantity: true } } },
  });
  if (!order || order.warehouseId || order.status === 'DRAFT') return order?.warehouseId ?? null;

  const warehouses = await prisma.warehouse.findMany({
    where: { storeId: order.storeId, isActive: true },
    include: { stocks: { where: { productId: { in: order.items.map(i => i.productId) } } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  if (!warehouses.length) return null;

  const gov = (order.shippingAddress as { governorate?: string } | null)?.governorate ?? '';
  const hasAll = (w: (typeof warehouses)[number]) =>
    order.items.every(i => (w.stocks.find(s => s.productId === i.productId)?.quantity ?? 0) >= i.quantity);
  const serves = (w: (typeof warehouses)[number]) =>
    Array.isArray(w.servesGovernorates) && (w.servesGovernorates as string[]).includes(gov);

  const chosen =
    warehouses.find(w => serves(w) && hasAll(w)) ??
    warehouses.find(w => w.governorate === gov && hasAll(w)) ??
    warehouses.find(hasAll) ??
    warehouses.find(w => w.isDefault) ??
    warehouses[0];

  await prisma.$transaction([
    ...order.items.map(i => prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: chosen.id, productId: i.productId } },
      create: { warehouseId: chosen.id, productId: i.productId, quantity: -i.quantity },
      update: { quantity: { decrement: i.quantity } },
    })),
    prisma.order.update({ where: { id: order.id }, data: { warehouseId: chosen.id } }),
  ]);
  return chosen.id;
}

/** Move an order to another branch, returning its units to the old branch. */
export async function reassignWarehouse(orderId: string, storeId: string, warehouseId: string): Promise<void> {
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId }, include: { items: true } });
  const target = await prisma.warehouse.findFirst({ where: { id: warehouseId, storeId } });
  if (!order || !target) throw Object.assign(new Error('الطلب أو الفرع غير موجود'), { status: 404 });
  if (order.warehouseId === target.id) return;
  const ops = [];
  for (const i of order.items) {
    if (order.warehouseId) {
      ops.push(prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: i.productId } },
        create: { warehouseId: order.warehouseId, productId: i.productId, quantity: i.quantity },
        update: { quantity: { increment: i.quantity } },
      }));
    }
    ops.push(prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: target.id, productId: i.productId } },
      create: { warehouseId: target.id, productId: i.productId, quantity: -i.quantity },
      update: { quantity: { decrement: i.quantity } },
    }));
  }
  await prisma.$transaction([...ops, prisma.order.update({ where: { id: order.id }, data: { warehouseId: target.id } })]);
}

/**
 * Put an order's units back (customer rejected it, or the courier returned it).
 * Idempotent per order: callers only invoke it on the transition into CANCELLED.
 */
export async function restockOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status === 'DRAFT') return;
  const ops = [];
  for (const i of order.items) {
    if (i.variantId) {
      ops.push(prisma.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } }));
    } else {
      ops.push(prisma.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } }));
    }
    if (order.warehouseId) {
      ops.push(prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: i.productId } },
        create: { warehouseId: order.warehouseId, productId: i.productId, quantity: i.quantity },
        update: { quantity: { increment: i.quantity } },
      }));
    }
  }
  if (ops.length) await prisma.$transaction(ops);
}
