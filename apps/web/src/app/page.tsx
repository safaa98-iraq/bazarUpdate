'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PLAN_CONFIGS, PLAN_COMPARISON, type PlanComparisonRow, type ArticlePublic } from '@storebuilder/types';
import { PlanPrice } from '@/components/pricing/PlanPrice';
import { STORE_TYPES } from '@/lib/store-types';
import { api } from '@/lib/api';
import {
  Store,
  LayoutTemplate, Palette, MonitorSmartphone,
  Lock, Zap, BadgeCheck, Heart, X, Menu, Check, Minus, Newspaper,
  Instagram, Truck, Facebook, Sparkles,
  type LucideIcon,
} from 'lucide-react';

/* ─── Design tokens ─── */
const C = {
  bg:        '#FBF9F2',
  white:     '#ffffff',
  dark:      '#2F2E4B',
  text2:     '#6B6A83',
  border:    '#DCE6F0',
  accent:    '#DB6E93',
  accentDark:'#B54D74',
  soft:      '#FBE1EA',
  blue:      '#4A8AC7',
  blueHover: '#3671A8',
  blueLight: '#DEEEFB',
  blueMid:   '#7EB2E0',
  green:     '#4F9F63',
  greenDark: '#3D7C56',
  greenLight:'#DCEEDA',
  butter:    '#FFF3C7',
  gold:      '#C99937',
  lavender:  '#E8DFF6',
  palePink:  '#F5F6DF',
  cyan:      '#C7F2FF',
  success:   '#4F9F63',
  note:      '#6B6A83',
};

/* ─── Shared styles ─── */
const HEADING: React.CSSProperties = { fontFamily: 'var(--font-cairo)' };
const SEC: React.CSSProperties = { padding: '72px 28px 0', fontFamily: "'Tajawal', sans-serif", position: 'relative' };
const TITLE: React.CSSProperties = { ...HEADING, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: C.dark, lineHeight: 1.3, margin: 0 };
const SUBP: React.CSSProperties = { fontSize: 17, color: C.text2, lineHeight: 1.9, margin: '12px 0 0', fontWeight: 300, maxWidth: '56ch' };
const INNER: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };

/* ─── Hooks ─── */
function useScrollReveal(threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

/* ─── Browser chrome mockup (used for hero + "see it work") ─── */
function BrowserFrame({ children, accentBg = C.blue, bodyBg = C.dark, style = {} }: {
  children: React.ReactNode; accentBg?: string; bodyBg?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', background: C.white, boxShadow: '0 12px 28px rgba(47,46,75,0.14)', ...style }}>
      <div style={{ background: accentBg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {['#fff9', '#fff7', '#fff5'].map((c, i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ background: bodyBg, padding: 16 }}>{children}</div>
    </div>
  );
}

/* ─── Reusable end-of-section CTA ─── */
function SectionCTA({ text = 'ابدأ الآن — أنشئ متجرك مجاناً' }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 36 }}>
      <Link href="/register">
        <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 16, background: C.dark, color: '#fff', padding: '15px 34px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'background .2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = C.blueHover)}
          onMouseLeave={e => (e.currentTarget.style.background = C.dark)}>
          {text} ←
        </button>
      </Link>
    </div>
  );
}

/* ─── Header ─── */
function LPHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const go = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); };

  const links = [
    { label: 'المزايا', id: 'features' },
    { label: 'التسويق', id: 'marketing' },
    { label: 'قصص تجار', id: 'stories' },
    { label: 'الأسئلة', id: 'faq' },
    { label: 'الأسعار', id: 'pricing' },
  ];

  return (
    <>
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Tajawal', sans-serif" }}>
        <span style={{ ...HEADING, fontWeight: 800, fontSize: 30, color: C.dark, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>بازار</span>
        <span style={{ flex: 1 }} />
        <nav className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(l => (
            <button key={l.id} onClick={() => go(l.id)}
              style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 400, fontSize: 15, color: C.dark, padding: '9px 16px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background .2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.blueLight)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {l.label}
            </button>
          ))}
          <Link href="/login" style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 400, fontSize: 15, color: C.dark, padding: '9px 16px', borderRadius: 10 }}>دخول</Link>
        </nav>
        <Link href="/register" className="lp-nav-cta">
          <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 15, background: C.blue, color: '#fff', padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.blueHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue)}>
            ابدأ مجاناً
          </button>
        </Link>
        <button className="lp-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}
          style={{ display: 'none', background: 'none', border: 'none', color: C.dark, cursor: 'pointer' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      {mobileOpen && (
        <div style={{ padding: '0 28px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {links.map(l => (
            <button key={l.id} onClick={() => go(l.id)}
              style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 400, fontSize: 15, color: C.dark, padding: '10px 4px', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer' }}>
              {l.label}
            </button>
          ))}
          <Link href="/login" style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 15, color: C.dark, padding: '10px 4px' }}>دخول</Link>
          <Link href="/register">
            <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 15, background: C.blue, color: '#fff', padding: 12, borderRadius: 10, border: 'none', width: '100%', marginTop: 8 }}>ابدأ مجاناً</button>
          </Link>
        </div>
      )}
    </>
  );
}

