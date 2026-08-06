'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Globe, Eye, EyeOff, Upload, Loader2, X, Check, Zap, Crown, Building2, Lock, Instagram, Facebook, Truck, Plus, MapPin, LinkIcon, ShieldCheck, Copy } from 'lucide-react';
import Image from 'next/image';
import { STORE_TYPES } from '@/lib/store-types';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Plan, PLAN_LABELS, PLAN_COLORS } from '@/lib/plan-features';
import { trackPage, track } from '@/lib/track';
import { PlanPrice } from '@/components/pricing/PlanPrice';
import { PlanGate } from '@/components/ui/PlanGate';
import type { StoreSocialLinks, StoreDeliveryZone } from '@storebuilder/types';
import { IRAQI_GOVERNORATES } from '@storebuilder/types';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

interface Store {
  id: string; name: string; slug: string; description: string | null;
  theme: string; template: string; isPublished: boolean; logo: string | null;
  storeType: string; currency: string; socialLinks?: StoreSocialLinks;
  deliveryZones?: StoreDeliveryZone[];
  customDomain?: string | null; customDomainVerified?: boolean;
  defaultSizeGuide?: string | null;
}

function WhatsAppGlyph({ size = 18, color = '#25D366' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.35 5.06L2 22l5.06-1.32A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm5.2 14.15c-.22.62-1.28 1.18-1.77 1.24-.45.06-1.02.08-1.65-.1-.38-.11-.87-.28-1.5-.55-2.64-1.14-4.36-3.79-4.5-3.97-.13-.18-1.08-1.44-1.08-2.74 0-1.3.68-1.94.93-2.2.24-.27.53-.33.7-.33h.5c.16 0 .38-.06.6.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.13.29-.26.44-.13.16-.28.35-.4.47-.13.13-.27.28-.12.55.15.27.68 1.11 1.46 1.79 1 .88 1.85 1.15 2.11 1.28.27.13.42.11.58-.07.16-.18.67-.78.85-1.05.18-.27.36-.22.6-.13.24.09 1.53.72 1.79.85.27.13.44.2.51.31.07.13.07.71-.15 1.33Z" />
    </svg>
  );
}
function TikTokGlyph({ size = 18, color = '#000' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M16.8 2h-3.2v13.4a2.6 2.6 0 1 1-1.9-2.5V9.3a6 6 0 1 0 5.1 5.94V9.1a7.3 7.3 0 0 0 4.2 1.34V7.14A4.4 4.4 0 0 1 16.8 2Z" />
    </svg>
  );
}
function SnapchatGlyph({ size = 18, color = '#000' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M12 2a7 7 0 0 1 7 7c0 3.5 1 5 2 6l-2 1v1c-2 1-4 1-5 1a4.4 4.4 0 0 1-4 2 4.4 4.4 0 0 1-4-2c-1 0-3 0-5-1v-1l-2-1c1-1 2-2.5 2-6a7 7 0 0 1 7-7z" />
    </svg>
  );
}

const SOCIAL_FIELDS: { key: keyof Omit<StoreSocialLinks, 'deliveryPartners'>; label: string; placeholder: string; prefix?: string; bg: string; icon: React.ReactNode; dir?: 'ltr' | 'rtl' }[] = [
  { key: 'instagram', label: 'إنستغرام', placeholder: 'اسم_المستخدم', prefix: '@', bg: 'linear-gradient(135deg,#833AB4,#DB6E93,#F5A623)', icon: <Instagram size={18} color="#fff" strokeWidth={2} />, dir: 'ltr' },
  { key: 'whatsapp', label: 'واتساب', placeholder: '+9647xxxxxxxxx', bg: '#25D366', icon: <WhatsAppGlyph size={18} />, dir: 'ltr' },
  { key: 'facebook', label: 'فيسبوك', placeholder: 'https://facebook.com/اسم_الصفحة', bg: '#1877F2', icon: <Facebook size={16} color="#fff" strokeWidth={2} />, dir: 'ltr' },
  { key: 'tiktok', label: 'تيك توك', placeholder: 'اسم_المستخدم', prefix: '@', bg: '#000', icon: <TikTokGlyph size={18} color="#fff" />, dir: 'ltr' },
  { key: 'snapchat', label: 'سناب شات', placeholder: 'اسم_المستخدم', prefix: '@', bg: '#FFFC00', icon: <SnapchatGlyph size={18} color="#000" />, dir: 'ltr' },
];

