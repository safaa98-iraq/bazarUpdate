'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Monitor, Smartphone, Tablet, Eye, Rocket, ChevronUp, ChevronDown,
  Trash2, EyeOff, Plus, Palette, LayoutTemplate, Layers, Settings2,
  GripVertical, X, Check, ArrowRight, Upload, Loader2, HelpCircle, Info,
  Star, Image as ImageIcon, Tag, Lock, Megaphone,
  Target, ShoppingBag, FolderOpen, Store, Minus, MessageCircle, Mail,
  Home, Package, ShoppingCart, CheckCircle2,
  Ruler, MousePointerClick, Save, AlertTriangle, Lightbulb, BadgeCheck,
  Video, Crown,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Plan } from '@/lib/plan-features';
import { trackPage, track } from '@/lib/track';
import { FREE_PLAN_BUILDER_EDIT_LIMIT } from '@storebuilder/types';
import { type SectionType, type BuilderSection, BRAND, DEFAULT_SETTINGS, type StoreTemplate, STORE_TEMPLATES } from '@/lib/store-templates';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

const PLAN_RANK: Record<Plan, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

type Device = 'desktop' | 'tablet' | 'mobile';
type LeftTab = 'sections' | 'theme' | 'pages' | 'banners';
type PageKey = 'home' | 'product' | 'cart' | 'checkout';

interface Store {
  id: string; name: string; slug: string;
  theme: string; template: string; isPublished: boolean;
  builderConfig: string | null;
  builderEditCount?: number;
}

// Page-level configs stored as JSON keyed by PageKey
interface PagesConfig {
  home: BuilderSection[];
  product: BuilderSection[];
  cart: BuilderSection[];
  checkout: BuilderSection[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_TYPES: { type: SectionType; icon: LucideIcon; label: string; desc: string; minPlan?: 'PRO' | 'ENTERPRISE' }[] = [
  { type: 'hero',         icon: Target,        label: 'قسم البطل',        desc: 'بانر رئيسي مع عنوان وزر وصورة' },
  { type: 'products',     icon: ShoppingBag,   label: 'شبكة المنتجات',    desc: 'عرض منتجاتك بشكل جذاب' },
  { type: 'discount',     icon: Tag,           label: 'قسم الخصم',        desc: 'عرض كود خصم خاص' },
  { type: 'categories',   icon: FolderOpen,    label: 'التصنيفات',         desc: 'عرض أقسام متجرك' },
  { type: 'brands',       icon: BadgeCheck,    label: 'الماركات',          desc: 'عرض الماركات التجارية لمتجرك',  minPlan: 'PRO' },
  { type: 'announcement', icon: Megaphone,     label: 'شريط إعلاني',       desc: 'عروض وإعلانات مميزة' },
  { type: 'about',        icon: Store,         label: 'من نحن',            desc: 'نص تعريفي مع صورة' },
  { type: 'divider',      icon: Minus,         label: 'فاصل / مساحة',     desc: 'خط فاصل أو مسافة فارغة' },
  { type: 'features',     icon: Star,          label: 'مميزات المتجر',    desc: 'أبرز مزايا منتجاتك وخدمتك',    minPlan: 'PRO' },
  { type: 'testimonials', icon: MessageCircle, label: 'آراء العملاء',     desc: 'شهادات وتقييمات العملاء',       minPlan: 'PRO' },
  { type: 'gallery',      icon: ImageIcon,     label: 'معرض الصور',       desc: 'شبكة صور جذابة',               minPlan: 'PRO' },
  { type: 'newsletter',   icon: Mail,          label: 'النشرة البريدية',   desc: 'اجمع بريد عملائك',             minPlan: 'PRO' },
  { type: 'video',        icon: Video,         label: 'فيديو مضمّن',       desc: 'ضمّن فيديو يوتيوب أو ريلز — حصري لخطة الأعمال', minPlan: 'ENTERPRISE' },
];

const DEFAULT_HOME: BuilderSection[] = [
  { id: 'hero-default', type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero } },
  { id: 'products-default', type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products } },
  { id: 'newsletter-default', type: 'newsletter', visible: true, settings: { ...DEFAULT_SETTINGS.newsletter } },
];

const DEFAULT_PRODUCT_SECTIONS: BuilderSection[] = [
  { id: 'features-p', type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features } },
  { id: 'testimonials-p', type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials } },
];

const PAGE_LABELS: Record<PageKey, { icon: LucideIcon; label: string; desc: string }> = {
  home:     { icon: Home,         label: 'الصفحة الرئيسية',   desc: 'الواجهة الرئيسية للمتجر' },
  product:  { icon: Package,      label: 'صفحة المنتج',        desc: 'أقسام إضافية تحت المنتج' },
  cart:     { icon: ShoppingCart, label: 'صفحة السلة',          desc: 'تخصيص صفحة السلة' },
  checkout: { icon: CheckCircle2, label: 'صفحة الدفع',          desc: 'إضافات على صفحة الدفع' },
};

// ── Image Uploader (inline) ───────────────────────────────────────────────────

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
      toast.success('تم رفع الصورة');
    } catch { toast.error('فشل رفع الصورة'); }
    finally { setUploading(false); }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>{label}</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden mb-2" style={{ height: 100 }}>
          <Image src={value} alt={label} fill className="object-cover" />
          <button type="button" onClick={() => onChange('')}
            className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none transition"
          style={{ borderColor: '#ECE6F0' }} />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1 hover:bg-purple-50 transition"
          style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          رفع
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
    </div>
  );
}

// ── Section Preview ────────────────────────────────────────────────────────────