/* ─── Hero ─── */
/* Main hero visual: the dashboard mockup, with the 3D icons floating around it (not scattered across the whole hero) */
function HeroVisual() {
  const orbiters: { src: string; top: string; left?: string; right?: string; size: number; dur: number; delay: number; rotate: number }[] = [
    { src: '/images/floating/cart.png', top: '-10%', left: '-12%', size: 96, dur: 7, delay: 0, rotate: -8 },
    { src: '/images/floating/card.png', top: '68%', left: '-14%', size: 120, dur: 8.5, delay: 1.2, rotate: 6 },
    { src: '/images/floating/dress.png', top: '-8%', right: '-10%', size: 92, dur: 6.5, delay: 0.6, rotate: 7 },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes lp-float {
          0%, 100% { transform: translateY(0) rotate(var(--r)); }
          50% { transform: translateY(-16px) rotate(calc(var(--r) * -1)); }
        }
      `}</style>
      <div style={{ position: 'relative', width: '100%', maxWidth: 'none', height: 480 }}>
        {/* Main visual: dashboard mockup */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
          border: '5px solid #fff', boxShadow: '0 30px 60px rgba(47,46,75,0.28)',
        }}>
          <Image src="/images/floating/dashboard.png" alt="لوحة تحكم بازار" fill sizes="560px" style={{ objectFit: 'cover' }} priority />
        </div>

        {/* Orbiting icons */}
        {orbiters.map((it, i) => {
          const style = {
            position: 'absolute', top: it.top, left: it.left, right: it.right,
            width: it.size, height: it.size, zIndex: 2,
            animation: `lp-float ${it.dur}s ease-in-out ${it.delay}s infinite`,
            '--r': `${it.rotate}deg`,
            transform: `rotate(${it.rotate}deg)`,
            filter: 'drop-shadow(0 14px 24px rgba(47,46,75,0.22))',
          } as React.CSSProperties;
          return (
            <div key={i} style={style}>
              <Image src={it.src} alt="" fill sizes={`${it.size}px`} style={{ objectFit: 'contain' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LPHero() {
  const trust: { Icon: LucideIcon; t: string }[] = [
    { Icon: Zap, t: 'متجرك جاهز خلال 5 دقائق' },
    { Icon: Lock, t: 'بياناتك ومدفوعاتك آمنة' },
    { Icon: BadgeCheck, t: 'دعم عربي مباشر' },
  ];

  return (
    <section id="hero" style={{ ...SEC, paddingTop: 14, position: 'relative' }}>
      <div style={{ ...INNER, maxWidth: 'none' }}>
        <div className="hero-inner" style={{ background: `linear-gradient(180deg, ${C.lavender}EB, ${C.soft})`, borderRadius: 10, padding: '52px 48px 46px', display: 'grid', gridTemplateColumns: '6fr 6fr', gap: 28, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 13, color: C.blue, background: 'rgba(255,255,255,0.65)', border: `1px solid ${C.blueMid}55`, padding: '7px 14px', borderRadius: 99, marginBottom: 18 }}>
              <Store size={14} strokeWidth={2} />
              منصة تجارة إلكترونية عراقية 100%
            </span>

            <h1 style={{ ...HEADING, fontWeight: 800, fontSize: 'clamp(32px, 4.5vw, 58px)', lineHeight: 1.22, margin: 0, color: C.dark }}>
              أنشئ متجرك الإلكتروني
              <br />
              بنفسك بـ٥ دقائق.
            </h1>
            <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 400, fontSize: 17, lineHeight: 1.95, margin: '18px 0 0', maxWidth: '46ch', color: C.text2 }}>
              منصة عراقية تبني بها متجرك كاملاً: منتجاتك، طلباتك، والدفع عند الاستلام بالدينار — بلوحة واحدة بالعربي.{' '}
              <strong style={{ fontWeight: 700, color: C.blue }}>لا عمولة. لا برمجة. لا انتظار.</strong>
            </p>
            <div className="lp-hero-btns" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 30 }}>
              <Link href="/register">
                <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 17, background: C.dark, color: '#fff', padding: '16px 30px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.blueHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.dark)}>
                  ابدأ مجاناً
                </button>
              </Link>
              <button onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 17, color: C.accent, background: 'transparent', border: `2px solid ${C.blueMid}`, padding: '14px 28px', borderRadius: 10, cursor: 'pointer' }}>
                شوف بازار وهو يعمل
              </button>
            </div>

            <div className="lp-hero-trust" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: 28, paddingTop: 22, borderTop: `1px solid ${C.blueMid}30` }}>
              {trust.map((t, i) => (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 13.5, color: C.text2 }}>
                  <t.Icon size={15} strokeWidth={2} color={C.blue} />
                  {t.t}
                </div>
              ))}
            </div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ─── Value props (3 cards) ─── */
function LPValueProps() {
  const cards = [
    { bg: C.lavender, img: '/images/floating/dashboard.png', h: 'متجر جاهز بشكلك', p: 'اختر قالبك، بدّل الألوان، والشعار، وانشر. بلا سطر برمجة واحد.', frame: true },
    { bg: C.palePink, img: '/images/floating/card.png', h: 'دفع نقدي بالدينار', p: 'الدفع عند الاستلام بالدينار — بلا حساب خارجي ولا بطاقة ائتمانية.', frame: false },
    { bg: C.cyan, img: '/images/floating/todo.png', h: 'طلبات وشحن مرتبة', p: 'كل طلب بحالته، معلوماته مرتبة، جاهز للتسليم داخل العراق.', frame: false },
  ];
  return (
    <section style={{ ...SEC, paddingTop: 24 }}>
      <div style={{ ...INNER, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="value-props-grid">
        {cards.map((c, i) => (
          <div key={i} style={{ background: c.bg, borderRadius: 10, padding: '20px 26px 28px' }}>
            <div style={{ height: 210, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{
                position: 'relative', width: c.frame ? '92%' : '62%', height: c.frame ? '86%' : '86%',
                borderRadius: c.frame ? 12 : 0, overflow: c.frame ? 'hidden' : 'visible',
                border: c.frame ? '4px solid #fff' : 'none',
                boxShadow: c.frame ? '0 14px 30px rgba(47,46,75,0.22)' : 'none',
                filter: c.frame ? undefined : 'drop-shadow(0 14px 20px rgba(47,46,75,0.16))',
              }}>
                <Image src={c.img} alt={c.h} fill sizes="260px" style={{ objectFit: c.frame ? 'cover' : 'contain' }} />
              </div>
            </div>
            <h2 style={{ ...HEADING, fontWeight: 700, fontSize: 26, lineHeight: 1.4, margin: '8px 0 0', color: C.dark }}>{c.h}</h2>
            <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 15, lineHeight: 1.9, margin: '6px 0 0', color: C.text2 }}>{c.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Work ("see it work") ─── */
/* Rich builder-preview mockup: element order panel + theme swatches + template gallery cards */
function BuilderMockup() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Base browser frame — real product screenshot */}
      <BrowserFrame accentBg={C.accent} bodyBg={C.white}>
        <div style={{ position: 'relative', width: '100%', height: 240, borderRadius: 8, overflow: 'hidden' }}>
          <Image src="/images/floating/dashboard.png" alt="لوحة بناء متجر بازار" fill sizes="(max-width: 768px) 100vw, 700px" style={{ objectFit: 'cover' }} />
        </div>
      </BrowserFrame>

      {/* Floating: page-elements order panel (top-right) */}
      <div style={{ position: 'absolute', top: -18, right: '4%', width: '46%', background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 14px 30px rgba(47,46,75,0.16)' }}>
        <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 11.5, color: C.dark }}>ترتيب الصفحة الرئيسية</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {['بانر عريض', 'منتجات مميزة', 'مميزات المتجر'].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg, borderRadius: 8, padding: '6px 10px' }}>
              <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 10.5, color: C.text2 }}>{l}</span>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: C.border }} />
            </div>
          ))}
        </div>
      </div>

      {/* Floating: color swatches (right side, lower) */}
      <div style={{ position: 'absolute', bottom: '18%', right: '-4%', background: '#fff', borderRadius: 10, padding: 10, boxShadow: '0 14px 30px rgba(47,46,75,0.16)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[C.gold, C.blue, C.blueMid, C.green, C.accent, C.blueLight].map((clr, i) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: clr, border: i === 1 ? `2px solid ${C.dark}` : 'none' }} />
          ))}
        </div>
      </div>

      {/* Floating: template card (bottom-left) */}
      <div style={{ position: 'absolute', bottom: -20, left: '2%', width: '38%', background: '#fff', borderRadius: 10, padding: 8, boxShadow: '0 14px 30px rgba(47,46,75,0.16)' }}>
        <div style={{ height: 46, borderRadius: 8, background: C.soft, marginBottom: 6 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 600, fontSize: 9.5, color: C.dark }}>القالب الحالي</span>
          <Check size={11} color={C.green} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

function LPWork() {
  const bullets: { Icon: LucideIcon; bg: string; color: string; t: string; p: string }[] = [
    { Icon: LayoutTemplate, bg: C.blueLight, color: C.blueHover, t: 'قوالب جاهزة', p: 'ملابس، عطور، إلكترونيات — اختر وابدأ.' },
    { Icon: Palette, bg: C.soft, color: C.accentDark, t: 'ألوان وخطوط بضغطة', p: 'لوحة ألوان وخطوط عربية جاهزة.' },
    { Icon: MonitorSmartphone, bg: C.greenLight, color: C.greenDark, t: 'معاينة ثم نشر', p: 'شوف الشكل على الهاتف والحاسبة قبل النشر.' },
  ];

  return (
    <section id="work" style={SEC}>
      <div style={INNER}>
        <div className="work-grid" style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: 28, alignItems: 'center' }}>
          <BuilderMockup />
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 13, color: C.greenDark, background: C.greenLight, padding: '7px 14px', borderRadius: 99, marginBottom: 16 }}>
              <LayoutTemplate size={14} strokeWidth={2} />
              لوحة البناء
            </span>
            <h2 style={{ ...TITLE, fontSize: 'clamp(24px, 3vw, 36px)', maxWidth: '18ch' }}>شوف بازار وهو يعمل — قبل ما تسجّل.</h2>
            <p style={{ ...SUBP, maxWidth: '38ch' }}>هذي لوحة التاجر الحقيقية: تختار قالبك، تبدّل الألوان، وتشوف متجرك يتغيّر أمامك مباشرة. بلا أكواد، بلا انتظار وبرمجة.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
              {bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: b.bg }}>
                    <b.Icon size={17} strokeWidth={1.8} color={b.color} />
                  </span>
                  <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 14.5, lineHeight: 1.7, margin: 0, color: C.dark }}>
                    <strong style={{ fontWeight: 700 }}>{b.t}</strong>{' — '}<span style={{ fontWeight: 300, color: C.text2 }}>{b.p}</span>
                  </p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 26 }}>
              <Link href="/register">
                <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 15, background: C.dark, color: '#fff', padding: '13px 26px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.blueHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.dark)}>
                  ابدأ بناء متجرك الآن ←
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features: "problems solved" ─── */
function LPFeatures() {
  const [ref, visible] = useScrollReveal(0.1);
  const items: { img: string; color: string; micro: string; h: string; p: string; detail: string }[] = [
    { img: '/images/floating/settings.png', color: C.blue, micro: 'كل تعديل صغير يحتاج برمجة.', h: 'تعديل كل شيء بنفسك', p: 'الأسعار، الصور، الأسماء، الشكل — تتغيّر بضغطة وتنشر فوراً.', detail: 'لوحة تحكم عربية بسيطة، بدون الحاجة لمبرمج في أي تعديل.' },
    { img: '/images/floating/card.png', color: C.gold, micro: 'المنصات الأجنبية تحسب بالدولار.', h: 'بالدينار، وبلا عمولة', p: 'أسعارك بالدينار العراقي، ولا نأخذ نسبة من أي بيعة تبيعها.', detail: 'ما تدفع إلا اشتراك الخطة — أرباح كل بيعة كاملة لك.' },
    { img: '/images/floating/dashboard.png', color: C.greenDark, micro: 'الموقع يتأخر أسابيع.', h: 'متجرك يفتح اليوم', p: 'تسجّل، تختار قالبك، تضيف منتجاتك، وتنشر — بجلسة واحدة.', detail: 'قالب جاهز لكل نوع متجر، جاهز للنشر بنفس اليوم.' },
    { img: '/images/floating/cash.png', color: C.blue, micro: 'الدفع الإلكتروني معقّد على الزبون.', h: 'الدفع عند الاستلام', p: 'عميلك يطلب ويدفع كاش عند التسليم — الطريقة اللي يثق بها معظمهم.', detail: 'تقدر تفعّل الدفع الإلكتروني لاحقاً إذا حبيت، اختياري بالكامل.' },
    { img: '/images/floating/chart.png', color: C.blue, micro: 'لا تعرف شو يحدث في متجرك.', h: 'تقارير بالعربي', p: 'طلبات اليوم، أكثر منتج مبيعاً، ومن أين يأتي زوارك — بصفحة واحدة.', detail: 'أرقام واضحة تساعدك تقرر شنو تسوّق له أكثر.' },
    { img: '/images/floating/pencil.png', color: C.greenDark, micro: 'كتابة وصف كل منتج ممله.', h: 'وصف جاهز بالعربي', p: 'اكتب اسم المنتج، وبازار يقترح وصفاً عربياً تعدّله كيفما تريد.', detail: 'يوفّر عليك وقت كتابة الوصف لكل منتج جديد.' },
  ];

  return (
    <section id="features" ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <h2 style={{ ...TITLE, maxWidth: '24ch' }}>مشاكل التاجر العراقي — محلولة في بازار.</h2>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginTop: 34 }}>
          {items.map((it, i) => (
            <div key={i} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all .4s', transitionDelay: `${i * 70}ms` }}>
              <div style={{ position: 'relative', width: 72, height: 72, margin: '6px 0 10px' }}>
                <Image src={it.img} alt={it.h} fill sizes="72px" style={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 14px rgba(47,46,75,0.2))' }} />
              </div>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 16, lineHeight: 1.8, margin: 0, color: it.color }}>{it.micro}</p>
              <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 24, lineHeight: 1.45, margin: '4px 0 0', color: C.dark }}>{it.h}</h3>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 15, lineHeight: 1.9, margin: '6px 0 0', color: C.text2 }}>{it.p}</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10 }}>
                <Check size={15} color={C.green} strokeWidth={3} style={{ flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 13.5, lineHeight: 1.8, color: C.dark }}>{it.detail}</span>
              </div>
            </div>
          ))}
        </div>
        <SectionCTA text="ابدأ الآن وجرّب بنفسك" />
      </div>
    </section>
  );
}

/* ─── Ready-made store templates ─── */
function LPTemplates() {
  const [ref, visible] = useScrollReveal(0.1);

  return (
    <section id="templates" ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <h2 style={TITLE}>قالب جاهز لنوع متجرك</h2>
        <p style={SUBP}>اختر مجال متجرك وابدأ بتصميم جاهز ومخصص له — وعدّله كيفما تريد لاحقاً.</p>
        <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 30 }}>
          {STORE_TYPES.map((t, i) => (
            <Link key={t.id} href={`/templates/${t.id}`}
              style={{
                display: 'block', textDecoration: 'none', borderRadius: 10, padding: '22px 20px',
                background: C.white, border: `1px solid ${C.border}`,
                opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all .4s, box-shadow .2s, border-color .2s', transitionDelay: `${i * 50}ms`,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 12px 30px ${t.themeColor}22`; e.currentTarget.style.borderColor = t.themeColor; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border; }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: `${t.themeColor}15` }}>
                <t.icon size={22} strokeWidth={1.8} color={t.themeColor} />
              </span>
              <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 18, margin: '14px 0 0', color: C.dark }}>{t.label}</h3>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14, lineHeight: 1.8, margin: '6px 0 0', color: C.text2 }}>{t.description}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14, fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 13, color: t.themeColor }}>
                معاينة القالب ←
              </span>
            </Link>
          ))}
        </div>
        <SectionCTA text="اختر مجالك وابدأ الآن" />
      </div>
    </section>
  );
}

