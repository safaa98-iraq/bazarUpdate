import prisma from '@storebuilder/database';
import { CreateBrandDto, BrandPublic, PLAN_CONFIGS, PlanKey } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'brand';
}

function toPublic(b: { id: string; storeId: string; name: string; slug: string; image: string | null; createdAt: Date; _count?: { products: number } }): BrandPublic {
  return {
    id: b.id, storeId: b.storeId, name: b.name, slug: b.slug,
    image: b.image, createdAt: b.createdAt.toISOString(),
    productCount: b._count?.products,
  };
}

export class BrandService {
  async list(storeId: string): Promise<BrandPublic[]> {
    const brands = await prisma.brand.findMany({
      where: { storeId },
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return brands.map(toPublic);
  }

  async create(storeId: string, dto: CreateBrandDto): Promise<BrandPublic> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { merchant: { select: { plan: true } } },
    });
    if (!store) throw new AppError(404, 'Store not found');

    const plan = store.merchant.plan as PlanKey;
    const maxBrands = PLAN_CONFIGS[plan].maxBrands;
    if (maxBrands === 0) {
      throw new AppError(403, 'الماركات التجارية متاحة في الخطط المدفوعة فقط. ارفع خطتك لإضافة ماركة.');
    }
    if (maxBrands > 0) {
      const count = await prisma.brand.count({ where: { storeId } });
      if (count >= maxBrands) {
        throw new AppError(403, `وصلت إلى الحد الأقصى للماركات التجارية في خطتك (${maxBrands}). ارفع خطتك لإضافة ماركات أكثر.`);
      }
    }

    if (!dto.name?.trim()) throw new AppError(400, 'اسم الماركة مطلوب');

    let slug = slugify(dto.name);
    let attempt = 0;
    while (await prisma.brand.findUnique({ where: { storeId_slug: { storeId, slug } } })) {
      attempt += 1;
      slug = `${slugify(dto.name)}-${attempt + 1}`;
      if (attempt > 20) throw new AppError(500, 'تعذر إنشاء الماركة');
    }

    const brand = await prisma.brand.create({
      data: { storeId, name: dto.name.trim(), slug, image: dto.image ?? null },
    });
    return toPublic(brand);
  }

  async update(storeId: string, brandId: string, dto: Partial<CreateBrandDto>): Promise<BrandPublic> {
    const brand = await prisma.brand.findFirst({ where: { id: brandId, storeId } });
    if (!brand) throw new AppError(404, 'الماركة غير موجودة');

    const updated = await prisma.brand.update({
      where: { id: brandId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.image !== undefined ? { image: dto.image } : {}),
      },
    });
    return toPublic(updated);
  }

  async delete(storeId: string, brandId: string): Promise<void> {
    const brand = await prisma.brand.findFirst({ where: { id: brandId, storeId } });
    if (!brand) throw new AppError(404, 'الماركة غير موجودة');
    await prisma.brand.delete({ where: { id: brandId } });
  }
}

export const brandService = new BrandService();
