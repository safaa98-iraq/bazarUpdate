import prisma from '@storebuilder/database';
import { CreateStoreDto, UpdateStoreDto, StorePublic, StoreSocialLinks, StoreDeliveryZone, IRAQI_GOVERNORATES, FREE_PLAN_BUILDER_EDIT_LIMIT } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';
import type { Prisma } from '@prisma/client';

const SOCIAL_TEXT_FIELDS = ['instagram', 'whatsapp', 'facebook', 'tiktok', 'snapchat'] as const;
const VALID_GOVERNORATES = new Set<string>(IRAQI_GOVERNORATES);
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function sanitizeSocialLinks(input: unknown): StoreSocialLinks {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const clean: StoreSocialLinks = {};

  for (const field of SOCIAL_TEXT_FIELDS) {
    const value = raw[field];
    if (typeof value !== 'string') continue;
    let trimmed = value.trim();
    if (field !== 'facebook') trimmed = trimmed.replace(/^@/, '');
    if (field === 'whatsapp') trimmed = trimmed.replace(/[^\d+]/g, '');
    if (!trimmed) continue;
    clean[field] = trimmed.slice(0, 200);
  }

  if (Array.isArray(raw.deliveryPartners)) {
    const partners = raw.deliveryPartners
      .filter((p): p is string => typeof p === 'string')
      .map(p => p.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map(p => p.slice(0, 50));
    if (partners.length) clean.deliveryPartners = partners;
  }

  return clean;
}

function sanitizeDeliveryZones(input: unknown): StoreDeliveryZone[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const clean: StoreDeliveryZone[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const { governorate, price } = entry as Record<string, unknown>;
    if (typeof governorate !== 'string' || !VALID_GOVERNORATES.has(governorate)) continue;
    if (seen.has(governorate)) continue;
    const numericPrice = typeof price === 'number' ? price : Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 1_000_000) continue;
    seen.add(governorate);
    clean.push({ governorate, price: Math.round(numericPrice) });
  }

  return clean;
}

function toPublic(store: {
  id: string; name: string; slug: string;
  description: string | null; logo: string | null;
  theme: string; template: string;
  isActive: boolean; isPublished: boolean;
  builderConfig?: string | null;
  storeType?: string; currency?: string;
  socialLinks?: Prisma.JsonValue;
  deliveryZones?: Prisma.JsonValue;
  builderEditCount?: number;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  defaultSizeGuide?: string | null;
  createdAt: Date;
  merchant?: { id: string; name: string; email: string; plan: string } | null;
}): StorePublic {
  return {
    id: store.id, name: store.name, slug: store.slug,
    description: store.description, logo: store.logo,
    theme: store.theme, template: store.template,
    isActive: store.isActive, isPublished: store.isPublished,
    builderConfig: store.builderConfig,
    storeType: store.storeType ?? 'fashion',
    currency: store.currency ?? 'IQD',
    socialLinks: sanitizeSocialLinks(store.socialLinks),
    deliveryZones: sanitizeDeliveryZones(store.deliveryZones),
    builderEditCount: store.builderEditCount ?? 0,
    customDomain: store.customDomain ?? null,
    customDomainVerified: store.customDomainVerified ?? false,
    defaultSizeGuide: store.defaultSizeGuide ?? null,
    createdAt: store.createdAt.toISOString(),
    merchant: store.merchant ?? undefined,
  };
}

const merchantInclude = { merchant: { select: { id: true, name: true, email: true, plan: true } } };

export class StoreService {
  async create(merchantId: string, dto: CreateStoreDto): Promise<StorePublic> {
    const existing = await prisma.store.findUnique({ where: { merchantId } });
    if (existing) throw new AppError(409, 'You already have a store');

    const slugTaken = await prisma.store.findUnique({ where: { slug: dto.slug } });
    if (slugTaken) throw new AppError(409, 'This URL slug is already taken');

    const store = await prisma.store.create({
      data: { ...dto, merchantId },
      include: merchantInclude,
    });
    return toPublic(store);
  }

  async getByMerchant(merchantId: string): Promise<StorePublic | null> {
    const store = await prisma.store.findUnique({
      where: { merchantId },
      include: merchantInclude,
    });
    return store ? toPublic(store) : null;
  }