/* ─── Marketing tools ─── */
function LPMarketing() {
  const [ref, visible] = useScrollReveal(0.1);
  const items: { img: string; color: string; h: string; p: string; detail: string }[] = [
    { img: '/images/floating/coupon.png', color: C.blue, h: 'كوبونات وأكواد خصم', p: 'أنشئ كوبوناً بنسبة أو مبلغ، أو ضع حداً أدنى للطلب، أو حصره على منتج معيّن.', detail: 'مثال: خصم 20% لأول طلب، أو توصيل مجاني فوق مبلغ معيّن.' },
    { img: '/images/floating/message.png', color: C.greenDark, h: 'رسائل SMS للزبائن', p: 'تنبيه الشحنة، شكر بعد الاستلام، عروض المناسبات — تصل مباشرة إلى جوالاتهم.', detail: 'رسالة تلقائية فور تغيّر حالة الطلب، بلا أي إعداد يدوي.' },
    { img: '/images/floating/share.png', color: C.blue, h: 'شارك على السوشيال', p: 'رابط منتج بضغطة إلى إنستغرام وواتساب وفيسبوك — بصورة وسعر جاهزين.', detail: 'مشاركة جاهزة بدون تصميم يدوي أو أخذ سكرين شوت.' },
    { img: '/images/floating/gift.png', color: C.accent, h: 'برنامج إحالات', p: 'زبونك يجلب زبوناً جديداً، يربح خصماً — ومتجرك يكبر بنفسه.', detail: 'رابط إحالة خاص لكل زبون، تتبعه من لوحتك مباشرة.' },
    { img: '/images/floating/search.png', color: C.greenDark, h: 'تحسين ظهور جوجل', p: 'عناوين ووصف تلقائي بالعربي — يظهر متجرك حين يبحث زبون عن منتجك.', detail: 'بدون أي إعداد تقني أو خبرة SEO مسبقة.' },
  ];

  return (
    <section id="marketing" ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <h2 style={TITLE}>أدوات تسويقية جاهزة داخل المتجر</h2>
        <p style={SUBP}>تكسب زبائن جدد وترجّع الهاربين — بلا اشتراكات إضافية ولا برامج طرف ثالث.</p>
        <div className="marketing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 10, padding: '22px 24px 24px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all .4s', transitionDelay: `${i * 70}ms` }}>
              <div style={{ position: 'relative', width: 64, height: 64 }}>
                <Image src={it.img} alt={it.h} fill sizes="64px" style={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 14px rgba(47,46,75,0.18))' }} />
              </div>
              <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 20, lineHeight: 1.4, margin: '14px 0 0', color: C.dark }}>{it.h}</h3>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14.5, lineHeight: 1.9, margin: '6px 0 0', color: C.text2 }}>{it.p}</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 10 }}>
                <Check size={13} color={C.green} strokeWidth={3} style={{ flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 12.5, lineHeight: 1.8, color: C.dark }}>{it.detail}</span>
              </div>
            </div>
          ))}
        </div>
        <SectionCTA text="فعّل أدوات التسويق الآن" />
      </div>
    </section>
  );
}

