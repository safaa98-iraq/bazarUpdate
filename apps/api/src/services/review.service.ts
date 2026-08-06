import prisma from '@storebuilder/database';
import { CreateProductReviewDto, ProductReviewPublic, PlanKey } from '@storebuilder/types';
import { AppError } from '../middleware/errorHandler';

function toPublic(r: { id: string; productId: string; customerName: string; rating: number; comment: string | null; createdAt: Date }): ProductReviewPublic {
  return {
    id: r.id, productId: r.productId, customerName: r.customerName,
    rating: r.rating, comment: r.comment, createdAt: r.createdAt.toISOString(),
  };
}

export class ReviewService {
  async list(productId: string): Promise<ProductReviewPublic[]> {
    const reviews = await prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reviews.map(toPublic);
  }

  async create(productId: string, dto: CreateProductReviewDto): Promise<ProductReviewPublic> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: { include: { merchant: { select: { plan: true } } } } },
    });
    if (!product) throw new AppError(404, 'المنتج غير موجود');

    const customerName = dto.customerName?.trim().slice(0, 100);
    if (!customerName) throw new AppError(400, 'الاسم مطلوب');

    const rating = Math.round(Number(dto.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'التقييم يجب أن يكون بين 1 و 5');
    }

    const plan = product.store.merchant.plan as PlanKey;
    const canComment = plan === 'ENTERPRISE';
    const comment = canComment && dto.comment?.trim() ? dto.comment.trim().slice(0, 2000) : null;

    const review = await prisma.productReview.create({
      data: { productId, customerName, rating, comment },
    });
    return toPublic(review);
  }
}

export const reviewService = new ReviewService();
