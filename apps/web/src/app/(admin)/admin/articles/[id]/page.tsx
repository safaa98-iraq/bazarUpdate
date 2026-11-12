'use client';

import { useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { ArticleEditorForm } from '@/components/admin/ArticleEditorForm';
import type { ArticlePublic } from '@storebuilder/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function EditArticlePage() {
  const t = useT();
  const { id } = useParams() as { id: string };
  const [article, setArticle] = useState<ArticlePublic | null>(null);
  const [loading, setLoading] = useState(true);
  useDocumentTitle(article ? t("تعديل: {0}", [article.title]) : t("تعديل مقالة"));

  useEffect(() => {
    apiFetch<{ success: boolean; data: ArticlePublic }>(`/api/articles/admin/${id}`)
      .then(r => setArticle(r.data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <div className="h-10 rounded-xl animate-pulse" style={{ background: '#E6ECF1' }} />
      <div className="h-96 rounded-2xl animate-pulse" style={{ background: '#E6ECF1' }} />
    </div>
  );

  if (!article) return (
    <div className="p-8 text-center text-gray-400">{t("المقال غير موجود")}</div>
  );

  return <ArticleEditorForm article={article} />;
}