/* ─── What's new ─── */
function LPWhatsNew() {
  const [ref, visible] = useScrollReveal(0.1);
  const items: { img?: string; Icon?: LucideIcon; iconBg?: string; color: string; h: string; p: string }[] = [
    { img: '/images/floating/draftorder.png', color: C.blue, h: 'طلبات يدوية', p: 'سجّل طلباً وصلك عبر واتساب أو انستغرام مباشرة من لوحتك.' },
    { img: '/images/floating/abandoned.png', color: C.accent, h: 'تنبيه السلال المتروكة', p: 'اعرف زبائن تركوا سلتهم قبل الدفع وتواصل معهم بضغطة.' },
    { img: '/images/floating/printerfax.png', color: C.greenDark, h: 'طباعة فاتورة وبوليصة شحن', p: 'اطبع فاتورة الطلب أو بوليصة الشحن جاهزة من صفحة الطلبات.' },
    { img: '/images/floating/filters.png', color: C.blue, h: 'فلاتر تصفح أقوى', p: 'زبونك يفلتر حسب السعر والتقييم ليصل لمنتجه بسرعة.' },
    { img: '/images/floating/sizeguide.png', color: C.gold, h: 'دليل المقاسات', p: 'أضف جدول مقاسات لكل منتج أو للمتجر كله دفعة واحدة.' },
    { img: '/images/floating/countdown.png', color: C.accent, h: 'عدّاد تنازلي للعروض', p: 'حدّد نهاية العرض ويظهر عدّاد تنازلي في صفحة المنتج.' },
    { img: '/images/floating/recent.png', color: C.greenDark, h: 'شوهد مؤخراً', p: 'يعرض لزبونك آخر المنتجات التي تصفحها ليرجع لها بسهولة.' },
    { img: '/images/floating/badge.png', color: C.blue, h: 'شارات تلقائية', p: '"الأكثر مبيعاً" و"وصل حديثاً" تظهر تلقائياً بلا أي إعداد.' },
    { img: '/images/floating/loyaltystars.png', color: C.gold, h: 'نقاط ولاء للزبائن', p: 'زبونك يجمع نقاطاً مع كل عملية شراء ويستبدلها بخصومات.' },
    { img: '/images/floating/compare.png', color: C.greenDark, h: 'مقارنة أداء المتاجر', p: 'للوحة السوبر أدمن: قارن الإيرادات والنمو بين كل المتاجر.' },
    { img: '/images/floating/chatnotify.png', color: C.accent, h: 'إشعار فوري بالرسائل', p: 'تنبيه لحظي لك وللزبون عند وصول رسالة جديدة في المحادثة.' },
  ];

  return (
    <section id="whats-new" ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 13, color: C.accentDark, background: C.soft, padding: '7px 14px', borderRadius: 99, marginBottom: 16 }}>
          <Sparkles size={14} strokeWidth={2} />
          جديد في بازار
        </span>
        <h2 style={{ ...TITLE, maxWidth: '26ch' }}>مزايا أضفناها لك مؤخراً</h2>
        <p style={SUBP}>إلى جانب بطاقات الهدايا، الخصومات المتدرجة، ومتغيرات المنتج (لون/مقاس بمخزون منفصل)، واستيراد وتصدير المنتجات عبر Excel.</p>
        <div className="whatsnew-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 32 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 10, padding: '18px 18px 20px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all .4s', transitionDelay: `${i * 50}ms` }}>
              {it.img ? (
                <div style={{ position: 'relative', width: 52, height: 52 }}>
                  <Image src={it.img} alt={it.h} fill sizes="52px" style={{ objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(47,46,75,0.16))' }} />
                </div>
              ) : it.Icon ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 12, background: it.iconBg }}>
                  <it.Icon size={24} strokeWidth={1.8} color={it.color} />
                </span>
              ) : null}
              <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 16.5, lineHeight: 1.4, margin: '12px 0 0', color: C.dark }}>{it.h}</h3>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 13, lineHeight: 1.8, margin: '5px 0 0', color: C.text2 }}>{it.p}</p>
            </div>
          ))}
        </div>
        <SectionCTA text="جرّب المزايا الجديدة الآن" />
      </div>
    </section>
  );
}

/* ─── Steps ─── */
const ARABIC_INDIC = ['١', '٢', '٣', '٤', '٥'];

