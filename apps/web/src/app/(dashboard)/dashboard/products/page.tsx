'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Sparkles, Search, Loader2, X, Upload, Download, Image as ImageIcon, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ProductPublic, CategoryPublic, ProductAttributePublic, ProductAttributeValuePublic, BrandPublic, ProductVariantPublic } from '@storebuilder/types';
import { formatCurrency } from '@/lib/utils';
import { getStoreType } from '@/lib/store-types';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getFeatureLimit, Plan } from '@/lib/plan-features';
import Image from 'next/image';
import { trackPage, track } from '@/lib/track';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

interface SpecValue { value: string; image?: string }
interface ProductSpec { name: string; values: SpecValue[] }

interface ProductForm {
  name: string; description: string; price: string; comparePrice: string;
  stock: string; unit: string; categoryId: string; brandId: string;
  seoTitle: string; seoDescription: string; seoSlug: string;
  images: string[]; specs: ProductSpec[];
  saleEndsAt: string; sizeGuide: string;
}
const emptyForm: ProductForm = {
  name: '', description: '', price: '', comparePrice: '',
  stock: '0', unit: 'piece', categoryId: '', brandId: '',
  seoTitle: '', seoDescription: '', seoSlug: '', images: [], specs: [],
  saleEndsAt: '', sizeGuide: '',
};

function parseSpecValue(raw: string): SpecValue[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [{ value: String(parsed) }];
    // backward-compatible with the old plain string[] format
    return parsed.map((item) =>
      typeof item === 'string' ? { value: item } : { value: String(item.value), image: item.image }
    );
  } catch {
    return [{ value: raw }];
  }
}

function SpecValueImage({ sv, onUpload, onRemove }: {
  sv: SpecValue;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { onUpload(file); } finally { setUploading(false); }
  };

  return (
    <label className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border cursor-pointer flex items-center justify-center"
      style={{ borderColor: '#ECE6F0', background: '#F5EFFA' }}>
      {uploading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: BRAND.accent }} />
      ) : sv.image ? (
        <Image src={sv.image} alt={sv.value} fill className="object-cover" />
      ) : (
        <ImageIcon className="h-4 w-4 text-gray-300" />
      )}
      {sv.image && (
        <button type="button" onClick={e => { e.preventDefault(); onRemove(); }}
          className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center">
          <X className="h-2 w-2" />
        </button>
      )}
      <input type="file" accept="image/*" className="hidden" disabled={uploading}
        onChange={e => handleFile(e.target.files?.[0])} />
    </label>
  );
}