function SectionPreview({ section, isSelected, onClick, storeTheme }: {
  section: BuilderSection; isSelected: boolean; onClick: () => void; storeTheme: string;
}) {
  const s = section.settings;
  if (!section.visible) return (
    <div onClick={onClick}
      className={`relative border-2 border-dashed rounded-lg mx-2 my-1 h-12 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'border-[#DB6E93]' : 'border-gray-200'}`}
      style={{ background: '#F5EFFA' }}>
      <span className="text-xs text-gray-400 flex items-center gap-1.5"><EyeOff className="h-3 w-3" /> قسم مخفي</span>
    </div>
  );

  const sel = isSelected
    ? 'outline outline-2 outline-offset-2 outline-[#DB6E93]'
    : 'outline outline-2 outline-transparent hover:outline-[#4A4767] hover:outline-offset-1';

  switch (section.type) {
    case 'hero': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 relative ${sel}`}
        style={{
          background: s.backgroundImage ? `url(${s.backgroundImage}) center/cover` : String(s.backgroundColor ?? BRAND.primary),
          minHeight: s.height === 'fullscreen' ? 280 : s.height === 'large' ? 200 : s.height === 'medium' ? 140 : 100,
        }}>
        {s.backgroundImage && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Number(s.overlayOpacity ?? 40) / 100})` }} />}
        <div className="relative flex flex-col items-center justify-center h-full p-6 text-white text-center min-h-[inherit]">
          <p className="font-bold text-lg mb-1 drop-shadow">{String(s.title)}</p>
          <p className="text-sm opacity-80 mb-4">{String(s.subtitle)}</p>
          <span className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.25)' }}>{String(s.buttonText)}</span>
        </div>
      </div>
    );
    case 'discount': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: String(s.backgroundColor ?? BRAND.primary), padding: '20px 16px', textAlign: 'center' }}>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2" style={{ background: String(s.badgeColor ?? BRAND.accent), color: 'white' }}>
          {String(s.discountLabel)}
        </span>
        <p className="text-white font-bold mb-1">{String(s.title)}</p>
        <div className="inline-block px-4 py-2 rounded-xl font-mono font-bold text-sm mt-1"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', letterSpacing: 2 }}>
          {String(s.couponCode)}
        </div>
      </div>
    );
    case 'features': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#fff', padding: 16 }}>
        <p className="font-bold text-sm text-center mb-3" style={{ color: BRAND.primary }}>{String(s.title)}</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center p-2 rounded-xl" style={{ background: '#F5EFFA' }}>
              <div className="mb-1 flex justify-center">
                {s[`feature${i}Icon`]
                  ? <span className="text-lg">{String(s[`feature${i}Icon`])}</span>
                  : <Star className="h-4 w-4" style={{ color: BRAND.accent }} />}
              </div>
              <p className="text-xs font-semibold" style={{ color: BRAND.primary }}>{String(s[`feature${i}Title`] ?? '')}</p>
            </div>
          ))}
        </div>
      </div>
    );
    case 'testimonials': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#F5EFFA', padding: 16 }}>
        <p className="font-bold text-sm text-center mb-3" style={{ color: BRAND.primary }}>{String(s.title)}</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-2">
              <div className="flex gap-0.5 mb-1">{Array.from({ length: Number(s[`review${i}Stars`] ?? 5) }).map((_, j) => <Star key={j} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-xs text-gray-600 line-clamp-2">{String(s[`review${i}Text`] ?? '')}</p>
              <p className="text-xs font-bold mt-1" style={{ color: BRAND.primary }}>{String(s[`review${i}Name`] ?? '')}</p>
            </div>
          ))}
        </div>
      </div>
    );
    case 'gallery': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#fff', padding: 16 }}>
        <p className="font-bold text-sm text-center mb-3" style={{ color: BRAND.primary }}>{String(s.title)}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: `${BRAND.primary}15` }}>
              {s[`image${i}`] && <img src={String(s[`image${i}`])} alt="" className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
      </div>
    );
    case 'products': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#fff', padding: 16 }}>
        <p className="font-bold text-sm text-center mb-3" style={{ color: BRAND.primary }}>{String(s.title)}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(Number(s.columns), 4)}, 1fr)` }}>
          {Array.from({ length: Math.min(Number(s.limit), Number(s.columns) * 2) }).map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ background: '#F5EFFA' }}>
              <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${BRAND.primary}22, ${BRAND.accent}22)` }} />
              <div className="p-1.5">
                <div className="h-2 rounded mb-1" style={{ background: '#D1C4E9', width: '80%' }} />
                <div className="h-1.5 rounded" style={{ background: BRAND.accent, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
    case 'categories': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#fff', padding: 16 }}>
        <p className="font-bold text-sm text-center mb-3" style={{ color: BRAND.primary }}>{String(s.title)}</p>
        <div className="grid grid-cols-3 gap-2">
          {['الملابس', 'الإلكترونيات', 'المنزل'].map(c => (
            <div key={c} className="rounded-xl p-3 text-center" style={{ background: '#F5EFFA' }}>
              <div className="w-8 h-8 rounded-full mx-auto mb-1.5" style={{ background: `${BRAND.accent}30` }} />
              <p className="text-xs font-medium" style={{ color: BRAND.primary }}>{c}</p>
            </div>
          ))}
        </div>
      </div>
    );
    case 'brands': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#fff', padding: 16 }}>
        <p className="font-bold text-sm text-center mb-3" style={{ color: BRAND.primary }}>{String(s.title)}</p>
        <div className="grid grid-cols-3 gap-2">
          {['ماركة 1', 'ماركة 2', 'ماركة 3'].map(b => (
            <div key={b} className="rounded-xl p-3 text-center" style={{ background: '#F5EFFA' }}>
              <div className="w-8 h-8 rounded-full mx-auto mb-1.5" style={{ background: `${BRAND.accent}30` }} />
              <p className="text-xs font-medium" style={{ color: BRAND.primary }}>{b}</p>
            </div>
          ))}
        </div>
      </div>
    );
    case 'announcement': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: String(s.backgroundColor ?? BRAND.accent), padding: '10px 16px' }}>
        <p className="text-xs text-center font-medium" style={{ color: String(s.textColor ?? '#fff') }}>{String(s.text)}</p>
      </div>
    );
    case 'about': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#fff', padding: 16 }}>
        <div className="flex gap-3 items-center">
          {s.imagePosition === 'right' ? <>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1" style={{ color: BRAND.primary }}>{String(s.title)}</p>
              <div className="space-y-1">{[70, 90, 60].map(w => <div key={w} className="h-1.5 rounded" style={{ background: '#ECE6F0', width: `${w}%` }} />)}</div>
            </div>
            <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: `${BRAND.primary}20` }}>
              {s.imageUrl && <img src={String(s.imageUrl)} alt="" className="w-full h-full object-cover" />}
            </div>
          </> : <>
            <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: `${BRAND.primary}20` }}>
              {s.imageUrl && <img src={String(s.imageUrl)} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1" style={{ color: BRAND.primary }}>{String(s.title)}</p>
              <div className="space-y-1">{[70, 90, 60].map(w => <div key={w} className="h-1.5 rounded" style={{ background: '#ECE6F0', width: `${w}%` }} />)}</div>
            </div>
          </>}
        </div>
      </div>
    );
    case 'newsletter': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: String(s.backgroundColor ?? BRAND.secondary), padding: 20 }}>
        <p className="font-bold text-sm text-center text-white mb-1">{String(s.title)}</p>
        <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>{String(s.subtitle)}</p>
        <div className="flex gap-2">
          <div className="flex-1 h-7 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="h-7 px-3 rounded-lg flex items-center text-xs font-bold text-white" style={{ background: BRAND.accent }}>{String(s.buttonText)}</div>
        </div>
      </div>
    );
    case 'divider': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg mx-2 my-1 ${sel} flex items-center justify-center`}
        style={{ height: Number(s.height) || 40, background: 'transparent', padding: '0 16px' }}>
        {s.showLine && <div className="w-full h-px" style={{ background: String(s.lineColor ?? '#ECE6F0') }} />}
      </div>
    );
    case 'video': return (
      <div onClick={onClick} className={`cursor-pointer transition-all rounded-lg overflow-hidden mx-2 my-1 ${sel}`}
        style={{ background: '#111', padding: 20, textAlign: 'center' }}>
        <p className="font-bold text-sm text-white mb-3">{String(s.title)}</p>
        <div className="flex items-center justify-center rounded-lg" style={{ background: '#000', aspectRatio: String(s.aspectRatio ?? '16:9').replace(':', '/'), maxWidth: 320, margin: '0 auto' }}>
          <Video className="h-8 w-8 text-white opacity-50" />
        </div>
        {!s.videoUrl && <p className="text-xs text-white/50 mt-2">أضف رابط الفيديو من الخصائص</p>}
      </div>
    );
    default: return null;
  }
}

// ── Properties Editor ──────────────────────────────────────────────────────────

function PropertiesPanel({ section, onChange, onClose }: {
  section: BuilderSection;
  onChange: (settings: Record<string, string | number | boolean>) => void;
  onClose: () => void;
}) {
  const s = section.settings;
  const set = (key: string, val: string | number | boolean) => onChange({ ...s, [key]: val });

  const input = (key: string, label: string, type = 'text', placeholder = '') => (
    <div className="mb-4">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>{label}</label>
      <input type={type} value={String(s[key] ?? '')} placeholder={placeholder}
        onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 transition"
        style={{ borderColor: '#ECE6F0' }} />
    </div>
  );

  const textarea = (key: string, label: string, rows = 3) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>{label}</label>
      <textarea value={String(s[key] ?? '')} onChange={e => set(key, e.target.value)} rows={rows}
        className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none resize-none transition"
        style={{ borderColor: '#ECE6F0' }} />
    </div>
  );

  const colorPicker = (key: string, label: string) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={String(s[key] ?? '#2F2E4B')} onChange={e => set(key, e.target.value)}
          className="h-9 w-16 rounded-lg border cursor-pointer" style={{ borderColor: '#ECE6F0' }} />
        <span className="text-xs font-mono text-gray-500">{String(s[key] ?? '')}</span>
        <div className="flex gap-1 mr-auto">
          {Object.values(BRAND).map(c => (
            <button key={c} onClick={() => set(key, c)} type="button"
              className="w-5 h-5 rounded-full border-2 transition hover:scale-110"
              style={{ background: c, borderColor: s[key] === c ? '#333' : 'transparent' }} />
          ))}
        </div>
      </div>
    </div>
  );

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>{label}</label>
      <select value={String(s[key] ?? options[0].value)} onChange={e => set(key, e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none bg-white transition"
        style={{ borderColor: '#ECE6F0' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const toggle = (key: string, label: string) => (
    <div className="flex items-center justify-between mb-4">
      <label className="text-xs font-semibold" style={{ color: BRAND.primary }}>{label}</label>
      <button type="button" onClick={() => set(key, !s[key])}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition"
        style={{ background: s[key] ? BRAND.accent : '#D1C4E9' }}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${s[key] ? 'translate-x-1' : 'translate-x-5'}`} />
      </button>
    </div>
  );

  const typeInfo = SECTION_TYPES.find(t => t.type === section.type)!;

  return (
    <div className="h-full flex flex-col bg-white border-r border-[#ECE6F0]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#ECE6F0]">
        <div className="flex items-center gap-2">
          <typeInfo.icon className="h-4 w-4" style={{ color: BRAND.primary }} />
          <span className="font-bold text-sm" style={{ color: BRAND.primary }}>{typeInfo.label}</span>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {section.type === 'hero' && <>
          {input('title', 'العنوان الرئيسي', 'text', 'عنوان جذاب لمتجرك')}
          {input('subtitle', 'العنوان الفرعي', 'text', 'وصف قصير')}
          {input('buttonText', 'نص الزر', 'text', 'تسوق الآن')}
          {input('buttonUrl', 'رابط الزر', 'text', '#products')}
          <ImageField label="صورة الخلفية" value={String(s.backgroundImage ?? '')} onChange={v => set('backgroundImage', v)} />
          {s.backgroundImage && input('overlayOpacity', 'شفافية التغطية الداكنة (0-100)', 'number', '40')}
          {!s.backgroundImage && colorPicker('backgroundColor', 'لون الخلفية')}
          {select('height', 'ارتفاع القسم', [
            { value: 'small', label: 'صغير' }, { value: 'medium', label: 'متوسط' },
            { value: 'large', label: 'كبير' }, { value: 'fullscreen', label: 'شاشة كاملة' },
          ])}
          {select('textAlign', 'محاذاة النص', [
            { value: 'center', label: 'وسط' }, { value: 'right', label: 'يمين' }, { value: 'left', label: 'يسار' },
          ])}
        </>}

        {section.type === 'discount' && <>
          {input('title', 'العنوان', 'text', 'عرض خاص لفترة محدودة!')}
          {input('subtitle', 'الوصف', 'text', 'استخدم الكود أدناه')}
          {input('couponCode', 'كود الخصم', 'text', 'SAVE20')}
          {input('discountLabel', 'شارة الخصم', 'text', 'خصم 20%')}
          {colorPicker('backgroundColor', 'لون الخلفية')}
          {colorPicker('badgeColor', 'لون الشارة')}
          {toggle('showTimer', 'إظهار عداد تنازلي')}
          {s.showTimer && input('expiryHours', 'ينتهي خلال (ساعة)', 'number', '24')}
        </>}

        {section.type === 'features' && <>
          {input('title', 'عنوان القسم', 'text', 'لماذا تختارنا؟')}
          {select('columns', 'عدد الأعمدة', [
            { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
          ])}
          <div className="border-t border-[#ECE6F0] pt-4 mt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="mb-4 p-3 rounded-xl" style={{ background: '#F5EFFA' }}>
                <p className="text-xs font-bold mb-2" style={{ color: BRAND.primary }}>الميزة {i}</p>
                {input(`feature${i}Icon`, 'أيقونة (إيموجي) — اختياري', 'text', '')}
                {input(`feature${i}Title`, 'العنوان', 'text', 'ميزة مميزة')}
                {input(`feature${i}Desc`, 'الوصف', 'text', 'وصف الميزة')}
              </div>
            ))}
          </div>
        </>}

        {section.type === 'testimonials' && <>
          {input('title', 'عنوان القسم', 'text', 'ماذا يقول عملاؤنا')}
          <div className="border-t border-[#ECE6F0] pt-4 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="mb-4 p-3 rounded-xl" style={{ background: '#F5EFFA' }}>
                <p className="text-xs font-bold mb-2" style={{ color: BRAND.primary }}>تقييم {i}</p>
                {input(`review${i}Name`, 'اسم العميل', 'text', 'أحمد محمد')}
                {textarea(`review${i}Text`, 'نص التقييم', 2)}
                {select(`review${i}Stars`, 'التقييم', [
                  { value: '5', label: '5 نجوم — ممتاز' }, { value: '4', label: '4 نجوم — جيد جداً' },
                  { value: '3', label: '3 نجوم — جيد' },
                ])}
              </div>
            ))}
          </div>
        </>}

        {section.type === 'gallery' && <>
          {input('title', 'عنوان القسم', 'text', 'معرض صورنا')}
          {select('columns', 'عدد الأعمدة', [
            { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
          ])}
          <div className="border-t border-[#ECE6F0] pt-4 mt-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ImageField key={i} label={`صورة ${i}`} value={String(s[`image${i}`] ?? '')} onChange={v => set(`image${i}`, v)} />
            ))}
          </div>
        </>}

        {section.type === 'products' && <>
          {input('title', 'عنوان القسم', 'text', 'منتجاتنا المميزة')}
          {input('subtitle', 'وصف القسم', 'text', 'اختر من تشكيلتنا')}
          {select('columns', 'عدد الأعمدة', [
            { value: '2', label: '2 أعمدة' }, { value: '3', label: '3 أعمدة' },
            { value: '4', label: '4 أعمدة' }, { value: '5', label: '5 أعمدة' },
          ])}
          {select('limit', 'عدد المنتجات', [
            { value: '4', label: '4' }, { value: '8', label: '8' },
            { value: '12', label: '12' }, { value: '16', label: '16' },
          ])}
          {toggle('showComparePrice', 'إظهار السعر القديم')}
          {toggle('showAddToCart', 'إظهار زر إضافة للسلة')}
        </>}

        {section.type === 'categories' && <>
          {input('title', 'عنوان القسم', 'text', 'تصفح حسب التصنيف')}
          {select('style', 'نمط العرض', [
            { value: 'grid', label: 'شبكة' }, { value: 'horizontal', label: 'أفقي' }, { value: 'cards', label: 'بطاقات' },
          ])}
        </>}

        {section.type === 'brands' && <>
          {input('title', 'عنوان القسم', 'text', 'تسوّق حسب الماركة')}
          {select('limit', 'عدد الماركات المعروضة', [
            { value: '4', label: '4' }, { value: '6', label: '6' }, { value: '8', label: '8' }, { value: '12', label: '12' },
          ])}
          <p className="text-xs text-gray-400 mt-1">
            يظهر هذا القسم الماركات التي أضفتها من صفحة{' '}
            <a href="/dashboard/brands" target="_blank" rel="noreferrer" className="underline font-medium">الماركات</a>.
          </p>
        </>}

        {section.type === 'announcement' && <>
          {textarea('text', 'نص الإعلان', 2)}
          {input('link', 'رابط الإعلان (اختياري)', 'text', 'https://')}
          {colorPicker('backgroundColor', 'لون الخلفية')}
          {colorPicker('textColor', 'لون النص')}
          {toggle('dismissible', 'قابل للإغلاق')}
        </>}

        {section.type === 'about' && <>
          {input('title', 'العنوان', 'text', 'قصتنا')}
          {textarea('content', 'النص', 4)}
          <ImageField label="الصورة" value={String(s.imageUrl ?? '')} onChange={v => set('imageUrl', v)} />
          {select('imagePosition', 'موضع الصورة', [
            { value: 'right', label: 'يمين' }, { value: 'left', label: 'يسار' },
          ])}
        </>}

        {section.type === 'newsletter' && <>
          {input('title', 'العنوان', 'text', 'اشترك في نشرتنا')}
          {input('subtitle', 'الوصف', 'text', 'احصل على أحدث العروض')}
          {input('buttonText', 'نص الزر', 'text', 'اشترك الآن')}
          {input('placeholder', 'نص حقل البريد', 'text', 'أدخل بريدك الإلكتروني')}
          {colorPicker('backgroundColor', 'لون الخلفية')}
        </>}

        {section.type === 'divider' && <>
          {input('height', 'الارتفاع (px)', 'number', '40')}
          {toggle('showLine', 'إظهار خط فاصل')}
          {Boolean(s.showLine) && colorPicker('lineColor', 'لون الخط')}
        </>}

        {section.type === 'video' && <>
          {input('title', 'العنوان فوق الفيديو', 'text', 'شاهد متجرنا عن قرب')}
          {input('videoUrl', 'رابط الفيديو (يوتيوب أو رابط MP4)', 'text', 'https://youtube.com/watch?v=...')}
          {select('aspectRatio', 'نسبة العرض للارتفاع', [
            { value: '16:9', label: '16:9 (أفقي)' }, { value: '9:16', label: '9:16 (ريلز/عمودي)' }, { value: '1:1', label: '1:1 (مربع)' },
          ])}
        </>}
      </div>
    </div>
  );
}

