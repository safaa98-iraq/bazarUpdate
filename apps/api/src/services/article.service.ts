import prisma from '@storebuilder/database';
import { AppError } from '../middleware/errorHandler';
import { ArticlePublic, UpsertArticleDto } from '@storebuilder/types';

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'article';
}

function toPublic(a: {
  id: string; title: string; slug: string; excerpt: string | null; content: string;
  coverImage: string | null; category: string | null; seoTitle: string | null; seoDescription: string | null;
  isPublished: boolean; publishedAt: Date | null; createdAt: Date;
  author?: { name: string };
}): ArticlePublic {
  return {
    id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, content: a.content,
    coverImage: a.coverImage, category: a.category, seoTitle: a.seoTitle, seoDescription: a.seoDescription,
    isPublished: a.isPublished, publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(), author: a.author,
  };
}

export class ArticleService {
  async listPublished(opts: { category?: string; page?: number; limit?: number }): Promise<{ items: ArticlePublic[]; total: number }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 12;
    const where = { isPublished: true, ...(opts.category ? { category: opts.category } : {}) };
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { author: { select: { name: true } } },
      }),
      prisma.article.count({ where }),
    ]);
    return { items: items.map(toPublic), total };
  }

  async getBySlug(slug: string, publishedOnly = true): Promise<ArticlePublic> {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    });
    if (!article || (publishedOnly && !article.isPublished)) throw new AppError(404, 'المقال غير موجود');
    return toPublic(article);
  }

  async listAll(): Promise<ArticlePublic[]> {
    const items = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    });
    return items.map(toPublic);
  }

  async getById(id: string): Promise<ArticlePublic> {
    const article = await prisma.article.findUnique({ where: { id }, include: { author: { select: { name: true } } } });
    if (!article) throw new AppError(404, 'المقال غير موجود');
    return toPublic(article);
  }

  async create(authorId: string, dto: UpsertArticleDto): Promise<ArticlePublic> {
    if (!dto.title?.trim()) throw new AppError(400, 'العنوان مطلوب');
    if (!dto.content?.trim()) throw new AppError(400, 'المحتوى مطلوب');

    let slug = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.title);
    let attempt = 0;
    while (await prisma.article.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${slugify(dto.slug?.trim() || dto.title)}-${attempt + 1}`;
      if (attempt > 20) throw new AppError(500, 'تعذر إنشاء المقال');
    }

    const isPublished = dto.isPublished ?? false;
    const article = await prisma.article.create({
      data: {
        authorId, title: dto.title.trim(), slug,
        excerpt: dto.excerpt?.trim() || null,
        content: dto.content,
        coverImage: dto.coverImage || null,
        category: dto.category?.trim() || null,
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      include: { author: { select: { name: true } } },
    });
    return toPublic(article);
  }

  async update(id: string, dto: Partial<UpsertArticleDto>): Promise<ArticlePublic> {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'المقال غير موجود');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt.trim() || null;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage || null;
    if (dto.category !== undefined) data.category = dto.category.trim() || null;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle.trim() || null;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription.trim() || null;
    if (dto.isPublished !== undefined) {
      data.isPublished = dto.isPublished;
      if (dto.isPublished && !existing.publishedAt) data.publishedAt = new Date();
    }

    const updated = await prisma.article.update({
      where: { id }, data, include: { author: { select: { name: true } } },
    });
    return toPublic(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'المقال غير موجود');
    await prisma.article.delete({ where: { id } });
  }
}

export const articleService = new ArticleService();
