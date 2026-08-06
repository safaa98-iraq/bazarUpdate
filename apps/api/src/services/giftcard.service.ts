import prisma from '@storebuilder/database';
import { CreateGiftCardDto, GiftCardPublic } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 10; i++) {
    if (i === 4) code += '-';
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `GFT-${code}`;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode();
    const existing = await prisma.giftCard.findUnique({ where: { code: candidate } });
    if (!existing) return candidate;
  }
  throw new AppError(500, 'تعذر توليد كود بطاقة هدايا فريد');
}

function toPublic(g: {
  id: string; storeId: string; code: string;
  initialValue: { toNumber(): number }; remainingBalance: { toNumber(): number };
  isActive: boolean; expiresAt: Date | null;
  purchaserEmail: string | null; recipientEmail: string | null; note: string | null;
  createdAt: Date;
}): GiftCardPublic {
  return {
    id: g.id, storeId: g.storeId, code: g.code,
    initialValue: g.initialValue.toNumber(),
    remainingBalance: g.remainingBalance.toNumber(),
    isActive: g.isActive,
    expiresAt: g.expiresAt ? g.expiresAt.toISOString() : null,
    purchaserEmail: g.purchaserEmail, recipientEmail: g.recipientEmail, note: g.note,
    createdAt: g.createdAt.toISOString(),
  };
}

export class GiftCardService {
  async list(storeId: string): Promise<GiftCardPublic[]> {
    const cards = await prisma.giftCard.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
    return cards.map(toPublic);
  }

  async create(storeId: string, dto: CreateGiftCardDto): Promise<GiftCardPublic> {
    if (!dto.initialValue || dto.initialValue <= 0) throw new AppError(400, 'قيمة البطاقة يجب أن تكون أكبر من صفر');
    const code = await generateUniqueCode();
    const card = await prisma.giftCard.create({
      data: {
        storeId, code,
        initialValue: dto.initialValue,
        remainingBalance: dto.initialValue,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        purchaserEmail: dto.purchaserEmail ?? null,
        recipientEmail: dto.recipientEmail ?? null,
        note: dto.note ?? null,
      },
    });
    return toPublic(card);
  }

  async setActive(storeId: string, id: string, isActive: boolean): Promise<GiftCardPublic> {
    const existing = await prisma.giftCard.findFirst({ where: { id, storeId } });
    if (!existing) throw new AppError(404, 'بطاقة الهدايا غير موجودة');
    const card = await prisma.giftCard.update({ where: { id }, data: { isActive } });
    return toPublic(card);
  }

  async delete(storeId: string, id: string): Promise<void> {
    const existing = await prisma.giftCard.findFirst({ where: { id, storeId } });
    if (!existing) throw new AppError(404, 'بطاقة الهدايا غير موجودة');
    await prisma.giftCard.delete({ where: { id } });
  }

  /** Validate a code for a store and return its usable balance, without spending it. */
  async peek(storeId: string, code: string): Promise<GiftCardPublic> {
    const card = await prisma.giftCard.findFirst({ where: { storeId, code: code.toUpperCase().trim() } });
    if (!card) throw new AppError(404, 'كود بطاقة الهدايا غير صالح');
    if (!card.isActive) throw new AppError(400, 'بطاقة الهدايا غير مفعّلة');
    if (card.expiresAt && card.expiresAt < new Date()) throw new AppError(400, 'انتهت صلاحية بطاقة الهدايا');
    if (Number(card.remainingBalance) <= 0) throw new AppError(400, 'رصيد بطاقة الهدايا منتهٍ');
    return toPublic(card);
  }

  /** Spend up to `amount` from the card; returns the amount actually deducted. */
  async redeem(storeId: string, code: string, amount: number, orderId?: string): Promise<number> {
    const card = await prisma.giftCard.findFirst({ where: { storeId, code: code.toUpperCase().trim() } });
    if (!card) throw new AppError(404, 'كود بطاقة الهدايا غير صالح');
    if (!card.isActive) throw new AppError(400, 'بطاقة الهدايا غير مفعّلة');
    if (card.expiresAt && card.expiresAt < new Date()) throw new AppError(400, 'انتهت صلاحية بطاقة الهدايا');
    const balance = Number(card.remainingBalance);
    const deduct = Math.min(balance, amount);
    if (deduct <= 0) throw new AppError(400, 'رصيد بطاقة الهدايا منتهٍ');

    await prisma.$transaction([
      prisma.giftCard.update({ where: { id: card.id }, data: { remainingBalance: { decrement: deduct } } }),
      prisma.giftCardRedemption.create({ data: { giftCardId: card.id, orderId, amount: deduct } }),
    ]);
    return deduct;
  }
}

export const giftCardService = new GiftCardService();
