'use client';

import { useT } from '@/lib/i18n';
import { ArticleEditorForm } from '@/components/admin/ArticleEditorForm';

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function NewArticlePage() {
  const t = useT();
  useDocumentTitle(t("مقالة جديدة"));
  return <ArticleEditorForm />;
}