function LPSteps() {
  const steps: { title: string; desc: string }[] = [
    { title: 'سجّل بدقيقة', desc: 'رقم هاتف واسم متجر. بلا بطاقة دفع.' },
    { title: 'اختر قالبك', desc: 'قوالب جاهزة للملابس والعطور والإلكترونيات.' },
    { title: 'أضف منتجاتك', desc: 'صورة وسعر بالدينار — والوصف نقترحه لك.' },
    { title: 'فعّل الدفع والتوصيل', desc: 'دفع عند الاستلام ومناطق توصيل داخل العراق.' },
    { title: 'انشر وابدأ البيع', desc: 'رابط متجرك جاهز للنشر على إنستغرام وواتساب.' },
  ];

  return (
    <section id="steps" style={SEC}>
      <div style={INNER}>
        <div style={{ background: C.greenLight, borderRadius: 10, padding: '48px 44px' }}>
          <h2 style={{ ...TITLE, maxWidth: '20ch' }}>من التسجيل إلى أول طلب — خمس خطوات.</h2>
          <div className="steps-grid-h" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginTop: 34 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ ...HEADING, fontWeight: 800, fontSize: 52, lineHeight: 1, color: C.green }}>{ARABIC_INDIC[i]}</span>
                <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 21, lineHeight: 1.45, margin: 0, color: C.dark }}>{s.title}</h3>
                <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14.5, lineHeight: 1.85, margin: 0, color: C.text2 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <SectionCTA text="سجّل الآن وابدأ خطوتك الأولى" />
        </div>
      </div>
    </section>
  );
}

