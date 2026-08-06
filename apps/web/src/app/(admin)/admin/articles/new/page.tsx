'use client';

import { ArticleEditorForm } from '@/components/admin/ArticleEditorForm';

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function NewArticlePage() {
  useDocumentTitle('مقالة جديدة');
  return <ArticleEditorForm />;
}
