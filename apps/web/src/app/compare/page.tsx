import Link from 'next/link';
import { Check, X, ArrowLeft, Zap, Globe, MessageCircle, Shield, Star, TrendingUp, Crown } from 'lucide-react';
import { PLAN_CONFIGS } from '@storebuilder/types';
import { PlanPrice } from '@/components/pricing/PlanPrice';

export const metadata = { title: 'بازار مقابل شوبيفاي — قارن بنفسك', description: 'لماذا يختار التجار العرب بازار بدلاً من شوبيفاي؟ مقارنة شاملة بالأسعار والميزات.' };

const C = {
  p: '#2F2E4B', s: '#4A4767', a: '#DB6E93',
  text: '#2F2E4B', muted: '#6B6A83', border: '#FBE1EA',
  bg: '#FBF9F2', bgAlt: '#FFFFFF',
};

interface CompRow {
  label: string;
  sub?: string;
  bazar: string | true | false;
  shopify: string | true | false;
}

const rows: CompRow[] = [
  { label: 'السعر الشهري', bazar: `من ${PLAN_CONFIGS.FREE.priceIQD.toLocaleString('en')} د.ع حتى ${PLAN_CONFIGS.ENTERPRISE.priceIQD.toLocaleString('en')} د.ع`, shopify: '$29 — $299 / شهر' },
  { label: 'السعر بعد الخصم للسنة الأولى', bazar: `من ${PLAN_CONFIGS.PRO.firstYearPriceIQD?.toLocaleString('en')} د.ع حتى ${PLAN_CONFIGS.ENTERPRISE.firstYearPriceIQD?.toLocaleString('en')} د.ع`, shopify: '—' },
  { label: 'عمولة على كل بيعة', bazar: 'صفر % ✓', shopify: '0.5% — 2% ×' },
  { label: 'واجهة عربية كاملة', bazar: true, shopify: false },
  { label: 'دعم الدينار العراقي', bazar: true, shopify: false },
  { label: 'دفع عبر QR / تحويل بنكي محلي', bazar: true, shopify: false },
  { label: 'دفع عبر Stripe / PayPal', bazar: true, shopify: true },
  { label: 'لا حاجة لبطاقة ائتمان للبدء', bazar: true, shopify: false },
  { label: 'إعداد المتجر في دقائق', bazar: true, shopify: 'يحتاج خبرة تقنية' },
  { label: 'دعم عربي عبر واتساب', bazar: true, shopify: false },
  { label: 'ذكاء اصطناعي لكتابة الأوصاف', bazar: true, shopify: 'إضافة مدفوعة' },
  { label: 'كوبونات الخصم', bazar: true, shopify: true },
  { label: 'تحليلات المبيعات', bazar: true, shopify: true },
  { label: 'تطبيقات وإضافات خارجية', bazar: 'مدمجة', shopify: 'مدفوعة في معظمها' },
  { label: 'بدون رسوم خفية', bazar: true, shopify: false },
  { label: 'مناسب للسوق العراقي والخليجي', bazar: true, shopify: false },
];

function BoolCell({ value, isBazar }: { value: string | boolean; isBazar: boolean }) {
  const good = isBazar ? '#059669' : '#DC2626';
  const neutral = C.muted;
  const color = value === true ? good : value === false ? '#DC2626' : isBazar ? C.s : neutral;

  if (value === true) return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${good}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={13} color={good} strokeWidth={3} />
      </div>
    </div>
  );
  if (value === false) return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EF444415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={13} color="#EF4444" strokeWidth={3} />
      </div>
    </div>
  );
  return <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color }}>{value}</div>;
}

