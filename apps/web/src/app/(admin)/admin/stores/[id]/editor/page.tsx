'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEditorStore } from '@/lib/stores/editor.store';
import Link from 'next/link';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

interface StoreDetail {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  template: string;
  isActive: boolean;
  isPublished: boolean;
  slug: string;
}

export default function StoreEditorPage() {
  const { id } = useParams() as { id: string };
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useDocumentTitle(store ? `تحرير: ${store.name}` : 'تحرير المتجر');
  const { enterEditorMode, isEditorMode } = useEditorStore();

  const { register, handleSubmit, reset } = useForm<Partial<StoreDetail>>();

  useEffect(() => {
    api.get<{ success: boolean; data: StoreDetail }>(`/api/admin/stores/${id}`)
      .then((res) => {
        setStore(res.data);
        reset({
          name: res.data.name,
          description: res.data.description ?? '',
          theme: res.data.theme,
          template: res.data.template,
          isPublished: res.data.isPublished,
        });
        if (!isEditorMode) {
          enterEditorMode({ id: res.data.id, name: res.data.name });
        }
      })
      .catch(() => toast.error('فشل تحميل المتجر'))
      .finally(() => setLoading(false));
  }, [id, reset, enterEditorMode, isEditorMode]);

  const onSubmit = async (data: Partial<StoreDetail>) => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: StoreDetail }>(
        `/api/admin/stores/${id}/settings`,
        data
      );
      setStore(res.data);
      toast.success('تم حفظ الإعدادات (الإجراء مسجّل)');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !store) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 32, background: '#ECE6F0', borderRadius: 10, width: 200 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <Link href={`/admin/stores/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 20 }}>
        <ArrowRight size={14} /> العودة إلى المتجر
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: '0 0 6px' }}>تحرير: {store.name}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '10px 14px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 10, fontSize: 13, color: '#92400E' }}>
        <AlertTriangle size={16} />
        أنت تعدّل هذا المتجر كمشرف — كل التغييرات مسجّلة في سجل المراقبة.
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p, marginBottom: 20 }}>إعدادات المتجر</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: B.p, marginBottom: 6 }}>اسم المتجر</label>
              <input {...register('name')} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ECE6F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: B.p, marginBottom: 6 }}>الوصف</label>
              <textarea
                {...register('description')}
                rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ECE6F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: B.p, marginBottom: 6 }}>لون العلامة التجارية</label>
              <input type="color" {...register('theme')} style={{ height: 40, width: 80, borderRadius: 10, border: '1.5px solid #ECE6F0', cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: B.p, marginBottom: 6 }}>القالب</label>
              <select {...register('template')} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ECE6F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                <option value="minimal">بسيط</option>
                <option value="bold">جريء</option>
                <option value="magazine">مجلة</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="isPublished" {...register('isPublished')} style={{ width: 16, height: 16, accentColor: B.a, cursor: 'pointer' }} />
              <label htmlFor="isPublished" style={{ fontSize: 13, fontWeight: 600, color: B.p, cursor: 'pointer' }}>منشور</label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ width: '100%', padding: '13px 0', background: `linear-gradient(135deg,${B.p},${B.a})`, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
        >
          {saving && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
          {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات (تحرير المشرف)'}
        </button>
      </form>
    </div>
  );
}
