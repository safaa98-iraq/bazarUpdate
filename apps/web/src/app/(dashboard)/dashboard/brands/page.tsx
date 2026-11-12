'use client';

import { useT } from '@/lib/i18n';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { BadgeCheck, Plus, Trash2, Loader2, Upload, X, Building2, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Plan, getFeatureLimit } from '@/lib/plan-features';
import { PlanGate } from '@/components/ui/PlanGate';
import { trackPage, track } from '@/lib/track';
import type { BrandPublic } from '@storebuilder/types';

const B = { p: '#0B3550', a: '#20A9F4', border: '#E3F5FE', bg: '#F6F8FA', soft: '#F6F8FA' };

function BrandsPageContent() {
  const t = useT();
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const limit = getFeatureLimit(plan, 'brands');
  const unlimited = limit === null || limit === undefined;

  const [brands, setBrands] = useState<BrandPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { trackPage('brands'); }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: BrandPublic[] }>('/api/brands')
      .then(r => setBrands(r.data ?? []))
      .catch(() => toast.error(t("فشل تحميل الماركات")))
      .finally(() => setLoading(false));
  }, []);

  const atLimit = !unlimited && brands.length >= (limit ?? 0);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('images', files[0]);
      const res = await api.upload<{ success: boolean; data: { urls: string[] } }>('/api/upload', fd);
      setImage(res.data.urls[0]);
    } catch { toast.error(t("فشل رفع الصورة")); }
    finally { setUploading(false); }
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (atLimit) { toast.error(t("وصلت للحد الأقصى ({0} ماركات) في باقتك الحالية", [limit])); return; }
    setAdding(true);
    try {
      const res = await api.post<{ success: boolean; data: BrandPublic }>('/api/brands', { name: trimmed, image: image || undefined });
      setBrands(prev => [res.data, ...prev]);
      setName(''); setImage('');
      inputRef.current?.focus();
      toast.success(t("تم إضافة ماركة \"{0}\"", [trimmed]));
      track({ event: 'brand_added' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("فشل إضافة الماركة"));
    } finally { setAdding(false); }
  };

  const handleDelete = async (brand: BrandPublic) => {
    if (!confirm(t("حذف ماركة \"{0}\"؟ ستُزال من جميع المنتجات المرتبطة بها.", [brand.name]))) return;
    setDeletingId(brand.id);
    try {
      await api.delete(`/api/brands/${brand.id}`);
      setBrands(prev => prev.filter(b => b.id !== brand.id));
      toast.success(t("تم حذف \"{0}\"", [brand.name]));
    } catch { toast.error(t("فشل حذف الماركة")); }
    finally { setDeletingId(null); }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#E6ECF1' }} />)}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${B.a}15` }}>
          <BadgeCheck className="h-5 w-5" style={{ color: B.a }} />
        </div>
        <div>
          <h1 className="bz-large-title text-gray-900">{t("الماركات التجارية")}</h1>
          <p className="text-sm text-gray-500">{t("نظّم منتجاتك حسب الماركة، ويستطيع الزبون تصفّح منتجات كل ماركة")}</p>
        </div>
        <div className="mr-auto">
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: B.bg, color: B.p }}>
            {brands.length}{unlimited ? '' : ` / ${limit}`}
          </span>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-6 text-sm leading-relaxed" style={{ background: B.soft, border: `1px solid ${B.border}` }}>
        <p className="font-semibold mb-1" style={{ color: B.p }}>{t("كيف تعمل الماركات؟")}</p>
        <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
          <li>{t("أضف ماركة باسم وصورة شعار (اختيارية)")}</li>
          <li>{t("عند إضافة منتج يمكنك ربطه بماركة من قائمة المنتجات")}</li>
          <li>{t("أضف قسم \"الماركات\" من لوحة تصميم المتجر ليظهر في متجرك")}</li>
        </ul>
      </div>

      <div className="rounded-2xl p-5 mb-4" style={{ background: '#fff', border: `1.5px solid ${B.border}`, boxShadow: '0 2px 12px rgba(67,46,84,.06)' }}>
        <p className="text-sm font-bold mb-3" style={{ color: B.p }}>{t("إضافة ماركة جديدة")}</p>
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center border-2 flex-shrink-0 transition"
            style={{ borderColor: image ? B.a : B.border, background: image ? '#fff' : B.bg }}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: B.a }} />
              : image ? <Image src={image} alt="" width={56} height={56} className="w-full h-full object-contain" />
              : <Upload className="h-4 w-4" style={{ color: B.a }} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
          <div className="flex-1">
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={t("مثال: نايكي، سامسونج…")}
              disabled={atLimit || adding}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${B.border}`,
                fontSize: 14, outline: 'none', fontFamily: 'inherit', background: atLimit ? '#fafafa' : '#fff',
                color: '#0B3550',
              }}
            />
            <p className="text-xs text-gray-400 mt-1">{t("شعار الماركة اختياري — 400×400 بكسل يعطي أفضل نتيجة")}</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || atLimit || adding}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition"
          style={{
            border: 'none', cursor: !name.trim() || atLimit || adding ? 'not-allowed' : 'pointer',
            background: !name.trim() || atLimit || adding ? '#E6ECF1' : `linear-gradient(135deg, #20A9F4, #0E8AD6)`,
            color: !name.trim() || atLimit || adding ? '#A3B0BC' : '#fff',
          }}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          
          {t("إضافة الماركة")}
        </button>
        {atLimit && (
          <p className="text-xs mt-2" style={{ color: B.a }}>
            
            {t("وصلت للحد الأقصى (")}{limit} {' '}{t("ماركات) —")}{' '}
            <Link href="/dashboard/upgrade" className="font-bold underline">{t("ارفع باقتك")}</Link>
            {' '}{t("لإضافة المزيد")}
          </p>
        )}
      </div>

      {brands.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#fff', border: `1.5px dashed ${B.border}` }}>
          <BadgeCheck className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: B.p }} />
          <p className="font-semibold text-gray-500">{t("لا توجد ماركات بعد")}</p>
          <p className="text-sm text-gray-400 mt-1">{t("أضف ماركة من الحقل أعلاه")}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1.5px solid ${B.border}`, boxShadow: '0 2px 12px rgba(67,46,84,.06)' }}>
          {brands.map((brand, i) => (
            <div key={brand.id} className="flex items-center gap-3 px-5 py-3.5"
              style={{ borderBottom: i < brands.length - 1 ? `1px solid ${B.border}` : 'none' }}>
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: B.bg }}>
                {brand.image
                  ? <Image src={brand.image} alt={brand.name} width={36} height={36} className="w-full h-full object-contain" />
                  : <Building2 className="h-4 w-4" style={{ color: B.p }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: B.p }}>{brand.name}</p>
                <p className="text-xs text-gray-400 truncate">{brand.productCount ?? 0} {' '}{t("منتج")}</p>
              </div>
              <button
                onClick={() => handleDelete(brand)}
                disabled={deletingId === brand.id}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-50"
                style={{ border: '1px solid #F5A3A3', background: 'transparent', cursor: deletingId === brand.id ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                title={t("حذف")}>
                {deletingId === brand.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                  : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {brands.length > 0 && (
        <div className="mt-5 rounded-2xl p-4 flex items-center gap-3" style={{ background: B.bg, border: `1px solid ${B.border}` }}>
          <Package className="h-4 w-4 flex-shrink-0" style={{ color: B.p }} />
          <p className="text-sm text-gray-600 flex-1">{t("يمكنك الآن ربط منتجاتك بهذه الماركات")}</p>
          <Link href="/dashboard/products" className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: B.p }}>
            
            {t("إدارة المنتجات")}
          </Link>
        </div>
      )}
    </div>
  );
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function BrandsPage() {
  const t = useT();
  useDocumentTitle(t("الماركات"));
  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <PlanGate feature="brands">
        <BrandsPageContent />
      </PlanGate>
    </div>
  );
}
