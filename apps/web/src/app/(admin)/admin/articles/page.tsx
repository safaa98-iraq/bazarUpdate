'use client';

import { useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Newspaper, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { ArticlePublic } from '@storebuilder/types';

const B = { p: '#0B3550', a: '#20A9F4', border: '#E6ECF1', bg: '#F6F8FA' };

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminArticlesPage() {
  const t = useT();
  useDocumentTitle(t("المقالات"));
  const [articles, setArticles] = useState<ArticlePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    apiFetch<{ success: boolean; data: ArticlePublic[] }>('/api/articles/admin/all')
      .then(r => setArticles(r.data ?? []))
      .catch(() => toast.error(t("فشل تحميل المقالات")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (a: ArticlePublic) => {
    if (!confirm(t("حذف مقال \"{0}\"؟", [a.title]))) return;
    setDeletingId(a.id);
    try {
      await apiFetch(`/api/articles/admin/${a.id}`, { method: 'DELETE' });
      setArticles(prev => prev.filter(x => x.id !== a.id));
      toast.success(t("تم الحذف"));
    } catch { toast.error(t("فشل الحذف")); }
    finally { setDeletingId(null); }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#E6ECF1' }} />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${B.a}15` }}>
          <Newspaper className="h-5 w-5" style={{ color: B.a }} />
        </div>
        <div>
          <h1 className="bz-large-title text-gray-900">{t("المقالات")}</h1>
          <p className="text-sm text-gray-500">{t("محتوى تحسين محركات البحث (SEO) يظهر على الصفحة الرئيسية")}</p>
        </div>
        <Link href="/admin/articles/new" className="mr-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: B.a }}>
          <Plus size={16} /> {' '}{t("مقال جديد")}
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-white border-2 border-dashed" style={{ borderColor: B.border }}>
          <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: B.p }} />
          <p className="font-semibold text-gray-500">{t("لا توجد مقالات بعد")}</p>
          <Link href="/admin/articles/new" className="text-sm font-bold mt-2 inline-block" style={{ color: B.a }}>{t("أنشئ أول مقال")}</Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: B.border }}>
          {articles.map((a, i) => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: i < articles.length - 1 ? `1px solid ${B.border}` : 'none' }}>
              <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                style={{ background: a.isPublished ? '#E2F7EE' : '#FEF3E2', color: a.isPublished ? '#17845C' : '#B45309' }} title={a.isPublished ? t("منشور") : t("مسودة")}>
                {a.isPublished ? <Eye size={13} /> : <EyeOff size={13} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: B.p }}>{a.title}</p>
                <p className="text-xs text-gray-400">{a.category ?? t("بلا تصنيف")} · {a.author?.name ?? ''}</p>
              </div>
              <Link href={`/admin/articles/${a.id}`} className="w-8 h-8 rounded-xl flex items-center justify-center border transition hover:bg-gray-50" style={{ borderColor: B.border }}>
                <Pencil className="h-3.5 w-3.5" style={{ color: B.p }} />
              </Link>
              <button onClick={() => handleDelete(a)} disabled={deletingId === a.id}
                className="w-8 h-8 rounded-xl flex items-center justify-center border transition hover:bg-red-50" style={{ borderColor: '#F5A3A3' }}>
                {deletingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" /> : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
