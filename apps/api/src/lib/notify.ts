import prisma from '@storebuilder/database';

export async function notifyUser(userId: string, type: string, title: string, body: string, meta?: object) {
  await prisma.notification.create({
    data: { userId, type, title, body, meta: meta ?? {} },
  });
}

export async function notifyNewOrder(storeId: string, order: { id: string; customerName: string; total: number }) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { merchantId: true } });
  if (!store) return;
  await notifyUser(
    store.merchantId,
    'NEW_ORDER',
    'طلب جديد 🎉',
    `طلب جديد من ${order.customerName} بقيمة ${order.total.toFixed(2)}`,
    { orderId: order.id }
  );
}

export async function notifyNewChatMessage(storeId: string, conversationId: string, customerName: string, body: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { merchantId: true } });
  if (!store) return;
  await notifyUser(
    store.merchantId,
    'CHAT_MESSAGE',
    'رسالة جديدة 💬',
    `${customerName}: ${body.length > 80 ? body.slice(0, 80) + '…' : body}`,
    { conversationId }
  );
}