export default function ComparePage() {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-tajawal)', color: C.text }}>

      {/* Nav */}
      <nav style={{ background: C.p, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.a, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={18} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-cairo)' }}>بازار</span>
        </Link>
        <Link
          href="/register"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: C.a, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          <Zap size={14} />
          ابدأ مجاناً
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.a}12`, border: `1px solid ${C.a}30`, borderRadius: 99, padding: '6px 18px', marginBottom: 20 }}>
          <Star size={13} fill={C.a} color={C.a} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.a }}>لماذا بازار وليس شوبيفاي؟</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 'clamp(26px,5vw,42px)', lineHeight: 1.25, color: C.text, margin: '0 0 16px' }}>
          بازار صُمِّم خصيصاً<br />
          <span style={{ color: C.a }}>للتجار العرب</span>
        </h1>

        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.8, maxWidth: 560, margin: '0 auto 36px' }}>
          شوبيفاي رائع — لكنه مصمم للسوق الغربي. بازار بني من الصفر للتجار في العراق والخليج وسائر البلدان العربية.
        </p>

        {/* Score cards */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          {[
            { label: 'متجر', value: '0 كلفة', sub: 'للبدء', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'عمولة', value: '0%', sub: 'على مبيعاتك', color: C.s, bg: '#EDE9FE', border: '#C4B5FD' },
            { label: 'دعم', value: '< ساعة', sub: 'استجابة واتساب', color: C.a, bg: '#FFF1F2', border: '#FECDD3' },
          ].map(({ label, value, sub, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '20px 28px', minWidth: 140 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'var(--font-cairo)' }}>{value}</div>
              <div style={{ fontSize: 12, color, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ background: C.bgAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(67,46,84,.08)' }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', borderBottom: `2px solid ${C.border}` }}>
            <div style={{ padding: '20px 20px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>الميزة</span>
            </div>

            {/* Bazar */}
            <div style={{ padding: '16px 12px', textAlign: 'center', background: `${C.p}08`, borderRight: `1px solid ${C.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${C.p},${C.a})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Globe size={18} color="#fff" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 15, color: C.p }}>بازار</div>
              <div style={{ fontSize: 11, color: C.muted }}>عربي 100%</div>
              <div style={{ marginTop: 8 }}>
                <PlanPrice plan="PRO" align="center" compact />
              </div>
            </div>

            {/* Shopify */}
            <div style={{ padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#95BF47', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Shield size={18} color="#fff" />
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#374151' }}>Shopify</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>عالمي</div>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 140px',
                borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 1 ? `${C.bg}80` : 'transparent',
              }}
            >
              <div style={{ padding: '13px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{row.label}</div>
                {row.sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{row.sub}</div>}
              </div>
              <div style={{ padding: '13px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.p}04`, borderRight: `1px solid ${C.border}` }}>
                <BoolCell value={row.bazar} isBazar />
              </div>
              <div style={{ padding: '13px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BoolCell value={row.shopify} isBazar={false} />
              </div>
            </div>
          ))}
        </div>

        {/* Why bazar section */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 22, color: C.text, textAlign: 'center', marginBottom: 28 }}>
            ما الذي يجعل بازار مختلفاً؟
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              {
                icon: MessageCircle, color: '#059669',
                title: 'دعم عربي فوري',
                body: 'فريق الدعم يتحدث العربية ويرد عبر واتساب خلال أقل من ساعة — لا بوتات ولا ردود إنجليزية آلية.',
              },
              {
                icon: Shield, color: C.s,
                title: 'خصوصية وأمان محلي',
                body: 'بياناتك وبيانات عملائك مخزنة داخل المنطقة — لا مشاركة مع خوادم أجنبية.',
              },
              {
                icon: TrendingUp, color: C.a,
                title: 'شبكة إعلانية داخلية',
                body: 'منتجاتك تظهر كإعلانات في المتاجر الأخرى — وصول أوسع دون إنفاق على الإعلانات.',
              },
              {
                icon: Crown, color: '#D97706',
                title: 'بدون عمولة أبداً',
                body: 'كل دينار تبيعه يصل إليك — بازار لا يأخذ نسبة من مبيعاتك مهما كانت.',
              },
            ].map(({ icon: Icon, color, title, body }) => (
              <div key={title} style={{ background: C.bgAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '22px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={20} color={color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, background: `linear-gradient(135deg,${C.p},${C.a})`, borderRadius: 10, padding: '40px 32px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 'clamp(18px,3vw,24px)', color: '#fff', margin: '0 0 10px' }}>
            ابدأ متجرك اليوم — مجاناً
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', margin: '0 0 28px', lineHeight: 1.7 }}>
            لا بطاقة ائتمان، لا عقود، لا عمولات. متجرك جاهز في أقل من 5 دقائق.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/register"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 10, background: '#fff', color: C.p, fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 28px rgba(0,0,0,.2)' }}
            >
              <Zap size={16} />
              أنشئ متجرك مجاناً
            </Link>
            <Link
              href="/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 10, border: '2px solid rgba(255,255,255,.35)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
            >
              <ArrowLeft size={14} />
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