/* ─── Stories / testimonials ─── */
function LPStories() {
  const stories = [
    { quote: 'أنشأت متجري في يوم واحد. أول طلب وصل ثاني يوم — دفع عند الاستلام مثل ما تعوّد الزبون.', name: 'عمر الحلي', sub: 'عطور عمر — بغداد', letter: 'ع', from: C.blueLight, to: C.blueMid },
    { quote: 'كنت أحسب أحتاج مبرمج لمتجري. اكتشفت أن اللوحة عربية وسهلة أكثر من إنستغرام.', name: 'ريام الجبوري', sub: 'أزياء ريام — البصرة', letter: 'ر', from: C.greenLight, to: C.green },
    { quote: 'صار عندي لوحة طلبات تخبرني كل شيء بالعربي. الفرق واضح من أول شهر.', name: 'أحمد كريم', sub: 'إلكترونيات الجزيرة — أربيل', letter: 'أ', from: C.soft, to: C.accent },
  ];

  return (
    <section id="stories" style={SEC}>
      <div style={INNER}>
        <div style={{ maxWidth: 640 }}>
          <h2 style={TITLE}>تجار يبيعون على بازار اليوم</h2>
          <p style={SUBP}>قصص حقيقية من متاجر عراقية فتحت أبوابها خلال أسابيع.</p>
        </div>
        <div className="stories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 32 }}>
          {stories.map((s, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 10, padding: '28px 26px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 400, fontSize: 16.5, lineHeight: 1.85, margin: 0, color: C.dark }}>&quot;{s.quote}&quot;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 48, height: 48, borderRadius: 10, background: `linear-gradient(135deg, ${s.from}, ${s.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...HEADING, fontWeight: 700, fontSize: 20, color: '#fff' }}>{s.letter}</span>
                <div>
                  <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 600, fontSize: 15, margin: 0, color: C.dark }}>{s.name}</p>
                  <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 13, margin: '2px 0 0', color: C.text2 }}>{s.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison vs. Shopify ─── */
function ComparisonIllustration() {
  return (
    <svg viewBox="0 0 340 240" width="100%" height="100%" fill="none">
      <rect x="20" y="60" width="140" height="150" rx="10" fill={C.blueLight} />
      <path d="M20 76 L90 30 L160 76" fill={C.blueMid} />
      <rect x="46" y="106" width="88" height="24" rx="10" fill="#fff" />
      <rect x="46" y="140" width="88" height="10" rx="10" fill={C.blueMid} />
      <rect x="46" y="156" width="60" height="8" rx="10" fill={C.blueMid} opacity="0.5" />
      <rect x="46" y="170" width="88" height="26" rx="10" fill={C.blue} />
      <text x="90" y="188" textAnchor="middle" fontFamily="Tajawal,sans-serif" fontSize="12" fontWeight="700" fill="#fff">د.ع</text>
      <rect x="180" y="60" width="140" height="150" rx="10" fill={C.butter} />
      <path d="M180 76 L250 30 L320 76" fill="#C6BDD8" />
      <rect x="206" y="106" width="88" height="24" rx="10" fill="#fff" />
      <rect x="206" y="140" width="88" height="10" rx="10" fill="#C6BDD8" />
      <rect x="206" y="156" width="60" height="8" rx="10" fill="#C6BDD8" opacity="0.5" />
      <rect x="206" y="170" width="88" height="26" rx="10" fill="#9494AC" />
      <text x="250" y="188" textAnchor="middle" fontFamily="Tajawal,sans-serif" fontSize="11" fontWeight="700" fill="#fff">USD</text>
      <circle cx="170" cy="26" r="18" fill="#F5CE6A" />
      <text x="170" y="32" textAnchor="middle" fontFamily="Tajawal,sans-serif" fontSize="14" fontWeight="700" fill={C.dark}>VS</text>
    </svg>
  );
}

type CompareCellVal = boolean | string;

function ShopifyCompareCell({ value }: { value: CompareCellVal }) {
  if (value === true) return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(79,159,99,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={13} color={C.green} strokeWidth={3} />
      </div>
    </div>
  );
  if (value === false) return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={13} color="#DC2626" strokeWidth={3} />
      </div>
    </div>
  );
  return <span>{value}</span>;
}

function LPComparison() {
  const [ref, visible] = useScrollReveal(0.1);
  const rows: { label: string; bazar: CompareCellVal; shopify: CompareCellVal }[] = [
    { label: 'السعر الشهري', bazar: `من ${PLAN_CONFIGS.FREE.priceIQD.toLocaleString('en')} حتى ${PLAN_CONFIGS.ENTERPRISE.priceIQD.toLocaleString('en')} د.ع`, shopify: '$29 — $299 / شهر' },
    { label: 'عمولة على كل بيعة', bazar: 'صفر %', shopify: '0.5% — 2%' },
    { label: 'واجهة ولوحة تاجر بالعربي بالكامل', bazar: true, shopify: false },
    { label: 'عملة الاشتراك', bazar: 'دينار عراقي', shopify: 'دولار أمريكي' },
    { label: 'طريقة دفع الاشتراك', bazar: 'زين كاش أو تحويل بنكي محلي', shopify: 'بطاقة ائتمان دولية' },
    { label: 'لا حاجة لبطاقة ائتمان للبدء', bazar: true, shopify: false },
    { label: 'الدفع عند الاستلام (كاش)', bazar: 'جاهز من أول يوم', shopify: 'يحتاج تطبيقات إضافية' },
    { label: 'دفع عبر QR / تحويل بنكي محلي', bazar: true, shopify: false },
    { label: 'إعداد المتجر ونشره', bazar: 'خلال دقائق', shopify: 'يحتاج خبرة تقنية' },
    { label: 'التوصيل داخل العراق', bazar: 'مناطق ومحافظات جاهزة', shopify: 'تُضبط يدوياً' },
    { label: 'الدعم الفني', bazar: 'بالعربي وبتوقيت بغداد', shopify: 'بالإنجليزية وبتوقيت مختلف' },
    { label: 'كوبونات الخصم', bazar: true, shopify: true },
    { label: 'تحليلات المبيعات', bazar: true, shopify: true },
    { label: 'تطبيقات وإضافات خارجية', bazar: 'مدمجة ضمن الباقة', shopify: 'مدفوعة في معظمها' },
    { label: 'رسوم خفية', bazar: 'بدون', shopify: 'قد تُضاف رسوم معاملات' },
    { label: 'مناسب للسوق العراقي والخليجي', bazar: true, shopify: false },
  ];

  return (
    <section ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <div className="compare-grid" style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 36, alignItems: 'center' }}>
          <div style={{ height: 260 }}><ComparisonIllustration /></div>
          <div>
            <h2 style={{ ...TITLE, fontSize: 'clamp(26px, 3.4vw, 40px)', maxWidth: '22ch' }}>بازار أو Shopify، الفرق واضح، لا شعارات.</h2>
            <p style={{ ...SUBP, maxWidth: '52ch' }}>Shopify منصة ممتازة بُنيت لتاجر أمريكي يستلم دفعاً ببطاقة. بازار بُني لتاجر يبيع في بغداد ويستلم كاش عند الباب — مقارنة تفصيلية بكل الفروقات.</p>
          </div>
        </div>

        <div className="compare-table-wrap" style={{ marginTop: 30, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all .5s', overflowX: 'auto' }}>
          <div style={{ minWidth: 640, background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: '18px 20px' }} />
              <div style={{ padding: '16px 8px', textAlign: 'center', background: `${C.green}0f` }}>
                <span style={{ ...HEADING, fontWeight: 800, fontSize: 17, color: C.green }}>بازار</span>
              </div>
              <div style={{ padding: '16px 8px', textAlign: 'center' }}>
                <span style={{ ...HEADING, fontWeight: 800, fontSize: 17, color: C.text2 }}>Shopify</span>
              </div>
            </div>
            {rows.map((r, i) => (
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ padding: '14px 20px', fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 14, color: C.dark, display: 'flex', alignItems: 'center' }}>{r.label}</div>
                <div style={{ padding: '14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: `${C.green}08`, fontFamily: "'Tajawal', sans-serif", fontWeight: 600, fontSize: 13, color: C.dark }}>
                  <ShopifyCompareCell value={r.bazar} />
                </div>
                <div style={{ padding: '14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: "'Tajawal', sans-serif", fontWeight: 400, fontSize: 13, color: C.text2 }}>
                  <ShopifyCompareCell value={r.shopify} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 13.5, lineHeight: 1.85, margin: '18px 0 0', color: C.text2 }}>
            المقارنة مبنية على الخطط الأساسية المعلنة لكل منصة وقت كتابة هذه الصفحة. Shopify علامة تجارية مسجلة لأصحابها.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Integrations ─── */
function WhatsAppGlyph({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.35 5.06L2 22l5.06-1.32A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm5.2 14.15c-.22.62-1.28 1.18-1.77 1.24-.45.06-1.02.08-1.65-.1-.38-.11-.87-.28-1.5-.55-2.64-1.14-4.36-3.79-4.5-3.97-.13-.18-1.08-1.44-1.08-2.74 0-1.3.68-1.94.93-2.2.24-.27.53-.33.7-.33h.5c.16 0 .38-.06.6.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.13.29-.26.44-.13.16-.28.35-.4.47-.13.13-.27.28-.12.55.15.27.68 1.11 1.46 1.79 1 .88 1.85 1.15 2.11 1.28.27.13.42.11.58-.07.16-.18.67-.78.85-1.05.18-.27.36-.22.6-.13.24.09 1.53.72 1.79.85.27.13.44.2.51.31.07.13.07.71-.15 1.33Z" />
    </svg>
  );
}
function TikTokGlyph({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M16.8 2h-3.2v13.4a2.6 2.6 0 1 1-1.9-2.5V9.3a6 6 0 1 0 5.1 5.94V9.1a7.3 7.3 0 0 0 4.2 1.34V7.14A4.4 4.4 0 0 1 16.8 2Z" />
    </svg>
  );
}
function SnapchatGlyph({ size = 24, color = '#000' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M12 2a7 7 0 0 1 7 7c0 3.5 1 5 2 6l-2 1v1c-2 1-4 1-5 1a4.4 4.4 0 0 1-4 2 4.4 4.4 0 0 1-4-2c-1 0-3 0-5-1v-1l-2-1c1-1 2-2.5 2-6a7 7 0 0 1 7-7z" />
    </svg>
  );
}

function LPIntegrations() {
  const [ref, visible] = useScrollReveal(0.1);
  const apps: { label: string; bg: string; render: () => React.ReactNode }[] = [
    { label: 'إنستغرام', bg: 'linear-gradient(135deg, #833AB4, #DB6E93, #F5A623)', render: () => <Instagram size={24} color="#fff" strokeWidth={1.8} /> },
    { label: 'واتساب', bg: '#25D366', render: () => <WhatsAppGlyph size={24} /> },
    { label: 'فيسبوك', bg: '#1877F2', render: () => <Facebook size={22} color="#fff" strokeWidth={2} /> },
    { label: 'سناب شات', bg: '#FFFC00', render: () => <SnapchatGlyph size={24} /> },
    { label: 'تيك توك', bg: '#000000', render: () => <TikTokGlyph size={24} /> },
    { label: 'شركات التوصيل', bg: C.butter, render: () => <Truck size={24} color={C.blue} strokeWidth={1.8} /> },
  ];

  return (
    <section id="integrations" ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <div style={{ background: C.butter, borderRadius: 10, padding: '44px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, maxWidth: 520 }}>
              <h2 style={{ ...TITLE, fontSize: 'clamp(24px, 3vw, 36px)' }}>تتصل بالأدوات التي تستخدمها كل يوم</h2>
              <p style={SUBP}>اربط بازار بإنستغرام، واتساب، فيسبوك، تيك توك، وسناب شات، وشركات التوصيل المحلية — بضغطة واحدة، بلا أكواد.</p>
            </div>
            <span style={{ flex: 1 }} />
            <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 15, color: C.blue, padding: '12px 22px', border: `1px solid ${C.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer' }}>
              اطّلع على كل التطبيقات
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginTop: 28 }} className="integrations-grid">
            {apps.map((a, i) => (
              <div key={a.label}
                style={{ background: C.white, borderRadius: 10, padding: '18px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all .4s', transitionDelay: `${i * 60}ms` }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 10, background: a.bg }}>
                  {a.render()}
                </span>
                <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 13, color: C.dark }}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Latest from the blog ─── */
function LPBlog() {
  const [ref, visible] = useScrollReveal(0.1);
  const [articles, setArticles] = useState<ArticlePublic[]>([]);

  useEffect(() => {
    api.get<{ success: boolean; data: ArticlePublic[] }>('/api/articles?limit=3', { noAuth: true })
      .then(r => setArticles(r.data ?? []))
      .catch(() => null);
  }, []);

  if (!articles.length) return null;

  return (
    <section ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={TITLE}>من مدونة بازار</h2>
            <p style={SUBP}>نصائح ودلائل للتجارة الإلكترونية في العراق.</p>
          </div>
          <Link href="/blog" style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 14, color: C.blue, whiteSpace: 'nowrap' }}>
            كل المقالات ←
          </Link>
        </div>
        <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 30 }}>
          {articles.map((a, i) => (
            <Link key={a.id} href={`/blog/${a.slug}`}
              style={{
                display: 'block', textDecoration: 'none', borderRadius: 10, overflow: 'hidden',
                background: C.white, border: `1px solid ${C.border}`,
                opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all .4s', transitionDelay: `${i * 80}ms`,
              }}>
              <div style={{ aspectRatio: '16 / 9', background: '#F5EFFA', position: 'relative', overflow: 'hidden' }}>
                {a.coverImage
                  ? <Image src={a.coverImage} alt={a.title} fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover" />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Newspaper size={28} color={C.border} /></div>}
              </div>
              <div style={{ padding: '18px 20px' }}>
                {a.category && <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 12, color: C.accent }}>{a.category}</span>}
                <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 17, lineHeight: 1.5, margin: '6px 0 0', color: C.dark }}>{a.title}</h3>
                {a.excerpt && <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 13, lineHeight: 1.8, margin: '8px 0 0', color: C.text2 }} className="line-clamp-2">{a.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function LPFaq() {
  const [open, setOpen] = useState(0);
  const faqs = [
    { q: 'هل المجاني محدود بمدة؟', a: 'لا. تبقى على الخطة المجانية ما شئت، وتترقّى فقط عندما يكبر متجرك ويتجاوز حدودها.' },
    { q: 'هل تأخذون نسبة من مبيعاتي؟', a: 'لا عمولة على البيع. تدفع اشتراكاً شهرياً ثابتاً فقط، وكل ما يدفعه الزبون يصلك إليك.' },
    { q: 'أحتاج خبرة تقنية؟', a: 'إذا تعرف تنشر منشوراً على إنستغرام، تعرف تدير متجرك على بازار. لا أكواد ولا إعدادات معقّدة.' },
    { q: 'كيف يدفع زبوني؟', a: 'الدفع عند الاستلام بالدينار — الطريقة الأكثر ثقة لدى المشتري العراقي، ومتاحة من أول يوم.' },
    { q: 'أستطيع استخدام نطاقي الخاص؟', a: 'نعم، تربط نطاقك في الخطط المدفوعة، أو تبدأ برابط على نطاق بازار مجاناً.' },
    { q: 'وإذا قررت التوقف؟', a: 'تلغي الاشتراك متى شئت، بلا عقد ولا رسوم إلغاء. بياناتك ومنتجاتك تبقى محفوظة.' },
  ];

  return (
    <section id="faq" style={SEC}>
      <div style={INNER}>
        <h2 style={TITLE}>أسئلة قبل ما تدفع</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28, maxWidth: 900 }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ background: C.white, borderRadius: 10, overflow: 'hidden' }}>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', textAlign: 'right', background: 'transparent', border: 0, cursor: 'pointer', padding: '22px 26px' }}>
                  <span style={{ ...HEADING, fontWeight: 700, fontSize: 21, lineHeight: 1.45, color: C.dark }}>{f.q}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 22, lineHeight: 1, borderRadius: 10, background: isOpen ? C.blue : C.butter, color: isOpen ? '#fff' : C.blue }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 15.5, lineHeight: 1.95, margin: 0, padding: '0 26px 24px', maxWidth: '70ch', color: C.text2 }}>{f.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function LPPricing() {
  const [ref, visible] = useScrollReveal(0.1);
  const plans = [
    { key: 'FREE' as const, name: PLAN_CONFIGS.FREE.nameAr, desc: 'تجربة مثالية لفتح متجرك الأول.', features: PLAN_CONFIGS.FREE.features, cta: 'ابدأ مجاناً', featured: false },
    { key: 'PRO' as const, name: PLAN_CONFIGS.PRO.nameAr, badge: PLAN_CONFIGS.PRO.badge ?? 'الأكثر فعالية', desc: 'لمتجر يبيع كل يوم.', features: PLAN_CONFIGS.PRO.features, cta: 'ابدأ مجاناً ثم ترقّى', featured: true },
    { key: 'ENTERPRISE' as const, name: PLAN_CONFIGS.ENTERPRISE.nameAr, desc: 'لمتجر بفريق ومخزون.', features: PLAN_CONFIGS.ENTERPRISE.features, cta: 'تحدّث معنا', featured: false },
  ];

  return (
    <section id="pricing" ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <h2 style={TITLE}>أسعار واضحة بالدينار</h2>
        <p style={SUBP}>ابدأ مجاناً. لا عمولة على مبيعاتك في كل الخطط.</p>
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 30, alignItems: 'start' }}>
          {plans.map((plan, i) => (
            <div key={plan.key}
              style={{ background: plan.featured ? C.blueLight : C.white, borderRadius: 10, padding: '32px 30px 34px', boxShadow: plan.featured ? '0 18px 40px rgba(74,138,199,0.22)' : 'none', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all .4s', transitionDelay: `${i * 100}ms` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ ...HEADING, fontWeight: 700, fontSize: 26, margin: 0, color: C.dark }}>{plan.name}</h3>
                {plan.badge && (
                  <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 13, background: C.blue, color: '#fff', padding: '5px 12px', borderRadius: 10 }}>{plan.badge}</span>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                <PlanPrice plan={plan.key} align="right" />
              </div>
              <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 15, lineHeight: 1.9, margin: '8px 0 0', color: C.text2 }}>{plan.desc}</p>
              <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14, lineHeight: 2.05, color: C.dark, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {plan.features.slice(0, 5).map((f, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.success, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <button style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 22, fontFamily: "'Tajawal', sans-serif", fontWeight: plan.featured ? 700 : 500, fontSize: 16, background: plan.featured ? C.blue : 'transparent', color: plan.featured ? '#fff' : C.dark, border: plan.featured ? 'none' : `2px solid ${C.dark}`, padding: plan.featured ? 15 : 13, borderRadius: 10, cursor: 'pointer', transition: 'opacity .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Plan Comparison Table ─── */
type CompareCellValue = boolean | string | null;

function CompareCell({ value, colColor }: { value: CompareCellValue; colColor: string }) {
  if (value === true) return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${colColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={12} color={colColor} strokeWidth={3} />
      </div>
    </div>
  );
  if (value === false) return <div style={{ display: 'flex', justifyContent: 'center' }}><Minus size={14} color="#D1D5DB" /></div>;
  if (value === null) return <div style={{ display: 'flex', justifyContent: 'center' }}><X size={14} color="#EF4444" /></div>;
  return <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: colColor }}>{value}</div>;
}

function LPPlanComparison() {
  const [ref, visible] = useScrollReveal(0.1);
  const rows: PlanComparisonRow[] = PLAN_COMPARISON;
  const cols: { key: 'FREE' | 'PRO' | 'ENTERPRISE'; label: string; color: string }[] = [
    { key: 'FREE', label: PLAN_CONFIGS.FREE.nameAr, color: C.text2 },
    { key: 'PRO', label: PLAN_CONFIGS.PRO.nameAr, color: C.blue },
    { key: 'ENTERPRISE', label: PLAN_CONFIGS.ENTERPRISE.nameAr, color: C.accent },
  ];

  return (
    <section ref={ref as React.RefObject<HTMLElement>} style={SEC}>
      <div style={INNER}>
        <h2 style={TITLE}>قارن الباقات ميزة بميزة</h2>
        <p style={SUBP}>شوف بالضبط شنو يميّز كل باقة قبل ما تقرر.</p>
        <div className="compare-table-wrap" style={{ marginTop: 30, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all .5s', overflowX: 'auto' }}>
          <div style={{ minWidth: 560, background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: '16px 20px' }} />
              {cols.map(col => (
                <div key={col.key} style={{ padding: '16px 8px', textAlign: 'center', background: col.key === 'PRO' ? `${C.blue}08` : col.key === 'ENTERPRISE' ? `${C.accent}08` : 'transparent' }}>
                  <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 800, fontSize: 13, color: C.dark }}>{col.label}</span>
                </div>
              ))}
            </div>
            {rows.map((row, i) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', background: row.highlight ? `${C.dark}04` : 'transparent' }}>
                <div style={{ padding: '12px 20px' }}>
                  <div style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 13, fontWeight: 500, color: C.dark }}>{row.label}</div>
                  {row.sub && <div style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 11, color: C.text2, marginTop: 1 }}>{row.sub}</div>}
                </div>
                {cols.map(col => (
                  <div key={col.key} style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CompareCell value={row[col.key]} colColor={col.color} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCtaIllustration() {
  return (
    <svg viewBox="0 0 300 240" width="100%" height="100%" fill="none">
      <rect x="40" y="90" width="220" height="130" rx="10" fill={C.blueMid} />
      <path d="M40 90 L150 40 L260 90" fill={C.blue} />
      <rect x="66" y="120" width="76" height="70" rx="10" fill="#fff" />
      <rect x="80" y="136" width="48" height="10" rx="10" fill={C.blueMid} />
      <rect x="80" y="152" width="40" height="8" rx="10" fill={C.border} />
      <rect x="80" y="170" width="48" height="14" rx="10" fill="#F5CE6A" />
      <rect x="164" y="120" width="76" height="70" rx="10" fill="#fff" />
      <rect x="178" y="136" width="48" height="10" rx="10" fill={C.accent} />
      <rect x="178" y="152" width="34" height="8" rx="10" fill={C.border} />
      <rect x="178" y="170" width="48" height="14" rx="10" fill={C.green} />
      <circle cx="150" cy="30" r="12" fill={C.accent} />
      <path d="M138 30 L144 36 L162 20" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 60 l4 -8 M56 46 l6 -6 M76 40 l2 -8 M226 40 l4 -8 M246 46 l8 -4 M262 60 l6 -4" stroke="#F5CE6A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function LPFinalCTA() {
  return (
    <section style={SEC}>
      <div style={INNER}>
        <div style={{ background: C.dark, borderRadius: 10, padding: '52px 48px', display: 'grid', gridTemplateColumns: '7fr 4fr', gap: 28, alignItems: 'center' }} className="final-cta-grid">
          <div>
            <h2 style={{ ...HEADING, fontWeight: 800, fontSize: 'clamp(28px, 3.4vw, 46px)', lineHeight: 1.28, margin: 0, color: '#fff', maxWidth: '20ch' }}>متجرك ينتظر منتجه الأول.</h2>
            <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 18, lineHeight: 1.9, margin: '14px 0 0', maxWidth: '44ch', color: '#C7C4D7' }}>
              افتتح اليوم مجاناً، وشوف شكله قبل ما تدفع فلساً واحداً.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 28 }}>
              <Link href="/register">
                <button style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 17, background: C.blue, color: '#fff', padding: '16px 30px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.blueHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.blue)}>
                  ابدأ مجاناً
                </button>
              </Link>
              <button onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 17, color: '#fff', background: 'transparent', border: `2px solid ${C.text2}`, padding: '14px 28px', borderRadius: 10, cursor: 'pointer' }}>
                شوف بازار وهو يعمل
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 28 }}>
              {([[Lock, 'آمن 100%'], [Zap, 'إعداد في 5 دقائق'], [BadgeCheck, 'دعم بالعربي']] as [LucideIcon, string][]).map(([Icon, label], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.8)', fontSize: 14, fontWeight: 500, fontFamily: "'Tajawal', sans-serif" }}>
                  <Icon size={16} strokeWidth={2} />{label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}><FinalCtaIllustration /></div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function LPFooter() {
  const cols: { h: string; links: { l: string; id: string | null; href?: string }[] }[] = [
    { h: 'المنتج', links: [{ l: 'المزايا', id: 'features' }, { l: 'قوالب المتاجر', id: null, href: '/#templates' }, { l: 'الأسعار', id: 'pricing' }, { l: 'مقابل Shopify', id: null, href: '/compare' }] },
    { h: 'المنصة', links: [{ l: 'لوحة التاجر', id: 'work' }, { l: 'المدونة', id: null, href: '/blog' }, { l: 'الأسئلة الشائعة', id: 'faq' }] },
    { h: 'الدعم', links: [{ l: 'تواصل معنا', id: null }, { l: 'دليل البدء', id: 'work' }, { l: 'الدخول للوحة التاجر', id: null, href: '/login' }] },
    { h: 'قانوني', links: [{ l: 'شروط الاستخدام', id: null }, { l: 'سياسة الخصوصية', id: null }] },
  ];
  const go = (id: string | null) => { if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <footer style={{ marginTop: 72, background: C.white, borderTop: `1px solid ${C.border}`, fontFamily: "'Tajawal', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 28px 40px', display: 'grid', gridTemplateColumns: '3fr repeat(4, 2fr)', gap: 28 }} className="lp-footer-top">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={17} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ ...HEADING, fontWeight: 800, fontSize: 24, color: C.dark }}>بازار</span>
          </div>
          <p style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14.5, lineHeight: 1.9, margin: '12px 0 0', maxWidth: '32ch', color: C.text2 }}>
            منصة عراقية لبناء متجر إلكتروني يبيع فعلاً — بالعربي وبالدينار، بلا عمولة وبلا برمجة.
          </p>
        </div>
        {cols.map((col, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 14, color: C.dark }}>{col.h}</span>
            {col.links.map((l, j) => (
              l.href ? (
                <Link key={j} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14, color: C.text2, textAlign: 'right', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.blue)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.text2)}>
                  {l.l}
                </Link>
              ) : (
                <button key={j} onClick={() => go(l.id)}
                  style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 300, fontSize: 14, color: C.text2, background: 'none', border: 'none', cursor: l.id ? 'pointer' : 'default', textAlign: 'right', padding: 0, transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.blue)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.text2)}>
                  {l.l}
                </button>
              )
            ))}
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px 32px' }}>
        <div style={{ height: 1, background: C.border, margin: '0 0 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: C.text2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            © 2026 بازار — صُنع بحب
            <Heart size={12} fill={C.accent} color={C.accent} />
            من العراق
          </span>
          <span style={{ fontSize: 13, color: C.text2 }}>منصة عراقية 100% — بلا عمولة على مبيعاتك</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Tajawal', sans-serif", background: C.bg }}>
      <LPHeader />
      <LPHero />
      <LPValueProps />
      <LPWork />
      <LPFeatures />
      <LPTemplates />
      <LPMarketing />
      <LPWhatsNew />
      <LPSteps />
      <LPStories />
      <LPIntegrations />
      <LPBlog />
      <LPFaq />
      <LPPricing />
      <LPPlanComparison />
      <LPFinalCTA />
      <LPComparison />
      <LPFooter />
    </div>
  );
}
