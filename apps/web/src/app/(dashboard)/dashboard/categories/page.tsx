'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Tag, Plus, Pencil, Trash2, Check, X, Loader2, Package } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Plan, getFeatureLimit } from '@/lib/plan-features';
import Link from 'next/link';
import { trackPage, track } from '@/lib/track';

const B = { p: '#2F2E4B', a: '#DB6E93', border: '#FBE1EA', bg: '#F5EFFA', soft: '#FBF9F2' };

interface Category { id: string; name: string; slug: string; }

function toSlug(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w؀-ۿ-]/g, '');
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CategoriesPage() {
  useDocumentTitle('التصنيفات');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const limit = getFeatureLimit(plan, 'categories') ?? 3;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // add form
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { trackPage('categories'); }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: Category[] }>('/api/categories')
      .then(r => setCategories(r.data ?? []))
      .catch(() => toast.error('فشل تحميل التصنيفات'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.length >= limit) {
      toast.error(`وصلت للحد الأقصى (${limit} تصنيفات) في باقتك الحالية`);
      return;
    }
    setAdding(true);
    try {
      const res = await api.post<{ success: boolean; data: Category }>('/api/categories', {
        name, slug: toSlug(name),
      });
      setCategories(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name, 'ar')));
      setNewName('');
      inputRef.current?.focus();
      toast.success(`تم إضافة "${name}"`);
      track({ event: 'category_added' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل إضافة التصنيف');
    } finally { setAdding(false); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const cancelEdit = () => { setEditingId(null); setEditName(''); };

  const handleSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSavingId(id);
    try {
      await api.patch(`/api/categories/${id}`, { name });
      setCategories(prev =>
        prev.map(c => c.id === id ? { ...c, name, slug: toSlug(name) } : c)
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      );
      setEditingId(null);
      toast.success('تم تحديث التصنيف');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل التحديث');
    } finally { setSavingId(null); }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`حذف تصنيف "${cat.name}"؟ ستُزال من جميع المنتجات المرتبطة به.`)) return;
    setDeletingId(cat.id);
    try {
      await api.delete(`/api/categories/${cat.id}`);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast.success(`تم حذف "${cat.name}"`);
    } catch {
      toast.error('فشل حذف التصنيف');
    } finally { setDeletingId(null); }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#ECE6F0' }} />)}
    </div>
  );

  const atLimit = categories.length >= limit;

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${B.a}15` }}>
          <Tag className="h-5 w-5" style={{ color: B.a }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: B.p }}>التصنيفات</h1>
          <p className="text-sm text-gray-500">تظهر في رأس متجرك وتُستخدم لتصنيف منتجاتك</p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: B.bg, color: B.p }}>
            {categories.length} / {limit}
          </span>
          {plan === 'FREE' && (
            <Link href="/dashboard/upgrade" className="text-xs font-bold px-3 py-1.5 rounded-xl text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, #7C3AED, ${B.a})` }}>
              زيادة الحد
            </Link>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl p-4 mb-6 text-sm leading-relaxed" style={{ background: B.soft, border: `1px solid ${B.border}` }}>
        <p className="font-semibold mb-1" style={{ color: B.p }}>كيف تعمل التصنيفات؟</p>
        <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
          <li>تظهر التصنيفات كأزرار فلترة تحت شريط التنقل في متجرك</li>
          <li>عند إضافة منتج يمكنك اختيار تصنيف له — يظهر كـ tag عليه</li>
          <li>يستطيع الزبون الضغط على التصنيف لعرض منتجاته فقط</li>
        </ul>
      </div>

      {/* Add new */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: '#fff', border: `1.5px solid ${B.border}`, boxShadow: '0 2px 12px rgba(67,46,84,.06)' }}>
        <p className="text-sm font-bold mb-3" style={{ color: B.p }}>إضافة تصنيف جديد</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="مثال: فساتين سهرة، سكين كير، ألعاب PS5…"
            disabled={atLimit || adding}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${B.border}`,
              fontSize: 14, outline: 'none', fontFamily: 'inherit', background: atLimit ? '#fafafa' : '#fff',
              color: '#2F2E4B', transition: 'border-color .2s',
            }}
            onFocus={e => { e.target.style.borderColor = B.a; }}
            onBlur={e => { e.target.style.borderColor = B.border; }}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || atLimit || adding}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px',
              borderRadius: 10, border: 'none', cursor: !newName.trim() || atLimit || adding ? 'not-allowed' : 'pointer',
              background: !newName.trim() || atLimit || adding ? '#e5e7eb' : `linear-gradient(135deg, ${B.p}, ${B.a})`,
              color: !newName.trim() || atLimit || adding ? '#9ca3af' : '#fff',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'all .2s',
            }}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة
          </button>
        </div>
        {atLimit && (
          <p className="text-xs mt-2" style={{ color: B.a }}>
            وصلت للحد الأقصى ({limit} تصنيفات) —{' '}
            <Link href="/dashboard/upgrade" className="font-bold underline">ارفع باقتك</Link>
            {' '}لإضافة المزيد
          </p>
        )}
      </div>

      {/* List */}
      {categories.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: `1.5px dashed ${B.border}` }}>
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: B.p }} />
          <p className="font-semibold text-gray-500">لا توجد تصنيفات بعد</p>
          <p className="text-sm text-gray-400 mt-1">أضف تصنيفاً من الحقل أعلاه</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1.5px solid ${B.border}`, boxShadow: '0 2px 12px rgba(67,46,84,.06)' }}>
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-5 py-3.5 transition"
              style={{
                borderBottom: i < categories.length - 1 ? `1px solid ${B.border}` : 'none',
                background: editingId === cat.id ? B.soft : '#fff',
              }}
            >
              {/* Tag icon */}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: B.bg }}>
                <Tag className="h-3.5 w-3.5" style={{ color: B.p }} />
              </div>

              {editingId === cat.id ? (
                /* Inline edit mode */
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSave(cat.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    style={{
                      flex: 1, padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${B.a}`,
                      fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff',
                    }}
                  />
                  <button onClick={() => handleSave(cat.id)} disabled={savingId === cat.id}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:opacity-80"
                    style={{ background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {savingId === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={cancelEdit}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:opacity-80"
                    style={{ background: '#e5e7eb', color: '#6b7280', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: B.p }}>{cat.name}</p>
                    <p className="text-xs text-gray-400 truncate">/{cat.slug}</p>
                  </div>

                  {/* Products count badge placeholder */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(cat)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-purple-50"
                      style={{ border: `1px solid ${B.border}`, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                      title="تعديل الاسم">
                      <Pencil className="h-3.5 w-3.5" style={{ color: B.p }} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={deletingId === cat.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-50"
                      style={{ border: '1px solid #fca5a5', background: 'transparent', cursor: deletingId === cat.id ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                      title="حذف">
                      {deletingId === cat.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                        : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link to products */}
      {categories.length > 0 && (
        <div className="mt-5 rounded-2xl p-4 flex items-center gap-3" style={{ background: B.bg, border: `1px solid ${B.border}` }}>
          <Package className="h-4 w-4 flex-shrink-0" style={{ color: B.p }} />
          <p className="text-sm text-gray-600 flex-1">
            يمكنك الآن تعيين هذه التصنيفات على منتجاتك
          </p>
          <Link href="/dashboard/products"
            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
            style={{ background: B.p }}>
            إدارة المنتجات
          </Link>
        </div>
      )}
    </div>
  );
}
