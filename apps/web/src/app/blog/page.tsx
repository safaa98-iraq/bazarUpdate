'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Newspaper, ArrowLeft } from 'lucide-react';
import type { ArticlePublic } from '@storebuilder/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const C = { bg: '#FBF9F2', dark: '#2F2E4B', accent: '#DB6E93', text2: '#6B6A83', border: '#DCE6F0' };

export default function BlogListPage() {
  useDocumentTitle('المدونة');
  const [articles, setArticles] = useState<ArticlePublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: ArticlePublic[] }>('/api/articles?limit=30', { noAuth: true })
      .then(r => setArticles(r.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = articles;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Tajawal', sans-serif" }} dir="rtl">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 28px 0' }}>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition" style={{ color: C.accent }}>
          <ArrowLeft size={16} /> العودة للرئيسية
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Newspaper size={28} style={{ color: C.accent }} />
          <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 40px)', color: C.dark, margin: 0 }}>مدونة بازار</h1>
        </div>
        <p style={{ color: C.text2, fontSize: 16, marginBottom: 32 }}>نصائح ودلائل للتجارة الإلكترونية في العراق</p>
      </div>

      {loading ? (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px' }}>
          <div className="rounded-2xl animate-pulse mb-10" style={{ height: 340, background: '#ECE6F0' }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: '#ECE6F0' }} />)}
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px 64px', textAlign: 'center', color: C.text2 }}>لا توجد مقالات منشورة بعد</div>
      ) : (
        <>
          {/* Hero: featured (latest) article */}
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px' }}>
            <Link href={`/blog/${featured.slug}`} className="group block rounded-3xl overflow-hidden relative mb-12"
              style={{ height: 380, background: featured.coverImage ? undefined : `linear-gradient(135deg, ${C.dark}, ${C.accent})` }}>
              {featured.coverImage && (
                <Image src={featured.coverImage} alt={featured.title} fill sizes="1000px"
                  className="object-cover transition duration-500 group-hover:scale-105" />
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.15) 55%, transparent 100%)' }} />
              <div className="absolute bottom-0 right-0 left-0 p-8">
                <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-full mb-3" style={{ background: C.accent, color: '#fff' }}>
                  {featured.category ?? 'أحدث مقال'}
                </span>
                <h2 className="font-bold mb-2" style={{ color: '#fff', fontFamily: 'var(--font-cairo)', fontSize: 'clamp(22px, 3.2vw, 32px)', maxWidth: '32ch' }}>{featured.title}</h2>
                {featured.excerpt && <p className="text-sm max-w-xl" style={{ color: 'rgba(255,255,255,.85)' }}>{featured.excerpt}</p>}
              </div>
            </Link>
          </div>

          {/* Rest of the articles */}
          {rest.length > 0 && (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px 64px' }}>
              <h3 className="font-bold mb-5" style={{ color: C.dark, fontFamily: 'var(--font-cairo)', fontSize: 20 }}>مقالات أخرى</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(a => (
                  <Link key={a.id} href={`/blog/${a.slug}`} className="group bg-white rounded-2xl overflow-hidden border transition hover:shadow-lg hover:-translate-y-1" style={{ borderColor: C.border }}>
                    <div className="aspect-video overflow-hidden" style={{ background: '#F5EFFA' }}>
                      {a.coverImage
                        ? <Image src={a.coverImage} alt={a.title} width={400} height={225} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><Newspaper size={32} style={{ color: C.border }} /></div>}
                    </div>
                    <div className="p-5">
                      {a.category && <span className="text-xs font-semibold" style={{ color: C.accent }}>{a.category}</span>}
                      <h2 className="font-bold mt-1 mb-2 line-clamp-2" style={{ color: C.dark, fontFamily: 'var(--font-cairo)' }}>{a.title}</h2>
                      {a.excerpt && <p className="text-sm line-clamp-2" style={{ color: C.text2 }}>{a.excerpt}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
