'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Upload, Loader2, X, Save, Eye, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import type { ArticlePublic } from '@storebuilder/types';

const B = { p: '#2F2E4B', a: '#DB6E93', border: '#ECE6F0', bg: '#F5EFFA' };

const CATEGORIES = ['نصائح التجارة', 'دليل المتجر', 'التسويق', 'قصص نجاح', 'تحديثات المنصة', 'عام'];

export function ArticleEditorForm({ article }: { article?: ArticlePublic }) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? '');
  const [category, setCategory] = useState(article?.category ?? CATEGORIES[0]);
  const [seoTitle, setSeoTitle] = useState(article?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(article?.seoDescription ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('images', files[0]);
      const res = await apiFetch<{ success: boolean; data: { urls: string[] } }>('/api/upload', { method: 'POST', body: fd });
      setCoverImage(res.data.urls[0]);
    } catch { toast.error('فشل رفع الصورة'); }
    finally { setUploading(false); }
  };

  const save = async (isPublished: boolean) => {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return; }
    if (!content.trim() || content === '<p></p>') { toast.error('المحتوى مطلوب'); return; }
    setSaving(true);
    try {
      const body = { title, excerpt: excerpt || undefined, content, coverImage: coverImage || undefined, category, seoTitle: seoTitle || undefined, seoDescription: seoDescription || undefined, isPublished };
      if (article) {
        await apiFetch(`/api/articles/admin/${article.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.success('تم حفظ التعديلات');
      } else {
        await apiFetch('/api/articles/admin', { method: 'POST', body: JSON.stringify(body) });
        toast.success(isPublished ? 'تم نشر المقال' : 'تم حفظ المسودة');
      }
      router.push('/admin/articles');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: B.p }}>{article ? 'تعديل المقال' : 'مقال جديد'}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => save(false)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition disabled:opacity-50"
            style={{ borderColor: B.p, color: B.p }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ كمسودة
          </button>
          <button onClick={() => save(true)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: B.a }}>
            <Eye size={15} /> {article?.isPublished ? 'تحديث المنشور' : 'نشر المقال'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: B.border }}>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>عنوان المقال *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="كيف تبني متجرك الإلكتروني في 5 دقائق"
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: B.border }} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>مقتطف قصير (يظهر في قائمة المقالات)</label>
          <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} maxLength={200}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none" style={{ borderColor: B.border }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>صورة الغلاف</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center border-2 flex-shrink-0"
                style={{ borderColor: coverImage ? B.a : B.border, background: coverImage ? '#fff' : B.bg }}>
                {uploading ? <Loader2 size={16} className="animate-spin" style={{ color: B.a }} />
                  : coverImage ? <Image src={coverImage} alt="" width={64} height={64} className="w-full h-full object-cover" />
                  : <ImageIcon size={18} style={{ color: B.a }} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-medium flex items-center gap-1" style={{ color: B.a }}>
                  <Upload size={12} /> {coverImage ? 'تغيير' : 'رفع صورة'}
                </button>
                {coverImage && <button type="button" onClick={() => setCoverImage('')} className="text-xs text-red-400 flex items-center gap-1"><X size={12} /> حذف</button>}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>التصنيف</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none" style={{ borderColor: B.border }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>المحتوى *</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <details className="rounded-xl border p-4" style={{ borderColor: B.border }}>
          <summary className="text-sm font-semibold cursor-pointer" style={{ color: B.p }}>إعدادات SEO (اختياري)</summary>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>عنوان SEO</label>
              <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={60}
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: B.border }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: B.p }}>وصف SEO</label>
              <textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} rows={2} maxLength={160}
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none" style={{ borderColor: B.border }} />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