// ── Instructions Overlay ──────────────────────────────────────────────────────

function InstructionsOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps: { icon: LucideIcon; color: string; title: string; desc: string; tip: string | null }[] = [
    {
      icon: Palette, color: '#7C3AED',
      title: 'مرحباً بك في مصمم المتجر',
      desc: 'هنا تتحكم في شكل متجرك بالكامل — بدون أي خبرة تقنية. فقط اضغط، وغيّر، وانشر!',
      tip: null,
    },
    {
      icon: Ruler, color: BRAND.primary,
      title: 'الخطوة 1 — اختر قالباً جاهزاً',
      desc: 'انتقل إلى تبويب "التصميم" في اليسار، واضغط على أحد القوالب الجاهزة. سيُعبئ متجرك فوراً بتصميم احترافي.',
      tip: 'القالب الموصى به لنوع متجرك سيظهر أولاً',
    },
    {
      icon: Package, color: '#059669',
      title: 'الخطوة 2 — أضف أو رتّب الأقسام',
      desc: 'في تبويب "الأقسام"، اضغط "إضافة قسم" لإضافة بانر، منتجات، آراء العملاء وأكثر. استخدم أزرار الأسهم لترتيبها.',
      tip: 'اضغط أي قسم في القائمة لتعديل نصوصه وألوانه من اليمين',
    },
    {
      icon: MousePointerClick, color: BRAND.accent,
      title: 'الخطوة 3 — عدّل كل قسم',
      desc: 'انقر على أي قسم في لوحة القائمة اليسرى → ستظهر لك لوحة الخصائص على اليمين. عدّل العناوين، الصور، الألوان، كل شيء.',
      tip: 'زر العين يُخفي القسم مؤقتاً دون حذفه',
    },
    {
      icon: Rocket, color: '#0EA5E9',
      title: 'الخطوة 4 — احفظ وانشر',
      desc: 'بعد كل تعديل اضغط "حفظ" في أعلى الشاشة. عندما تكون راضياً اضغط "نشر" لتجعل متجرك مباشراً للزوار.',
      tip: 'يمكنك معاينة المتجر في أي وقت بالضغط على زر "معاينة"',
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleClose = () => {
    localStorage.setItem('sb_builder_guided', '1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className="h-1.5 rounded-full transition-all"
                  style={{ width: i === step ? 24 : 8, background: i <= step ? BRAND.accent : '#ECE6F0' }} />
              ))}
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${current.color}15` }}>
              <current.icon size={30} color={current.color} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ color: BRAND.primary }}>{current.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{current.desc}</p>
            </div>
            {current.tip && (
              <div className="w-full rounded-xl px-4 py-2.5 text-xs text-right flex items-center gap-2"
                style={{ background: '#FBF9F2', border: `1px solid #FBE1EA`, color: '#7B4F3A' }}>
                <Lightbulb className="h-3.5 w-3.5 flex-shrink-0" /> {current.tip}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border transition hover:bg-gray-50"
              style={{ borderColor: '#ECE6F0', color: '#6B7280' }}>
              السابق
            </button>
          )}
          {isLast ? (
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
              ابدأ التصميم <Rocket className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
              التالي ←
            </button>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 pb-4 cursor-pointer hover:underline" onClick={handleClose}>
          تخطي الدليل
        </p>
      </div>
    </div>
  );
}

