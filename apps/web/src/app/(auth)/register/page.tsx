'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { AuthResponse } from '@storebuilder/types';
import { Loader2, Eye, EyeOff, ShoppingBag, Mail, User, Lock, Check, Shield, Zap, Gift, Phone, Shirt, Sparkles, Gamepad2, Smartphone, Gem, Flower2, BookOpen, UtensilsCrossed, LayoutGrid, type LucideIcon } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const C = {
  bg:     '#FBF9F2',
  p:      '#2F2E4B',
  s:      '#4A4767',
  a:      '#DB6E93',
  blue:      '#4A8AC7',
  blueHover: '#3671A8',
  text:   '#2F2E4B',
  muted:  '#6B6A83',
  border: '#FBE1EA',
};

const schema = z.object({
  name:      z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email:     z.string().email('بريد إلكتروني غير صالح'),
  password:  z.string()
    .min(8, 'كلمة المرور 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم'),
  whatsapp:  z.string().regex(/^\+?[0-9]{7,15}$/, 'رقم واتساب غير صالح').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

function extractReferralCode(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.searchParams.get('ref') ?? undefined;
  } catch {
    return value;
  }
}

const PERKS = [
  { Icon: ShoppingBag, text: 'متجر احترافي فوراً'      },
  { Icon: Zap,         text: 'جاهز في أقل من ٥ دقائق' },
  { Icon: Shield,      text: 'بيانات آمنة ومشفّرة'    },
  { Icon: Gift,        text: 'مجاني للأبد — بدون قيود' },
];

function RegisterForm() {
  useDocumentTitle('إنشاء حساب');
  const router = useRouter();
  const login  = useAuthStore(s => s.login);
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const searchParams = useSearchParams();
  const templateParam = searchParams.get('template');
  const [referralInput, setReferralInput] = useState(() => searchParams.get('ref') ?? '');

  const TEMPLATE_META: Record<string, { name: string; icon: LucideIcon; color: string; accent: string; tagline: string }> = {
    fashion:      { name: 'متجر الأزياء النسائية',        icon: Shirt,          color: '#7C3F6B', accent: '#D4547A', tagline: 'أنيق، جذاب، يبيع' },
    'fashion-men':{ name: 'متجر الأزياء الرجالية',        icon: Shirt,          color: '#1F2A44', accent: '#3B5BA5', tagline: 'أناقة رجالية بلا حدود' },
    jewelry:      { name: 'متجر المجوهرات',                icon: Gem,            color: '#8A6D1F', accent: '#C9A227', tagline: 'بريق يليق بك' },
    perfume:      { name: 'متجر العطور',                    icon: Flower2,        color: '#5B3A29', accent: '#C08552', tagline: 'عطرك الذي يعبّر عنك' },
    beauty:       { name: 'متجر البشرة والمكياج',          icon: Sparkles,       color: '#9B3A6B', accent: '#E8627A', tagline: 'الجمال الحقيقي يبدأ من هنا' },
    electronics:  { name: 'متجر الألعاب والإلكترونيات',   icon: Gamepad2,       color: '#1A0A2E', accent: '#7C3AED', tagline: 'عالم التقنية والترفيه' },
    books:        { name: 'متجر الكتب والقرطاسية',         icon: BookOpen,       color: '#2E4A3D', accent: '#4E8368', tagline: 'اكتشف عالماً من القراءة' },
    food:         { name: 'متجر الأطعمة',                   icon: UtensilsCrossed, color: '#8C3A2B', accent: '#E07A45', tagline: 'نكهة تستحق التجربة' },
    general:      { name: 'متجر عام',                       icon: LayoutGrid,     color: '#2F2E4B', accent: '#DB6E93', tagline: 'كل ما تحتاجه في مكان واحد' },
  };
  const tplMeta = templateParam ? TEMPLATE_META[templateParam] : null;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const pw = watch('password') ?? '';
  const checks = { length: pw.length >= 8, upper: /[A-Z]/.test(pw), num: /[0-9]/.test(pw) };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = { ...data, whatsapp: data.whatsapp || undefined, referralCode: extractReferralCode(referralInput) };
      const res = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register', payload);
      login(res.data.user, res.data.token);
      toast.success('تم إنشاء الحساب! أنشئ متجرك الآن');
      router.push(templateParam ? `/dashboard/builder?template=${templateParam}` : '/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: 'var(--font-tajawal)', position: 'relative', overflow: 'hidden' }}>

      {/* Left value panel */}
      <div className="auth-left-panel" style={{ display: 'flex', flex: '0 0 44%', background: C.p, flexDirection: 'column', justifyContent: 'center', padding: '64px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 56 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={20} color="#fff" strokeWidth={1.75} />
            </div>
            <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 24, color: '#fff' }}>بازار</span>
          </Link>

          {tplMeta ? (
            /* Template-specific left panel */
            <div>
              <div style={{ marginBottom: 24, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.3))', color: '#fff' }}><tplMeta.icon size={80} strokeWidth={1.25} /></div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 100, padding: '5px 14px', marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>قالب مختار</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 'clamp(28px, 3vw, 42px)', color: '#fff', lineHeight: 1.2, margin: '0 0 12px' }}>{tplMeta.name}</h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', marginBottom: 40 }}>{tplMeta.tagline}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {['سيُطبَّق القالب تلقائياً بعد التسجيل', 'يمكنك تغيير الألوان والخطوط بحرية', 'جميع القوالب مُحسَّنة للموبايل', 'إعداد المتجر في أقل من دقيقتين'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Generic left panel */
            <div>
              <div style={{ marginBottom: 48 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 100, padding: '5px 14px', marginBottom: 20 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'badge-pulse 2s infinite' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>+2,400 تاجر يبيعون الآن</span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 'clamp(32px, 3.5vw, 48px)', color: '#fff', lineHeight: 1.2, margin: '0 0 16px' }}>
                  ابنِ متجرك
                  <span style={{ display: 'block', color: C.a }}>
                    في 5 دقائق
                  </span>
                </h1>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,.42)', lineHeight: 1.75 }}>
                  بدون خبرة تقنية، بدون بطاقة ائتمان —<br />فقط متجرك وزبائنك.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {PERKS.map(({ Icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color="rgba(232,188,185,.85)" strokeWidth={1.75} />
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>{text}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 48 }}>
                <div style={{ display: 'flex' }}>
                  {['أ','ف','م','س'].map((lt, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(47,46,75,.8)', background: `rgba(255,255,255,${0.1 + i * 0.03})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', marginLeft: i > 0 ? -10 : 0 }}>{lt}</div>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.38)' }}>
                  <strong style={{ color: 'rgba(255,255,255,.65)' }}>2,400+</strong> تاجر في العراق والخليج
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 24, color: C.text, marginBottom: 8 }}>
              {tplMeta ? `ابدأ بـ${tplMeta.name}` : 'افتح متجرك مجاناً'}
            </h2>
            <p style={{ fontSize: 14, color: C.muted }}>30 ثانية وتكون جاهزاً</p>
          </div>

          <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 10, padding: '40px 36px', boxShadow: '0 8px 40px rgba(47,46,75,.07)' }}>

            {/* Google Sign-Up */}
            <div style={{ marginBottom: 6 }}>
              <GoogleSignInButton label="التسجيل بـ Google" />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>أو أنشئ حساباً بالبريد</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>الاسم الكامل</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('name')}
                    placeholder="محمد أحمد"
                    style={{ width: '100%', padding: '12px 44px 12px 16px', background: C.bg, border: `1.5px solid ${errors.name ? 'rgba(239,68,68,.5)' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(219,110,147,.4)')}
                    onBlur={e => (e.target.style.borderColor = errors.name ? 'rgba(239,68,68,.5)' : C.border)}
                  />
                  <User size={16} color={C.muted} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                {errors.name && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    dir="ltr"
                    style={{ width: '100%', padding: '12px 16px 12px 44px', background: C.bg, border: `1.5px solid ${errors.email ? 'rgba(239,68,68,.5)' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, textAlign: 'left', transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(219,110,147,.4)')}
                    onBlur={e => (e.target.style.borderColor = errors.email ? 'rgba(239,68,68,.5)' : C.border)}
                  />
                  <Mail size={16} color={C.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                {errors.email && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="8 أحرف على الأقل"
                    style={{ width: '100%', padding: '12px 44px 12px 44px', background: C.bg, border: `1.5px solid ${errors.password ? 'rgba(239,68,68,.5)' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(219,110,147,.4)')}
                    onBlur={e => (e.target.style.borderColor = errors.password ? 'rgba(239,68,68,.5)' : C.border)}
                  />
                  <Lock size={16} color={C.muted} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength */}
                {pw.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {[{ ok: checks.length, label: '8 أحرف' }, { ok: checks.upper, label: 'حرف كبير' }, { ok: checks.num, label: 'رقم' }].map(c => (
                      <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.ok ? 'rgba(5,150,105,.1)' : C.bg, border: `1.5px solid ${c.ok ? 'rgba(5,150,105,.4)' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                          {c.ok && <Check size={8} color="#059669" strokeWidth={3} />}
                        </div>
                        <span style={{ color: c.ok ? '#059669' : C.muted, transition: 'color .2s' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {errors.password && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errors.password.message}</p>}
              </div>

              {/* WhatsApp */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>
                  رقم واتساب
                  <span style={{ color: C.muted, fontWeight: 500, fontSize: 12, marginRight: 6 }}>(اختياري — لإشعارات التفعيل)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('whatsapp')}
                    type="tel"
                    placeholder="+9647XXXXXXXXX"
                    dir="ltr"
                    style={{ width: '100%', padding: '12px 16px 12px 44px', background: C.bg, border: `1.5px solid ${errors.whatsapp ? 'rgba(239,68,68,.5)' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, textAlign: 'left', transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(5,150,105,.4)')}
                    onBlur={e => (e.target.style.borderColor = errors.whatsapp ? 'rgba(239,68,68,.5)' : C.border)}
                  />
                  <Phone size={16} color="#25D366" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                {errors.whatsapp && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errors.whatsapp.message}</p>}
                <p style={{ fontSize: 11, color: C.muted, marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Smartphone size={12} />
                  سنرسل لك إشعار واتساب عند تفعيل خطتك
                </p>
              </div>

              {/* Referral code */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>
                  كود الدعوة
                  <span style={{ color: C.muted, fontWeight: 500, fontSize: 12, marginRight: 6 }}>(اختياري — إن كان صديق قد دعاك)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={referralInput}
                    onChange={e => setReferralInput(e.target.value)}
                    placeholder="الصق رابط الدعوة أو أدخل الكود"
                    dir="ltr"
                    style={{ width: '100%', padding: '12px 16px 12px 44px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, textAlign: 'left', transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(219,110,147,.4)')}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                  />
                  <Gift size={16} color={C.a} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px 0', background: loading ? 'rgba(74,138,199,.5)' : C.blue, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginTop: 4, transition: 'background .2s' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.blueHover; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.blue; }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جارٍ الإنشاء...</> : 'افتح متجرك مجاناً'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 24 }}>
              لديك حساب بالفعل؟{' '}
              <Link href="/login" style={{ color: C.a, fontWeight: 700, textDecoration: 'none' }}>سجّل الدخول</Link>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 20, opacity: .6 }}>
            بالتسجيل، أنت توافق على{' '}
            <a href="#" style={{ color: C.p, textDecoration: 'none' }}>شروط الاستخدام</a>
            {' '}و{' '}
            <a href="#" style={{ color: C.p, textDecoration: 'none' }}>سياسة الخصوصية</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FBF9F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 40, height: 40, border: '3px solid #2F2E4B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