const THEMES = [
  { color: '#2F2E4B', label: 'بنفسجي' }, { color: '#DB6E93', label: 'وردي' },
  { color: '#4A4767', label: 'نيلي' },   { color: '#1a7f5a', label: 'أخضر' },
  { color: '#1d4ed8', label: 'أزرق' },   { color: '#b45309', label: 'برتقالي' },
];

const CURRENCIES = [
  { value: 'IQD', label: 'دينار عراقي (د.ع)' },
  { value: 'USD', label: 'دولار أمريكي ($)' },
  { value: 'SAR', label: 'ريال سعودي (ر.س)' },
  { value: 'AED', label: 'درهم إماراتي (د.إ)' },
  { value: 'KWD', label: 'دينار كويتي (د.ك)' },
  { value: 'BHD', label: 'دينار بحريني (د.ب)' },
  { value: 'QAR', label: 'ريال قطري (ر.ق)' },
  { value: 'OMR', label: 'ريال عُماني (ر.ع)' },
  { value: 'EGP', label: 'جنيه مصري (ج.م)' },
  { value: 'JOD', label: 'دينار أردني (د.أ)' },
];

function LogoUploader({ logo, onChange }: { logo: string | null; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('images', files[0]);
      const res = await api.upload<{ success: boolean; data: { urls: string[] } }>('/api/upload', fd);
      onChange(res.data.urls[0]);
      toast.success('تم رفع الشعار بنجاح');
    } catch { toast.error('فشل رفع الشعار'); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: BRAND.primary }}>شعار المتجر</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center border-2 flex-shrink-0"
          style={{ borderColor: logo ? BRAND.accent : '#ECE6F0', background: logo ? 'white' : '#F5EFFA' }}>
          {logo ? <Image src={logo} alt="logo" width={80} height={80} className="w-full h-full object-contain" />
                : <Building2 size={30} style={{ color: BRAND.accent }} />}
        </div>
        <div className="space-y-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition hover:bg-purple-50"
            style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'جارٍ الرفع…' : 'رفع شعار'}
          </button>
          {logo && (
            <button type="button" onClick={() => onChange('')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border hover:bg-red-50 text-red-500"
              style={{ borderColor: '#fca5a5' }}>
              <X className="h-4 w-4" /> حذف
            </button>
          )}
          <p className="text-xs text-gray-400">PNG أو JPG • 800×800 بكسل بحد أقصى</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
      </div>
    </div>
  );
}

