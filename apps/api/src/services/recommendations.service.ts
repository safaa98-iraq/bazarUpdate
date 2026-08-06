import prisma from '@storebuilder/database';
import { RecommendedProduct } from '@storebuilder/types';

export class RecommendationsService {
  async trackView(productId: string, sessionId: string, customerId?: string): Promise<void> {
    // Deduplicate: one view per session per product per hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const existing = await prisma.productView.findFirst({
      where: { productId, sessionId, createdAt: { gte: oneHourAgo } },
    });
    if (!existing) {
      await prisma.productView.create({
        data: { productId, sessionId, customerId: customerId ?? null },
      });
    }
  }

  async getRecommendations(
    storeId: string,
    sessionId: string,
    limit = 4
  ): Promise<RecommendedProduct[]> {
    // 1. Get product IDs already viewed in this session
    const sessionViews = await prisma.productView.findMany({
      where: { sessionId },
      select: { productId: true },
      distinct: ['productId'],
    });
    const viewedIds = sessionViews.map((v) => v.productId);

    // 2. Get categories of viewed products
    const viewedProducts = await prisma.product.findMany({
      where: { id: { in: viewedIds }, storeId, isActive: true },
      select: { categoryId: true },
    });
    const categoryIds = [
      ...new Set(viewedProducts.map((p) => p.categoryId).filter(Boolean)),
    ] as string[];

    // 3. Find popular products in same categories (or store-wide if no category match)
    const viewCountRaw = await prisma.productView.groupBy({
      by: ['productId'],
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit * 3,
    });

    const candidateIds = viewCountRaw
      .map((v) => v.productId)
      .filter((id) => !viewedIds.includes(id));

    // 4. Fetch candidate products, prefer same category
    const candidates = await prisma.product.findMany({
      where: {
        id: { in: candidateIds },
        storeId,
        isActive: true,
      },
      take: limit,
      orderBy: [
        // Prefer same-category products
        ...(categoryIds.length > 0 ? [] : []),
        { createdAt: 'desc' },
      ],
    });

    // Sort: same-category products first
    const sorted = [
      ...candidates.filter((p) => p.categoryId && categoryIds.includes(p.categoryId)),
      ...candidates.filter((p) => !p.categoryId || !categoryIds.includes(p.categoryId)),
    ].slice(0, limit);

    // If we still don't have enough, fall back to popular products from the store
    if (sorted.length < limit) {
      const fallback = await prisma.product.findMany({
        where: {
          storeId,
          isActive: true,
          id: { notIn: [...viewedIds, ...sorted.map((p) => p.id)] },
        },
        take: limit - sorted.length,
        orderBy: { createdAt: 'desc' },
      });
      sorted.push(...fallback);
    }

    const viewCountMap = new Map(viewCountRaw.map((v) => [v.productId, v._count.productId]));

    return sorted.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      images: p.images as string[],
      categoryId: p.categoryId,
      viewCount: viewCountMap.get(p.id) ?? 0,
    }));
  }
}

export const recommendationsService = new RecommendationsService();