function SpecsEditor({ specs, attributes, onChange }: {
  specs: ProductSpec[];
  attributes: ProductAttributePublic[];
  onChange: (specs: ProductSpec[]) => void;
}) {
  const [draftValue, setDraftValue] = useState<Record<number, string>>({});

  const updateSpec = (i: number, patch: Partial<ProductSpec>) =>
    onChange(specs.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const removeSpec = (i: number) => onChange(specs.filter((_, j) => j !== i));

  const addValue = (i: number) => {
    const val = (draftValue[i] ?? '').trim();
    if (!val || specs[i].values.some(v => v.value === val)) return;
    updateSpec(i, { values: [...specs[i].values, { value: val }] });
    setDraftValue(d => ({ ...d, [i]: '' }));
  };

  const updateValue = (i: number, vi: number, patch: Partial<SpecValue>) =>
    updateSpec(i, { values: specs[i].values.map((v, j) => (j === vi ? { ...v, ...patch } : v)) });

  const uploadValueImage = async (i: number, vi: number, file: File) => {
    try {
      const fd = new FormData();
      fd.append('images', file);
      const res = await api.upload<{ success: boolean; data: { urls: string[] } }>('/api/upload', fd);
      const url = res.data.urls[0];
      if (url) updateValue(i, vi, { image: url });
    } catch { toast.error('فشل رفع الصورة'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold" style={{ color: BRAND.primary }}>مواصفات المنتج</label>
        <button type="button"
          onClick={() => onChange([...specs, { name: '', values: [] }])}
          className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND.accent }}>
          <Plus className="h-3.5 w-3.5" /> إضافة مواصفة
        </button>
      </div>

      {specs.length === 0 && (
        <p className="text-xs text-gray-400 mb-1">
          أضف أي مواصفة تريدها (مثل: اللون، الحجم…) وأدخل عدة قيم فرعية لكل مواصفة، مع صورة اختيارية لكل قيمة.
        </p>
      )}

      <datalist id="spec-attr-names">
        {attributes.map(a => <option key={a.id} value={a.name} />)}
      </datalist>

      <div className="space-y-3">
        {specs.map((spec, i) => (
          <div key={i} className="p-3 rounded-xl border" style={{ borderColor: '#ECE6F0' }}>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={spec.name}
                onChange={e => updateSpec(i, { name: e.target.value })}
                list="spec-attr-names"
                placeholder="اسم المواصفة (مثال: اللون)"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition"
                style={{ borderColor: '#ECE6F0' }}
              />
              <button type="button" onClick={() => removeSpec(i)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {spec.values.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {spec.values.map((v, vi) => (
                  <div key={vi} className="flex items-center gap-1.5 pl-2 rounded-lg border" style={{ borderColor: '#ECE6F0' }}>
                    <SpecValueImage
                      sv={v}
                      onUpload={file => uploadValueImage(i, vi, file)}
                      onRemove={() => updateValue(i, vi, { image: undefined })}
                    />
                    <span className="text-xs font-medium" style={{ color: BRAND.primary }}>{v.value}</span>
                    <button type="button" onClick={() => updateSpec(i, { values: spec.values.filter((_, j) => j !== vi) })}
                      className="p-1 hover:text-red-500 text-gray-400 transition">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              value={draftValue[i] ?? ''}
              onChange={e => setDraftValue(d => ({ ...d, [i]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(i); } }}
              placeholder="اكتب قيمة فرعية واضغط Enter (مثال: أحمر)"
              className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 transition"
              style={{ borderColor: '#ECE6F0' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageUploader({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 6).forEach(f => fd.append('images', f));
      const res = await api.upload<{ success: boolean; data: { urls: string[] } }>('/api/upload', fd);
      onChange([...images, ...res.data.urls].slice(0, 6));
      toast.success('تم رفع الصور بنجاح');
    } catch { toast.error('فشل رفع الصور'); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: BRAND.primary }}>صور المنتج</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {images.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border" style={{ borderColor: '#ECE6F0' }}>
            <Image src={url} alt="" fill className="object-cover" />
            <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition">
              <X className="h-3 w-3" />
            </button>
            {i === 0 && <span className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: BRAND.accent }}>رئيسية</span>}
          </div>
        ))}
        {images.length < 6 && (
          <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition"
            style={{ borderColor: BRAND.light }}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: BRAND.accent }} /> : <>
              <Upload className="h-5 w-5 mb-1" style={{ color: BRAND.accent }} />
              <span className="text-xs font-medium" style={{ color: BRAND.accent }}>رفع صورة</span>
            </>}
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
              onChange={e => handleFiles(e.target.files)} />
          </label>
        )}
      </div>
      {images.length === 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-px" style={{ background: '#ECE6F0' }} />
          <span className="text-xs text-gray-400">أو أدخل رابط صورة</span>
          <div className="flex-1 h-px" style={{ background: '#ECE6F0' }} />
        </div>
      )}
      <input
        placeholder="https://example.com/image.jpg"
        className="mt-2 w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition"
        style={{ borderColor: '#ECE6F0' }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const val = (e.target as HTMLInputElement).value.trim();
            if (val && images.length < 6) { onChange([...images, val]); (e.target as HTMLInputElement).value = ''; }
          }
        }}
      />
      <p className="text-xs text-gray-400 mt-1">اضغط Enter لإضافة الرابط • حتى 6 صور</p>
    </div>
  );
}

interface VariantDraft { options: { key: string; value: string }[]; sku: string; price: string; stock: string; isActive: boolean }
const emptyVariantDraft: VariantDraft = { options: [{ key: 'اللون', value: '' }, { key: 'المقاس', value: '' }], sku: '', price: '', stock: '0', isActive: true };

function VariantsEditor({ productId, basePrice }: { productId: string; basePrice: string }) {
  const [variants, setVariants] = useState<ProductVariantPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VariantDraft>(emptyVariantDraft);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ProductVariantPublic[] }>(`/api/products/${productId}/variants`);
      setVariants(res.data ?? []);
    } catch { toast.error('فشل تحميل المتغيرات'); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const resetDraft = () => { setDraft(emptyVariantDraft); setEditingVariantId(null); };

  const startEdit = (v: ProductVariantPublic) => {
    setEditingVariantId(v.id);
    setDraft({
      options: Object.entries(v.options ?? {}).map(([key, value]) => ({ key, value })),
      sku: v.sku ?? '', price: v.price !== null ? String(v.price) : '', stock: String(v.stock), isActive: v.isActive,
    });
  };

  const updateOption = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setDraft(d => ({ ...d, options: d.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const addOptionRow = () => setDraft(d => ({ ...d, options: [...d.options, { key: '', value: '' }] }));
  const removeOptionRow = (i: number) => setDraft(d => ({ ...d, options: d.options.filter((_, j) => j !== i) }));

  const submitDraft = async () => {
    const options: Record<string, string> = {};
    for (const o of draft.options) { if (o.key.trim() && o.value.trim()) options[o.key.trim()] = o.value.trim(); }
    if (Object.keys(options).length === 0) { toast.error('أضف خاصية واحدة على الأقل (مثل اللون أو المقاس)'); return; }
    setSaving(true);
    try {
      const body = {
        options, sku: draft.sku || undefined,
        price: draft.price ? Number(draft.price) : null,
        stock: Number(draft.stock) || 0,
        isActive: draft.isActive,
      };
      if (editingVariantId) {
        const res = await api.patch<{ success: boolean; data: ProductVariantPublic }>(`/api/products/${productId}/variants/${editingVariantId}`, body);
        setVariants(prev => prev.map(v => v.id === editingVariantId ? res.data : v));
        toast.success('تم تحديث المتغير');
      } else {
        const res = await api.post<{ success: boolean; data: ProductVariantPublic }>(`/api/products/${productId}/variants`, body);
        setVariants(prev => [...prev, res.data]);
        toast.success('تمت إضافة المتغير');
      }
      resetDraft();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const deleteVariant = async (id: string) => {
    if (!confirm('حذف هذا المتغير؟')) return;
    try {
      await api.delete(`/api/products/${productId}/variants/${id}`);
      setVariants(prev => prev.filter(v => v.id !== id));
      if (editingVariantId === id) resetDraft();
      toast.success('تم حذف المتغير');
    } catch { toast.error('فشل الحذف'); }
  };

  const toggleActive = async (v: ProductVariantPublic) => {
    try {
      const res = await api.patch<{ success: boolean; data: ProductVariantPublic }>(`/api/products/${productId}/variants/${v.id}`, { isActive: !v.isActive });
      setVariants(prev => prev.map(x => x.id === v.id ? res.data : x));
    } catch { toast.error('فشل التحديث'); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 mb-3">أضف مزيجاً من الخصائص (مثل اللون والمقاس) لكل نسخة من المنتج، مع مخزون وسعر منفصلين إذا احتجت</p>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: BRAND.accent }} /></div>
        ) : variants.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">لا توجد متغيرات بعد</p>
        ) : (
          <div className="space-y-2 mb-4">
            {variants.map(v => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: '#ECE6F0' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: BRAND.primary }}>
                    {Object.entries(v.options).map(([k, val]) => `${k}: ${val}`).join('، ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.sku ? `SKU: ${v.sku} · ` : ''}المخزون: {v.stock}{v.price !== null ? ` · السعر: ${formatCurrency(v.price)}` : ` · السعر الأساسي (${formatCurrency(Number(basePrice) || 0)})`}
                  </p>
                </div>
                <button type="button" onClick={() => toggleActive(v)} title={v.isActive ? 'إخفاء' : 'إظهار'}
                  className="p-1.5 rounded-lg hover:bg-gray-50 transition flex-shrink-0" style={{ color: v.isActive ? BRAND.accent : '#9ca3af' }}>
                  {v.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => startEdit(v)} className="p-1.5 rounded-lg hover:bg-gray-50 transition flex-shrink-0 text-gray-400">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => deleteVariant(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition flex-shrink-0 text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#ECE6F0', background: '#F5EFFA' }}>
        <p className="text-xs font-bold" style={{ color: BRAND.primary }}>{editingVariantId ? 'تعديل المتغير' : 'متغير جديد'}</p>
        {draft.options.map((o, i) => (
          <div key={i} className="flex gap-2">
            <input value={o.key} onChange={e => updateOption(i, { key: e.target.value })} placeholder="الخاصية (مثال: اللون)"
              className="w-1/3 px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
            <input value={o.value} onChange={e => updateOption(i, { value: e.target.value })} placeholder="القيمة (مثال: أحمر)"
              className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
            {draft.options.length > 1 && (
              <button type="button" onClick={() => removeOptionRow(i)} className="p-2 text-gray-400 hover:text-red-500 transition flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addOptionRow} className="text-xs font-bold" style={{ color: BRAND.accent }}>+ إضافة خاصية</button>

        <div className="grid grid-cols-3 gap-2">
          <input value={draft.sku} onChange={e => setDraft(d => ({ ...d, sku: e.target.value }))} placeholder="SKU (اختياري)"
            className="px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
          <input type="number" min="0" step="0.01" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} placeholder="سعر مختلف (اختياري)"
            className="px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
          <input type="number" min="0" value={draft.stock} onChange={e => setDraft(d => ({ ...d, stock: e.target.value }))} placeholder="المخزون"
            className="px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
        </div>

        <div className="flex gap-2 pt-1">
          {editingVariantId && (
            <button type="button" onClick={resetDraft}
              className="px-4 py-2 rounded-lg text-xs font-bold border bg-white hover:bg-gray-50 transition" style={{ borderColor: '#ECE6F0', color: '#6b7280' }}>
              إلغاء
            </button>
          )}
          <button type="button" onClick={submitDraft} disabled={saving}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editingVariantId ? 'حفظ التعديل' : 'إضافة المتغير'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ProductsPage() {
  useDocumentTitle('المنتجات');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const productLimit = getFeatureLimit(plan, 'products');
  const canAddMore = productLimit === null || productLimit === undefined;
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [categories, setCategories] = useState<CategoryPublic[]>([]);
  const [brandsList, setBrandsList] = useState<BrandPublic[]>([]);
  const [attributes, setAttributes] = useState<ProductAttributePublic[]>([]);
  const [storeType, setStoreType] = useState<string>('fashion');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingModelNumber, setEditingModelNumber] = useState<string | null>(null);
  const [initialSpecNames, setInitialSpecNames] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'variants' | 'seo'>('basic');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { trackPage('products'); }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, cRes, aRes, bRes] = await Promise.all([
        api.get<{ success: boolean; data: ProductPublic[] }>(`/api/products?search=${search}`),
        api.get<{ success: boolean; data: CategoryPublic[] }>('/api/categories'),
        api.get<{ success: boolean; data: ProductAttributePublic[] }>('/api/attributes'),
        api.get<{ success: boolean; data: BrandPublic[] }>('/api/brands').catch(() => ({ success: true, data: [] })),
      ]);
      setProducts(pRes.data ?? []);
      setCategories(cRes.data ?? []);
      setAttributes(aRes.data ?? []);
      setBrandsList(bRes.data ?? []);
      try {
        const sRes = await api.get<{ success: boolean; data: { storeType?: string } }>('/api/stores/my');
        if (sRes.data?.storeType) setStoreType(sRes.data.storeType);
      } catch { /* no store yet */ }
    } catch { toast.error('فشل تحميل المنتجات'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('sb_token') ?? sessionStorage.getItem('sb_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/products/export/csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('فشل التصدير');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'products.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير المنتجات ✓');
    } catch { toast.error('فشل تصدير المنتجات'); }
    finally { setExporting(false); }
  };

  const handleImportFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      const res = await api.upload<{ success: boolean; data: { created: number; updated: number; failed: number; total: number } }>('/api/products/import/csv', fd);
      toast.success(`تم الاستيراد: ${res.data.created} جديد، ${res.data.updated} محدّث${res.data.failed ? `، ${res.data.failed} فشل` : ''}`);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الاستيراد');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const openNew = () => {
    setEditingId(null);
    setEditingModelNumber(null);
    setForm({ ...emptyForm, unit: getStoreType(storeType).defaultUnit });
    setInitialSpecNames([]);
    setActiveTab('basic'); setShowModal(true);
  };
  const openEdit = async (p: ProductPublic) => {
    setEditingId(p.id);
    setEditingModelNumber(p.modelNumber ?? null);
    setForm({
      name: p.name, description: p.description ?? '', price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      stock: String(p.stock), unit: p.unit ?? getStoreType(storeType).defaultUnit,
      categoryId: p.categoryId ?? '', brandId: p.brandId ?? '',
      seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '',
      seoSlug: p.seoSlug ?? '', images: p.images ?? [], specs: [],
      saleEndsAt: p.saleEndsAt ? p.saleEndsAt.slice(0, 16) : '',
      sizeGuide: p.sizeGuide ?? '',
    });
    setInitialSpecNames([]);
    setActiveTab('basic'); setShowModal(true);
    try {
      const res = await api.get<{ success: boolean; data: ProductAttributeValuePublic[] }>(`/api/attributes/product/${p.id}`);
      const specs = (res.data ?? [])
        .filter(v => v.attribute)
        .map(v => ({ name: v.attribute!.name, values: parseSpecValue(v.value) }));
      setForm(f => ({ ...f, specs }));
      setInitialSpecNames(specs.map(s => s.name));
    } catch { /* no specs yet */ }
  };

  const saveSpecs = async (productId: string) => {
    const named = form.specs.filter(s => s.name.trim() && s.values.length > 0);

    // Remove specs that existed before but were deleted in this edit
    const currentNames = new Set(named.map(s => s.name.trim()));
    const removed = initialSpecNames.filter(n => !currentNames.has(n));
    for (const name of removed) {
      const attr = attributes.find(a => a.name.trim() === name);
      if (attr) {
        await api.delete(`/api/attributes/product/${productId}/${attr.id}`).catch(() => null);
      }
    }

    if (named.length === 0) return;

    const values: { attributeId: string; value: string }[] = [];
    for (const spec of named) {
      const name = spec.name.trim();
      const valueNames = spec.values.map(v => v.value);
      let attr = attributes.find(a => a.name.trim() === name);
      if (attr) {
        const missing = valueNames.filter(v => !attr!.options.includes(v));
        if (missing.length > 0) {
          await api.patch(`/api/attributes/${attr.id}`, { options: [...attr.options, ...missing] }).catch(() => null);
        }
      } else {
        const created = await api.post<{ success: boolean; data: ProductAttributePublic }>('/api/attributes', {
          name, kind: 'select', options: valueNames,
        });
        attr = created.data;
        setAttributes(prev => [...prev, attr!]);
      }
      values.push({ attributeId: attr.id, value: JSON.stringify(spec.values) });
    }

    await api.post(`/api/attributes/product/${productId}`, { values });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {
        name: form.name, description: form.description || undefined,
        price: parseFloat(form.price),
        comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
        stock: parseInt(form.stock), unit: form.unit || undefined,
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || null,
        images: form.images,
        seoTitle: form.seoTitle || undefined, seoDescription: form.seoDescription || undefined,
        seoSlug: form.seoSlug || undefined,
        saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : null,
        sizeGuide: form.sizeGuide || null,
      };
      let productId = editingId;
      if (editingId) {
        await api.patch(`/api/products/${editingId}`, body);
        toast.success('تم تحديث المنتج');
        track({ event: 'product_edited' });
      } else {
        const created = await api.post<{ success: boolean; data: ProductPublic }>('/api/products', body);
        productId = created.data.id;
        toast.success('تم إنشاء المنتج');
        track({ event: 'product_added' });
      }
      if (productId) await saveSpecs(productId);
      setShowModal(false); fetchAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try { await api.delete(`/api/products/${id}`); toast.success('تم الحذف'); fetchAll(); }
    catch { toast.error('فشل الحذف'); }
  };

  const handleToggle = async (p: ProductPublic) => {
    try { await api.patch(`/api/products/${p.id}`, { isActive: !p.isActive }); fetchAll(); }
    catch { toast.error('فشل التحديث'); }
  };

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? '';
  const atProductLimit = !canAddMore && products.length >= (productLimit ?? 0);

  return (
    <div className="p-6 max-w-6xl" dir="rtl">
      {!canAddMore && (
        <div className="mb-4 px-4 py-3 rounded-2xl border flex items-center gap-3"
          style={{ background: atProductLimit ? '#FEF2F2' : '#FEF3C7', borderColor: atProductLimit ? '#FECACA' : '#FCD34D' }}>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: atProductLimit ? '#991B1B' : '#92400E' }}>
                {plan === 'FREE' ? 'منتجات الخطة المجانية' : 'حد المنتجات في خطتك الحالية'}: {products.length} / {productLimit}
              </span>
              <a href="/dashboard/settings?tab=billing"
                className="text-xs font-bold px-2.5 py-1 rounded-lg text-white flex items-center gap-1"
                style={{ background: '#DB6E93' }}>
                <Sparkles className="h-3 w-3" /> ارفع للـ PRO
              </a>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: '#E5E7EB' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (products.length / (productLimit ?? 1)) * 100)}%`, background: atProductLimit ? '#EF4444' : '#F59E0B' }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>المنتجات</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} منتج في متجرك</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importInputRef} type="file" accept=".csv" className="hidden"
            onChange={e => handleImportFile(e.target.files)} />
          <button onClick={() => importInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold border transition hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#ECE6F0', color: BRAND.primary }}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} استيراد Excel
          </button>
          <button onClick={handleExport} disabled={exporting || products.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold border transition hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#ECE6F0', color: BRAND.primary }}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} تصدير
          </button>
          <button onClick={openNew} disabled={atProductLimit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
            <Plus className="h-4 w-4" /> إضافة منتج
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو رقم الموديل…"
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white"
          style={{ borderColor: '#ECE6F0' }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: '#F5EFFA' }}>
              <tr>
                {['المنتج', 'التصنيف', 'السعر', 'المخزون', 'الحالة', 'الإجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold text-right" style={{ color: BRAND.primary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFFA]">
              {products.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#F5EFFA' }}>
                      <ImageIcon className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="text-gray-400">لا توجد منتجات بعد</p>
                    <button onClick={openNew} className="text-sm font-medium" style={{ color: BRAND.accent }}>+ أضف أول منتج</button>
                  </div>
                </td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#F5EFFA' }}>
                        {p.images?.[0]
                          ? <Image src={p.images[0]} alt={p.name} width={40} height={40} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={18} /></div>}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.modelNumber && <p className="text-xs text-gray-400 font-mono" style={{ direction: 'ltr', textAlign: 'right' }}>{p.modelNumber}</p>}
                        {p.seoTitle && <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: BRAND.secondary }}>
                          <Sparkles className="h-2.5 w-2.5" />{p.seoTitle}
                        </p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.categoryId ? catName(p.categoryId) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold" style={{ color: BRAND.primary }}>{formatCurrency(p.price)}</span>
                    {p.comparePrice && <span className="mr-2 text-xs line-through text-gray-400">{formatCurrency(p.comparePrice)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-gray-700'}`}>{p.stock}</span>
                    {p.unit && (
                      <span className="mr-1 text-xs text-gray-400">
                        {getStoreType(storeType).unitOptions.find(u => u.value === p.unit)?.label ?? p.unitLabel ?? ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${p.isActive ? 'text-emerald-700' : 'text-gray-500'}`}
                      style={{ background: p.isActive ? '#d1fae5' : '#F5EFFA' }}>
                      {p.isActive ? 'نشط' : 'مخفي'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggle(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                        {p.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-purple-50 transition" style={{ color: BRAND.secondary }}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#ECE6F0] flex items-center justify-between z-10">
              <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>
                {editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex border-b border-[#ECE6F0] px-6">
              {([['basic', 'المعلومات الأساسية'], ...(editingId ? [['variants', 'المتغيرات']] : []), ['seo', 'SEO والبحث']] as [string, string][]).map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab as 'basic' | 'variants' | 'seo')}
                  className="px-4 py-3 text-sm font-medium border-b-2 transition"
                  style={{
                    color: activeTab === tab ? BRAND.accent : '#9ca3af',
                    borderBottomColor: activeTab === tab ? BRAND.accent : 'transparent',
                  }}>{label}</button>
              ))}
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {activeTab === 'basic' && <>
                <ImageUploader images={form.images} onChange={imgs => setForm(f => ({ ...f, images: imgs }))} />

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>اسم المنتج *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition"
                    style={{ borderColor: '#ECE6F0' }} placeholder="مثال: حذاء رياضي مريح" />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الوصف</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={4} placeholder="وصف تفصيلي للمنتج…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>السعر *</label>
                    <input type="number" min="0" step="0.01" value={form.price} required
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition"
                      style={{ borderColor: '#ECE6F0' }} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>سعر المقارنة (شطب)</label>
                    <input type="number" min="0" step="0.01" value={form.comparePrice}
                      onChange={e => setForm({ ...form, comparePrice: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition"
                      style={{ borderColor: '#ECE6F0' }} placeholder="السعر قبل الخصم" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الكمية والوحدة</label>
                    <div className="flex gap-2">
                      <input type="number" min="0" value={form.stock}
                        onChange={e => setForm({ ...form, stock: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition"
                        style={{ borderColor: '#ECE6F0' }} placeholder="0" />
                      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                        className="px-2 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white transition"
                        style={{ borderColor: '#ECE6F0' }}>
                        {getStoreType(storeType).unitOptions.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>التصنيف</label>
                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white transition"
                      style={{ borderColor: '#ECE6F0' }}>
                      <option value="">بدون تصنيف</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الماركة</label>
                    {brandsList.length > 0 ? (
                      <select value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white transition"
                        style={{ borderColor: '#ECE6F0' }}>
                        <option value="">بدون ماركة</option>
                        {brandsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    ) : (
                      <a href="/dashboard/brands" className="block px-3 py-2.5 rounded-xl border text-xs text-gray-400 hover:text-gray-600 transition"
                        style={{ borderColor: '#ECE6F0' }}>
                        أضف ماركات من هنا أولاً
                      </a>
                    )}
                  </div>
                  {editingModelNumber && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>رقم الموديل</label>
                      <div className="px-3 py-2.5 rounded-xl border text-sm bg-gray-50 text-gray-500 font-mono" style={{ borderColor: '#ECE6F0', direction: 'ltr', textAlign: 'right' }}>
                        {editingModelNumber}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>
                      نهاية العرض (اختياري)
                    </label>
                    <input type="datetime-local" value={form.saleEndsAt}
                      onChange={e => setForm({ ...form, saleEndsAt: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition"
                      style={{ borderColor: '#ECE6F0' }} />
                    <p className="text-xs text-gray-400 mt-1">يظهر عدّاد تنازلي بصفحة المنتج حتى هذا الموعد</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>
                    دليل المقاسات (اختياري)
                  </label>
                  <textarea value={form.sizeGuide} onChange={e => setForm({ ...form, sizeGuide: e.target.value })}
                    rows={4} placeholder="مثال: S: 36-38 / M: 40-42 / L: 44-46 ..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition resize-none"
                    style={{ borderColor: '#ECE6F0' }} />
                  <p className="text-xs text-gray-400 mt-1">إذا تركته فارغاً سيُستخدم دليل المقاسات العام للمتجر (من الإعدادات) إن وُجد</p>
                </div>

                <SpecsEditor specs={form.specs} attributes={attributes} onChange={specs => setForm(f => ({ ...f, specs }))} />
              </>}

              {activeTab === 'variants' && editingId && (
                <VariantsEditor productId={editingId} basePrice={form.price} />
              )}

              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold" style={{ color: BRAND.primary }}>إعدادات SEO</h3>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-xs text-gray-500">عنوان SEO</label><span className="text-xs text-gray-400">{form.seoTitle.length}/60</span></div>
                    <input value={form.seoTitle} onChange={e => setForm({ ...form, seoTitle: e.target.value })} maxLength={60}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-xs text-gray-500">وصف SEO</label><span className="text-xs text-gray-400">{form.seoDescription.length}/160</span></div>
                    <textarea value={form.seoDescription} onChange={e => setForm({ ...form, seoDescription: e.target.value })} maxLength={160} rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none transition" style={{ borderColor: '#ECE6F0' }} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">رابط URL</label>
                    <input value={form.seoSlug} onChange={e => setForm({ ...form, seoSlug: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} placeholder="product-url-slug" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 transition text-gray-600"
                  style={{ borderColor: '#ECE6F0' }}>
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'جارٍ الحفظ…' : editingId ? 'حفظ التغييرات' : 'إنشاء المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
