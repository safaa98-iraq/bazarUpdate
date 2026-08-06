import prisma from '@storebuilder/database';
import { CreateProductDto, UpdateProductDto, ProductPublic, ProductSpecPublic, ProductSpecValuePublic } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

const MODEL_NUMBER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

function randomModelNumber(): string {
  let code = '';
  for (let i = 0; i < 7; i++) code += MODEL_NUMBER_CHARS[Math.floor(Math.random() * MODEL_NUMBER_CHARS.length)];
  return `MDL-${code}`;
}

async function generateUniqueModelNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomModelNumber();
    const existing = await prisma.product.findUnique({ where: { modelNumber: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new AppError(500, 'تعذر توليد رقم موديل فريد، حاول مرة أخرى');
}

const NEW_PRODUCT_DAYS = 14;
const BEST_SELLER_LIMIT = 8;

async function getBestSellerIds(storeId: string): Promise<Set<string>> {
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { storeId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: BEST_SELLER_LIMIT,
  });
  return new Set(rows.map(r => r.productId));
}

// Batch version — one query for many products' rating averages
export async function getRatingsMapForProducts(productIds: string[]): Promise<Record<string, { avgRating: number; reviewCount: number }>> {
  if (productIds.length === 0) return {};
  const rows = await prisma.productReview.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const map: Record<string, { avgRating: number; reviewCount: number }> = {};
  for (const r of rows) {
    map[r.productId] = { avgRating: Math.round((r._avg.rating ?? 0) * 10) / 10, reviewCount: r._count.rating };
  }
  return map;
}

export function parseSpecValues(raw: string): ProductSpecValuePublic[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [{ value: String(parsed) }];
    return parsed.map((item) =>
      typeof item === 'string' ? { value: item } : { value: String(item.value), image: item.image }
    );
  } catch {
    return [{ value: raw }];
  }
}

async function getProductSpecs(productId: string): Promise<ProductSpecPublic[]> {
  const rows = await prisma.productAttributeValue.findMany({
    where: { productId },
    include: { attribute: true },
  });
  return rows.map((r) => ({ name: r.attribute.name, values: parseSpecValues(r.value) }));
}

// Batch version — one query for many products, used when listing order items
export async function getSpecsMapForProducts(productIds: string[]): Promise<Record<string, ProductSpecPublic[]>> {
  if (productIds.length === 0) return {};
  const rows = await prisma.productAttributeValue.findMany({
    where: { productId: { in: productIds } },
    include: { attribute: true },
  });
  const map: Record<string, ProductSpecPublic[]> = {};
  for (const r of rows) {
    (map[r.productId] ??= []).push({ name: r.attribute.name, values: parseSpecValues(r.value) });
  }
  return map;
}

const UNIT_LABELS: Record<string, string> = {
  piece: 'قطعة', pack: 'حزمة', box: 'صندوق', set: 'طقم', pair: 'زوج',
  ml: 'مل', g: 'غرام', kg: 'كيلو', liter: 'لتر', tray: 'صينية',
  key: 'مفتاح', card: 'بطاقة', license: 'ترخيص',
  unit: 'وحدة', bottle: 'زجاجة', meter: 'متر',
};

type RawProduct = {
  id: string; storeId: string; name: string; description: string | null;
  price: Decimal; comparePrice: Decimal | null; images: unknown;
  stock: number; categoryId: string | null; brandId?: string | null; modelNumber?: string | null; isActive: boolean;
  seoTitle?: string | null; seoDescription?: string | null; seoSlug?: string | null;
  unitType?: string; unitLabel?: string;
  hasVariants?: boolean; saleEndsAt?: Date | null; sizeGuide?: string | null;
  createdAt: Date;
  category?: { id: string; storeId: string; name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string; image: string | null } | null;
};

function toPublic(
  p: RawProduct,
  ratings?: { avgRating: number; reviewCount: number },
  bestSellerIds?: Set<string>
): ProductPublic {
  return {
    id: p.id, storeId: p.storeId, name: p.name,
    description: p.description,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    images: (p.images as string[]) ?? [],
    stock: p.stock, categoryId: p.categoryId, isActive: p.isActive,
    brandId: p.brandId ?? null,
    modelNumber: p.modelNumber ?? null,
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    seoSlug: p.seoSlug ?? null,
    unit: p.unitType ?? 'piece',
    unitLabel: p.unitLabel ?? 'قطعة',
    hasVariants: p.hasVariants ?? false,
    saleEndsAt: p.saleEndsAt ? p.saleEndsAt.toISOString() : null,
    sizeGuide: p.sizeGuide ?? null,
    createdAt: p.createdAt.toISOString(),
    category: p.category ?? null,
    brand: p.brand ?? null,
    avgRating: ratings?.avgRating,
    reviewCount: ratings?.reviewCount,
    isNew: (Date.now() - p.createdAt.getTime()) < NEW_PRODUCT_DAYS * 86400000,
    isBestSeller: bestSellerIds?.has(p.id) ?? false,
  };
}

