import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';
import { cuid } from '../lib/cuid';
import { AppError } from '../middleware/errorHandler';
import { notifyNewChatMessage } from '../lib/notify';

const router = Router();
const merchant = [verifyToken, requireRole('MERCHANT'), requireChatPlan];

async function getMerchantStore(merchantId: string) {
  const store = await prisma.store.findUnique({ where: { merchantId } });
  if (!store) throw { status: 404, message: 'Store not found' };
  return store;
}

async function requireChatPlan(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { plan: true } });
    if (user?.plan === 'FREE') {
      throw new AppError(403, 'المحادثات مع العملاء متاحة في الخطط المدفوعة فقط. ارفع خطتك لتفعيل هذه الميزة.');
    }
    next();
  } catch (e) { next(e); }
}

// ── Conversations ──────────────────────────────────────────────────────────────

router.get('/conversations', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const convs = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT c.*,
        (SELECT COUNT(*) FROM ChatMessage m WHERE m.conversationId = c.id AND m.isRead = 0 AND m.senderType = 'customer') as unreadCount
      FROM Conversation c
      WHERE c.storeId = ${store.id}
      ORDER BY c.updatedAt DESC
      LIMIT 50
    `;
    // MySQL COUNT(*) comes back as a BigInt via $queryRaw, which JSON.stringify can't serialize
    const data = convs.map(c => ({ ...c, unreadCount: Number(c.unreadCount) }));
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.patch('/conversations/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    await prisma.$executeRaw`UPDATE Conversation SET status=${req.body.status}, updatedAt=NOW(3) WHERE id=${req.params.id} AND storeId=${store.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get('/conversations/:id/messages', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const msgs = await prisma.$queryRaw`
      SELECT * FROM ChatMessage WHERE conversationId=${req.params.id} ORDER BY createdAt ASC LIMIT 100
    `;
    // Mark as read
    await prisma.$executeRaw`UPDATE ChatMessage SET isRead=1 WHERE conversationId=${req.params.id} AND senderType='customer'`;
    res.json({ success: true, data: msgs });
  } catch (e) { next(e); }
});

router.post('/conversations/:id/messages', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body: msgBody, senderName } = req.body;
    const id = cuid();
    await prisma.$executeRaw`
      INSERT INTO ChatMessage (id, conversationId, senderType, senderName, body, isRead, createdAt)
      VALUES (${id}, ${req.params.id}, 'agent', ${senderName ?? 'الدعم'}, ${msgBody}, 1, NOW(3))
    `;
    await prisma.$executeRaw`
      UPDATE Conversation SET lastMessage=${msgBody}, lastMessageAt=NOW(3), updatedAt=NOW(3) WHERE id=${req.params.id}
    `;
    res.json({ success: true, data: { id, body: msgBody, senderType: 'agent' } });
  } catch (e) { next(e); }
});

// ── Quick Replies ─────────────────────────────────────────────────────────────

router.get('/quick-replies', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const replies = await prisma.$queryRaw`SELECT * FROM QuickReply WHERE storeId=${store.id} ORDER BY createdAt DESC`;
    res.json({ success: true, data: replies });
  } catch (e) { next(e); }
});

router.post('/quick-replies', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getMerchantStore(req.user!.userId);
    const id = cuid();
    await prisma.$executeRaw`INSERT INTO QuickReply (id, storeId, title, body, createdAt) VALUES (${id}, ${store.id}, ${req.body.title}, ${req.body.body}, NOW(3))`;
    res.json({ success: true, data: { id, title: req.body.title, body: req.body.body } });
  } catch (e) { next(e); }
});

router.delete('/quick-replies/:id', ...merchant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$executeRaw`DELETE FROM QuickReply WHERE id=${req.params.id}`;
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Public: customer sends message ────────────────────────────────────────────

router.post('/public/:storeSlug/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await prisma.store.findUnique({ where: { slug: req.params.storeSlug } });
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }

    const { customerName, customerEmail, body: msgBody, conversationId } = req.body;
    let convId = conversationId;

    if (!convId) {
      convId = cuid();
      await prisma.$executeRaw`
        INSERT INTO Conversation (id, storeId, customerName, customerEmail, status, lastMessage, lastMessageAt, createdAt, updatedAt)
        VALUES (${convId}, ${store.id}, ${customerName ?? 'زائر'}, ${customerEmail ?? null}, 'open', ${msgBody}, NOW(3), NOW(3), NOW(3))
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE Conversation SET lastMessage=${msgBody}, lastMessageAt=NOW(3), updatedAt=NOW(3) WHERE id=${convId}
      `;
    }

    const msgId = cuid();
    await prisma.$executeRaw`
      INSERT INTO ChatMessage (id, conversationId, senderType, senderName, body, isRead, createdAt)
      VALUES (${msgId}, ${convId}, 'customer', ${customerName ?? 'زائر'}, ${msgBody}, 0, NOW(3))
    `;

    notifyNewChatMessage(store.id, convId, customerName ?? 'زائر', msgBody).catch(() => null);

    res.json({ success: true, data: { conversationId: convId, messageId: msgId } });
  } catch (e) { next(e); }
});

router.get('/public/:storeSlug/conversation/:convId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const msgs = await prisma.$queryRaw`
      SELECT * FROM ChatMessage WHERE conversationId=${req.params.convId} ORDER BY createdAt ASC
    `;
    res.json({ success: true, data: msgs });
  } catch (e) { next(e); }
});

export default router;
