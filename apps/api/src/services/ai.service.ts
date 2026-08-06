import OpenAI from 'openai';
import crypto from 'crypto';
import prisma from '@storebuilder/database';
import { cacheGet, cacheSet, cacheIncr } from '../lib/redis';
import { AppError } from '../middleware/errorHandler';

// GPT-4o pricing: $5 / 1M input tokens, $15 / 1M output tokens (approx)
const COST_PER_TOKEN = 0.000010; // $10 / 1M tokens blended estimate

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

function hashInput(input: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

function todayKey(merchantId: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `ai:rate:${merchantId}:${d}`;
}

export interface DescriptionResult {
  description: string;
  seoTitle: string;
  seoDescription: string;
}

export interface PriceResult {
  suggestedPrice: number;
  reasoning: string;
  priceRange: { min: number; max: number };
}

export interface SeoResult {
  seoTitle: string;
  seoDescription: string;
  seoSlug: string;
}

export class AIService {
  private async checkAndIncrementRate(merchantId: string): Promise<{ used: number; limit: number }> {
    const merchant = await prisma.user.findUnique({
      where: { id: merchantId },
      select: { aiRequestLimit: true },
    });
    const limit = merchant?.aiRequestLimit ?? 50;

    const key = todayKey(merchantId);
    const used = await cacheIncr(key, 86400);

    if (used > limit) {
      throw new AppError(429, `Daily AI limit reached (${limit} requests/day). Try again tomorrow.`);
    }

    return { used, limit };
  }

  private async logUsage(merchantId: string, feature: string, tokensUsed: number, inputHash?: string) {
    const cost = tokensUsed * COST_PER_TOKEN;
    await prisma.aIUsageLog.create({
      data: { merchantId, feature, tokensUsed, cost, inputHash },
    });
  }

  private async callGPT(
    prompt: string,
    systemPrompt?: string
  ): Promise<{ content: string; tokensUsed: number }> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
      max_tokens: 512,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const tokensUsed = response.usage?.total_tokens ?? 0;
    return { content, tokensUsed };
  }

  // ─── Feature 1: Generate Product Description ─────────────────────────────

  async generateDescription(
    merchantId: string,
    input: { productName: string; category: string; keyFeatures: string[] }
  ): Promise<DescriptionResult> {
    const inputHash = hashInput(input);
    const cacheKey = `ai:desc:${inputHash}`;

    // Check cache first
    const cached = await cacheGet<DescriptionResult>(cacheKey);
    if (cached) return cached;

    await this.checkAndIncrementRate(merchantId);

    const prompt = `اكتب وصفاً تسويقياً جذاباً باللغة العربية لمنتج في متجر إلكتروني.
اسم المنتج: ${input.productName}
الفئة: ${input.category}
المميزات: ${input.keyFeatures.join(', ')}

المطلوب (أجب بصيغة JSON فقط):
{
  "description": "وصف تسويقي مقنع لا يزيد عن 150 كلمة يركز على الفوائد وليس المواصفات",
  "seoTitle": "عنوان SEO لا يزيد عن 60 حرفاً",
  "seoDescription": "وصف meta لا يزيد عن 160 حرفاً"
}`;

    let result: DescriptionResult;
    try {
      const { content, tokensUsed } = await this.callGPT(prompt);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');
      result = JSON.parse(jsonMatch[0]) as DescriptionResult;
      await this.logUsage(merchantId, 'generate-description', tokensUsed, inputHash);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, `AI service error: ${(err as Error).message}`);
    }

    await cacheSet(cacheKey, result, 86400);
    return result;
  }

  // ─── Feature 2: Suggest Price ─────────────────────────────────────────────

  async suggestPrice(
    merchantId: string,
    input: { productName: string; category: string; competitorPrices: number[] }
  ): Promise<PriceResult> {
    const inputHash = hashInput(input);
    const cacheKey = `ai:price:${inputHash}`;

    const cached = await cacheGet<PriceResult>(cacheKey);
    if (cached) return cached;

    await this.checkAndIncrementRate(merchantId);

    const avgPrice = input.competitorPrices.length
      ? input.competitorPrices.reduce((a, b) => a + b, 0) / input.competitorPrices.length
      : 0;

    const prompt = `أنت خبير تسعير في التجارة الإلكترونية.
المنتج: ${input.productName}
الفئة: ${input.category}
أسعار المنافسين: ${input.competitorPrices.length ? input.competitorPrices.join(', ') + ' ريال' : 'غير متوفرة'}
متوسط السوق: ${avgPrice > 0 ? avgPrice.toFixed(2) + ' ريال' : 'غير متوفر'}

اقترح سعراً تنافسياً مع تبرير. أجب بصيغة JSON فقط:
{
  "suggestedPrice": <number>,
  "reasoning": "<تفسير قصير بالعربية>",
  "priceRange": { "min": <number>, "max": <number> }
}`;

    let result: PriceResult;
    try {
      const { content, tokensUsed } = await this.callGPT(prompt);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');
      result = JSON.parse(jsonMatch[0]) as PriceResult;
      await this.logUsage(merchantId, 'suggest-price', tokensUsed, inputHash);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, `AI service error: ${(err as Error).message}`);
    }

    await cacheSet(cacheKey, result, 86400);
    return result;
  }

  // ─── Feature 3: Auto-generate SEO for product ─────────────────────────────

  async generateSEO(
    merchantId: string,
    product: { name: string; description?: string | null; category?: string | null }
  ): Promise<SeoResult> {
    const inputHash = hashInput(product);
    const cacheKey = `ai:seo:${inputHash}`;

    const cached = await cacheGet<SeoResult>(cacheKey);
    if (cached) return cached;

    await this.checkAndIncrementRate(merchantId);

    const prompt = `أنت خبير SEO للتجارة الإلكترونية العربية.
اسم المنتج: ${product.name}
الوصف: ${product.description ?? 'غير متوفر'}
الفئة: ${product.category ?? 'عام'}

أنشئ بيانات SEO باللغة العربية. أجب بصيغة JSON فقط:
{
  "seoTitle": "<عنوان SEO لا يزيد عن 60 حرفاً>",
  "seoDescription": "<وصف meta لا يزيد عن 160 حرفاً>",
  "seoSlug": "<slug بالحروف الإنجليزية الصغيرة والشرطات فقط>"
}`;

    let result: SeoResult;
    try {
      const { content, tokensUsed } = await this.callGPT(prompt);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');
      result = JSON.parse(jsonMatch[0]) as SeoResult;
      await this.logUsage(merchantId, 'generate-seo', tokensUsed, inputHash);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, `AI service error: ${(err as Error).message}`);
    }

    await cacheSet(cacheKey, result, 86400);
    return result;
  }

  // ─── Credits / Rate info ──────────────────────────────────────────────────

  async getCredits(merchantId: string): Promise<{ used: number; limit: number; remaining: number }> {
    const merchant = await prisma.user.findUnique({
      where: { id: merchantId },
      select: { aiRequestLimit: true },
    });
    const limit = merchant?.aiRequestLimit ?? 50;

    const key = todayKey(merchantId);
    let used = 0;
    try {
      const val = await getRedis().get(key);
      used = val ? parseInt(val, 10) : 0;
    } catch {
      // fallback: count from DB today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      used = await prisma.aIUsageLog.count({
        where: { merchantId, createdAt: { gte: today } },
      });
    }

    return { used, limit, remaining: Math.max(0, limit - used) };
  }
}

import { getRedis } from '../lib/redis';
export const aiService = new AIService();