const PLAN_DEFS = [
  {
    id: 'FREE' as Plan,
    icon: <Globe className="h-5 w-5" />,
    color: '#6B7280',
    planKey: 'FREE' as const,
    features: [
      { label: '55 منتج', ok: true },
      { label: '3 تصنيفات', ok: true },
      { label: 'أكواد خصم', ok: false },
      { label: 'متجر عام', ok: true },
      { label: 'تحليلات متقدمة', ok: false },
      { label: 'مؤثرون', ok: false },
      { label: 'محادثات', ok: false },
    ],
    cta: null,
  },
  {
    id: 'PRO' as Plan,
    icon: <Zap className="h-5 w-5" />,
    color: '#7C3AED',
    planKey: 'PRO' as const,
    badge: 'الأكثر شعبية',
    features: [
      { label: 'منتجات غير محدودة', ok: true },
      { label: 'تصنيفات غير محدودة', ok: true },
      { label: 'كود خصم واحد', ok: true },
      { label: '5 ماركات تجارية', ok: true },
      { label: 'نوع متجر متخصص', ok: true },
      { label: 'تحليلات متقدمة', ok: true },
      { label: '10 مؤثرين', ok: true },
      { label: 'نظام محادثات', ok: true },
    ],
    cta: 'ارفع إلى PRO',
  },
  {
    id: 'ENTERPRISE' as Plan,
    icon: <Building2 className="h-5 w-5" />,
    color: '#D97706',
    planKey: 'ENTERPRISE' as const,
    features: [
      { label: 'منتجات غير محدودة', ok: true },
      { label: 'تصنيفات غير محدودة', ok: true },
      { label: '5 أكواد خصم', ok: true },
      { label: 'ماركات تجارية غير محدودة', ok: true },
      { label: 'التعليق على المنتجات', ok: true },
      { label: 'نوع متجر متخصص', ok: true },
      { label: 'تحليلات متقدمة', ok: true },
      { label: 'مؤثرون غير محدودون', ok: true },
      { label: 'نظام محادثات', ok: true },
      { label: 'نطاق مخصص', ok: true },
    ],
    cta: 'تواصل للترقية',
  },
];

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function SettingsPage() {
  useDocumentTitle('إعدادات المتجر');
  const searchParams = useSearchParams();
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const planColors = PLAN_COLORS[plan];
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'type' | 'design' | 'social' | 'delivery' | 'domain' | 'billing'>(
    (searchParams.get('tab') as 'basic' | 'type' | 'design' | 'social' | 'delivery' | 'domain' | 'billing') ?? 'basic'
  );
  const [form, setForm] = useState({
    name: '', slug: '', description: '', theme: BRAND.primary,
    template: 'minimal', logo: '' as string | null,
    storeType: 'fashion', currency: 'IQD',
    socialLinks: {} as StoreSocialLinks,
    deliveryZones: [] as StoreDeliveryZone[],
    domainInput: '',
    defaultSizeGuide: '',
  });
  const [newPartner, setNewPartner] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { trackPage('settings'); }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: Store }>('/api/stores/my')
      .then(res => {
        if (res.data) {
          setStore(res.data);
          setForm({
            name: res.data.name, slug: res.data.slug,
            description: res.data.description ?? '',
            theme: res.data.theme, template: res.data.template,
            logo: res.data.logo, storeType: res.data.storeType ?? 'fashion',
            currency: res.data.currency ?? 'SAR',
            socialLinks: res.data.socialLinks ?? {},
            deliveryZones: res.data.deliveryZones ?? [],
            domainInput: res.data.customDomain ?? '',
            defaultSizeGuide: res.data.defaultSizeGuide ?? '',
          });
        }
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {
        name: form.name, description: form.description || undefined,
        theme: form.theme, template: form.template, logo: form.logo || undefined,
        storeType: form.storeType, currency: form.currency,
        socialLinks: form.socialLinks,
        deliveryZones: form.deliveryZones,
        defaultSizeGuide: form.defaultSizeGuide || undefined,
        ...(!store ? { slug: form.slug } : {}),
      };
      if (store) {
        const res = await api.patch<{ success: boolean; data: Store }>('/api/stores/my', body);
        setStore(res.data);
        toast.success('تم حفظ الإعدادات ✓');
        track({ event: 'settings_saved' });
      } else {
        const res = await api.post<{ success: boolean; data: Store }>('/api/stores', { ...body, slug: form.slug });
        setStore(res.data);
        toast.success('تم إنشاء المتجر!');
        track({ event: 'settings_saved' });
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const togglePublish = async () => {
    if (!store) return; setPublishing(true);
    try {
      const res = await api.patch<{ success: boolean; data: Store }>('/api/stores/my', { isPublished: !store.isPublished });
      setStore(res.data);
      toast.success(res.data.isPublished ? 'المتجر الآن مباشر!' : 'تم إيقاف نشر المتجر');
    } catch { toast.error('فشل'); }
    finally { setPublishing(false); }
  };

  const saveDomain = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: Store }>('/api/stores/my', { customDomain: form.domainInput.trim() || null });
      setStore(res.data);
      toast.success('تم حفظ النطاق — أضف سجل التحقق ثم اضغط "تحقق الآن"');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const verifyDomain = async () => {
    setVerifying(true);
    try {
      const res = await api.post<{ success: boolean; data: Store }>('/api/stores/my/verify-domain', {});
      setStore(res.data);
      toast.success('تم التحقق من النطاق بنجاح! متجرك الآن متاح عليه');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل التحقق'); }
    finally { setVerifying(false); }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#F0E7F8' }} />)}
    </div>
  );

  const selectedTypeConfig = STORE_TYPES.find(t => t.id === form.storeType);

  return (
    <div className="p-6 max-w-3xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>إعدادات المتجر</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store ? 'إدارة إعدادات متجرك' : 'أنشئ متجرك للبدء'}</p>
        </div>
        {store && (
          <button onClick={togglePublish} disabled={publishing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition ${store.isPublished ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : store.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {store.isPublished ? 'إيقاف النشر' : 'نشر المتجر'}
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-2xl overflow-x-auto" style={{ background: '#F5EFFA' }}>
        {[['basic', 'الأساسية'], ['type', 'النوع'], ['design', 'التصميم'], ['social', 'التواصل'], ['delivery', 'مناطق التوصيل'], ['domain', 'النطاق المخصص'], ['billing', 'الخطة']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as 'basic' | 'type' | 'design' | 'social' | 'delivery' | 'domain' | 'billing')}
            className="flex-shrink-0 py-2 px-3 rounded-xl text-sm font-medium transition whitespace-nowrap"
            style={{ background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? BRAND.primary : '#9ca3af', boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {activeTab === 'basic' && (
          <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: '#ECE6F0' }}>
            <LogoUploader logo={form.logo} onChange={url => setForm(f => ({ ...f, logo: url }))} />

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>اسم المتجر *</label>
              <input value={form.name} onChange={e => {
                const name = e.target.value;
                setForm(f => ({
                  ...f, name,
                  slug: !store ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-') : f.slug,
                }));
              }} required placeholder="مثال: متجر الأناقة"
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition"
                style={{ borderColor: '#ECE6F0' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>رابط المتجر</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: '#ECE6F0' }}>
                <span className="text-sm text-gray-400">/store/</span>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  disabled={!!store} placeholder="my-store"
                  className="flex-1 text-sm focus:outline-none bg-transparent" style={{ color: BRAND.primary, direction: 'ltr' }} />
              </div>
              {store && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Globe className="h-3 w-3" /> لا يمكن تغيير الرابط بعد الإنشاء</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>وصف المتجر</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="أخبر عملاءك عن متجرك…"
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none transition"
                style={{ borderColor: '#ECE6F0' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>العملة</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition"
                style={{ borderColor: '#ECE6F0' }}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>دليل المقاسات العام (اختياري)</label>
              <textarea value={form.defaultSizeGuide} onChange={e => setForm(f => ({ ...f, defaultSizeGuide: e.target.value }))}
                rows={4} placeholder="مثال: S: 36-38 / M: 40-42 / L: 44-46 ..."
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none transition"
                style={{ borderColor: '#ECE6F0' }} />
              <p className="text-xs text-gray-400 mt-1">يظهر بصفحة أي منتج ما عنده دليل مقاسات خاص به</p>
            </div>
          </div>
        )}

        {activeTab === 'type' && (
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#ECE6F0' }}>
            <h2 className="font-bold mb-1" style={{ color: BRAND.primary }}>نوع المتجر</h2>
            <p className="text-xs text-gray-400 mb-4">يحدد نوع المتجر وحدات قياس المنتجات والقوالب المقترحة</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STORE_TYPES.map(type => (
                <button key={type.id} type="button" onClick={() => setForm(f => ({ ...f, storeType: type.id, theme: type.themeColor }))}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition hover:shadow-md"
                  style={{ borderColor: form.storeType === type.id ? type.themeColor : '#ECE6F0', background: form.storeType === type.id ? `${type.themeColor}08` : 'white' }}>
                  {form.storeType === type.id && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: type.themeColor }}>
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <type.icon size={28} style={{ color: form.storeType === type.id ? type.themeColor : BRAND.secondary }} />
                  <span className="text-xs font-bold" style={{ color: form.storeType === type.id ? type.themeColor : BRAND.primary }}>{type.label}</span>
                  <span className="text-xs text-gray-400 leading-tight">{type.description}</span>
                </button>
              ))}
            </div>

            {selectedTypeConfig && (
              <div className="mt-5 p-4 rounded-2xl" style={{ background: `${selectedTypeConfig.themeColor}08`, border: `1.5px solid ${selectedTypeConfig.themeColor}20` }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: selectedTypeConfig.themeColor }}>
                  <selectedTypeConfig.icon size={14} /> وحدات القياس المتاحة لـ &quot;{selectedTypeConfig.label}&quot;
                </p>
                <div className="flex gap-2 flex-wrap">
                  {selectedTypeConfig.unitOptions.map(u => (
                    <span key={u.value} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: `${selectedTypeConfig.themeColor}15`, color: selectedTypeConfig.themeColor }}>
                      {u.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">تصنيفات مقترحة: {selectedTypeConfig.sampleCategories.join('، ')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'design' && (
          <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: '#ECE6F0' }}>
            <div>
              <h2 className="font-bold mb-3" style={{ color: BRAND.primary }}>لون العلامة التجارية</h2>
              <div className="grid grid-cols-6 gap-3 mb-4">
                {THEMES.map(t => (
                  <button key={t.color} type="button" onClick={() => setForm(f => ({ ...f, theme: t.color }))}
                    className="flex flex-col items-center gap-1.5 group">
                    <div className="w-10 h-10 rounded-xl border-2 transition group-hover:scale-110 flex items-center justify-center"
                      style={{ background: t.color, borderColor: form.theme === t.color ? '#333' : 'transparent' }}>
                      {form.theme === t.color && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-xs text-gray-500">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                  className="h-10 w-20 rounded-xl border cursor-pointer" style={{ borderColor: '#ECE6F0' }} />
                <span className="text-sm font-mono text-gray-500">{form.theme}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: '#ECE6F0' }}>
            <div>
              <h2 className="font-bold mb-1" style={{ color: BRAND.primary }}>حسابات التواصل الاجتماعي</h2>
              <p className="text-xs text-gray-400 mb-4">اربط حساباتك ليظهر رابط مباشر لها في متجرك — يستطيع زبائنك التواصل معك أو متابعتك بضغطة واحدة.</p>
            </div>

            {SOCIAL_FIELDS.map(f => (
              <div key={f.key}>
                <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: f.bg }}>{f.icon}</span>
                  {f.label}
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: '#ECE6F0' }}>
                  {f.prefix && <span className="text-sm text-gray-400 flex-shrink-0">{f.prefix}</span>}
                  <input
                    value={form.socialLinks[f.key] ?? ''}
                    onChange={e => setForm(s => ({ ...s, socialLinks: { ...s.socialLinks, [f.key]: e.target.value } }))}
                    placeholder={f.placeholder} dir={f.dir}
                    className="flex-1 text-sm focus:outline-none bg-transparent" style={{ color: BRAND.primary, direction: f.dir }} />
                </div>
              </div>
            ))}

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFF3C7' }}>
                  <Truck size={16} color={BRAND.accent} />
                </span>
                شركات التوصيل
              </label>
              <p className="text-xs text-gray-400 mb-2">أضف أسماء شركات التوصيل التي تتعامل معها — تظهر لزبائنك كخيارات توصيل موثوقة.</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.socialLinks.deliveryPartners ?? []).map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: BRAND.light, color: BRAND.primary }}>
                    {p}
                    <button type="button" onClick={() => setForm(s => ({ ...s, socialLinks: { ...s.socialLinks, deliveryPartners: (s.socialLinks.deliveryPartners ?? []).filter((_, j) => j !== i) } }))}
                      className="hover:opacity-70">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={newPartner} onChange={e => setNewPartner(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const name = newPartner.trim();
                    if (!name || (form.socialLinks.deliveryPartners ?? []).length >= 10) return;
                    setForm(s => ({ ...s, socialLinks: { ...s.socialLinks, deliveryPartners: [...(s.socialLinks.deliveryPartners ?? []), name] } }));
                    setNewPartner('');
                  }}
                  placeholder="مثال: زاجل" maxLength={50}
                  className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
                <button type="button"
                  onClick={() => {
                    const name = newPartner.trim();
                    if (!name || (form.socialLinks.deliveryPartners ?? []).length >= 10) return;
                    setForm(s => ({ ...s, socialLinks: { ...s.socialLinks, deliveryPartners: [...(s.socialLinks.deliveryPartners ?? []), name] } }));
                    setNewPartner('');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border-2 flex-shrink-0 transition"
                  style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
                  <Plus size={16} /> إضافة
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#ECE6F0' }}>
            <div>
              <h2 className="font-bold mb-1 flex items-center gap-2" style={{ color: BRAND.primary }}>
                <MapPin size={18} /> مناطق التوصيل
              </h2>
              <p className="text-xs text-gray-400">
                فعّل المحافظات التي توصّل إليها وحدد سعر التوصيل لكل واحدة. عند الطلب، يختار الزبون محافظته ويُضاف سعر التوصيل تلقائياً للمجموع. المحافظات غير المفعّلة لن تظهر للزبون كخيار توصيل.
              </p>
            </div>

            <div className="divide-y" style={{ borderColor: '#ECE6F0' }}>
              {IRAQI_GOVERNORATES.map(gov => {
                const zone = form.deliveryZones.find(z => z.governorate === gov);
                const enabled = Boolean(zone);
                return (
                  <div key={gov} className="flex items-center gap-3 py-3">
                    <button type="button"
                      onClick={() => setForm(s => ({
                        ...s,
                        deliveryZones: enabled
                          ? s.deliveryZones.filter(z => z.governorate !== gov)
                          : [...s.deliveryZones, { governorate: gov, price: 0 }],
                      }))}
                      className="w-10 h-6 rounded-full flex-shrink-0 relative transition"
                      style={{ background: enabled ? BRAND.accent : '#ECE6F0' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ [enabled ? 'right' : 'left']: 2 } as React.CSSProperties} />
                    </button>
                    <span className="flex-1 text-sm font-medium" style={{ color: enabled ? BRAND.primary : '#9ca3af' }}>{gov}</span>
                    {enabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={0} step={250}
                          value={zone?.price ?? 0}
                          onChange={e => {
                            const price = Math.max(0, Number(e.target.value) || 0);
                            setForm(s => ({
                              ...s,
                              deliveryZones: s.deliveryZones.map(z => z.governorate === gov ? { ...z, price } : z),
                            }));
                          }}
                          className="w-24 px-2.5 py-1.5 rounded-lg border text-sm text-left focus:outline-none"
                          style={{ borderColor: '#ECE6F0', direction: 'ltr' }} />
                        <span className="text-xs text-gray-400 flex-shrink-0">د.ع</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {form.deliveryZones.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: BRAND.accent }}>
                لم تفعّل أي محافظة بعد — سيستطيع كل الزبائن الطلب بلا رسوم توصيل حتى تفعّل محافظة واحدة على الأقل.
              </p>
            )}
          </div>
        )}

        {activeTab === 'domain' && (
          <PlanGate feature="custom_domain">
            <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: '#ECE6F0' }}>
              <div>
                <h2 className="font-bold mb-1 flex items-center gap-2" style={{ color: BRAND.primary }}>
                  <LinkIcon size={18} /> النطاق المخصص
                </h2>
                <p className="text-xs text-gray-400">اربط متجرك بنطاقك الخاص بدلاً من رابط بازار الافتراضي.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>النطاق</label>
                <div className="flex gap-2">
                  <input value={form.domainInput} onChange={e => setForm(f => ({ ...f, domainInput: e.target.value }))}
                    placeholder="shop.mystore.com" dir="ltr"
                    className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: '#ECE6F0', textAlign: 'left' }} />
                  <button type="button" onClick={saveDomain} disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                    style={{ background: BRAND.primary }}>
                    {saving ? <Loader2 size={15} className="animate-spin" /> : 'حفظ'}
                  </button>
                </div>
              </div>

              {store?.customDomain && (
                <div className="rounded-2xl p-4" style={{ background: store.customDomainVerified ? '#DCEEDA' : '#FFF3C7' }}>
                  {store.customDomainVerified ? (
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} style={{ color: '#3D7C56' }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#3D7C56' }}>النطاق متصل ويعمل</p>
                        <a href={`https://${store.customDomain}`} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: '#3D7C56' }}>
                          {store.customDomain}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold mb-2" style={{ color: '#92400E' }}>بانتظار التحقق من ملكية النطاق</p>
                      <p className="text-xs mb-3" style={{ color: '#92400E' }}>
                        أضف سجل DNS من نوع TXT في إعدادات نطاقك ({store.customDomain}) بالقيم التالية، ثم اضغط تحقق الآن (قد يستغرق الانتشار بعض الوقت):
                      </p>
                      <div className="bg-white rounded-xl p-3 space-y-2 text-xs font-mono" dir="ltr">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400">Name/Host:</span>
                          <span className="flex items-center gap-1">
                            _bazar-verify.{store.customDomain}
                            <button type="button" onClick={() => { navigator.clipboard.writeText(`_bazar-verify.${store.customDomain}`); toast.success('تم النسخ'); }}>
                              <Copy size={12} className="text-gray-400" />
                            </button>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400">Type:</span>
                          <span>TXT</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400">Value:</span>
                          <span className="flex items-center gap-1">
                            bazar-verify={store.id}
                            <button type="button" onClick={() => { navigator.clipboard.writeText(`bazar-verify=${store!.id}`); toast.success('تم النسخ'); }}>
                              <Copy size={12} className="text-gray-400" />
                            </button>
                          </span>
                        </div>
                      </div>
                      <button type="button" onClick={verifyDomain} disabled={verifying}
                        className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
                        style={{ background: BRAND.accent }}>
                        {verifying ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'تحقق الآن'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PlanGate>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-5">
            <div className="rounded-2xl border p-4 flex items-center gap-3"
              style={{ background: `${planColors.bg}`, borderColor: planColors.border }}>
              <Crown className="h-5 w-5 flex-shrink-0" style={{ color: planColors.text }} />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: planColors.text }}>خطتك الحالية: {PLAN_LABELS[plan]}</p>
                <p className="text-xs mt-0.5" style={{ color: planColors.text, opacity: 0.75 }}>
                  {plan === 'FREE' && 'ارفع خطتك للحصول على ميزات متقدمة'}
                  {plan === 'PRO' && 'استمتع بجميع ميزات الخطة الاحترافية'}
                  {plan === 'ENTERPRISE' && 'لديك وصول كامل لجميع الميزات'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLAN_DEFS.map(p => {
                const isCurrent = plan === p.id;
                return (
                  <div key={p.id} className="relative rounded-2xl border-2 overflow-hidden transition"
                    style={{ borderColor: isCurrent ? p.color : '#ECE6F0', background: isCurrent ? `${p.color}06` : 'white' }}>
                    {p.badge && (
                      <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ background: p.color }}>{p.badge}</div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ background: p.color }}>
                        <Check className="h-3 w-3" /> خطتك
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${p.color}15`, color: p.color }}>
                          {p.icon}
                        </div>
                        <span className="font-bold" style={{ color: p.color }}>{PLAN_LABELS[p.id]}</span>
                      </div>
                      <div className="mb-4">
                        <PlanPrice plan={p.planKey} align="right" compact />
                      </div>
                      <div className="space-y-2 mb-5">
                        {p.features.map(f => (
                          <div key={f.label} className="flex items-center gap-2">
                            {f.ok
                              ? <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: p.color }} />
                              : <Lock className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />}
                            <span className={`text-xs ${f.ok ? 'text-gray-700' : 'text-gray-400'}`}>{f.label}</span>
                          </div>
                        ))}
                      </div>
                      {p.cta && !isCurrent && (
                        <button
                          onClick={() => toast.info('للترقية تواصل مع الدعم عبر البريد الإلكتروني')}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                          style={{ background: `linear-gradient(135deg, ${p.color}, ${BRAND.accent})` }}>
                          {p.cta}
                        </button>
                      )}
                      {isCurrent && (
                        <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center border-2"
                          style={{ borderColor: p.color, color: p.color }}>
                          خطتك الحالية
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl p-4 text-center" style={{ background: '#F5EFFA' }}>
              <p className="text-xs text-gray-500">جميع الخطط تشمل متجراً إلكترونياً كاملاً مع بوابة دفع آمنة وشهادة SSL</p>
            </div>
          </div>
        )}

        {activeTab !== 'billing' && activeTab !== 'domain' && (
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'جارٍ الحفظ…' : store ? 'حفظ الإعدادات' : 'إنشاء المتجر'}
        </button>
        )}

        {store?.isPublished && (
          <div className="text-center">
            <a href={`/store/${store.slug}`} target="_blank"
              className="text-sm font-medium" style={{ color: BRAND.accent }}>
              عرض المتجر المباشر: /store/{store.slug} →
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
