import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Newspaper } from 'lucide-react';
import type { ArticlePublic } from '@storebuilder/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const C = { bg: '#FBF9F2', dark: '#2F2E4B', accent: '#DB6E93', text2: '#6B6A83', border: '#DCE6F0' };

async function getArticle(slug: string): Promise<ArticlePublic | null> {
  try {
    const res = await fetch(`${API_URL}/api/articles/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return {};
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt || undefined,
    openGraph: article.coverImage ? { images: [article.coverImage] } : undefined,
  };
}

export default async function BlogArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Tajawal', sans-serif" }} dir="rtl">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 28px 80px' }}>
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition" style={{ color: C.accent }}>
          <ArrowLeft size={16} /> كل المقالات
        </Link>

        {article.category && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ background: '#FBE1EA', color: C.accent }}>
            <Newspaper size={12} /> {article.category}
          </span>
        )}

        <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: C.dark, lineHeight: 1.3, margin: '0 0 12px' }}>
          {article.title}
        </h1>

        <div className="flex items-center gap-3 text-sm mb-8" style={{ color: C.text2 }}>
          {article.author?.name && <span>{article.author.name}</span>}
          {date && <><span>·</span><span>{date}</span></>}
        </div>

        {article.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#F5EFFA' }}>
            <Image src={article.coverImage} alt={article.title} width={760} height={420} className="w-full h-auto object-cover" priority />
          </div>
        )}

        <div className="prose prose-lg max-w-none" style={{ color: C.dark }} dangerouslySetInnerHTML={{ __html: article.content }} />

        <div className="mt-14 pt-8 border-t text-center" style={{ borderColor: C.border }}>
          <Link href="/register" className="inline-block px-8 py-3 font-bold text-white rounded-2xl transition hover:opacity-90" style={{ background: C.dark }}>
            ابدأ متجرك الآن مجاناً
          </Link>
        </div>
      </div>
    </div>
  );
}