// ── Main Builder Page ──────────────────────────────────────────────────────────

function BuilderPageContent() {
  useDocumentTitle('بناء المتجر');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const searchParams = useSearchParams();
  const templateAppliedRef = useRef(false);
  const [store, setStore] = useState<Store | null>(null);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>({
    home: DEFAULT_HOME, product: DEFAULT_PRODUCT_SECTIONS, cart: [], checkout: [],
  });
  const [currentPage, setCurrentPage] = useState<PageKey>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeftTab>('sections');
  const [device, setDevice] = useState<Device>('desktop');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [storeTheme, setStoreTheme] = useState(BRAND.primary);
  const [storeType, setStoreType] = useState('fashion');
  const [showInstructions, setShowInstructions] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sb_builder_guided') !== '1';
  });
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  // Banners state
  type Banner = { id: string; title: string; subtitle: string; link: string; bgColor: string; textColor: string; active: boolean };
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerForm, setBannerForm] = useState<Omit<Banner, 'id' | 'active'>>({ title: '', subtitle: '', link: '', bgColor: BRAND.accent, textColor: '#ffffff' });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [showBannerForm, setShowBannerForm] = useState(false);

  useEffect(() => { trackPage('builder'); track({ event: 'builder_opened' }); }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: Store & { storeType?: string } }>('/api/stores/my')
      .then(res => {
        if (res.data) {
          setStore(res.data);
          setStoreTheme(res.data.theme ?? BRAND.primary);
          if (res.data.storeType) setStoreType(res.data.storeType);
          if (res.data.builderConfig) {
            try {
              const parsed = JSON.parse(res.data.builderConfig);
              if (Array.isArray(parsed)) {
                // Legacy: was an array, treat as home page
                setPagesConfig({ home: parsed, product: DEFAULT_PRODUCT_SECTIONS, cart: [], checkout: [] });
              } else {
                const { banners: savedBanners, ...pages } = parsed;
                setPagesConfig({ home: DEFAULT_HOME, product: DEFAULT_PRODUCT_SECTIONS, cart: [], checkout: [], ...pages });
                if (Array.isArray(savedBanners)) setBanners(savedBanners);
              }
            } catch { /* use defaults */ }
          } else {
            // Fresh store with no saved design yet — auto-apply the template chosen at registration (?template=<storeTypeId>)
            const tplId = searchParams.get('template');
            if (tplId && !templateAppliedRef.current) {
              const tpl = STORE_TEMPLATES.find(t => t.storeTypes.includes(tplId));
              if (tpl) {
                templateAppliedRef.current = true;
                const tplSections: BuilderSection[] = tpl.sections.map((s, i) => ({ ...s, id: `${s.type}-tpl-${i}-${Date.now()}` }));
                setPagesConfig(prev => ({ ...prev, home: tplSections }));
                setStoreTheme(tpl.themeColor);
                setStoreType(tplId);
                api.patch('/api/stores/my', { theme: tpl.themeColor, storeType: tplId }).catch(() => {});
                toast.success(`تم تطبيق قالب "${tpl.label}" تلقائياً — عدّله كما تحب ثم احفظ`);
              }
            }
          }
        }
      }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = pagesConfig[currentPage];
  const selectedSection = sections.find(s => s.id === selectedId) ?? null;
  const CurrentPageIcon = PAGE_LABELS[currentPage].icon;

  const markDirty = () => setIsDirty(true);

  const applyTemplate = async (template: StoreTemplate) => {
    if (!confirm(`سيتم استبدال قسم الرئيسية بقالب "${template.label}". هل أنت متأكد؟`)) return;
    setApplyingTemplate(template.id);
    const sections: BuilderSection[] = template.sections.map((s, i) => ({
      ...s, id: `${s.type}-tpl-${i}-${Date.now()}`,
    }));
    setPagesConfig(prev => ({ ...prev, home: sections }));
    setStoreTheme(template.themeColor);
    setCurrentPage('home');
    setSelectedId(null);
    markDirty();
    await api.patch('/api/stores/my', { theme: template.themeColor }).catch(() => {});
    setApplyingTemplate(null);
    toast.success(`تم تطبيق قالب "${template.label}" ✓`);
  };

  const setSections = useCallback((updater: (prev: BuilderSection[]) => BuilderSection[]) => {
    setPagesConfig(prev => ({ ...prev, [currentPage]: updater(prev[currentPage]) }));
    markDirty();
  }, [currentPage]);

  const addSection = (type: SectionType) => {
    const st = SECTION_TYPES.find(s => s.type === type);
    if (st?.minPlan && PLAN_RANK[plan] < PLAN_RANK[st.minPlan]) {
      toast.error(st.minPlan === 'ENTERPRISE' ? 'هذا القسم حصري لخطة الأعمال' : 'هذا القسم متاح في الخطة الاحترافية فما فوق');
      return;
    }
    const newSection: BuilderSection = {
      id: `${type}-${Date.now()}`, type, visible: true,
      settings: { ...DEFAULT_SETTINGS[type] },
    };
    setPagesConfig(prev => ({ ...prev, [currentPage]: [...prev[currentPage], newSection] }));
    setSelectedId(newSection.id);
    setShowAddPanel(false);
    markDirty();
    track({ event: 'builder_section_added', meta: { sectionType: type } });
  };

  const removeSection = (id: string) => {
    setPagesConfig(prev => ({ ...prev, [currentPage]: prev[currentPage].filter(s => s.id !== id) }));
    if (selectedId === id) setSelectedId(null);
    markDirty();
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setPagesConfig(prev => {
      const arr = [...prev[currentPage]];
      const idx = arr.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return prev;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...prev, [currentPage]: arr };
    });
    markDirty();
  };

  const toggleVisible = (id: string) => {
    setPagesConfig(prev => ({
      ...prev,
      [currentPage]: prev[currentPage].map(s => s.id === id ? { ...s, visible: !s.visible } : s),
    }));
    markDirty();
  };

  const updateSettings = useCallback((id: string, settings: Record<string, string | number | boolean>) => {
    setPagesConfig(prev => ({
      ...prev,
      [currentPage]: prev[currentPage].map(s => s.id === id ? { ...s, settings } : s),
    }));
    markDirty();
  }, [currentPage]);

  const save = async () => {
    if (!store) return; setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: Store }>('/api/stores/my', { builderConfig: JSON.stringify({ ...pagesConfig, banners }) });
      setStore(s => s ? { ...s, builderEditCount: res.data.builderEditCount } : s);
      setIsDirty(false); toast.success('تم الحفظ بنجاح ✓');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const publish = async () => {
    if (!store) return; setPublishing(true);
    try {
      const res = await api.patch<{ success: boolean; data: Store }>('/api/stores/my', { builderConfig: JSON.stringify({ ...pagesConfig, banners }), isPublished: true });
      setStore(s => s ? { ...s, isPublished: true, builderEditCount: res.data.builderEditCount } : s);
      setIsDirty(false);
      toast.success('تم النشر! متجرك الآن مباشر');
      track({ event: 'builder_published' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل النشر'); }
    finally { setPublishing(false); }
  };

  const canvasWidth = device === 'mobile' ? 390 : device === 'tablet' ? 768 : '100%';

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F5EFFA' }}>
      {showInstructions && <InstructionsOverlay onClose={() => { localStorage.setItem('sb_builder_guided', '1'); setShowInstructions(false); }} />}

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 border-b border-[#ECE6F0] bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ArrowRight className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <p className="text-sm font-bold" style={{ color: BRAND.primary }}>{store?.name ?? 'متجري'}</p>
            <p className="text-xs flex items-center gap-1" style={{ color: store?.isPublished ? '#10b981' : '#f59e0b' }}>
              {store?.isPublished ? '● مباشر' : <><AlertTriangle className="h-3 w-3" /> غير منشور</>}
            </p>
          </div>
          <button onClick={() => { localStorage.removeItem('sb_builder_guided'); setShowInstructions(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-gray-100 transition"
            style={{ color: BRAND.secondary }}>
            <HelpCircle className="h-3.5 w-3.5" /> دليل الاستخدام
          </button>
        </div>

        {/* Device Toggle */}
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl border border-[#ECE6F0] bg-gray-50">
          {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as [Device, React.ElementType][]).map(([d, Icon]) => (
            <button key={d} onClick={() => setDevice(d)} className="p-2 rounded-lg transition"
              style={{ background: device === d ? BRAND.primary : 'transparent' }}>
              <Icon className="h-4 w-4" style={{ color: device === d ? 'white' : '#9ca3af' }} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {plan === 'FREE' && store && (
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                background: (store.builderEditCount ?? 0) >= FREE_PLAN_BUILDER_EDIT_LIMIT ? '#FEE2E2' : '#F5EFFA',
                color: (store.builderEditCount ?? 0) >= FREE_PLAN_BUILDER_EDIT_LIMIT ? '#DC2626' : BRAND.secondary,
              }}>
              {Math.max(0, FREE_PLAN_BUILDER_EDIT_LIMIT - (store.builderEditCount ?? 0))} تعديلات متبقية من أصل {FREE_PLAN_BUILDER_EDIT_LIMIT}
            </span>
          )}
          {isDirty && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
              تغييرات غير محفوظة
            </span>
          )}
          {store && (
            <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-[#ECE6F0] hover:bg-gray-50 transition"
              style={{ color: BRAND.secondary }}>
              <Eye className="h-4 w-4" /> معاينة
            </a>
          )}
          <button onClick={save} disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition disabled:opacity-40"
            style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
          <button onClick={publish} disabled={publishing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-xl text-white transition disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
            <Rocket className="h-4 w-4" />
            {publishing ? 'جارٍ النشر…' : 'نشر'}
          </button>
        </div>
      </header>

      {/* Quick tips strip — shown until user dismisses */}
      {!store?.isPublished && sections.length < 3 && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs border-b border-[#ECE6F0] flex-shrink-0 overflow-x-auto"
          style={{ background: '#FFF8F0' }}>
          <span className="text-amber-600 font-semibold flex-shrink-0 flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> نصائح سريعة:</span>
          {[
            '1. اختر قالباً من تبويب "التصميم"',
            '2. اضغط أي قسم في القائمة لتعديله',
            '3. اضغط "حفظ" ثم "نشر"',
          ].map((t, i) => (
            <span key={i} className="flex-shrink-0 px-2.5 py-1 rounded-full"
              style={{ background: '#FEF3C7', color: '#92400E' }}>{t}</span>
          ))}
          <button onClick={() => setShowInstructions(true)}
            className="flex-shrink-0 mr-auto text-xs font-bold px-2.5 py-1 rounded-full transition hover:opacity-80"
            style={{ background: BRAND.primary, color: '#fff' }}>
            دليل كامل
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel */}
        <aside className="w-72 flex flex-col flex-shrink-0 bg-white border-l border-[#ECE6F0] overflow-hidden">
          <div className="flex border-b border-[#ECE6F0]">
            {([
              ['sections', Layers, 'الأقسام'],
              ['theme', Palette, 'التصميم'],
              ['pages', LayoutTemplate, 'الصفحات'],
              ['banners', Megaphone, 'البانرات'],
            ] as [LeftTab, React.ElementType, string][]).map(([tab, Icon, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition border-b-2"
                style={{ color: activeTab === tab ? BRAND.accent : '#9ca3af', borderBottomColor: activeTab === tab ? BRAND.accent : 'transparent' }}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          {/* Sections Tab */}
          {activeTab === 'sections' && (
            <div className="flex-1 overflow-y-auto">

              {/* Hint: click "التصميم" first if no sections */}
              {sections.length === 0 && (
                <div className="mx-3 mt-3 rounded-2xl overflow-hidden border" style={{ borderColor: '#FBE1EA' }}>
                  <div className="px-3 py-2.5" style={{ background: '#FBF9F2' }}>
                    <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: BRAND.accent }}><Rocket className="h-3.5 w-3.5" /> ابدأ من هنا</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      انتقل لتبويب <strong>التصميم</strong> واضغط على قالب جاهز — يملأ المتجر تلقائياً بكل الأقسام!
                    </p>
                  </div>
                  <button onClick={() => setActiveTab('theme')}
                    className="w-full py-2 text-xs font-bold transition hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`, color: '#fff' }}>
                    اختر قالباً الآن ←
                  </button>
                </div>
              )}

              {/* Current page indicator */}
              <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{ background: `${BRAND.primary}10`, color: BRAND.primary }}>
                <CurrentPageIcon className="h-4 w-4" />
                <span className="flex-1">{PAGE_LABELS[currentPage].label}</span>
                <span className="font-normal text-gray-400">الصفحة الحالية</span>
              </div>

              <div className="p-3">
                <button onClick={() => setShowAddPanel(p => !p)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed transition"
                  style={{ borderColor: BRAND.accent, color: BRAND.accent, background: showAddPanel ? `${BRAND.accent}10` : 'transparent' }}>
                  <Plus className="h-4 w-4" /> أضف قسماً جديداً
                </button>
              </div>

              {showAddPanel && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-gray-400 mb-2 px-1">اضغط على أي قسم لإضافته مباشرة ↓</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SECTION_TYPES.map(st => {
                      const locked = !!st.minPlan && PLAN_RANK[plan] < PLAN_RANK[st.minPlan];
                      return (
                        <div key={st.type} className="relative">
                          <button onClick={() => addSection(st.type)}
                            className={`w-full flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition ${locked ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#DB6E93] hover:shadow-sm'}`}
                            style={{ borderColor: locked ? '#ECE6F0' : BRAND.light, background: locked ? '#F9F9F9' : '#FBF8FF' }}>
                            <st.icon className="h-5 w-5" style={{ color: locked ? '#9CA3AF' : BRAND.accent }} />
                            <span className="text-xs font-semibold" style={{ color: locked ? '#9CA3AF' : BRAND.primary }}>{st.label}</span>
                            <span className="text-xs text-gray-400 leading-tight">{st.desc}</span>
                          </button>
                          {locked && (
                            <Link href="/dashboard/settings?tab=billing"
                              className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                              style={{ background: 'rgba(249,245,255,0.88)' }}>
                              {st.minPlan === 'ENTERPRISE' ? <Crown className="h-4 w-4" style={{ color: '#DB6E93' }} /> : <Lock className="h-4 w-4" style={{ color: '#7C3AED' }} />}
                              <span className="text-xs font-bold" style={{ color: st.minPlan === 'ENTERPRISE' ? '#DB6E93' : '#7C3AED' }}>{st.minPlan}</span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sections.length > 0 && (
                <div className="px-3 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-xs font-bold" style={{ color: BRAND.secondary }}>أقسام الصفحة ({sections.length})</p>
                    <p className="text-xs text-gray-400">اضغط لتعديل</p>
                  </div>
                  {sections.map((section, idx) => {
                    const typeInfo = SECTION_TYPES.find(t => t.type === section.type)!;
                    const isSelected = selectedId === section.id;
                    return (
                      <div key={section.id}
                        onClick={() => setSelectedId(isSelected ? null : section.id)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition"
                        style={{
                          background: isSelected ? `${BRAND.primary}12` : '#FAFAFA',
                          border: `1.5px solid ${isSelected ? BRAND.primary : '#ECE6F0'}`,
                          boxShadow: isSelected ? `0 2px 8px ${BRAND.primary}20` : 'none',
                        }}>
                        <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                        <typeInfo.icon className="h-4 w-4 flex-shrink-0" style={{ color: section.visible ? BRAND.primary : '#9ca3af' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: section.visible ? BRAND.primary : '#9ca3af' }}>
                            {typeInfo?.label}
                          </p>
                          {isSelected && (
                            <p className="text-xs text-gray-400">← خصائصه على اليمين</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={e => { e.stopPropagation(); moveSection(section.id, -1); }}
                            disabled={idx === 0} className="p-1 rounded hover:bg-white transition disabled:opacity-30"
                            title="تحريك لأعلى">
                            <ChevronUp className="h-3 w-3 text-gray-500" />
                          </button>
                          <button type="button" onClick={e => { e.stopPropagation(); moveSection(section.id, 1); }}
                            disabled={idx === sections.length - 1} className="p-1 rounded hover:bg-white transition disabled:opacity-30"
                            title="تحريك لأسفل">
                            <ChevronDown className="h-3 w-3 text-gray-500" />
                          </button>
                          <button type="button" onClick={e => { e.stopPropagation(); toggleVisible(section.id); }}
                            className="p-1 rounded hover:bg-white transition"
                            title={section.visible ? 'إخفاء القسم' : 'إظهار القسم'}>
                            {section.visible ? <Eye className="h-3 w-3 text-gray-500" /> : <EyeOff className="h-3 w-3" style={{ color: BRAND.accent }} />}
                          </button>
                          <button type="button" onClick={e => { e.stopPropagation(); removeSection(section.id); }}
                            className="p-1 rounded hover:bg-red-50 transition"
                            title="حذف القسم">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Save reminder */}
                  {isDirty && (
                    <div className="mt-3 px-3 py-2.5 rounded-xl text-xs text-center flex items-center justify-center gap-1.5"
                      style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}>
                      <Save className="h-3.5 w-3.5 flex-shrink-0" /> لديك تغييرات غير محفوظة — اضغط <strong>حفظ</strong> أعلاه
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Quick-start Templates */}
              <p className="text-xs font-bold mb-2" style={{ color: BRAND.secondary }}>قوالب جاهزة</p>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">اختر قالباً لبدء تصميم متجرك بسرعة</p>
              <div className="space-y-2 mb-5">
                {STORE_TEMPLATES.map(tpl => {
                  const isMatch = tpl.storeTypes.includes(storeType);
                  return (
                    <button key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      disabled={applyingTemplate === tpl.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-right transition hover:border-opacity-70 disabled:opacity-50"
                      style={{ borderColor: isMatch ? tpl.themeColor : '#ECE6F0', background: isMatch ? `${tpl.themeColor}08` : 'white' }}>
                      <tpl.icon className="h-5 w-5 flex-shrink-0" style={{ color: tpl.themeColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold" style={{ color: isMatch ? tpl.themeColor : BRAND.primary }}>{tpl.label}</span>
                          {isMatch && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: `${tpl.themeColor}20`, color: tpl.themeColor }}>
                              موصى
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{tpl.desc}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: tpl.themeColor }} />
                    </button>
                  );
                })}
              </div>
              <div className="h-px mb-4" style={{ background: '#ECE6F0' }} />
              <p className="text-xs font-bold mb-3" style={{ color: BRAND.secondary }}>لوحة الألوان</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[BRAND.primary, BRAND.secondary, BRAND.accent, BRAND.light, '#1a7f5a', '#1d4ed8', '#b45309', '#0f172a'].map(c => (
                  <button key={c} type="button" onClick={() => {
                    setStoreTheme(c);
                    api.patch('/api/stores/my', { theme: c }).catch(() => {});
                    markDirty();
                  }}
                    className="aspect-square rounded-xl border-2 transition hover:scale-105 flex items-center justify-center"
                    style={{ background: c, borderColor: storeTheme === c ? '#333' : 'transparent' }}>
                    {storeTheme === c && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>لون مخصص</label>
              <div className="flex items-center gap-2 mb-6">
                <input type="color" value={storeTheme} onChange={e => {
                  setStoreTheme(e.target.value);
                  api.patch('/api/stores/my', { theme: e.target.value }).catch(() => {});
                  markDirty();
                }} className="h-9 w-full rounded-xl border cursor-pointer" style={{ borderColor: '#ECE6F0' }} />
              </div>
              <p className="text-xs font-bold mb-3" style={{ color: BRAND.secondary }}>الخطوط</p>
              <div className="space-y-2">
                {[{ name: 'Cairo', label: 'القاهرة (افتراضي)' }, { name: 'Tajawal', label: 'تجول' }, { name: 'Almarai', label: 'المراعي' }].map(f => (
                  <button key={f.name} className="w-full text-right px-3 py-2.5 rounded-xl border-2 text-sm transition hover:border-[#DB6E93]"
                    style={{ borderColor: '#ECE6F0', fontFamily: f.name }}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Tips */}
              <div className="mt-6 p-3 rounded-xl" style={{ background: `${BRAND.accent}10` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 flex-shrink-0" style={{ color: BRAND.accent }} />
                  <span className="text-xs font-bold" style={{ color: BRAND.accent }}>نصيحة</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">اختر لوناً يعبر عن هوية علامتك التجارية. يُطبَّق هذا اللون على الأزرار والروابط في المتجر.</p>
              </div>
            </div>
          )}

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs font-bold mb-3" style={{ color: BRAND.secondary }}>صفحات المتجر</p>
              {(Object.entries(PAGE_LABELS) as [PageKey, typeof PAGE_LABELS[PageKey]][]).map(([key, page]) => (
                <button key={key} onClick={() => { setCurrentPage(key); setActiveTab('sections'); setSelectedId(null); }}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl mb-2 text-right transition"
                  style={{ background: currentPage === key ? `${BRAND.primary}12` : 'transparent', border: `1.5px solid ${currentPage === key ? BRAND.primary : '#ECE6F0'}` }}>
                  <page.icon className="h-5 w-5 mt-0.5" style={{ color: currentPage === key ? BRAND.primary : '#9ca3af' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: currentPage === key ? BRAND.primary : '#6b7280' }}>{page.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{page.desc}</p>
                    <p className="text-xs mt-1" style={{ color: BRAND.accent }}>
                      {pagesConfig[key].length} قسم
                    </p>
                  </div>
                  {currentPage === key && <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: BRAND.accent }} />}
                </button>
              ))}

              {/* Page tips */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: `${BRAND.primary}08` }}>
                <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: BRAND.primary }}><Lightbulb className="h-3.5 w-3.5" /> نصائح للصفحات</p>
                <ul className="text-xs text-gray-500 space-y-1 leading-relaxed">
                  <li>• <strong>الرئيسية:</strong> أضف بطلاً وعروضاً وشهادات</li>
                  <li>• <strong>المنتج:</strong> ميزات ومراجعات أسفل المنتج</li>
                  <li>• <strong>السلة:</strong> رسائل تشجيع ونصائح للعميل</li>
                  <li>• <strong>الدفع:</strong> ضمانات وشهادات أمان</li>
                </ul>
              </div>
            </div>
          )}

          {/* Banners Tab */}
          {activeTab === 'banners' && (
            <div className="flex-1 overflow-y-auto p-4" dir="rtl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: BRAND.secondary }}>البانرات الإعلانية</p>
                <button
                  onClick={() => {
                    setEditingBannerId(null);
                    setBannerForm({ title: '', subtitle: '', link: '', bgColor: BRAND.accent, textColor: '#ffffff' });
                    setShowBannerForm(v => !v);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  <Plus className="h-3 w-3" /> إضافة
                </button>
              </div>

              {/* Banner form */}
              {showBannerForm && (
                <div className="mb-4 p-3 rounded-xl border border-[#ECE6F0] bg-white space-y-2.5">
                  <p className="text-xs font-bold" style={{ color: BRAND.primary }}>
                    {editingBannerId ? 'تعديل البانر' : 'بانر جديد'}
                  </p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">العنوان</label>
                    <input
                      value={bannerForm.title}
                      onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="مثال: خصم 20% على كل المنتجات"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#ECE6F0] focus:outline-none focus:border-[#DB6E93]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">نص فرعي (اختياري)</label>
                    <input
                      value={bannerForm.subtitle}
                      onChange={e => setBannerForm(f => ({ ...f, subtitle: e.target.value }))}
                      placeholder="مثال: استخدم الكود SAVE20"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#ECE6F0] focus:outline-none focus:border-[#DB6E93]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">رابط (اختياري)</label>
                    <input
                      value={bannerForm.link}
                      onChange={e => setBannerForm(f => ({ ...f, link: e.target.value }))}
                      placeholder="https://..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#ECE6F0] focus:outline-none focus:border-[#DB6E93]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">لون الخلفية</label>
                      <input type="color" value={bannerForm.bgColor}
                        onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))}
                        className="h-9 w-full rounded-xl border border-[#ECE6F0] cursor-pointer" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">لون النص</label>
                      <input type="color" value={bannerForm.textColor}
                        onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))}
                        className="h-9 w-full rounded-xl border border-[#ECE6F0] cursor-pointer" />
                    </div>
                  </div>
                  {/* Preview */}
                  {bannerForm.title && (
                    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: bannerForm.bgColor }}>
                      <p className="text-xs font-bold" style={{ color: bannerForm.textColor }}>{bannerForm.title}</p>
                      {bannerForm.subtitle && <p className="text-xs mt-0.5 opacity-80" style={{ color: bannerForm.textColor }}>{bannerForm.subtitle}</p>}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (!bannerForm.title.trim()) { toast.error('أدخل عنوان البانر'); return; }
                        if (editingBannerId) {
                          setBanners(bs => bs.map(b => b.id === editingBannerId ? { ...b, ...bannerForm } : b));
                          toast.success('تم تحديث البانر');
                        } else {
                          setBanners(bs => [...bs, { id: `banner-${Date.now()}`, ...bannerForm, active: true }]);
                          toast.success('تمت إضافة البانر');
                        }
                        setShowBannerForm(false);
                        setEditingBannerId(null);
                        markDirty();
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                      style={{ background: BRAND.accent }}>
                      {editingBannerId ? 'حفظ التعديلات' : 'إضافة البانر'}
                    </button>
                    <button
                      onClick={() => { setShowBannerForm(false); setEditingBannerId(null); }}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-[#ECE6F0] hover:bg-gray-50 transition">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Banner list */}
              {banners.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs font-medium">لا توجد بانرات بعد</p>
                  <p className="text-xs mt-1">اضغط &quot;إضافة&quot; لإنشاء بانر إعلاني</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {banners.map(b => (
                    <div key={b.id} className="rounded-xl border border-[#ECE6F0] overflow-hidden">
                      {/* Color preview strip */}
                      <div className="px-3 py-2 text-center" style={{ background: b.bgColor, opacity: b.active ? 1 : 0.4 }}>
                        <p className="text-xs font-bold truncate" style={{ color: b.textColor }}>{b.title}</p>
                        {b.subtitle && <p className="text-xs opacity-75 truncate" style={{ color: b.textColor }}>{b.subtitle}</p>}
                      </div>
                      {/* Controls */}
                      <div className="flex items-center gap-1 px-2 py-1.5 bg-white">
                        <button
                          onClick={() => { setBanners(bs => bs.map(x => x.id === b.id ? { ...x, active: !x.active } : x)); markDirty(); }}
                          className="flex-1 flex items-center gap-1.5 text-xs font-medium transition"
                          style={{ color: b.active ? '#10b981' : '#9ca3af' }}>
                          {b.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {b.active ? 'ظاهر' : 'مخفي'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingBannerId(b.id);
                            setBannerForm({ title: b.title, subtitle: b.subtitle, link: b.link, bgColor: b.bgColor, textColor: b.textColor });
                            setShowBannerForm(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
                          <Settings2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { setBanners(bs => bs.filter(x => x.id !== b.id)); markDirty(); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 rounded-xl" style={{ background: `${BRAND.accent}10` }}>
                <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: BRAND.accent }}><Lightbulb className="h-3.5 w-3.5" /> نصيحة</p>
                <p className="text-xs text-gray-500 leading-relaxed">تظهر البانرات في شريط إعلاني أعلى متجرك. استخدمها للعروض والمناسبات والكوبونات.</p>
              </div>
            </div>
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto flex items-start justify-center py-6 px-4" style={{ background: '#EDEBF5' }}>
          <div className="transition-all duration-300 bg-white rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: canvasWidth, minWidth: device !== 'desktop' ? canvasWidth : undefined, maxWidth: '100%', minHeight: 600 }}>
            {/* Store nav preview */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg" style={{ background: storeTheme }} />
                <span className="font-bold text-sm" style={{ color: BRAND.primary }}>{store?.name ?? 'متجري'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded-lg" style={{ background: '#F5EFFA' }} />
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F5EFFA' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ccc' }} />
                </div>
              </div>
            </div>

            {/* Page label in canvas */}
            <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ background: `${BRAND.primary}06`, borderColor: '#ECE6F0' }}>
              <CurrentPageIcon className="h-3.5 w-3.5" style={{ color: BRAND.secondary }} />
              <span className="text-xs font-semibold" style={{ color: BRAND.secondary }}>{PAGE_LABELS[currentPage].label}</span>
              {currentPage !== 'home' && (
                <span className="mr-auto text-xs px-2 py-0.5 rounded-full" style={{ background: `${BRAND.accent}15`, color: BRAND.accent }}>
                  أقسام إضافية
                </span>
              )}
            </div>

            {/* Sections */}
            <div onClick={() => setSelectedId(null)}>
              {sections.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Tag className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium">لا توجد أقسام في هذه الصفحة</p>
                  <p className="text-xs mt-1">اضغط &quot;إضافة قسم&quot; من القائمة اليسرى</p>
                </div>
              ) : sections.map(section => (
                <div key={section.id} onClick={e => { e.stopPropagation(); setSelectedId(section.id); }}>
                  <SectionPreview
                    section={section} isSelected={selectedId === section.id}
                    onClick={() => setSelectedId(section.id)} storeTheme={storeTheme}
                  />
                </div>
              ))}
            </div>

            {/* Footer preview */}
            <div className="px-4 py-4 mt-2 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">مدعوم بـ <span style={{ color: BRAND.accent }}>بناء المتجر</span></p>
            </div>
          </div>
        </main>

        {/* Right Properties Panel */}
        <div className={`transition-all duration-300 flex-shrink-0 overflow-hidden border-r border-[#ECE6F0] ${selectedSection ? 'w-80' : 'w-0'}`}>
          {selectedSection && (
            <PropertiesPanel
              section={selectedSection}
              onChange={settings => updateSettings(selectedId!, settings)}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>

      {/* Hint bar */}
      {!selectedSection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
            style={{ background: BRAND.primary, color: 'white' }}>
            <Settings2 className="h-4 w-4" />
            انقر على أي قسم لتعديل خصائصه
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>}>
      <BuilderPageContent />
    </Suspense>
  );
}
