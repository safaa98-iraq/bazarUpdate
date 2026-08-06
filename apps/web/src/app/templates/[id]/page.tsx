'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Package, Mail, Megaphone } from 'lucide-react';
import { getStoreType } from '@/lib/store-types';
import { STORE_TEMPLATES, type BuilderSection } from '@/lib/store-templates';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const C = { bg: '#FBF9F2', dark: '#2F2E4B', accent: '#DB6E93', text2: '#6B6A83', border: '#DCE6F0', white: '#ffffff' };

function PreviewSection({ section, themeColor }: { section: BuilderSection; themeColor: string }) {
  const s = section.settings;

  switch (section.type) {
    case 'announcement':
      return (
        <div style={{ background: String(s.backgroundColor ?? themeColor), color: String(s.textColor ?? '#fff'), padding: '10px 20px', textAlign: 'center', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Megaphone size={14} /> {String(s.text)}
        </div>
      );

    case 'hero':
      return (
        <div style={{ background: String(s.backgroundColor ?? themeColor), padding: '70px 24px', textAlign: (s.textAlign as 'center' | 'right') ?? 'center', color: '#fff' }}>
          <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 'clamp(24px,4vw,38px)', margin: 0 }}>{String(s.title)}</h2>
          <p style={{ fontSize: 15, opacity: 0.85, margin: '10px 0 0' }}>{String(s.subtitle)}</p>
          <span style={{ display: 'inline-block', marginTop: 22, padding: '12px 28px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 14 }}>{String(s.buttonText)}</span>
        </div>
      );

    case 'categories': {
      return (
        <div style={{ padding: '36px 24px', maxWidth: 1000, margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 20, color: C.dark, textAlign: 'center', margin: '0 0 20px' }}>{String(s.title)}</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['الكل', 'وصل حديثاً', 'الأكثر مبيعاً', 'عروض'].map((c, i) => (
              <span key={i} style={{ padding: '9px 20px', borderRadius: 99, background: i === 0 ? themeColor : '#F5EFFA', color: i === 0 ? '#fff' : C.dark, fontSize: 13, fontWeight: 700 }}>{c}</span>
            ))}
          </div>
        </div>
      );
    }

    case 'products':
      return (
        <div style={{ padding: '10px 24px 44px', maxWidth: 1000, margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 20, color: C.dark, textAlign: 'center', margin: '0 0 20px' }}>{String(s.title)}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(Number(s.columns ?? 4), 4)}, 1fr)`, gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white }}>
                <div style={{ aspectRatio: '1/1', background: `${themeColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={26} color={themeColor} strokeWidth={1.5} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 8, width: '70%', borderRadius: 4, background: '#EEE9F5', marginBottom: 8 }} />
                  <div style={{ height: 10, width: '40%', borderRadius: 4, background: `${themeColor}30` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'features':
      return (
        <div style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 20, color: C.dark, textAlign: 'center', margin: '0 0 24px' }}>{String(s.title)}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${themeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Star size={18} color={themeColor} />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.dark, margin: 0 }}>{String(s[`feature${i}Title`] ?? '')}</p>
                <p style={{ fontSize: 12, color: C.text2, margin: '4px 0 0' }}>{String(s[`feature${i}Desc`] ?? '')}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'testimonials':
      return (
        <div style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto', background: '#F9F7FD' }}>
          <h3 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 20, color: C.dark, textAlign: 'center', margin: '0 0 24px' }}>{String(s.title)}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: C.white, borderRadius: 14, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {Array.from({ length: Number(s[`review${i}Stars`] ?? 5) }).map((_, j) => <Star key={j} size={12} fill={themeColor} color={themeColor} />)}
                </div>
                <p style={{ fontSize: 13, color: C.dark, margin: 0, lineHeight: 1.7 }}>{String(s[`review${i}Text`] ?? '')}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text2, margin: '10px 0 0' }}>{String(s[`review${i}Name`] ?? '')}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'newsletter':
      return (
        <div style={{ background: String(s.backgroundColor ?? themeColor), padding: '40px 24px', textAlign: 'center', color: '#fff' }}>
          <Mail size={22} style={{ opacity: 0.85, marginBottom: 8 }} />
          <h3 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 18, margin: 0 }}>{String(s.title)}</h3>
          <p style={{ fontSize: 13, opacity: 0.8, margin: '6px 0 16px' }}>{String(s.subtitle)}</p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 340, margin: '0 auto' }}>
            <div style={{ flex: 1, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ padding: '0 18px', borderRadius: 10, background: 'rgba(255,255,255,0.9)', color: C.dark, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center' }}>{String(s.buttonText)}</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function TemplatePreviewPage() {
  const { id } = useParams() as { id: string };
  const storeType = getStoreType(id);
  useDocumentTitle(`معاينة قالب ${storeType.label}`);
  const template = STORE_TEMPLATES.find(t => t.storeTypes.includes(id)) ?? STORE_TEMPLATES.find(t => t.storeTypes.includes('general'));

  if (!template) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }} dir="rtl">
        <p style={{ color: C.text2 }}>القالب غير موجود</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Tajawal', sans-serif" }} dir="rtl">
      {/* Preview chrome */}
      <div style={{ background: C.dark, padding: '14px 24px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/#templates" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', opacity: 0.85 }}>
            <ArrowLeft size={15} /> كل القوالب
          </Link>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, opacity: 0.9 }}>معاينة قالب: {storeType.label}</span>
          <Link href={`/register?template=${storeType.id}`}
            style={{ padding: '9px 20px', borderRadius: 10, background: C.accent, color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
            ابدأ بهذا القالب مجاناً ←
          </Link>
        </div>
      </div>

      {/* Rendered template */}
      <div style={{ boxShadow: '0 20px 50px rgba(47,46,75,0.12)' }}>
        {template.sections.map((section, i) => (
          <PreviewSection key={i} section={{ ...section, id: `preview-${i}` }} themeColor={template.themeColor} />
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ color: C.text2, fontSize: 14, marginBottom: 14 }}>هذه معاينة تقريبية — منتجاتك وصورك الحقيقية ستحل محل العناصر التجريبية فور إنشاء متجرك.</p>
        <Link href={`/register?template=${storeType.id}`}
          style={{ display: 'inline-block', padding: '14px 34px', borderRadius: 10, background: C.dark, color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
          ابدأ بهذا القالب مجاناً
        </Link>
      </div>
    </div>
  );
}