  async update(merchantId: string, dto: UpdateStoreDto): Promise<StorePublic> {
    const store = await prisma.store.findUnique({
      where: { merchantId },
      include: { merchant: { select: { plan: true } } },
    });
    if (!store) throw new AppError(404, 'Store not found');

    const { socialLinks, deliveryZones, customDomain, ...rest } = dto;
    const data: Prisma.StoreUpdateInput = { ...rest };
    if (socialLinks !== undefined) {
      data.socialLinks = sanitizeSocialLinks(socialLinks) as Prisma.InputJsonValue;
    }
    if (deliveryZones !== undefined) {
      data.deliveryZones = sanitizeDeliveryZones(deliveryZones) as unknown as Prisma.InputJsonValue;
    }

    if (customDomain !== undefined) {
      if (store.merchant.plan !== 'ENTERPRISE') {
        throw new AppError(403, 'النطاق المخصص متاح في خطة الأعمال فقط. ارفع خطتك لتفعيل هذه الميزة.');
      }
      if (customDomain === null || customDomain === '') {
        data.customDomain = null;
        data.customDomainVerified = false;
      } else {
        const normalized = normalizeDomain(customDomain);
        if (!DOMAIN_PATTERN.test(normalized)) {
          throw new AppError(400, 'صيغة النطاق غير صحيحة. مثال: shop.mystore.com');
        }
        const taken = await prisma.store.findUnique({ where: { customDomain: normalized } });
        if (taken && taken.id !== store.id) {
          throw new AppError(409, 'هذا النطاق مستخدم بالفعل من قبل متجر آخر');
        }
        if (normalized !== store.customDomain) {
          data.customDomain = normalized;
          data.customDomainVerified = false;
        }
      }
    }

    if (dto.builderConfig !== undefined && store.merchant.plan === 'FREE') {
      if (store.builderEditCount >= FREE_PLAN_BUILDER_EDIT_LIMIT) {
        throw new AppError(403, `وصلت إلى الحد الأقصى لتعديل تصميم المتجر في الخطة المجانية (${FREE_PLAN_BUILDER_EDIT_LIMIT} مرات). ارفع خطتك للاستمرار بالتعديل.`);
      }
      data.builderEditCount = { increment: 1 };
    }

    const updated = await prisma.store.update({
      where: { merchantId },
      data,
      include: merchantInclude,
    });
    return toPublic(updated);
  }

  async verifyDomain(merchantId: string): Promise<StorePublic> {
    const store = await prisma.store.findUnique({
      where: { merchantId },
      include: { merchant: { select: { plan: true } } },
    });
    if (!store) throw new AppError(404, 'Store not found');
    if (store.merchant.plan !== 'ENTERPRISE') {
      throw new AppError(403, 'النطاق المخصص متاح في خطة الأعمال فقط.');
    }
    if (!store.customDomain) throw new AppError(400, 'لم تضف نطاقاً بعد');

    const dns = await import('node:dns/promises');
    const expected = `bazar-verify=${store.id}`;
    let verified = false;
    try {
      const records = await dns.resolveTxt(`_bazar-verify.${store.customDomain}`);
      verified = records.some(chunks => chunks.join('').trim() === expected);
    } catch {
      verified = false;
    }

    if (!verified) {
      throw new AppError(400, `لم يتم العثور على سجل التحقق. أضف سجل TXT باسم _bazar-verify.${store.customDomain} وقيمة ${expected} ثم حاول مجدداً (قد تستغرق التغييرات بعض الوقت للانتشار).`);
    }

    const updated = await prisma.store.update({
      where: { merchantId },
      data: { customDomainVerified: true },
      include: merchantInclude,
    });
    return toPublic(updated);
  }

  async getBySlug(slug: string): Promise<StorePublic | null> {
    const store = await prisma.store.findUnique({
      where: { slug },
      include: merchantInclude,
    });
    return store ? toPublic(store) : null;
  }

  async getSlugByVerifiedDomain(domain: string): Promise<string | null> {
    const store = await prisma.store.findFirst({
      where: { customDomain: normalizeDomain(domain), customDomainVerified: true, isActive: true },
      select: { slug: true },
    });
    return store?.slug ?? null;
  }

  async adminUpdate(storeId: string, dto: Partial<UpdateStoreDto>): Promise<StorePublic> {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new AppError(404, 'Store not found');

    const { socialLinks, deliveryZones, ...rest } = dto;
    const data: Prisma.StoreUpdateInput = { ...rest };
    if (socialLinks !== undefined) {
      data.socialLinks = sanitizeSocialLinks(socialLinks) as Prisma.InputJsonValue;
    }
    if (deliveryZones !== undefined) {
      data.deliveryZones = sanitizeDeliveryZones(deliveryZones) as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.store.update({
      where: { id: storeId },
      data,
      include: merchantInclude,
    });
    return toPublic(updated);
  }
}

export const storeService = new StoreService();