// Strip unit-related fields before passing to Prisma, return them separately
function separateUnitFields(dto: Record<string, unknown>): {
  prismaData: Record<string, unknown>;
  unitType: string | undefined;
  unitLabel: string | undefined;
} {
  const { unit, unitType: ut, unitLabel: ul, ...prismaData } = dto as Record<string, unknown>;
  let unitType = ut as string | undefined;
  if (!unitType && unit && typeof unit === 'string') {
    unitType = unit;
  }
  const unitLabel = (ul as string | undefined) ?? (unitType ? UNIT_LABELS[unitType] ?? unitType : undefined);
  return { prismaData, unitType, unitLabel };
}

export class ProductService {
  async create(storeId: string, dto: CreateProductDto): Promise<ProductPublic> {
    const { prismaData, unitType, unitLabel } = separateUnitFields(dto as unknown as Record<string, unknown>);
    const modelNumber = await generateUniqueModelNumber();

    const product = await prisma.product.create({
      data: {
        ...(prismaData as Omit<CreateProductDto, 'unit' | 'unitType' | 'unitLabel'>),
        storeId,
        price: (dto as CreateProductDto).price,
        comparePrice: (dto as CreateProductDto).comparePrice ?? null,
        modelNumber,
      },
      include: { category: true, brand: true },
    });

    // Save unit via raw SQL (columns exist in DB but not in current Prisma client)
    if (unitType) {
      await prisma.$executeRaw`
        UPDATE Product SET unitType=${unitType}, unitLabel=${unitLabel ?? 'قطعة'}, updatedAt=NOW(3) WHERE id=${product.id}
      `;
    }

    return toPublic({ ...product, unitType: unitType ?? 'piece', unitLabel: unitLabel ?? 'قطعة' } as RawProduct);
  }

  async list(
    storeId: string,
    opts: { activeOnly?: boolean; categoryId?: string; search?: string; page?: number; limit?: number }
  ): Promise<{ items: ProductPublic[]; total: number }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      storeId,
      ...(opts.activeOnly ? { isActive: true } : {}),
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.search
        ? { OR: [
            { name: { contains: opts.search, mode: 'insensitive' as const } },
            { modelNumber: { contains: opts.search, mode: 'insensitive' as const } },
          ] }
        : {}),
    };

    const [items, total, unitRows, bestSellerIds] = await Promise.all([
      prisma.product.findMany({ where, include: { category: true, brand: true }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.product.count({ where }),
      prisma.$queryRaw<{ id: string; unitType: string; unitLabel: string }[]>`
        SELECT id, unitType, unitLabel FROM Product WHERE storeId=${storeId}
      `,
      getBestSellerIds(storeId),
    ]);

    const unitMap = Object.fromEntries(unitRows.map(r => [r.id, r]));
    const ratingsMap = await getRatingsMapForProducts(items.map(p => p.id));

    return {
      items: items.map(p => toPublic({ ...p, ...unitMap[p.id] } as RawProduct, ratingsMap[p.id], bestSellerIds)),
      total,
    };
  }

  async getById(id: string, storeId?: string): Promise<ProductPublic> {
    const product = await prisma.product.findFirst({
      where: { id, ...(storeId ? { storeId } : {}) },
      include: { category: true, brand: true },
    });
    if (!product) throw new AppError(404, 'Product not found');

    const [unitRow] = await prisma.$queryRaw<{ unitType: string; unitLabel: string }[]>`
      SELECT unitType, unitLabel FROM Product WHERE id=${id}
    `;

    const [specs, ratingsMap, bestSellerIds, variants] = await Promise.all([
      getProductSpecs(id),
      getRatingsMapForProducts([id]),
      getBestSellerIds(product.storeId),
      prisma.productVariant.findMany({ where: { productId: id }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
      ...toPublic({ ...product, ...unitRow } as RawProduct, ratingsMap[id], bestSellerIds),
      specs,
      variants: variants.map(v => ({
        id: v.id, productId: v.productId,
        options: v.options as Record<string, string>,
        sku: v.sku, price: v.price ? Number(v.price) : null,
        stock: v.stock, imageUrl: v.imageUrl, isActive: v.isActive,
      })),
    };
  }

  async update(id: string, storeId: string, dto: UpdateProductDto): Promise<ProductPublic> {
    const existing = await prisma.product.findFirst({ where: { id, storeId } });
    if (!existing) throw new AppError(404, 'Product not found');

    const { prismaData, unitType, unitLabel } = separateUnitFields(dto as unknown as Record<string, unknown>);

    const updated = await prisma.product.update({
      where: { id },
      data: prismaData as UpdateProductDto,
      include: { category: true, brand: true },
    });

    if (unitType) {
      await prisma.$executeRaw`
        UPDATE Product SET unitType=${unitType}, unitLabel=${unitLabel ?? 'قطعة'}, updatedAt=NOW(3) WHERE id=${id}
      `;
    }

    const [unitRow] = await prisma.$queryRaw<{ unitType: string; unitLabel: string }[]>`
      SELECT unitType, unitLabel FROM Product WHERE id=${id}
    `;

    return toPublic({ ...updated, ...unitRow } as RawProduct);
  }

  async delete(id: string, storeId: string): Promise<void> {
    const product = await prisma.product.findFirst({ where: { id, storeId } });
    if (!product) throw new AppError(404, 'Product not found');
    await prisma.product.delete({ where: { id } });
  }
}

export const productService = new ProductService();
